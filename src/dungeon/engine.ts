// 歩行ダンジョンエンジン(品質刷新v3.1 M7a全面改修)
// 公開契約(Dungeon.tsx向け)は不変: ctor/init/setLight/setPaused/pressDir/markUsed/pump/destroy/tileAt/EngineEvents
// 内部は5層構成に刷新: ground(一括ベイク)/water/decal(揺れ草)/mid(props+影+プレイヤー, y-sort)/glow(加算光)
// + スクリーン層: darkness(照明RT)/vignette。灯ゲージが初めて画面に現れる(松明半径連動)。
import { Application, Container, Graphics, Sprite, Texture, Assets } from 'pixi.js'
import type { FloorDef, TileKind } from './types'
import { TILE_CHARS, isWalkable } from './types'
import { themeForBg, type DungeonTheme } from './render/theme'
import { resolveRegionVisual, type DungeonAct } from './render/region_theme'
import { buildLandmark } from './render/landmarks'
import type { GroundKind, LandmarkKind, ParticleKind } from '../core/data/region_visuals'
import { TextureRegistry, vignetteTexture } from './render/textures'
import { buildGround, updateWater, type GroundResult } from './render/ground'
import { buildProps, type PropsResult } from './render/props'
import { LightingSystem } from './render/lighting'
import { shadeArchetypes, createShadeVisual, type ShadeVisual } from './render/shades'
import { Minimap } from './render/minimap'
import { CAM_MAX_SHAKE, cameraTarget, clampCamera, computeZoom, lookAheadOffset, screenToTile } from './camera'
import { Rng } from '../core/rng'
import { SPECIAL_SHADE_RATE, specialShadeUsedKey } from '../core/rare_encounters'
import { getReduceMotion } from '../core/settings'

const TILE = 36 // px(44→36 に縮小: 同画面内タイル数を約1.22倍に広げつつ、プロップ/スプライトの視認性を維持)
const MOVE_MS = 130
const SHADE_BASE_MS = 620
// M24 §4.7: 粒子挙動(particleKind)ごとの降下/上昇スパン(px) — rain/ash/pollenが1周期で移動しきる距離。
// 局所ループ(元位置cx,cyを中心に往復)で表現するため、TILE比の小さな範囲に収める。
const MOTE_RAIN_SPAN = TILE * 1.5
const MOTE_ASH_SPAN = TILE * 1.15
const MOTE_POLLEN_SPAN = TILE * 0.95
// M24 §4.7: 同じくkind別の1周期の長さ(ms)。rainは速い直線、ash/pollenはゆっくり/ゆるい。
const MOTE_RAIN_PERIOD_MS = 560
const MOTE_ASH_PERIOD_MS = 3400
const MOTE_POLLEN_PERIOD_MS = 4200

export interface EngineEvents {
  onStep: (x: number, y: number) => void
  onEncounter: (golden?: boolean) => void // golden=金の敵影(v3.1 M15-5: 実り豊かな獲物)
  onSpecialTile: (kind: TileKind, x: number, y: number) => void
}

export interface EngineOpts {
  bg?: string // region.bg(テーマ解決)
  tier?: 1 | 2 | 3 | 4
  seed?: number // FloorDef.seed(プロップ散布の決定論)
  isBossFloor?: boolean
  familiarReveal?: boolean // v3.1 M16-5: 眷属「宝目」(土)在中 — 開幕にミニマップへ宝箱/石碑を表示
  // M23(指示7): 地域別ビジュアル+四幕+討伐後
  regionId?: string // RegionVisualProfileの解決キー
  act?: DungeonAct // 'norm' | 'dread'(最終前) | 'seat'(ボス階)
  cleared?: boolean // 主討伐済みの再訪(鎮) — 色が緩み敵影も減る
  showLandmark?: boolean // 署名ランドマークを置く(入口フロアのみtrue)
}

interface Shade {
  x: number
  y: number
  visual: ShadeVisual
  cd: number // 次の行動までms
  // 滑らか移動(200msトゥイーン)
  fromX: number
  fromY: number
  moveT: number // 1で完了
  bobPhase: number
  alert: boolean
}

// エンカウント演出の進行状態
interface EncounterFx {
  t: number
  kind: 'normal' | 'boss'
  after: () => void
  irisStarted: boolean
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
  private leader: { gata: string; sex: string; stage?: 'child' | 'adult' | 'elder' } = { gata: 'homura', sex: 'm' }
  private baseScale = 1
  private baseY = TILE * 0.9 // スプライトの接地基準y。bobはこの周りで振動する(0基準だと初回tickで32px浮く)
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
  // 浮遊する光の粒(蛍/精霊のような淡い光)。夜藪の空気感を出す環境要素。
  // M24 §4.7: fallSpanは降下/上昇系(rain/ash/pollen)が1周期で動く距離(px)。他kindは未使用。
  private motes: {
    g: Graphics
    cx: number
    cy: number
    phase: number
    ampX: number
    ampY: number
    fallSpan: number
  }[] = []
  private minimap: Minimap | null = null
  private nightVision = false // 眷属「夜目」(月): 敵影をミニマップに点す
  private readonly nightVisionTiles = 5 // 夜目の敵影検知半径(マス)
  private archetypes: ReturnType<typeof shadeArchetypes> = []
  private fx: EncounterFx | null = null
  private flashG: Graphics | null = null
  private frantic = false // 熱狂の赤い火(M12で発火条件をstore側に実装)
  private stealth = false // 闇夜の目(M16-4: 追跡半径-2)

  // M24: レスポンシブカメラ(world.scaleでズーム。計算はcamera.tsの純粋関数へ集約しテスト済み)
  private zoom = 1
  private laX = 0 // look-ahead(world px): 進行方向へ滑らかに寄せて先を見せる
  private laY = 0
  private backdrop: Graphics | null = null // マップ外の純黒を埋めるscreen固定層

  // M24 §4.3: タップ移動(灯路) — 村エンジン(village/engine.ts)のBFS/path構造を移植
  private path: { x: number; y: number }[] = []
  private visited = new Set<string>() // 発見済み床(Minimap.revealと同半径の簡易複製 — minimap.tsは非所有のため独立管理)
  private tapTargetG: Graphics | null = null
  private tapTargetT = 0 // 目的印のpop-inタイマ(ms)
  private tapTargetLife = 0 // 目的印の残り表示時間(ms)。path追従中は常時表示に保たれる
  private unreachableG: Graphics | null = null
  private unreachableT = 0
  private lightPathG: Graphics | null = null
  private minimapZoomed = false

  private keydown = (e: KeyboardEvent) => {
    const k = keyDir(e.key)
    if (k) {
      e.preventDefault()
      this.held.add(k)
      this.clearPath() // M24 §4.3: 手動移動へ切り替えた瞬間に灯路を消す
    }
  }
  private keyup = (e: KeyboardEvent) => {
    const k = keyDir(e.key)
    if (k) this.held.delete(k)
  }
  private onResize = () => {
    this.applyZoom()
    this.lighting?.resize()
    this.minimap?.reposition(this.app.renderer.width)
    if (this.vignette) {
      this.vignette.width = this.app.renderer.width
      this.vignette.height = this.app.renderer.height
    }
    if (this.backdrop) {
      this.backdrop.width = this.app.renderer.width
      this.backdrop.height = this.app.renderer.height
    }
    this.centerCamera(true)
  }

  private host: HTMLElement
  private floor: FloorDef
  private floorIndex: number
  private events: EngineEvents
  private opts: EngineOpts
  private moteColor = 0xffe79e
  private moteCount = 22
  private landmarkKind: LandmarkKind | null = null
  private groundKind: GroundKind = 'soil' // M24 §4.7: buildGroundへ渡す地面材質
  private particleKind: ParticleKind = 'firefly' // M24 §4.7: motesの挙動分岐キー

  constructor(
    host: HTMLElement,
    floor: FloorDef,
    start: { x: number; y: number } | null,
    usedKeys: string[],
    floorIndex: number,
    events: EngineEvents,
    leader?: { gata: string; sex: string; stage?: 'child' | 'adult' | 'elder' },
    opts?: EngineOpts,
  ) {
    this.host = host
    this.floor = floor
    this.floorIndex = floorIndex
    this.events = events
    this.leader = leader ?? { gata: 'homura', sex: 'm' }
    this.opts = opts ?? {}
    // M23: 基盤テーマ(4系統)の上へ地域プロファイル+幕(畏/座)+鎮(討伐後)を一度だけ被せる
    const rv = resolveRegionVisual(
      themeForBg(this.opts.bg ?? 'bg_forest'),
      this.opts.regionId,
      this.opts.act ?? 'norm',
      !!this.opts.cleared,
    )
    this.theme = rv.theme
    this.moteColor = rv.mote
    this.moteCount = rv.moteCount
    this.landmarkKind = rv.landmark
    this.groundKind = rv.groundKind
    this.particleKind = rv.particleKind
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
    this.markVisited(this.px, this.py) // M24 §4.3: 開始地点も発見済みにしておく
  }

  private parse(): void {
    const rows = this.floor.ascii
    const w = Math.max(...rows.map((r) => r.length))
    this.grid = rows.map((r) =>
      Array.from({ length: w }, (_, i) => TILE_CHARS[r[i] ?? '#'] ?? 'wall'),
    )
  }

  // 署名ランドマークの置き場: 入口の周囲(距離2〜4)の壁セルで、歩行可の隣を2つ以上持つ場所。
  // プロップと同じ「壁沿いの飾り」文法に従い、通路は塞がない。
  private findLandmarkSpot(): { x: number; y: number } | null {
    const e = this.findTile('entrance')
    if (!e) return null
    let best: { x: number; y: number } | null = null
    let bestScore = -1
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy))
        if (d < 2) continue
        const x = e.x + dx
        const y = e.y + dy
        if (isWalkable(this.tileAt(x, y))) continue
        if (this.tileAt(x, y) !== 'wall') continue
        let open = 0
        for (const [ox, oy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          if (isWalkable(this.tileAt(x + ox, y + oy))) open += 1
        }
        if (open < 2) continue
        const score = open * 10 - d // 開けた壁際を優先し、入口に近いほどよい
        if (score > bestScore) {
          bestScore = score
          best = { x, y }
        }
      }
    }
    return best
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

    // M24: 地域別backdrop — マップ外の純黒を埋めるscreen固定層(worldより背面)。
    // groundBaseより明度を+12した藍で、暗さは保ちつつ「説明のない純黒面」を消す(§4.1)。
    const bd = new Graphics().rect(0, 0, 1, 1).fill(lift(this.theme.groundBase, 12))
    bd.width = this.app.renderer.width
    bd.height = this.app.renderer.height
    this.backdrop = bd
    this.app.stage.addChild(bd)

    // レイヤー構成
    this.world.addChild(this.layerGround, this.layerWater, this.layerDecal, this.layerMid, this.layerGlow)
    this.layerMid.sortableChildren = true
    this.app.stage.addChild(this.world)

    this.registry = new TextureRegistry(this.app.renderer)
    const seed = this.opts.seed ?? (this.floorIndex + 1) * 7919

    // 地面(一括ベイク)+水面。M24 §4.7: 地域のgroundKindで局所模様を分岐
    this.groundData = buildGround(this.grid, TILE, this.theme, seed, this.groundKind)
    this.layerGround.addChild(this.groundData.ground)
    if (this.groundData.water) this.layerWater.addChild(this.groundData.water)

    // プロップ+特殊タイル標識
    this.propsData = buildProps(
      this.grid, TILE, this.theme, seed, this.registry, this.used, this.floorIndex, !!this.opts.isBossFloor,
    )
    for (const sp of this.propsData.sprites) this.layerMid.addChild(sp)

    // M23: 署名ランドマーク — 入口フロアの入口近くに一度だけ置く(VISUAL §7.1)
    if (this.landmarkKind && this.opts.showLandmark) {
      const spot = this.findLandmarkSpot()
      if (spot) {
        const lm = buildLandmark(this.landmarkKind, this.theme, TILE)
        lm.position.set(spot.x * TILE + TILE / 2, spot.y * TILE + TILE * 0.92)
        lm.zIndex = lm.position.y
        this.layerMid.addChild(lm)
      }
    }

    // 揺れる草(decal層・上限60)
    const tuftTex = this.registry.make('tuft', (g) => {
      g.moveTo(0, 0).lineTo(-2, -9).lineTo(-0.6, -1).closePath().fill({ color: this.theme.grass, alpha: 0.95 })
      g.moveTo(1, 0).lineTo(2.5, -11).lineTo(2.2, -1).closePath().fill({ color: this.theme.grass, alpha: 0.85 })
      g.moveTo(3, 0).lineTo(6, -8).lineTo(4.4, -0.5).closePath().fill({ color: this.theme.grass, alpha: 0.9 })
    })
    const tuftRng = new Rng(seed ^ 0x5f3759df)
    // 草むら密度: 草cellが十分あれば100、不足なら全て使う。マップの生き生きした印象が上がる
    const grassPool = tuftRng.shuffle(this.groundData.grassCells)
    for (const { x, y } of grassPool.slice(0, Math.min(100, grassPool.length))) {
      const sp = new Sprite(tuftTex)
      sp.anchor.set(0.5, 1)
      sp.position.set(x * TILE + TILE / 2 + tuftRng.int(-8, 8), y * TILE + TILE - tuftRng.int(2, 10))
      this.layerDecal.addChild(sp)
      this.tufts.push({ sp, phase: tuftRng.next() * Math.PI * 2 })
    }
    // 環境の浮遊光粒(蛍/精霊のような点) — 歩行可タイルから20〜24個散布
    // grassCellsに依存せず、gridから直接列挙(森以外の地域=草cell少でも配置される)
    const walkableCells: { x: number; y: number }[] = []
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        if (isWalkable(this.grid[y][x])) walkableCells.push({ x, y })
      }
    }
    const moteCells = tuftRng.shuffle(walkableCells).slice(0, Math.min(this.moteCount, walkableCells.length))
    // M24 §4.7: kindごとの降下/上昇スパン(rain/ash/pollen以外は未使用の0のまま)
    const fallSpanByKind: Record<ParticleKind, number> =
      { firefly: 0, rain: MOTE_RAIN_SPAN, ash: MOTE_ASH_SPAN, fog: 0, pollen: MOTE_POLLEN_SPAN, stardust: 0 }
    const fallSpan = fallSpanByKind[this.particleKind]
    for (const { x, y } of moteCells) {
      const g = new Graphics()
      g.circle(0, 0, 2.5).fill({ color: this.moteColor, alpha: 0.9 })
      g.blendMode = 'add'
      const cx = x * TILE + TILE / 2 + tuftRng.int(-6, 6)
      const cy = y * TILE + TILE / 2 - tuftRng.int(0, 10)
      g.position.set(cx, cy)
      this.layerGlow.addChild(g)
      this.motes.push({
        g, cx, cy, phase: tuftRng.next() * Math.PI * 2,
        ampX: 4 + tuftRng.next() * 6, ampY: 3 + tuftRng.next() * 5, fallSpan,
      })
    }

    // プレイヤー — 灯型×性別の切り絵シルエット歩行スプライト(読めなければ灯印で代替)
    this.player = new Container()
    const shadowTex = this.registry.make('pshadow', (g) => {
      g.ellipse(0, 0, 12.5, 5).fill({ color: 0x000000, alpha: 0.5 })
    })
    this.playerShadow = new Sprite(shadowTex)
    this.playerShadow.anchor.set(0.5)
    // 影は足元に敷く(sprite: anchor(0.5,0.78)/y=TILE*0.9/height=TILE*1.6 → 接地線≈TILE*1.25)。
    // 旧値 TILE*0.88 は足から13px浮いており「宙に浮いて見える」原因だった。
    this.playerShadow.position.set(TILE / 2, TILE * 1.24)
    this.player.addChild(this.playerShadow)
    try {
      const base = import.meta.env.BASE_URL
      const { gata, sex, stage } = this.leader
      // 老いた当主は老い姿(walke_*)で歩く。シート未生成なら成人姿へ静かに退避(M17)
      const prefix = stage === 'elder' ? 'walke' : stage === 'child' ? 'walkc' : 'walk'
      for (const dir of ['down', 'up', 'left']) {
        this.walkTex[dir] = await Promise.all(
          [0, 1, 2].map((i) => Assets.load<Texture>(`${base}img/sprites/${prefix}_${gata}_${sex}_${dir}_${i}.png`)),
        ).catch(() =>
          Promise.all(
            [0, 1, 2].map((i) => Assets.load<Texture>(`${base}img/sprites/walk_${gata}_${sex}_${dir}_${i}.png`)),
          ),
        )
      }
      // M29修正: スプライトのawait中にdestroy()が走ると、破棄済みapp/containerへ以降の
      // addChild/ticker.add/stage参照が及びクラッシュ+テクスチャ孤児化する。village engineと
      // 同じく2つ目のawaitギャップにもガードを置く(1つ目は init 側で既にガード済み)。
      if (this.destroyed) return
      const sp = new Sprite(this.walkTex.down[1])
      sp.anchor.set(0.5, 0.78)
      sp.height = TILE * 1.6
      sp.scale.x = sp.scale.y
      this.baseScale = sp.scale.y
      sp.x = TILE / 2
      sp.y = this.baseY
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

    // 敵影(妖怪シルエット: 地域tierの主属性2種+稀に金の変種)
    // UX調整: フロア定義よりも実生成数を2減、下限2で快適な密度に(データは不変・要再バランス時のみ調整)
    this.archetypes = shadeArchetypes(this.opts.tier ?? 1)
    // 討伐後(鎮)の再訪は魔性が薄れる(M23 指示7 V3 — 光と密度の変化。採取物は未実装)
    const shadeBase = Math.max(2, this.floor.shades - 2)
    const shadeCount = this.opts.cleared ? Math.max(1, shadeBase - 2) : shadeBase
    // 敵影の初期配置はfloor seedで決定論化する。戦闘往復の再mountで特殊影を再抽選できない。
    const shadeRng = new Rng(((this.opts.seed ?? this.floor.seed ?? this.floorIndex + 1) ^ 0x51ad3e7b) >>> 0)
    const specialSpent = this.used.has(specialShadeUsedKey(this.floorIndex))
    const goldenIdx = !specialSpent && shadeRng.chance(SPECIAL_SHADE_RATE) ? shadeRng.int(0, shadeCount - 1) : -1
    for (let i = 0; i < shadeCount; i++) this.spawnShade(i === goldenIdx, shadeRng)

    // ミニマップ(訪問霧)
    this.minimap = new Minimap(this.grid)
    this.screenFx.addChild(this.minimap.container)
    this.minimap.reposition(this.app.renderer.width)
    this.minimap.reveal(this.px, this.py)
    // 眷属「宝目」(土, M16-5): 随行中なら開幕に宝箱/石碑の在処を示す
    if (this.opts.familiarReveal) this.minimap.revealSpecials()
    // 眷属「夜目」(月, M16-5→実効化): 随行中なら敵影検知を有効化(setNightVisionが先に来ても反映)
    this.minimap.setNightVision(this.nightVision ? this.nightVisionTiles : 0)

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

    // M24 §4.3: 灯路(タップ移動の可視化)の描画先。以後は毎tick再描画する。
    this.lightPathG = new Graphics()
    this.layerGlow.addChild(this.lightPathG)

    this.app.ticker.add((t) => this.tick(t.deltaMS))
    window.addEventListener('keydown', this.keydown)
    window.addEventListener('keyup', this.keyup)
    // M24 §4.3: タップ移動 — 村エンジン(village/engine.ts)のBFS/pathを移植し、screenToTile(camera.ts)でタイル化する。
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = { contains: () => true }
    this.app.stage.on('pointertap', (e) => {
      const { tx, ty } = screenToTile(e.global.x, e.global.y, this.world.x, this.world.y, this.zoom, TILE)
      this.tapMove(tx, ty)
    })
    this.app.renderer.on('resize', this.onResize)
    this.applyZoom()
    this.centerCamera(true)
  }

  private spawnShade(golden: boolean, rng: Pick<Rng, 'int' | 'next' | 'pick'>): void {
    if (!this.registry) return
    let x = 0
    let y = 0
    let guard = 0
    do {
      y = rng.int(1, this.grid.length - 2)
      x = rng.int(1, this.grid[0].length - 2)
      guard++
    } while ((!isWalkable(this.tileAt(x, y)) || dist(x, y, this.px, this.py) < 6) && guard < 200)
    if (guard >= 200) return

    const archetype = (this.archetypes.length > 0 ? rng.pick(this.archetypes) : undefined) ?? {
      species: 'beast' as const,
      accent: 0xff9d45,
    }
    const visual = createShadeVisual(this.registry, TILE, this.opts.tier ?? 1, archetype, golden)
    visual.node.x = x * TILE
    visual.node.y = y * TILE
    visual.node.zIndex = visual.node.y + TILE
    this.layerMid.addChild(visual.node)
    this.shades.push({
      x, y, visual,
      cd: rng.next() * SHADE_BASE_MS,
      fromX: x, fromY: y, moveT: 1,
      bobPhase: rng.next() * Math.PI * 2,
      alert: false,
    })
  }

  setLight(pct: number): void {
    this.lightPct = pct
    this.lighting?.setLightPct(pct)
  }

  /** フロア探索進度(0〜1)。訪問済み歩行タイル÷歩行可総数。 */
  exploreRatio(): number {
    return this.minimap?.exploreRatio() ?? 0
  }

  setPaused(p: boolean): void {
    this.paused = p
  }

  pressDir(dir: string, down: boolean): void {
    if (down) {
      this.held.add(dir)
      this.clearPath() // M24 §4.3: 手動移動(D-pad)へ切り替えた瞬間に灯路を消す
    } else this.held.delete(dir)
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
      // 浮遊光粒: kind(particleKind)ごとに位置/透明度の式を切り替える(M24 §4.7)。
      // reduced-motion時は挙動を問わず静止表示(位置固定・alpha一定)に落とす。
      const moteRm = getReduceMotion()
      for (const m of this.motes) {
        if (moteRm) {
          m.g.position.set(m.cx, m.cy)
          m.g.alpha = 0.75
          continue
        }
        switch (this.particleKind) {
          case 'rain': {
            // 雨: 上→下の速い直線移動。1周期で下端に達したら上へ再生(cycが0に戻る)
            const cyc = ((this.time + m.phase * 300) % MOTE_RAIN_PERIOD_MS) / MOTE_RAIN_PERIOD_MS
            m.g.position.set(m.cx, m.cy - m.fallSpan / 2 + cyc * m.fallSpan)
            m.g.alpha = 0.6 + 0.2 * Math.sin(this.time / 500 + m.phase)
            break
          }
          case 'ash': {
            // 灰: ゆっくり下降(rainと同じ往復だが周期が長い)+横流れ
            const cyc = ((this.time + m.phase * 300) % MOTE_ASH_PERIOD_MS) / MOTE_ASH_PERIOD_MS
            m.g.position.set(
              m.cx + Math.sin(this.time / 1400 + m.phase) * m.ampX,
              m.cy - m.fallSpan / 2 + cyc * m.fallSpan,
            )
            m.g.alpha = 0.45 + 0.25 * Math.sin(this.time / 700 + m.phase)
            break
          }
          case 'fog': {
            // 霧: 大きく薄い横移動。縦はごくわずかに留め「漂い」を強調
            m.g.position.set(
              m.cx + Math.sin(this.time / 2400 + m.phase) * m.ampX * 2.4,
              m.cy + Math.sin(this.time / 3100 + m.phase) * m.ampY * 0.4,
            )
            m.g.alpha = 0.2 + 0.14 * Math.sin(this.time / 1800 + m.phase)
            break
          }
          case 'pollen': {
            // 花粉: ゆるい上昇漂い(fallSpan分を上へ往復)+ 弱い横ブレ
            const cyc = ((this.time + m.phase * 300) % MOTE_POLLEN_PERIOD_MS) / MOTE_POLLEN_PERIOD_MS
            m.g.position.set(
              m.cx + Math.sin(this.time / 1300 + m.phase) * m.ampX * 0.7,
              m.cy + m.fallSpan / 2 - cyc * m.fallSpan,
            )
            m.g.alpha = 0.5 + 0.3 * Math.sin(this.time / 900 + m.phase)
            break
          }
          case 'stardust': {
            // 星屑: 位置はほぼ固定(小さな揺れ)、alphaを鋭くパルスさせ「瞬き」を表現
            const t = this.time / 900 + m.phase
            m.g.position.set(m.cx + Math.sin(t) * m.ampX * 0.5, m.cy + Math.cos(t * 0.7) * m.ampY * 0.5)
            m.g.alpha = 0.1 + 0.85 * Math.max(0, Math.sin(this.time / 260 + m.phase * 3)) ** 3
            break
          }
          case 'firefly':
          default: {
            // 蛍(既定): 現状のまま — 呼吸するような浮遊
            const t = this.time / 900 + m.phase
            m.g.position.set(m.cx + Math.sin(t) * m.ampX, m.cy + Math.cos(t * 0.7) * m.ampY)
            m.g.alpha = 0.55 + 0.4 * Math.sin(this.time / 600 + m.phase)
            break
          }
        }
      }
    }
    if (this.groundData?.water) {
      this.waterT += dms
      if (this.waterT >= 125) {
        this.waterT = 0
        updateWater(this.groundData.water, this.groundData.waterPools, TILE, this.theme, this.time)
      }
    }
    // look-ahead: 移動中は進行方向へ1.2タイル先を滑らかに見せ、停止で0へ戻す(§4.1)
    const laDir = this.moving ? DIRS[this.facing] : null
    const laTarget = laDir ? lookAheadOffset(laDir[0], laDir[1], TILE, 1.2) : { x: 0, y: 0 }
    this.laX += (laTarget.x - this.laX) * 0.06
    this.laY += (laTarget.y - this.laY) * 0.06

    this.lighting?.update(dms, this.world.x, this.world.y, this.zoom)
    this.minimap?.setFacing(this.facing as 'up' | 'down' | 'left' | 'right')
    this.minimap?.update(this.time, this.nightVision ? this.shades : undefined)

    // エンカウント演出中: 白閃2連→虹彩暗転→コールバック(入力/AIは凍結)
    if (this.fx) {
      const fx = this.fx
      fx.t += dms
      if (this.flashG) {
        const t = fx.t
        const color = fx.kind === 'boss' ? 0xc73e3a : 0xffffff
        const a = t < 70 ? 0.85 : t < 130 ? 0 : t < 200 ? 0.7 : 0
        this.flashG.clear()
        if (a > 0) {
          this.flashG.rect(0, 0, this.app.renderer.width, this.app.renderer.height).fill({ color, alpha: a })
        }
      }
      if (!fx.irisStarted && fx.t >= 140) {
        fx.irisStarted = true
        this.lighting?.startIris(300, () => {
          this.fx = null
          this.flashG?.clear()
          fx.after()
        })
      }
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dms * 0.03)
      this.centerCamera()
      return
    }

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
        // 歩行中は微かな縦揺れ(足取り)+ 待機bobをリセット
        this.playerSprite.y = this.baseY + Math.sin(this.animT / 65) * 0.9
        this.playerSprite.scale.y = this.baseScale
        this.groundShadow()
      }
      if (t >= 1) {
        this.moving = false
        this.moveFrom = null
        this.arrive(this.px, this.py)
      }
    } else if (this.playerSprite) {
      // 停止時にも歩行3コマを緩やかに循環し「キャラが息づいてる」印象に。
      // 歩行時は 130ms/frame の速いパターン、待機時は 720ms/frame の緩やかなパターンで frame 0→1→2→1 を巡回。
      this.animT += dms
      const idleFrame = [1, 0, 1, 2][Math.floor(this.animT / 720) % 4]
      this.applyFacing(idleFrame)
      // 呼吸bob(縦揺れ+scaleY)
      this.playerSprite.y = this.baseY + Math.sin(this.time / 380) * 1.4
      this.playerSprite.scale.y = this.baseScale * (1 + Math.sin(this.time / 620) * 0.02)
      this.groundShadow()
    }
    // プレイヤー移動開始(手動優先。手動が無ければタップ経路[灯路]を追従 — M24 §4.3)
    if (!this.moving && this.held.size > 0) {
      const dir = [...this.held][this.held.size - 1]
      const [dx, dy] = DIRS[dir]
      this.tryMove(dx, dy)
    } else if (!this.moving && this.path.length > 0) {
      const next = this.path[0]
      this.tryMove(Math.sign(next.x - this.px), Math.sign(next.y - this.py))
      this.path.shift() // 歩くたび後ろから消す(§4.3) — 描画はrenderLightPathが毎tick再構築する
    }
    this.renderLightPath()
    this.renderTapMarkers(dms)
    // プレイヤー光源の追従
    this.lighting?.setPlayerPos(this.player.x + TILE / 2, this.player.y + TILE * 0.62)

    // カメラ振動の減衰
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dms * 0.03)

    // 敵影AI(判断はタイル単位のまま、描画は200msトゥイーン+浮遊ボブ)
    // 熱狂の赤い火(frantic)中は凶暴化(M12でstore側から発火)
    const franticK = this.frantic ? 0.75 : 1
    const speedMult = (this.lightPct <= 0 ? 0.45 : this.lightPct < 40 ? 0.7 : 1) * franticK
    for (const s of this.shades) {
      // 滑らか移動
      if (s.moveT < 1) {
        s.moveT = Math.min(1, s.moveT + dms / 200)
        const t = s.moveT
        s.visual.node.x = (s.fromX + (s.x - s.fromX) * t) * TILE
        s.visual.node.y = (s.fromY + (s.y - s.fromY) * t) * TILE
        s.visual.node.zIndex = s.visual.node.y + TILE
      }
      s.visual.bob(this.time, s.bobPhase)

      s.cd -= dms
      if (s.cd > 0) continue
      const near = dist(s.x, s.y, this.px, this.py)
      // 金の敵影は追わず逃げる(速い)。通常種は灯が細るほど遠くから追う。
      const chaseRange = Math.max(2, (this.lightPct < 40 ? 6 : 4) + (this.frantic ? 2 : 0) - (this.stealth ? 2 : 0))
      const chase = !s.visual.golden && near <= chaseRange
      const flee = s.visual.golden && near <= 6
      // 「!」テレグラフは追跡開始の1マス前から出す(急襲の理不尽さを緩和し、moon夜目非所持でも予兆で警戒可能)
      const alerted = !s.visual.golden && near <= chaseRange + 1
      s.cd = SHADE_BASE_MS * speedMult * (s.visual.golden ? 0.55 : chase ? 0.75 : 1) * (0.8 + Math.random() * 0.4)
      if (alerted !== s.alert) {
        s.alert = alerted
        s.visual.setAlert(alerted)
      }
      let dx = 0
      let dy = 0
      if (chase || flee) {
        const sign = flee ? -1 : 1
        dx = Math.sign(this.px - s.x) * sign
        dy = Math.sign(this.py - s.y) * sign
        if (dx !== 0 && dy !== 0) {
          if (Math.random() < 0.5) dx = 0
          else dy = 0
        }
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
        const golden = s.visual.golden
        this.removeShade(s)
        this.startEncounterFx('normal', () => this.events.onEncounter(golden))
        return
      }
    }
  }

  // 白閃2連+振動+虹彩暗転 → after(店側でbattle遷移)。演出中は入力/AI凍結。
  private startEncounterFx(kind: 'normal' | 'boss', after: () => void): void {
    if (this.fx) return
    if (!this.flashG) {
      this.flashG = new Graphics()
      this.screenFx.addChild(this.flashG)
    }
    this.held.clear()
    this.clearPath() // M24 §4.3: エンカウントfx中はpathを保持しない
    this.shake = 9
    this.fx = { t: 0, kind, after, irisStarted: false }
  }

  // 熱狂の赤い火(M12): 敵影凶暴化+松明が緋に燃える
  setFrantic(on: boolean): void {
    this.frantic = on
    this.lighting?.setPlayerTint(on ? 0xff5a3a : this.theme.torchTint)
  }

  // 闇夜の目(M16-4): 敵影に気取られにくくなる
  setStealth(on: boolean): void {
    this.stealth = on
  }

  // 眷属「夜目」(月, M16-5→実効化): ミニマップに敵影を検知半径内で点す
  setNightVision(on: boolean): void {
    this.nightVision = on
    this.minimap?.setNightVision(on ? this.nightVisionTiles : 0)
  }

  // 接地影の呼吸連動 — 身体が浮いた分だけ影を締める(接地感)
  private groundShadow(): void {
    if (!this.playerShadow || !this.playerSprite) return
    const liftAmt = Math.max(0, this.baseY - this.playerSprite.y) // 基準から上に浮いた px
    const k = Math.max(0.82, 1 - liftAmt * 0.05)
    this.playerShadow.scale.set(k)
    this.playerShadow.alpha = 1 - liftAmt * 0.08
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
    this.layerMid.removeChild(s.visual.node)
    s.visual.node.destroy({ children: true })
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
    this.minimap?.reveal(x, y)
    this.markVisited(x, y) // M24 §4.3: 灯路表示用の発見済み床
    // 敵影との接触
    const hit = this.shades.find((s) => s.x === x && s.y === y)
    if (hit) {
      const golden = hit.visual.golden
      this.removeShade(hit)
      this.startEncounterFx('normal', () => this.events.onEncounter(golden))
      return
    }
    const kind = this.tileAt(x, y)
    if (kind === 'chest' || kind === 'camp' || kind === 'shrine' || kind === 'stairs' || kind === 'entrance' || kind === 'boss' || kind === 'monument') {
      // M29修正: bossも使用済み判定に含める(討伐後のsealBossで使用済み化され、再踏で演出が空発火しない)
      if ((kind === 'chest' || kind === 'camp' || kind === 'shrine' || kind === 'monument' || kind === 'boss') && this.used.has(`${this.floorIndex}:${x}:${y}`)) return
      if (kind === 'boss') {
        // ボスは緋の閃光で威圧してから対峙
        this.startEncounterFx('boss', () => this.events.onSpecialTile(kind, x, y))
        return
      }
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

  /** M29修正: 主討伐後にボス床(6マス塊)を全て使用済み化し、据え置きだった主光源も消す。
   *  これをしないと討伐後もボス床を踏む度に戦闘演出(閃光/振動/暗転+入力凍結)が空発火する。
   *  Dungeon.tsxが run.bossDown の立ち上がりで一度だけ呼ぶ。冪等。 */
  sealBoss(): void {
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        if (this.grid[y][x] === 'boss') this.used.add(`${this.floorIndex}:${x}:${y}`)
      }
    }
    this.lighting?.dim('boss')
  }

  /** 下り階段が発見済みか(短期目的表示用 — M24 §4.5)。Dungeon.tsx側から500ms間隔でpollされる想定。 */
  stairsFound(): boolean {
    const s = this.findTile('stairs')
    return !!s && this.visited.has(`${s.x}:${s.y}`)
  }

  /** ミニマップの拡大表示を切り替える(M24 §4.6)。Minimap.containerは公開フィールドのため、
   *  minimap.ts自体は編集せず外側からscale/位置だけ操作する(右上端を基準に保つ)。 */
  toggleMinimapZoom(): void {
    const c = this.minimap?.container
    if (!c) return
    const beforeW = c.width
    const rightEdge = c.x + beforeW
    this.minimapZoomed = !this.minimapZoomed
    c.scale.set(this.minimapZoomed ? 2.2 : 1)
    c.x = rightEdge - c.width
  }

  // ---- M24 §4.3: タップ移動(灯路)。村エンジン(village/engine.ts)のBFS/pathを移植 ----

  // 発見済み床の記録(Minimap.revealと同半径の簡易複製)。minimap.tsは非所有のため独立して持つ。
  private markVisited(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (isWalkable(this.tileAt(nx, ny))) this.visited.add(`${nx}:${ny}`)
      }
    }
  }

  private clearPath(): void {
    this.path = []
    this.lightPathG?.clear()
    if (this.tapTargetG) this.tapTargetG.visible = false
  }

  private tapMove(tx: number, ty: number): void {
    if (this.fx) return // エンカウントfx中はタップ無視(§4.3)
    const w = this.grid[0]?.length ?? 0
    const h = this.grid.length
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) {
      this.showUnreachable(tx, ty)
      return
    }

    // 目標が塞がっていれば隣接歩行タイルへ(村エンジンと同型)
    const targets: { x: number; y: number }[] = []
    if (isWalkable(this.tileAt(tx, ty))) targets.push({ x: tx, y: ty })
    else {
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        if (isWalkable(this.tileAt(tx + dx, ty + dy))) targets.push({ x: tx + dx, y: ty + dy })
      }
    }
    if (targets.length === 0) {
      this.showUnreachable(tx, ty)
      return
    }

    // BFS(村エンジンのtapMoveと同構造)
    const key = (x: number, y: number) => y * w + x
    const startKey = key(this.px, this.py)
    const goal = new Set(targets.map((t) => key(t.x, t.y)))
    const prev = new Map<number, number>()
    const queue: [number, number][] = [[this.px, this.py]]
    prev.set(startKey, -1)
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
        if (!isWalkable(this.tileAt(nx, ny)) || prev.has(key(nx, ny))) continue
        prev.set(key(nx, ny), key(cx, cy))
        queue.push([nx, ny])
      }
    }
    if (found < 0) {
      this.showUnreachable(tx, ty)
      return
    }

    const rev: { x: number; y: number }[] = []
    let cur = found
    while (cur !== startKey) {
      rev.push({ x: cur % w, y: Math.floor(cur / w) })
      cur = prev.get(cur)!
    }
    this.path = rev.reverse()
    this.held.clear() // タップ優先 — 手動キーの押しっぱなしを解除する
    this.showTapTarget(tx, ty) // 到達可能と確定してから目的印を出す(100ms以内)
  }

  // タップ地点へ命火色の目的印(§4.3)。到達可能と分かった時のみ呼ばれる。
  private showTapTarget(tx: number, ty: number): void {
    if (!this.tapTargetG) {
      this.tapTargetG = new Graphics()
      this.layerGlow.addChild(this.tapTargetG)
    }
    const g = this.tapTargetG
    g.clear()
    g.circle(0, 0, 7).stroke({ color: 0xff9d45, width: 2, alpha: 0.95 })
    g.circle(0, 0, 2.4).fill({ color: 0xff9d45, alpha: 0.95 })
    g.position.set(tx * TILE + TILE / 2, ty * TILE + TILE * 0.62)
    g.visible = true
    this.tapTargetT = 0
    this.tapTargetLife = 700
  }

  // 到達不能タップ→傷朱の割れ印(§4.3)。無反応にしないためのフィードバック。
  private showUnreachable(tx: number, ty: number): void {
    if (!this.unreachableG) {
      this.unreachableG = new Graphics()
      this.layerGlow.addChild(this.unreachableG)
    }
    const g = this.unreachableG
    g.clear()
    g.moveTo(-6, -9).lineTo(2, -2).lineTo(-3, 1).lineTo(3, 9).stroke({ color: 0xc73e3a, width: 2, alpha: 0.95 })
    g.circle(0, 0, 9).stroke({ color: 0xc73e3a, alpha: 0.5, width: 1.4 })
    g.position.set(tx * TILE + TILE / 2, ty * TILE + TILE * 0.62)
    g.visible = true
    g.alpha = 0.95
    this.unreachableT = 0
  }

  // 灯路本体 — 発見済み(visited)の連続区間だけを先頭から最大7マス描く。歩くたび後ろから消える。
  private renderLightPath(): void {
    if (!this.lightPathG) return
    const g = this.lightPathG
    g.clear()
    if (this.path.length === 0) return
    const segment: { x: number; y: number }[] = []
    for (const p of this.path) {
      if (segment.length >= 7 || !this.visited.has(`${p.x}:${p.y}`)) break
      segment.push(p)
    }
    const rm = getReduceMotion()
    segment.forEach((p, i) => {
      const cx = p.x * TILE + TILE / 2
      const cy = p.y * TILE + TILE * 0.75
      const fade = 1 - i / Math.max(4, segment.length)
      if (rm) {
        // reduced-motion: 点線を静的表示(脈動なし)
        g.circle(cx, cy, 2.6).fill({ color: 0xff9d45, alpha: 0.35 + 0.35 * fade })
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(this.time / 260 - i * 0.9)
        g.circle(cx, cy, 2.2 + pulse * 1.3).fill({ color: 0xff9d45, alpha: (0.3 + 0.4 * fade) * (0.6 + 0.4 * pulse) })
      }
    })
  }

  // 目的印のpop-in/生存時間、割れ印のフェードを進める(§4.3)
  private renderTapMarkers(dms: number): void {
    const rm = getReduceMotion()
    if (this.tapTargetG) {
      this.tapTargetT += dms
      if (this.tapTargetLife > 0) this.tapTargetLife -= dms
      const alive = this.path.length > 0 || this.tapTargetLife > 0
      this.tapTargetG.visible = alive
      if (alive) {
        const k = rm ? 1 : Math.min(1, this.tapTargetT / 100) // 100ms以内にpop-in(§4.3)
        this.tapTargetG.scale.set(k)
        this.tapTargetG.alpha = rm ? 0.9 : 0.8 + Math.sin(this.time / 140) * 0.2
      }
    }
    if (this.unreachableG?.visible) {
      this.unreachableT += dms
      const life = 650
      this.unreachableG.alpha = rm
        ? (this.unreachableT >= life ? 0 : 0.95)
        : Math.max(0, 0.95 * (1 - this.unreachableT / life))
      if (this.unreachableT >= life) this.unreachableG.visible = false
    }
  }

  // world.scaleをレスポンシブzoomへ設定(PC横22-26/モバイル横10-12タイル)。camera.tsで検証済み。
  private mapW(): number {
    return this.grid[0]?.length ?? 0
  }
  private mapH(): number {
    return this.grid.length
  }

  private applyZoom(): void {
    // M25 §3.1: 高さ項を含む(旧実装はviewWのみを見ており、768×1024でマップ高がビューポートに
    // 届かず黒帯31%が構造的に発生していた — clampでは1pxも減らせない)
    this.zoom = computeZoom(
      this.app.renderer.width,
      this.app.renderer.height,
      TILE,
      this.mapW(),
      this.mapH(),
    )
    this.world.scale.set(this.zoom)
  }

  private centerCamera(snap = false): void {
    const vw = this.app.renderer.width
    const vh = this.app.renderer.height
    // zoom込みのカメラ目標(cameraTarget)。lighting穴のholeHalfResPosと同じ式で整合する。
    const t = cameraTarget(this.player.x + TILE / 2, this.player.y + TILE / 2, vw, vh, this.zoom, this.laX, this.laY)
    // M25 §3.1: look-ahead後の座標へマップ境界クランプを掛ける(先にclampしてからlook-aheadを足さない)
    const c = clampCamera(t, vw, vh, this.zoom, TILE, this.mapW(), this.mapH())
    // 揺れはclamp後に最大4pxだけ(マップ外を大きく露出させない)
    const s = Math.min(this.shake, CAM_MAX_SHAKE)
    const jx = s > 0 ? (Math.random() * 2 - 1) * s : 0
    const jy = s > 0 ? (Math.random() * 2 - 1) * s : 0
    const tx = c.x + jx
    const ty = c.y + jy
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

// M24: 色を明度側へ持ち上げる(0-255各チャンネル)。backdropを純黒より明るい藍にする。
function lift(color: number, amt: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + amt)
  const g = Math.min(255, ((color >> 8) & 0xff) + amt)
  const b = Math.min(255, (color & 0xff) + amt)
  return (r << 16) | (g << 8) | b
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}
