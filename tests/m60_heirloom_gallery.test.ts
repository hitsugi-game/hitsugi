import { beforeEach, describe, expect, it } from 'vitest'
import { inheritItem, makeItem } from '../src/core/data/items'
import { loadGame } from '../src/core/save'
import { useGame } from '../src/core/store'

const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    key: (index: number) => [...storage.keys()][index] ?? null,
    get length() { return storage.size },
  },
})

function heirloom(baseId: string, owner: string) {
  return inheritItem(makeItem(baseId, 'boss'), owner)
}

describe('M60/M45 三品の家宝額', () => {
  beforeEach(() => {
    storage.clear()
    useGame.getState().newGame(false)
  })

  it('形見だけを最大三品まで額装し、四品目は既存選択を壊さない', () => {
    const initial = useGame.getState().data!
    const items = [
      heirloom('w_kodachi', '燈吾'),
      heirloom('a_nunoko', '玄'),
      heirloom('c_omamori', '一灯'),
      heirloom('w_katana', '燈子'),
    ]
    useGame.setState({ data: { ...initial, inventory: items } })

    for (const item of items.slice(0, 3)) {
      expect(useGame.getState().toggleFrameHeirloom(item.id)).toBe(true)
    }
    expect(useGame.getState().toggleFrameHeirloom(items[3].id)).toBe(false)
    expect(useGame.getState().data!.framedHeirloomIds).toEqual(items.slice(0, 3).map((item) => item.id))
  })

  it('いつでも額から戻して差し替えでき、save reload後も三品を保つ', () => {
    const initial = useGame.getState().data!
    const items = [
      heirloom('w_kodachi', '燈吾'),
      heirloom('a_nunoko', '玄'),
      heirloom('c_omamori', '一灯'),
      heirloom('w_katana', '燈子'),
    ]
    useGame.setState({ data: { ...initial, inventory: items } })
    for (const item of items.slice(0, 3)) useGame.getState().toggleFrameHeirloom(item.id)

    expect(useGame.getState().toggleFrameHeirloom(items[1].id)).toBe(true)
    expect(useGame.getState().toggleFrameHeirloom(items[3].id)).toBe(true)

    const loaded = loadGame()
    expect(loaded?.framedHeirloomIds).toEqual([items[0].id, items[2].id, items[3].id])
  })

  it('通常品や存在しないIDは額装せず、保存済みの額を変えない', () => {
    const initial = useGame.getState().data!
    const ordinary = makeItem('w_kodachi', 'shop')
    const legacy = heirloom('a_nunoko', '玄')
    useGame.setState({ data: { ...initial, inventory: [ordinary, legacy] } })
    expect(useGame.getState().toggleFrameHeirloom(legacy.id)).toBe(true)
    expect(useGame.getState().toggleFrameHeirloom(ordinary.id)).toBe(false)
    expect(useGame.getState().toggleFrameHeirloom('missing')).toBe(false)
    expect(useGame.getState().data!.framedHeirloomIds).toEqual([legacy.id])
  })
})
