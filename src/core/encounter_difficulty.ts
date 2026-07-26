import type { EnemyDef } from './types'

export const NARRATIVE_ENEMY_SCALE = 0.78
export const DARK_ENEMY_ATK_SCALE = 1.4
export const DARK_ENEMY_HP_SCALE = 1.2
export const STAND_IN_BOSS_ATK_SCALE = 1.5
export const STAND_IN_BOSS_HP_SCALE = 2.2

/** 歩行遠征・旧node遠征が共有する、戦闘開始時の敵補正。 */
export function scaleEncounterEnemy(
  enemy: EnemyDef,
  options: { narrativeMode: boolean; dark: boolean; standInBoss?: boolean },
): EnemyDef {
  const ease = options.narrativeMode ? NARRATIVE_ENEMY_SCALE : 1
  return {
    ...enemy,
    atk: Math.round(enemy.atk * ease * (options.dark ? DARK_ENEMY_ATK_SCALE : 1) * (options.standInBoss ? STAND_IN_BOSS_ATK_SCALE : 1)),
    hp: Math.round(enemy.hp * ease * (options.dark ? DARK_ENEMY_HP_SCALE : 1) * (options.standInBoss ? STAND_IN_BOSS_HP_SCALE : 1)),
  }
}
