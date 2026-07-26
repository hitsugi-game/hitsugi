/**
 * 探索の灯が実際に変える境界の単一情報源。
 * 15%には固有機構がないため、UI警告もこの40%/0%へ揃える。
 */
export const LIGHT_PURSUIT_THRESHOLD = 40
export const LIGHT_DARK_THRESHOLD = 0
export const DUNGEON_STEP_LIGHT_COST = 0.45
export const DUNGEON_VICTORY_LIGHT_COST = 6

export type LightPressureLevel = 'safe' | 'pursuit' | 'dark'

export function isPursuitLight(light: number): boolean {
  return light < LIGHT_PURSUIT_THRESHOLD
}

export function isDarkLight(light: number): boolean {
  return light <= LIGHT_DARK_THRESHOLD
}

export function lightPressureLevel(light: number): LightPressureLevel {
  if (isDarkLight(light)) return 'dark'
  if (isPursuitLight(light)) return 'pursuit'
  return 'safe'
}

export function lightPressureCopy(light: number): { objective: string; detail: string; aria: string } {
  const rounded = Math.max(0, Math.round(light))
  const level = lightPressureLevel(light)
  if (level === 'dark') {
    return {
      objective: '灯は尽きた — 帰り火を焚け',
      detail: '敵影は最も速く迫り、戦闘の魔性も攻撃と命を増す。',
      aria: `灯 ${rounded}パーセント。灯が尽き、敵影は最も速く迫り、戦闘の魔性も強化されている`,
    }
  }
  if (level === 'pursuit') {
    return {
      objective: '敵影が迫る — 帰り火を考えよ',
      detail: '灯が40を下回り、敵影が速まり、遠くから追う。',
      aria: `灯 ${rounded}パーセント。敵影が速まり、遠くから追ってくる`,
    }
  }
  return {
    objective: '探索を続けられる',
    detail: '灯が40以上なら、敵影の追跡は通常のまま。',
    aria: `灯 ${rounded}パーセント。敵影の追跡は通常`,
  }
}
