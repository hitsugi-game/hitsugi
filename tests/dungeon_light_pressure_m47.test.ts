import { describe, expect, it } from 'vitest'
import {
  LIGHT_PURSUIT_THRESHOLD,
  isDarkLight,
  isPursuitLight,
  lightPressureCopy,
  lightPressureLevel,
} from '../src/dungeon/light_pressure'

describe('M47 Work2 灯の警告と実機構の境界', () => {
  it.each([
    [41, 'safe', false, false],
    [40, 'safe', false, false],
    [39, 'pursuit', true, false],
    [15, 'pursuit', true, false],
    [14, 'pursuit', true, false],
    [0, 'dark', true, true],
  ] as const)('灯%sは%s', (light, level, pursuit, dark) => {
    expect(lightPressureLevel(light)).toBe(level)
    expect(isPursuitLight(light)).toBe(pursuit)
    expect(isDarkLight(light)).toBe(dark)
  })

  it('UI文言が40未満の追跡強化と0の戦闘強化を区別する', () => {
    expect(LIGHT_PURSUIT_THRESHOLD).toBe(40)
    expect(lightPressureCopy(39).detail).toContain('敵影が速まり')
    expect(lightPressureCopy(39).detail).not.toContain('戦闘')
    expect(lightPressureCopy(0).detail).toContain('戦闘の魔性')
    expect(lightPressureCopy(15).objective).toBe(lightPressureCopy(14).objective)
    expect(lightPressureCopy(15).detail).toBe(lightPressureCopy(14).detail)
  })
})
