import { beforeEach, describe, expect, it } from 'vitest'
import { useGame } from '../src/core/store'
import type { NarrativeScene } from '../src/core/types'
import { migrateM34Narrative, narrativeSceneId, narrativeSceneSummary } from '../src/core/narrative'
import { CHAPTERS } from '../src/core/data/story'
import { DREAM_EPISODES } from '../src/core/data/dreams'
import { REGIONS } from '../src/core/data/regions'
import { saveGame } from '../src/core/save'

const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
})

type Route = 'dungeon' | 'node'

function enterGentou(route: Route): void {
  const state = useGame.getState()
  const partyIds = [state.data!.family[0].id]
  if (route === 'dungeon') {
    state.departDungeon('akashi_miyama', partyIds)
    useGame.getState().dungeonEncounter(true, false)
  } else {
    state.depart('akashi_miyama', partyIds)
    const data = useGame.getState().data!
    const nodeId = Object.keys(data.expedition!.nodes)[0]
    useGame.setState({
      data: {
        ...data,
        expedition: {
          ...data.expedition!,
          nodes: {
            ...data.expedition!.nodes,
            [nodeId]: { ...data.expedition!.nodes[nodeId], type: 'boss', enemyIds: ['boss_gentou'] },
          },
        },
      },
    })
    useGame.getState().chooseNode(nodeId)
  }
  expect(useGame.getState().battle?.enemies[0].enemyId).toBe('boss_gentou')
  expect(useGame.getState().battleRewardSettlement?.plan.nextPhase).toBe('shiori_duel')
}

function finishAs(phase: 'won' | 'lost' | 'fled'): void {
  const battle = useGame.getState().battle!
  useGame.setState({ battle: { ...battle, phase } })
  useGame.getState().finishBattle()
}

beforeEach(() => {
  storage.clear()
  useGame.getState().newGame(false)
  const data = useGame.getState().data!
  useGame.setState({
    screen: { id: 'home' },
    data: {
      ...data,
      fame: 3000,
      flags: {
        ...data.flags, reveal_shiori_name: true, dreamSeen: true,
        ch1: true, ch2: true, ch3: true, ch4: true, ch5: true,
        ch1_completed: true, ch2_completed: true, ch3_completed: true,
        ch4_completed: true, ch5_completed: true,
      },
    },
  })
})

describe.each<Route>(['dungeon', 'node'])('最終戦の進行回帰: %s', (route) => {
  it('第二相への遭遇を魔性図鑑へ記録し、敗北後の再挑戦でも重複させない', () => {
    enterGentou(route)
    const previousCodex = useGame.getState().data!.codex!
    finishAs('won')
    const encountered = useGame.getState().data!.codex!
    expect(encountered.enemies).toEqual([...previousCodex.enemies, 'boss_shiori'])
    expect(encountered.gods).toEqual(previousCodex.gods)
    finishAs('lost')
    useGame.getState().continueGame()
    expect(useGame.getState().data!.codex!.enemies).toContain('boss_shiori')

    enterGentou(route)
    finishAs('won')
    expect(useGame.getState().data!.codex!.enemies.filter((id) => id === 'boss_shiori')).toHaveLength(1)
  })

  it('汐里戦で敗北して保存・再開しても、玄冬の再討伐から第二相へ進める', () => {
    enterGentou(route)
    finishAs('won')
    expect(useGame.getState().battle?.enemies[0].enemyId).toBe('boss_shiori')
    finishAs('lost')
    expect(useGame.getState().data!.flags.shioriPhase).toBe(true)
    expect(useGame.getState().continueGame()).toBe(true)

    enterGentou(route)
    finishAs('won')
    expect(useGame.getState().battle?.enemies[0].enemyId).toBe('boss_shiori')
    expect(useGame.getState().battleRewardSettlement?.plan.nextPhase).toBe('finale')
    finishAs('won')
    expect(useGame.getState().screen.id).toBe('finale')
  })

  it('第二相から逃走しても、再遠征の玄冬戦から第二相へ進める', () => {
    enterGentou(route)
    finishAs('won')
    finishAs('fled')
    if (route === 'dungeon') useGame.getState().dungeonReturn()
    else useGame.getState().useReturnFire()

    enterGentou(route)
    finishAs('won')
    expect(useGame.getState().battle?.enemies[0].enemyId).toBe('boss_shiori')
  })

  it.each([0, 1, 2])('選択前は岐路、結末%dの未読時は本文、読了後は郷へ再開する', (choice) => {
    enterGentou(route)
    finishAs('won')
    finishAs('won')
    const finale = useGame.getState()
    expect(finale.screen.id).toBe('finale')
    expect(finale.data!.flags.endingType).toBeUndefined()

    expect(finale.continueGame()).toBe(true)
    expect(useGame.getState().screen.id).toBe('finale')
    expect(useGame.getState().data!.flags.endingType).toBeUndefined()
    useGame.getState().resolveFinale(choice)
    expect(useGame.getState().screen.id).toBe('ending')
    expect(useGame.getState().data!.flags.endingType).toBe(choice)
    expect(useGame.getState().data!.flags.finalePending).toBe(false)

    expect(useGame.getState().continueGame()).toBe(true)
    expect(useGame.getState().screen.id).toBe('ending')
    expect(useGame.getState().data!.flags.endingType).toBe(choice)
    useGame.getState().completeEnding()
    expect(useGame.getState().continueGame()).toBe(true)
    expect(useGame.getState().screen.id).toBe('home')
    expect(useGame.getState().data!.flags.endingType).toBe(choice)
  })

  it('過去に結末を選んだ後の再戦も、今回の岐路が保留中ならその場面へ再開する', () => {
    enterGentou(route)
    finishAs('won')
    finishAs('won')
    useGame.getState().resolveFinale(1)
    useGame.getState().continueGame()
    enterGentou(route)
    finishAs('won')
    finishAs('won')

    expect(useGame.getState().data!.flags.finalePending).toBe(true)
    expect(useGame.getState().continueGame()).toBe(true)
    expect(useGame.getState().screen.id).toBe('finale')
  })

  it('旧クリアsaveから第二相へ進んだだけでは、敗北後の再開を岐路へ飛ばさない', () => {
    const data = useGame.getState().data!
    useGame.setState({ data: { ...data, flags: { ...data.flags, cleared: true } } })
    enterGentou(route)
    finishAs('won')
    expect(useGame.getState().battle?.enemies[0].enemyId).toBe('boss_shiori')
    finishAs('lost')

    expect(useGame.getState().continueGame()).toBe(true)
    expect(useGame.getState().screen.id).toBe('home')
    expect(useGame.getState().data!.flags.endingType).toBeUndefined()
  })
})

it('結末の読了状態を持たない旧saveは、既読か推測せず従来どおり郷へ再開する', () => {
  const data = useGame.getState().data!
  saveGame({ ...data, flags: { ...data.flags, cleared: true, endingType: 1, finalePending: false } })
  expect(useGame.getState().continueGame()).toBe(true)
  expect(useGame.getState().screen.id).toBe('home')
})

it('クリア後の寿命断絶は今回の断絶へ再開し、過去のclearと結末選択を消さない', () => {
  const data = useGame.getState().data!
  useGame.setState({
    data: {
      ...data, seasonIndex: 23,
      family: data.family.map((character) => ({ ...character, bornSeason: 0 })),
      flags: { ...data.flags, cleared: true, endingType: 1, endingPending: false },
    },
  })
  useGame.getState().doRest()
  expect(useGame.getState().screen.id).toBe('ending')
  expect(useGame.getState().data!.flags.extinct).toBe(true)
  expect(useGame.getState().continueGame()).toBe(true)
  expect(useGame.getState().screen.id).toBe('ending')
  expect(useGame.getState().data!.flags.cleared).toBe(true)
  expect(useGame.getState().data!.flags.endingType).toBe(1)
})

it('結末読了後の再読で未読へ戻さず、新周回へ読了保留を持ち越さない', () => {
  useGame.getState().resolveFinale(2)
  useGame.getState().completeEnding()
  const finished = useGame.getState().data!
  useGame.getState().setScreen({ id: 'ending' })
  useGame.getState().completeEnding()
  expect(useGame.getState().data!.flags).toEqual(finished.flags)
  useGame.getState().newLegacyGame()
  expect(useGame.getState().data!.flags.endingPending).toBeUndefined()
  expect(useGame.getState().data!.flags.endingType).toBeUndefined()
})

it.each([false, true])('武功だけ先行しても第三・第四章より第五章を先に発火しない: narrative=%s', (narrativeMode) => {
  const base = useGame.getState().data!
  const data = migrateM34Narrative({
    ...base, narrativeMode, fame: 520, seasonIndex: 2, regionsCleared: ['yoi_forest'], loreFrags: {},
    flags: { m34_narrative_schema: 1, ch1: true, ch2: true, dreamSeen: true },
    narrative: { ...base.narrative!, completed: ['ch1', 'ch2'], active: undefined, deferred: [], queued: [] },
  })
  saveGame(data)
  expect(useGame.getState().continueGame()).toBe(true)
  useGame.getState().doRest()
  expect(useGame.getState().data!.flags.ch3).toBeUndefined()
  expect(useGame.getState().data!.flags.ch5).toBeUndefined()
  useGame.getState().deferCurrentScene()

  useGame.setState({ data: { ...useGame.getState().data!, regionsCleared: REGIONS.slice(0, 5).map((region) => region.id) } })
  useGame.getState().doRest()
  expect(useGame.getState().data!.flags.ch3).toBe(true)
  expect(useGame.getState().data!.flags.ch5).toBeUndefined()
  useGame.getState().skipCurrentScene()

  useGame.setState({ data: { ...useGame.getState().data!, regionsCleared: REGIONS.slice(0, 10).map((region) => region.id) } })
  useGame.getState().doRest()
  expect(useGame.getState().data!.flags.ch4).toBe(true)
  expect(useGame.getState().data!.flags.ch5).toBeUndefined()
  useGame.getState().skipCurrentScene()
  useGame.getState().doRest()
  expect(useGame.getState().data!.flags.ch5).toBe(true)
})

it('旧saveに先行章のcompleted記録があれば、queue flag欠損で再発火・停滞させない', () => {
  const data = useGame.getState().data!
  useGame.setState({ data: {
    ...data, fame: 520, regionsCleared: ['yoi_forest'],
    flags: { m34_narrative_schema: 1, ch1: true, ch2: true, ch3_completed: true, ch4_completed: true },
  } })
  useGame.getState().doRest()
  expect(useGame.getState().data!.flags.ch3).toBeUndefined()
  expect(useGame.getState().data!.flags.ch4).toBeUndefined()
  expect(useGame.getState().data!.flags.ch5).toBe(true)
})

it('御山の石碑が先に揃っても、未解禁の第三章を飛ばして第四章を発火しない', () => {
  const data = useGame.getState().data!
  useGame.setState({ data: {
    ...data, fame: 520, regionsCleared: ['yoi_forest'], loreFrags: { akashi_miyama: 3 },
    flags: { m34_narrative_schema: 1, ch1: true, ch2: true },
    narrative: { ...data.narrative!, completed: ['ch1', 'ch2'], archive: [], active: undefined, deferred: [], queued: [] },
  } })
  useGame.getState().doRest()
  expect(useGame.getState().data!.flags.ch3).toBeUndefined()
  expect(useGame.getState().data!.flags.ch4).toBeUndefined()
  expect(useGame.getState().data!.flags.ch5).toBeUndefined()
})

it('修正前に選択前で保存されたsaveも、第二相勝利済み・結末未選択なら岐路へ復旧する', () => {
  enterGentou('dungeon')
  finishAs('won')
  finishAs('won')
  const saved = JSON.parse(storage.get('hitsugi_save_v4')!)
  delete saved.flags.finalePending
  storage.set('hitsugi_save_v4', JSON.stringify(saved))
  storage.delete('hitsugi_save_v4_bak')

  expect(useGame.getState().continueGame()).toBe(true)
  expect(useGame.getState().screen.id).toBe('finale')
})

it('第二相の記録も保留flagもない旧クリアsaveは、従来どおり郷へ戻る', () => {
  const saved = JSON.parse(storage.get('hitsugi_save_v4')!)
  saved.flags.cleared = true
  delete saved.flags.shioriPhase
  delete saved.flags.finalePending
  delete saved.flags.endingType
  storage.set('hitsugi_save_v4', JSON.stringify(saved))
  storage.delete('hitsugi_save_v4_bak')

  expect(useGame.getState().continueGame()).toBe(true)
  expect(useGame.getState().screen.id).toBe('home')
})

describe.each(['ceremony', 'jobrite'] as const)('後回しの儀の対象確認: %s', (kind) => {
  it.each(['dead', 'missing'] as const)('%sの人物を儀へ立たせず、未実施の記録を一度だけ残す', (condition) => {
    const data = migrateM34Narrative(useGame.getState().data!)
    const charId = data.family[0].id
    const scene: NarrativeScene = { kind, charId }
    const id = narrativeSceneId(scene)
    const beforeFamily = condition === 'dead'
      ? data.family.map((c) => ({ ...c, alive: false }))
      : data.family.map((c) => ({ ...c, id: 'unrelated-survivor' }))
    useGame.setState({
      data: {
        ...data, family: beforeFamily,
        narrative: { ...data.narrative!, deferred: [scene], queued: [id], deferredSince: { [id]: 1 } },
      },
    })

    useGame.getState().openDeferredScene(id)
    const after = useGame.getState()
    expect(after.screen.id).toBe('home')
    expect(after.data!.family).toEqual(beforeFamily)
    expect(after.data!.narrative!.deferred).toEqual([])
    expect(after.data!.narrative!.queued).not.toContain(id)
    expect(after.data!.narrative!.deferredSince[id]).toBeUndefined()
    expect(after.data!.narrative!.completed).not.toContain(id)
    const chronicle = after.data!.chronicle
    expect(chronicle.at(-1)?.text).toContain('執り行わず')
    after.openDeferredScene(id)
    expect(useGame.getState().data!.chronicle).toEqual(chronicle)
  })

  it('存命人物の儀は、従来どおり選択を確定せず開く', () => {
    const data = migrateM34Narrative(useGame.getState().data!)
    const charId = data.family[0].id
    const scene: NarrativeScene = { kind, charId }
    const id = narrativeSceneId(scene)
    useGame.setState({ data: { ...data, narrative: { ...data.narrative!, deferred: [scene] } } })

    useGame.getState().openDeferredScene(id)
    expect(useGame.getState().screen).toEqual({ id: kind, charId })
    expect(useGame.getState().data!.family).toEqual(data.family)
    expect(useGame.getState().data!.narrative!.active).toEqual(scene)
  })
})

it.each(['birth', 'life'] as const)('故人の%s場面は回想として消さずに開ける', (kind) => {
  const data = migrateM34Narrative(useGame.getState().data!)
  const charId = data.family[0].id
  const scene: NarrativeScene = kind === 'birth' ? { kind, charId } : {
    kind, narrativeId: 'life:past', title: '生前の一夜', lines: [{ speaker: '', text: '生前の記録。' }],
  }
  const id = narrativeSceneId(scene)
  useGame.setState({
    data: {
      ...data, family: data.family.map((c) => ({ ...c, alive: false })),
      narrative: { ...data.narrative!, deferred: [scene] },
    },
  })

  useGame.getState().openDeferredScene(id)
  expect(useGame.getState().screen.id).toBe(kind)
  expect(useGame.getState().data!.narrative!.active).toEqual(scene)
})

const summaryScenes: NarrativeScene[] = [
  ...CHAPTERS.map((chapter): NarrativeScene => ({
    kind: 'life', narrativeId: chapter.id, title: chapter.title, lines: chapter.lines,
  })),
  { kind: 'dream' },
  ...DREAM_EPISODES.map((episode): NarrativeScene => ({ kind: 'dreamEp', epId: episode.id })),
]

it.each(summaryScenes.map((scene) => [narrativeSceneId(scene), scene] as const))(
  '%sのskipは実要約を一度だけ家譜へ保存し、再読skipで重複させない', (_id, scene) => {
    const base = useGame.getState().data!
    const data = migrateM34Narrative({
      ...base, flags: { m34_narrative_schema: 1 },
      narrative: {
        ...base.narrative!, completed: [], seen: [], archive: [],
        active: scene, activeReplay: false,
      },
    })
    useGame.setState({ data })
    const summary = narrativeSceneSummary(scene)
    expect(typeof summary).toBe('string')

    useGame.getState().skipCurrentScene()
    const after = useGame.getState().data!
    expect(after.chronicle.filter((entry) => entry.kind === 'event' && entry.text.includes(summary!))).toHaveLength(1)
    expect(after.chronicle.some((entry) => entry.text.includes('家譜の要約で受け取った'))).toBe(false)
    if (narrativeSceneId(scene) === 'ch4') expect(after.flags.reveal_shiori_name).toBe(true)

    useGame.getState().skipCurrentScene()
    expect(useGame.getState().data!.chronicle).toEqual(after.chronicle)
    useGame.getState().replayNarrativeScene(narrativeSceneId(scene))
    useGame.getState().skipCurrentScene()
    expect(useGame.getState().data!.chronicle).toEqual(after.chronicle)
    useGame.getState().continueGame()
    expect(useGame.getState().data!.chronicle).toEqual(after.chronicle)
  },
)
