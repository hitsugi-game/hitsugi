import { describe, expect, it } from 'vitest'
import { GODS, godUnlocked } from '../src/core/data/gods'
import type { Character } from '../src/core/types'
import { inspectablePactGodIds, pactAvailability, pactFocusTarget, pactRovingFocusId } from '../src/ui/pactPolicy'

const data = { fame: 520, regionsCleared: [], family: [{ gen: 1 }] as Character[] }
const apex = GODS.filter((god) => god.rank === 4).sort((a, b) => a.cost - b.cost)

describe('星契りの閲覧行だけで構成するroving focus', () => {
  it('武功520/踏破なしの極ツ星2行を、封印行から分離して同じ表示順で返す', () => {
    const ids = inspectablePactGodIds(apex, data, true)
    expect(ids).toHaveLength(2)
    expect(ids).toEqual(apex.filter((god) => godUnlocked(god, data)).map((god) => god.id))
    expect(pactRovingFocusId(ids, apex[0].id)).toBe(ids[0])
  })

  it('既存の閲覧行を保持し、フィルタで失った行は先頭へ補正する', () => {
    expect(pactRovingFocusId(['a', 'b'], 'b')).toBe('b')
    expect(pactRovingFocusId(['c', 'd'], 'b')).toBe('c')
    expect(pactRovingFocusId(['b', 'a'], 'b')).toBe('b')
  })

  it.each([
    ['a', 'ArrowDown', 'b'], ['b', 'ArrowDown', 'a'],
    ['a', 'ArrowUp', 'b'], ['b', 'ArrowUp', 'a'],
    ['b', 'Home', 'a'], ['a', 'End', 'b'],
  ])('%sから%sで%sへ移る', (from, key, target) => {
    expect(pactFocusTarget(['a', 'b'], from, key)).toBe(target)
  })

  it('単独行・消えた焦点・無関係のキーを安全に扱う', () => {
    expect(pactFocusTarget(['a'], 'a', 'ArrowDown')).toBe('a')
    expect(pactFocusTarget(['a', 'b'], 'missing', 'ArrowDown')).toBe('a')
    expect(pactFocusTarget(['a', 'b'], 'a', 'Tab')).toBeNull()
  })

  it('全封印・親なし・0件ではTab入口も矢印先も作らない', () => {
    expect(inspectablePactGodIds(apex, { ...data, fame: 0 }, true)).toEqual([])
    expect(inspectablePactGodIds(apex, data, false)).toEqual([])
    expect(inspectablePactGodIds([], data, true)).toEqual([])
    expect(pactRovingFocusId([], 'a')).toBeNull()
    expect(pactFocusTarget([], 'a', 'Home')).toBeNull()
  })

  it('費用不足は契約だけを止め、閲覧とfocus候補を失わせない', () => {
    const ids = inspectablePactGodIds(apex, data, true)
    expect(ids).toHaveLength(2)
    expect(pactAvailability(true, 0, 100)).toMatchObject({ inspectable: true, contractable: false })
    expect(pactRovingFocusId(ids, null)).toBe(ids[0])
  })
})
