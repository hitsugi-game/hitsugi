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

function pickEnemies(region: Region, type: NodeType, depth: number, rng: Rng): string[] {
  if (type === 'boss' && region.bossId) return [region.bossId]
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
