// M23(指示6): 燈ノ郷の歩行マップ — 軽量Pixiエンジン。
// dungeon/engine.tsの生成/破棄・入力パターンを踏襲しつつ、照明RT・敵影・灯ゲージは持たない。
// 歩くことを強制ロードにしない: 施設への即時移動(すぐ行く)はVillage.tsx側のバーが担い、
// 本エンジンは「世界観を味わう経路」を提供する(POLISH_FIX §5)。
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'

export const V_TILE = 46

// M26 §6.2/§6.5: 郷の追従カメラ。主人公スプライトの world 高さは V_TILE*1.15。
// zoom をこの範囲にクランプすると、主人公の表示高が常に 56〜88px(§6.5受入)に収まり、
// かつ横タイル目標(PC 15 / モバイル 9)も満たせる — narrowな受入帯を両立させる要。
const V_PLAYER_H = V_TILE * 1.15
const V_CAM_MIN = 56 / V_PLAYER_H // ≈1.06
const V_CAM_MAX = 88 / V_PLAYER_H // ≈1.66

// マップが view より大きい軸は端を見せないようクランプ、小さい軸は中央寄せ(§6.2「world外の空白を見せない」)
function vClampAxis(world: number, view: number, mapLen: number): number {
  if (mapLen <= view) return (view - mapLen) / 2
  return Math.max(view - mapLen, Math.min(0, world))
}

// 22×11。#=壁 K=鍛冶と蔵 S=星契りの祠 T=豆腐屋 G=出立門 L=大燈籠 ~=池 .=地面
const MAP = [
  '######################',
  '#.........SS.........#',
  '#..KK.....SS......TT.#',
  '#..KK.............TT.#',
  '#....................#',
  '#..........L.........#',
  '#..~~................#',
  '#..~~................#',
  '#....................#',
  '#.........GG.........#',
  '######################',
]
const ROWS = MAP.length
const COLS = MAP[0].length

// 施設文字→行き先(talk=会話のみの建物)
const FACILITY: Record<string, { kind: VillageFocusKind; label: string }> = {
  K: { kind: 'forge', label: '鍛冶と蔵' },
  S: { kind: 'pact', label: '星契りの祠' },
  T: { kind: 'talk-tane', label: '豆腐屋' },
  G: { kind: 'depart', label: '出立門' },
  L: { kind: 'lantern', label: '大燈籠' },
}

export type VillageFocusKind = 'forge' | 'pact' | 'depart' | 'talk-tane' | 'lantern' | 'npc' | 'kin'

// Tier1「生きた郷」: 手置きプロップの種類(直立=mid / 平面=gDecal)
type PropKind = 'stone_lantern' | 'well' | 'crate' | 'chochin' | 'fence' | 'plant' | 'hut'

export interface VillageFocus {
  kind: VillageFocusKind
  id?: string // npc/kin のとき対象id
  label: string // 「鉄造(鍛冶の親方)」「出立門」など
  action: string // 「話す」「入る」「くぐる」「見上げる」
}

export interface VillageNpc {
  id: string
  name: string
  role: string
  x: number
  y: number
  imgUrl: string
  news: boolean // 新しい話がある(頭上印)
}

export interface VillageKin {
  id: string
  name: string
  spriteUrl: string | null // walk_*_down_1(段階込み)。nullなら灯影で描く
}

export interface VillageEngineOpts {
  leaderSpriteBase: string | null // 'walk_homura_f' 形式(段階込み接頭辞+灯型+性別)。nullなら灯影
  npcs: VillageNpc[]
  kin: VillageKin[] // 存命の家族(先頭=操作キャラは含めない)
  reduceMotion: boolean
}

export interface VillageEvents {
  onFocus: (f: VillageFocus | null) => void
}

const KIN_SPOTS: [number, number][] = [[8, 4], [14, 6], [6, 8], [16, 8], [13, 4]]

const isBlockedChar = (ch: string) => ch !== '.'
const tileAt = (x: number, y: number) => (y >= 0 && y < ROWS && x >= 0 && x < COLS ? MAP[y][x] : '#')

export class VillageEngine {
  private app = new Application()
  private world = new Container()
  private gGlow = new Container()
  private mid = new Container()
  // Tier1: 平面デカール(mid下=y-sort非参加で主人公を隠さない)・池グリント・煙(normal)・蛍/火の粉(add)
  private gDecal = new Container()
  private gWater = new Container()
  private waterG = new Graphics()
  private gSmoke = new Container()
  private gParticles = new Container()
  private destroyed = false
  private player!: Container
  private playerSprite: Sprite | null = null
  private textures: Record<'down' | 'up' | 'left', Texture[]> | null = null
  private px = 11.5 * V_TILE // ピクセル座標(足元)
  private py = 8.2 * V_TILE
  private keys = new Set<string>()
  private path: [number, number][] = [] // タップ移動の経由タイル
  private facing: 'down' | 'up' | 'left' | 'right' = 'down'
  private animT = 0
  private moving = false
  private focused: VillageFocus | null = null
  private time = 0
  // Tier1: 灯りは配列で個別呼吸。粒子/煙はプール(build時一括確保・tickでnew禁止=リーク対策)。池はアニメGraphics。
  private glows: { g: Graphics; base: number; period: number; phase: number; amp: number }[] = []
  private motes: { g: Graphics; cx: number; cy: number; phase: number; ampX: number; ampY: number; rise: number }[] = []
  private smokePuffs: { g: Graphics; cx: number; cy: number; offset: number; ttl: number; drift: number }[] = []
  private pond: [number, number][] = []
  private envT = 0
  private waterT = 0
  private zoom = 1 // 追従カメラのscale(V_CAM_MIN..V_CAM_MAX)
  private survey = false // 「見渡す」押下中は全景fit(§6.2)

  private host: HTMLDivElement
  private opts: VillageEngineOpts
  private events: VillageEvents

  constructor(host: HTMLDivElement, opts: VillageEngineOpts, events: VillageEvents) {
    this.host = host
    this.opts = opts
    this.events = events
  }

  async init(): Promise<void> {
    await this.app.init({ background: 0x0a0e1d, resizeTo: this.host, antialias: true })
    if (this.destroyed) return // init中に破棄された(dungeon engineと同じレース対策)
    this.host.appendChild(this.app.canvas)

    this.app.stage.addChild(this.world)
    // z順(bottom→top): 地面 → 平面デカール → 池グリント → mid(y-sort) → 煙(normal) → 灯り(add) → 蛍/火の粉(add)
    this.world.addChild(this.buildGround())
    this.world.addChild(this.gDecal)
    this.gWater.addChild(this.waterG)
    this.world.addChild(this.gWater)
    this.mid.sortableChildren = true
    this.world.addChild(this.mid)
    this.world.addChild(this.gSmoke)
    this.world.addChild(this.gGlow)
    this.world.addChild(this.gParticles)
    this.buildBuildings()
    this.buildProps()
    this.buildWater()
    this.buildParticles()
    this.buildSmoke()
    this.buildNpcs()
    this.buildKin()
    await this.buildPlayer()
    if (this.destroyed) return

    // タップ移動: 歩ける最寄りタイルへBFS(近接の対話はVillage.tsx側のボタン/Enterが担う)
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = { contains: () => true }
    this.app.stage.on('pointertap', (e) => {
      const p = this.world.toLocal(e.global)
      this.tapMove(Math.floor(p.x / V_TILE), Math.floor(p.y / V_TILE))
    })

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    this.app.ticker.add(this.tick)
    this.layout()
    this.app.renderer.on('resize', this.layout)
  }

  destroy(): void {
    this.destroyed = true
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    try {
      this.app.destroy(true, { children: true })
    } catch {
      // 二重破棄(StrictMode/HMR)は握りつぶす
    }
  }

  // D-pad(モバイル) — dungeonのpressDirと同型
  pressDir(dir: 'up' | 'down' | 'left' | 'right', down: boolean): void {
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir]
    if (down) this.keys.add(key)
    else this.keys.delete(key)
    if (down) this.path = []
  }

  getFocused(): VillageFocus | null {
    return this.focused
  }

  // 会話済みの頭上「話」印をその場で消す(滞在中の即時反映 — レビュー反映)
  markNewsCleared(id: string): void {
    const nodes = this.npcBadges.get(id)
    if (!nodes) return
    for (const n of nodes) n.destroy()
    this.npcBadges.delete(id)
  }

  // ---- 内部 ----

  private layout = () => {
    this.applyZoom()
    this.centerCamera(true)
  }

  // 追従scaleを算出(§6.2: PC 横15タイル / モバイル 横9タイル目安、主人公56-88pxへクランプ)
  private applyZoom(): void {
    const vw = this.app.screen.width
    const targetTilesX = vw < 640 ? 9 : 15
    const raw = vw / (targetTilesX * V_TILE)
    this.zoom = Math.max(V_CAM_MIN, Math.min(V_CAM_MAX, raw))
  }

  // 主人公追従(§6.2)。survey中は全景fitへ滑らかに移る。マップ端でworld外の空白を見せない。
  private centerCamera(snap = false): void {
    const vw = this.app.screen.width
    const vh = this.app.screen.height
    const mapW = COLS * V_TILE
    const mapH = ROWS * V_TILE
    const fit = Math.min(vw / mapW, vh / mapH)
    const targetScale = this.survey ? fit : this.zoom
    const lerp = snap || this.opts.reduceMotion ? 1 : 0.18
    const s = this.world.scale.x + (targetScale - this.world.scale.x) * lerp
    this.world.scale.set(s)
    const tx = this.survey
      ? (vw - mapW * s) / 2
      : vClampAxis(vw / 2 - this.px * s, vw, mapW * s)
    const ty = this.survey
      ? (vh - mapH * s) / 2
      : vClampAxis(vh / 2 - this.py * s, vh, mapH * s)
    if (snap) {
      this.world.x = tx
      this.world.y = ty
    } else {
      this.world.x += (tx - this.world.x) * lerp
      this.world.y += (ty - this.world.y) * lerp
    }
    // 受入計測用: 主人公の表示高 = V_PLAYER_H * scale。canvas内スプライトは外から測れないため公開する。
    // 精度を落とさず全桁公開する(モバイルはscaleがちょうど下限V_CAM_MIN=56/V_PLAYER_Hに張り付くため、
    // 丸めると主人公高が56pxを僅かに割る)。
    this.host.dataset.camScale = String(this.world.scale.x)
  }

  // 「見渡す」の押下/解放(§6.2)。押下中だけ全景、離すと追従へ戻る。
  setSurvey(on: boolean): void {
    this.survey = on
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key)
      this.path = []
      e.preventDefault()
    }
  }
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
  }

  private dirInput(): { dx: number; dy: number } {
    let dx = 0
    let dy = 0
    if (this.keys.has('ArrowUp') || this.keys.has('w')) dy -= 1
    if (this.keys.has('ArrowDown') || this.keys.has('s')) dy += 1
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) dx -= 1
    if (this.keys.has('ArrowRight') || this.keys.has('d')) dx += 1
    return { dx, dy }
  }

  private blockedAtPx(x: number, y: number): boolean {
    // 足元判定: 中心±幅で四隅を見る
    const half = V_TILE * 0.28
    for (const [ox, oy] of [[-half, -half * 0.5], [half, -half * 0.5], [-half, half * 0.4], [half, half * 0.4]]) {
      if (isBlockedChar(tileAt(Math.floor((x + ox) / V_TILE), Math.floor((y + oy) / V_TILE)))) return true
    }
    return false
  }

  private tapMove(tx: number, ty: number): void {
    // 目標が塞がっていれば隣接歩行タイルへ
    const targets: [number, number][] = []
    if (!isBlockedChar(tileAt(tx, ty))) targets.push([tx, ty])
    else {
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        if (!isBlockedChar(tileAt(tx + dx, ty + dy))) targets.push([tx + dx, ty + dy])
      }
    }
    if (targets.length === 0) return
    const sx = Math.floor(this.px / V_TILE)
    const sy = Math.floor(this.py / V_TILE)
    // BFS(22×11なので素朴でよい)
    const key = (x: number, y: number) => y * COLS + x
    const prev = new Map<number, number>()
    const queue: [number, number][] = [[sx, sy]]
    prev.set(key(sx, sy), -1)
    const goal = new Set(targets.map(([x, y]) => key(x, y)))
    let found = -1
    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!
      if (goal.has(key(cx, cy))) {
        found = key(cx, cy)
        break
      }
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = cx + dx
        const ny = cy + dy
        if (isBlockedChar(tileAt(nx, ny)) || prev.has(key(nx, ny))) continue
        prev.set(key(nx, ny), key(cx, cy))
        queue.push([nx, ny])
      }
    }
    if (found < 0) return
    const rev: [number, number][] = []
    let cur = found
    while (cur !== key(sx, sy)) {
      rev.push([cur % COLS, Math.floor(cur / COLS)])
      cur = prev.get(cur)!
    }
    this.path = rev.reverse()
    this.keys.clear()
  }

  private tick = () => {
    if (this.destroyed) return
    this.time += this.app.ticker.deltaMS
    const speed = 0.155 * this.app.ticker.deltaMS

    let { dx, dy } = this.dirInput()
    // タップ経路の追従
    if (dx === 0 && dy === 0 && this.path.length > 0) {
      const [tx, ty] = this.path[0]
      const cx = (tx + 0.5) * V_TILE
      const cy = (ty + 0.62) * V_TILE
      const ddx = cx - this.px
      const ddy = cy - this.py
      if (Math.abs(ddx) < 3 && Math.abs(ddy) < 3) this.path.shift()
      else {
        dx = Math.abs(ddx) > 2 ? Math.sign(ddx) : 0
        dy = Math.abs(ddy) > 2 ? Math.sign(ddy) : 0
      }
    }

    this.moving = dx !== 0 || dy !== 0
    if (this.moving) {
      const norm = dx !== 0 && dy !== 0 ? Math.SQRT1_2 : 1
      const nx = this.px + dx * speed * norm
      const ny = this.py + dy * speed * norm
      if (!this.blockedAtPx(nx, this.py)) this.px = nx
      if (!this.blockedAtPx(this.px, ny)) this.py = ny
      this.facing = dy > 0 ? 'down' : dy < 0 ? 'up' : dx < 0 ? 'left' : 'right'
      this.animT += this.app.ticker.deltaMS
    }
    this.updatePlayerSprite()
    this.centerCamera() // §6.2: 主人公を追う(survey中は全景へ寄る)

    // Tier1: 全ての灯りが個別位相で呼吸(reduceMotion時はbase固定)
    for (const gl of this.glows) {
      gl.g.alpha = this.opts.reduceMotion ? gl.base : gl.base + Math.sin(this.time / gl.period + gl.phase) * gl.amp
    }
    // 環境アニメ(蛍/火の粉/煙)は≤30Hz(モバイルは20Hz)へスロットル。位置はthis.timeの関数なので取りこぼしても正しい。
    // reduceMotion時は初期状態のまま一切触れない(静止)。
    if (!this.opts.reduceMotion) {
      this.envT += this.app.ticker.deltaMS
      if (this.envT >= (this.app.screen.width < 640 ? 50 : 33)) {
        this.envT = 0
        this.updateParticles()
        this.updateSmoke()
      }
      // 水面グリントは8Hz(少セルなので引き直しても安い)
      this.waterT += this.app.ticker.deltaMS
      if (this.waterT >= 125) {
        this.waterT = 0
        this.drawWater()
      }
    }

    this.updateFocus()
  }

  private updatePlayerSprite(): void {
    if (!this.player) return
    this.player.x = this.px
    this.player.y = this.py
    this.player.zIndex = this.py
    if (!this.playerSprite || !this.textures) return
    const dirKey = this.facing === 'right' ? 'left' : this.facing
    const frames = this.textures[dirKey]
    const frame = this.moving ? [1, 0, 1, 2][Math.floor(this.animT / 140) % 4] : 1
    this.playerSprite.texture = frames[frame] ?? frames[1]
    this.playerSprite.scale.x = (this.facing === 'right' ? -1 : 1) * Math.abs(this.playerSprite.scale.x)
    if (!this.opts.reduceMotion && !this.moving) {
      this.playerSprite.y = -V_TILE * 0.9 + Math.sin(this.time / 420) * 1.2 // 待機の呼吸
    } else {
      this.playerSprite.y = -V_TILE * 0.9
    }
  }

  private updateFocus(): void {
    const px = Math.floor(this.px / V_TILE)
    const py = Math.floor(this.py / V_TILE)
    let next: VillageFocus | null = null

    // 近接NPC(距離1.6タイル以内)を最優先
    let bestD = 1.6 * V_TILE
    for (const n of this.opts.npcs) {
      const d = Math.hypot((n.x + 0.5) * V_TILE - this.px, (n.y + 0.55) * V_TILE - this.py)
      if (d < bestD) {
        bestD = d
        next = { kind: 'npc', id: n.id, label: `${n.name}(${n.role})`, action: '話す' }
      }
    }
    if (!next) {
      for (let i = 0; i < this.kinNodes.length; i++) {
        const k = this.kinNodes[i]
        const d = Math.hypot(k.node.x - this.px, k.node.y - this.py)
        if (d < bestD) {
          bestD = d
          next = { kind: 'kin', id: k.id, label: k.name, action: '声をかける' }
        }
      }
    }
    // 隣接する施設タイル
    if (!next) {
      outer: for (const [dx, dy] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const ch = tileAt(px + dx, py + dy)
        const f = FACILITY[ch]
        if (f) {
          next = {
            kind: f.kind,
            label: f.label,
            action: f.kind === 'lantern' ? '見上げる' : f.kind === 'talk-tane' ? '覗く' : f.kind === 'depart' ? 'くぐる' : '入る',
          }
          break outer
        }
      }
    }

    const changed = (this.focused?.kind !== next?.kind) || (this.focused?.id !== next?.id)
    if (changed) {
      this.focused = next
      this.events.onFocus(next)
    }
  }

  // ---- 構築 ----

  private buildGround(): Graphics {
    const g = new Graphics()
    // 地面: 暗藍の土+タイルごとの揺らぎ。郷なのでダンジョンよりわずかに暖かい
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const ch = tileAt(x, y)
        if (ch === '#') {
          g.rect(x * V_TILE, y * V_TILE, V_TILE, V_TILE).fill(0x070a14)
          continue
        }
        const j = ((x * 31 + y * 17) % 7) - 3
        const base = 0x141833
        const c = base + j * 0x010102
        g.rect(x * V_TILE, y * V_TILE, V_TILE, V_TILE).fill(ch === '~' ? 0x0e1d33 : c)
        // 目地
        g.rect(x * V_TILE, y * V_TILE, V_TILE, 1).fill({ color: 0x0a0e1d, alpha: 0.5 })
      }
    }
    // 参道: 祠(11,3)→大燈籠→門を結ぶ石畳
    const pave = (x: number, y: number, w: number, h: number) => {
      g.roundRect(x * V_TILE + 4, y * V_TILE + 4, w * V_TILE - 8, h * V_TILE - 8, 6).fill({ color: 0x232741, alpha: 0.85 })
    }
    for (let y = 3; y <= 8; y++) pave(10.6, y, 0.9, 1)
    for (let x = 5; x <= 16; x++) pave(x, 4.55, 1, 0.9)
    // 池セルを収集(下地塗り 0x0e1d33 は上のループで済み。グリントのアニメは gWater/drawWater が担う)
    this.pond = MAP.flatMap((row, y) => [...row].map((ch, x) => (ch === '~' ? [x, y] : null)).filter(Boolean)) as [number, number][]
    return g
  }

  private buildBuildings(): void {
    const put = (node: Container, tx: number, ty: number) => {
      node.x = tx * V_TILE
      node.y = ty * V_TILE
      node.zIndex = node.y + V_TILE * 1.9
      this.mid.addChild(node)
    }
    // 鍛冶と蔵(西) — 低い母屋+炉の火
    const forge = new Graphics()
    forge.roundRect(0, V_TILE * 0.3, V_TILE * 2, V_TILE * 1.7, 4).fill(0x1a1420).stroke({ color: 0x3a3050, width: 1.5 })
    forge.poly([-6, V_TILE * 0.42, V_TILE, -V_TILE * 0.5, V_TILE * 2 + 6, V_TILE * 0.42]).fill(0x241c2e)
    forge.rect(V_TILE * 0.75, V_TILE * 1.2, V_TILE * 0.5, V_TILE * 0.8).fill(0x0a0810)
    forge.circle(V_TILE * 1.6, V_TILE * 1.55, 5).fill({ color: 0xff9d45, alpha: 0.9 })
    // Tier1: 灯った窓+軒の吊り提灯(bg_sato の温かみ)
    forge.rect(V_TILE * 0.28, V_TILE * 0.62, V_TILE * 0.34, V_TILE * 0.34).fill({ color: 0xffcf7a, alpha: 0.82 })
    forge.rect(V_TILE * 1.7, V_TILE * 0.02, 2, V_TILE * 0.22).fill(0x2e2018)
    forge.roundRect(V_TILE * 1.62, V_TILE * 0.22, V_TILE * 0.2, V_TILE * 0.28, 5).fill({ color: 0xff8c42, alpha: 0.9 })
    put(forge, 3, 2)
    this.glowAt(4.6, 3.55, 0xff9d45, 26, 0.35, { period: 700, amp: 0.16 })

    // 星契りの祠(北) — 鳥居+注連縄
    const shrine = new Graphics()
    shrine.rect(V_TILE * 0.14, -V_TILE * 0.9, 7, V_TILE * 1.9).fill(0x6a2f2a)
    shrine.rect(V_TILE * 1.66, -V_TILE * 0.9, 7, V_TILE * 1.9).fill(0x6a2f2a)
    shrine.rect(-6, -V_TILE * 0.98, V_TILE * 2 + 12, 9).fill(0x7a3630)
    shrine.rect(V_TILE * 0.08, -V_TILE * 0.7, V_TILE * 1.86, 6).fill(0x5a2622)
    shrine.moveTo(V_TILE * 0.2, -V_TILE * 0.55).quadraticCurveTo(V_TILE, -V_TILE * 0.3, V_TILE * 1.8, -V_TILE * 0.55)
      .stroke({ color: 0xd9c26a, width: 2, alpha: 0.8 })
    // Tier1: 鳥居中央に吊り提灯
    shrine.rect(V_TILE * 0.97, -V_TILE * 0.44, 2, V_TILE * 0.18).fill(0x2e2018)
    shrine.roundRect(V_TILE * 0.88, -V_TILE * 0.28, V_TILE * 0.22, V_TILE * 0.28, 6).fill({ color: 0xff8c42, alpha: 0.88 })
    put(shrine, 10, 2.9)
    this.glowAt(11, 2.2, 0x9b7fc2, 30, 0.3, { period: 1500, amp: 0.1 })

    // 豆腐屋(東) — 暖簾の小店
    const tofu = new Graphics()
    tofu.roundRect(0, V_TILE * 0.2, V_TILE * 2, V_TILE * 1.8, 4).fill(0x18142a).stroke({ color: 0x3a3050, width: 1.5 })
    tofu.poly([-5, V_TILE * 0.34, V_TILE, -V_TILE * 0.42, V_TILE * 2 + 5, V_TILE * 0.34]).fill(0x201a30)
    for (let i = 0; i < 3; i++) {
      tofu.rect(V_TILE * (0.3 + i * 0.5), V_TILE * 0.62, V_TILE * 0.4, V_TILE * 0.66).fill({ color: 0xe9e4d8, alpha: 0.85 })
    }
    // Tier1: 暖簾の上に灯った窓
    tofu.rect(V_TILE * 1.36, V_TILE * 0.3, V_TILE * 0.4, V_TILE * 0.24).fill({ color: 0xffcf7a, alpha: 0.8 })
    put(tofu, 17, 2)
    this.glowAt(18, 3.4, 0xffd9a0, 20, 0.25, { period: 1900, amp: 0.08 })

    // 出立門(南) — 大きな木戸
    const gate = new Graphics()
    gate.rect(0, -V_TILE * 1.1, 9, V_TILE * 2.1).fill(0x241a14)
    gate.rect(V_TILE * 2 - 9, -V_TILE * 1.1, 9, V_TILE * 2.1).fill(0x241a14)
    gate.rect(-8, -V_TILE * 1.22, V_TILE * 2 + 16, 10).fill(0x2e2018)
    gate.rect(-2, -V_TILE * 0.95, V_TILE * 2 + 4, 6).fill(0x1c1410)
    // Tier1: 門柱の門灯(出立門を暖かく)
    gate.circle(4.5, -V_TILE * 0.42, 4.5).fill({ color: 0xff8c42, alpha: 0.85 })
    gate.circle(V_TILE * 2 - 4.5, -V_TILE * 0.42, 4.5).fill({ color: 0xff8c42, alpha: 0.85 })
    put(gate, 10, 9)
    this.glowAt(11, 8.6, 0xff8c42, 22, 0.2, { period: 1600, amp: 0.08 })

    // 大燈籠(中央) — 郷の心臓
    const lantern = new Graphics()
    lantern.rect(V_TILE * 0.32, V_TILE * 0.35, V_TILE * 0.36, V_TILE * 0.6).fill(0x2a2436)
    lantern.roundRect(V_TILE * 0.2, -V_TILE * 0.35, V_TILE * 0.6, V_TILE * 0.72, 5).fill(0x39304a)
    lantern.roundRect(V_TILE * 0.28, -V_TILE * 0.22, V_TILE * 0.44, V_TILE * 0.46, 3).fill({ color: 0xffd98a, alpha: 0.95 })
    lantern.poly([V_TILE * 0.08, -V_TILE * 0.35, V_TILE * 0.5, -V_TILE * 0.62, V_TILE * 0.92, -V_TILE * 0.35]).fill(0x241c2e)
    put(lantern, 11, 5)
    this.glowAt(11.5, 5.4, 0xffc36a, 52, 0.5, { period: 900, amp: 0.14 }) // 大燈籠(郷の心臓)
  }

  private glowAt(tx: number, ty: number, color: number, r: number, alpha: number, breathe?: { period: number; amp: number }): Graphics {
    const g = new Graphics()
    g.circle(0, 0, r).fill({ color, alpha })
    g.blendMode = 'add'
    g.x = tx * V_TILE
    g.y = ty * V_TILE
    this.gGlow.addChild(g)
    // Tier1: 全ての灯りを個別位相で呼吸させる(reduceMotion時はbase固定)
    this.glows.push({ g, base: alpha, period: breathe?.period ?? 1400, phase: this.glows.length * 1.3, amp: breathe?.amp ?? alpha * 0.14 })
    return g
  }

  private buildNpcs(): void {
    for (const n of this.opts.npcs) {
      const node = new Container()
      node.x = (n.x + 0.5) * V_TILE
      node.y = (n.y + 0.55) * V_TILE
      node.zIndex = node.y
      // M8(§6): 浮いた金色の肖像札 → 郷に「立つ」村人へ。足元の影+立て札の台で接地し、
      // 縁の金は 0.7→0.3 に抑えて商品札感を消す(村人は vil_* が肖像のみのため立て札様式で見せる)。
      const shadow = new Graphics().ellipse(0, 1, 13, 4.5).fill({ color: 0x000000, alpha: 0.42 })
      node.addChild(shadow)
      const base = new Graphics()
      base.moveTo(-9, -3).lineTo(9, -3).lineTo(12, 2).lineTo(-12, 2).closePath().fill({ color: 0x241c2e, alpha: 0.92 })
      node.addChild(base)
      const board = new Graphics()
      board.roundRect(-14, -V_TILE * 1.02, 28, 42, 8).fill(0x161022).stroke({ color: 0xc9a86a, width: 1, alpha: 0.3 })
      node.addChild(board)
      void Assets.load(n.imgUrl)
        .then((tex: Texture) => {
          if (this.destroyed) return
          const sp = new Sprite(tex)
          const scale = 26 / sp.width
          sp.scale.set(scale)
          sp.x = -13
          sp.y = -V_TILE * 1.0 + 3
          const mask = new Graphics().roundRect(-13, -V_TILE * 1.0 + 3, 26, 36, 6).fill(0xffffff)
          node.addChild(mask)
          sp.mask = mask
          node.addChildAt(sp, 3)
        })
        .catch(() => {
          // 肖像欠落時 — 人影シルエット(頭+肩)で「人」と読ませる(金円ではない)
          const fb = new Graphics()
          fb.circle(0, -V_TILE * 0.82, 6).fill({ color: 0x2a2440, alpha: 0.95 })
          fb.moveTo(-9, -V_TILE * 0.5).quadraticCurveTo(0, -V_TILE * 0.74, 9, -V_TILE * 0.5).lineTo(9, -V_TILE * 0.5).closePath()
            .fill({ color: 0x2a2440, alpha: 0.95 })
          node.addChild(fb)
        })
      const label = new Text({
        text: n.name,
        style: { fontSize: 11, fill: 0xefe6d4, stroke: { color: 0x0a0e1d, width: 3 } },
      })
      label.anchor.set(0.5)
      label.y = 8
      node.addChild(label)
      if (n.news) {
        const badge = new Graphics().circle(16, -V_TILE * 0.95, 7).fill(0xd9c26a).stroke({ color: 0x0a0e1d, width: 1.5 })
        node.addChild(badge)
        const mark = new Text({ text: '話', style: { fontSize: 9, fill: 0x14100b, fontWeight: '700' } })
        mark.anchor.set(0.5)
        mark.x = 16
        mark.y = -V_TILE * 0.95
        node.addChild(mark)
        this.npcBadges.set(n.id, [badge, mark])
      }
      this.mid.addChild(node)
    }
  }

  private kinNodes: { id: string; name: string; node: Container }[] = []
  private npcBadges = new Map<string, (Graphics | Text)[]>()

  private buildKin(): void {
    this.opts.kin.slice(0, KIN_SPOTS.length).forEach((k, i) => {
      const [tx, ty] = KIN_SPOTS[i]
      const node = new Container()
      node.x = (tx + 0.5) * V_TILE
      node.y = (ty + 0.62) * V_TILE
      node.zIndex = node.y
      if (k.spriteUrl) {
        // 老い姿/幼子シートが無ければ成人姿へ退避(buildPlayerと同じ二段フォールバック)
        const adultUrl = k.spriteUrl.replace(/\/(walke|walkc)_/, '/walk_')
        void Assets.load(k.spriteUrl)
          .catch(() => Assets.load(adultUrl))
          .then((tex: Texture) => {
            if (this.destroyed) return
            const sp = new Sprite(tex)
            sp.anchor.set(0.5, 1)
            const scale = (V_TILE * 1.05) / sp.height
            sp.scale.set(scale)
            sp.y = 4
            node.addChildAt(sp, 0)
          })
          .catch(() => node.addChildAt(this.flameFigure(), 0))
      } else {
        node.addChildAt(this.flameFigure(), 0)
      }
      const label = new Text({
        text: k.name,
        style: { fontSize: 10.5, fill: 0xd9c26a, stroke: { color: 0x0a0e1d, width: 3 } },
      })
      label.anchor.set(0.5)
      label.y = -V_TILE * 1.14
      node.addChild(label)
      this.mid.addChild(node)
      this.kinNodes.push({ id: k.id, name: k.name, node })
    })
  }

  private flameFigure(): Graphics {
    const g = new Graphics()
    g.ellipse(0, -V_TILE * 0.4, 9, 14).fill({ color: 0xff9d45, alpha: 0.5 })
    g.circle(0, -V_TILE * 0.72, 6).fill({ color: 0xffd98a, alpha: 0.6 })
    return g
  }

  // ---- Tier1「生きた郷」: 環境アニメ(水面/粒子/煙)と手置きプロップ ----

  // 水面グリント: 涼色の楕円+波紋リング。8Hzで引き直す(reduceMotion時は build で1回のみ)。
  private buildWater(): void {
    this.drawWater()
  }
  private drawWater(): void {
    const g = this.waterG
    g.clear()
    const rm = this.opts.reduceMotion
    for (const [x, y] of this.pond) {
      const cx = (x + 0.5) * V_TILE
      const cy = (y + 0.5) * V_TILE
      const ph = (x * 7 + y * 13) * 0.3
      const rx = 8 + (rm ? 0 : Math.sin(this.time / 900 + ph) * 1.6)
      const a = 0.24 + (rm ? 0.08 : Math.sin(this.time / 700 + ph) * 0.12)
      g.ellipse(cx, cy, rx, 3).fill({ color: 0x6fa0d0, alpha: Math.max(0.12, a) })
      if (!rm) {
        const cyc = ((this.time + ph * 400) % 2600) / 2600
        g.ellipse(cx, cy, 4 + cyc * 12, 1.5 + cyc * 4).stroke({ color: 0x6fa0d0, width: 1, alpha: (1 - cyc) * 0.2 })
      }
    }
  }

  // 蛍/火の粉: プールを一度だけ確保し tick では位置/alpha のみ更新(new禁止=リーク対策)。加算で最前面。
  private buildParticles(): void {
    const mob = this.app.screen.width < 640
    // 環境蛍(rise=0): 灯りの近傍を暖金でゆらぐ
    const spots: [number, number][] = [[11.5, 5.4], [4.6, 3.4], [18, 3.4], [11, 2.2], [9, 6], [13, 6]]
    const fireflyN = mob ? 12 : 16
    for (let i = 0; i < fireflyN; i++) {
      const [sx, sy] = spots[i % spots.length]
      const cx = (sx + Math.sin(i * 12.9) * 1.4) * V_TILE
      const cy = (sy + Math.cos(i * 7.3) * 1.0) * V_TILE
      const g = new Graphics().circle(0, 0, 1.5 + (i % 3) * 0.5).fill({ color: 0xffe6a0, alpha: 0.8 })
      g.blendMode = 'add'
      g.position.set(cx, cy)
      this.gParticles.addChild(g)
      this.motes.push({ g, cx, cy, phase: i * 1.7, ampX: 9 + (i % 4) * 4, ampY: 6 + (i % 3) * 3, rise: 0 })
    }
    // 火の粉(rise>0): 鍛冶の炉から上昇してフェード(sc_forge の火花に一致)
    const emberN = mob ? 4 : 8
    for (let i = 0; i < emberN; i++) {
      const cx = (4.5 + Math.sin(i) * 0.4) * V_TILE
      const g = new Graphics().circle(0, 0, 1.4).fill({ color: 0xff9d45, alpha: 0.9 })
      g.blendMode = 'add'
      g.position.set(cx, 3.1 * V_TILE)
      this.gParticles.addChild(g)
      this.motes.push({ g, cx, cy: 3.1 * V_TILE, phase: i * 0.9, ampX: 6, ampY: 0, rise: V_TILE * 1.9 })
    }
  }
  private updateParticles(): void {
    for (const m of this.motes) {
      if (m.rise > 0) {
        const cyc = ((this.time + m.phase * 400) % 2200) / 2200
        m.g.position.set(m.cx + Math.sin(this.time / 500 + m.phase) * m.ampX, m.cy - cyc * m.rise)
        m.g.alpha = (1 - cyc) * 0.9
      } else {
        const t = this.time / 900 + m.phase
        m.g.position.set(m.cx + Math.sin(t) * m.ampX, m.cy + Math.cos(t * 0.7) * m.ampY)
        m.g.alpha = 0.5 + 0.4 * Math.sin(this.time / 600 + m.phase)
      }
    }
  }

  // 煙: normal ブレンドの暖灰。上昇+拡大+alpha山なり(0→peak→0)。this.time 基準の周期で再利用。
  private buildSmoke(): void {
    const mob = this.app.screen.width < 640
    const stacks: [number, number][] = mob ? [[4.5, 2.0]] : [[4.5, 2.0], [17.8, 1.9]]
    const per = 4
    const ttl = 2800
    stacks.forEach(([sx, sy], si) => {
      for (let i = 0; i < per; i++) {
        const g = new Graphics().circle(0, 0, 5 + (i % 2) * 2).fill({ color: 0xb8b0a4, alpha: 0.11 })
        const cx = sx * V_TILE
        const cy = sy * V_TILE
        g.position.set(cx, cy)
        this.gSmoke.addChild(g)
        this.smokePuffs.push({ g, cx, cy, offset: ((si * per + i) / (stacks.length * per)) * ttl, ttl, drift: (si === 0 ? 1 : -1) * 7 })
      }
    })
  }
  private updateSmoke(): void {
    for (const p of this.smokePuffs) {
      const t = ((this.time + p.offset) % p.ttl) / p.ttl
      p.g.position.set(p.cx + p.drift * t + Math.sin(t * 6) * 3, p.cy - t * V_TILE * 2.2)
      p.g.scale.set(0.6 + t * 1.5)
      p.g.alpha = 0.11 * Math.sin(Math.PI * t)
    }
  }

  // 手置きプロップ(密度・非衝突)。直立→mid(zIndex=worldY で y-sort)/ 平面→gDecal(主人公を隠さない)。
  private buildProps(): void {
    this.addProp('stone_lantern', 9, 6); this.addProp('stone_lantern', 13, 6)
    this.addProp('stone_lantern', 9, 3); this.addProp('stone_lantern', 14, 3)
    this.addProp('well', 7, 6)
    this.addProp('crate', 5, 4); this.addProp('crate', 2, 4)
    this.addProp('chochin', 18, 4); this.addProp('chochin', 5, 5)
    for (const [x, y] of [[2, 8], [5, 8], [5, 7]] as [number, number][]) this.addProp('fence', x, y)
    for (const [x, y] of [[1, 2], [1, 5], [20, 2], [20, 5], [20, 8], [6, 1]] as [number, number][]) this.addProp('plant', x, y)
    this.addProp('hut', 1, 8); this.addProp('hut', 19, 8); this.addProp('hut', 15, 1)
  }
  private addProp(kind: PropKind, tx: number, ty: number): void {
    const x = tx * V_TILE
    const y = ty * V_TILE
    // 平面デカール(植栽/縄柵)は gDecal(y-sort非参加=主人公を絶対に隠さない)
    if (kind === 'plant' || kind === 'fence') {
      const g = new Graphics()
      if (kind === 'plant') {
        for (const [ox, oy, rr, col] of [[-6, 2, 9, 0x14231c], [6, 3, 8, 0x172a20], [0, -3, 10, 0x1b3226]] as [number, number, number, number][]) {
          g.ellipse(ox, oy, rr, rr * 0.8).fill({ color: col, alpha: 0.9 })
        }
      } else {
        g.rect(-14, -12, 3, 14).fill(0x2e2018)
        g.rect(11, -12, 3, 14).fill(0x2e2018)
        g.moveTo(-12, -8).quadraticCurveTo(0, -4, 12, -8).stroke({ color: 0x6a5a3a, width: 2, alpha: 0.8 })
      }
      g.position.set(x, y)
      this.gDecal.addChild(g)
      return
    }
    // 直立プロップ
    const node = new Graphics()
    node.ellipse(0, 2, 10, 3.5).fill({ color: 0x000000, alpha: 0.32 }) // 足元の影
    switch (kind) {
      case 'stone_lantern':
        node.rect(-3, -8, 6, 10).fill(0x39344a)
        node.roundRect(-7, -20, 14, 12, 2).fill(0x4a4458)
        node.roundRect(-4, -17, 8, 7, 1).fill({ color: 0xffd98a, alpha: 0.9 })
        node.poly([-9, -20, 0, -27, 9, -20]).fill(0x2e2a3a)
        break
      case 'well':
        node.ellipse(0, 0, 14, 7).fill(0x2a2636).stroke({ color: 0x3a3450, width: 1.5 })
        node.ellipse(0, -1, 9, 4.5).fill(0x080810)
        node.rect(-12, -30, 3, 30).fill(0x2e2018)
        node.rect(9, -30, 3, 30).fill(0x2e2018)
        node.poly([-16, -29, 0, -40, 16, -29]).fill(0x241c2e)
        break
      case 'crate':
        node.rect(-9, -15, 18, 15).fill(0x2e2418).stroke({ color: 0x4a3a24, width: 1.5 })
        node.moveTo(-9, -15).lineTo(9, 0).moveTo(9, -15).lineTo(-9, 0).stroke({ color: 0x4a3a24, width: 1 })
        break
      case 'chochin':
        node.rect(-1.5, -38, 3, 14).fill(0x2e2018)
        node.roundRect(-7, -26, 14, 18, 7).fill({ color: 0xff8c42, alpha: 0.92 })
        for (let i = 0; i < 3; i++) node.rect(-7, -22 + i * 5, 14, 1).fill({ color: 0x7a3a1a, alpha: 0.5 })
        break
      case 'hut': {
        const w = V_TILE * 0.72
        node.roundRect(-w, -V_TILE * 0.28, w * 2, V_TILE * 0.95, 3).fill(0x1a1626).stroke({ color: 0x322a44, width: 1.2 })
        node.poly([-w - 6, -V_TILE * 0.22, 0, -V_TILE * 0.98, w + 6, -V_TILE * 0.22]).fill(0x2a2338)
        node.rect(-8, -V_TILE * 0.1, 16, V_TILE * 0.6).fill({ color: 0xffd98a, alpha: 0.42 })
        break
      }
    }
    node.x = x
    node.y = y
    node.zIndex = y + (kind === 'hut' ? V_TILE * 1.3 : V_TILE * 0.4)
    this.mid.addChild(node)
    if (kind === 'stone_lantern' || kind === 'chochin') {
      this.glowAt(tx + 0.5, ty + 0.3, 0xffc36a, 15, 0.26, { period: 1200, amp: 0.09 })
    }
  }

  private async buildPlayer(): Promise<void> {
    this.player = new Container()
    if (this.opts.leaderSpriteBase) {
      // 老い姿(walke_)/幼子(walkc_)のシートが無ければ成人姿(walk_)へ静かに退避する
      // (dungeon/engine.ts と同じ設計。M23工場汚染分は assets_src/quarantine_sprites_m23 へ退避済み)
      const adultBase = this.opts.leaderSpriteBase.replace(/\/(walke|walkc)_/, '/walk_')
      const bases = [...new Set([this.opts.leaderSpriteBase, adultBase])]
      let loaded: Record<'down' | 'up' | 'left', Texture[]> | null = null
      for (const b of bases) {
        try {
          const dirs = ['down', 'up', 'left'] as const
          const tex: Record<'down' | 'up' | 'left', Texture[]> = { down: [], up: [], left: [] }
          for (const d of dirs) {
            for (let i = 0; i < 3; i++) {
              tex[d].push(await Assets.load(`${b}_${d}_${i}.png`))
            }
          }
          loaded = tex
          break
        } catch {
          // 次のbase(成人姿)へ — 全滅なら灯影
        }
      }
      if (loaded) {
        this.textures = loaded
        const sp = new Sprite(loaded.down[1])
        sp.anchor.set(0.5, 0)
        const scale = (V_TILE * 1.15) / sp.height
        sp.scale.set(scale)
        sp.y = -V_TILE * 0.9
        this.playerSprite = sp
        this.player.addChild(sp)
      } else {
        this.player.addChild(this.flameFigure())
      }
    } else {
      this.player.addChild(this.flameFigure())
    }
    // 足元の影
    const shadow = new Graphics().ellipse(0, 2, 12, 5).fill({ color: 0x000000, alpha: 0.4 })
    this.player.addChildAt(shadow, 0)
    this.mid.addChild(this.player)
  }
}
