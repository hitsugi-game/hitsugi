// 『灯継ぎ』コア型定義

// ---- 血潮(ステータス) ----
export interface Stats {
  str: number // 力 — 物理攻撃
  vit: number // 体 — HP・防御
  dex: number // 技 — 命中・会心・術攻撃
  agi: number // 速 — 行動順・回避
  mnd: number // 心 — 術防御・MP
  luk: number // 運 — ドロップ・会心・イベント
}
export type StatKey = keyof Stats

export const STAT_LABELS: Record<StatKey, string> = {
  str: '力', vit: '体', dex: '技', agi: '速', mnd: '心', luk: '運',
}

// ---- 属性 ----
export type Element = 'fire' | 'water' | 'wind' | 'earth' | 'moon' | 'star'
export const ELEMENT_LABELS: Record<Element, string> = {
  fire: '火', water: '水', wind: '風', earth: '土', moon: '月', star: '星',
}
// 相克: fire>wind>earth>water>fire, moon<>star(相互弱点)
export const ELEMENT_ADVANTAGE: Record<Element, Element> = {
  fire: 'wind', wind: 'earth', earth: 'water', water: 'fire', moon: 'star', star: 'moon',
}

// ---- 性根 ----
export interface Personality {
  id: string
  label: string
  desc: string
  battleBias: Partial<Stats> // 戦闘中の隠れ補正
  voice: string // 台詞トーンキー
}

// ---- 技 ----
export type SkillType = 'attack' | 'heal' | 'buff' | 'debuff'
export type SkillTarget = 'enemy' | 'enemies' | 'ally' | 'allies' | 'self'
export interface Skill {
  id: string
  name: string
  type: SkillType
  target: SkillTarget
  element?: Element
  power: number // 攻撃/回復倍率(%)
  mpCost: number
  inheritable: boolean // 継承の証にできるか
  desc: string
}

// ---- 星神 ----
export type GodRank = 1 | 2 | 3 | 4 // 下・中・上・極
export const GOD_RANK_LABELS: Record<GodRank, string> = { 1: '下つ星', 2: '中つ星', 3: '上つ星', 4: '極ツ星' }
export interface God {
  id: string
  name: string
  kana: string
  rank: GodRank
  element: Element
  statBias: Partial<Stats> // 血潮の得意分野(遺伝時に加算)
  cost: number // 星契りに必要な奉燈
  skillId: string // 契りで子に授ける技
  personality: string // 一言人柄
  desc: string // 逸話
  pactLines: string[] // 契り時の台詞(親密度順)
  portrait: string // 画像ファイル名
}

// ---- 装備・形見 ----
export type ItemSlot = 'weapon' | 'armor' | 'charm'
export interface Item {
  id: string
  baseId: string
  name: string
  slot: ItemSlot
  atk?: number
  def?: number
  statBonus?: Partial<Stats>
  generation: number // 継承回数(形見強化)
  legacyOf?: string // 元の持ち主名(「祖母の簪」演出)
  price?: number
}

// ---- キャラクター(一族) ----
export interface Character {
  id: string
  name: string
  gen: number // 第n世代
  sex: 'm' | 'f'
  bornSeason: number // 絶対季節インデックス
  potential: Stats // 血潮(成長ポテンシャル 0-120)
  stats: Stats // 現在値
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  element: Element
  personalityId: string
  skills: string[]
  equipment: Partial<Record<ItemSlot, Item>>
  godParentId: string
  humanParentId?: string
  isHead: boolean // 当主
  alive: boolean
  kills: number
  expeditions: number
  deeds: string[] // 生涯の事績(家譜用)
  deathSeason?: number
  deathCause?: string
  epitaph?: string // 辞世
  fatigue: number // 心労 0-100
}

// ---- 敵 ----
export type EnemyTier = 1 | 2 | 3 | 4 | 5 // 5=ボス
export interface EnemyDef {
  id: string
  name: string
  element: Element
  tier: EnemyTier
  hp: number
  atk: number
  def: number
  agi: number
  skillIds: string[]
  hoto: number // ドロップ奉燈
  ketsu: number // ドロップ血珠
  desc: string
  sprite: string
}

// ---- 探索(夜藪行) ----
export type NodeType = 'battle' | 'elite' | 'treasure' | 'camp' | 'event' | 'boss' | 'start'
export interface MapNode {
  id: string
  type: NodeType
  depth: number // 進度
  choices: string[] // 次ノードid
  cleared: boolean
  eventId?: string
  enemyIds?: string[]
}
export interface Expedition {
  regionId: string
  nodes: Record<string, MapNode>
  currentNodeId: string
  light: number // 灯 0-100
  loot: { hoto: number; ketsu: number; items: Item[] }
  partyIds: string[]
  log: string[]
}

export interface Region {
  id: string
  name: string
  desc: string
  depth: number // 全ノード深度
  tier: EnemyTier // 敵の強さ帯
  bossId?: string
  bg: string
  unlockFame: number
}

// ---- 家譜 ----
export interface ChronicleEntry {
  season: number
  kind: 'birth' | 'death' | 'pact' | 'triumph' | 'event' | 'era'
  text: string
  charId?: string
}

// ---- 戦闘 ----
export interface Combatant {
  key: string // 一意キー
  isAlly: boolean
  name: string
  element: Element
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  atk: number
  def: number
  matk: number
  mdef: number
  agi: number
  luk: number
  skills: string[]
  charId?: string // 味方のみ
  enemyId?: string // 敵のみ
  row: 'front' | 'back'
  guard: boolean
  buffs: { atkUp?: number; defUp?: number } // 残ターン数
  chainCount: number // 継足カウント(味方全体で敵ごと管理は battle 側)
}

export interface BattleState {
  allies: Combatant[]
  enemies: Combatant[]
  turn: number
  order: string[] // combatant keys 行動順
  orderIndex: number
  log: BattleLogEntry[]
  phase: 'input' | 'anim' | 'won' | 'lost' | 'fled'
  chainTarget?: string // 直前に攻撃された敵key(継足)
  chain: number // 現在の継足数
}
export interface BattleLogEntry {
  text: string
  kind: 'info' | 'dmg' | 'heal' | 'ko' | 'chain' | 'win' | 'lose'
}

// ---- 季節 ----
export const SEASON_NAMES = ['春', '夏', '秋', '冬'] as const
export const LIFESPAN_SEASONS = 8 // 八季の命
export function seasonLabel(abs: number): string {
  const year = Math.floor(abs / 4) + 1
  return `${year}年目・${SEASON_NAMES[abs % 4]}`
}

// ---- 画面遷移 ----
export type Screen =
  | { id: 'title' }
  | { id: 'intro' }
  | { id: 'home' }
  | { id: 'pact' }
  | { id: 'birth'; charId: string }
  | { id: 'depart' } // 出立準備
  | { id: 'expedition' }
  | { id: 'battle' }
  | { id: 'chronicle' }
  | { id: 'death'; charId: string }
  | { id: 'ending' }

// ---- ゲーム全体状態 ----
export interface GameData {
  seasonIndex: number
  family: Character[]
  hoto: number // 奉燈
  ketsu: number // 血珠
  inventory: Item[]
  godAffinity: Record<string, number>
  fame: number // 武功(地域解放)
  regionsCleared: string[]
  chronicle: ChronicleEntry[]
  expedition?: Expedition
  pendingBirths: { godId: string; parentId: string; dueSeason: number }[]
  flags: Record<string, boolean>
  narrativeMode: boolean // 語り部モード
  seed: number
}
