import { describe, expect, it } from 'vitest'
import type { GameData, NarrativeScene } from '../src/core/types'
import { CHAPTERS } from '../src/core/data/story'
import { DREAM_EPISODES } from '../src/core/data/dreams'
import { makeItem } from '../src/core/data/items'
import * as narrative from '../src/core/narrative'

function data(over: Partial<GameData> = {}): GameData {
  return {
    family: [{ id: 'head', name: '燈吾', alive: false, deathSeason: 1, equipment: {}, epitaph: '灯は続く' }],
    inventory: [], loreFrags: {}, nemeses: [], ...over,
  } as unknown as GameData
}

const endings = ['cut', 'save', 'inherit'] as const

describe('結末の個人化は表示文を人名へ逆変換しない', () => {
  it.each(endings)('%s: 故人と土地の記録を別の文として結ぶ', (ending) => {
    const result = narrative.personalizedEndingBeat(data({ loreFrags: { yoi_forest: 3 } }), ending)
    expect(result).toContain('燈吾')
    expect(result).toContain('1つの土地の縁起')
    expect(result).not.toMatch(/記したが|縁起を、最後まで記したから|燈吾と1つ/)
  })

  it.each(endings)('%s: 形見は一族の人物と混同しない', (ending) => {
    const item = { ...makeItem('w_kodachi'), name: '受け継いだ小太刀', generation: 3, legacyFirstOwner: '燈吾' }
    const result = narrative.personalizedEndingBeat(data({ inventory: [item] }), ending)
    expect(result).toContain(item.name)
    expect(result).toContain('3代')
    expect(result).not.toMatch(/燈吾と受け継いだ小太刀|小太刀が運んだ|小太刀が継いだ/)
  })

  it.each(endings)('%s: 宿敵は一族の主体にしない', (ending) => {
    const result = narrative.personalizedEndingBeat(data({ nemeses: [{
      id: 'nem', enemyId: 'en', name: '黒牙の魔性', victim: '燈吾', level: 3, regionId: 'yoi_forest',
    }] }), ending)
    expect(result).toContain('黒牙の魔性')
    expect(result).toContain('燈吾')
    expect(result).not.toMatch(/燈吾と黒牙|黒牙の魔性が|黒牙の魔性から続く/)
  })

  it.each(endings)('%s: 空一族でも文が途切れない', (ending) => {
    const result = narrative.personalizedEndingBeat(data({ family: [] }), ending)
    expect(result).toContain('名もなき一族')
    expect(result).not.toMatch(/undefined|が、家の最初の答えを選ぶが/)
  })

  it.each(endings)('%s: 故人も形見もない家では当主名を使う', (ending) => {
    const d = data()
    d.family[0].alive = true
    d.family[0].isHead = true
    expect(narrative.personalizedEndingBeat(d, ending)).toContain('燈吾の一族')
    expect(narrative.personalizedEndingBeat(d, ending)).not.toContain('答えを選ぶが')
  })

  it('家族史の表示と個人化は同じ形見・宿敵を選び、元データを変更しない', () => {
    const d = data({
      inventory: [
        { ...makeItem('w_kodachi'), name: '新しい刀', generation: 1 },
        { ...makeItem('w_kodachi'), id: 'old', name: '古い刀', generation: 4 },
      ],
      nemeses: [
        { id: 'nem1', enemyId: 'en', name: '若い魔性', victim: '燈吾', level: 1, regionId: 'yoi_forest' },
        { id: 'nem2', enemyId: 'en', name: '黒牙の魔性', victim: '燈吾', level: 4, regionId: 'yoi_forest' },
      ],
      loreFrags: { yoi_forest: 3 },
    })
    const original = structuredClone(d)
    const echoes = narrative.familyFinaleEchoes(d).map((echo) => echo.text).join('')
    const ending = narrative.personalizedEndingBeat(d, 'save')
    for (const text of [echoes, ending]) {
      expect(text).toContain('古い刀')
      expect(text).toContain('黒牙の魔性')
      expect(text).not.toMatch(/新しい刀|若い魔性|土地の縁起/)
    }
    expect(d).toEqual(original)
  })

  it('人名中の引用符・ダッシュを表示区切りと誤認しない', () => {
    const d = data()
    d.family[0].name = '灯—「守」'
    expect(narrative.personalizedEndingBeat(d, 'save')).toContain('灯—「守」')
  })
})

describe('要約は既存の場面ごとに本文の内容を返す', () => {
  it('全5章をIDと旧titleで引ける', () => {
    expect(CHAPTERS).toHaveLength(5)
    for (const chapter of CHAPTERS) {
      const scene: NarrativeScene = { kind: 'life', narrativeId: chapter.id, title: chapter.title, lines: chapter.lines }
      const summary = narrative.narrativeSceneSummary(scene)
      expect(summary).toBeTruthy()
      expect(summary!.length).toBeLessThanOrEqual(160)
      expect(summary).not.toBe(chapter.title)
      expect(narrative.narrativeSceneSummary({ ...scene, narrativeId: undefined })).toBe(summary)
    }
  })

  it('初夢と全7夢に個別の要約があり、実名を先出ししない', () => {
    const scenes: NarrativeScene[] = [{ kind: 'dream' }, ...DREAM_EPISODES.map((ep) => ({ kind: 'dreamEp' as const, epId: ep.id }))]
    expect(scenes).toHaveLength(8)
    const summaries = scenes.map(narrative.narrativeSceneSummary)
    expect(new Set(summaries).size).toBe(8)
    for (const summary of summaries) {
      expect(summary).toBeTruthy()
      expect(summary!.length).toBeLessThanOrEqual(160)
      expect(summary).not.toContain('汐里')
    }
  })

  it('要約に各場面の出来事が残る', () => {
    const chapterEvents = [
      ['八季', '誰かを待つ'], ['石碑', '終われ'], ['近づくな', '楽の音'],
      ['内側', '汐里'], ['御山への道', '生きている一族'],
    ]
    CHAPTERS.forEach((chapter, index) => {
      const summary = narrative.narrativeSceneSummary({ kind: 'life', narrativeId: chapter.id, title: chapter.title, lines: [] })!
      for (const event of chapterEvents[index]) expect(summary).toContain(event)
    })
    const dreamEvents = [
      ['無念', '星の音'], ['名をつけた', '笑っていた'], ['明滅', '星より明るい'],
      ['何も食べていなかった', '謝った'], ['太陽', '常夜を招いた'],
      ['寿命を薪', '八季'], ['二人を送る', '看取って'],
    ]
    DREAM_EPISODES.forEach((ep, index) => {
      const summary = narrative.narrativeSceneSummary({ kind: 'dreamEp', epId: ep.id })!
      for (const event of dreamEvents[index]) expect(summary).toContain(event)
    })
    expect(narrative.narrativeSceneSummary({ kind: 'dream' })).toContain('看取って')
  })

  it('前半の要約に後半の真相や結末を先出ししない', () => {
    for (const chapter of CHAPTERS.slice(0, 3)) {
      const summary = narrative.narrativeSceneSummary({ kind: 'life', narrativeId: chapter.id, title: chapter.title, lines: [] })
      expect(summary).not.toMatch(/汐里|寿命を薪|内側から|封印|座を継|二人を送/)
    }
    for (const ep of DREAM_EPISODES.slice(0, 3)) {
      const summary = narrative.narrativeSceneSummary({ kind: 'dreamEp', epId: ep.id })
      expect(summary).not.toMatch(/汐里|飢え|太陽|寿命|封印|八季|座を継/)
    }
  })

  it('第四章の要約でのみ初代の名を開示する', () => {
    const chapter = CHAPTERS[3]
    expect(narrative.narrativeSceneSummary({ kind: 'life', narrativeId: chapter.id, title: chapter.title, lines: [] })).toContain('汐里')
  })

  it('日常・未知ID・別種場面に本文の要約を捏造しない', () => {
    const scenes: NarrativeScene[] = [
      { kind: 'life', title: '日常', lines: [] },
      { kind: 'life', narrativeId: 'ch999', title: CHAPTERS[0].title, lines: [] },
      { kind: 'dreamEp', epId: 'unknown' },
      { kind: 'death', charId: 'head' },
      { kind: 'birth', charId: 'child' },
      { kind: 'ceremony', charId: 'child' },
      { kind: 'jobrite', charId: 'head' },
    ]
    expect(scenes.map(narrative.narrativeSceneSummary)).toEqual(scenes.map(() => null))
  })
})
