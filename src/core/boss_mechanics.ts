import type { BattleState, BossMechanicV1, Combatant, EnemyIntent } from './types'

export type BossCounter = BossMechanicV1['counter']

export interface BossPatternV1 {
  enemyId: string
  counter: BossCounter
  cycle: number
  warning: number
  strongSkillId: 'e_hisui' | 'e_hoshikui'
  strongIntent: EnemyIntent
  target: '一族ひとり' | '一族全体'
  tell: string
  stopRatio?: number
}

const PATTERNS: readonly BossPatternV1[] = [
  {
    enemyId: 'boss_hoshimukuro',
    counter: 'stop',
    cycle: 4,
    warning: 2,
    strongSkillId: 'e_hoshikui',
    strongIntent: 'aoe',
    target: '一族全体',
    tell: '喰われた星を胸へ集める',
    stopRatio: .12,
  },
  {
    enemyId: 'boss_yumemaboroshi',
    counter: 'receive',
    cycle: 3,
    warning: 1,
    strongSkillId: 'e_hoshikui',
    strongIntent: 'aoe',
    target: '一族全体',
    tell: '館の全ての戸が開く',
  },
  {
    enemyId: 'boss_hisuinushi',
    counter: 'break',
    cycle: 3,
    warning: 1,
    strongSkillId: 'e_hisui',
    strongIntent: 'tech',
    target: '一族ひとり',
    tell: '翡翠の水衣を固める',
  },
] as const

const BY_ID = new Map(PATTERNS.map((pattern) => [pattern.enemyId, pattern]))

export const BOSS_PATTERNS_V1 = PATTERNS

export function bossPatternFor(enemyId?: string): BossPatternV1 | undefined {
  return enemyId ? BY_ID.get(enemyId.replace(/_[wo]$/, '')) : undefined
}

function turnView(pattern: BossPatternV1, turn: number): Pick<
  BossMechanicV1,
  'cycleIndex' | 'phase' | 'turnsUntilStrong'
> {
  const safeTurn = Math.max(1, Math.floor(turn))
  const position = (safeTurn - 1) % pattern.cycle
  const turnsUntilStrong = pattern.cycle - 1 - position
  return {
    cycleIndex: Math.floor((safeTurn - 1) / pattern.cycle),
    phase: turnsUntilStrong === 0 ? 'strong' : turnsUntilStrong <= pattern.warning ? 'warning' : 'normal',
    turnsUntilStrong,
  }
}

export function initialBossMechanic(enemies: readonly Combatant[]): BossMechanicV1 | undefined {
  const boss = enemies.find((enemy) => enemy.hp > 0 && bossPatternFor(enemy.enemyId))
  const pattern = bossPatternFor(boss?.enemyId)
  if (!boss || !pattern) return undefined
  const view = turnView(pattern, 1)
  return {
    version: 1,
    enemyKey: boss.key,
    enemyId: pattern.enemyId,
    counter: pattern.counter,
    ...view,
    accumulatedDamage: 0,
    requiredDamage: pattern.stopRatio ? Math.ceil(boss.maxHp * pattern.stopRatio) : 0,
  }
}

function enemyUpcomingTurn(battle: BattleState, enemy: Combatant): number {
  const enemyOrder = battle.order.indexOf(enemy.key)
  return enemyOrder >= 0 && enemyOrder <= battle.orderIndex ? battle.turn + 1 : battle.turn
}

export interface BossCueView {
  certainty: 'committed'
  enemyKey: string
  enemyId: string
  counter: BossCounter
  tell: string
  target: BossPatternV1['target']
  intent: EnemyIntent
  phase: BossMechanicV1['phase']
  turnsUntilStrong: number
  requiredDamage: number
  accumulatedDamage: number
  remainingDamage: number
  broken: boolean
  hint: string
}

export function bossCueView(
  battle: BattleState,
  enemy: Combatant,
  mode: 'upcoming' | 'current' = 'upcoming',
): BossCueView | undefined {
  const mechanic = battle.bossMechanic
  const pattern = bossPatternFor(enemy.enemyId)
  if (!mechanic || !pattern || mechanic.enemyKey !== enemy.key || enemy.hp <= 0) return undefined
  const targetTurn = mode === 'current' ? battle.turn : enemyUpcomingTurn(battle, enemy)
  const view = turnView(pattern, targetTurn)
  const broken = mechanic.brokenUntilTurn !== undefined && mechanic.brokenUntilTurn >= targetTurn
  const remainingDamage = Math.max(0, mechanic.requiredDamage - mechanic.accumulatedDamage)
  const hint = pattern.counter === 'stop'
    ? remainingDamage > 0
      ? `強手までにあと${remainingDamage}の実傷を与える`
      : '溜めを断った。強手は通常攻撃へ弱まる'
    : pattern.counter === 'receive'
      ? view.turnsUntilStrong === 0 ? 'この巡は生存者全員で身を固める' : `あと${view.turnsUntilStrong}巡で強手。守りを整える`
      : broken
        ? '構えを崩した。強手は二巡鈍る'
        : '弱点属性の技を当てて構えを崩す'
  return {
    certainty: 'committed',
    enemyKey: enemy.key,
    enemyId: pattern.enemyId,
    counter: pattern.counter,
    tell: pattern.tell,
    target: pattern.target,
    intent: pattern.strongIntent,
    phase: view.phase,
    turnsUntilStrong: view.turnsUntilStrong,
    requiredDamage: mechanic.requiredDamage,
    accumulatedDamage: mechanic.accumulatedDamage,
    remainingDamage,
    broken,
    hint,
  }
}

export function syncBossMechanic(battle: BattleState): BattleState {
  const mechanic = battle.bossMechanic
  const pattern = bossPatternFor(mechanic?.enemyId)
  if (!mechanic || !pattern) return battle
  const view = turnView(pattern, battle.turn)
  return {
    ...battle,
    bossMechanic: {
      ...mechanic,
      ...view,
    },
  }
}

export function recordBossCounterDamage(
  battle: BattleState,
  targetKey: string,
  actualDamage: number,
  weakSkillHit: boolean,
): BattleState {
  const mechanic = battle.bossMechanic
  const enemy = battle.enemies.find((candidate) => candidate.key === targetKey)
  if (!mechanic || !enemy || mechanic.enemyKey !== targetKey || actualDamage <= 0) return battle
  const cue = bossCueView(battle, enemy, 'upcoming')
  if (!cue || cue.phase === 'normal') return battle
  if (mechanic.counter === 'stop') {
    return {
      ...battle,
      bossMechanic: {
        ...mechanic,
        accumulatedDamage: Math.min(mechanic.requiredDamage, mechanic.accumulatedDamage + actualDamage),
      },
    }
  }
  if (mechanic.counter === 'break' && weakSkillHit) {
    const strongTurn = battle.turn + cue.turnsUntilStrong
    return {
      ...battle,
      bossMechanic: {
        ...mechanic,
        brokenUntilTurn: strongTurn + 1,
      },
    }
  }
  return battle
}

export function bossActionFor(
  battle: BattleState,
  actor: Combatant,
): { type: 'attack' | 'skill'; skillId?: string; weakened?: boolean } | undefined {
  const pattern = bossPatternFor(actor.enemyId)
  const cue = bossCueView(battle, actor, 'current')
  if (!pattern || !cue) return undefined
  if (cue.phase !== 'strong') return { type: 'attack' }
  if (pattern.counter === 'stop' && cue.remainingDamage === 0) return { type: 'attack', weakened: true }
  if (pattern.counter === 'break' && cue.broken) return { type: 'attack', weakened: true }
  return { type: 'skill', skillId: pattern.strongSkillId, weakened: cue.broken }
}

export function settleBossStrong(battle: BattleState, actorKey: string): BattleState {
  const mechanic = battle.bossMechanic
  const enemy = battle.enemies.find((candidate) => candidate.key === actorKey)
  const cue = enemy ? bossCueView(battle, enemy, 'current') : undefined
  if (!mechanic || !cue || cue.phase !== 'strong') return battle
  return {
    ...battle,
    bossMechanic: {
      ...mechanic,
      accumulatedDamage: 0,
      lastResolvedTurn: battle.turn,
    },
  }
}

export function bossCounterWindow(cue: BossCueView | undefined): boolean {
  if (!cue || cue.phase === 'normal') return false
  return cue.counter !== 'receive' || cue.turnsUntilStrong === 0
}
