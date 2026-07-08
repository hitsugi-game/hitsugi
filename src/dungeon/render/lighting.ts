// 照明システム(品質刷新v3.1 M7a の中核)
// 方式: 半解像度RenderTextureに「黒ベール→光源ごとにerase-blendで穴あけ」を毎フレーム描き、
//       1枚のSpriteとして最上層に合成する。暖色は world 側の加算グローが担う。
// プレイヤー松明の半径は灯ゲージ%に連動(100%≈5.5タイル→0%≈2タイル) — ゲージの視覚化。
// 低スペック向け simple モード: 穴あけRTを使わず、加算グローのみで雰囲気を残す。
import { Container, Graphics, RenderTexture, Sprite } from 'pixi.js'
import type { Renderer } from 'pixi.js'
import { lightTexture } from './textures'
import type { DungeonTheme } from './theme'

export type LightMode = 'rt' | 'simple'

// 全灯モード(視認性優先) — マップ全体を常に見せる薄い環境ベールに固定する。
// テーマの veilAlpha(0.8前後の暗黒)は用いない。灯ゲージのゲーム性(消灯で敵狂暴化・帰り火)は
// engine 側の別ロジックなので不変 — ここで変えるのは視覚の明るさだけ。
const FLOOD_AMBIENT = 0.1 // 灯100%時の全画面の翳り(ほぼ全灯)
const FLOOD_DRAIN_MAX = 0.16 // 灯0%でもこの濃さまで(暗くしすぎず、帰り火の切迫だけ残す)

interface LightSource {
  id: string
  wx: number // ワールドpx(中心)
  wy: number
  radius: number // ワールドpx
  tint: number
  flickerAmp: number // 0=不動, 1=焚火級
  pulse: number // ゆっくり脈動の振幅(祠/ボス)
  dimFactor: number // markUsed後の減光(1=通常)
  hole: Sprite
  glow: Sprite
  f: number // 現在の揺らぎ値(-1..1)
  fTarget: number
}

export class LightingSystem {
  private renderer: Renderer
  private theme: DungeonTheme
  private tile: number
  private mode: LightMode

  private rt: RenderTexture
  private scene = new Container() // ステージには載せない(RTへの描画専用)
  private veil = new Graphics()
  private out: Sprite
  private glowLayer: Container

  private lights = new Map<string, LightSource>()
  private player: LightSource
  private lightPct = 100
  private flickerT = 0
  private time = 0

  // 虹彩暗転(エンカウント演出用): 1→0 で松明が閉じ、ベールが閉じる
  private irisK = 1
  private irisTarget = 1
  private irisSpeed = 0 // 1msあたりの変化量
  private irisDone: (() => void) | null = null

  constructor(
    renderer: Renderer,
    screenLayer: Container,
    glowLayer: Container,
    theme: DungeonTheme,
    tile: number,
    mode: LightMode = 'rt',
  ) {
    this.renderer = renderer
    this.theme = theme
    this.tile = tile
    this.mode = mode
    this.glowLayer = glowLayer

    const w2 = Math.max(2, Math.ceil(renderer.width / 2))
    const h2 = Math.max(2, Math.ceil(renderer.height / 2))
    this.rt = RenderTexture.create({ width: w2, height: h2 })
    this.veil.rect(0, 0, w2, h2).fill(0x000000)
    this.veil.alpha = FLOOD_AMBIENT // 全灯: テーマの暗黒veilAlphaは使わない(初フレームの暗転防止)
    this.scene.addChild(this.veil)

    this.out = new Sprite(this.rt)
    this.out.scale.set(2)
    if (mode === 'simple') this.out.visible = false
    screenLayer.addChild(this.out)

    this.player = this.makeSource('player', 0, 0, this.tile * 5.5, theme.torchTint, 0.6, 0)
  }

  private makeSource(
    id: string,
    wx: number,
    wy: number,
    radius: number,
    tint: number,
    flickerAmp: number,
    pulse: number,
  ): LightSource {
    const hole = new Sprite(lightTexture())
    hole.anchor.set(0.5)
    hole.blendMode = 'erase'
    this.scene.addChild(hole)
    const glow = new Sprite(lightTexture())
    glow.anchor.set(0.5)
    glow.blendMode = 'add'
    glow.tint = tint
    glow.alpha = 0.16
    this.glowLayer.addChild(glow)
    const src: LightSource = { id, wx, wy, radius, tint, flickerAmp, pulse, dimFactor: 1, hole, glow, f: 0, fTarget: 0 }
    return src
  }

  // 定置光の登録(焚火/提灯柱/祠/ボス等)。radiusはタイル単位で受ける。
  addStatic(
    id: string,
    tx: number,
    ty: number,
    opts: { radiusTiles: number; tint?: number; flicker?: number; pulse?: number },
  ): void {
    if (this.lights.has(id)) return
    const src = this.makeSource(
      id,
      tx * this.tile + this.tile / 2,
      ty * this.tile + this.tile / 2,
      opts.radiusTiles * this.tile,
      opts.tint ?? this.theme.lanternTint,
      opts.flicker ?? 0.4,
      opts.pulse ?? 0,
    )
    this.lights.set(id, src)
  }

  // 使用済みの焚火・祠を残り火に
  dim(id: string, factor = 0.4): void {
    const s = this.lights.get(id)
    if (s) s.dimFactor = factor
  }

  setPlayerPos(wx: number, wy: number): void {
    this.player.wx = wx
    this.player.wy = wy
  }

  // 熱狂の赤い火などで松明の色味を切り替える
  setPlayerTint(tint: number): void {
    this.player.tint = tint
    this.player.glow.tint = tint
  }

  setLightPct(pct: number): void {
    this.lightPct = Math.max(0, Math.min(100, pct))
  }

  // 虹彩暗転を開始(エンカウント遷移)。逆再生(開く)は open=true。
  startIris(durMs: number, onDone?: () => void, open = false): void {
    this.irisTarget = open ? 1 : 0
    this.irisSpeed = 1 / Math.max(60, durMs)
    this.irisDone = onDone ?? null
  }

  update(dms: number, worldX: number, worldY: number): void {
    this.time += dms

    // 虹彩の進行
    if (this.irisK !== this.irisTarget) {
      const dir = Math.sign(this.irisTarget - this.irisK)
      this.irisK = Math.max(0, Math.min(1, this.irisK + dir * this.irisSpeed * dms))
      if (this.irisK === this.irisTarget && this.irisDone) {
        const cb = this.irisDone
        this.irisDone = null
        cb()
      }
    }

    // 揺らぎの目標値更新(約14Hz)
    this.flickerT += dms
    const retarget = this.flickerT >= 70
    if (retarget) this.flickerT = 0

    // ベール: 全灯モード。薄い環境光に固定し、灯が細るとほんの少し翳る(帰り火の切迫のみ残す)。
    // 虹彩暗転(エンカウント遷移)は irisK で従来どおり全黒まで閉じる。
    const drain = (1 - this.lightPct / 100) * (FLOOD_DRAIN_MAX - FLOOD_AMBIENT)
    const veilA = FLOOD_AMBIENT + drain
    this.veil.alpha = veilA + (1 - veilA) * (1 - this.irisK)

    // プレイヤー松明: 半径=灯%連動(5.5→2タイル)×虹彩
    const pctK = Math.pow(this.lightPct / 100, 0.8)
    this.player.radius = this.tile * (2 + 3.5 * pctK) * this.irisK

    const all: LightSource[] = [this.player, ...this.lights.values()]
    for (const s of all) {
      if (retarget && s.flickerAmp > 0) s.fTarget = (Math.random() * 2 - 1) * s.flickerAmp
      s.f += (s.fTarget - s.f) * Math.min(1, dms / 90)
      const pulseK = s.pulse > 0 ? 1 + s.pulse * Math.sin(this.time / 700 + s.wx) : 1
      const k = (1 + s.f * 0.05) * pulseK * s.dimFactor
      const r = s.radius * k
      // erase穴(半解像度スクリーン空間)
      const sx = (s.wx + worldX) * 0.5
      const sy = (s.wy + worldY) * 0.5
      s.hole.position.set(sx, sy)
      s.hole.width = r // 半解像度なので直径(2r)の半分=r
      s.hole.height = r
      s.hole.alpha = Math.min(1, 0.92 + s.f * 0.08)
      s.hole.visible = this.mode === 'rt' && r > 1
      // 加算グロー(ワールド空間)
      s.glow.position.set(s.wx, s.wy)
      s.glow.width = r * 2.4
      s.glow.height = r * 2.4
      s.glow.alpha = (s === this.player ? 0.12 : 0.18) * k * this.irisK
    }

    if (this.mode === 'rt') {
      this.renderer.render({ container: this.scene, target: this.rt, clear: true })
    }
  }

  resize(): void {
    const w2 = Math.max(2, Math.ceil(this.renderer.width / 2))
    const h2 = Math.max(2, Math.ceil(this.renderer.height / 2))
    this.rt.resize(w2, h2)
    this.veil.clear().rect(0, 0, w2, h2).fill(0x000000)
  }

  destroy(): void {
    this.rt.destroy(true)
    this.scene.destroy({ children: true })
    // glowスプライトはglowLayer(world)側 — エンジンのworld破棄に委ねる
  }
}
