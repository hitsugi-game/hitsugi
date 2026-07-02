// 歩行ダンジョンエンジン(品質刷新v3.1 M7a全面改修)
// 公開契約(Dungeon.tsx向け)は不変: ctor/init/setLight/setPaused/pressDir/markUsed/pump/destroy/tileAt/EngineEvents
// 内部は5層構成に刷新: ground(一括ベイク)/water/decal(揺れ草)/mid(props+影+プレイヤー, y-sort)/glow(加算光)
// + スクリーン層: darkness(照明RT)/vignette。灯ゲージが初めて画面に現れる(松明半径連動)。
import { Application, Container, Graphics, Sprite, Texture, Assets } from 'pixi.js'
import type { FloorDef, TileKind } from './types'
import { TILE_CHARS, isWalkable } from './types'
import { themeForBg, type DungeonTheme } from './render/theme'
import { TextureRegistry, vignetteTexture } from './render/textures'
import { buildGround, updateWater, type GroundResult } from './render/ground'
import { buildProps, type PropsResult } from './render/props'
import { LightingSystem } from './render/lighting'
import { Rng } from '../core/rng'

const TILE = 44 // px(34→44: プロップ/スプライトが読める密度に)
const MOVE_MS = 130
const SHADE_BASE_MS = 620

export interface EngineEvents {
  onStep: (x: number, y: number) => void
  onEncounter: () => void
  onSpecialTile: (kind: TileKind, x: number, y: number) => void
}

export interface EngineOpts {
  bg?: string // region.bg(テーマ解決)
  tier?: 1 | 2 | 3 | 4
  seed?: number // FloorDef.seed(プロップ散布の決定論)
  isBossFloor?: boolean
}

interface Shade {
  x: number
  y: number
  node: Container
  body: Graphics
  cd: number // 次の行動までms
  // 滑らか移動(200msトゥイーン)
  fromX: number
  fromY: number
  moveT: number // 1で完了
  bobPhase: number
}

export class DungeonEngine {
  private app = new Application()
  private world = new Container()
  private layerGround = new Container()
  private layerWater = new Container()
  private layerDecal = new Container()
  private layerMid = new Container()
  private layerGlow = new Container()
  private screenFx = new Container()

  private registry: TextureRegistry | null = null
  private lighting: LightingSystem | null = null
  private groundData: GroundResult | null = null
  private propsData: PropsResult | null = null
  private vignette: Sprite | null = null

  private theme: DungeonTheme
  private grid: TileKind[][] = []
  private player!: Container
  private playerSprite: Sprite | null = null
  private playerShadow: Sprite | null = null
  private walkTex: Record<string, Texture[]> = {}
  private facing = 'down'
  private animT = 0
  private leader: { gata: string; sex: string } = { gata: 'homura', sex: 'm' }
  private baseScale = 1
  private shades: Shade[] = []
  private px = 1
  private py = 1
  private moving = false
  private moveFrom: { x: number; y: number } | null = null
  private moveT = 0
  private held = new Set<string>()
  private used: Set<string>
  private lightPct = 100
  private paused = false
  private destroyed = false
  private time = 0
  private waterT = 0
  private swayT = 0
  private shake = 0
  private tufts: { sp: Sprite; phase: number }[] = []

  private keydown = (e: KeyboardEvent) => {
    const k = keyDir(e.key)
    if (k) {
      e.preventDefault()
      this.held.add(k)
    }
  }
  private keyup = (e: KeyboardEvent) => {
    const k = keyDir(e.key)
    if (k) this.held.delete(k)
  }
  private onResize = () => {
    this.lighting?.resize()
    if (this.vignette) {
      this.vignette.width = this.app.renderer.width
      this.vignette.height = this.app.renderer.height
    }
    this.centerCamera(true)
  }

  private host: HTMLElement
  private floor: FloorDef
  private floorIndex: number
  private events: EngineEvents
  private opts: EngineOpts

  constructor(
    host: HTMLElement,
    floor: FloorDef,
    start: { x: number; y: number } | null,
    usedKeys: string[],
    floorIndex: number,
    events: EngineEvents,
    leader?: { gata: string; sex: string },
    opts?: EngineOpts,
  ) {
    this.host = host
    this.floor = floor
    this.floorIndex = floorIndex
    this.events = events
    this.leader = leader ?? { gata: 'homura', sex: 'm' }
    this.opts = opts ?? {}
    this.theme = themeForBg(this.opts.bg ?? 'bg_forest')
    this.used = new Set(usedKeys)
    this.parse()
    if (start) {
      this.px = start.x
      this.py = start.y
    } else {
      const e = this.findTile('entrance')
      if (e) {
        this.px = e.x
        this.py = e.y
      }
    }
    // マップ再生成前の旧セーブ対策: 復帰座標が歩行不能なら入口へ退避
    if (!isWalkable(this.tileAt(this.px, this.py))) {
      const e = this.findTile('entrance')
      if (e) {
        this.px = e.x
        this.py = e.y
      }
    }
  }

  private parse(): void {
    const rows = this.floor.ascii
    const w = Math.max(...rows.map((r) => r.length))
    this.grid = rows.map((r) =>
      Array.from({ length: w }, (_, i) => TILE_CHARS[r[i] ?? '#'] ?? 'wall'),
    )
  }

  private findTile(kind: TileKind): { x: number; y: number } | null {
    for (let y = 0; y < this.grid.length; y++)
      for (let x = 0; x < this.grid[y].length; x++)
        if (this.grid[y][x] === kind) return { x, y }
    return null
  }

  tileAt(x: number, y: number): TileKind {
    return this.grid[y]?.[x] ?? 'wall'
  }

  async init(): Promise<void> {
    await this.app.init({
      background: this.theme.groundBase,
      resizeTo: this.host,
      antialias: true,
    })
    if (this.destroyed) return
    this.host.appendChild(this.app.canvas)

    // レイヤー構成
    this.world.addChild(this.layerGround, this.layerWater, this.layerDecal, this.layerMid, this.layerGlow)
    this.layerMid.sortableChildren = true
    this.app.stage.addChild(this.world)

    this.registry = new TextureRegistry(this.app.renderer)
    const seed = this.opts.seed ?? (this.floorIndex + 1) * 7919

    // 地面(一括ベイク)+水面
    this.groundData = buildGround(this.grid, TILE, this.theme, seed)
    this.layerGround.addChild(this.groundData.ground)
    if (this.groundData.water) this.layerWater.addChild(this.groundData.water)

    // プロップ+特殊タイル標識
    this.propsData = buildProps(
      this.grid, TILE, this.theme, seed, this.registry, this.used, this.floorIndex, !!this.opts.isBossFloor,
    )
    for (const sp of this.propsData.sprites) this.layerMid.addChild(sp)

    // 揺れる草(decal層・上限60)
    const tuftTex = this.registry.make('tuft', (g) => {
      g.moveTo(0, 0).lineTo(-2, -9).lineTo(-0.6, -1).closePath().fill({ color: this.theme.grass, alpha: 0.95 })
      g.moveTo(1, 0).lineTo(2.5, -11).lineTo(2.2, -1).closePath().fill({ color: this.theme.grass, alpha: 0.85 })
      g.moveTo(3, 0).lineTo(6, -8).lineTo(4.4, -0.5).closePath().fill({ color: this.theme.grass, alpha: 0.9 })
    })
    const tuftRng = new Rng(seed ^ 0x5f3759df)
    for (const { x, y } of tuftRng.shuffle(this.groundData.grassCells).slice(0, 60)) {
      const sp = new Sprite(tuftTex)
      sp.anchor.set(0.5, 1)
      sp.position.set(x * TILE + TILE / 2 + tuftRng.int(-8, 8), y * TILE + TILE - tuftRng.int(2, 10))
      this.layerDecal.addChild(sp)
      this.tufts.push({ sp, phase: tuftRng.next() * Math.PI * 2 })
    }

    // プレイヤー — 灯型×性別の切り絵シルエット歩行スプライト(読めなければ灯印で代替)
    this.player = new Container()
    const shadowTex = this.registry.make('pshadow', (g) => {
      g.ellipse(0, 0, 11, 4.6).fill({ color: 0x000000, alpha: 0.45 })
    })
    this.playerShadow = new Sprite(shadowTex)
    this.playerShadow.anchor.set(0.5)
    this.playerShadow.position.set(TILE / 2, TILE * 0.88)
    this.player.addChild(this.playerShadow)
    try {
      const base = import.meta.env.BASE_URL
      const { gata, sex } = this.leader
      for (const dir of ['down', 'up', 'left']) {
        this.walkTex[dir] = await Promise.all(
          [0, 1, 2].map((i) => Assets.load<Texture>(`${base}img/sprites/walk_${gata}_${sex}_${dir}_${i}.png`)),
        )
      }
      const sp = new Sprite(this.walkTex.down[1])
      sp.anchor.set(0.5, 0.78)
      sp.height = TILE * 1.6
      sp.scale.x = sp.scale.y
      this.baseScale = sp.scale.y
      sp.x = TILE / 2
      sp.y = TILE * 0.9
      this.playerSprite = sp
      this.player.addChild(sp)
    } catch {
      const g = new Graphics()
      g.circle(TILE / 2, TILE / 2, 10).fill(0xefe6d4)
      g.circle(TILE / 2, TILE / 2 - 2, 4).fill(0xff9d45)
      this.player.addChild(g)
    }
    this.layerMid.addChild(this.player)
    this.player.x = this.px * TILE
    this.player.y = this.py * TILE
    this.player.zIndex = this.player.y + TILE

    // 敵影
    for (let i = 0; i < this.floor.shades; i++) this.spawnShade()

    // 照明(半解像度RT+erase穴あけ)+ビネット
    this.lighting = new LightingSystem(this.app.renderer, this.screenFx, this.layerGlow, this.theme, TILE)
    for (const l of this.propsData.lights) {
      this.lighting.addStatic(l.id, l.tx, l.ty, {
        radiusTiles: l.radiusTiles, tint: l.tint, flicker: l.flicker, pulse: l.pulse,
      })
    }
    this.lighting.setLightPct(this.lightPct)

    this.vignette = new Sprite(vignetteTexture())
    this.vignette.width = this.app.renderer.width
    this.vignette.height = this.app.renderer.height
    this.app.stage.addChild(this.screenFx)
    this.app.stage.addChild(this.vignette)

    this.app.ticker.add((t) => this.tick(t.deltaMS))
    window.addEventListener('keydown', this.keydown)
    window.addEventListener('keyup', this.keyup)
    this.app.renderer.on('resize', this.onResize)
    this.centerCamera(true)
  }

  private spawnShade(): void {
    let x = 0
    let y = 0
    let guard = 0
    do {
      y = 1 + Math.floor(Math.random() * (this.grid.length - 2))
      x = 1 + Math.floor(Math.random() * (this.grid[0].length - 2))
      guard++
    } while ((!isWalkable(this.tileAt(x, y)) || dist(x, y, this.px, this.py) < 6) && guard < 200)
    if (guard >= 200) return

    const node = new Container()
    const body = new Graphics()
    this.drawShadeBody(body, false)
    node.addChild(body)
    node.x = x * TILE
    node.y = y * TILE
    node.zIndex = node.y + TILE
    this.layerMid.addChild(node)
    this.shades.push({
      x, y, node, body,
      cd: Math.random() * SHADE_BASE_MS,
      fromX: x, fromY: y, moveT: 1,
      bobPhase: Math.random() * Math.PI * 2,
    })
  }

  // 敵影の見た目(M7cで妖怪シルエットへ差し替え予定の暫定 — 闇色+属性の眼)
  private drawShadeBody(g: Graphics, alert: boolean): void {
    g.clear()
    g.ellipse(TILE / 2, TILE * 0.82, 10, 4).fill({ color: 0x000000, alpha: 0.4 })
    g.circle(TILE / 2, TILE / 2, 10).fill(0x05070d)
    const eye = alert ? 0xff4a3a : 0xff9d45
    g.circle(TILE / 2 - 3.4, TILE / 2 - 2, 1.8).fill(eye)
    g.circle(TILE / 2 + 3.4, TILE / 2 - 2, 1.8).fill(eye)
  }

  setLight(pct: number): void {
    this.lightPct = pct
    this.lighting?.setLightPct(pct)
  }

  setPaused(p: boolean): void {
    this.paused = p
  }

  pressDir(dir: string, down: boolean): void {
    if (down) this.held.add(dir)
    else this.held.delete(dir)
  }

  private tick(dms: number): void {
    this.time += dms

    // 環境アニメーションは停止中も続ける(モーダル背後の空気感)
    this.swayT += dms
    if (this.swayT >= 66) {
      this.swayT = 0
      for (const t of this.tufts) {
        t.sp.rotation = Math.sin(this.time / 1100 + t.phase) * 0.07
      }
    }
    if (this.groundData?.water) {
      this.waterT += dms
      if (this.waterT >= 125) {
        this.waterT = 0
        updateWater(this.groundData.water, this.groundData.waterPools, TILE, this.theme, this.time)
      }
    }
    this.lighting?.update(dms, this.world.x, this.world.y)

    if (this.paused) return

    // 移動アニメーション(ティッカー駆動 — 非表示タブでも整合)
    if (this.moving && this.moveFrom) {
      this.moveT += dms / MOVE_MS
      const t = Math.min(1, this.moveT)
      this.player.x = (this.moveFrom.x + (this.px - this.moveFrom.x) * t) * TILE
      this.player.y = (this.moveFrom.y + (this.py - this.moveFrom.y) * t) * TILE
      this.player.zIndex = this.player.y + TILE
      this.centerCamera()
      // 歩行コマ送り(0-1-2-1のサイクル)。右向きは左向きの反転
      if (this.playerSprite) {
        this.animT += dms
        const frame = [0, 1, 2, 1][Math.floor(this.animT / 130) % 4]
        this.applyFacing(frame)
      }
      if (t >= 1) {
        this.moving = false
        this.moveFrom = null
        this.arrive(this.px, this.py)
      }
    } else if (this.playerSprite) {
      this.applyFacing(1)
    }
    // プレイヤー移動開始
    if (!this.moving && this.held.size > 0) {
      const dir = [...this.held][this.held.size - 1]
      const [dx, dy] = DIRS[dir]
      this.tryMove(dx, dy)
    }
    // プレイヤー光源の追従
    this.lighting?.setPlayerPos(this.player.x + TILE / 2, this.player.y + TILE * 0.62)

    // カメラ振動の減衰
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dms * 0.03)

    // 敵影AI(判断はタイル単位のまま、描画は200msトゥイーン+浮遊ボブ)
    const speedMult = this.lightPct <= 0 ? 0.45 : this.lightPct < 40 ? 0.7 : 1
    for (const s of this.shades) {
      // 滑らか移動
      if (s.moveT < 1) {
        s.moveT = Math.min(1, s.moveT + dms / 200)
        const t = s.moveT
        s.node.x = (s.fromX + (s.x - s.fromX) * t) * TILE
        s.node.y = (s.fromY + (s.y - s.fromY) * t) * TILE
        s.node.zIndex = s.node.y + TILE
      }
      s.node.pivot.y = Math.sin(this.time / 450 + s.bobPhase) * 2.2

      s.cd -= dms
      if (s.cd > 0) continue
      s.cd = SHADE_BASE_MS * speedMult * (0.8 + Math.random() * 0.4)
      const chase = dist(s.x, s.y, this.px, this.py) <= (this.lightPct < 40 ? 6 : 4)
      this.drawShadeBody(s.body, chase)
      let dx = 0
      let dy = 0
      if (chase) {
        dx = Math.sign(this.px - s.x)
        dy = Math.sign(this.py - s.y)
        if (dx !== 0 && dy !== 0) (Math.random() < 0.5 ? (dx = 0) : (dy = 0))
      } else {
        const d = Object.values(DIRS)[Math.floor(Math.random() * 4)]
        dx = d[0]
        dy = d[1]
      }
      const nx = s.x + dx
      const ny = s.y + dy
      if (isWalkable(this.tileAt(nx, ny)) && !this.shades.some((o) => o !== s && o.x === nx && o.y === ny)) {
        s.fromX = s.x
        s.fromY = s.y
        s.x = nx
        s.y = ny
        s.moveT = 0
      }
      if (s.x === this.px && s.y === this.py) {
        this.removeShade(s)
        this.events.onEncounter()
        return
      }
    }
  }

  private applyFacing(frame: number): void {
    if (!this.playerSprite) return
    const texDir = this.facing === 'right' ? 'left' : this.facing
    const tex = this.walkTex[texDir]
    if (!tex) return
    this.playerSprite.texture = tex[frame]
    this.playerSprite.scale.x = this.facing === 'right' ? -this.baseScale : this.baseScale
  }

  private removeShade(s: Shade): void {
    this.layerMid.removeChild(s.node)
    s.node.destroy({ children: true })
    this.shades = this.shades.filter((x) => x !== s)
  }

  private tryMove(dx: number, dy: number): void {
    const nx = this.px + dx
    const ny = this.py + dy
    if (!isWalkable(this.tileAt(nx, ny))) return
    this.facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy < 0 ? 'up' : 'down'
    this.moveFrom = { x: this.px, y: this.py }
    this.moveT = 0
    this.moving = true
    this.px = nx
    this.py = ny
  }

  // 検証・非表示タブ用: 手動でティックを進める
  pump(dms: number): void {
    this.tick(dms)
  }

  private arrive(x: number, y: number): void {
    this.events.onStep(x, y)
    // 敵影との接触
    const hit = this.shades.find((s) => s.x === x && s.y === y)
    if (hit) {
      this.removeShade(hit)
      this.events.onEncounter()
      return
    }
    const kind = this.tileAt(x, y)
    if (kind === 'chest' || kind === 'camp' || kind === 'shrine' || kind === 'stairs' || kind === 'entrance' || kind === 'boss' || kind === 'monument') {
      if ((kind === 'chest' || kind === 'camp' || kind === 'shrine' || kind === 'monument') && this.used.has(`${this.floorIndex}:${x}:${y}`)) return
      if (kind === 'monument') return // M14で「調べる」対象化(現状は景観のみ)
      this.events.onSpecialTile(kind, x, y)
    }
  }

  markUsed(x: number, y: number): void {
    this.used.add(`${this.floorIndex}:${x}:${y}`)
    const kind = this.tileAt(x, y)
    const marker = this.propsData?.markers.get(`${x}:${y}`)
    const tex = this.propsData?.usedTexture(kind)
    if (marker && tex) marker.texture = tex
    if (kind === 'camp') this.lighting?.dim(`camp:${x}:${y}`)
    if (kind === 'shrine') this.lighting?.dim(`shrine:${x}:${y}`)
  }

  private centerCamera(snap = false): void {
    const vw = this.app.renderer.width
    const vh = this.app.renderer.height
    const jx = this.shake > 0 ? (Math.random() * 2 - 1) * this.shake : 0
    const jy = this.shake > 0 ? (Math.random() * 2 - 1) * this.shake : 0
    const tx = vw / 2 - this.player.x - TILE / 2 + jx
    const ty = vh / 2 - this.player.y - TILE / 2 + jy
    if (snap) {
      this.world.x = tx
      this.world.y = ty
    } else {
      this.world.x += (tx - this.world.x) * 0.2
      this.world.y += (ty - this.world.y) * 0.2
    }
  }

  destroy(): void {
    this.destroyed = true
    window.removeEventListener('keydown', this.keydown)
    window.removeEventListener('keyup', this.keyup)
    try {
      this.app.renderer.off('resize', this.onResize)
    } catch {
      // renderer未初期化
    }
    this.lighting?.destroy()
    this.registry?.destroyAll()
    try {
      this.app.destroy(true, { children: true })
    } catch {
      // already gone
    }
  }
}

const DIRS: Record<string, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

function keyDir(key: string): string | null {
  switch (key) {
    case 'ArrowUp':
    case 'w':
      return 'up'
    case 'ArrowDown':
    case 's':
      return 'down'
    case 'ArrowLeft':
    case 'a':
      return 'left'
    case 'ArrowRight':
    case 'd':
      return 'right'
    default:
      return null
  }
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}
