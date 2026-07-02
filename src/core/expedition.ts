import type { Expedition, MapNode, NodeType, Region, Item } from './types'
import { Rng, uid } from './rng'
import { ENEMIES } from './data/enemies'
import { ITEM_BASES, makeItem } from './data/items'

// 夜藪行のノードマップ生成 — Slay the Spire式の分岐路
export function generateExpedition(region: Region, partyIds: string[], rng: Rng): Expedition {
  const nodes: Record<string, MapNode> = {}
  const layers: string[][] = []

  const start: MapNode = { id: uid('nd'), type: 'start', depth: 0, choices: [], cleared: true }
  nodes[start.id] = start
  layers.push([start.id])

  for (let d = 1; d <= region.depth; d++) {
    const isLast = d === region.depth
    const count = isLast ? 1 : rng.int(2, 3)
    const layer: string[] = []
    for (let i = 0; i < count; i++) {
      const type: NodeType = isLast
        ? region.bossId
          ? 'boss'
          : 'treasure'
        : pickNodeType(d, region.depth, rng)
      const node: MapNode = {
        id: uid('nd'),
        type,
        depth: d,
        choices: [],
        cleared: false,
        enemyIds: type === 'battle' || type === 'elite' || type === 'boss'
          ? pickEnemies(region, type, d, rng)
          : undefined,
      }
      nodes[node.id] = node
      layer.push(node.id)
    }
    // 前層から接続(各ノードは1〜2本の道を持つ)
    for (const prevId of layers[layers.length - 1]) {
      const shuffled = rng.shuffle(layer)
      const n = Math.min(layer.length, rng.int(1, 2))
      nodes[prevId] = { ...nodes[prevId], choices: shuffled.slice(0, n) }
    }
    layers.push(layer)
  }

  return {
    regionId: region.id,
    nodes,
    currentNodeId: start.id,
    light: 100,
    loot: { hoto: 0, ketsu: 0, items: [] },
    partyIds,
    log: [`${region.name}に足を踏み入れた。灯を絶やすな。`],
  }
}

function pickNodeType(depth: number, maxDepth: number, rng: Rng): NodeType {
  const r = rng.next()
  const deep = depth / maxDepth
  if (r < 0.5) return 'battle'
  if (r < 0.58 + deep * 0.08) return 'elite'
  if (r < 0.74) return 'event'
  if (r < 0.87) return 'treasure'
  return 'camp'
}

// ボスの取り巻き — 単体集中で溶けないための盤面圧
const BOSS_MINIONS: Record<string, string[]> = {
  boss_hyakume: ['hone_dourou'],
  boss_hoshimukuro: ['hoshikui_ko'],
  boss_gentou: ['tokoyo_musha', 'hitori'],
}

export function pickEnemies(region: Region, type: NodeType, depth: number, rng: Rng): string[] {
  if (type === 'boss' && region.bossId) return [region.bossId, ...(BOSS_MINIONS[region.bossId] ?? [])]
  const tierPool = ENEMIES.filter((e) => e.tier === region.tier)
  const upperPool = ENEMIES.filter((e) => e.tier === region.tier && e.hoto >= 50)
  if (type === 'elite') {
    const elites = upperPool.length > 0 ? upperPool : tierPool
    return [rng.pick(elites).id]
  }
  const count = depth < 3 ? rng.int(1, 2) : rng.int(2, 3)
  return Array.from({ length: count }, () => rng.pick(tierPool).id)
}

// 灯の消費 — 深い場所ほど夜が重い
export const LIGHT_COST = { move: 6, battle: 8, elite: 12, boss: 0 }

// 灯が尽きた時の被ダメ倍率
export function darknessPenalty(light: number): number {
  if (light > 0) return 1
  return 1.5
}

// 宝ノードの中身
export function rollTreasure(region: Region, rng: Rng): { hoto: number; ketsu: number; item?: Item; text: string } {
  const base = region.tier * 30
  const r = rng.next()
  if (r < 0.45) {
    const hoto = Math.round(base * (1 + rng.next()))
    return { hoto, ketsu: 0, text: `朽ちた祠に奉燈${hoto}が供えられていた。ありがたく頂く。` }
  }
  if (r < 0.75) {
    const ketsu = region.tier + rng.int(0, 2)
    return { hoto: 0, ketsu, text: `魔性の骸から血珠${ketsu}を拾い上げた。` }
  }
  const pool = ITEM_BASES.filter((b) => b.shopTier <= region.tier)
  const item = makeItem(rng.pick(pool).baseId)
  return { hoto: 0, ketsu: 0, item, text: `行き倒れの荷から「${item.name}」を見つけた。供養を約束して受け取る。` }
}

// 焚火ノード: 回復量
export function campHeal(): { hpRatio: number; lightGain: number } {
  return { hpRatio: 0.45, lightGain: 15 }
}

// ---- 事件(選択式イベント) ----
export interface EventEffect {
  hoto?: number
  ketsu?: number
  light?: number
  hpRatio?: number // 隊全員のHP増減(最大HP比)
  itemTier?: number // アイテム入手
  battle?: boolean // 戦闘発生
  fame?: number
  log: string
}
export interface EventChoice {
  label: string
  // 運が絡む選択は [成功時, 失敗時] と成功率
  outcomes: [EventEffect] | [EventEffect, EventEffect]
  successRate?: number
  requireHoto?: number // 選択に必要な奉燈
}
export interface EventDef {
  id: string
  text: string
  choices: EventChoice[]
}

const CORE_EVENTS: EventDef[] = [
  {
    id: 'naki_ishi',
    text: '道端の石が、夜通し啜り泣いている。近づく者の悲しみを吸うとも、涙の底に珠を隠すとも言われる。',
    choices: [
      {
        label: '涙を拭ってやる',
        successRate: 0.6,
        outcomes: [
          { ketsu: 3, log: '石は泣き止み、涙の痕から血珠が3つ零れ落ちた。' },
          { hpRatio: -0.15, log: '悲しみが流れ込んできた。胸が重い……(隊が傷ついた)' },
        ],
      },
      { label: '手を合わせて通り過ぎる', outcomes: [{ log: '静かに拝んで先へ進んだ。泣き声が少しだけ和らいだ気がする。' }] },
    ],
  },
  {
    id: 'mayoi_chochin',
    text: '誰も提げていない提灯が、ふわりふわりと先を行く。ついて来い、と言わんばかりに。',
    choices: [
      {
        label: 'ついて行く',
        successRate: 0.55,
        outcomes: [
          { hoto: 45, log: '提灯は朽ちた祠へ導いてくれた。中には奉燈がぎっしり。' },
          { battle: true, log: '提灯がぐるりと振り向いた。……口があった。罠だ!' },
        ],
      },
      { label: '道を守る', outcomes: [{ light: 6, log: '提灯は寂しそうに闇へ消えた。……気のせいか、足元が少し明るい。' }] },
    ],
  },
  {
    id: 'hoshi_kakera',
    text: '藪の中に、星の欠片が墜ちて瞬いている。触れれば火傷しそうなほど冷たい。',
    choices: [
      { label: '布に包んで拾う', outcomes: [{ ketsu: 2, log: '星の欠片から血珠2つ分の輝きを削り取った。' }] },
      { label: '空に還るよう祈る', outcomes: [{ fame: 6, log: '欠片はゆっくり浮かび、夜空へ還っていった。徳を積んだ。' }] },
    ],
  },
  {
    id: 'furui_hokora',
    text: '苔むした祠がある。かつて旅人が灯を借りた場所だ。祠の灯受けは、空っぽのまま。',
    choices: [
      { label: '奉燈を供える(20)', requireHoto: 20, outcomes: [{ hoto: -20, fame: 10, hpRatio: 0.3, log: '灯を分けると、祠がほのかに温もった。傷が癒え、徳を積んだ。' }] },
      { label: '素通りする', outcomes: [{ log: '祠は黙って見送った。' }] },
    ],
  },
  {
    id: 'ikidaore',
    text: '行き倒れの骸があった。夜藪に挑んで果てた、名も知らぬ誰かだ。荷物がまだ残っている。',
    choices: [
      { label: '弔ってから荷を預かる', outcomes: [{ itemTier: 1, fame: 4, log: '土を盛り、手を合わせた。「あんたの荷、生かして使う」' }] },
      {
        label: '荷だけ漁る',
        outcomes: [{ itemTier: 1, hoto: 15, log: '荷と銭を手早く抜き取った。……綴が家譜に何か書き足した音がした。' }],
      },
    ],
  },
  {
    id: 'senzo_bourei',
    text: '古い鎧姿の影が行く手に立つ。顔は見えない。だが、その太刀筋にはどこか見覚えが——先祖の誰かだ。',
    choices: [
      {
        label: '燈守の名を名乗る',
        successRate: 0.7,
        outcomes: [
          { hpRatio: 0.5, fame: 8, log: '影は太刀を納め、深く頷いて消えた。体の芯に、温かい力が流れ込む。' },
          { battle: true, log: '影は太刀を構えた。「ならば、見せてみよ」戦いで示すしかない!' },
        ],
      },
      { label: '静かに迂回する', outcomes: [{ light: -6, log: '遠回りをした。影はずっとこちらを見ていた。' }] },
    ],
  },
  {
    id: 'wakimizu',
    text: '岩の間から清水が湧いている。常夜でも涸れぬ、不思議な泉だ。',
    choices: [
      { label: '喉を潤す', outcomes: [{ hpRatio: 0.35, log: '冷たい水が五臓に染みた。疲れが抜けていく。' }] },
      {
        label: '灯皿に注いでみる',
        successRate: 0.5,
        outcomes: [
          { light: 25, log: '水面に灯が映り——揺らめきが倍になった! 不思議な泉だ。' },
          { light: -12, log: 'じゅっ。……当然、火は弱まった。何をやっているんだ。' },
        ],
      },
    ],
  },
  {
    id: 'tsuzuri_page',
    text: '風に飛ばされた紙が頬に張り付いた。見れば、家譜の切れ端——ずっと昔に失われた頁だ。',
    choices: [
      { label: '読んでから懐にしまう', outcomes: [{ fame: 12, log: '知らぬ先祖の名と辞世が記されていた。「……持って帰れば、綴が喜ぶ」' }] },
    ],
  },
]

// 結合(初期8件+増員分 — GDD_v3 §1)。実行時循環なし(events.tsは型のみ本ファイルを参照)
import { EXTRA_EVENTS } from './data/events'
export const EVENTS: EventDef[] = [...CORE_EVENTS, ...EXTRA_EVENTS]

export function eventById(id: string): EventDef {
  const e = EVENTS.find((x) => x.id === id)
  if (!e) throw new Error(`unknown event: ${id}`)
  return e
}

export function pickEvent(rng: Rng): EventDef {
  return rng.pick(EVENTS)
}
