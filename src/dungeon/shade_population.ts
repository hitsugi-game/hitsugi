/**
 * 探索画面に実配置する敵影数の正本。
 * maps.gen.ts の shades は生成時の密度指定であり、実画面では混雑緩和を適用する。
 */
export const DUNGEON_SHADE_REDUCTION = 2
export const DUNGEON_SHADE_MIN = 2
export const CLEARED_SHADE_REDUCTION = 2
export const CLEARED_SHADE_MIN = 1

export function activeShadeCount(declaredShades: number, cleared = false): number {
  const normal = Math.max(DUNGEON_SHADE_MIN, declaredShades - DUNGEON_SHADE_REDUCTION)
  return cleared ? Math.max(CLEARED_SHADE_MIN, normal - CLEARED_SHADE_REDUCTION) : normal
}
