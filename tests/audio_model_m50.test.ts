import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AUDIO_MIX,
  DEFAULT_MUSIC_RICHNESS,
  TRACK_LABELS,
  arrangementAt,
  computeBattleTension,
  evolvedLineageMotif,
  lineageMotifDegrees,
  normalizeMusicContext,
  phrasePlanAt,
  resolveTrack,
  sanitizeMix,
  sanitizeMusicRichness,
  transitionSeconds,
  type TrackName,
} from '../src/core/audio_model'
import type { Screen } from '../src/core/types'

const SCREEN_IDS: Screen['id'][] = [
  'title', 'intro', 'home', 'pact', 'starLottery', 'birth', 'ceremony', 'jobrite', 'life',
  'village', 'depart', 'expedition', 'dungeon', 'battle', 'chronicle', 'codex', 'forge',
  'facilities', 'finale', 'death', 'dream', 'dreamEp', 'ending',
]

describe('M50 adaptive music model', () => {
  it('maps every screen to an intentional non-silent score', () => {
    expect(SCREEN_IDS).toHaveLength(23)
    for (const id of SCREEN_IDS) {
      const track = resolveTrack(id)
      expect(track, id).not.toBe('none')
      expect(TRACK_LABELS[track], id).not.toBe('')
    }
    expect(resolveTrack('battle', { rare: true })).toBe('rare')
    expect(resolveTrack('battle', { rare: true, boss: true })).toBe('boss')
    expect(resolveTrack('codex')).toBe('archive')
    expect(resolveTrack('finale')).toBe('finale')
  })

  it('uses composed phrase forms with breath and lineage instead of one exact loop', () => {
    const tracks = Object.keys(TRACK_LABELS).filter((track) => track !== 'none') as Exclude<TrackName, 'none'>[]
    for (const track of tracks) {
      const form = Array.from({ length: 12 }, (_, index) => arrangementAt(track, index, 0.35))
      expect(new Set(form.map((step) => step.shape)).size, track).toBeGreaterThanOrEqual(3)
      expect(form.some((step) => step.lineageMotif), track).toBe(true)
      expect(form.every((step) => step.melodyDensity >= 0 && step.melodyDensity <= 1), track).toBe(true)
      expect(form.every((step) => step.percussionGain >= 0 && step.percussionGain <= 1), track).toBe(true)
    }
  })

  it('derives a stable three-note family motif using the M45A mapping', () => {
    expect(lineageMotifDegrees('abc')).toEqual(lineageMotifDegrees('abc'))
    expect(lineageMotifDegrees('abc')).not.toEqual(lineageMotifDegrees('abd'))
    expect(lineageMotifDegrees('燈守家')).toHaveLength(3)
    expect(lineageMotifDegrees('燈守家').every((degree) => degree >= 0 && degree <= 4)).toBe(true)
  })

  it('raises tension for danger, rare and boss encounters while staying bounded', () => {
    const calm = computeBattleTension({ partyHpRatio: 1, enemyHpRatio: 1 })
    const danger = computeBattleTension({ partyHpRatio: 0.15, enemyHpRatio: 1 })
    const rare = computeBattleTension({ partyHpRatio: 1, enemyHpRatio: 1, rare: true })
    const boss = computeBattleTension({ partyHpRatio: 1, enemyHpRatio: 1, boss: true })
    expect(danger).toBeGreaterThan(calm)
    expect(rare).toBeGreaterThan(calm)
    expect(boss).toBeGreaterThan(rare)
    expect(computeBattleTension({ partyHpRatio: -99, enemyHpRatio: -99, boss: true })).toBe(1)
    expect(computeBattleTension({ partyHpRatio: 0, enemyHpRatio: 0, phase: 'won' })).toBe(0.08)
  })

  it('sanitizes legacy and corrupt volume preferences without changing the legacy master default', () => {
    expect(sanitizeMix({})).toEqual(DEFAULT_AUDIO_MIX)
    expect(sanitizeMix({ master: 0.33 }).master).toBe(0.33)
    expect(sanitizeMix({ master: Number.NaN, music: 5, effects: -2 })).toEqual({
      ...DEFAULT_AUDIO_MIX,
      music: 1,
      effects: 0,
    })
  })

  it('uses short combat entry and longer narrative crossfades', () => {
    expect(transitionSeconds('home', 'battle')).toBeLessThan(transitionSeconds('home', 'pact'))
    expect(transitionSeconds('battle', 'home')).toBeGreaterThan(transitionSeconds('home', 'battle'))
  })

  it('builds a deterministic long-form phrase weave without repeating a complete stanza for 10+ minutes', () => {
    const context = { screenId: 'home' as const, seasonIndex: 8, generation: 4, narrativeStage: 'fire_vow' as const }
    // homeは63bpm x 16beat。48句で約12分相当の計画を直接検査する。
    const first = Array.from({ length: 48 }, (_, index) => phrasePlanAt('home', index, context, 'balanced', 0.22))
    const replay = Array.from({ length: 48 }, (_, index) => phrasePlanAt('home', index, context, 'balanced', 0.22))
    expect(replay).toEqual(first)
    expect(new Set(first.map((plan) => plan.signature)).size).toBeGreaterThanOrEqual(40)
    const stanzas = Array.from({ length: 8 }, (_, stanza) => first.slice(stanza * 6, stanza * 6 + 6).map((plan) => plan.signature).join('|'))
    expect(new Set(stanzas).size).toBe(stanzas.length)
    expect(new Set(first.map((plan) => plan.variation)).size).toBeGreaterThanOrEqual(4)

    // 最短句のboss(138bpm x 8beat)も180句=約10.4分まで長周期の実音パラメータを保つ。
    const boss = Array.from({ length: 180 }, (_, index) => phrasePlanAt('boss', index, { screenId: 'battle', regionId: 'akashi_miyama', generation: 7 }, 'full', 0.72))
    expect(new Set(boss.map((plan) => plan.signature)).size).toBeGreaterThanOrEqual(130)
    const bossStanzas = Array.from({ length: 30 }, (_, stanza) => boss.slice(stanza * 6, stanza * 6 + 6).map((plan) => plan.signature).join('|'))
    expect(new Set(bossStanzas).size).toBe(bossStanzas.length)
  })

  it('changes audible phrase parameters with scene, region, season and generation context', () => {
    const forest = phrasePlanAt('expedition', 17, { screenId: 'dungeon', regionId: 'yoi_forest', seasonIndex: 1, generation: 1 })
    const mountain = phrasePlanAt('expedition', 17, { screenId: 'dungeon', regionId: 'akashi_miyama', seasonIndex: 10, generation: 6 })
    expect(mountain.signature).not.toBe(forest.signature)
    expect(mountain.variantLabel).not.toBe(forest.variantLabel)
    expect(normalizeMusicContext({ seasonIndex: Number.NaN, generation: -9 })).toMatchObject({ seasonIndex: 0, generation: 1 })
    const low = phrasePlanAt('boss', 2, { screenId: 'battle' }, 'balanced', 0.1)
    const high = phrasePlanAt('boss', 2, { screenId: 'battle' }, 'balanced', 0.9)
    expect(high.melodyDensity).toBeGreaterThanOrEqual(low.melodyDensity)
    expect(high.percussionGain).toBeGreaterThan(low.percussionGain)
  })

  it('persists only known richness modes and scales arrangement density safely', () => {
    expect(sanitizeMusicRichness('full')).toBe('full')
    expect(sanitizeMusicRichness('corrupt')).toBe(DEFAULT_MUSIC_RICHNESS)
    const spare = Array.from({ length: 24 }, (_, index) => phrasePlanAt('forge', index, {}, 'spare', 0.2))
    const full = Array.from({ length: 24 }, (_, index) => phrasePlanAt('forge', index, {}, 'full', 0.2))
    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
    expect(average(full.map((plan) => plan.melodyDensity))).toBeGreaterThan(average(spare.map((plan) => plan.melodyDensity)))
    expect(spare.every((plan) => !plan.counterline)).toBe(true)
    expect(full.some((plan) => plan.counterline)).toBe(true)
  })

  it('keeps the founder notes recognizable while the lineage motif grows by generation', () => {
    const founder = lineageMotifDegrees('燈守家')
    const first = evolvedLineageMotif('燈守家', 1)
    const second = evolvedLineageMotif('燈守家', 2)
    const middle = evolvedLineageMotif('燈守家', 5)
    const late = evolvedLineageMotif('燈守家', 8)
    expect(first.degrees).toEqual(founder)
    expect(second.beatOffsets).not.toEqual(first.beatOffsets)
    expect(middle.degrees.length).toBeGreaterThan(first.degrees.length)
    expect(late.degrees.length).toBeGreaterThan(middle.degrees.length)
    for (const degree of founder) expect(late.degrees).toContain(degree)
    expect(evolvedLineageMotif('燈守家', 8)).toEqual(late)
  })
})
