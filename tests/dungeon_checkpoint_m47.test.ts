import { beforeEach, describe, expect, it } from 'vitest'
import { useGame } from '../src/core/store'
import { makeItem } from '../src/core/data/items'
import { Rng } from '../src/core/rng'

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

const SAVE_KEY = 'hitsugi_save_v4'

function restoreCheckpoint(raw: string): void {
  storage.clear()
  storage.set(SAVE_KEY, raw)
  expect(useGame.getState().continueGame()).toBe(true)
}

function outcomeSnapshot() {
  const state = useGame.getState()
  const data = state.data!
  return {
    seasonIndex: data.seasonIndex,
    family: data.family.map(({ id, alive, hp, mp }) => ({ id, alive, hp, mp })),
    hoto: data.hoto,
    ketsu: data.ketsu,
    inventory: data.inventory.map(({ id, baseId, name }) => ({ id, baseId, name })),
    persistedRun: data.dungeonRun ?? null,
  }
}

function makeReturnCheckpoint(): string {
  const state = useGame.getState()
  const founder = state.data!.family[0]
  state.departDungeon('yoi_forest', [founder.id])
  useGame.getState().dungeonIntroSeen()
  const entered = useGame.getState()
  useGame.setState({
    data: {
      ...entered.data!,
      family: entered.data!.family.map((character) => (
        character.id === founder.id ? { ...character, hp: Math.max(1, character.hp - 7), mp: Math.max(0, character.mp - 3) } : character
      )),
    },
    dungeonRun: {
      ...entered.dungeonRun!,
      light: 63,
      loot: { hoto: 31, ketsu: 2, items: [makeItem('a_nunoko', 'chest')] },
      used: ['0:4:5'],
    },
  })
  // 出立時の加護選択解決がsafe checkpointとなり、上の決定論fixtureを保存する。
  useGame.getState().chooseBoon(null)
  return storage.get(SAVE_KEY)!
}

function makeDefeatCheckpoint(): string {
  const state = useGame.getState()
  const founder = state.data!.family[0]
  const companion = {
    ...founder,
    id: 'm47_companion',
    name: '玄',
    isHead: false,
    equipment: {},
    potential: { ...founder.potential, luk: Math.max(0, founder.potential.luk - 1) },
  }
  useGame.setState({ data: { ...state.data!, family: [founder, companion] } })
  useGame.getState().departDungeon('yoi_forest', [founder.id, companion.id])
  const entered = useGame.getState()
  useGame.setState({
    dungeonRun: {
      ...entered.dungeonRun!,
      light: 41,
      loot: { hoto: 22, ketsu: 4, items: [] },
      used: ['0:6:7'],
    },
  })
  useGame.getState().chooseBoon(null)
  return storage.get(SAVE_KEY)!
}

function enterLostBattle(): void {
  useGame.setState({ rng: new Rng(470025) })
  useGame.getState().dungeonEncounter(false, false)
  const battle = useGame.getState().battle!
  useGame.setState({
    battle: {
      ...battle,
      phase: 'lost',
      allies: battle.allies.map((ally) => ({ ...ally, hp: 0 })),
    },
  })
}

beforeEach(() => {
  storage.clear()
  useGame.getState().newGame(false)
})

describe('M47 遠征・暦・保存契約', () => {
  it('戦闘中にも使うオート切替だけでは未精算のdataをcheckpointへ混ぜない', () => {
    const state = useGame.getState()
    const founder = state.data!.family[0]
    state.departDungeon('yoi_forest', [founder.id])
    useGame.getState().chooseBoon(null)
    const safeSave = storage.get(SAVE_KEY)
    const entered = useGame.getState()
    useGame.setState({
      data: { ...entered.data!, hoto: entered.data!.hoto + 999 },
      dungeonRun: { ...entered.dungeonRun!, light: 1 },
    })

    useGame.getState().setAutoBattle(true)

    expect(storage.get(SAVE_KEY)).toBe(safeSave)
    expect(useGame.getState().dungeonRun?.autoBattle).toBe(true)
  })

  it('正規帰還と、checkpoint中断再開後の明示帰還で暦・HP・戦利品を一致させ複製しない', () => {
    const checkpoint = makeReturnCheckpoint()

    useGame.getState().dungeonReturn()
    const direct = outcomeSnapshot()
    expect(direct.persistedRun).toBeNull()

    restoreCheckpoint(checkpoint)
    const resumed = useGame.getState()
    expect(resumed.screen.id).toBe('dungeon')
    expect(resumed.dungeonRun).toMatchObject({ light: 63, loot: { hoto: 31, ketsu: 2 }, used: ['0:4:5'], introSeen: true })
    resumed.dungeonReturn()
    const afterResume = outcomeSnapshot()

    expect(afterResume).toEqual(direct)
    expect(afterResume.inventory).toHaveLength(1)
  })

  it('敗北CTAと、敗北画面で閉じた後のcontinueで月・HP・戦利品・死亡を一致させる', () => {
    const checkpoint = makeDefeatCheckpoint()

    enterLostBattle()
    useGame.getState().finishBattle()
    const viaCta = outcomeSnapshot()
    expect(viaCta.family.filter((character) => !character.alive)).toHaveLength(1)
    expect(viaCta.persistedRun).toBeNull()

    restoreCheckpoint(checkpoint)
    enterLostBattle()
    const beforeSeason = useGame.getState().data!.seasonIndex
    useGame.getState().settleBattleDefeat()
    const settledOnResult = useGame.getState()
    expect(settledOnResult.screen.id).toBe('battle')
    expect(settledOnResult.battle?.phase).toBe('lost')
    expect(settledOnResult.data!.seasonIndex).toBe(beforeSeason + 1)
    expect(outcomeSnapshot()).toEqual(viaCta)

    // 敗北CTAを押さず、保存直後にプロセスが消えた状態を再現する。
    const persistedDefeat = storage.get(SAVE_KEY)!
    restoreCheckpoint(persistedDefeat)
    expect(useGame.getState().screen.id).toBe('home')
    expect(useGame.getState().dungeonRun).toBeNull()
    expect(outcomeSnapshot()).toEqual(viaCta)
  })
})
