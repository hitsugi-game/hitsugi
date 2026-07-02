// ダンジョン定義の公開窓口(品質刷新v3.1 M7b)
// 実データは maps.gen.ts(scripts/gen_all_maps.mjs による自動生成)。
// フロアを直したい時は gen_all_maps.mjs のシード表を変えて再生成する — ASCIIの手編集は禁止。
import type { DungeonDef, FloorDef } from './types'
import { DUNGEONS_GEN } from './maps.gen'

export const DUNGEONS: DungeonDef[] = DUNGEONS_GEN

// 常夜百層(v3.1 M15-6) — 既存フロアの再構成による100層の試練塔
// 通常フロアを決定論シャッフルで並べ、10層ごとに主の間(B)を差し込む(主未設定=エリート強化戦)
const TOWER: DungeonDef = (() => {
  const normals: FloorDef[] = []
  const bosses: FloorDef[] = []
  for (const d of DUNGEONS_GEN) {
    for (const f of d.floors) {
      if (f.ascii.some((row) => row.includes('B'))) bosses.push(f)
      else normals.push(f)
    }
  }
  // mulberry32(小型内蔵) — シード777で毎回同じ塔
  let a = 777
  const rnd = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const floors: FloorDef[] = []
  for (let i = 0; i < 100; i++) {
    const isBossFloor = (i + 1) % 10 === 0
    const pool = isBossFloor ? bosses : normals
    const src = pool[Math.floor(rnd() * pool.length)]
    floors.push({ ...src, shades: Math.min(12, src.shades + Math.floor(i / 12)) })
  }
  return { regionId: 'tokoyo_tou', name: '常夜百層', floors }
})()

export function dungeonByRegion(regionId: string): DungeonDef | undefined {
  if (regionId === 'tokoyo_tou') return TOWER
  return DUNGEONS.find((d) => d.regionId === regionId)
}
