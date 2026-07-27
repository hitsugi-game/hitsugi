import { Container, Graphics } from 'pixi.js'
import type { RegionStageContract } from '../../core/data/region_stage_contracts'
import type { TileKind } from '../types'
import { isWalkable } from '../types'

interface PooledGraphic {
  graphic: Graphics
  x: number
  y: number
  phase: number
}

export interface Ar1HotarubiStage {
  ground: Container
  mid: Container
  foreground: Container
  effects: Container
  setPlayerPosition: (worldX: number, worldY: number) => void
  setRareTelegraph: (worldX: number, worldY: number, visible: boolean) => void
  update: (elapsedMs: number, reducedMotion: boolean) => void
  budget: Readonly<{
    staticGraphics: number
    textures: number
    poiMarkers: number
    telegraphs: number
    embers: number
    rings: number
    mist: number
    terrainMarks: number
    edgeReeds: number
  }>
}

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

function drawHorizontalRuns(
  graphic: Graphics,
  grid: TileKind[][],
  tile: number,
  predicate: (kind: TileKind) => boolean,
  color: number,
): void {
  for (let y = 0; y < grid.length; y++) {
    let start = -1
    for (let x = 0; x <= grid[y].length; x++) {
      const included = x < grid[y].length && predicate(grid[y][x])
      if (included && start < 0) start = x
      if (!included && start >= 0) {
        // One run, one fill: no inset, stroke, or per-cell gap that can create checkerboard seams.
        graphic.rect(start * tile, y * tile, (x - start) * tile + 0.35, tile + 0.35).fill(color)
        start = -1
      }
    }
  }
}

type Edge = 'top' | 'right' | 'bottom' | 'left'

const EDGE_OFFSETS: ReadonlyArray<{ edge: Edge; dx: number; dy: number }> = [
  { edge: 'top', dx: 0, dy: -1 },
  { edge: 'right', dx: 1, dy: 0 },
  { edge: 'bottom', dx: 0, dy: 1 },
  { edge: 'left', dx: -1, dy: 0 },
]

/** Draws only material boundaries; the TileKind grid remains the sole collision source. */
function drawMaterialEdges(
  graphic: Graphics,
  grid: TileKind[][],
  tile: number,
  source: (kind: TileKind) => boolean,
  exposedTo: (kind: TileKind) => boolean,
  color: number,
  width: number,
  alpha: number,
): void {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (!source(grid[y][x])) continue
      for (const { edge, dx, dy } of EDGE_OFFSETS) {
        const neighbor = grid[y + dy]?.[x + dx] ?? 'wall'
        if (!exposedTo(neighbor)) continue
        const x0 = x * tile
        const y0 = y * tile
        if (edge === 'top') graphic.moveTo(x0, y0).lineTo(x0 + tile, y0)
        else if (edge === 'right') graphic.moveTo(x0 + tile, y0).lineTo(x0 + tile, y0 + tile)
        else if (edge === 'bottom') graphic.moveTo(x0 + tile, y0 + tile).lineTo(x0, y0 + tile)
        else graphic.moveTo(x0, y0 + tile).lineTo(x0, y0)
      }
    }
  }
  graphic.stroke({ color, width, alpha })
}

function drawPoiMarkers(graphic: Graphics, grid: TileKind[][], tile: number, contract: RegionStageContract): number {
  let count = 0
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const kind = grid[y][x]
      if (!['entrance', 'stairs', 'chest', 'camp', 'shrine', 'boss', 'monument'].includes(kind)) continue
      count++
      const cx = (x + 0.5) * tile
      const cy = (y + 0.72) * tile
      const isGather = kind === 'chest' || kind === 'monument'
      const isDanger = kind === 'boss'
      const color = isDanger ? 0xc73e3a : isGather ? contract.palette.inheritable : contract.palette.livingFocus

      // A grounded halo plus a different glyph makes POIs readable without relying on hue.
      graphic.ellipse(cx, cy, tile * 0.32, tile * 0.1)
        .stroke({ color, width: isDanger ? 1.8 : 1.2, alpha: isDanger ? 0.72 : 0.46 })
      if (isGather) {
        graphic.moveTo(cx - 5, cy - 6).lineTo(cx, cy - 12).lineTo(cx + 5, cy - 6)
          .stroke({ color, width: 1.3, alpha: 0.78 })
      } else if (isDanger) {
        graphic.moveTo(cx, cy - 14).lineTo(cx + 6, cy - 7).lineTo(cx, cy - 2).lineTo(cx - 6, cy - 7).closePath()
          .stroke({ color, width: 1.6, alpha: 0.82 })
      } else {
        graphic.circle(cx, cy - 8, 3.2).fill({ color, alpha: 0.76 })
        graphic.moveTo(cx, cy - 5).lineTo(cx, cy + 1).stroke({ color, width: 1.2, alpha: 0.62 })
      }
    }
  }
  return count
}

function findEmberFocus(grid: TileKind[][], tile: number): { x: number; y: number } {
  for (const preferred of ['boss', 'stairs', 'shrine', 'monument', 'entrance'] satisfies TileKind[]) {
    for (let y = 0; y < grid.length; y++) {
      const x = grid[y].indexOf(preferred)
      if (x >= 0) return { x: (x + 0.5) * tile, y: (y + 0.5) * tile }
    }
  }
  return { x: Math.max(...grid.map((row) => row.length)) * tile * 0.5, y: grid.length * tile * 0.5 }
}

/** One batched AR1 kit; navigation/collision remain owned by the unchanged TileKind grid. */
export function buildAr1HotarubiStage(
  grid: TileKind[][],
  tile: number,
  contract: RegionStageContract,
  seed: number,
): Ar1HotarubiStage {
  const width = Math.max(...grid.map((row) => row.length)) * tile
  const height = grid.length * tile
  const rand = seeded(seed ^ 0x484f5441)
  const ground = new Container()
  const mid = new Container()
  const foreground = new Container()
  const effects = new Container()

  const base = new Graphics().rect(0, 0, width, height).fill(contract.palette.boundary)
  drawHorizontalRuns(base, grid, tile, isWalkable, contract.palette.wetSoil)

  // Broad material patches break uniformity without exposing the navigation cell grid.
  const material = new Graphics()
  for (let i = 0; i < 18; i++) {
    material.ellipse(
      rand() * width,
      rand() * height,
      tile * (1.4 + rand() * 3.6),
      tile * (0.6 + rand() * 1.5),
    ).fill({ color: i % 3 === 0 ? 0x22302c : 0x111d22, alpha: 0.12 + rand() * 0.09 })
  }
  // Continuous bank/wall contours replace a raw cell-grid read without altering any tile.
  drawMaterialEdges(
    material,
    grid,
    tile,
    (kind) => kind === 'wall',
    (kind) => isWalkable(kind) || kind === 'water',
    0x3b4545,
    2.4,
    0.62,
  )

  // TileKind境界の内側へ泥の肩を重ね、直角の床ブロックを湿地の岸へ馴染ませる。
  for (let y = 1; y < grid.length - 1; y++) {
    for (let x = 1; x < grid[y].length - 1; x++) {
      if (!isWalkable(grid[y][x])) continue
      const walls = EDGE_OFFSETS.filter(({ dx, dy }) => grid[y + dy]?.[x + dx] === 'wall')
      if (!walls.length || (x * 11 + y * 17 + seed) % 3 === 0) continue
      const dx = walls.reduce((sum, edge) => sum + edge.dx, 0)
      const dy = walls.reduce((sum, edge) => sum + edge.dy, 0)
      material.ellipse(
        (x + 0.5 - dx * 0.18) * tile,
        (y + 0.55 - dy * 0.16) * tile,
        tile * (0.5 + rand() * 0.18),
        tile * (0.19 + rand() * 0.1),
      ).fill({ color: 0x1a2828, alpha: 0.3 })
    }
  }

  // M54: 大型画像の代わりに、歩ける床の内側へ濡れた轍・泥溜まり・岸葦を刻む。
  // 形はTileKindを跨がず、mapの輪郭と当たり判定をそのまま読ませる。
  const patina = new Graphics()
  let terrainMarks = 0
  let edgeReeds = 0
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const kind = grid[y][x]
      const cx = (x + 0.5) * tile
      const cy = (y + 0.58) * tile
      const signature = (Math.imul(x + 3, 73) ^ Math.imul(y + 5, 151) ^ seed) >>> 0

      if (isWalkable(kind) && signature % 4 === 0) {
        const lean = signature % 2 === 0 ? 1 : -1
        patina.ellipse(cx - tile * 0.04, cy + tile * 0.13, tile * 0.31, tile * 0.11)
          .fill({ color: 0x111a1c, alpha: 0.16 })
        patina.moveTo(cx - tile * 0.28, cy + tile * 0.08)
          .quadraticCurveTo(cx, cy - tile * 0.01 * lean, cx + tile * 0.27, cy + tile * 0.04)
          .stroke({ color: 0x566767, width: 0.8, alpha: 0.2 })
        if (signature % 8 === 0) {
          patina.moveTo(cx - tile * 0.2, cy + tile * 0.16)
            .quadraticCurveTo(cx, cy + tile * 0.08, cx + tile * 0.2, cy + tile * 0.12)
            .stroke({ color: contract.palette.inheritable, width: 0.65, alpha: 0.13 })
        }
        terrainMarks++
      }

      if (kind === 'water' && signature % 3 === 0) {
        patina.ellipse(cx, cy, tile * 0.28, tile * 0.085)
          .stroke({ color: 0x8aa7ad, width: 0.85, alpha: 0.21 })
        terrainMarks++
      }

      if (!isWalkable(kind) || signature % 5 !== 0 || edgeReeds >= 32) continue
      const touchesWater = EDGE_OFFSETS.some(({ dx, dy }) => grid[y + dy]?.[x + dx] === 'water')
      const touchesWall = EDGE_OFFSETS.some(({ dx, dy }) => grid[y + dy]?.[x + dx] === 'wall')
      if (!touchesWater && !touchesWall) continue
      const footX = cx + ((signature % 7) - 3) * tile * 0.035
      const footY = (y + 0.91) * tile
      for (let blade = -1; blade <= 1; blade++) {
        const tipX = footX + blade * tile * 0.1 + (signature % 2 ? 2 : -2)
        const tipY = footY - tile * (0.22 + (blade + 1) * 0.055)
        patina.moveTo(footX + blade * 2.2, footY)
          .quadraticCurveTo(tipX - blade * 2, footY - tile * 0.12, tipX, tipY)
          .stroke({ color: blade === 0 ? 0x365044 : 0x263a36, width: 1.15, alpha: 0.68 })
      }
      edgeReeds++
    }
  }

  const water = new Graphics()
  drawHorizontalRuns(water, grid, tile, (kind) => kind === 'water', contract.palette.shallowWater)
  for (let i = 0; i < 9; i++) {
    const y = height * (0.24 + rand() * 0.56)
    water.moveTo(rand() * width * 0.86, y)
      .quadraticCurveTo(width * (0.35 + rand() * 0.2), y + tile * 0.15, width * (0.62 + rand() * 0.24), y)
      .stroke({ color: 0x6d8790, width: 1, alpha: 0.09 + rand() * 0.1 })
  }
  drawMaterialEdges(
    water,
    grid,
    tile,
    (kind) => kind === 'water',
    isWalkable,
    0x8aa7ad,
    1.4,
    0.42,
  )

  const nav = new Graphics()
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] !== 'grass' || (x + y) % 2 !== 0) continue
      const cx = (x + 0.5) * tile
      const cy = (y + 0.55) * tile
      nav.moveTo(cx - tile * 0.28, cy + tile * 0.08)
        .quadraticCurveTo(cx, cy - tile * 0.1, cx + tile * 0.3, cy - tile * 0.04)
        .stroke({ color: contract.palette.inheritable, width: 1.2, alpha: 0.28 })
    }
  }

  // 四角い浮遊灯を置かず、岸に根を持つ短い灯杭だけを最大4本置く。
  let lampCount = 0
  for (let y = 1; y < grid.length - 1 && lampCount < 4; y++) {
    for (let x = 1; x < grid[y].length - 1 && lampCount < 4; x++) {
      if (!isWalkable(grid[y][x])) continue
      if (!EDGE_OFFSETS.some(({ dx, dy }) => grid[y + dy]?.[x + dx] === 'wall')) continue
      if ((x * 7 + y * 13 + seed) % 23 !== 0) continue
      const cx = (x + 0.5) * tile
      const foot = (y + 0.84) * tile
      nav.ellipse(cx + 2, foot, tile * 0.2, tile * 0.055)
        .fill({ color: 0x05080c, alpha: 0.38 })
      nav.rect(cx - 1.3, foot - tile * 0.46, 2.6, tile * 0.45)
        .fill({ color: 0x171414, alpha: 0.94 })
      nav.poly([
        cx - 6, foot - tile * 0.46,
        cx + 6, foot - tile * 0.46,
        cx + 4, foot - tile * 0.62,
        cx - 4, foot - tile * 0.62,
      ]).fill({ color: 0x181316, alpha: 0.98 })
      nav.moveTo(cx, foot - tile * 0.48)
        .quadraticCurveTo(cx + 4, foot - tile * 0.56, cx, foot - tile * 0.59)
        .quadraticCurveTo(cx - 4, foot - tile * 0.55, cx, foot - tile * 0.48)
        .fill({ color: contract.palette.livingFocus, alpha: 0.84 })
      nav.moveTo(cx, foot + 2).lineTo(cx, foot + tile * 0.28)
        .stroke({ color: contract.palette.livingFocus, width: 1.2, alpha: 0.18 })
      lampCount++
    }
  }
  const poiMarkers = drawPoiMarkers(nav, grid, tile, contract)
  ground.addChild(base, material, water, patina, nav)
  const emberFocus = findEmberFocus(grid, tile)

  const emberPool: PooledGraphic[] = []
  for (let i = 0; i < contract.ambientMotion.emberPool; i++) {
    const graphic = new Graphics()
      .moveTo(0, 4).quadraticCurveTo(3, 0, 0, -5).quadraticCurveTo(-3, 0, 0, 4)
      .fill({ color: contract.palette.livingFocus, alpha: 0.9 })
    const mote = { graphic, x: rand() * width, y: rand() * height, phase: rand() * Math.PI * 2 }
    emberPool.push(mote)
    effects.addChild(graphic)
  }

  const ringPool: PooledGraphic[] = []
  const waterCells: { x: number; y: number }[] = []
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) if (grid[y][x] === 'water') waterCells.push({ x, y })
  }
  for (let i = 0; i < contract.ambientMotion.ringPool; i++) {
    const graphic = new Graphics().ellipse(0, 0, tile * 0.42, tile * 0.15)
      .stroke({ color: 0x8aa7ad, width: 1.2, alpha: 0.42 })
    const cell = waterCells[i % Math.max(1, waterCells.length)] ?? { x: 16 + i, y: 13 }
    const ring = { graphic, x: (cell.x + 0.5) * tile, y: (cell.y + 0.5) * tile, phase: i / 3 }
    ringPool.push(ring)
    effects.addChild(graphic)
  }

  const mistPool: PooledGraphic[] = []
  for (let i = 0; i < contract.ambientMotion.mistPool; i++) {
    const graphic = new Graphics()
      .moveTo(-tile * 2.2, 0).quadraticCurveTo(0, -tile * 0.22, tile * 2.2, 0)
      .stroke({ color: 0x8ea3aa, width: tile * 0.34, alpha: 0.06 })
    const mist = { graphic, x: width * (0.3 + i * 0.35), y: height * (0.35 + i * 0.22), phase: i * 1.9 }
    mistPool.push(mist)
    effects.addChild(graphic)
  }

  // One reused contact/reflection cue follows the player. It never participates in input or collision.
  const playerCue = new Graphics()
    .ellipse(0, 0, tile * 0.31, tile * 0.09)
    .fill({ color: 0x05070d, alpha: 0.42 })
    .ellipse(0, 2, tile * 0.18, tile * 0.055)
    .stroke({ color: contract.palette.livingFocus, width: 1.2, alpha: 0.55 })
    .moveTo(0, 3).quadraticCurveTo(4, 10, 0, 18).quadraticCurveTo(-4, 10, 0, 3)
    .fill({ color: contract.palette.livingFocus, alpha: 0.16 })
  effects.addChild(playerCue)

  // A single pooled rare cue follows the sole special shade; normal silhouettes get no hero halo.
  const rareCue = new Graphics()
    .ellipse(0, 0, tile * 0.48, tile * 0.15)
    .stroke({ color: 0xffe1a0, width: 1.8, alpha: 0.76 })
    .moveTo(0, -tile * 0.92).lineTo(4, -tile * 0.78).lineTo(0, -tile * 0.66).lineTo(-4, -tile * 0.78).closePath()
    .fill({ color: 0xffe1a0, alpha: 0.9 })
  rareCue.visible = false
  effects.addChild(rareCue)

  const update = (elapsedMs: number, reducedMotion: boolean) => {
    for (let i = 0; i < emberPool.length; i++) {
      const mote = emberPool[i]
      const flow = reducedMotion ? 0 : ((elapsedMs * 0.014 + i * 37) % (tile * 4))
      // Reverse flow: embers draw toward the floor objective, without requiring a decorative landmark.
      const toward = emberFocus.x > mote.x ? 1 : -1
      mote.graphic.position.set(
        mote.x + toward * flow + Math.sin(elapsedMs / 950 + mote.phase) * 4,
        mote.y - flow * 0.28,
      )
      mote.graphic.alpha = reducedMotion ? 0.58 : 0.38 + 0.46 * Math.max(0, Math.sin(elapsedMs / 620 + mote.phase))
    }
    for (let i = 0; i < ringPool.length; i++) {
      const ring = ringPool[i]
      const cycle = reducedMotion ? 0.3 : ((elapsedMs / 2200 + ring.phase) % 1)
      ring.graphic.position.set(ring.x, ring.y)
      ring.graphic.scale.set(0.55 + cycle * 0.9)
      ring.graphic.alpha = reducedMotion ? 0.22 : (1 - cycle) * 0.34
    }
    for (let i = 0; i < mistPool.length; i++) {
      const mist = mistPool[i]
      const drift = reducedMotion ? 0 : Math.sin(elapsedMs / 3600 + mist.phase) * tile * 1.8
      mist.graphic.position.set(mist.x + drift, mist.y)
      mist.graphic.alpha = reducedMotion ? 0.04 : 0.035 + Math.sin(elapsedMs / 2500 + mist.phase) * 0.015
    }
    playerCue.alpha = reducedMotion ? 0.72 : 0.62 + Math.sin(elapsedMs / 620) * 0.12
    if (rareCue.visible) {
      const pulse = reducedMotion ? 1 : 0.92 + Math.sin(elapsedMs / 310) * 0.08
      rareCue.scale.set(pulse)
      rareCue.alpha = reducedMotion ? 0.76 : 0.66 + Math.sin(elapsedMs / 420) * 0.2
    }
  }
  update(0, true)

  return {
    ground,
    mid,
    foreground,
    effects,
    setPlayerPosition(worldX, worldY) {
      playerCue.position.set(worldX, worldY)
    },
    setRareTelegraph(worldX, worldY, visible) {
      rareCue.position.set(worldX, worldY)
      rareCue.visible = visible
    },
    update,
    budget: {
      staticGraphics: 5,
      textures: 0,
      poiMarkers,
      telegraphs: 1,
      embers: emberPool.length,
      rings: ringPool.length,
      mist: mistPool.length,
      terrainMarks,
      edgeReeds,
    },
  }
}
