// M18 P2: 郷ホームの血脈診断・状況別推奨・郷の帳 — 全て現在stateからの純粋導出(store非改変)
// 設計: docs/UI_UX_REDESIGN_PLAN.md §4.2(診断) §4.3(推奨6条) §4.4(月送り予告) §4.5(帳)
import type { GameData, Character } from '../core/types'
import { LIFESPAN_MONTHS, MOTTOS, isFestivalMonth } from '../core/types'
import { ageOf, isAdult } from '../core/inheritance'
import { GODS } from '../core/data/gods'
import { ENEMIES } from '../core/data/enemies'
import { FACILITIES, FACILITY_MAX_LV, facilityCost, facilityLevel } from '../core/data/facilities'
import { GOSSIP } from '../core/data/gossip'
import { VILLAGERS } from '../core/data/villagers'

// ---- 血脈診断(§4.2) ----
export interface Census {
  alive: Character[]
  adults: Character[]
  children: Character[]
  pregnant: number // 懐妊中(pendingBirths)
  hasHeir: boolean // 後継: 当主以外の存命 or 懐妊があるか
  minLife: { ch: Character; months: number } | null // 最短の残寿命
  dying: Character[] // 瀕死(HP30%未満)
  mpDry: Character[] // 技力枯渇(MP0)
  monthsToAdult: number | null // 最年長の幼子が成人するまでの残月
}

export function census(d: GameData): Census {
  const alive = d.family.filter((c) => c.alive)
  const adults = alive.filter((c) => isAdult(c, d.seasonIndex))
  const children = alive.filter((c) => !isAdult(c, d.seasonIndex))
  const pregnant = d.pendingBirths.length
  const hasHeir = alive.length > 1 || pregnant > 0
  let minLife: Census['minLife'] = null
  for (const c of alive) {
    const months = Math.max(0, LIFESPAN_MONTHS - ageOf(c, d.seasonIndex))
    if (!minLife || months < minLife.months) minLife = { ch: c, months }
  }
  const dying = alive.filter((c) => c.hp / c.maxHp < 0.3)
  const mpDry = alive.filter((c) => c.mp <= 0)
  const monthsToAdult = children.length > 0
    ? Math.min(...children.map((c) => Math.max(0, 6 - ageOf(c, d.seasonIndex))))
    : null
  return { alive, adults, children, pregnant, hasHeir, minLife, dying, mpDry, monthsToAdult }
}

// ---- 状況別推奨(§4.3 の6条・上から評価) ----
export type ActionKind = 'depart' | 'pact' | 'festival' | 'rest'
export interface Recommendation {
  action: ActionKind
  reason: string // 1行で必ず表示
}

export function recommendAction(d: GameData): Recommendation {
  const c = census(d)
  const cheapestPact = Math.min(...GODS.map((g) => g.cost))
  const canPact = c.adults.length > 0 && d.hoto >= cheapestPact

  // 1. 存命1・後継なし・契り可能 → 星契り
  if (c.alive.length === 1 && !c.hasHeir && canPact) {
    return { action: 'pact', reason: '存命はひとり、後継もない。血が絶えれば夜が勝つ — まず次代を。' }
  }
  // 2. 成人0・幼子あり → 静養(月送り)
  if (c.adults.length === 0 && c.children.length > 0) {
    return { action: 'rest', reason: `動ける大人がいない。幼子の成人まであと${c.monthsToAdult}月 — 月を送って待つ。` }
  }
  // 3. 出立可能者の平均HP30%未満 → 静養
  if (c.adults.length > 0) {
    const avg = c.adults.reduce((s, ch) => s + ch.hp / ch.maxHp, 0) / c.adults.length
    if (avg < 0.3) {
      return { action: 'rest', reason: '隊の傷が深い。このまま夜藪へ入れば灯を落とす — 傷を癒せ。' }
    }
  }
  // 4. 祭月かつ2人以上が負傷 → 祭
  if (isFestivalMonth(d.seasonIndex) && c.dying.length + c.alive.filter((ch) => ch.hp < ch.maxHp).length >= 2 && d.hoto >= 30) {
    return { action: 'festival', reason: '祭月だ。傷んだ一族をまとめて癒し、星との縁も深まる。' }
  }
  // 5. 奉燈が次の必須費用(最安の契り)未満 → 出立
  if (canPact === false && c.adults.length > 0 && d.hoto < cheapestPact) {
    return { action: 'depart', reason: `奉燈が細い(契りにあと${cheapestPact - d.hoto})。夜藪で実りを持ち帰れ。` }
  }
  // 6. それ以外 → 出立
  return { action: 'depart', reason: '灯は足り、血は続いている。夜藪を進み、頂へ近づく月だ。' }
}

// ---- 月送り確認の予告(§4.4) — 次月に確定している出来事 ----
export function nextMonthNotes(d: GameData): string[] {
  const notes: string[] = []
  for (const b of d.pendingBirths) {
    if (b.dueSeason === d.seasonIndex + 1) notes.push('翌月、子が生まれる。')
  }
  for (const ch of d.family.filter((x) => x.alive)) {
    const age = ageOf(ch, d.seasonIndex)
    if (age === 5) notes.push(`${ch.name}が翌月、成人する。`)
    const left = LIFESPAN_MONTHS - age
    if (left === 1) notes.push(`${ch.name}の灯は翌月、尽きる。`)
  }
  if (isFestivalMonth(d.seasonIndex + 1)) notes.push('翌月は祭月。')
  return notes
}

// ---- 郷の帳(§4.5) — 各入口の現在値とlive badge ----
export interface LedgerEntry {
  key: string
  label: string
  value: string // 現在値(名前+現在値の帳面)
  badge?: number // 新着/達成/受領可。0なら出さない
}

export function ledgerStats(d: GameData, odaiClaimable: boolean): { work: LedgerEntry[]; record: LedgerEntry[]; mind: LedgerEntry[] } {
  const gen = d.family.length > 0 ? Math.max(...d.family.map((c) => c.gen)) : 0
  const deaths = d.family.filter((c) => !c.alive).length
  const aliveN = d.family.filter((c) => c.alive).length
  const baseEnemies = ENEMIES.filter((e) => !/_[wo]$/.test(e.id)).length
  const seen = new Set((d.codex?.enemies ?? []).map((id) => id.replace(/_[wo]$/, ''))).size
  const codexPct = Math.round((seen / Math.max(1, baseEnemies)) * 100)
  // 普請: 未完成で最安の次費用
  let cheapest: { name: string; cost: number } | null = null
  for (const f of FACILITIES) {
    const lv = facilityLevel(d.facilities, f.id)
    if (lv >= FACILITY_MAX_LV) continue
    const cost = facilityCost(f.id, lv)
    if (!cheapest || cost < cheapest.cost) cheapest = { name: f.name, cost }
  }
  // 郷の声: 解禁済みのうち未読(既読カーソルは flags.gossipSeen)
  const gossipUnlocked = Math.min(d.gossipIndex ?? 0, GOSSIP.length)
  const gossipSeen = typeof d.flags.gossipSeen === 'number' ? d.flags.gossipSeen : 0
  const gossipNew = Math.max(0, gossipUnlocked - gossipSeen)
  // 図鑑の新着(M19 A1): 既読カーソル(flags)以降に増えた発見数
  const codexNew = Math.max(0, (d.codex?.enemies?.length ?? 0) - (typeof d.flags.codexSeenEn === 'number' ? d.flags.codexSeenEn : 0))
    + Math.max(0, (d.codex?.gods?.length ?? 0) - (typeof d.flags.codexSeenGods === 'number' ? d.flags.codexSeenGods : 0))
  const fam = d.familiars ?? []
  const activeFam = fam.find((f) => f.enemyId === d.activeFamiliar)

  const work: LedgerEntry[] = [
    { key: 'forge', label: '鍛冶と蔵', value: `蔵に${d.inventory.length}品` },
    { key: 'facilities', label: '郷普請', value: cheapest ? `次の普請 ${cheapest.cost}燈` : '全て完成' },
    { key: 'village', label: '郷を歩く', value: `郷人${VILLAGERS.length}` },
    { key: 'familiars', label: '眷属', value: activeFam ? `随行: ${activeFam.name}` : fam.length > 0 ? `懐き${fam.length}・随行なし` : 'まだいない' },
  ]
  const record: LedgerEntry[] = [
    { key: 'chronicle', label: '家譜', value: `第${gen}代・故人${deaths}` },
    { key: 'codex', label: '図鑑', value: `魔性${codexPct}%`, badge: codexNew },
    { key: 'tree', label: '家系図', value: `存命${aliveN}・全${d.family.length}` },
    { key: 'gossip', label: '郷の声', value: `${gossipUnlocked}話`, badge: gossipNew },
  ]
  const mind: LedgerEntry[] = [
    { key: 'objectives', label: '務め', value: odaiClaimable ? '御題 達成' : '三つの尺', badge: odaiClaimable ? 1 : 0 },
    { key: 'motto', label: '家訓', value: d.motto ? `「${MOTTOS[d.motto].name}」` : '未設定' },
    { key: 'help', label: '手引き', value: '千年の要点' },
  ]
  return { work, record, mind }
}
