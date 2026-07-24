import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const audio = readFileSync('src/core/audio.ts', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')
const settings = readFileSync('src/ui/Settings.tsx', 'utf8')
const homeCss = readFileSync('src/ui/m17_home.css', 'utf8')
const components = readFileSync('src/ui/components.tsx', 'utf8')

describe('M50 audio lifecycle and UI contracts', () => {
  it('separates music, effects and ambience under a compressed master graph', () => {
    expect(audio).toContain('createDynamicsCompressor')
    expect(audio).toContain('musicVolumeNode')
    expect(audio).toContain('effectsBus')
    expect(audio).toContain('ambienceBus')
    expect(audio).toContain('duckMusic')
  })

  it('keeps one semantic UI sound delegate and removes the App duplicate click listener', () => {
    expect(audio).toContain("document.addEventListener('click', click, true)")
    expect(app).not.toContain("audio.se('click')")
    expect(app).not.toContain("document.addEventListener('click', onClick)")
  })

  it('supports gesture unlock, visibility pause, crossfade and desired ambience recovery', () => {
    expect(audio).toContain("document.addEventListener('pointerdown', unlock")
    expect(audio).toContain("document.addEventListener('visibilitychange'")
    expect(audio).toContain('transitionSeconds(previous, track)')
    expect(audio).toContain('desiredAmbience')
    expect(audio).toContain('activeAmbienceGain')
    expect(audio).toContain('exponentialRampToValueAtTime(0.0001, now + 0.38)')
    expect(audio).toContain('syncDesiredState()')
  })

  it('exposes master/music/effects/ambience controls and calm mode', () => {
    for (const id of ['setting-volume', 'setting-music-volume', 'setting-effects-volume', 'setting-ambience-volume']) {
      expect(settings).toContain(`id="${id}"`)
    }
    expect(settings).toContain('音楽の起伏を控えめに')
    expect(settings).toContain('今の調べ')
  })

  it('lays every family card out without a horizontal slider and uses a human portrait before coming of age', () => {
    const rail = homeCss.slice(homeCss.indexOf('.family-smalls {'), homeCss.indexOf('.char-card.clickable'))
    expect(rail).toContain('display: grid')
    expect(rail).toContain('overflow: visible')
    expect(rail).not.toContain('overflow-x: auto')
    expect(components).toContain('? [provisional]')
    expect(components).toContain('provisionalFaceImg')
  })

  it('has a shipped provisional face for every mapped training form, sex and personality', () => {
    const forms = ['homura', 'nagi', 'iwao', 'sumi']
    const personalities = ['brave', 'timid', 'kind', 'rival', 'easy', 'cool', 'wild', 'lonely']
    for (const form of forms) {
      for (const sex of ['m', 'f']) {
        for (const personality of personalities) {
          expect(existsSync(`public/img/face_${form}_${sex}_${personality}.jpg`)).toBe(true)
        }
      }
    }
  })
})
