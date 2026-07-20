import { describe, expect, it } from 'vitest'
import type { GameData, NarrativeScene } from '../src/core/types'
import { CHAPTERS, ENDINGS, FINALE_CHOICES } from '../src/core/data/story'
import { DREAM_EPISODES } from '../src/core/data/dreams'
import { GOSSIP, nextGossip } from '../src/core/data/gossip'
import { inheritItem, makeItem } from '../src/core/data/items'
import {
  familyFinaleEchoes, migrateM34Narrative, narrativeSceneId,
  narrativeMetricSummary, narrativeScenePriority, partitionNarrativeScenes, personalizedEndingBeat,
  recoverNarrativeOnLoad, regionQuestion, resonanceLine, returnTraces, uniqueScenes,
} from '../src/core/narrative'

function data(over: Partial<GameData> = {}): GameData {
  return {
    seasonIndex: 0,
    family: [{
      id: 'head', name: '灯', alive: true, gen: 1, isHead: true, hp: 10, maxHp: 10,
      equipment: {}, deeds: [], epitaph: '灯は続く',
    }],
    hoto: 0, ketsu: 0, inventory: [], godAffinity: {}, fame: 0,
    regionsCleared: [], chronicle: [], pendingBirths: [], flags: { m34_narrative_schema: 1 },
    narrativeMode: false, seed: 1,
    ...over,
  } as unknown as GameData
}

describe('M34 汐里の唯一開示', () => {
  it('ch4の最終beatだけが実名を含む', () => {
    const ch4 = CHAPTERS.find((chapter) => chapter.id === 'ch4')!
    const hits = ch4.lines.map((line, index) => ({ index, text: line.text })).filter((line) => line.text.includes('汐里'))
    expect(hits).toEqual([{ index: ch4.lines.length - 1, text: '擦れていた墨が、夜露のように滲む。——汐里。これが、初代の名だ。' }])
  })

  it('gsp12以降は開示前に止まり、開示後は指定の余韻から続く', () => {
    const ctx = { gen: 10, deaths: 30, cleared: 30 }
    expect(nextGossip(11, ctx)).toBeNull()
    expect(nextGossip(12, ctx)).toBeNull()
    const unlocked = nextGossip(11, { ...ctx, revealShioriName: true })
    expect(unlocked?.id).toBe('gsp_12')
    expect(unlocked?.text).toContain('初代の名だ')
  })

  it('夢2〜8の本文はch4前でも実名を先に言わない', () => {
    expect(DREAM_EPISODES.flatMap((ep) => ep.beats).some((beat) => beat.includes('汐里'))).toBe(false)
  })

  it('legacy migrationはendingType=0も実名既知として扱う', () => {
    const migrated = migrateM34Narrative(data({ flags: { endingType: 0 } }))
    expect(migrated.flags.reveal_shiori_name).toBe(true)
  })
})

describe('M34 scene queueの安定規則', () => {
  const scenes: NarrativeScene[] = [
    { kind: 'dream' },
    { kind: 'life', narrativeId: 'ch2', title: '第二章', lines: [] },
    { kind: 'birth', charId: 'c2' },
    { kind: 'death', charId: 'c1' },
    { kind: 'life', title: '日常', lines: [] },
  ]

  it('death > rite > chapter > dream > dailyの優先度を固定する', () => {
    expect([...scenes].sort((a, b) => narrativeScenePriority(a) - narrativeScenePriority(b)).map((scene) => scene.kind)).toEqual([
      'death', 'birth', 'life', 'dream', 'life',
    ])
  })

  it('安定IDで重複scene payloadを除く', () => {
    expect(uniqueScenes([...scenes, scenes[0], scenes[1]]).map(narrativeSceneId)).toHaveLength(scenes.length)
  })

  it('同月の強制表示は最高優先1件だけで残りを灯の余白へ送る', () => {
    const progress = migrateM34Narrative(data()).narrative!
    const result = partitionNarrativeScenes(progress, scenes)
    expect(result.primary?.kind).toBe('death')
    expect(result.deferred).toHaveLength(scenes.length - 1)
    expect(result.queued).toHaveLength(scenes.length)
  })
})

describe('M34 家族史と三結末', () => {
  it('内部ID順を維持しつつcutだけ表示を送るへ合わせる', () => {
    expect(FINALE_CHOICES.map((choice) => choice.id)).toEqual(['cut', 'save', 'inherit'])
    expect(FINALE_CHOICES[0].label).toBe('送る — 千年を終わらせる')
    expect(FINALE_CHOICES[0].desc).toContain('看取り')
    expect(ENDINGS.cut.beats.join('')).toMatch(/刃を納め|読み上げ/)
  })

  it('極端なresonanceでも表示文に留まり選択肢自体を変えない', () => {
    const d = migrateM34Narrative(data())
    d.narrative!.resonance = { cut: 999, save: 0, inherit: 0 }
    expect(resonanceLine(d)).toContain('幕を引いて')
    expect(FINALE_CHOICES.map((choice) => choice.id)).toEqual(['cut', 'save', 'inherit'])
  })

  it('resonance同率は特定結末を勧めず中立文にする', () => {
    const d = migrateM34Narrative(data())
    d.narrative!.resonance = { cut: 4, save: 4, inherit: 0 }
    expect(resonanceLine(d)).toContain('終えることも、分けることも')
  })

  it('死者や形見が無くても実saveの名を最低1件返す', () => {
    const echoes = familyFinaleEchoes(data())
    expect(echoes.length).toBeGreaterThanOrEqual(1)
    expect(echoes.some((echo) => echo.text.includes('灯'))).toBe(true)
  })

  it('地域の問いは進捗に応じて短く変わる', () => {
    expect(regionQuestion('宵の森', 0, false)).toContain('誰だ')
    expect(regionQuestion('宵の森', 3, false)).toContain('どんな終わり')
    expect(regionQuestion('宵の森', 3, true)).toContain('次の夜')
  })

  it('帰還三痕は人・土地・千年を各1件、最大3件返す', () => {
    const d = migrateM34Narrative(data())
    d.narrative!.lastReturn = {
      id: 'return:0:yoi_forest', season: 0, regionId: 'yoi_forest', partyIds: ['head'], injuredIds: ['head'], bossDown: true,
    }
    const traces = returnTraces(d)
    expect(traces.map((trace) => trace.kind)).toEqual(['human', 'land', 'myth'])
    expect(traces).toHaveLength(3)
  })

  it('形見を再継承しても最初の持ち主は変わらない', () => {
    const first = inheritItem(makeItem('w_kodachi'), '燈吾')
    const second = inheritItem(first, '燈子')
    expect(first.legacyFirstOwner).toBe('燈吾')
    expect(second.legacyFirstOwner).toBe('燈吾')
    expect(second.legacyOf).toBe('燈子')
  })

  it('三結末の個人化beatが同じ家族史から異なる帰結を返す', () => {
    const d = data()
    expect(personalizedEndingBeat(d, 'cut')).toContain('夜を送った')
    expect(personalizedEndingBeat(d, 'save')).toContain('犠牲ではない')
    expect(personalizedEndingBeat(d, 'inherit')).toContain('新しい家譜')
  })

  it('gossip正典18件を維持する', () => {
    expect(GOSSIP).toHaveLength(18)
  })
})

describe('M34 N4 匿名体験計測', () => {
  it('旧saveは外部送信を要しない0初期値へ移行する', () => {
    const migrated = migrateM34Narrative(data())
    expect(migrated.narrative?.metrics).toEqual({
      scenesOpened: 0,
      scenesCompleted: 0,
      scenesSkipped: 0,
      scenesDeferred: 0,
      totalSceneMs: 0,
      maxDeferred: 0,
      monthsAdvanced: 0,
      interruptedAfterMonth: 0,
    })
    expect(narrativeMetricSummary(migrated)).toEqual({
      averageSceneMs: 0,
      skipRate: 0,
      maxDeferred: 0,
      interruptedAfterMonth: 0,
    })
  })

  it('月送り中断はload時に一度だけ数え、二重計上しない', () => {
    const d = migrateM34Narrative(data())
    d.narrative!.monthTransitionPending = true
    const once = recoverNarrativeOnLoad(d)
    const twice = recoverNarrativeOnLoad(once)
    expect(once.narrative?.metrics.interruptedAfterMonth).toBe(1)
    expect(twice.narrative?.metrics.interruptedAfterMonth).toBe(1)
    expect(twice.narrative?.monthTransitionPending).toBe(false)
  })

  it('平均scene時間とskip率は集計値だけから導出する', () => {
    const d = migrateM34Narrative(data())
    d.narrative!.metrics = {
      ...d.narrative!.metrics,
      scenesCompleted: 3,
      scenesSkipped: 1,
      scenesDeferred: 1,
      totalSceneMs: 5000,
      maxDeferred: 4,
      interruptedAfterMonth: 2,
    }
    expect(narrativeMetricSummary(d)).toEqual({
      averageSceneMs: 1000,
      skipRate: 0.25,
      maxDeferred: 4,
      interruptedAfterMonth: 2,
    })
  })
})
