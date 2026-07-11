// M23(指示6): 燈ノ郷の歩行マップ — 軽量Pixiエンジン。
// dungeon/engine.tsの生成/破棄・入力パターンを踏襲しつつ、照明RT・敵影・灯ゲージは持たない。
// 歩くことを強制ロードにしない: 施設への即時移動(すぐ行く)はVillage.tsx側のバーが担い、
// 本エンジンは「世界観を味わう経路」を提供する(POLISH_FIX §5)。
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'

export const V_TILE = 46

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
  private lanternGlow: Graphics | null = null

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
    this.world.addChild(this.buildGround())
    this.mid.sortableChildren = true
    this.world.addChild(this.mid)
    this.world.addChild(this.gGlow)
    this.buildBuildings()
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
    const w = COLS * V_TILE
    const h = ROWS * V_TILE
    const scale = Math.min(this.app.screen.width / w, this.app.screen.height / h)
    this.world.scale.set(scale)
    this.world.x = (this.app.screen.width - w * scale) / 2
    this.world.y = (this.app.screen.height - h * scale) / 2
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

    // 大燈籠の呼吸(reduce-motion時は静止)
    if (this.lanternGlow && !this.opts.reduceMotion) {
      this.lanternGlow.alpha = 0.5 + Math.sin(this.time / 900) * 0.14
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
    // 池の光
    const pond = MAP.flatMap((row, y) => [...row].map((ch, x) => (ch === '~' ? [x, y] : null)).filter(Boolean)) as [number, number][]
    for (const [x, y] of pond) {
      g.ellipse((x + 0.5) * V_TILE, (y + 0.5) * V_TILE, 8, 3).fill({ color: 0x4a7ab0, alpha: 0.35 })
    }
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
    put(forge, 3, 2)
    this.glowAt(4.6, 3.55, 0xff9d45, 26, 0.35)

    // 星契りの祠(北) — 鳥居+注連縄
    const shrine = new Graphics()
    shrine.rect(V_TILE * 0.14, -V_TILE * 0.9, 7, V_TILE * 1.9).fill(0x6a2f2a)
    shrine.rect(V_TILE * 1.66, -V_TILE * 0.9, 7, V_TILE * 1.9).fill(0x6a2f2a)
    shrine.rect(-6, -V_TILE * 0.98, V_TILE * 2 + 12, 9).fill(0x7a3630)
    shrine.rect(V_TILE * 0.08, -V_TILE * 0.7, V_TILE * 1.86, 6).fill(0x5a2622)
    shrine.moveTo(V_TILE * 0.2, -V_TILE * 0.55).quadraticCurveTo(V_TILE, -V_TILE * 0.3, V_TILE * 1.8, -V_TILE * 0.55)
      .stroke({ color: 0xd9c26a, width: 2, alpha: 0.8 })
    put(shrine, 10, 2.9)
    this.glowAt(11, 2.2, 0x9b7fc2, 30, 0.3)

    // 豆腐屋(東) — 暖簾の小店
    const tofu = new Graphics()
    tofu.roundRect(0, V_TILE * 0.2, V_TILE * 2, V_TILE * 1.8, 4).fill(0x18142a).stroke({ color: 0x3a3050, width: 1.5 })
    tofu.poly([-5, V_TILE * 0.34, V_TILE, -V_TILE * 0.42, V_TILE * 2 + 5, V_TILE * 0.34]).fill(0x201a30)
    for (let i = 0; i < 3; i++) {
      tofu.rect(V_TILE * (0.3 + i * 0.5), V_TILE * 0.62, V_TILE * 0.4, V_TILE * 0.66).fill({ color: 0xe9e4d8, alpha: 0.85 })
    }
    put(tofu, 17, 2)
    this.glowAt(18, 3.4, 0xffd9a0, 20, 0.25)

    // 出立門(南) — 大きな木戸
    const gate = new Graphics()
    gate.rect(0, -V_TILE * 1.1, 9, V_TILE * 2.1).fill(0x241a14)
    gate.rect(V_TILE * 2 - 9, -V_TILE * 1.1, 9, V_TILE * 2.1).fill(0x241a14)
    gate.rect(-8, -V_TILE * 1.22, V_TILE * 2 + 16, 10).fill(0x2e2018)
    gate.rect(-2, -V_TILE * 0.95, V_TILE * 2 + 4, 6).fill(0x1c1410)
    put(gate, 10, 9)

    // 大燈籠(中央) — 郷の心臓
    const lantern = new Graphics()
    lantern.rect(V_TILE * 0.32, V_TILE * 0.35, V_TILE * 0.36, V_TILE * 0.6).fill(0x2a2436)
    lantern.roundRect(V_TILE * 0.2, -V_TILE * 0.35, V_TILE * 0.6, V_TILE * 0.72, 5).fill(0x39304a)
    lantern.roundRect(V_TILE * 0.28, -V_TILE * 0.22, V_TILE * 0.44, V_TILE * 0.46, 3).fill({ color: 0xffd98a, alpha: 0.95 })
    lantern.poly([V_TILE * 0.08, -V_TILE * 0.35, V_TILE * 0.5, -V_TILE * 0.62, V_TILE * 0.92, -V_TILE * 0.35]).fill(0x241c2e)
    put(lantern, 11, 5)
    this.lanternGlow = this.glowAt(11.5, 5.4, 0xffc36a, 52, 0.5)
  }

  private glowAt(tx: number, ty: number, color: number, r: number, alpha: number): Graphics {
    const g = new Graphics()
    g.circle(0, 0, r).fill({ color, alpha })
    g.blendMode = 'add'
    g.x = tx * V_TILE
    g.y = ty * V_TILE
    this.gGlow.addChild(g)
    return g
  }

  private buildNpcs(): void {
    for (const n of this.opts.npcs) {
      const node = new Container()
      node.x = (n.x + 0.5) * V_TILE
      node.y = (n.y + 0.55) * V_TILE
      node.zIndex = node.y
      // 肖像札(vil_*) — 読み込めなければ灯影
      const frame = new Graphics()
      frame.roundRect(-15, -V_TILE * 0.95, 30, 40, 5).fill(0x100c1c).stroke({ color: 0xc9a86a, width: 1.2, alpha: 0.7 })
      node.addChild(frame)
      void Assets.load(n.imgUrl)
        .then((tex: Texture) => {
          if (this.destroyed) return
          const sp = new Sprite(tex)
          const scale = 26 / sp.width
          sp.scale.set(scale)
          sp.x = -13
          sp.y = -V_TILE * 0.95 + 2
          const mask = new Graphics().roundRect(-13, -V_TILE * 0.95 + 2, 26, 36, 4).fill(0xffffff)
          node.addChild(mask)
          sp.mask = mask
          node.addChildAt(sp, 1)
        })
        .catch(() => {
          const fb = new Graphics().circle(0, -V_TILE * 0.55, 9).fill({ color: 0xd9c26a, alpha: 0.5 })
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
        void Assets.load(k.spriteUrl)
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

  private async buildPlayer(): Promise<void> {
    this.player = new Container()
    if (this.opts.leaderSpriteBase) {
      try {
        const dirs = ['down', 'up', 'left'] as const
        const tex: Record<'down' | 'up' | 'left', Texture[]> = { down: [], up: [], left: [] }
        for (const d of dirs) {
          for (let i = 0; i < 3; i++) {
            tex[d].push(await Assets.load(`${this.opts.leaderSpriteBase}_${d}_${i}.png`))
          }
        }
        this.textures = tex
        const sp = new Sprite(tex.down[1])
        sp.anchor.set(0.5, 0)
        const scale = (V_TILE * 1.15) / sp.height
        sp.scale.set(scale)
        sp.y = -V_TILE * 0.9
        this.playerSprite = sp
        this.player.addChild(sp)
      } catch {
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
