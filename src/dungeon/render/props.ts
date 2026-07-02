// プロップ配置(品質刷新v3.1 M7a) — 壁を「暗い地面に立つ物」として表現する俺屍様式の要
// - 壁ラン(連続壁)→柵/石垣/墓石列、孤立壁→大物(木/鳥居/岩柱)、直線通路→提灯柱(光源)
// - 特殊タイル(宝/焚火/祠/階段/入口/石碑)の標識スプライトもここで生成(markUsed差し替え対応)
// - テクスチャは TextureRegistry 経由(フロア破棄で解放)。配置は floor.seed で決定論。
import { Sprite, Texture } from 'pixi.js'
import { Rng } from '../../core/rng'
import type { Graphics } from 'pixi.js'
import type { TileKind } from '../types'
import { isWalkable } from '../types'
import type { DungeonTheme, PropKind } from './theme'
import type { TextureRegistry } from './textures'

export interface StaticLightSpec {
  id: string
  tx: number
  ty: number
  radiusTiles: number
  tint?: number
  flicker?: number
  pulse?: number
}

export interface PropsResult {
  sprites: Sprite[] // mid層へ(zIndex/anchor設定済み)
  markers: Map<string, Sprite> // "x:y" → 特殊タイル標識
  lights: StaticLightSpec[]
  usedTexture: (kind: TileKind) => Texture | null // 開封/使用後の差し替え絵
}

const DARK = 0x04060c // シルエットの基調(地色より一段沈める)
const RIM = 0x2e3a52 // 月明かり側の縁光

// ---- プロップ描画(全て手続き生成・小さなシルエット+わずかな縁明かり) ----
function drawProp(g: Graphics, kind: PropKind, v: number, theme: DungeonTheme): void {
  const edge = theme.lanternTint
  switch (kind) {
    case 'bamboo': {
      for (let i = 0; i < 3 + v; i++) {
        const x = i * 7 + (i % 2) * 2
        g.moveTo(x, 6).lineTo(x + 2, 6).lineTo(x + 3, -58 - i * 6).lineTo(x + 1, -58 - i * 6).closePath().fill(DARK)
        g.rect(x + 2.2, -54 - i * 6, 1, 56).fill({ color: 0x2d4a38, alpha: 0.55 })
        g.rect(x, -18 - i * 8, 3.4, 1.8).fill({ color: 0x35573f, alpha: 0.95 })
        g.rect(x, -34 - i * 8, 3.4, 1.8).fill({ color: 0x35573f, alpha: 0.8 })
        g.moveTo(x + 2, -46 - i * 6).lineTo(x + 12, -52 - i * 6).lineTo(x + 3, -49 - i * 6).closePath().fill({ color: 0x0c1a14, alpha: 0.95 })
      }
      break
    }
    case 'tree': {
      g.moveTo(-3, 0).lineTo(3, 0).lineTo(2, -30).lineTo(-2, -30).closePath().fill(DARK)
      g.ellipse(0, -44, 20 + v * 4, 17 + v * 3).fill(DARK)
      g.ellipse(0, -44, 20 + v * 4, 17 + v * 3).stroke({ color: RIM, alpha: 0.4, width: 1.4 })
      g.ellipse(-11, -35, 11, 9).fill(DARK)
      g.ellipse(12, -37, 12, 9).fill(DARK)
      g.ellipse(5, -52, 9, 5.5).fill({ color: 0x22303e, alpha: 0.85 })
      g.rect(1.2, -28, 1.6, 26).fill({ color: RIM, alpha: 0.45 })
      break
    }
    case 'bush': {
      g.ellipse(0, -7, 15 + v * 3, 9).fill(DARK)
      g.ellipse(-8, -11, 9, 6).fill(DARK)
      g.ellipse(8, -12, 8, 6).fill(DARK)
      g.ellipse(0, -8, 15 + v * 3, 9.5).stroke({ color: RIM, alpha: 0.3, width: 1.2 })
      g.ellipse(3, -14, 6, 3.6).fill({ color: theme.grass, alpha: 0.75 })
      break
    }
    case 'log': {
      g.roundRect(-17, -10, 34, 9, 4).fill(DARK)
      g.circle(17, -5.5, 4.5).fill(0x120e0c)
      g.circle(17, -5.5, 2.2).fill({ color: 0x2a201a, alpha: 0.9 })
      break
    }
    case 'rock': {
      g.moveTo(-13, 0).lineTo(-9, -13 - v * 3).lineTo(0, -18 - v * 4).lineTo(10, -11).lineTo(13, 0).closePath().fill(DARK)
      g.moveTo(-9, -13 - v * 3).lineTo(0, -18 - v * 4).lineTo(10, -11).stroke({ color: RIM, alpha: 0.5, width: 1.4 })
      g.moveTo(0, -18 - v * 4).lineTo(10, -11).lineTo(5, -9).closePath().fill({ color: 0x232c40, alpha: 0.85 })
      break
    }
    case 'stonewall': {
      const rng = new Rng(40 + v)
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const x = col * 11 + (row % 2) * 5 - 22
          g.roundRect(x + rng.int(-1, 1), -8 - row * 8, 10, 7, 2).fill(row === 2 ? 0x0d1018 : DARK)
        }
      }
      g.rect(-22, -25, 44, 1.4).fill({ color: 0x232c40, alpha: 0.6 })
      break
    }
    case 'lantern': {
      g.rect(-1.6, -30, 3.2, 30).fill(DARK)
      g.rect(-6, -42, 12, 13).fill(DARK)
      g.rect(-4.4, -40, 8.8, 9).fill({ color: edge, alpha: 0.85 })
      g.moveTo(-8, -42).lineTo(8, -42).lineTo(5, -47).lineTo(-5, -47).closePath().fill(DARK)
      g.rect(-4, -2, 8, 2).fill(DARK)
      break
    }
    case 'fence': {
      g.rect(-20, -16, 3, 16).fill(DARK)
      g.rect(17, -16, 3, 16).fill(DARK)
      g.moveTo(-19, -14).quadraticCurveTo(0, -8 - v * 2, 19, -14).stroke({ color: DARK, width: 2.4 })
      for (const zx of [-10, 0, 10]) {
        g.moveTo(zx, -11 + v).lineTo(zx + 2.5, -6 + v).lineTo(zx - 1, -7 + v).closePath().fill({ color: 0xd8cfc0, alpha: 0.75 })
      }
      break
    }
    case 'brokenlantern': {
      g.rect(-1.6, -20, 3.2, 20).fill(DARK)
      g.moveTo(-6, -30).lineTo(6, -26).lineTo(4, -18).lineTo(-5, -20).closePath().fill(DARK)
      g.rect(-3, -26, 5, 5).fill({ color: 0x3a3428, alpha: 0.9 })
      break
    }
    case 'spire': {
      g.moveTo(-9, 0).lineTo(-3, -34 - v * 8).lineTo(1, -30 - v * 8).lineTo(4, -14).lineTo(9, 0).closePath().fill(DARK)
      g.moveTo(-3, -34 - v * 8).lineTo(1, -30 - v * 8).lineTo(0, -22).closePath().fill({ color: 0x28324a, alpha: 0.7 })
      break
    }
    case 'bone': {
      g.moveTo(-12, 0).quadraticCurveTo(-14, -22, 0, -26 - v * 4).quadraticCurveTo(14, -22, 12, 0)
        .stroke({ color: 0xcfc8b8, alpha: 0.34, width: 4 })
      g.circle(-12, -1, 3.4).fill({ color: 0xcfc8b8, alpha: 0.36 })
      g.circle(12, -1, 3.4).fill({ color: 0xcfc8b8, alpha: 0.36 })
      break
    }
    case 'crystal': {
      g.moveTo(-7, 0).lineTo(-4, -20 - v * 5).lineTo(0, -26 - v * 5).lineTo(5, -16).lineTo(7, 0).closePath()
        .fill({ color: 0x24365c, alpha: 0.95 })
      g.moveTo(0, -26 - v * 5).lineTo(5, -16).lineTo(1, -12).closePath().fill({ color: 0x8ea8d8, alpha: 0.5 })
      break
    }
    case 'cairn': {
      g.ellipse(0, -3, 11, 4.5).fill(DARK)
      g.ellipse(-1, -9, 8, 3.8).fill(0x0d1018)
      g.ellipse(1, -14, 5.5, 3).fill(DARK)
      g.ellipse(0, -18, 3.4, 2.2).fill(0x0d1018)
      break
    }
    case 'torii': {
      g.rect(-16, -40, 4.4, 40).fill(0x341114)
      g.rect(11.6, -40, 4.4, 40).fill(0x341114)
      g.rect(-21, -44, 42, 4.6).fill(0x3d1216)
      g.moveTo(-23, -49).lineTo(23, -49).lineTo(21, -44.5).lineTo(-21, -44.5).closePath().fill(0x48151a)
      g.rect(-2.2, -40, 4.4, 6).fill(0x341114)
      g.rect(-21, -49, 42, 1.4).fill({ color: theme.bossTint, alpha: 0.35 })
      break
    }
    case 'grave': {
      g.roundRect(-6, -22 - v * 3, 12, 22 + v * 3, 4).fill(DARK)
      g.rect(-8.5, -1.5, 17, 3).fill(0x0d1018)
      g.rect(-2.6, -18 - v * 3, 1.2, 8).fill({ color: 0x39424f, alpha: 0.7 })
      g.rect(0.8, -16 - v * 3, 1.2, 6).fill({ color: 0x39424f, alpha: 0.55 })
      break
    }
    case 'pillar': {
      g.rect(-5, -38 - v * 5, 10, 38 + v * 5).fill(DARK)
      g.rect(-7, -42 - v * 5, 14, 5).fill(0x0d1018)
      g.rect(-7, -3, 14, 3).fill(0x0d1018)
      g.rect(-5, -30, 1.6, 20).fill({ color: 0x2a3040, alpha: 0.6 })
      break
    }
    case 'wisp': {
      g.circle(0, -14 - v * 3, 5).fill({ color: theme.shrineTint, alpha: 0.5 })
      g.moveTo(0, -19 - v * 3).quadraticCurveTo(7, -24 - v * 3, 3, -30 - v * 3)
        .stroke({ color: theme.shrineTint, alpha: 0.35, width: 3 })
      break
    }
  }
}

// ---- 特殊タイル標識 ----
function drawMarker(g: Graphics, kind: TileKind, used: boolean, theme: DungeonTheme): void {
  switch (kind) {
    case 'chest': {
      if (used) {
        g.roundRect(-9, -9, 18, 9, 2).fill(0x191410)
        g.rect(-9, -9.5, 18, 2).fill(0x241c14)
      } else {
        g.roundRect(-9, -10, 18, 10, 2).fill(0x3a2b16)
        g.roundRect(-9, -14, 18, 6, 2).fill(0x4a3a20)
        g.rect(-1.4, -12, 2.8, 5).fill({ color: 0xc9a86a, alpha: 0.95 })
        g.rect(-9, -8.4, 18, 1.2).fill({ color: 0xc9a86a, alpha: 0.5 })
      }
      break
    }
    case 'camp': {
      g.rect(-9, -3.4, 18, 2.6).fill(0x241a12)
      g.rect(-6, -5.8, 12, 2.4).fill(0x1c140e)
      if (!used) {
        g.moveTo(0, -19).quadraticCurveTo(6, -11, 0, -5).quadraticCurveTo(-6, -11, 0, -19).fill({ color: 0xffb85c, alpha: 0.95 })
        g.moveTo(0, -14).quadraticCurveTo(3, -9.5, 0, -6).quadraticCurveTo(-3, -9.5, 0, -14).fill({ color: 0xffe8b0, alpha: 0.95 })
      } else {
        g.circle(0, -6, 3.4).fill({ color: 0x51341c, alpha: 0.9 })
      }
      break
    }
    case 'shrine': {
      g.rect(-8, -4, 16, 4).fill(0x0d1018)
      g.rect(-6, -14, 12, 10).fill(used ? 0x151a24 : 0x1c2334)
      g.moveTo(-9, -14).lineTo(9, -14).lineTo(0, -21).closePath().fill(0x0d1018)
      if (!used) g.rect(-2, -12, 4, 6).fill({ color: theme.shrineTint, alpha: 0.8 })
      break
    }
    case 'stairs': {
      g.ellipse(0, -3, 12, 7).fill(0x05070c)
      g.rect(-8, -6, 16, 2).fill({ color: 0x2a3346, alpha: 0.9 })
      g.rect(-6, -9, 12, 2).fill({ color: 0x222a3c, alpha: 0.9 })
      g.rect(-4, -12, 8, 2).fill({ color: 0x1a2130, alpha: 0.9 })
      break
    }
    case 'entrance': {
      g.ellipse(0, -2, 11, 5).fill({ color: 0x7fae8f, alpha: 0.2 })
      g.rect(-8, -3.2, 16, 2).fill({ color: 0x7fae8f, alpha: 0.5 })
      g.circle(0, -8, 2.6).fill({ color: 0xefe6d4, alpha: 0.8 })
      break
    }
    case 'boss': {
      g.ellipse(0, -3, 15, 8).fill({ color: theme.bossTint, alpha: 0.16 })
      g.ellipse(0, -3, 9, 4.6).stroke({ color: theme.bossTint, alpha: 0.5, width: 1.6 })
      break
    }
    case 'monument': {
      g.roundRect(-7, -26, 14, 26, 5).fill(0x141a26)
      g.rect(-9.5, -2, 19, 3).fill(0x0d1018)
      g.rect(-1.2, -22, 2.4, 14).fill({ color: 0x8d93a8, alpha: 0.8 })
      g.ellipse(-3, -6, 4, 3).fill({ color: 0x1d3326, alpha: 0.7 })
      break
    }
    default:
      break
  }
}

// 光を放つプロップ(系統別)
const LIGHT_PROP: Record<string, PropKind> = {
  forest: 'wisp',
  zaka: 'lantern',
  tani: 'crystal',
  miyama: 'wisp',
}

export function buildProps(
  grid: TileKind[][],
  tile: number,
  theme: DungeonTheme,
  seed: number,
  registry: TextureRegistry,
  usedKeys: Set<string>,
  floorIndex: number,
  isBossFloor: boolean,
): PropsResult {
  const rng = new Rng((seed || 1) ^ 0x9e3779b9)
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const sprites: Sprite[] = []
  const markers = new Map<string, Sprite>()
  const lights: StaticLightSpec[] = []

  const at = (x: number, y: number): TileKind => grid[y]?.[x] ?? 'wall'
  const propTex = (kind: PropKind, v: number) => registry.make(`prop:${kind}:${v}`, (g) => drawProp(g, kind, v, theme))
  const markerTex = (kind: TileKind, used: boolean) =>
    registry.make(`mark:${kind}:${used ? 'u' : 'n'}`, (g) => drawMarker(g, kind, used, theme))
  const shadowTex = registry.make('shadow', (g) => {
    g.ellipse(0, 0, 13, 5).fill({ color: 0x000000, alpha: 0.4 })
  })

  const addSprite = (
    tex: Texture,
    tx: number,
    ty: number,
    opts?: { jx?: number; jy?: number; flip?: boolean; scale?: number; shadow?: boolean },
  ) => {
    const wx = tx * tile + tile / 2 + (opts?.jx ?? 0)
    const wy = (ty + 1) * tile - 3 + (opts?.jy ?? 0)
    if (opts?.shadow !== false) {
      const sh = new Sprite(shadowTex)
      sh.anchor.set(0.5)
      sh.position.set(wx, wy - 1)
      sh.zIndex = wy - 0.5
      sh.alpha = 0.55
      sprites.push(sh)
    }
    const sp = new Sprite(tex)
    sp.anchor.set(0.5, 1)
    sp.position.set(wx, wy)
    sp.zIndex = wy
    const sc = opts?.scale ?? 1
    sp.scale.set(opts?.flip ? -sc : sc, sc)
    sprites.push(sp)
    return sp
  }

  // ---- 1. 壁面セルの収集(床に面した壁だけ — 奥の壁は闇のまま) ----
  const face: boolean[][] = Array.from({ length: h }, () => Array(w).fill(false))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (at(x, y) !== 'wall') continue
      const open =
        isWalkable(at(x + 1, y)) || isWalkable(at(x - 1, y)) || isWalkable(at(x, y + 1)) || isWalkable(at(x, y - 1))
      face[y][x] = open
    }
  }

  // ---- 2. 壁ラン(横→縦)に区画プロップを並べる ----
  const consumed: boolean[][] = Array.from({ length: h }, () => Array(w).fill(false))
  const placeRun = (cells: [number, number][]) => {
    for (const [x, y] of cells) {
      consumed[y][x] = true
      if (rng.chance(0.85)) addSprite(propTex(theme.runProp, rng.int(0, 1)), x, y, { jx: rng.int(-2, 2), flip: rng.chance(0.5) })
    }
  }
  for (let y = 0; y < h; y++) {
    let run: [number, number][] = []
    for (let x = 0; x <= w; x++) {
      if (x < w && face[y][x] && !consumed[y][x]) run.push([x, y])
      else {
        if (run.length >= 3) placeRun(run)
        run = []
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let run: [number, number][] = []
    for (let y = 0; y <= h; y++) {
      if (y < h && face[y][x] && !consumed[y][x]) run.push([x, y])
      else {
        if (run.length >= 3) placeRun(run)
        run = []
      }
    }
  }

  // ---- 3. 残りの壁面に大物/小物を散らす(上限つき) ----
  const rest: [number, number][] = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (face[y][x] && !consumed[y][x]) rest.push([x, y])
  const shuffled = rng.shuffle(rest)
  const budget = Math.max(40, 300 - Math.floor(sprites.length / 2))
  for (const [x, y] of shuffled.slice(0, Math.min(shuffled.length, budget))) {
    const kind = rng.chance(0.42) ? theme.bigProp : rng.pick(theme.wallProps)
    addSprite(propTex(kind, rng.int(0, 1)), x, y, {
      jx: rng.int(-3, 3),
      jy: rng.int(-2, 0),
      flip: rng.chance(0.5),
      scale: 0.9 + rng.next() * 0.25,
    })
  }

  // ---- 4. 直線通路に灯りのプロップ(定置光) ----
  const lightProp = LIGHT_PROP[theme.family]
  let lightCount = 0
  for (let y = 1; y < h - 1 && lightCount < 6; y++) {
    for (let x = 1; x < w - 1 && lightCount < 6; x++) {
      if (!isWalkable(at(x, y))) continue
      if ((x * 7 + y * 13 + (seed % 97)) % 29 !== 0) continue // 決定論的な間引き
      let runLen = 1
      for (let k = 1; isWalkable(at(x + k, y)); k++) runLen++
      for (let k = 1; isWalkable(at(x - k, y)); k++) runLen++
      if (runLen < 5 || at(x, y - 1) !== 'wall') continue
      addSprite(propTex(lightProp, rng.int(0, 1)), x, y - 1, { jy: 2 })
      lights.push({ id: `lp:${x}:${y - 1}`, tx: x, ty: y - 1, radiusTiles: 1.7, flicker: 0.5 })
      lightCount++
    }
  }

  // ---- 5. 墓所クラスタ(zaka/tani/miyamaの開けた場所に4〜7基) ----
  if (theme.family !== 'forest') {
    outer: for (let ty = 2; ty < h - 3; ty++) {
      for (let tx = 2; tx < w - 3; tx++) {
        let ok = true
        for (let dy = 0; dy < 4 && ok; dy++)
          for (let dx = 0; dx < 5 && ok; dx++) if (at(tx + dx, ty + dy) !== 'floor') ok = false
        if (!ok || !rng.chance(0.25)) continue
        const kind: PropKind = theme.family === 'tani' ? 'cairn' : 'grave'
        const n = rng.int(4, 7)
        for (let i = 0; i < n; i++) {
          addSprite(propTex(kind, rng.int(0, 1)), tx + rng.int(0, 4), ty + rng.int(0, 3), {
            jx: rng.int(-4, 4),
            flip: rng.chance(0.5),
            scale: 0.85 + rng.next() * 0.3,
          })
        }
        break outer
      }
    }
  }

  // ---- 6. ボスの間: 門の連なり+妖光 ----
  if (isBossFloor) {
    let bMinX = w
    let bMinY = h
    let bMaxX = 0
    let bMaxY = 0
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (at(x, y) === 'boss') {
          bMinX = Math.min(bMinX, x)
          bMinY = Math.min(bMinY, y)
          bMaxX = Math.max(bMaxX, x)
          bMaxY = Math.max(bMaxY, y)
        }
    if (bMaxX >= bMinX) {
      const cx = Math.round((bMinX + bMaxX) / 2)
      const cy = Math.round((bMinY + bMaxY) / 2)
      const spots: [number, number][] = [
        [bMinX - 2, bMinY - 1],
        [bMaxX + 2, bMinY - 1],
        [bMinX - 3, cy + 2],
        [bMaxX + 3, cy + 2],
      ]
      for (const [gx, gy] of spots) {
        if (gx > 0 && gx < w - 1 && gy > 0 && gy < h - 1) {
          addSprite(propTex(theme.gauntletProp, rng.int(0, 1)), gx, gy, { scale: 1.1 })
        }
      }
      lights.push({ id: 'boss', tx: cx, ty: cy, radiusTiles: 2.4, tint: theme.bossTint, flicker: 0.25, pulse: 0.12 })
    }
  }

  // ---- 7. 特殊タイルの標識(markUsed差し替え可能) ----
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const kind = at(x, y)
      if (!['chest', 'camp', 'shrine', 'stairs', 'entrance', 'monument'].includes(kind)) continue
      const isUsed =
        usedKeys.has(`${floorIndex}:${x}:${y}`) && (kind === 'chest' || kind === 'shrine' || kind === 'camp')
      const sp = addSprite(markerTex(kind, isUsed), x, y, { shadow: kind !== 'entrance' })
      markers.set(`${x}:${y}`, sp)
      if (kind === 'camp') {
        lights.push({ id: `camp:${x}:${y}`, tx: x, ty: y, radiusTiles: isUsed ? 1.1 : 2.6, flicker: 1 })
      }
      if (kind === 'shrine') {
        lights.push({
          id: `shrine:${x}:${y}`,
          tx: x,
          ty: y,
          radiusTiles: isUsed ? 0.9 : 1.8,
          tint: theme.shrineTint,
          flicker: 0.12,
          pulse: 0.15,
        })
      }
      if (kind === 'entrance') {
        lights.push({ id: `ent:${x}:${y}`, tx: x, ty: y, radiusTiles: 1.3, tint: 0x7fae8f, flicker: 0.15 })
      }
      if (kind === 'stairs') {
        lights.push({ id: `st:${x}:${y}`, tx: x, ty: y, radiusTiles: 1.1, tint: 0xc9a86a, flicker: 0.1 })
      }
    }
  }

  return {
    sprites,
    markers,
    lights,
    usedTexture: (kind) => (['chest', 'camp', 'shrine'].includes(kind) ? markerTex(kind, true) : null),
  }
}
