// M25/M26 実測ヘルパ — 「見た目」を数値へ落とす単一情報源。
// エージェントが画像を目視する必要はない。すべてここで数値assertする。
import type { Page } from '@playwright/test'
import sharp from 'sharp'

/** 「説明のない純黒面」の判定閾値(輝度 0-255)。
 *  これ以下 = 何も描かれていない = backdrop も シルエットも無い、という運用定義。
 *  M25 §3.3「闇は残すが、何もない純黒と、未踏の森のシルエットを区別する」の機械化。 */
export const PURE_BLACK_LUMA = 12

export interface Box { x: number; y: number; width: number; height: number }

// ---- 状態投入 ----

async function boot(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
}

/** PixiJSのテクスチャ読込とレイアウト確定を待つ */
async function settle(page: Page, ms = 900): Promise<void> {
  await page.waitForTimeout(ms)
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  )
}

export async function gotoDungeon(
  page: Page,
  opts: { regionId?: string; floor?: number; party?: number } = {},
): Promise<void> {
  await boot(page)
  await page.evaluate((o) => (window as never as GameWin).__game.dungeon(o), opts)
  await page.locator('canvas').first().waitFor({ state: 'visible' })
  await settle(page)
}

export async function gotoBattle(
  page: Page,
  opts: { allies?: number; enemies?: number; boss?: boolean } = {},
): Promise<void> {
  await boot(page)
  await page.evaluate((o) => (window as never as GameWin).__game.battle(o), opts)
  await settle(page)
}

export async function gotoVillage(page: Page): Promise<void> {
  await boot(page)
  await page.evaluate(() => (window as never as GameWin).__game.village())
  await page.locator('canvas').first().waitFor({ state: 'visible' })
  await settle(page)
}

interface GameWin {
  __game: {
    dungeon: (o: unknown) => void
    battle: (o: unknown) => void
    village: () => void
    reset: () => void
  }
}

// ---- 暗部率(実ピクセル計測) ----

/** 画面全体に占める「純黒(=何も描かれていない)」画素の割合[%]。
 *  スクリーンショットの実ピクセルを輝度へ落として数える。CSSやモデルの推測を一切含まない。 */
export async function pureBlackRatio(page: Page): Promise<number> {
  const shot = await page.screenshot({ type: 'png' })
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  const total = info.width * info.height
  let dark = 0
  for (let i = 0; i < total; i++) {
    const p = i * ch
    // ITU-R BT.709 輝度
    const luma = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]
    if (luma <= PURE_BLACK_LUMA) dark++
  }
  return (dark / total) * 100
}

// ---- 「説明のない暗部」= 死に空間(実測) ----
//
// 【なぜ純黒率では不足か】
// M24がbackdrop層を足した結果、マップ外は「真っ黒」ではなく「のっぺりした濃紺」になった。
// 純黒率は4%まで下がるが、ユーザー検収は依然「画面下半分近くが意味のない暗部」と報告する。
// 輝度だけの閾値は、M24と同じ「テストは緑・画面は壊れている」を再生産する。
//
// 【正典が与える判定基準】
// M25 §3.3「闇は残すが、何もない純黒と、未踏の森のシルエットを区別する」
//   → 暗部の定義は輝度ではなく「暗く、かつ、のっぺり(情報がない)」である。
//   → シルエット・プロップ・床の起伏には輝度の分散があり、のっぺりした塗りには無い。
// 【較正】2026-07-15、宵の森B1(1280×720)の実スクリーンショットを幾何計算した結果、
// マップ外(=カメラ非クランプで生じた真の死に空間)は画面の約45%だった。
// 閾値(46,5)では65%と過剰検出(マップ内の帳=veilで暗いだけの床まで拾う)。
// 床タイルの境界は16×16ブロック内に輝度の分散を持つため、SDを締めることで分離できる。
export const DEAD_LUMA = 30 // これより暗い、かつ
export const DEAD_STDDEV = 3 // これより平坦(分散なし) = 何も描かれていない
const BLOCK = 16 // 判定ブロック(px)

/** 画面に占める「説明のない暗部(暗く・のっぺり)」の割合[%]。
 *  M25 §9.1 受入: PC ≤15% / モバイル ≤20%。 */
export async function deadSpaceRatio(page: Page): Promise<number> {
  const shot = await page.screenshot({ type: 'png' })
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: ch } = info
  const luma = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const p = i * ch
    luma[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]
  }
  let dead = 0
  let blocks = 0
  for (let by = 0; by + BLOCK <= h; by += BLOCK) {
    for (let bx = 0; bx + BLOCK <= w; bx += BLOCK) {
      let sum = 0
      let sumSq = 0
      for (let y = by; y < by + BLOCK; y++) {
        for (let x = bx; x < bx + BLOCK; x++) {
          const v = luma[y * w + x]
          sum += v
          sumSq += v * v
        }
      }
      const n = BLOCK * BLOCK
      const mean = sum / n
      const sd = Math.sqrt(Math.max(0, sumSq / n - mean * mean))
      blocks++
      if (mean < DEAD_LUMA && sd < DEAD_STDDEV) dead++
    }
  }
  return blocks === 0 ? 0 : (dead / blocks) * 100
}

/** 暗部の画像証跡を残す(WORKLOG添付用) */
export async function snapshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `tests/visual/.artifacts/${name}.png` })
}

// ---- 矩形の実測 ----

export async function boxesOf(page: Page, selector: string): Promise<Box[]> {
  const loc = page.locator(selector)
  const n = await loc.count()
  const out: Box[] = []
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i)
    if (!(await el.isVisible())) continue
    const b = await el.boundingBox()
    if (b && b.width > 0 && b.height > 0) out.push(b)
  }
  return out
}

const area = (b: Box) => b.width * b.height

export function intersectionArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

/** 2矩形の重なり率[%] — 小さい方の面積に対する交差面積(小札が大札に呑まれる事故を捕まえる) */
export function overlapPct(a: Box, b: Box): number {
  const min = Math.min(area(a), area(b))
  return min <= 0 ? 0 : (intersectionArea(a, b) / min) * 100
}

/** 同一グループ内の最大重なり率[%](M25 §9.2「生存札の相互重なりは12%以下」) */
export function maxPairOverlap(boxes: Box[]): number {
  let max = 0
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) max = Math.max(max, overlapPct(boxes[i], boxes[j]))
  }
  return max
}

/** 2グループ間で交差している矩形ペアを返す(M25 §9.2「名札/HP/ログ/コマンドの矩形交差0」) */
export function crossings(a: Box[], b: Box[]): { a: Box; b: Box; area: number }[] {
  const out: { a: Box; b: Box; area: number }[] = []
  for (const x of a) {
    for (const y of b) {
      const ia = intersectionArea(x, y)
      if (ia > 0) out.push({ a: x, b: y, area: ia })
    }
  }
  return out
}

/** ヒット領域の実測(M25 §9.2「主要4コマンドは44×44px以上、推奨48px」) */
export async function hitSizes(page: Page, selector: string): Promise<{ w: number; h: number }[]> {
  return (await boxesOf(page, selector)).map((b) => ({ w: b.width, h: b.height }))
}
