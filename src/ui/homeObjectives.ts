import { ENEMIES } from '../core/data/enemies'
import { REGIONS } from '../core/data/regions'
import { seasonsLeft } from '../core/inheritance'
import type { GameData } from '../core/types'

export type Objective = { text: string; go?: 'pact' | 'depart' | 'chronicle' | 'codex'; goLabel?: string; progress?: [number, number]; done?: boolean }

// 現在の記録から導出する。目標の表示だけでゲーム状態は変更しない。
export function computeObjectives(data: GameData, adultCount: number): { short: Objective[]; mid: Objective[]; long: Objective[] } {
  const alive = data.family.filter((c) => c.alive)
  const head = alive.find((c) => c.isHead)
  const gens = data.family.length > 0 ? Math.max(...data.family.map((c) => c.gen)) : 0
  const baseEnemies = ENEMIES.filter((e) => !/_[wo]$/.test(e.id))
  const enemySeen = new Set((data.codex?.enemies ?? []).map((id) => id.replace(/_[wo]$/, ''))).size
  const bossRegions = REGIONS.filter((r) => r.bossId && r.id !== 'tokoyo_tou')
  const clearedSet = new Set(data.regionsCleared)

  // 短期(今すぐ〜この代)
  const short: Objective[] = []
  if (head && seasonsLeft(head, data.seasonIndex) <= 3 && data.pendingBirths.length === 0) {
    short.push({ text: `当主 ${head.name} の灯が細い。次代を残す`, go: 'pact', goLabel: '星契りへ' })
  }
  if (alive.length <= 2 && data.pendingBirths.length === 0 && adultCount > 0) {
    short.push({ text: '血が細い。星と契り、子を授かる', go: 'pact', goLabel: '星契りへ' })
  }
  if (adultCount > 0) short.push({ text: '夜藪へ出立し、奉燈と血珠を持ち帰る', go: 'depart', goLabel: '出立へ' })
  if (short.length === 0) short.push({ text: '子が育つのを待ち、次の一手を練る' })

  // 中期(この周回)
  const mid: Objective[] = []
  const nextLocked = REGIONS.filter((r) => r.unlockFame > data.fame && r.id !== 'tokoyo_tou').sort((a, b) => a.unlockFame - b.unlockFame)[0]
  if (nextLocked) mid.push({ text: `「${nextLocked.name}」への道を開く`, progress: [data.fame, nextLocked.unlockFame], go: 'depart', goLabel: '出立へ' })
  const nextBoss = bossRegions.filter((r) => r.unlockFame <= data.fame && !clearedSet.has(r.id)).sort((a, b) => a.tier - b.tier)[0]
  if (nextBoss) mid.push({ text: `「${nextBoss.name}」の主を鎮める`, go: 'depart', goLabel: '出立へ' })
  mid.push({ text: '血を継ぎ、代を重ねる', progress: [gens, 10] })
  mid.push({ text: '魔性を見聞し、図鑑を埋める', progress: [enemySeen, baseEnemies.length], go: 'codex', goLabel: '図鑑へ' })

  // 長期(千年紀)
  const long: Objective[] = []
  const chosenEnding = data.flags.endingType
  const hasChosenEnding = data.flags.cleared === true && (chosenEnding === 0 || chosenEnding === 1 || chosenEnding === 2)
  long.push({ text: '千年の答えを選ぶ', done: hasChosenEnding })
  long.push({ text: '全ての地の主を鎮める', progress: [data.regionsCleared.filter((id) => bossRegions.some((r) => r.id === id)).length, bossRegions.length] })
  if (data.flags.cleared) {
    const tower = typeof data.flags.towerBest === 'number' ? data.flags.towerBest : 0
    long.push({ text: '常夜百層を、深く制す', progress: [tower, 100] })
  }
  return { short, mid, long }
}
