// 『灯継ぎ』音楽エンジン — Web Audio による和風プロシージャル演奏
// 全曲の芯は「汐里の子守唄」— 平調子(陰旋法)の旋律モチーフ

type TrackName = 'title' | 'home' | 'expedition' | 'battle' | 'boss' | 'scene' | 'none'

// A平調子: A3 を宮とする陰旋法
const HIRAJOSHI = [220.0, 246.94, 261.63, 329.63, 349.23] // A3 B3 C4 E4 F4
function deg(d: number): number {
  // 度数(0-4) + オクターブ超え対応
  const oct = Math.floor(d / 5)
  return HIRAJOSHI[((d % 5) + 5) % 5] * Math.pow(2, oct)
}

// 汐里の子守唄 — [拍, 度数, 長さ(拍)]
const LULLABY: [number, number, number][] = [
  [0, 0, 1], [1, 2, 1], [2, 3, 1.5], [3.5, 4, 0.5],
  [4, 3, 1], [5, 2, 1], [6, 0, 2],
  [8, 0, 1], [9, 2, 1], [10, 3, 1.5], [11.5, 5, 0.5],
  [12, 4, 1], [13, 3, 1], [14, 2, 2],
]

interface Pattern {
  bpm: number
  beats: number // ループ長
  koto?: [number, number, number][] // [拍, 度数, 長さ]
  bass?: [number, number][] // [拍, 度数] 低音
  taiko?: number[] // 太鼓の拍
  bell?: [number, number][] // 鈴 [拍, 度数]
}

const PATTERNS: Record<Exclude<TrackName, 'none'>, Pattern> = {
  title: {
    bpm: 56, beats: 16,
    koto: LULLABY,
    bass: [[0, -5], [4, -3], [8, -5], [12, -2]],
  },
  home: {
    bpm: 64, beats: 16,
    koto: [
      [0, 0, 1], [1.5, 2, 0.5], [2, 3, 1], [4, 2, 1], [6, 0, 1],
      [8, 3, 1], [9.5, 4, 0.5], [10, 3, 1], [12, 2, 1], [14, 0, 1],
    ],
    bass: [[0, -5], [4, -5], [8, -3], [12, -5]],
    bell: [[3, 7], [11, 8]],
  },
  expedition: {
    bpm: 72, beats: 16,
    koto: [[0, 0, 0.5], [3, 1, 0.5], [6, 0, 0.5], [10, 2, 1], [13, 1, 0.5]],
    bass: [[0, -10], [8, -9]],
    taiko: [0, 5.5, 8, 13.5],
  },
  battle: {
    bpm: 132, beats: 8,
    koto: [
      [0, 3, 0.5], [0.5, 2, 0.5], [1, 3, 0.5], [2, 5, 0.5],
      [3, 4, 0.5], [4, 3, 0.5], [5, 2, 0.5], [6, 0, 1],
    ],
    bass: [[0, -5], [2, -5], [4, -3], [6, -5]],
    taiko: [0, 1, 2.5, 4, 5, 6.5],
  },
  boss: {
    bpm: 140, beats: 8,
    koto: [
      [0, 0, 0.5], [0.75, 1, 0.25], [1, 2, 0.5], [2, 1, 0.5],
      [3, 0, 0.5], [4, 2, 0.5], [4.75, 3, 0.25], [5, 4, 0.5], [6, 1, 1],
    ],
    bass: [[0, -10], [1.5, -10], [3, -9], [4.5, -10], [6, -8]],
    taiko: [0, 0.75, 1.5, 3, 3.75, 4.5, 6, 7],
  },
  scene: {
    bpm: 50, beats: 16,
    bell: LULLABY.map(([t, d]) => [t, d + 5] as [number, number]),
    bass: [[0, -5], [8, -3]],
  },
}

const STORAGE_KEY = 'hitsugi_audio'

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private track: TrackName = 'none'
  private timer: number | null = null
  private nextLoopAt = 0
  private _muted: boolean

  constructor() {
    this._muted = localStorage.getItem(STORAGE_KEY) === 'muted'
  }

  get muted(): boolean {
    return this._muted
  }

  toggleMute(): boolean {
    this._muted = !this._muted
    localStorage.setItem(STORAGE_KEY, this._muted ? 'muted' : 'on')
    if (this.master) this.master.gain.value = this._muted ? 0 : 0.5
    return this._muted
  }

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = this._muted ? 0 : 0.5
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  // ---- 楽器 ----
  private pluck(freq: number, at: number, dur: number, vol = 0.5): void {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, at)
    g.gain.exponentialRampToValueAtTime(0.001, at + Math.max(dur, 0.8))
    const o1 = ctx.createOscillator()
    o1.type = 'triangle'
    o1.frequency.value = freq
    const o2 = ctx.createOscillator()
    o2.type = 'sine'
    o2.frequency.value = freq * 2.004 // わずかにズレた倍音 = 箏の艶
    const g2 = ctx.createGain()
    g2.gain.value = 0.25
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2800
    o1.connect(g)
    o2.connect(g2).connect(g)
    g.connect(lp).connect(this.master!)
    o1.start(at); o2.start(at)
    o1.stop(at + dur + 1); o2.stop(at + dur + 1)
  }

  private bassTone(freq: number, at: number, dur: number): void {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(0.22, at + 0.08)
    g.gain.exponentialRampToValueAtTime(0.001, at + dur)
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq
    o.connect(g).connect(this.master!)
    o.start(at); o.stop(at + dur + 0.2)
  }

  private taikoHit(at: number, accent = false): void {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(accent ? 0.7 : 0.45, at)
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.28)
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(110, at)
    o.frequency.exponentialRampToValueAtTime(42, at + 0.22)
    o.connect(g).connect(this.master!)
    o.start(at); o.stop(at + 0.35)
    // 皮の張り(ノイズ)
    const len = ctx.sampleRate * 0.05
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const ng = ctx.createGain()
    ng.gain.value = accent ? 0.24 : 0.14
    src.connect(ng).connect(this.master!)
    src.start(at)
  }

  private bellTone(freq: number, at: number, vol = 0.3): void {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, at)
    g.gain.exponentialRampToValueAtTime(0.001, at + 2.2)
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq
    const mod = ctx.createOscillator()
    mod.frequency.value = freq * 3.53
    const mg = ctx.createGain()
    mg.gain.value = freq * 0.6
    mod.connect(mg).connect(o.frequency)
    o.connect(g).connect(this.master!)
    o.start(at); mod.start(at)
    o.stop(at + 2.5); mod.stop(at + 2.5)
  }

  // ---- シーケンサ ----
  play(track: TrackName): void {
    if (track === this.track) return
    this.track = track
    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    if (track === 'none') return
    const ctx = this.ensure()
    this.nextLoopAt = ctx.currentTime + 0.08
    this.scheduleLoop()
    this.timer = window.setInterval(() => this.scheduleLoop(), 500)
  }

  private scheduleLoop(): void {
    if (this.track === 'none' || !this.ctx) return
    const p = PATTERNS[this.track]
    const spb = 60 / p.bpm
    const loopDur = p.beats * spb
    // サスペンド復帰などで過去に取り残されたら現在へ早送り(音の洪水を防ぐ)
    if (this.nextLoopAt < this.ctx.currentTime) {
      this.nextLoopAt = this.ctx.currentTime + 0.05
    }
    // 先読み: ループ開始が1.2秒以内に迫っていたら次ループを予約
    while (this.nextLoopAt < this.ctx.currentTime + 1.2) {
      const base = this.nextLoopAt
      for (const [t, d, len] of p.koto ?? []) this.pluck(deg(d), base + t * spb, len * spb, 0.4)
      for (const [t, d] of p.bass ?? []) this.bassTone(deg(d), base + t * spb, 2 * spb)
      for (const t of p.taiko ?? []) this.taikoHit(base + t * spb, t % 4 === 0)
      for (const [t, d] of p.bell ?? []) this.bellTone(deg(d), base + t * spb)
      this.nextLoopAt = base + loopDur
    }
  }

  // ---- 効果音 ----
  se(kind: 'hit' | 'heal' | 'ko' | 'chain' | 'win' | 'click' | 'treasure' | 'birth' | 'death'): void {
    if (this._muted) return
    const ctx = this.ensure()
    const at = ctx.currentTime
    switch (kind) {
      case 'hit':
        this.taikoHit(at, false)
        break
      case 'chain':
        this.pluck(deg(5), at, 0.2, 0.5)
        this.pluck(deg(7), at + 0.07, 0.3, 0.5)
        break
      case 'heal':
        this.bellTone(deg(7), at, 0.25)
        break
      case 'ko':
        this.bassTone(55, at, 0.8)
        this.taikoHit(at, true)
        break
      case 'win':
        this.pluck(deg(0), at, 0.4, 0.5)
        this.pluck(deg(2), at + 0.12, 0.4, 0.5)
        this.pluck(deg(3), at + 0.24, 0.6, 0.5)
        this.pluck(deg(5), at + 0.36, 1.0, 0.55)
        break
      case 'click':
        this.pluck(deg(3), at, 0.08, 0.15)
        break
      case 'treasure':
        this.bellTone(deg(8), at, 0.3)
        this.bellTone(deg(10), at + 0.15, 0.25)
        break
      case 'birth':
        this.bellTone(deg(5), at, 0.3)
        this.bellTone(deg(7), at + 0.3, 0.3)
        this.bellTone(deg(9), at + 0.6, 0.35)
        break
      case 'death':
        this.bellTone(deg(0), at, 0.35)
        this.bassTone(deg(-10), at + 0.2, 2.5)
        break
    }
  }
}

export const audio = new AudioEngine()
export type { TrackName }
