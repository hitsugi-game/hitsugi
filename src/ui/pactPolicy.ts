import { GODS, godUnlocked } from '../core/data/gods'
import { pactCost } from '../core/inheritance'
import type { GameData, God } from '../core/types'

/** 閲覧可能な表示行だけを、一覧と同じ順にキーボード経路へ残す。費用は閲覧を妨げない。 */
export function inspectablePactGodIds(
  shownGods: readonly God[],
  data: Pick<GameData, 'fame' | 'regionsCleared' | 'family'>,
  hasParent: boolean,
): string[] {
  return hasParent ? shownGods.filter((god) => godUnlocked(god, data)).map((god) => god.id) : []
}

/** フィルタや薦め切替で焦点の行が消えたら、閲覧可能な先頭をTab入口にする。 */
export function pactRovingFocusId(ids: readonly string[], activeId: string | null): string | null {
  return activeId !== null && ids.includes(activeId) ? activeId : ids[0] ?? null
}

export function pactFocusTarget(ids: readonly string[], currentId: string, key: string): string | null {
  if (ids.length === 0) return null
  if (key === 'Home') return ids[0]
  if (key === 'End') return ids[ids.length - 1]
  if (key !== 'ArrowDown' && key !== 'ArrowUp') return null
  const index = ids.indexOf(currentId)
  if (index < 0) return ids[0]
  return ids[(index + (key === 'ArrowDown' ? 1 : -1) + ids.length) % ids.length]
}

/** 郷の入口と助言は、解禁済みの星神の割引後費用で揃える。 */
export function cheapestUnlockedPactCost(data: Pick<GameData, 'fame' | 'regionsCleared' | 'family' | 'godAffinity'>): number {
  return Math.min(...GODS.filter((god) => godUnlocked(god, data))
    .map((god) => pactCost(god, data.godAffinity[god.id] ?? 0)))
}

export interface PactAvailability {
  inspectable: boolean
  contractable: boolean
  reason?: string
}

/**
 * 星神の閲覧権と契約権を分離する。
 * 封印だけが詳細閲覧を妨げ、奉燈不足は契約CTAだけを止める。
 */
export function pactAvailability(unlocked: boolean, hoto: number, cost: number): PactAvailability {
  if (!unlocked) return { inspectable: false, contractable: false, reason: 'この星はまだ封印されている' }
  const shortfall = Math.max(0, cost - hoto)
  if (shortfall > 0) {
    return {
      inspectable: true,
      contractable: false,
      reason: `奉燈があと${shortfall}足りない`,
    }
  }
  return { inspectable: true, contractable: true }
}
