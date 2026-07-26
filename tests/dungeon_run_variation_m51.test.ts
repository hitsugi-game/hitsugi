import { beforeEach, describe, expect, it } from 'vitest'
import { regionById } from '../src/core/data/regions'
import { rollTreasure } from '../src/core/expedition'
import { Rng } from '../src/core/rng'
import { saveGame } from '../src/core/save'
import { useGame } from '../src/core/store'
import { DUNGEONS, dungeonByRegion } from '../src/dungeon/maps'
import {
  dungeonRunContentSeed,
  dungeonTileRng,
  varyDungeonFloor,
} from '../src/dungeon/run_variation'

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

const chars = (rows: readonly string[], target: string): number => (
  rows.reduce((sum, row) => sum + [...row].filter((tile) => tile === target).length, 0)
)

function reachableTiles(rows: readonly string[]): Set<string> {
  let start: { x: number; y: number } | null = null
  rows.some((row, y) => {
    const x = row.indexOf('<')
    if (x < 0) return false
    start = { x, y }
    return true
  })
  if (!start) return new Set()
  const queue = [start]
  const seen = new Set<string>([`${start.x}:${start.y}`])
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = current.x + dx
      const y = current.y + dy
      const tile = rows[y]?.[x]
      const key = `${x}:${y}`
      if (tile === undefined || tile === '#' || tile === '~' || seen.has(key)) continue
      seen.add(key)
      queue.push({ x, y })
    }
  }
  return seen
}

function expectAllPoiReachable(rows: readonly string[]): void {
  const reachable = reachableTiles(rows)
  rows.forEach((row, y) => {
    ;[...row].forEach((tile, x) => {
      if ('<>BCFSM'.includes(tile)) expect(reachable.has(`${x}:${y}`), `${tile}@${x},${y}`).toBe(true)
    })
  })
}

describe('M51 出立seedによる夜藪の変奏', () => {
  beforeEach(() => {
    storage.clear()
    useGame.getState().newGame(false)
  })

  it('同じseedは同じ床、異なるseedは複数の配置を返し、旧checkpointは固定床を維持する', () => {
    const base = DUNGEONS.find((dungeon) => dungeon.regionId === 'yoi_forest')!.floors[0]
    expect(varyDungeonFloor(base, undefined, 0)).toBe(base)
    expect(varyDungeonFloor(base, 51001, 0)).toEqual(varyDungeonFloor(base, 51001, 0))

    const variants = new Set([51001, 51002, 51003, 51004, 51005].map((seed) => (
      varyDungeonFloor(base, seed, 0).ascii.join('\n')
    )))
    expect(variants.size).toBeGreaterThan(1)
  })

  it('通常171層＋常夜百層で入口から進行先と全POIへ到達でき、宝箱だけ1〜3個で揺らぐ', () => {
    const allDungeons = [...DUNGEONS, dungeonByRegion('tokoyo_tou')!]
    expect(allDungeons.reduce((sum, dungeon) => sum + dungeon.floors.length, 0)).toBe(271)
    for (const dungeon of allDungeons) {
      dungeon.floors.forEach((base, floorIndex) => {
        const varied = varyDungeonFloor(base, 0x510000 + floorIndex, floorIndex)
        expect(varied.ascii).toHaveLength(base.ascii.length)
        expect(varied.ascii.every((row, y) => row.length === base.ascii[y].length)).toBe(true)
        expect(chars(varied.ascii, '<')).toBe(chars(base.ascii, '<'))
        expect(chars(varied.ascii, '>')).toBe(chars(base.ascii, '>'))
        expect(chars(varied.ascii, 'B')).toBe(chars(base.ascii, 'B'))
        expect(chars(varied.ascii, 'M')).toBe(chars(base.ascii, 'M'))
        expect(chars(varied.ascii, 'F')).toBe(chars(base.ascii, 'F'))
        expect(chars(varied.ascii, 'S')).toBe(chars(base.ascii, 'S'))
        expect(chars(varied.ascii, 'C')).toBeGreaterThanOrEqual(1)
        expect(chars(varied.ascii, 'C')).toBeLessThanOrEqual(3)
        expectAllPoiReachable(varied.ascii)
      })
    }
  })

  it('専用stageは地形を保ちつつ、描画・敵影seedだけを出立ごとに変える', () => {
    const base = DUNGEONS.find((dungeon) => dungeon.regionId === 'hotarubi_no_kubochi')!.floors[0]
    const a = varyDungeonFloor(base, 111, 0, { preserveLayout: true })
    const b = varyDungeonFloor(base, 222, 0, { preserveLayout: true })
    expect(a.ascii).toEqual(base.ascii)
    expect(b.ascii).toEqual(base.ascii)
    expect(a.seed).not.toBe(b.seed)
  })

  it('宝箱報酬は同じ遠征・床・座標で再開後も同じで、別出立では変化する', () => {
    const region = regionById('yoi_forest')
    const result = (seed: number) => {
      const rng = dungeonTileRng(seed, 0, 12, 8, 'chest')!
      const treasure = rollTreasure(region, rng)
      return { hoto: treasure.hoto, ketsu: treasure.ketsu, item: treasure.item?.baseId, text: treasure.text }
    }
    expect(result(61001)).toEqual(result(61001))
    expect(new Set([61001, 61002, 61003, 61004, 61005].map((seed) => JSON.stringify(result(seed)))).size)
      .toBeGreaterThan(1)
  })

  it('出立時にseedを一度決め、checkpointへ同じ値を保存する', () => {
    useGame.setState({ rng: new Rng(510051) })
    const state = useGame.getState()
    state.departDungeon('yoi_forest', [state.data!.family[0].id])
    const run = useGame.getState().dungeonRun!
    const saved = JSON.parse(storage.get('hitsugi_save_v4')!)
    expect(Number.isInteger(run.runSeed)).toBe(true)
    expect(saved.dungeonRun.runSeed).toBe(run.runSeed)
    expect(run.log.some((line) => line.includes('この出立の間だけ定まる'))).toBe(true)
  })

  it('seedなしlegacy checkpointも再開時刻やstore RNGによらず全内容抽選を固定する', () => {
    const entered = useGame.getState()
    entered.departDungeon('yoi_forest', [entered.data!.family[0].id])
    const afterDepart = useGame.getState()
    const legacyRun = { ...afterDepart.dungeonRun!, boons: [], boonDraft: undefined }
    delete legacyRun.runSeed
    expect(dungeonRunContentSeed(legacyRun)).toBe(dungeonRunContentSeed(legacyRun))

    storage.clear()
    saveGame({ ...afterDepart.data!, dungeonRun: legacyRun })
    const checkpoint = storage.get('hitsugi_save_v4')!
    const restore = (globalSeed: number) => {
      storage.clear()
      storage.set('hitsugi_save_v4', checkpoint)
      expect(useGame.getState().continueGame()).toBe(true)
      useGame.setState({ rng: new Rng(globalSeed), boonDraft: null })
    }
    const chest = (globalSeed: number) => {
      restore(globalSeed)
      useGame.getState().dungeonSpecial('chest', 10, 8)
      const run = useGame.getState().dungeonRun!
      return {
        hoto: run.loot.hoto,
        ketsu: run.loot.ketsu,
        item: run.loot.items[0]?.baseId,
        log: run.log.at(-1),
      }
    }
    const shrine = (globalSeed: number) => {
      restore(globalSeed)
      useGame.getState().dungeonSpecial('shrine', 12, 8)
      return useGame.getState().pendingEvent?.eventId
    }
    const camp = (globalSeed: number) => {
      restore(globalSeed)
      useGame.getState().dungeonSpecial('camp', 14, 8)
      return useGame.getState().boonDraft
    }
    const eventOutcome = (globalSeed: number) => {
      restore(globalSeed)
      useGame.setState({ pendingEvent: { eventId: 'wakimizu', nodeId: 'dg:0:16:8' } })
      useGame.getState().resolveEvent(1)
      return useGame.getState().dungeonRun!.log.at(-1)
    }

    expect(chest(1)).toEqual(chest(999_999))
    expect(shrine(2)).toBe(shrine(888_888))
    expect(camp(3)).toEqual(camp(777_777))
    expect(eventOutcome(4)).toBe(eventOutcome(666_666))
  })
})
