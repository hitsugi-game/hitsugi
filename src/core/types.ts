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
  // M29修正: type==='buff' の効果種別。'def'=防御上昇 / 'atk'(既定)=攻撃上昇。
  // 旧実装は id 2件のハードコード判定で、灯座「巌」・家業「盾」等の防御バフが説明と逆に攻撃上昇していた。
  buffKind?: 'atk' | 'def'
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
  // 封印条件(北辰老方式の一般化)。無指定=最初から契れる。
  // 複数指定時は全て満たすこと(AND)。regionId=その地域の主を討伐済み。GDD_v3 §3
  unlock?: { fame?: number; regionId?: string; gen?: number }
}

// ---- 装備・形見 ----
export type ItemSlot = 'weapon' | 'armor' | 'charm'
// 入手由来(M22) — 表示専用の来歴。旧セーブの品はundefined=「古くから家にある品」
export type ItemSource = 'shop' | 'chest' | 'boss' | 'rare' | 'divine'
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
  legacyFirstOwner?: string // M34: 再継承しても変わらない最初の持ち主(物語表示専用)
  price?: number
  source?: ItemSource // M22: optional追加(セーブ互換維持・戦闘計算に不使用)
  rareOrigin?: string // M27: 稀相遺物を残した魔性名。optionalで旧セーブ互換
}

// M28-C: 消耗品の所持スタック(回復薬など)。定義本体は data/consumables.ts。
// 装備(Item)とは別系統 — セーブ破損を避けるため equipment/inventory には決して入れない。
export interface ConsumableStack {
  id: string // ConsumableDef.id
  count: number
}

// ---- 灯型(灯座システムの育成軸。定義本体は data/toza.ts) ----
export type Tomoshigata = 'homura' | 'iwao' | 'nagi' | 'sumi'

// ---- 家業(かぎょう) — 郷の生業を戦型に昇華した24職(定義本体は data/jobs.ts) ----
// 役割6系統(攻/盾/疾/癒/呪/支)×流派4統(火巡/土巡/水巡/風巡)。GDD_v3 §2
export type JobClassId =
  | 'kanuchi' | 'ishiku' | 'houjin' | 'kikori' // 攻: 鍛人/石工/庖人/木樵
  | 'touban' | 'kabenuri' | 'sekimori' | 'kakiyui' // 盾: 灯番/壁塗/堰守/垣結
  | 'hikeshi' | 'yamagake' | 'ushou' | 'kamiyui' // 疾: 火消/山駆/鵜匠/紙結
  | 'yumori' | 'kusurigari' | 'ubushi' | 'koutaki' // 癒: 湯守/薬狩/産師/香焚
  | 'kageeshi' | 'menuchi' | 'sumishi' | 'kazakiki' // 呪: 影絵師/面打/墨師/風聞
  | 'utabiku' | 'touji' | 'sendou' | 'takoshi' // 支: 唄比丘/杜氏/船頭/凧師

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
  element: Element // 星脈(せいみゃく) — 星神の親から継ぐ
  tomoshigata?: Tomoshigata // 灯型 — 成人の儀(月齢6)で授かる(幼子は未定)
  jobClass?: JobClassId // 家業 — 生業の儀(月齢12)で選ぶ(それまで・旧セーブは無職)
  personalityId: string
  skills: string[]
  equipment: Partial<Record<ItemSlot, Item>>
  godParentId: string
  humanParentId?: string
  isHead: boolean // 当主
  alive: boolean
  kills: number
  expeditions: number
  lastWords?: string // v3.1 M15-2: 看取りの際に遺した言葉
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
  promptEn?: string // 画像生成用の英語外見記述(M18, nova誤読対策)。base/若/老で同一値をアンカーに使う。未指定時はdescにフォールバック
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
  // M33: atkUp/defUp=残ターン数(既存)、atkMag/defMag=効果量(power由来・max上書き・上限clamp)。
  // 効果量枠を分けることで「大防御(power48)>守り(power30)」を実装しつつ、残ターンのdecayは不変に保つ。
  buffs: { atkUp?: number; defUp?: number; atkMag?: number; defMag?: number }
  chainCount: number // 継足カウント(味方全体で敵ごと管理は battle 側)
  kinKeys?: string[] // v3.1 M12-7: 連携奥義の血縁(兄妹/親子)にあたる味方key
  personalityId?: string // v3.1 M15-1: 戦闘台詞の性根
  weaponLegacy?: string // v3.1 M15-1: 形見の得物の故人名(台詞用)
  mpDiscount?: number // v3.1 M16-4: 静心の加護(技の灯力割引 0〜1)
  boonRage?: boolean // v3.1 M16-4: 血汐の滾り(体力半分以下で攻撃+25%)
  // M28-B: ダメージ下限割合。減算防御(def×0.9)で弱攻撃が1固定になる問題の是正。
  // 生ダメージ(防御前)のこの割合は必ず通す。tier別: 弱敵=大/ボス=小 で難易度カーブを保つ。
  dmgFloorFrac?: number
}

// M25 §5: 敵の兆し(次行動のカテゴリ)。攻=単体攻撃 / 術=状態・属性技 / 群=全体・複数攻撃。
// 表示専用 — 戦闘計算・対象選択・AIには一切使わない(enemyActionは不変)。
export type EnemyIntent = 'atk' | 'tech' | 'aoe'

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
  leaderKey?: string // v3.1 M12-4: 敵の「長」。斃すと雑兵が浮き足立つ
  morale?: boolean // 長が斃れた後true(敵弱体+逃走判定)
  intents?: Record<string, EnemyIntent> // M25 §5: 敵key→次行動カテゴリ(表示専用・先読み)
}
export interface BattleLogEntry {
  text: string
  kind: 'info' | 'dmg' | 'heal' | 'ko' | 'chain' | 'win' | 'lose' | 'voice'
  // v3.1 M8: ログ駆動演出用メタデータ(全てoptional・戦闘計算には不使用)
  actorKey?: string
  targetKey?: string
  amount?: number
  element?: Element
  crit?: boolean
  weak?: boolean // 弱点を突いた
}

// ---- 暦(v3: 月次) ----
// seasonIndex は歴史的名称のまま「月インデックス」を表す(0 = 1年目睦月)
export const MONTH_NAMES = [
  '睦月', '如月', '弥生', '卯月', '皐月', '水無月',
  '文月', '葉月', '長月', '神無月', '霜月', '師走',
] as const
export const SEASON_NAMES = ['春', '夏', '秋', '冬'] as const
export const LIFESPAN_MONTHS = 24 // 廿四月の命(旧: 八季)
export function seasonLabel(abs: number): string {
  const year = Math.floor(abs / 12) + 1
  return `${year}年目・${MONTH_NAMES[abs % 12]}`
}
export function seasonOfMonth(abs: number): (typeof SEASON_NAMES)[number] {
  return SEASON_NAMES[Math.floor(((abs % 12) + 1) / 3) % 4]
}
// 季の変わり目(祭が開ける月): 弥生・水無月・長月・師走
export function isFestivalMonth(abs: number): boolean {
  return abs % 3 === 2
}

// ---- 画面遷移 ----
export type Screen =
  | { id: 'title' }
  | { id: 'intro' }
  | { id: 'home' }
  | { id: 'pact' }
  | { id: 'birth'; charId: string }
  | { id: 'ceremony'; charId: string } // 成人の儀 — 灯型を授ける(月齢6)
  | { id: 'jobrite'; charId: string } // 生業の儀 — 家業を選ぶ(月齢12)
  | { id: 'life'; title: string; lines: { speaker: string; text: string }[]; bg?: string; narrativeId?: string } // ライフイベント
  | { id: 'village' } // 燈ノ郷を歩く(M23: 月不消費の郷内マップ)
  | { id: 'depart' } // 出立準備
  | { id: 'expedition' }
  | { id: 'dungeon' } // 歩行ダンジョン(v2)
  | { id: 'battle' }
  | { id: 'chronicle' }
  | { id: 'codex' } // 図鑑(v3.1 M14: 魔性/星神/土地の記)
  | { id: 'forge' } // 鍛冶と蔵(M18 P3: 独立作業画面)
  | { id: 'facilities' } // 郷普請(M18 P3: 独立作業画面)
  | { id: 'finale' } // 千年の岐路(v3.1 M15-4: 結末の選択)
  | { id: 'death'; charId: string }
  | { id: 'dream' } // 夢渡り — 汐里との邂逅
  | { id: 'dreamEp'; epId: string } // 夢渡りの連作 — 千年前の記憶(data/dreams.ts)
  | { id: 'ending' }

// M34: 全画面場面をセーブ可能な「灯の余白」へ退避するため、UI storeだけに閉じず
// payloadをGameDataへ持つ。既存saveでは narrative 自体がoptionalなので後方互換。
export type NarrativeScene =
  | { kind: 'birth'; charId: string }
  | { kind: 'death'; charId: string }
  | { kind: 'ceremony'; charId: string }
  | { kind: 'jobrite'; charId: string }
  | { kind: 'dream' }
  | { kind: 'dreamEp'; epId: string }
  | { kind: 'life'; title: string; lines: { speaker: string; text: string }[]; bg?: string; narrativeId?: string }

export type NarrativeStage = 'one_light' | 'name' | 'duet_hunger' | 'fire_vow' | 'summit'

export interface NarrativeMetrics {
  scenesOpened: number
  scenesCompleted: number
  scenesSkipped: number
  scenesDeferred: number
  totalSceneMs: number
  maxDeferred: number
  monthsAdvanced: number
  interruptedAfterMonth: number
}

export interface NarrativeProgress {
  stage: NarrativeStage
  seen: string[]
  queued: string[]
  completed: string[]
  deferred: NarrativeScene[]
  archive: NarrativeScene[] // 完読/skip済みの章・夢。Homeから安全に再読するためのpayload
  deferredSince: Record<string, number> // 未読が灯の余白へ入った実時刻(ms)
  deferredReminderShown: string[] // 7日滞留の非modal通知を一場面一度に抑える
  active?: NarrativeScene
  activeOpenedAt?: number
  activeReplay?: boolean // 再読中は既読/計測/queueを再度変更しない
  monthTransitionPending?: boolean
  resonance: { cut: number; save: number; inherit: number }
  metrics: NarrativeMetrics
  generationQuestion?: string
  lastReturn?: {
    id: string
    season: number
    regionId: string
    partyIds: string[]
    injuredIds: string[]
    bossDown: boolean
  }
}

// ---- ゲーム全体状態 ----
export interface GameData {
  seasonIndex: number
  family: Character[]
  hoto: number // 奉燈
  ketsu: number // 血珠
  inventory: Item[]
  consumables?: ConsumableStack[] // M28-C: 回復薬など消耗品(optional=旧セーブ互換・equipmentとは別系統)
  godAffinity: Record<string, number>
  fame: number // 武功(地域解放)
  regionsCleared: string[]
  chronicle: ChronicleEntry[]
  expedition?: Expedition
  pendingBirths: { godId: string; parentId: string; dueSeason: number }[]
  flags: Record<string, boolean | number>
  narrativeMode: boolean // 語り部モード
  seed: number
  motto?: MottoId // v3.1 M12-8: 家訓(当主ごとに定める家風)
  // v3.1 M14: 図鑑と地域縁起(全てoptional=旧セーブ互換)
  codex?: { enemies: string[]; gods: string[] } // 遭遇した魔性/契った星神
  // M26 §12.1: 図鑑の個別既読(項目を開いた時だけ既読化)。旧セーブは件数マーク(flags.codexSeen*)から移行。
  // 表示専用 — ゲームロジックには影響しない。enemies は baseEnemyId 正規化後のID。
  codexSeenIds?: { enemies: string[]; gods: string[] }
  loreFrags?: Record<string, number> // 地域ごとの縁起の欠片(0〜3)
  regionsVisited?: string[] // 足を踏み入れた地域
  nemeses?: NemesisRecord[] // v3.1 M16-1: 一族を殺し、名を得た魔性
  lastPlayedAt?: number // v3.1 M16-8: 留守番内職(実時間の刻印、保存時に更新)
  gossipIndex?: number // v3.1 M16-3: 郷の物語(会話キュー)の進行度
  facilities?: Record<string, number> // v3.1 M16-6: 郷の普請(施設id→lv 0-3)。旧セーブ互換で全て未建設扱い
  familiars?: { enemyId: string; name: string; element: string }[] // v3.1 M16-5: 懐いた眷属(式神)の一覧
  activeFamiliar?: string // v3.1 M16-5: 随行させている眷属のenemyId
  narrative?: NarrativeProgress // M34: 物語順序・後で読む・家の響き(optional=旧セーブ互換)
}

// 宿敵(名持ち) — 一族の誰かを殺した魔性が名を得て成長・再来する
export interface NemesisRecord {
  id: string
  enemyId: string // 基礎種
  name: string // 二つ名+種名
  victim: string // 最初に殺した一族の名
  level: number // 逃すたび強くなる(1〜5)
  regionId: string // 名を得た地
}

// 家訓 — 当主が定める家風。一族全体への小さな加護
export type MottoId = 'budan' | 'gakumon' | 'shinjin' | 'shobai'
export const MOTTOS: Record<MottoId, { name: string; desc: string }> = {
  budan: { name: '武断', desc: '刃を恃み、力で夜を拓く(全員の腕力+2)' },
  gakumon: { name: '学問', desc: '知を磨き、理で夜を照らす(全員の知恵+2)' },
  shinjin: { name: '信心', desc: '星々を敬い、縁を深める(縁の実り1.5倍)' },
  shobai: { name: '商売', desc: '算盤を弾き、蓄えで家を守る(奉燈の実り+8%)' },
}
