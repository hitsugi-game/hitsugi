import { Rng } from '../core/rng'
import type { DungeonRun, FloorDef } from './types'

const UINT32_MAX = 0xffff_ffff
const OPTIONAL_POIS = ['M', 'F', 'S', 'C'] as const
type OptionalPoi = (typeof OPTIONAL_POIS)[number]

interface Point {
  x: number
  y: number
}

export interface DungeonFloorVariationOptions {
  /** 作家演出済みの専用stageでは背景と地形の位置関係を変えない。 */
  preserveLayout?: boolean
}

function hashText(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** 32bitの入力を、描画・配置・内容抽選で共有できる安定したseedへ混ぜる。 */
export function mixDungeonSeed(...parts: number[]): number {
  let hash = 0x9e3779b9
  for (const part of parts) {
    hash ^= part >>> 0
    hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d)
    hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b)
    hash ^= hash >>> 16
  }
  return (hash >>> 0) || 1
}

export function isDungeonRunSeed(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0 && value <= UINT32_MAX
}

/**
 * M51以前のcheckpointにはrunSeedが無い。地形は旧固定床のまま保ちつつ、内容抽選だけは
 * 地域と固定済みの隊から安定seedを作り、再開時刻による引き直しを防ぐ。
 */
export function dungeonRunContentSeed(
  run: Pick<DungeonRun, 'runSeed' | 'regionId' | 'partyIds'>,
): number {
  if (isDungeonRunSeed(run.runSeed)) return run.runSeed
  return mixDungeonSeed(hashText(run.regionId), hashText(run.partyIds.join('|')), 0x4c454741)
}

/**
 * 宝箱・祠・事件結果を「この遠征の、この床、この場所」へ固定する。
 * 呼出側はdungeonRunContentSeedでlegacy checkpointも安定seedへ解決できる。
 */
export function dungeonTileRng(
  runSeed: number | undefined,
  floor: number,
  x: number,
  y: number,
  channel: string,
): Rng | null {
  if (!isDungeonRunSeed(runSeed)) return null
  return new Rng(mixDungeonSeed(runSeed, floor, x, y, hashText(channel)))
}

function transformRows(rows: readonly string[], transform: number): string[] {
  let next = rows.map((row) => [...row])
  if ((transform & 1) !== 0) next = next.map((row) => row.reverse())
  if ((transform & 2) !== 0) next = next.reverse()
  return next.map((row) => row.join(''))
}

function pointsOf(rows: readonly string[], chars: ReadonlySet<string>): Point[] {
  const points: Point[] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (chars.has(row[x])) points.push({ x, y })
    }
  })
  return points
}

function reachableWalkable(rows: readonly string[]): Set<string> {
  const entrance = pointsOf(rows, new Set(['<']))[0]
  if (!entrance) return new Set()
  const seen = new Set<string>([`${entrance.x}:${entrance.y}`])
  const queue = [entrance]
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = current.x + dx
      const y = current.y + dy
      const tile = rows[y]?.[x]
      const key = `${x}:${y}`
      if (tile === undefined || tile === '#' || tile === '~' || seen.has(key)) continue
      seen.add(key)
      queue.push({ x, y })
    }
  }
  return seen
}

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function relocateOptionalPois(rows: readonly string[], rng: Rng): string[] {
  const counts = Object.fromEntries(OPTIONAL_POIS.map((poi) => [poi, 0])) as Record<OptionalPoi, number>
  const grid = rows.map((row) => [...row])
  for (const row of grid) {
    for (let x = 0; x < row.length; x++) {
      const tile = row[x] as OptionalPoi
      if (!OPTIONAL_POIS.includes(tile)) continue
      counts[tile] += 1
      row[x] = '.'
    }
  }

  // 宝箱だけは出立ごとに1〜3個へ揺らす。石碑・祠・焚火は進行と回復量を崩さない。
  counts.C = Math.max(1, Math.min(3, counts.C + rng.pick([-1, 0, 0, 1] as const)))
  const cleared = grid.map((row) => row.join(''))
  const reachable = reachableWalkable(cleared)
  const anchors = pointsOf(cleared, new Set(['<', '>', 'B']))
  let candidates = rng.shuffle(pointsOf(cleared, new Set(['.', ','])).filter((point) => (
    reachable.has(`${point.x}:${point.y}`)
  )))
  const placed: Point[] = []

  for (const poi of OPTIONAL_POIS) {
    for (let n = 0; n < counts[poi]; n++) {
      let index = candidates.findIndex((point) => (
        anchors.every((anchor) => manhattan(point, anchor) >= 3) &&
        placed.every((other) => manhattan(point, other) >= 3)
      ))
      if (index < 0) index = candidates.findIndex((point) => anchors.every((anchor) => manhattan(point, anchor) >= 2))
      if (index < 0) index = 0
      const point = candidates[index]
      if (!point) break
      candidates = [...candidates.slice(0, index), ...candidates.slice(index + 1)]
      grid[point.y][point.x] = poi
      placed.push(point)
    }
  }
  return grid.map((row) => row.join(''))
}

/**
 * 新しい出立では地図とPOIが変わり、同じrunSeedなら中断再開後も完全に同じ床を返す。
 * 旧save(runSeed無し)は歴史的な固定床をそのまま使う。
 */
export function varyDungeonFloor(
  floor: FloorDef,
  runSeed: number | undefined,
  floorIndex: number,
  options: DungeonFloorVariationOptions = {},
): FloorDef {
  if (!isDungeonRunSeed(runSeed)) return floor
  const seed = mixDungeonSeed(runSeed, floorIndex, floor.seed ?? 0, 0x464c4f52)
  if (options.preserveLayout) return { ...floor, seed }

  const rng = new Rng(seed)
  const transformed = transformRows(floor.ascii, rng.int(0, 3))
  return {
    ...floor,
    ascii: relocateOptionalPois(transformed, rng),
    seed,
  }
}
