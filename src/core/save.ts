import type { GameData, ChronicleEntry, NarrativeScene, Character, StatKey } from './types'
import { recoverNarrativeOnLoad } from './narrative'
import { migrateCollectionV2 } from './collection'
import { migrateJourneyMetrics } from './journey_metrics'
import { isValidStarLotteryPendingV2, migrateStarLottery } from './star_lottery'
import { migrateCharacterProgression } from './character_progression'
import { recalcStats } from './inheritance'
import { ITEM_BASES } from './data/items'
import { GODS } from './data/gods'
import { dungeonByRegion } from '../dungeon/maps'
import { isDungeonRunSeed } from '../dungeon/run_variation'
import { safeStorageGet, safeStorageRemove, safeStorageSet, type StorageFailureReason } from './storage'

const KEY_V1 = 'hitsugi_save_v1' // 季節単位(1ターン=1季)時代のセーブ
const KEY_V3 = 'hitsugi_save_v3' // 月単位(1ターン=1月)
const KEY = 'hitsugi_save_v4' // 家業(jobClass)導入後 — GDD_v3 §2
const KEY_BAK = 'hitsugi_save_v4_bak' // M19 C3: 1世代バックアップ(直前の正常セーブ)

// ============================================================
// M19 C3: セーブ硬化(設計はdevil-advocate攻撃1回を経て確定)
//  1) chronicle境界 — 保存層のみ。birth/death/era/triumph/pact は無条件全保持、
//     'event' だけを新しい順に残数分。参照系(看取りのborn検索・襲名リネーム)はeventに依存しない。
//  2) 1世代BAK — 書く前に直前セーブをBAKへ。ただし合算が予算超ならBAKを捨て本体優先。
//  3) 検証付き復旧 — 構造+意味検証(family非空等)。両方有効なら saveSeq(単調増分)が大きい方。
//     saveSeqはNG+の季リセットに依存しないため周回跨ぎでも誤復旧しない。
//  4) quota警告 — DOMException(QuotaExceeded/code22)のみリトライ梯子(1200→600→0)。
//     他例外は誤診しない(console.error)。通知はsink経由(core→ui依存を作らない)・恒常失敗は初回のみ。
// ============================================================

const CHRON_MAX = 1200
const CHRON_TIGHT = 600
const BAK_BUDGET_CHARS = 4_500_000 // 本体+BAK合算の目安(localStorage≈5MB。UTF-16換算は環境差あり=概算)

// 保存トラブル通知の受け口(App.tsxがtoastへ配線)。coreからuiへ依存しない。
let troubleSink: ((msg: string) => void) | null = null
// M33: 深刻度別ラッチ。以前は単一フラグで、先に軽い警告(quotaで年代記を畳んだ等)が出ると、
// 後から起きる致命(全段保存失敗=この端末にデータが残っていない)のトーストを握り潰していた。
// warn/critical を別ラッチにし、致命は軽い警告に関係なく必ず一度は伝える。
const warnedBySeverity = { warn: false, critical: false }
export function setSaveTroubleSink(fn: ((msg: string) => void) | null): void {
  troubleSink = fn
}
function warnOnce(msg: string, severity: 'warn' | 'critical' = 'warn'): void {
  if (warnedBySeverity[severity]) return
  warnedBySeverity[severity] = true
  troubleSink?.(msg)
}

// M33: 複数タブ競合対策(read-only化)。同一ゲームを2タブで開くと saveGame は last-writer-wins で、
// こちらのメモリ上の(古い)状態が相手タブの新しい進行を黙って上書き潰す。別タブの保存(storageイベント)を
// 検知したタブは saveReadOnly=true にして以後の saveGame を止め、上書き喪失を実際に防ぐ(警告のみでは防げない)。
// ユーザーには再読み込みで最新へ戻す導線を出す(App.tsxのConflictBanner)。
let saveReadOnly = false
export function isSaveReadOnly(): boolean {
  return saveReadOnly
}
/** 別タブがKEY/KEY_BAKを更新したら cb を一度呼び、このタブを read-only 化する。cleanup関数を返す。 */
export function onExternalSaveChange(cb: () => void): () => void {
  const handler = (e: StorageEvent): void => {
    if (e.key !== KEY && e.key !== KEY_BAK) return
    if (saveReadOnly) return // 既に検知済み — 二重通知しない
    saveReadOnly = true
    cb()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

// chronicle境界 — 'event'以外(誕生/死/契り/勝鬨/節目)は一族の骨格なので世代数が嵩んでも落とさない。
export function boundChronicle(entries: ChronicleEntry[], max = CHRON_MAX): ChronicleEntry[] {
  if (entries.length <= max) return entries
  const keep = new Set<ChronicleEntry>()
  for (const e of entries) if (e.kind !== 'event') keep.add(e)
  const eventBudget = Math.max(0, max - keep.size)
  let allowed = 0
  // 新しいeventから残す(後ろから数える)
  for (let i = entries.length - 1; i >= 0 && allowed < eventBudget; i--) {
    if (entries[i].kind === 'event') {
      keep.add(entries[i])
      allowed++
    }
  }
  return entries.filter((e) => keep.has(e))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isFiniteNumber(value: unknown, min = Number.NEGATIVE_INFINITY): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min
}

const ITEM_SOURCES = new Set(['shop', 'chest', 'boss', 'rare', 'divine'])
const STAT_KEYS = new Set(['str', 'vit', 'dex', 'agi', 'mnd', 'luk'])
const GOD_RANK_BY_ID = new Map(GODS.map((god) => [god.id, god.rank]))

function isValidItem(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0) return false
  if (typeof value.baseId !== 'string' || typeof value.name !== 'string' || value.name.length === 0) return false
  const base = ITEM_BASES.find((candidate) => candidate.baseId === value.baseId)
  if (!base || value.slot !== base.slot) return false
  if (!Number.isInteger(value.generation) || !isFiniteNumber(value.generation, 0)) return false
  for (const key of ['atk', 'def', 'price']) {
    if (value[key] !== undefined && !isFiniteNumber(value[key], 0)) return false
  }
  if (value.statBonus !== undefined) {
    if (!isRecord(value.statBonus)) return false
    if (Object.entries(value.statBonus).some(([key, amount]) => !STAT_KEYS.has(key) || !isFiniteNumber(amount, 0))) return false
  }
  for (const key of ['legacyOf', 'legacyFirstOwner', 'rareOrigin']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') return false
  }
  if (value.source !== undefined && (typeof value.source !== 'string' || !ITEM_SOURCES.has(value.source))) return false
  return true
}

/** M47: optionalな遠征checkpointもBAK選択前に入れ子まで検証する。 */
function isValidDungeonRun(value: unknown, familyIds: ReadonlySet<string>): boolean {
  if (!isRecord(value) || typeof value.regionId !== 'string' || value.regionId.length === 0) return false
  if (value.runSeed !== undefined && !isDungeonRunSeed(value.runSeed)) return false
  const dungeon = dungeonByRegion(value.regionId)
  if (!dungeon) return false
  if (!Number.isInteger(value.floor) || !isFiniteNumber(value.floor, 0)) return false
  const floor = dungeon.floors[value.floor as number]
  if (!floor) return false
  if (!Number.isInteger(value.x) || !isFiniteNumber(value.x, -1)) return false
  if (!Number.isInteger(value.y) || !isFiniteNumber(value.y, -1)) return false
  const x = value.x as number
  const y = value.y as number
  const atEntranceSentinel = x === -1 && y === -1
  const insideFloor = y >= 0 && y < floor.ascii.length && x >= 0 && x < (floor.ascii[y]?.length ?? 0)
  if (!atEntranceSentinel && !insideFloor) return false
  if (!isFiniteNumber(value.light, 0) || value.light > 100) return false
  if (!isStringArray(value.partyIds) || value.partyIds.length === 0 || value.partyIds.length > 4) return false
  if (new Set(value.partyIds).size !== value.partyIds.length || value.partyIds.some((id) => !familyIds.has(id))) return false
  if (!isStringArray(value.log) || !isStringArray(value.used)) return false
  if (typeof value.bossDown !== 'boolean') return false
  if (!isRecord(value.loot) || !isFiniteNumber(value.loot.hoto, 0) || !isFiniteNumber(value.loot.ketsu, 0) ||
    !Array.isArray(value.loot.items) || !value.loot.items.every(isValidItem)) return false
  if (value.visualVersion !== undefined && value.visualVersion !== 'v1' && value.visualVersion !== 'v2') return false
  if (value.stageContractId !== undefined && typeof value.stageContractId !== 'string') return false
  if (value.frantic !== undefined && (!Number.isInteger(value.frantic) || !isFiniteNumber(value.frantic, 0))) return false
  if (value.boons !== undefined && !isStringArray(value.boons)) return false
  if (value.boonDraft !== undefined && !isStringArray(value.boonDraft)) return false
  if (value.autoBattle !== undefined && typeof value.autoBattle !== 'boolean') return false
  if (value.introSeen !== undefined && typeof value.introSeen !== 'boolean') return false
  return true
}

function isNarrativeScene(value: unknown): value is NarrativeScene {
  if (!isRecord(value) || typeof value.kind !== 'string') return false
  switch (value.kind) {
    case 'birth':
    case 'death':
    case 'ceremony':
    case 'jobrite':
      return typeof value.charId === 'string'
    case 'dream':
      return true
    case 'dreamEp':
      return typeof value.epId === 'string'
    case 'life':
      return typeof value.title === 'string' && Array.isArray(value.lines) && value.lines.every((line) => (
        isRecord(line) && typeof line.speaker === 'string' && typeof line.text === 'string'
      )) && (value.bg === undefined || typeof value.bg === 'string') &&
        (value.narrativeId === undefined || typeof value.narrativeId === 'string')
    default:
      return false
  }
}

function isValidNarrative(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (value.stage !== undefined && !['one_light', 'name', 'duet_hunger', 'fire_vow', 'summit'].includes(String(value.stage))) return false
  for (const key of ['seen', 'queued', 'completed', 'deferredReminderShown']) {
    if (value[key] !== undefined && !isStringArray(value[key])) return false
  }
  for (const key of ['deferred', 'archive']) {
    if (value[key] !== undefined && (!Array.isArray(value[key]) || !value[key].every(isNarrativeScene))) return false
  }
  if (value.active !== undefined && !isNarrativeScene(value.active)) return false
  if (value.activeReplay !== undefined && typeof value.activeReplay !== 'boolean') return false
  if (value.activeOpenedAt !== undefined && (typeof value.activeOpenedAt !== 'number' || !Number.isFinite(value.activeOpenedAt) || value.activeOpenedAt < 0)) return false
  if (value.monthTransitionPending !== undefined && typeof value.monthTransitionPending !== 'boolean') return false
  if (value.generationQuestion !== undefined && typeof value.generationQuestion !== 'string') return false
  if (value.deferredSince !== undefined) {
    if (!isRecord(value.deferredSince)) return false
    if (Object.values(value.deferredSince).some((stamp) => typeof stamp !== 'number' || !Number.isFinite(stamp) || stamp < 0)) return false
  }
  if (value.resonance !== undefined) {
    const resonance = value.resonance
    if (!isRecord(resonance)) return false
    if (['cut', 'save', 'inherit'].some((key) => typeof resonance[key] !== 'number' || !Number.isFinite(resonance[key]) || (resonance[key] as number) < 0)) return false
  }
  if (value.metrics !== undefined) {
    const metrics = value.metrics
    if (!isRecord(metrics)) return false
    const metricKeys = [
      'scenesOpened', 'scenesCompleted', 'scenesSkipped', 'scenesDeferred',
      'totalSceneMs', 'maxDeferred', 'monthsAdvanced', 'interruptedAfterMonth',
    ]
    if (metricKeys.some((key) => typeof metrics[key] !== 'number' || !Number.isFinite(metrics[key]) || (metrics[key] as number) < 0)) return false
  }
  if (value.lastReturn !== undefined) {
    if (!isRecord(value.lastReturn)) return false
    if (typeof value.lastReturn.id !== 'string' || typeof value.lastReturn.regionId !== 'string') return false
    if (typeof value.lastReturn.season !== 'number' || !Number.isFinite(value.lastReturn.season) || value.lastReturn.season < 0) return false
    if (!isStringArray(value.lastReturn.partyIds) || !isStringArray(value.lastReturn.injuredIds)) return false
    if (typeof value.lastReturn.bossDown !== 'boolean') return false
  }
  return true
}

function isValidLotteryRescue(value: unknown): value is { kind: 'guaranteed-new' | 'star-return'; godId: string } {
  return isRecord(value) &&
    (value.kind === 'guaranteed-new' || value.kind === 'star-return') &&
    typeof value.godId === 'string' && GOD_RANK_BY_ID.has(value.godId)
}

function isValidLotteryReceipt(value: unknown, drawsUsed: number): boolean {
  if (!isRecord(value) || typeof value.requestId !== 'string' || !value.requestId.trim()) return false
  if (!Number.isInteger(value.drawNumber) || !isFiniteNumber(value.drawNumber, 1) || value.drawNumber > drawsUsed) return false
  if (typeof value.selectedGodId !== 'string' || !GOD_RANK_BY_ID.has(value.selectedGodId)) return false
  if (!isStringArray(value.grantedGodIds) || value.grantedGodIds.length < 1 || value.grantedGodIds.length > 2 ||
      new Set(value.grantedGodIds).size !== value.grantedGodIds.length ||
      !value.grantedGodIds.includes(value.selectedGodId) || value.grantedGodIds.some((id) => !GOD_RANK_BY_ID.has(id))) return false
  if (!isRecord(value.affinityDelta)) return false
  if (Object.entries(value.affinityDelta).some(([id, amount]) => (
    !GOD_RANK_BY_ID.has(id) || !Number.isInteger(amount) || !isFiniteNumber(amount, 1)
  ))) return false
  if (value.rescue !== undefined) {
    if (!isValidLotteryRescue(value.rescue)) return false
    if (!value.grantedGodIds.includes(value.rescue.godId)) return false
  }
  return true
}

// 構造+意味の妥当性 — BAK復旧を機能させる下限不変条件(devil指摘: 構造検証だけでは意味的破損を素通しする)
export function isValidSave(d: unknown): d is GameData & { saveSeq?: number } {
  if (!d || typeof d !== 'object') return false
  const g = d as Partial<GameData>
  if (!Array.isArray(g.family) || g.family.length < 1) return false
  // M29修正: 各族員の最低限の形(id/hp)を検証。空{}のような偽の族員(family:[{}])が通過して
  // store.tsの c.equipment[...] や hp 参照で例外/NaN化する crash-on-continue を防ぐ(devil C2)。
  for (const c of g.family) {
    if (!c || typeof c !== 'object') return false
    const cc = c as { id?: unknown; hp?: unknown; equipment?: unknown; level?: unknown; exp?: unknown }
    if (typeof cc.id !== 'string' || typeof cc.hp !== 'number' || !Number.isFinite(cc.hp)) return false
    // M32修正: equipment欠落の族員は advanceSeason(寿命死判定 c.equipment[slot])で即例外化する。
    if (typeof cc.equipment !== 'object' || cc.equipment === null) return false
    // progression欠落は旧saveとして許容する。存在する値だけは、正規化可能な有限整数に限定する。
    if (cc.level !== undefined && (
      typeof cc.level !== 'number' || !Number.isFinite(cc.level) || !Number.isInteger(cc.level) || cc.level < 1
    )) return false
    if (cc.exp !== undefined && (
      typeof cc.exp !== 'number' || !Number.isFinite(cc.exp) || !Number.isInteger(cc.exp) || cc.exp < 0
    )) return false
  }
  if (typeof g.seasonIndex !== 'number' || !Number.isFinite(g.seasonIndex) || g.seasonIndex < 0) return false
  // M32修正: 配列必須/optional配列の型を検証。非配列の inventory/consumables が通過すると
  // store.ts の .map/.filter/.findIndex で初めて例外化する(BAKはロード失敗にしか効かない)。
  if (!Array.isArray(g.inventory)) return false
  if (g.consumables !== undefined && !Array.isArray(g.consumables)) return false
  // M29修正: hotoだけでなくketsuも有限数を要求。ketsu欠落/NaNのセーブが通過すると
  // `undefined < cost` でガードを素通りし、鍛錬/打ち直しでNaNが永久伝播する(devil C2の主要ベクタ)。
  if (typeof g.hoto !== 'number' || !Number.isFinite(g.hoto)) return false
  if (typeof g.ketsu !== 'number' || !Number.isFinite(g.ketsu)) return false
  if (!Array.isArray(g.chronicle)) return false
  // M34: optionalでも、存在する物語queueはload直後に展開/反復される。壊れた手動importを
  // 保存して本体とBAKの両方を読めなくしないよう、入れ子のscene/配列/時刻まで境界で弾く。
  if (g.narrative !== undefined && !isValidNarrative(g.narrative)) return false
  if (g.collectionV2 !== undefined) {
    if (!isRecord(g.collectionV2) || !isRecord(g.collectionV2.itemSeriesBits) || !isStringArray(g.collectionV2.foundingItemIds)) return false
    if (Object.values(g.collectionV2.itemSeriesBits).some((bits) => (
      typeof bits !== 'number' || !Number.isInteger(bits) || bits < 0 || bits > 0x7fff
    ))) return false
  }
  if (g.designatedHeirId !== undefined && typeof g.designatedHeirId !== 'string') return false
  if (g.successionPending !== undefined && (!isRecord(g.successionPending) ||
    typeof g.successionPending.predecessorId !== 'string' || !isStringArray(g.successionPending.heirloomIds))) return false
  if (g.generationVow !== undefined) {
    const vow = g.generationVow
    if (!isRecord(vow) || !['guard_line', 'break_night', 'keep_names'].includes(String(vow.id)) ||
      typeof vow.madeById !== 'string' || typeof vow.generation !== 'number' || !Number.isFinite(vow.generation) ||
      typeof vow.setSeason !== 'number' || !Number.isFinite(vow.setSeason)) return false
  }
  if (g.lastSuccession !== undefined) {
    const record = g.lastSuccession
    if (!isRecord(record) || typeof record.predecessorId !== 'string' || typeof record.successorId !== 'string' ||
      typeof record.season !== 'number' || !Number.isFinite(record.season) || !isStringArray(record.truthLabels) ||
      record.truthLabels.length !== 2 || typeof record.reply !== 'string' || typeof record.bloodLegacy !== 'string') return false
  }
  if (g.journeyMetrics !== undefined) {
    const journey = g.journeyMetrics
    if (!isRecord(journey) || typeof journey.startedAtMs !== 'number' || !Number.isFinite(journey.startedAtMs) || journey.startedAtMs < 0 || !isRecord(journey.milestones)) return false
    const ids = new Set(['new_game', 'pact', 'birth', 'first_depart', 'first_return', 'safe_exit', 'first_death', 'first_inherit', 'next_month'])
    for (const [id, milestone] of Object.entries(journey.milestones)) {
      if (!ids.has(id) || !isRecord(milestone) || milestone.id !== id ||
        typeof milestone.atSeason !== 'number' || !Number.isFinite(milestone.atSeason) || milestone.atSeason < 0 ||
        typeof milestone.elapsedMs !== 'number' || !Number.isFinite(milestone.elapsedMs) || milestone.elapsedMs < 0) return false
    }
  }
  if (g.starLottery !== undefined) {
    const lottery = g.starLottery
    if (!isRecord(lottery) || !isStringArray(lottery.cards) || !Array.isArray(lottery.history) ||
      lottery.cards.some((id) => !GOD_RANK_BY_ID.has(id)) || new Set(lottery.cards).size !== lottery.cards.length ||
      typeof lottery.drawsUsed !== 'number' || !Number.isInteger(lottery.drawsUsed) || lottery.drawsUsed < 0 ||
      (lottery.lastRequestId !== undefined && typeof lottery.lastRequestId !== 'string')) return false
    for (const entry of lottery.history) {
      if (!isRecord(entry) || typeof entry.requestId !== 'string' || typeof entry.drawNumber !== 'number' ||
        !isStringArray(entry.godIds) || !isStringArray(entry.newGodIds) || !isStringArray(entry.duplicateGodIds) ||
        typeof entry.affinityGained !== 'number' || typeof entry.atSeason !== 'number') return false
    }
    if (lottery.pendingV2 !== undefined &&
      !isValidStarLotteryPendingV2(lottery.pendingV2, lottery.drawsUsed, lottery.cards)) return false
    if (lottery.lastReceipt !== undefined && !isValidLotteryReceipt(lottery.lastReceipt, lottery.drawsUsed)) return false
  }
  if (g.framedHeirloomIds !== undefined) {
    if (!isStringArray(g.framedHeirloomIds) || g.framedHeirloomIds.length > 3 ||
      new Set(g.framedHeirloomIds).size !== g.framedHeirloomIds.length) return false
  }
  if (g.dungeonRun !== undefined && !isValidDungeonRun(g.dungeonRun, new Set(g.family.map((character) => character.id)))) return false
  return true
}

type Persisted = GameData & { lastPlayedAt: number; saveSeq: number; saveFingerprint?: string }

export type SaveFailureReason = StorageFailureReason | 'read-only' | 'serialization' | 'verification'

export type SaveResult =
  | { ok: true; saveSeq: number; fingerprint: string; chronicleLimit: number }
  | { ok: false; reason: SaveFailureReason; previousSavePreserved: boolean }

function parseRaw(raw: string | null): { raw: string; data: Persisted } | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Persisted
    if (!isValidSave(data)) return null
    return { raw, data }
  } catch {
    return null
  }
}

function readRaw(key: string): { raw: string; data: Persisted } | null {
  const stored = safeStorageGet(key)
  return stored.ok ? parseRaw(stored.value) : null
}

function fingerprint(raw: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function restoreMain(raw: string | null): boolean {
  const current = safeStorageGet(KEY)
  if (current.ok && current.value === raw) return true
  const restored = raw === null ? safeStorageRemove(KEY) : safeStorageSet(KEY, raw)
  if (!restored.ok) return false
  const reread = safeStorageGet(KEY)
  return reread.ok && reread.value === raw
}

export function saveGame(data: GameData): SaveResult {
  if (saveReadOnly) return { ok: false, reason: 'read-only', previousSavePreserved: true }
  const oldMain = safeStorageGet(KEY)
  const oldBak = safeStorageGet(KEY_BAK)
  if (!oldMain.ok || !oldBak.ok) {
    const reason = !oldMain.ok ? oldMain.reason : !oldBak.ok ? oldBak.reason : 'unavailable'
    return { ok: false, reason, previousSavePreserved: true }
  }
  // load専用のrecoverNarrativeOnLoadはここで呼ばない。表示中sceneを保存のたびに
  // 灯の余白へ退避してしまうため、保存時は追加schemaの正規化だけに留める。
  const withProgression = normalizeCharacterProgression(data)
  const withCollection = { ...withProgression, collectionV2: migrateCollectionV2(withProgression) }
  const withJourney = { ...withCollection, journeyMetrics: migrateJourneyMetrics(withCollection) }
  const normalizedWithMetadata: GameData & { saveSeq?: number; saveFingerprint?: string } = {
    ...withJourney,
    starLottery: migrateStarLottery(withJourney),
  }
  // load後のobjectには永続層だけの検証metadataが残っている。次のpayloadへ旧fingerprintを
  // 混ぜると、再読込照合時に「fingerprintを除いた本文」と一致せず、正常な進行を旧mainへ
  // rollbackしてしまう。game dataだけを次の署名対象にする。
  delete normalizedWithMetadata.saveSeq
  delete normalizedWithMetadata.saveFingerprint
  const normalizedData: GameData = normalizedWithMetadata
  // 直前の正常セーブ(saveSeq取得+BAK候補)
  const prev = parseRaw(oldMain.value)
  // M32修正: seqは本体だけでなくBAKの最大も上回らせる。本体破損時にseqが1へ再起動すると、
  // 残存する高seqの古いBAKが loadGame の比較で勝ち、直前に保存した正常データを恒久的に覆い隠す。
  const prevBak = parseRaw(oldBak.value)
  const seq = Math.max(prev?.data.saveSeq ?? 0, prevBak?.data.saveSeq ?? 0) + 1
  const savedAt = Date.now()

  const serialize = (chronMax: number): { raw: string; fingerprint: string } => {
    const payload = JSON.stringify({
      ...normalizedData,
      chronicle: boundChronicle(normalizedData.chronicle, chronMax),
      lastPlayedAt: savedAt,
      saveSeq: seq,
    })
    const valueFingerprint = fingerprint(payload)
    const parsed = JSON.parse(payload) as Persisted
    return { raw: JSON.stringify({ ...parsed, saveFingerprint: valueFingerprint }), fingerprint: valueFingerprint }
  }

  // 本保存 — quota時のみ梯子(1200→600→0)。年代記の全喪失 > セーブの全喪失。
  const ladder = [CHRON_MAX, CHRON_TIGHT, 0]
  for (let i = 0; i < ladder.length; i++) {
    let candidate: { raw: string; fingerprint: string }
    try {
      candidate = serialize(ladder[i])
    } catch {
      return { ok: false, reason: 'serialization', previousSavePreserved: true }
    }
    const write = safeStorageSet(KEY, candidate.raw)
    if (write.ok) {
      const persisted = safeStorageGet(KEY)
      const parsed = persisted.ok && persisted.value !== null ? parseRaw(persisted.value) : null
      const copy = parsed ? { ...parsed.data } : null
      if (copy) delete copy.saveFingerprint
      const matches = !!parsed && parsed.data.saveSeq === seq && parsed.data.saveFingerprint === candidate.fingerprint &&
        !!copy && fingerprint(JSON.stringify(copy)) === candidate.fingerprint
      if (!matches) {
        const preserved = restoreMain(oldMain.value)
        return { ok: false, reason: 'verification', previousSavePreserved: preserved }
      }

      // mainの永続化を再読込で確認してから初めてBAKを更新する。
      if (prev) {
        if (candidate.raw.length + prev.raw.length <= BAK_BUDGET_CHARS) safeStorageSet(KEY_BAK, prev.raw)
        else safeStorageRemove(KEY_BAK)
      }
      if (i === 1) warnOnce('蔵書が嵩んでいた — 古い出来事の記を畳んで保存した。')
      if (i === 2) warnOnce('記の場所が足りない — 年代記を畳んで家族だけ保存した。「セーブの管理」で控えの書き出しを勧める。')
      return { ok: true, saveSeq: seq, fingerprint: candidate.fingerprint, chronicleLimit: ladder[i] }
    }
    if (write.reason !== 'quota') {
      const preserved = restoreMain(oldMain.value)
      console.error(`saveGame failed (${write.reason})`)
      return { ok: false, reason: write.reason, previousSavePreserved: preserved }
    }
  }
  // 全段失敗(プライベートモード等の恒常失敗を含む)= 致命。軽い警告に握り潰されないよう critical で。
  warnOnce('この端末には記が保存できていない。「セーブの管理」からの書き出しで控えを残すことを強く勧める。', 'critical')
  return { ok: false, reason: 'quota', previousSavePreserved: restoreMain(oldMain.value) }
}

// v1(季節単位)→v3(月単位): 時間軸を3倍に換算
function migrateV1(d: GameData): GameData {
  return {
    ...d,
    seasonIndex: d.seasonIndex * 3,
    family: d.family.map((c) => ({
      ...c,
      bornSeason: c.bornSeason * 3,
      deathSeason: c.deathSeason !== undefined ? c.deathSeason * 3 : undefined,
    })),
    pendingBirths: d.pendingBirths.map((b) => ({ ...b, dueSeason: b.dueSeason * 3 })),
    chronicle: d.chronicle.map((e) => ({ ...e, season: e.season * 3 })),
    expedition: undefined,
  }
}

// v3→v4: Character に optional jobClass が加わっただけ(後方互換)。
// 旧キャラは無職のまま有効。探索状態は畳んで正規化する。
function migrateV3(d: GameData): GameData {
  return {
    ...d,
    family: d.family.map((c) => ({ jobClass: undefined, ...c })),
    expedition: undefined,
  }
}

// M26 §12.1: 図鑑の個別既読への移行。旧セーブは flags.codexSeenEn/Gods(件数の高水位マーク)で
// 既読を記録していた。件数が示す「既読分」を忠実にID集合へ変換する — これにより、旧セーブで
// 未読だった項目(件数を超える分)は移行後も新着のまま残り、偽の新着爆発も偽既読も起きない。
// codexSeenIds が既にあれば何もしない(冪等)。isValidSave を壊さない optional フィールド。
function migrateCodexSeen(d: GameData): GameData {
  if (d.codexSeenIds) return d
  const en = d.codex?.enemies ?? []
  const gd = d.codex?.gods ?? []
  const enCount = typeof d.flags?.codexSeenEn === 'number' ? d.flags.codexSeenEn : 0
  const gdCount = typeof d.flags?.codexSeenGods === 'number' ? d.flags.codexSeenGods : 0
  const baseId = (id: string) => id.replace(/_[wo]$/, '') // Codex.baseEnemyId と同義
  return {
    ...d,
    codexSeenIds: {
      enemies: [...new Set(en.slice(0, enCount).map(baseId))],
      gods: [...new Set(gd.slice(0, gdCount))],
    },
  }
}

const PROGRESSION_STAT_KEYS: readonly StatKey[] = ['str', 'vit', 'dex', 'agi', 'mnd', 'luk']

function canRecalculateCharacter(c: Character): boolean {
  return typeof c.bornSeason === 'number' && Number.isFinite(c.bornSeason)
    && typeof c.alive === 'boolean'
    && typeof c.maxHp === 'number' && Number.isFinite(c.maxHp)
    && typeof c.maxMp === 'number' && Number.isFinite(c.maxMp)
    && !!c.potential && PROGRESSION_STAT_KEYS.every((key) => (
      typeof c.potential[key] === 'number' && Number.isFinite(c.potential[key])
    ))
}

/** save/load/importで共有するprogression正規化。既存の最小fixtureは能力再計算を要求しない。 */
function normalizeCharacterProgression(d: GameData): GameData {
  return {
    ...d,
    family: d.family.map((character) => {
      const beforeLevel = character.level
      const beforeExp = character.exp
      const migrated = migrateCharacterProgression(character)
      const changed = migrated.level !== beforeLevel || migrated.exp !== beforeExp
      return changed && canRecalculateCharacter(migrated)
        ? recalcStats(migrated, d.seasonIndex)
        : migrated
    }),
  }
}

export function normalizeLoadedData(d: GameData, now = Date.now()): GameData {
  const progressionMigrated = normalizeCharacterProgression(d)
  const seenMigrated = migrateCodexSeen(progressionMigrated)
  const withNarrative = recoverNarrativeOnLoad({ ...seenMigrated, collectionV2: migrateCollectionV2(seenMigrated) })
  const withJourney = { ...withNarrative, journeyMetrics: migrateJourneyMetrics(withNarrative, now) }
  return { ...withJourney, starLottery: migrateStarLottery(withJourney) }
}

function finalizeLoaded(d: GameData, forcePersist = false): GameData {
  const migrated = normalizeLoadedData(d)
  // 旧saveのsentinel付与、または表示中sceneの灯の余白への回収は一度で永続化する。
  // JSON比較はload時だけで、schemaが小さく明瞭なことを優先する。
  if (forcePersist || JSON.stringify(migrated) !== JSON.stringify(d)) saveGame(migrated)
  return migrated
}

export function loadGame(): GameData | null {
  try {
    const main = readRaw(KEY)
    const bak = readRaw(KEY_BAK)
    const safeFinalize = (candidate: Persisted): GameData | null => {
      try {
        return finalizeLoaded(candidate)
      } catch {
        return null
      }
    }
    // 両方有効: saveSeq(単調増分)が大きい方=より新しい正常セーブ。通常はmain。
    if (main && bak && (bak.data.saveSeq ?? 0) > (main.data.saveSeq ?? 0)) {
      const restored = safeFinalize(bak.data)
      if (restored) {
        warnOnce('記に乱れがあった — 一つ前の正常な記から復した。')
        return restored
      }
    }
    if (main) {
      const loaded = safeFinalize(main.data)
      if (loaded) return loaded
    }
    if (bak) {
      // 本体が破損/欠落 — 検証済みの控えから復旧
      const restored = safeFinalize(bak.data)
      if (restored) {
        warnOnce('記が壊れていた — 控えの記から復した。')
        return restored
      }
    }
    // v4が無い/破損 — 旧版からの移行を試す
    const rawV3Result = safeStorageGet(KEY_V3)
    const rawV3 = rawV3Result.ok ? rawV3Result.value : null
    if (rawV3) {
      const migrated = finalizeLoaded(migrateV3(JSON.parse(rawV3) as GameData), true)
      safeStorageRemove(KEY_V3)
      return migrated
    }
    const rawV1Result = safeStorageGet(KEY_V1)
    const rawV1 = rawV1Result.ok ? rawV1Result.value : null
    if (rawV1) {
      const migrated = finalizeLoaded(migrateV3(migrateV1(JSON.parse(rawV1) as GameData)), true)
      safeStorageRemove(KEY_V1)
      return migrated
    }
    return null
  } catch {
    return null
  }
}

// テスト用にエクスポート(移行の冪等性・忠実性を機械検証する)
export { migrateCodexSeen }

export function hasSave(): boolean {
  return [KEY, KEY_BAK, KEY_V3, KEY_V1].some((key) => {
    const stored = safeStorageGet(key)
    return stored.ok && stored.value !== null
  })
}

export type SaveSlotStatus = 'none' | 'ready' | 'recoverable' | 'damaged' | 'unavailable'

/**
 * タイトルで「続けられる記」と「存在するが読めない記」を混同しないための
 * 読み取り専用診断。ロードや移行、保存内容の書換えは行わない。
 */
export function inspectSaveSlot(): SaveSlotStatus {
  const reads = [KEY, KEY_BAK, KEY_V3, KEY_V1].map((key) => safeStorageGet(key))
  if (reads.some((result) => !result.ok)) return 'unavailable'
  const [rawMain, rawBak, rawV3, rawV1] = reads.map((result) => result.ok ? result.value : null)
  if (rawMain === null && rawBak === null && rawV3 === null && rawV1 === null) return 'none'

  if (readRaw(KEY)) return 'ready'
  if (readRaw(KEY_BAK)) return 'recoverable'

  // 旧版はcontinue時に正式なmigrationを通す。ここでは壊れたJSONを「続けられる」と
  // 表示しないため、少なくともobjectとして読めることだけを副作用なく確認する。
  for (const raw of [rawV3, rawV1]) {
    if (!raw) continue
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isRecord(parsed)) return 'recoverable'
    } catch {
      // damagedへ落とす
    }
  }
  return 'damaged'
}

/** download専用。書換えずに、main/BAK/旧版から検証・migration済みの最新候補を得る。 */
export function exportableSaveData(): GameData | null {
  try {
    const main = readRaw(KEY)
    const bak = readRaw(KEY_BAK)
    const current = [main?.data, bak?.data]
      .filter((candidate): candidate is Persisted => !!candidate)
      .sort((a, b) => (b.saveSeq ?? 0) - (a.saveSeq ?? 0))
    for (const candidate of current) {
      try {
        return normalizeLoadedData(candidate, candidate.lastPlayedAt ?? 0)
      } catch {
        // 次の検証済み候補(通常はBAK)へ
      }
    }

    const migrateLegacy = (raw: string | null, kind: 'v3' | 'v1'): GameData | null => {
      if (!raw) return null
      const parsed: unknown = JSON.parse(raw)
      if (!isValidSave(parsed)) return null
      const migrated = kind === 'v1' ? migrateV3(migrateV1(parsed)) : migrateV3(parsed)
      return normalizeLoadedData(migrated, migrated.lastPlayedAt ?? 0)
    }
    const v3 = safeStorageGet(KEY_V3)
    const v1 = safeStorageGet(KEY_V1)
    return migrateLegacy(v3.ok ? v3.value : null, 'v3') ?? migrateLegacy(v1.ok ? v1.value : null, 'v1')
  } catch {
    return null
  }
}

export function exportSaveString(): string | null {
  const candidate = exportableSaveData()
  return candidate ? JSON.stringify(candidate) : null
}

export function clearSave(): boolean {
  return [KEY, KEY_BAK, KEY_V3, KEY_V1].map((key) => safeStorageRemove(key)).every((result) => result.ok)
}

// ---- セーブのエクスポート/インポート(データ移行・バックアップ用) ----

// 現行セーブをJSONファイルとしてダウンロード。セーブが無ければfalse。
export function downloadSave(): boolean {
  const raw = exportSaveString()
  if (!raw) return false
  try {
    const stamp = new Date().toISOString().slice(0, 10)
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hitsugi_save_${stamp}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

// JSON文字列を検証してセーブへ書き込む。成功時true。
// M19 C3: 生setItemでなくsaveGame経路を通す(bound/BAK/saveSeq/quota梯子が全て効く=devil指摘の穴を閉じる)。
export type ImportSaveResult =
  | { ok: true; saveSeq: number; fingerprint: string }
  | { ok: false; reason: 'invalid-json' | 'invalid-save' | SaveFailureReason; previousSavePreserved: boolean }

export function importSaveStringResult(json: string): ImportSaveResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, reason: 'invalid-json', previousSavePreserved: true }
  }
  if (!isValidSave(parsed)) return { ok: false, reason: 'invalid-save', previousSavePreserved: true }
  try {
    const result = saveGame(parsed as GameData)
    if (!result.ok) return result
    const persisted = readRaw(KEY)
    if (persisted?.data.saveSeq !== result.saveSeq || persisted.data.saveFingerprint !== result.fingerprint) {
      return { ok: false, reason: 'verification', previousSavePreserved: false }
    }
    return { ok: true, saveSeq: result.saveSeq, fingerprint: result.fingerprint }
  } catch {
    return { ok: false, reason: 'serialization', previousSavePreserved: true }
  }
}

export function importSaveString(json: string): boolean {
  return importSaveStringResult(json).ok
}
