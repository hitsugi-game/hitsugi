// ミニマップ(品質刷新v3.1 M7c) — 訪問した場所だけが霧から開く
// スクリーン層に置く小さなGraphics。再描画はdirty時のみ(1歩ごと)。
import { Container, Graphics } from 'pixi.js'
import type { TileKind } from '../types'
import { isWalkable } from '../types'

const CELL = 3.2
const PAD = 6

const SPECIAL_DOT: Partial<Record<TileKind, number>> = {
  chest: 0xc9a86a,
  camp: 0xff9d45,
  shrine: 0x9b7fc2,
  stairs: 0xefe6d4,
  entrance: 0x7fae8f,
  boss: 0xc73e3a,
  monument: 0x8d93a8,
}

export class Minimap {
  container = new Container()
  private back = new Graphics()
  private g = new Graphics()
  private sg = new Graphics() // 眷属「夜目」(月): 敵影ドット(毎フレーム更新)
  private hud = new Graphics() // 自機facing矢印+進度バー(毎フレーム更新)
  private grid: TileKind[][]
  private visited = new Set<string>()
  private walkableTotal = 0 // フロア進度計算用の分母
  private nvRadius = 0 // 0 = 夜目オフ / >0 = 敵影検知半径(マス)
  private facing: 'up' | 'down' | 'left' | 'right' = 'down'
  private dirty = true
  private px = 0
  private py = 0
  private w: number
  private h: number

  constructor(grid: TileKind[][]) {
    this.grid = grid
    this.h = grid.length
    this.w = grid[0]?.length ?? 0
    this.container.addChild(this.back, this.g, this.sg, this.hud)
    this.back
      .roundRect(-PAD, -PAD, this.w * CELL + PAD * 2, this.h * CELL + PAD * 2 + 8, 5)
      .fill({ color: 0x0b0f1e, alpha: 0.6 })
      .stroke({ color: 0xc9a86a, alpha: 0.35, width: 1 })
    // 進度%計算用: 歩行可タイル総数を1度だけ数える
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const k = this.grid[y]?.[x]
        if (k && isWalkable(k)) this.walkableTotal++
      }
    }
  }

  setFacing(dir: 'up' | 'down' | 'left' | 'right'): void {
    this.facing = dir
  }

  /** 訪問済み歩行タイル数 / 歩行可タイル総数(0〜1)。HUDのフロア進度表示に使う。 */
  exploreRatio(): number {
    if (this.walkableTotal <= 0) return 0
    let visitedWalk = 0
    for (const key of this.visited) {
      const [x, y] = key.split(':').map(Number)
      const k = this.grid[y]?.[x]
      if (k && isWalkable(k)) visitedWalk++
    }
    return Math.min(1, visitedWalk / this.walkableTotal)
  }

  // 画面右上に配置(HTMLの上部HUDと重ならない高さ)
  reposition(screenW: number): void {
    this.container.x = screenW - this.w * CELL - PAD - 10
    this.container.y = 56
  }

  reveal(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && ny >= 0 && nx < this.w && ny < this.h) this.visited.add(`${nx}:${ny}`)
      }
    }
    this.px = x
    this.py = y
    this.dirty = true
  }

  // 眷属「宝目」(土, v3.1 M16-5): 開幕にフロア中の宝箱・石碑の在処だけを点で示す
  revealSpecials(): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const kind = this.grid[y]?.[x]
        if (kind === 'chest' || kind === 'monument') this.visited.add(`${x}:${y}`)
      }
    }
    this.dirty = true
  }

  // 眷属「夜目」(月, M16-5→実効化): 検知半径内の敵影をミニマップに点す(0でオフ)
  setNightVision(radius: number): void {
    this.nvRadius = radius
    if (radius === 0) this.sg.clear()
  }

  update(timeMs: number, shades?: { x: number; y: number }[]): void {
    if (this.dirty) {
      this.dirty = false
      const g = this.g
      g.clear()
      for (const key of this.visited) {
        const [x, y] = key.split(':').map(Number)
        const kind = this.grid[y]?.[x]
        if (!kind || kind === 'wall') continue
        if (kind === 'water') {
          g.rect(x * CELL, y * CELL, CELL, CELL).fill({ color: 0x1a3050, alpha: 0.9 })
        } else if (isWalkable(kind)) {
          g.rect(x * CELL, y * CELL, CELL, CELL).fill({ color: 0x2a3552, alpha: 0.75 })
        }
        const dot = SPECIAL_DOT[kind]
        if (dot) {
          const cx = x * CELL + CELL / 2
          const cy = y * CELL + CELL / 2
          if (kind === 'monument') {
            // 石碑=ダイヤ型で区別(縁起の欠片を拾う場所を目立たせる)
            const r = CELL * 0.7
            g.moveTo(cx, cy - r).lineTo(cx + r, cy).lineTo(cx, cy + r).lineTo(cx - r, cy).closePath().fill(dot)
          } else {
            g.circle(cx, cy, CELL * 0.62).fill(dot)
          }
        }
      }
    }
    // 夜目(月眷属): 敵影を検知半径内で点描(visited非依存・毎フレーム更新)
    if (this.nvRadius > 0 && shades) {
      const sg = this.sg
      sg.clear()
      for (const s of shades) {
        const d = Math.max(Math.abs(s.x - this.px), Math.abs(s.y - this.py))
        if (d <= this.nvRadius) {
          sg.circle(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, CELL * 0.5).fill({ color: 0xc73e3a, alpha: 0.92 })
        }
      }
    }
    // 自機facing三角矢印 + フロア進度バー(毎フレーム更新でfacing追従)
    const hud = this.hud
    hud.clear()
    const cx = this.px * CELL + CELL / 2
    const cy = this.py * CELL + CELL / 2
    const r = CELL * 1.1
    // facing別の三角形頂点(先端・左右)
    const tri: Record<'up' | 'down' | 'left' | 'right', [number, number][]> = {
      up: [[cx, cy - r], [cx - r * 0.7, cy + r * 0.5], [cx + r * 0.7, cy + r * 0.5]],
      down: [[cx, cy + r], [cx + r * 0.7, cy - r * 0.5], [cx - r * 0.7, cy - r * 0.5]],
      left: [[cx - r, cy], [cx + r * 0.5, cy + r * 0.7], [cx + r * 0.5, cy - r * 0.7]],
      right: [[cx + r, cy], [cx - r * 0.5, cy - r * 0.7], [cx - r * 0.5, cy + r * 0.7]],
    }
    const p = tri[this.facing]
    hud.moveTo(p[0][0], p[0][1]).lineTo(p[1][0], p[1][1]).lineTo(p[2][0], p[2][1]).closePath().fill(0xffd23e)
    // 進度バー(minimap下端)
    const barY = this.h * CELL + 2
    const barW = this.w * CELL
    const ratio = this.exploreRatio()
    hud.rect(0, barY, barW, 3).fill({ color: 0x1a2033, alpha: 0.6 })
    if (ratio > 0) hud.rect(0, barY, barW * ratio, 3).fill({ color: 0x7fae8f, alpha: 0.9 })
    this.container.alpha = 0.92 + Math.sin(timeMs / 600) * 0.08
  }
}
