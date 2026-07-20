import { beforeEach, describe, expect, it } from 'vitest'
import type { GameData, NarrativeScene } from '../src/core/types'
import { CHAPTERS } from '../src/core/data/story'
import { migrateM34Narrative, narrativeSceneId } from '../src/core/narrative'
import { useGame } from '../src/core/store'

class MemStorage {
  store = new Map<string, string>()
  getItem(key: string) { return this.store.get(key) ?? null }
  setItem(key: string, value: string) { this.store.set(key, value) }
  removeItem(key: string) { this.store.delete(key) }
  clear() { this.store.clear() }
}

const mem = new MemStorage()
// @ts-expect-error テスト環境へ最小localStorageを注入
globalThis.localStorage = mem

function game(over: Partial<GameData> = {}): GameData {
  return migrateM34Narrative({
    seasonIndex: 0,
    family: [{
      id: 'c1', name: '灯', alive: true, gen: 1, isHead: true, hp: 10, maxHp: 10,
      equipment: {}, deeds: [], epitaph: '灯は続く',
    }],
    hoto: 0, ketsu: 0, inventory: [], godAffinity: {}, fame: 0,
    regionsCleared: [], chronicle: [], pendingBirths: [], flags: { m34_narrative_schema: 1 },
    narrativeMode: false, seed: 1,
    ...over,
  } as unknown as GameData)
}

beforeEach(() => {
  mem.clear()
  useGame.setState({
    data: game(),
    screen: { id: 'home' },
    pendingScenes: [],
    pendingEvent: null,
    battle: null,
    battleNodeId: null,
  })
})

describe('M34 永続scene actions', () => {
  it('表示中の夢は完読actionで初めてresolvedになる', () => {
    const dream: NarrativeScene = { kind: 'dream' }
    const d = game()
    useGame.setState({ data: { ...d, narrative: { ...d.narrative!, active: dream } }, screen: { id: 'dream' } })

    expect(useGame.getState().data!.flags.dreamSeen).not.toBe(true)
    useGame.getState().processNextScene()

    const after = useGame.getState().data!
    expect(after.flags.dreamSeen).toBe(true)
    expect(after.narrative?.completed).toContain('dream:intro')
    expect(after.narrative?.active).toBeUndefined()
    expect(after.narrative?.metrics.scenesCompleted).toBe(1)
    expect(useGame.getState().screen.id).toBe('home')
  })

  it('後で読むへ退避し、同じpayloadを灯の余白から再開できる', () => {
    const scene: NarrativeScene = { kind: 'dreamEp', epId: 'yume_tabibito' }
    const d = game({ flags: { m34_narrative_schema: 1, dreamSeen: true } })
    useGame.setState({ data: { ...d, narrative: { ...d.narrative!, active: scene } }, screen: { id: 'dreamEp', epId: scene.epId } })

    useGame.getState().deferCurrentScene()
    expect(useGame.getState().data!.narrative?.deferred).toContainEqual(scene)
    expect(useGame.getState().data!.narrative?.metrics.scenesDeferred).toBe(1)
    expect(useGame.getState().data!.flags.dreamEp_yume_tabibito).not.toBe(true)

    useGame.getState().openDeferredScene(narrativeSceneId(scene))
    expect(useGame.getState().screen).toEqual({ id: 'dreamEp', epId: scene.epId })
    expect(useGame.getState().data!.narrative?.active).toEqual(scene)
  })

  it('完読した章・夢を家譜から再読しても進行と完読数を二重計上しない', () => {
    const scene: NarrativeScene = { kind: 'dreamEp', epId: 'yume_tabibito' }
    const d = game({ flags: { m34_narrative_schema: 1, dreamSeen: true } })
    useGame.setState({ data: { ...d, narrative: { ...d.narrative!, active: scene } }, screen: { id: 'dreamEp', epId: scene.epId } })
    useGame.getState().processNextScene()
    const completed = useGame.getState().data!.narrative!
    expect(completed.archive).toContainEqual(scene)
    expect(completed.metrics.scenesCompleted).toBe(1)

    useGame.getState().replayNarrativeScene(narrativeSceneId(scene))
    expect(useGame.getState().data!.narrative?.activeReplay).toBe(true)
    expect(useGame.getState().screen).toEqual({ id: 'dreamEp', epId: scene.epId })
    useGame.getState().processNextScene()
    const replayed = useGame.getState().data!.narrative!
    expect(replayed.metrics.scenesCompleted).toBe(1)
    expect(replayed.completed.filter((id) => id === narrativeSceneId(scene))).toHaveLength(1)
    expect(replayed.active).toBeUndefined()
  })

  it('日常lifeは家譜の章・夢アーカイブを埋めない', () => {
    const scene: NarrativeScene = {
      kind: 'life', narrativeId: 'life:4:0:夜の稽古', title: '夜の稽古',
      lines: [{ speaker: '', text: '一族は刃を研いだ。' }],
    }
    const d = game()
    useGame.setState({ data: { ...d, narrative: { ...d.narrative!, active: scene } } })
    useGame.getState().processNextScene()
    expect(useGame.getState().data!.narrative?.archive).not.toContainEqual(scene)
  })

  it('灯の余白で7日経過した未読だけを一度だけ非modal通知する', () => {
    const scene: NarrativeScene = { kind: 'dreamEp', epId: 'yume_tabibito' }
    const id = narrativeSceneId(scene)
    const d = game({ flags: { m34_narrative_schema: 1, dreamSeen: true } })
    useGame.setState({
      data: {
        ...d,
        narrative: {
          ...d.narrative!, deferred: [scene],
          deferredSince: { [id]: Date.now() - 8 * 24 * 60 * 60 * 1000 },
        },
      },
    })
    expect(useGame.getState().consumeDeferredReminder()).toEqual(scene)
    expect(useGame.getState().consumeDeferredReminder()).toBeNull()
    expect(useGame.getState().data!.narrative?.deferred).toContainEqual(scene)
  })

  it('ch4の最終頁transactionは実名・完了・chronicleを冪等に同時保存する', () => {
    const chapter = CHAPTERS.find((item) => item.id === 'ch4')!
    const scene: NarrativeScene = { kind: 'life', narrativeId: chapter.id, title: chapter.title, lines: chapter.lines }
    const d = game({ flags: { m34_narrative_schema: 1, ch4: true } })
    useGame.setState({ data: { ...d, narrative: { ...d.narrative!, active: scene } }, screen: { id: 'life', narrativeId: 'ch4', title: chapter.title, lines: chapter.lines } })

    useGame.getState().revealShioriName(false)
    useGame.getState().revealShioriName(false)
    const after = useGame.getState().data!
    expect(after.flags.reveal_shiori_name).toBe(true)
    expect(after.flags.ch4_completed).toBe(true)
    expect(after.chronicle.filter((entry) => entry.text.includes('——汐里。これが、初代の名だ。'))).toHaveLength(1)
  })

  it('ch4 skipも同じ開示結果を残しsceneを解決する', () => {
    const chapter = CHAPTERS.find((item) => item.id === 'ch4')!
    const scene: NarrativeScene = { kind: 'life', narrativeId: chapter.id, title: chapter.title, lines: chapter.lines }
    const d = game({ flags: { m34_narrative_schema: 1, ch4: true } })
    useGame.setState({ data: { ...d, narrative: { ...d.narrative!, active: scene } } })

    useGame.getState().skipCurrentScene()
    const after = useGame.getState().data!
    expect(after.flags.reveal_shiori_name).toBe(true)
    expect(after.flags.ch4_completed).toBe(true)
    expect(after.narrative?.completed).toContain('ch4')
    expect(after.narrative?.metrics.scenesSkipped).toBe(1)
    expect(after.chronicle.some((entry) => entry.text.includes('——汐里。これが、初代の名だ。'))).toBe(true)
  })

  it('queueから開いたsceneは開始時刻と開封数を記録する', () => {
    const scene: NarrativeScene = { kind: 'dream' }
    useGame.setState({ pendingScenes: [scene], screen: { id: 'home' } })
    useGame.getState().processNextScene()
    const narrative = useGame.getState().data!.narrative!
    expect(narrative.active).toEqual(scene)
    expect(narrative.activeOpenedAt).toBeTypeOf('number')
    expect(narrative.metrics.scenesOpened).toBe(1)
  })

  it('legacy recapは二度呼んでもchronicleへ一度だけ入る', () => {
    const d = game({
      flags: { m34_narrative_schema: 1, reveal_shiori_name: true, legacy_shiori_recap_pending: true },
    })
    useGame.setState({ data: d })
    expect(useGame.getState().consumeLegacyShioriRecap()).toContain('初代の名は、汐里')
    expect(useGame.getState().consumeLegacyShioriRecap()).toBeNull()
    expect(useGame.getState().data!.chronicle.filter((entry) => entry.text.includes('初代の名は、汐里'))).toHaveLength(1)
  })

  it('旧遠征の負傷帰還は三痕の事実とsaveの響きを一度残す', () => {
    useGame.getState().newGame(false)
    const founder = useGame.getState().data!.family[0]
    useGame.getState().depart('yoi_forest', [founder.id])
    const started = useGame.getState().data!
    useGame.setState({
      data: {
        ...started,
        family: started.family.map((character) => character.id === founder.id ? { ...character, hp: Math.max(1, character.maxHp - 1) } : character),
      },
    })
    useGame.getState().useReturnFire()
    const after = useGame.getState().data!
    expect(after.narrative?.lastReturn?.regionId).toBe('yoi_forest')
    expect(after.narrative?.lastReturn?.injuredIds).toContain(founder.id)
    expect(after.narrative?.resonance.save).toBe(1)
  })

  it('歩行ダンジョンの負傷帰還も同じschemaへ記録する', () => {
    useGame.getState().newGame(false)
    const founder = useGame.getState().data!.family[0]
    useGame.getState().departDungeon('yoi_forest', [founder.id])
    const started = useGame.getState().data!
    useGame.setState({
      data: {
        ...started,
        family: started.family.map((character) => character.id === founder.id ? { ...character, hp: Math.max(1, character.maxHp - 1) } : character),
      },
    })
    useGame.getState().dungeonReturn()
    const after = useGame.getState().data!
    expect(after.narrative?.lastReturn?.regionId).toBe('yoi_forest')
    expect(after.narrative?.lastReturn?.injuredIds).toContain(founder.id)
    expect(after.narrative?.resonance.save).toBe(1)
  })
})
