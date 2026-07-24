// 『灯継ぎ』適応型音楽エンジン — 外部sampleを使わないWeb Audio手続き演奏。
// 全局面の芯は「汐里の子守唄」。家では記憶、探索では道標、戦いでは抗い、結末では答えへ変奏する。

import {
  DEFAULT_AUDIO_MIX,
  TRACK_LABELS,
  arrangementAt,
  clampUnit,
  lineageMotifDegrees,
  sanitizeMix,
  transitionSeconds,
  type AmbienceKind,
  type AudioBusName,
  type AudioMix,
  type TrackName,
} from './audio_model'

export type { AmbienceKind, AudioBusName, AudioMix, TrackName } from './audio_model'

// A平調子: A3を宮とする陰旋法。負の度数とオクターブ超えにも対応する。
const HIRAJOSHI = [220.0, 246.94, 261.63, 329.63, 349.23]
function deg(degree: number): number {
  const oct = Math.floor(degree / 5)
  return HIRAJOSHI[((degree % 5) + 5) % 5] * Math.pow(2, oct)
}

type Note = [beat: number, degree: number, length: number]

const LULLABY: Note[] = [
  [0, 0, 1], [1, 2, 1], [2, 3, 1.5], [3.5, 4, 0.5],
  [4, 3, 1], [5, 2, 1], [6, 0, 2],
  [8, 0, 1], [9, 2, 1], [10, 3, 1.5], [11.5, 5, 0.5],
  [12, 4, 1], [13, 3, 1], [14, 2, 2],
]

interface Pattern {
  bpm: number
  beats: number
  koto: Note[]
  answer?: Note[]
  bass?: [beat: number, degree: number][]
  taiko?: number[]
  bell?: [beat: number, degree: number][]
  air?: [beat: number, degree: number, length: number][]
}

const PATTERNS: Record<Exclude<TrackName, 'none'>, Pattern> = {
  title: {
    bpm: 54, beats: 16, koto: LULLABY,
    answer: [[0, 3, 1], [2, 2, 1], [4, 0, 2], [8, 4, 1], [10, 3, 1], [12, 2, 2]],
    bass: [[0, -5], [8, -3]], air: [[4, 0, 3], [12, 2, 3]],
  },
  home: {
    bpm: 63, beats: 16,
    koto: [[0, 0, 1], [1.5, 2, 0.5], [2, 3, 1], [4, 2, 1], [6, 0, 1], [8, 3, 1], [9.5, 4, 0.5], [10, 3, 1], [12, 2, 1], [14, 0, 1]],
    answer: [[0, 2, 1], [2, 3, 1], [5, 2, 1], [8, 0, 1], [11, 2, 1], [14, 0, 1]],
    bass: [[0, -5], [4, -5], [8, -3], [12, -5]], bell: [[3, 7], [11, 8]],
  },
  pact: {
    bpm: 52, beats: 16,
    koto: [[0, 4, 1], [2, 3, 1], [4, 2, 1], [6, 0, 2], [10, 3, 1], [12, 2, 1], [14, 0, 2]],
    answer: [[0, 0, 1.5], [3, 2, 1], [5, 4, 2], [9, 3, 1], [12, 5, 2]],
    bass: [[0, -10], [8, -8]], bell: [[1, 9], [7, 11], [13, 10]], air: [[4, 2, 4]],
  },
  forge: {
    bpm: 72, beats: 16,
    koto: [[0, 0, 0.5], [2, 2, 0.5], [5, 3, 0.5], [8, 2, 0.5], [10, 0, 0.5], [13, 3, 0.5]],
    answer: [[1, 3, 0.5], [3, 2, 0.5], [6, 0, 1], [9, 2, 0.5], [12, 3, 0.5], [15, 2, 0.5]],
    bass: [[0, -10], [5, -8], [8, -10], [13, -7]], taiko: [0, 2.5, 5, 8, 10.5, 13],
  },
  expedition: {
    bpm: 72, beats: 16,
    koto: [[0, 0, 0.5], [3, 1, 0.5], [6, 0, 0.5], [10, 2, 1], [13, 1, 0.5]],
    answer: [[1, 2, 0.5], [4, 1, 0.5], [8, 0, 1], [12, 3, 0.5], [15, 2, 0.5]],
    bass: [[0, -10], [8, -9]], taiko: [0, 5.5, 8, 13.5], air: [[6, -2, 4]],
  },
  battle: {
    bpm: 126, beats: 8,
    koto: [[0, 3, 0.5], [0.5, 2, 0.5], [1, 3, 0.5], [2, 5, 0.5], [3, 4, 0.5], [4, 3, 0.5], [5, 2, 0.5], [6, 0, 1]],
    answer: [[0, 0, 0.5], [1, 2, 0.5], [1.5, 3, 0.5], [3, 2, 0.5], [4, 4, 0.5], [5, 3, 0.5], [6.5, 2, 0.5]],
    bass: [[0, -5], [2, -5], [4, -3], [6, -5]], taiko: [0, 1, 2.5, 4, 5, 6.5],
  },
  rare: {
    bpm: 120, beats: 8,
    koto: [[1, 8, 0.25], [1.75, 6, 0.25], [2.5, 9, 0.5], [4, 4, 0.5], [5.5, 7, 0.25], [6, 3, 1]],
    answer: [[0.75, 9, 0.25], [2, 7, 0.5], [3.5, 5, 0.25], [4.5, 8, 0.5], [6.5, 4, 0.5]],
    bass: [[0, -11], [4, -9]], taiko: [1, 3, 4.5, 7], bell: [[0, 12], [6, 10]],
  },
  boss: {
    bpm: 138, beats: 8,
    koto: [[0, 0, 0.5], [0.75, 1, 0.25], [1, 2, 0.5], [2, 1, 0.5], [3, 0, 0.5], [4, 2, 0.5], [4.75, 3, 0.25], [5, 4, 0.5], [6, 1, 1]],
    answer: [[0, 3, 0.5], [1, 2, 0.5], [2.5, 0, 0.5], [4, 4, 0.5], [5, 3, 0.5], [6.5, 1, 0.5]],
    bass: [[0, -10], [1.5, -10], [3, -9], [4.5, -10], [6, -8]], taiko: [0, 0.75, 1.5, 3, 3.75, 4.5, 6, 7],
  },
  archive: {
    bpm: 48, beats: 16,
    koto: [[0, 0, 1], [3, 2, 1], [7, 3, 1], [10, 2, 1], [14, 0, 1]],
    answer: [[1, 3, 1], [5, 2, 1], [9, 0, 2], [13, 2, 1]],
    bass: [[0, -10], [8, -8]], bell: [[6, 7], [14, 5]], air: [[2, -2, 4], [10, 0, 4]],
  },
  scene: {
    bpm: 48, beats: 16,
    koto: [[0, 0, 1.5], [4, 2, 1], [8, 3, 1.5], [12, 2, 2]],
    answer: [[1, 3, 1], [5, 2, 1], [9, 0, 2], [13, -2, 2]],
    bass: [[0, -5], [8, -3]], bell: [[3, 7], [11, 8]], air: [[4, 0, 4]],
  },
  finale: {
    bpm: 50, beats: 16, koto: LULLABY,
    answer: [[0, 0, 1], [2, 3, 1], [4, 5, 2], [8, 4, 1], [10, 3, 1], [12, 2, 1], [14, 5, 2]],
    bass: [[0, -10], [4, -8], [8, -5], [12, -3]], bell: [[7, 9], [15, 10]], air: [[2, 0, 5], [10, 3, 5]],
  },
}

const STORAGE = {
  mute: 'hitsugi_audio',
  master: 'hitsugi_audio_vol',
  music: 'hitsugi_audio_music',
  effects: 'hitsugi_audio_sfx',
  ambience: 'hitsugi_audio_ambience',
  calm: 'hitsugi_audio_calm',
} as const

function safeGet(key: string): string | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(key) } catch { return null }
}

function safeSet(key: string, value: string): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value) } catch { /* 音設定の保存不能でゲームを止めない */ }
}

function storedVolume(key: string, fallback: number): number {
  const parsed = Number.parseFloat(safeGet(key) ?? '')
  return Number.isFinite(parsed) ? clampUnit(parsed, fallback) : fallback
}

export interface AudioDebugSnapshot {
  desiredTrack: TrackName
  activeTrack: TrackName
  desiredAmbience: AmbienceKind
  contextState: AudioContextState | 'uncreated'
  musicTimers: number
  ambienceTimers: number
  unlocked: boolean
  muted: boolean
  calm: boolean
  mix: AudioMix
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicVolumeNode: GainNode | null = null
  private musicDuckNode: GainNode | null = null
  private effectsBus: GainNode | null = null
  private ambienceBus: GainNode | null = null
  private reverb: ConvolverNode | null = null
  private reverbReturn: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null

  private desiredTrack: TrackName = 'none'
  private activeTrack: TrackName = 'none'
  private activeTrackGain: GainNode | null = null
  private musicTimer: number | null = null
  private nextLoopAt = 0
  private phraseIndex = 0
  private _tension = 0
  private founderId = 'hitsugi'

  private desiredAmbience: AmbienceKind = 'none'
  private ambienceTimers: number[] = []
  private activeAmbienceGain: GainNode | null = null
  private _muted: boolean
  private _calm: boolean
  private mix: AudioMix
  private unlocked = false
  private hidden = false

  constructor() {
    this._muted = safeGet(STORAGE.mute) === 'muted'
    this._calm = safeGet(STORAGE.calm) === 'calm'
    this.mix = sanitizeMix({
      master: storedVolume(STORAGE.master, DEFAULT_AUDIO_MIX.master),
      music: storedVolume(STORAGE.music, DEFAULT_AUDIO_MIX.music),
      effects: storedVolume(STORAGE.effects, DEFAULT_AUDIO_MIX.effects),
      ambience: storedVolume(STORAGE.ambience, DEFAULT_AUDIO_MIX.ambience),
    })
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  get muted(): boolean { return this._muted }
  get calm(): boolean { return this._calm }
  get volume(): number { return this.mix.master }
  get musicVolume(): number { return this.mix.music }
  get effectsVolume(): number { return this.mix.effects }
  get ambienceVolume(): number { return this.mix.ambience }
  get currentTrackLabel(): string { return TRACK_LABELS[this.desiredTrack] }

  private effectiveMaster(): number { return this._muted ? 0 : this.mix.master }

  private smoothGain(node: GainNode | null, value: number, seconds = 0.035): void {
    if (!node || !this.ctx) return
    const now = this.ctx.currentTime
    node.gain.cancelScheduledValues(now)
    node.gain.setTargetAtTime(value, now, seconds)
  }

  setVolume(value: number): void { this.setBusVolume('master', value) }
  setMusicVolume(value: number): void { this.setBusVolume('music', value) }
  setEffectsVolume(value: number): void { this.setBusVolume('effects', value) }
  setAmbienceVolume(value: number): void { this.setBusVolume('ambience', value) }

  setBusVolume(bus: AudioBusName, value: number): void {
    this.mix = sanitizeMix({ ...this.mix, [bus]: value })
    safeSet(STORAGE[bus], String(this.mix[bus]))
    if (bus === 'master') this.smoothGain(this.master, this.effectiveMaster())
    if (bus === 'music') this.smoothGain(this.musicVolumeNode, this.mix.music)
    if (bus === 'effects') this.smoothGain(this.effectsBus, this.mix.effects)
    if (bus === 'ambience') this.smoothGain(this.ambienceBus, this.mix.ambience)
  }

  toggleMute(): boolean {
    this._muted = !this._muted
    safeSet(STORAGE.mute, this._muted ? 'muted' : 'on')
    this.smoothGain(this.master, this.effectiveMaster(), 0.025)
    if (this._muted) {
      this.stopMusicScheduler(true)
      this.clearAmbienceTimers()
    } else {
      void this.unlock()
    }
    return this._muted
  }

  toggleCalm(): boolean {
    this._calm = !this._calm
    safeSet(STORAGE.calm, this._calm ? 'calm' : 'dynamic')
    return this._calm
  }

  setLineage(founderId: string | undefined): void {
    this.founderId = founderId || 'hitsugi'
  }

  async unlock(): Promise<boolean> {
    if (this._muted || this.hidden) return false
    try {
      const ctx = this.ensureGraph()
      this.unlocked = true
      if (ctx.state === 'suspended') await ctx.resume()
      this.syncDesiredState()
      return ctx.state === 'running'
    } catch {
      return false
    }
  }

  private ensureGraph(): AudioContext {
    if (this.ctx) return this.ctx
    const ctx = new AudioContext()
    this.ctx = ctx

    const master = ctx.createGain()
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -14
    compressor.knee.value = 18
    compressor.ratio.value = 8
    compressor.attack.value = 0.004
    compressor.release.value = 0.22
    master.gain.value = this.effectiveMaster()
    master.connect(compressor).connect(ctx.destination)
    this.master = master

    this.musicDuckNode = ctx.createGain()
    this.musicDuckNode.gain.value = 1
    this.musicVolumeNode = ctx.createGain()
    this.musicVolumeNode.gain.value = this.mix.music
    this.musicDuckNode.connect(this.musicVolumeNode).connect(master)

    this.effectsBus = ctx.createGain()
    this.effectsBus.gain.value = this.mix.effects
    this.effectsBus.connect(master)
    this.ambienceBus = ctx.createGain()
    this.ambienceBus.gain.value = this.mix.ambience
    this.ambienceBus.connect(master)

    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.makeImpulse(1.9)
    this.reverbReturn = ctx.createGain()
    this.reverbReturn.gain.value = 0.16
    this.reverb.connect(this.reverbReturn).connect(this.musicDuckNode)
    this.noiseBuffer = this.makeNoise(7)
    return ctx
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  private makeImpulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!
    const buffer = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel)
      for (let i = 0; i < data.length; i++) {
        const envelope = Math.pow(1 - i / data.length, 2.6)
        data[i] = (Math.random() * 2 - 1) * envelope
      }
    }
    return buffer
  }

  private onVisibilityChange = (): void => {
    this.hidden = document.visibilityState === 'hidden'
    if (this.hidden) {
      this.stopMusicScheduler(true)
      this.clearAmbienceTimers()
      if (this.ctx?.state === 'running') void this.ctx.suspend().catch(() => undefined)
      return
    }
    if (!this._muted && this.unlocked && this.ctx) {
      void this.ctx.resume().then(() => this.syncDesiredState()).catch(() => undefined)
    }
  }

  private syncDesiredState(): void {
    if (!this.ctx || !this.unlocked || this._muted || this.hidden) return
    if (this.desiredTrack !== 'none' && this.activeTrack !== this.desiredTrack) this.switchTrack(this.desiredTrack)
    if (this.desiredAmbience !== 'none' && this.ambienceTimers.length === 0) this.startAmbienceLoop(this.desiredAmbience)
  }

  private connectMusicVoice(gain: GainNode): void {
    gain.connect(this.musicDuckNode!)
    gain.connect(this.reverb!)
  }

  // ---- 楽器 ----
  private pluck(freq: number, at: number, dur: number, vol: number, out: AudioNode, pan = 0): void {
    const ctx = this.ctx!
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(Math.max(0.0001, vol), at)
    envelope.gain.exponentialRampToValueAtTime(0.001, at + Math.max(dur, 0.72))
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'; lowpass.frequency.value = 2600
    const panner = ctx.createStereoPanner()
    panner.pan.value = Math.max(-0.5, Math.min(0.5, pan))
    const fundamental = ctx.createOscillator()
    fundamental.type = 'triangle'; fundamental.frequency.value = freq
    const overtone = ctx.createOscillator()
    overtone.type = 'sine'; overtone.frequency.value = freq * 2.004
    const overtoneGain = ctx.createGain(); overtoneGain.gain.value = 0.22
    fundamental.connect(envelope)
    overtone.connect(overtoneGain).connect(envelope)
    envelope.connect(lowpass).connect(panner).connect(out)
    fundamental.start(at); overtone.start(at)
    fundamental.stop(at + dur + 0.9); overtone.stop(at + dur + 0.9)
  }

  private bassTone(freq: number, at: number, dur: number, vol: number, out: AudioNode): void {
    const ctx = this.ctx!
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.linearRampToValueAtTime(vol, at + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.001, at + Math.max(0.2, dur))
    const oscillator = ctx.createOscillator()
    oscillator.type = 'sine'; oscillator.frequency.value = freq
    oscillator.connect(gain).connect(out)
    oscillator.start(at); oscillator.stop(at + dur + 0.2)
  }

  private taikoHit(at: number, accent: boolean, vol: number, out: AudioNode): void {
    const ctx = this.ctx!
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(Math.max(0.0001, vol * (accent ? 1.18 : 1)), at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.28)
    const oscillator = ctx.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(108, at)
    oscillator.frequency.exponentialRampToValueAtTime(42, at + 0.22)
    oscillator.connect(gain).connect(out)
    oscillator.start(at); oscillator.stop(at + 0.35)
    const source = ctx.createBufferSource()
    source.buffer = this.noiseBuffer!
    const noiseGain = ctx.createGain(); noiseGain.gain.value = vol * 0.12
    const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 900
    source.connect(lowpass).connect(noiseGain).connect(out)
    const maxOffset = Math.max(0, source.buffer.duration - 0.06)
    source.start(at, Math.random() * maxOffset, 0.05)
  }

  private bellTone(freq: number, at: number, vol: number, out: AudioNode): void {
    const ctx = this.ctx!
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(Math.max(0.0001, vol), at)
    gain.gain.exponentialRampToValueAtTime(0.001, at + 2.1)
    const carrier = ctx.createOscillator(); carrier.type = 'sine'; carrier.frequency.value = freq
    const mod = ctx.createOscillator(); mod.frequency.value = freq * 3.53
    const modGain = ctx.createGain(); modGain.gain.value = freq * 0.5
    mod.connect(modGain).connect(carrier.frequency)
    carrier.connect(gain).connect(out)
    carrier.start(at); mod.start(at); carrier.stop(at + 2.4); mod.stop(at + 2.4)
  }

  private airTone(freq: number, at: number, dur: number, vol: number, out: AudioNode): void {
    const ctx = this.ctx!
    const oscillator = ctx.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = freq
    const vibrato = ctx.createOscillator(); vibrato.frequency.value = 4.8
    const vibratoGain = ctx.createGain(); vibratoGain.gain.value = freq * 0.008
    vibrato.connect(vibratoGain).connect(oscillator.frequency)
    const toneGain = ctx.createGain()
    toneGain.gain.setValueAtTime(0.0001, at)
    toneGain.gain.linearRampToValueAtTime(vol, at + Math.min(0.6, dur * 0.3))
    toneGain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    oscillator.connect(toneGain).connect(out)
    oscillator.start(at); vibrato.start(at); oscillator.stop(at + dur); vibrato.stop(at + dur)
    this.noiseSwell(at, dur, vol * 0.28, 1500, out)
  }

  private noiseSwell(at: number, dur: number, vol: number, cutoff: number, out: AudioNode): void {
    const ctx = this.ctx!
    const source = ctx.createBufferSource(); source.buffer = this.noiseBuffer!
    const bandpass = ctx.createBiquadFilter(); bandpass.type = 'bandpass'; bandpass.frequency.value = cutoff; bandpass.Q.value = 0.7
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.linearRampToValueAtTime(vol, at + dur * 0.4)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    source.connect(bandpass).connect(gain).connect(out)
    source.start(at, Math.random() * Math.max(0, source.buffer.duration - dur), Math.min(dur, source.buffer.duration))
  }

  private drone(freq: number, at: number, dur: number, vol: number, out: AudioNode): void {
    const ctx = this.ctx!
    const oscillator = ctx.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = freq
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.linearRampToValueAtTime(vol, at + dur * 0.3)
    gain.gain.linearRampToValueAtTime(vol * 0.6, at + dur * 0.7)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.1
    const lfoGain = ctx.createGain(); lfoGain.gain.value = freq * 0.025
    lfo.connect(lfoGain).connect(oscillator.frequency)
    oscillator.connect(gain).connect(out)
    oscillator.start(at); lfo.start(at); oscillator.stop(at + dur + 0.2); lfo.stop(at + dur + 0.2)
  }

  // ---- 適応型シーケンサ ----
  play(track: TrackName, tension?: number): void {
    if (tension !== undefined) this.setTension(tension)
    if (track === this.desiredTrack) return
    this.desiredTrack = track
    if (!this.ctx || !this.unlocked || this._muted || this.hidden) return
    this.switchTrack(track)
  }

  setTension(value: number): void { this._tension = clampUnit(value) }

  private switchTrack(track: TrackName): void {
    const ctx = this.ctx!
    const previous = this.activeTrack
    const seconds = transitionSeconds(previous, track)
    this.stopMusicScheduler(false)
    const oldGain = this.activeTrackGain
    if (oldGain) {
      const now = ctx.currentTime
      oldGain.gain.cancelScheduledValues(now)
      oldGain.gain.setValueAtTime(Math.max(0.0001, oldGain.gain.value), now)
      oldGain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)
      window.setTimeout(() => { try { oldGain.disconnect() } catch { /* already detached */ } }, (seconds + 2.2) * 1000)
    }
    this.activeTrackGain = null
    this.activeTrack = track
    if (track === 'none') return

    const trackGain = ctx.createGain()
    trackGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    trackGain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + seconds)
    this.connectMusicVoice(trackGain)
    this.activeTrackGain = trackGain
    this.phraseIndex = 0
    this.nextLoopAt = ctx.currentTime + 0.08
    this.scheduleLoop()
    this.musicTimer = window.setInterval(() => this.scheduleLoop(), 420)
  }

  private stopMusicScheduler(disconnectActive: boolean): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer)
    this.musicTimer = null
    if (disconnectActive && this.activeTrackGain) {
      try { this.activeTrackGain.disconnect() } catch { /* already detached */ }
      this.activeTrackGain = null
      this.activeTrack = 'none'
    }
  }

  private keepNote(index: number, phrase: number, density: number): boolean {
    return ((index * 37 + phrase * 19 + 11) % 100) / 100 <= density
  }

  private scheduleLoop(): void {
    if (this.activeTrack === 'none' || !this.ctx || !this.activeTrackGain) return
    const pattern = PATTERNS[this.activeTrack]
    const trackOutput = this.activeTrackGain
    const tension = this._calm ? Math.min(this._tension, 0.48) : this._tension
    const secondsPerBeat = 60 / (pattern.bpm * (1 + tension * 0.08))
    const loopDuration = pattern.beats * secondsPerBeat
    if (this.nextLoopAt < this.ctx.currentTime) this.nextLoopAt = this.ctx.currentTime + 0.05

    while (this.nextLoopAt < this.ctx.currentTime + 1.1) {
      const base = this.nextLoopAt
      const phrase = this.phraseIndex++
      const arrangement = arrangementAt(this.activeTrack, phrase, tension)
      const melody = arrangement.shape === 'answer' ? (pattern.answer ?? pattern.koto) : pattern.koto
      const melodyDensity = arrangement.shape === 'breath' ? 0 : arrangement.melodyDensity
      for (let i = 0; i < melody.length; i++) {
        if (!this.keepNote(i, phrase, melodyDensity)) continue
        const [beat, degree, length] = melody[i]
        const humanize = ((((i + 1) * 13 + phrase * 7) % 17) - 8) / 1000
        const register = arrangement.shape === 'surge' && i % 4 === 3 ? 5 : 0
        this.pluck(deg(degree + register), base + beat * secondsPerBeat + humanize, length * secondsPerBeat, 0.19, trackOutput, ((i % 5) - 2) * 0.12)
      }

      const bass = arrangement.shape === 'breath' ? (pattern.bass ?? []).slice(0, 1) : (pattern.bass ?? [])
      for (const [beat, degree] of bass) this.bassTone(deg(degree), base + beat * secondsPerBeat, 2 * secondsPerBeat, 0.13, trackOutput)

      const percussionGain = arrangement.percussionGain * (this._calm ? 0.56 : 1)
      for (const beat of pattern.taiko ?? []) {
        if (percussionGain <= 0.05) continue
        this.taikoHit(base + beat * secondsPerBeat, beat % 4 === 0, 0.26 * percussionGain, trackOutput)
      }
      for (const [beat, degree] of pattern.bell ?? []) {
        if (arrangement.shape === 'surge' || (phrase + Math.floor(beat)) % 2 === 0) {
          this.bellTone(deg(degree), base + beat * secondsPerBeat, this._calm ? 0.055 : 0.075, trackOutput)
        }
      }
      if (arrangement.shape === 'opening' || arrangement.shape === 'breath') {
        for (const [beat, degree, length] of pattern.air ?? []) this.airTone(deg(degree), base + beat * secondsPerBeat, length * secondsPerBeat, 0.045, trackOutput)
      }
      if (arrangement.lineageMotif) {
        const motif = lineageMotifDegrees(this.founderId)
        motif.forEach((degree, index) => this.pluck(deg(degree + (this.activeTrack === 'battle' || this.activeTrack === 'boss' ? 5 : 0)), base + (2 + index * 1.25) * secondsPerBeat, 0.7 * secondsPerBeat, 0.23, trackOutput, (index - 1) * 0.18))
      }
      if (tension > 0.48 && arrangement.shape !== 'breath') {
        const pulse = (tension - 0.48) / 0.52
        for (let beat = 1; beat < pattern.beats; beat += 2) this.taikoHit(base + beat * secondsPerBeat, false, (0.08 + pulse * 0.08) * (this._calm ? 0.5 : 1), trackOutput)
      }
      this.nextLoopAt = base + loopDuration
    }
  }

  private duckMusic(amount = 0.62, release = 0.55): void {
    if (!this.ctx || !this.musicDuckNode) return
    const now = this.ctx.currentTime
    const gain = this.musicDuckNode.gain
    gain.cancelScheduledValues(now)
    gain.setValueAtTime(Math.max(0.001, gain.value), now)
    gain.linearRampToValueAtTime(this._calm ? Math.max(amount, 0.76) : amount, now + 0.04)
    gain.exponentialRampToValueAtTime(1, now + release)
  }

  // ---- 地域アンビエンス ----
  startAmbience(kind: AmbienceKind): void {
    this.desiredAmbience = kind
    this.clearAmbienceTimers()
    if (kind === 'none' || this._muted || this.hidden || !this.unlocked) return
    this.ensureGraph()
    this.startAmbienceLoop(kind)
  }

  stopAmbience(): void {
    this.desiredAmbience = 'none'
    this.clearAmbienceTimers()
  }

  private startAmbienceLoop(kind: Exclude<AmbienceKind, 'none'>): void {
    if (!this.ctx || !this.ambienceBus || this.ambienceTimers.length > 0) return
    const sceneGain = this.ctx.createGain()
    sceneGain.gain.setValueAtTime(0.0001, this.ctx.currentTime)
    sceneGain.gain.exponentialRampToValueAtTime(1, this.ctx.currentTime + 0.32)
    sceneGain.connect(this.ambienceBus)
    this.activeAmbienceGain = sceneGain
    const intervalMs: Record<Exclude<AmbienceKind, 'none'>, number> = { forest: 1500, zaka: 2300, tani: 3100, miyama: 4700 }
    const tick = (): void => this.ambienceTick(kind)
    tick()
    this.ambienceTimers.push(window.setInterval(tick, intervalMs[kind]))
  }

  private clearAmbienceTimers(): void {
    for (const timer of this.ambienceTimers) window.clearInterval(timer)
    this.ambienceTimers = []
    const oldGain = this.activeAmbienceGain
    this.activeAmbienceGain = null
    if (oldGain && this.ctx) {
      const now = this.ctx.currentTime
      oldGain.gain.cancelScheduledValues(now)
      oldGain.gain.setValueAtTime(Math.max(0.0001, oldGain.gain.value), now)
      oldGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)
      window.setTimeout(() => { try { oldGain.disconnect() } catch { /* already detached */ } }, 700)
    }
  }

  private ambienceTick(kind: Exclude<AmbienceKind, 'none'>): void {
    if (this._muted || !this.ctx || !this.activeAmbienceGain) return
    const out = this.activeAmbienceGain
    const at = this.ctx.currentTime + 0.02
    switch (kind) {
      case 'forest':
        if (Math.random() < 0.68) this.pluck(deg(9 + Math.floor(Math.random() * 3)), at + Math.random() * 0.6, 0.15, 0.032, out, Math.random() - 0.5)
        break
      case 'zaka':
        if (Math.random() < 0.32) this.bellTone(deg(10), at + Math.random() * 0.8, 0.032, out)
        if (Math.random() < 0.58) this.noiseSwell(at + Math.random(), 1.6 + Math.random(), 0.022, 900, out)
        break
      case 'tani':
        this.drone(deg(-14) + (Math.random() - 0.5) * 3, at, 3.6, 0.032, out)
        break
      case 'miyama':
        if (Math.random() < 0.48) this.drone(deg(-19), at, 6.5, 0.022, out)
        break
    }
  }

  // ---- 意味SE ----
  se(kind: 'hit' | 'heal' | 'ko' | 'chain' | 'win' | 'click' | 'treasure' | 'birth' | 'death'
    | 'footstep' | 'encounter' | 'slot' | 'forge' | 'lore'
    | 'page' | 'confirm' | 'cancel' | 'error' | 'tab'
    | 'critHit' | 'weakHit'): void {
    if (this._muted || this.hidden) return
    const ctx = this.ensureGraph()
    this.unlocked = true
    if (ctx.state === 'suspended') void ctx.resume().then(() => this.syncDesiredState()).catch(() => undefined)
    else this.syncDesiredState()
    const out = this.effectsBus!
    const at = ctx.currentTime
    if (!['click', 'page', 'tab', 'footstep'].includes(kind)) this.duckMusic(kind === 'death' ? 0.48 : 0.64, kind === 'death' ? 1.1 : 0.55)
    switch (kind) {
      case 'hit': this.taikoHit(at, false, 0.34, out); break
      case 'critHit': this.taikoHit(at, true, 0.56, out); this.pluck(deg(9), at + 0.02, 0.12, 0.28, out); break
      case 'weakHit': this.taikoHit(at, false, 0.33, out); this.bellTone(deg(11), at + 0.02, 0.1, out); break
      case 'chain': this.pluck(deg(5), at, 0.2, 0.3, out); this.pluck(deg(7), at + 0.07, 0.3, 0.3, out); break
      case 'heal': this.bellTone(deg(7), at, 0.16, out); break
      case 'ko': this.bassTone(55, at, 0.8, 0.2, out); this.taikoHit(at, true, 0.45, out); break
      case 'win': [0, 2, 3, 5].forEach((d, i) => this.pluck(deg(d), at + i * 0.12, i === 3 ? 1 : 0.4, 0.32, out, (i - 1.5) * 0.15)); break
      case 'click': this.pluck(deg(3), at, 0.08, 0.075, out); break
      case 'treasure': this.bellTone(deg(8), at, 0.18, out); this.bellTone(deg(10), at + 0.15, 0.15, out); break
      case 'birth': [5, 7, 9].forEach((d, i) => this.bellTone(deg(d), at + i * 0.3, 0.18 + i * 0.02, out)); break
      case 'death': this.bellTone(deg(0), at, 0.2, out); this.bassTone(deg(-10), at + 0.2, 2.5, 0.17, out); break
      case 'footstep': this.taikoHit(at, false, 0.035, out); break
      case 'encounter': this.pluck(deg(2), at, 0.1, 0.24, out); this.pluck(deg(5), at + 0.05, 0.15, 0.27, out); this.taikoHit(at + 0.16, false, 0.2, out); break
      case 'slot': [0, 2, 4].forEach((d, i) => this.pluck(deg(d), at + i * 0.06, i === 2 ? 0.1 : 0.06, 0.2 + i * 0.025, out)); break
      case 'forge': this.taikoHit(at, true, 0.32, out); this.bellTone(deg(9), at, 0.08, out); this.taikoHit(at + 0.18, true, 0.35, out); this.bellTone(deg(11), at + 0.18, 0.09, out); break
      case 'lore': [3, 5, 7].forEach((d, i) => this.bellTone(deg(d), at + i * 0.35, 0.16, out)); break
      case 'page': this.pluck(deg(1), at, 0.05, 0.05, out); break
      case 'confirm': this.pluck(deg(0), at, 0.1, 0.15, out); this.bellTone(deg(4), at + 0.05, 0.08, out); break
      case 'cancel': this.pluck(deg(4), at, 0.08, 0.12, out); this.pluck(deg(2), at + 0.05, 0.12, 0.1, out); break
      case 'error': this.bassTone(deg(-7), at, 0.14, 0.12, out); this.bassTone(deg(-7), at + 0.09, 0.14, 0.12, out); break
      case 'tab': this.bellTone(deg(6), at, 0.07, out); break
    }
  }

  debugSnapshot(): AudioDebugSnapshot {
    return {
      desiredTrack: this.desiredTrack,
      activeTrack: this.activeTrack,
      desiredAmbience: this.desiredAmbience,
      contextState: this.ctx?.state ?? 'uncreated',
      musicTimers: this.musicTimer === null ? 0 : 1,
      ambienceTimers: this.ambienceTimers.length,
      unlocked: this.unlocked,
      muted: this._muted,
      calm: this._calm,
      mix: { ...this.mix },
    }
  }
}

export const audio = new AudioEngine()

let detachUiAudio: (() => void) | null = null

// 全buttonの操作音はこのdelegate 1本だけ。pointer/keyboardでAudioContextも安全に解錠する。
export function attachUiClickSfx(): () => void {
  if (typeof document === 'undefined') return () => undefined
  if (detachUiAudio) return detachUiAudio
  const unlock = (): void => { void audio.unlock() }
  const click = (event: MouseEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLElement>('button, .cmd-btn')
    if (!button || button.dataset.uiSfx === 'none') return
    if ((button as HTMLButtonElement).disabled || button.getAttribute('aria-disabled') === 'true') { audio.se('error'); return }
    const className = button.className || ''
    if (className.includes('filter-tab') || className.includes('elem-chip') || className.includes('codex-tab') || className.includes('cmd-ghost')) { audio.se('tab'); return }
    if (className.includes('btn-main') || className.includes('cmd-main')) { audio.se('confirm'); return }
    const label = (button.textContent ?? '').trim()
    if (className.includes('btn-ghost') || /^(戻る|やめる|閉じる|題目へ|ホーム|中断)/.test(label)) { audio.se('cancel'); return }
    audio.se('page')
  }
  document.addEventListener('pointerdown', unlock, { capture: true, once: true })
  document.addEventListener('keydown', unlock, { capture: true, once: true })
  document.addEventListener('click', click, true)
  detachUiAudio = () => {
    document.removeEventListener('pointerdown', unlock, true)
    document.removeEventListener('keydown', unlock, true)
    document.removeEventListener('click', click, true)
    detachUiAudio = null
  }
  return detachUiAudio
}
