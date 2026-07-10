import type { GameData, ChronicleEntry } from './types'

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
let warnedThisSession = false
export function setSaveTroubleSink(fn: ((msg: string) => void) | null): void {
  troubleSink = fn
}
function warnOnce(msg: string): void {
  if (warnedThisSession) return
  warnedThisSession = true
  troubleSink?.(msg)
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

// 構造+意味の妥当性 — BAK復旧を機能させる下限不変条件(devil指摘: 構造検証だけでは意味的破損を素通しする)
export function isValidSave(d: unknown): d is GameData & { saveSeq?: number } {
  if (!d || typeof d !== 'object') return false
  const g = d as Partial<GameData>
  if (!Array.isArray(g.family) || g.family.length < 1) return false
  if (typeof g.seasonIndex !== 'number' || !Number.isFinite(g.seasonIndex) || g.seasonIndex < 0) return false
  if (typeof g.hoto !== 'number' || !Number.isFinite(g.hoto)) return false
  if (!Array.isArray(g.chronicle)) return false
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
  // 直前の正常セーブ(saveSeq取得+BAK候補)
  const prev = readRaw(KEY)
  const seq = (prev?.data.saveSeq ?? 0) + 1

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
  // 全段失敗(プライベートモード等の恒常失敗を含む)
  warnOnce('この端末には記が保存できていない。「セーブの管理」からの書き出しで控えを残すことを強く勧める。')
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

export function loadGame(): GameData | null {
  try {
    const main = readRaw(KEY)
    const bak = readRaw(KEY_BAK)
    // 両方有効: saveSeq(単調増分)が大きい方=より新しい正常セーブ。通常はmain。
    if (main && bak && (bak.data.saveSeq ?? 0) > (main.data.saveSeq ?? 0)) {
      warnOnce('記に乱れがあった — 一つ前の正常な記から復した。')
      return bak.data
    }
    if (main) return main.data
    if (bak) {
      // 本体が破損/欠落 — 検証済みの控えから復旧
      warnOnce('記が壊れていた — 控えの記から復した。')
      return bak.data
    }
    // v4が無い/破損 — 旧版からの移行を試す
    const rawV3 = localStorage.getItem(KEY_V3)
    if (rawV3) {
      const migrated = migrateV3(JSON.parse(rawV3) as GameData)
      saveGame(migrated)
      localStorage.removeItem(KEY_V3)
      return migrated
    }
    const rawV1 = localStorage.getItem(KEY_V1)
    if (rawV1) {
      const migrated = migrateV3(migrateV1(JSON.parse(rawV1) as GameData))
      saveGame(migrated)
      localStorage.removeItem(KEY_V1)
      return migrated
    }
    return null
  } catch {
    return null
  }
}

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
