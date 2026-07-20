import type { GameData, ChronicleEntry, NarrativeScene } from './types'
import { recoverNarrativeOnLoad } from './narrative'

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

function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)
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

// 構造+意味の妥当性 — BAK復旧を機能させる下限不変条件(devil指摘: 構造検証だけでは意味的破損を素通しする)
export function isValidSave(d: unknown): d is GameData & { saveSeq?: number } {
  if (!d || typeof d !== 'object') return false
  const g = d as Partial<GameData>
  if (!Array.isArray(g.family) || g.family.length < 1) return false
  // M29修正: 各族員の最低限の形(id/hp)を検証。空{}のような偽の族員(family:[{}])が通過して
  // store.tsの c.equipment[...] や hp 参照で例外/NaN化する crash-on-continue を防ぐ(devil C2)。
  for (const c of g.family) {
    if (!c || typeof c !== 'object') return false
    const cc = c as { id?: unknown; hp?: unknown; equipment?: unknown }
    if (typeof cc.id !== 'string' || typeof cc.hp !== 'number' || !Number.isFinite(cc.hp)) return false
    // M32修正: equipment欠落の族員は advanceSeason(寿命死判定 c.equipment[slot])で即例外化する。
    if (typeof cc.equipment !== 'object' || cc.equipment === null) return false
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
  return true
}

type Persisted = GameData & { lastPlayedAt: number; saveSeq: number }

function readRaw(key: string): { raw: string; data: Persisted } | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as Persisted
    if (!isValidSave(data)) return null
    return { raw, data }
  } catch {
    return null
  }
}

export function saveGame(data: GameData): void {
  if (saveReadOnly) return // M33: 別タブの保存を検知した後は保存を止め、相手の新しい進行を上書きしない
  // 直前の正常セーブ(saveSeq取得+BAK候補)
  const prev = readRaw(KEY)
  // M32修正: seqは本体だけでなくBAKの最大も上回らせる。本体破損時にseqが1へ再起動すると、
  // 残存する高seqの古いBAKが loadGame の比較で勝ち、直前に保存した正常データを恒久的に覆い隠す。
  const prevBak = readRaw(KEY_BAK)
  const seq = Math.max(prev?.data.saveSeq ?? 0, prevBak?.data.saveSeq ?? 0) + 1

  const serialize = (chronMax: number) =>
    JSON.stringify({ ...data, chronicle: boundChronicle(data.chronicle, chronMax), lastPlayedAt: Date.now(), saveSeq: seq })

  // 1世代BAK — 合算が予算超ならBAKを捨てる(救う機構がquotaの引き金にならないように)
  if (prev) {
    try {
      const estimatedMain = serialize(CHRON_MAX).length
      if (estimatedMain + prev.raw.length <= BAK_BUDGET_CHARS) {
        localStorage.setItem(KEY_BAK, prev.raw)
      } else {
        localStorage.removeItem(KEY_BAK)
      }
    } catch {
      // BAKの失敗は本保存を妨げない
    }
  }

  // 本保存 — quota時のみ梯子(1200→600→0)。年代記の全喪失 > セーブの全喪失。
  const ladder = [CHRON_MAX, CHRON_TIGHT, 0]
  for (let i = 0; i < ladder.length; i++) {
    try {
      localStorage.setItem(KEY, serialize(ladder[i]))
      if (i === 1) warnOnce('蔵書が嵩んでいた — 古い出来事の記を畳んで保存した。')
      if (i === 2) warnOnce('記の場所が足りない — 年代記を畳んで家族だけ保存した。「セーブの管理」で控えの書き出しを勧める。')
      return
    } catch (e) {
      if (!isQuotaError(e)) {
        // stringify不能等の別種バグをquotaと誤診しない
        console.error('saveGame failed (non-quota):', e)
        return
      }
    }
  }
  // 全段失敗(プライベートモード等の恒常失敗を含む)= 致命。軽い警告に握り潰されないよう critical で。
  warnOnce('この端末には記が保存できていない。「セーブの管理」からの書き出しで控えを残すことを強く勧める。', 'critical')
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

function finalizeLoaded(d: GameData, forcePersist = false): GameData {
  const migrated = recoverNarrativeOnLoad(migrateCodexSeen(d))
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
    const rawV3 = localStorage.getItem(KEY_V3)
    if (rawV3) {
      const migrated = finalizeLoaded(migrateV3(JSON.parse(rawV3) as GameData), true)
      localStorage.removeItem(KEY_V3)
      return migrated
    }
    const rawV1 = localStorage.getItem(KEY_V1)
    if (rawV1) {
      const migrated = finalizeLoaded(migrateV3(migrateV1(JSON.parse(rawV1) as GameData)), true)
      localStorage.removeItem(KEY_V1)
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
  return (
    localStorage.getItem(KEY) !== null ||
    localStorage.getItem(KEY_BAK) !== null ||
    localStorage.getItem(KEY_V3) !== null ||
    localStorage.getItem(KEY_V1) !== null
  )
}

export function clearSave(): void {
  localStorage.removeItem(KEY)
  localStorage.removeItem(KEY_BAK)
  localStorage.removeItem(KEY_V3)
  localStorage.removeItem(KEY_V1)
}

// ---- セーブのエクスポート/インポート(データ移行・バックアップ用) ----

// 現行セーブをJSONファイルとしてダウンロード。セーブが無ければfalse。
export function downloadSave(): boolean {
  const raw = localStorage.getItem(KEY)
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
export function importSaveString(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as Partial<GameData>
    if (!isValidSave(parsed)) return false
    saveGame(parsed as GameData)
    return true
  } catch {
    return false
  }
}
