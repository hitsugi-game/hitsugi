// M19 C2: ホーム推奨6条(homeInsight)/今日の御題/夢渡り解禁の回帰テスト — 全て純関数
import { describe, expect, it } from 'vitest'
import type { Character, GameData } from '../src/core/types'
import { LIFESPAN_MONTHS } from '../src/core/types'
import { census, recommendAction, nextMonthNotes } from '../src/ui/homeInsight'
import { todaysOdai, ODAI } from '../src/core/data/dailyOdai'
import { nextDreamEpisode, DREAM_EPISODES } from '../src/core/data/dreams'

function ch(over: Partial<Character> = {}): Character {
  return {
    id: `c${Math.random()}`, name: '甲', alive: true, gen: 1, isHead: false,
    hp: 100, maxHp: 100, mp: 10, maxMp: 10,
    bornSeason: -12, // seasonIndex=0で月齢12=成人
    equipment: {}, deeds: [], expeditions: 0, kills: 0, fatigue: 0,
    ...over,
  } as unknown as Character
}

function data(over: Partial<GameData> = {}): GameData {
  return {
    seasonIndex: 0, hoto: 999, ketsu: 0, fame: 0,
    family: [ch({ isHead: true })],
    pendingBirths: [], chronicle: [], inventory: [], regionsCleared: [],
    flags: {}, godAffinity: {},
    ...over,
  } as unknown as GameData
}

describe('recommendAction 6条(UI_UX_REDESIGN_PLAN §4.3)', () => {
  it('1. 存命1・後継なし・契り可能 → 星契り', () => {
    const d = data({ family: [ch({ isHead: true })] })
    expect(recommendAction(d).action).toBe('pact')
  })
  it('2. 成人0・幼子あり → 静養(成人までの残月つき)', () => {
    const d = data({ family: [ch({ bornSeason: -2 })] }) // 月齢2=幼子
    const r = recommendAction(d)
    expect(r.action).toBe('rest')
    expect(r.reason).toContain('4月') // 成人(6)まであと4月
  })
  it('3. 成人の平均HP30%未満 → 静養', () => {
    const d = data({ family: [ch({ isHead: true, hp: 10 }), ch({ hp: 20 })] })
    expect(recommendAction(d).action).toBe('rest')
  })
  it('4. 祭月かつ複数負傷 → 祭', () => {
    const d = data({ seasonIndex: 2, family: [ch({ isHead: true, bornSeason: -10, hp: 60 }), ch({ bornSeason: -10, hp: 60 })] })
    expect(recommendAction(d).action).toBe('festival')
  })
  it('5. 奉燈が最安の契り未満 → 出立(理由に不足額)', () => {
    const d = data({ hoto: 1, family: [ch({ isHead: true }), ch()] })
    const r = recommendAction(d)
    expect(r.action).toBe('depart')
    expect(r.reason).toContain('奉燈')
  })
  it('6. 平時 → 出立', () => {
    const d = data({ family: [ch({ isHead: true }), ch()] })
    expect(recommendAction(d).action).toBe('depart')
  })
})

describe('census / nextMonthNotes', () => {
  it('存命/成人/幼子/懐妊/後継を正しく数える', () => {
    const d = data({
      family: [ch({ isHead: true }), ch({ bornSeason: -3 }), ch({ alive: false })],
      pendingBirths: [{ godId: 'g', parentId: 'p', dueSeason: 1 }],
    })
    const c = census(d)
    expect(c.alive.length).toBe(2)
    expect(c.adults.length).toBe(1)
    expect(c.children.length).toBe(1)
    expect(c.pregnant).toBe(1)
    expect(c.hasHeir).toBe(true)
  })
  it('翌月の確定イベント(誕生/成人/灯尽き/祭月)を予告する', () => {
    const d = data({
      seasonIndex: 1, // 翌月=2は祭月(弥生)
      family: [
        ch({ isHead: true, bornSeason: 1 - 5 }), // 月齢5 → 翌月成人
        ch({ bornSeason: 1 - (LIFESPAN_MONTHS - 1) }), // 残1月 → 翌月灯尽き
      ],
      pendingBirths: [{ godId: 'g', parentId: 'p', dueSeason: 2 }],
    })
    const notes = nextMonthNotes(d).join(' / ')
    expect(notes).toContain('生まれる')
    expect(notes).toContain('成人')
    expect(notes).toContain('尽きる')
    expect(notes).toContain('祭月')
  })
})

describe('todaysOdai(今日の御題)', () => {
  it('同じ日付キーなら同じ御題(決定的)', () => {
    expect(todaysOdai(20260711).id).toBe(todaysOdai(20260711).id)
    expect(todaysOdai(20260711).id).toBe(ODAI[20260711 % ODAI.length].id)
  })
  it('達成判定が state から導出される(例: 血珠5)', () => {
    const odai = ODAI.find((o) => o.id === 'ketsu5')!
    expect(odai.check(data({ ketsu: 4 }))).toBe(false)
    expect(odai.check(data({ ketsu: 5 }))).toBe(true)
  })
})

describe('nextDreamEpisode(夢渡りの連作の解禁)', () => {
  const dead = (n: number) => Array.from({ length: n }, () => ch({ alive: false }))
  it('死者数の閾値で配列順に一篇ずつ解禁される', () => {
    const d = data({ family: [ch({ isHead: true }), ...dead(3)], flags: { dreamSeen: true } })
    expect(nextDreamEpisode(d)?.id).toBe(DREAM_EPISODES[0].id) // 未読の最初(弐)
  })
  it('既読はflagで飛ばされる', () => {
    const d = data({
      family: [ch({ isHead: true }), ...dead(3)],
      flags: { dreamSeen: true, [`dreamEp_${DREAM_EPISODES[0].id}`]: true },
    })
    expect(nextDreamEpisode(d)?.id).toBe(DREAM_EPISODES[1].id) // 参へ進む
  })
  it('閾値未満ならnull', () => {
    const d = data({ family: [ch({ isHead: true })], flags: { dreamSeen: true } })
    expect(nextDreamEpisode(d)).toBeNull()
  })
  it('初回夢を完了するまでは後篇を一切返さない', () => {
    const d = data({ family: [ch({ isHead: true, gen: 9 }), ...dead(22)] })
    expect(nextDreamEpisode(d)).toBeNull()
  })
  it('最初の未読篇が未解禁なら、世代条件を満たす後篇へ飛ばない', () => {
    const d = data({ family: [ch({ isHead: true, gen: 9 })], flags: { dreamSeen: true } })
    expect(nextDreamEpisode(d)).toBeNull()
  })
  it('各篇が直前篇を明示的に要求する', () => {
    expect(DREAM_EPISODES.map((ep) => ep.requiresPrevious)).toEqual([
      'dream:intro',
      'yume_tabibito',
      'yume_sora_no_ko',
      'yume_futari',
      'yume_ue',
      'yume_taiyou',
      'yume_maki',
    ])
  })
})
