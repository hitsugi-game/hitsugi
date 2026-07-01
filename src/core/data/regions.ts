import type { Region } from '../types'

// 夜藪の地域 — 武功(fame)で順に解放
export const REGIONS: Region[] = [
  {
    id: 'yoi_forest', name: '宵の森', tier: 1, depth: 6, unlockFame: 0,
    desc: '郷のすぐ外に広がる薄闇の森。かつては茸狩りの山だった。',
    bg: 'bg_forest.png',
  },
  {
    id: 'chochin_zaka', name: '提灯坂', tier: 2, depth: 8, unlockFame: 60, bossId: 'boss_hyakume',
    desc: '無数の朽ちた提灯が並ぶ古い参道。誰が灯すのか、火だけは絶えない。',
    bg: 'bg_zaka.png',
  },
  {
    id: 'hoshimukuro_tani', name: '星骸の谷', tier: 3, depth: 10, unlockFame: 200, bossId: 'boss_hoshimukuro',
    desc: '玄冬に喰われた星々が墜ちて積もる谷。星の骸は今も微かに瞬く。',
    bg: 'bg_tani.png',
  },
  {
    id: 'akashi_miyama', name: '灯ノ御山', tier: 4, depth: 12, unlockFame: 450, bossId: 'boss_gentou',
    desc: '常夜の中心。頂に玄冬が座す。千年、誰も頂に届いていない。',
    bg: 'bg_miyama.png',
  },
]

export function regionById(id: string): Region {
  const r = REGIONS.find((x) => x.id === id)
  if (!r) throw new Error(`unknown region: ${id}`)
  return r
}
