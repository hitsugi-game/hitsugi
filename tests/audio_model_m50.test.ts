import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AUDIO_MIX,
  TRACK_LABELS,
  arrangementAt,
  computeBattleTension,
  lineageMotifDegrees,
  resolveTrack,
  sanitizeMix,
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
})
