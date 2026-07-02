import { Application, Container, Graphics, Sprite, Texture, Assets } from 'pixi.js'
import type { FloorDef, TileKind } from './types'
import { TILE_CHARS, isWalkable } from './types'

const TILE = 34 // px
const MOVE_MS = 130
const SHADE_BASE_MS = 620

const TILE_COLORS: Record<TileKind, number> = {
  wall: 0x10141f,
  floor: 0x232c48,
  grass: 0x24344a,
  stairs: 0xc9a86a,
  entrance: 0x7fae8f,
  chest: 0xb9852d,
  camp: 0xd4593e,
  shrine: 0x9b7fc2,
  boss: 0x8a1f2d,
  water: 0x17263f,
}

export interface EngineEvents {
  onStep: (x: number, y: number) => void
  onEncounter: () => void
  onSpecialTile: (kind: TileKind, x: number, y: number) => void
}

interface Shade {
  x: number
  y: number
  g: Graphics
  cd: number // 次の行動までms
}

export class DungeonEngine {
  private app = new Application()
  private world = new Container()
  private grid: TileKind[][] = []
  private tileMarks = new Map<string, Graphics>()
  private player!: Container
  private playerSprite: Sprite | null = null
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

  private host: HTMLElement
  private floor: FloorDef
  private floorIndex: number
  private events: EngineEvents

  constructor(
    host: HTMLElement,
    floor: FloorDef,
    start: { x: number; y: number } | null,
    usedKeys: string[],
    floorIndex: number,
    events: EngineEvents,
    leader?: { gata: string; sex: string },
  ) {
    this.host = host
    this.floor = floor
    this.floorIndex = floorIndex
    this.events = events
    this.leader = leader ?? { gata: 'homura', sex: 'm' }
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
      background: 0x0b0f1e,
      resizeTo: this.host,
      antialias: true,
    })
    if (this.destroyed) return
    this.host.appendChild(this.app.canvas)
    this.app.stage.addChild(this.world)

    // タイル描画
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        const kind = this.grid[y][x]
        const g = new Graphics()
        const usedHere = this.used.has(`${this.floorIndex}:${x}:${y}`)
        const color = usedHere && (kind === 'chest' || kind === 'shrine') ? TILE_COLORS.floor : TILE_COLORS[kind]
        g.rect(0, 0, TILE - 2, TILE - 2).fill(color)
        if (kind === 'stairs') g.rect(6, 6, TILE - 14, TILE - 14).fill(0xefe6d4)
        if (kind === 'camp') g.circle(TILE / 2, TILE / 2, 6).fill(0xffcf70)
        if (kind === 'chest' && !usedHere) g.rect(8, 12, TILE - 18, TILE - 22).fill(0x5c4a2a)
        if (kind === 'shrine' && !usedHere) g.circle(TILE / 2, TILE / 2, 5).fill(0xefe6d4)
        if (kind === 'boss') g.circle(TILE / 2, TILE / 2, 7).fill(0x1a0a0e)
        g.x = x * TILE
        g.y = y * TILE
        this.world.addChild(g)
        this.tileMarks.set(`${x}:${y}`, g)
      }
    }

    // プレイヤー — 灯型×性別の切り絵シルエット歩行スプライト(読めなければ灯印で代替)
    this.player = new Container()
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
    this.world.addChild(this.player)
    this.player.x = this.px * TILE
    this.player.y = this.py * TILE

    // 敵影
    for (let i = 0; i < this.floor.shades; i++) this.spawnShade()

    this.app.ticker.add((t) => this.tick(t.deltaMS))
    window.addEventListener('keydown', this.keydown)
    window.addEventListener('keyup', this.keyup)
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
    const g = new Graphics()
    g.circle(TILE / 2, TILE / 2, 9).fill(0x05070d)
    g.circle(TILE / 2 - 3, TILE / 2 - 2, 1.6).fill(0xff9d45)
    g.circle(TILE / 2 + 3, TILE / 2 - 2, 1.6).fill(0xff9d45)
    g.x = x * TILE
    g.y = y * TILE
    this.world.addChild(g)
    this.shades.push({ x, y, g, cd: Math.random() * SHADE_BASE_MS })
  }

  setLight(pct: number): void {
    this.lightPct = pct
  }

  setPaused(p: boolean): void {
    this.paused = p
  }

  pressDir(dir: string, down: boolean): void {
    if (down) this.held.add(dir)
    else this.held.delete(dir)
  }

  private tick(dms: number): void {
    if (this.paused) return
    // 移動アニメーション(ティッカー駆動 — 非表示タブでも整合)
    if (this.moving && this.moveFrom) {
      this.moveT += dms / MOVE_MS
      const t = Math.min(1, this.moveT)
      this.player.x = (this.moveFrom.x + (this.px - this.moveFrom.x) * t) * TILE
      this.player.y = (this.moveFrom.y + (this.py - this.moveFrom.y) * t) * TILE
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
    // 敵影AI
    const speedMult = this.lightPct <= 0 ? 0.45 : this.lightPct < 40 ? 0.7 : 1
    for (const s of this.shades) {
      s.cd -= dms
      if (s.cd > 0) continue
      s.cd = SHADE_BASE_MS * speedMult * (0.8 + Math.random() * 0.4)
      const chase = dist(s.x, s.y, this.px, this.py) <= (this.lightPct < 40 ? 6 : 4)
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
        s.x = nx
        s.y = ny
        s.g.x = nx * TILE
        s.g.y = ny * TILE
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
    this.world.removeChild(s.g)
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
    if (kind === 'chest' || kind === 'camp' || kind === 'shrine' || kind === 'stairs' || kind === 'entrance' || kind === 'boss') {
      if ((kind === 'chest' || kind === 'camp' || kind === 'shrine') && this.used.has(`${this.floorIndex}:${x}:${y}`)) return
      this.events.onSpecialTile(kind, x, y)
    }
  }

  markUsed(x: number, y: number): void {
    this.used.add(`${this.floorIndex}:${x}:${y}`)
    const g = this.tileMarks.get(`${x}:${y}`)
    if (g) {
      g.clear()
      g.rect(0, 0, TILE - 2, TILE - 2).fill(TILE_COLORS.floor)
    }
  }

  private centerCamera(snap = false): void {
    const vw = this.app.renderer.width
    const vh = this.app.renderer.height
    const tx = vw / 2 - this.player.x - TILE / 2
    const ty = vh / 2 - this.player.y - TILE / 2
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
