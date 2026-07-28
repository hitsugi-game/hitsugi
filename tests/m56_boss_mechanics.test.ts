import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { chooseAutoAction } from '../src/core/auto_battle'
import {
  combatantFromEnemy,
  currentActor,
  enemyAction,
  performAction,
  startBattle,
  type BattleAction,
} from '../src/core/battle'
import {
  BOSS_PATTERNS_V1,
  bossActionFor,
  bossCueView,
  recordBossCounterDamage,
} from '../src/core/boss_mechanics'
import { enemyById } from '../src/core/data/enemies'
import { upcomingEnemyBehaviorCue } from '../src/core/enemy_behaviors'
import { Rng } from '../src/core/rng'
import type { BattleState, Combatant } from '../src/core/types'

function ally(overrides: Partial<Combatant> = {}): Combatant {
  return {
    key: 'ally', isAlly: true, name: '灯', element: 'earth',
    hp: 900, maxHp: 900, mp: 80, maxMp: 80,
    atk: 120, def: 38, matk: 110, mdef: 36, agi: 80, luk: 20,
    skills: ['iwatoshi', 'g_fundogeki'], row: 'front', guard: false, buffs: {}, chainCount: 0,
    ...overrides,
  }
}

function battleFor(enemyId: string, turn: number, members: Combatant[] = [ally()]): BattleState {
  const enemy = combatantFromEnemy(enemyById(enemyId), 0)
  return {
    ...startBattle(members, [enemy]),
    turn,
    order: [...members.map((member) => member.key), enemy.key],
    orderIndex: 0,
  }
}

function pilotParty(enemyId: string): Combatant[] {
  const breakTrial = enemyId === 'boss_hisuinushi'
  return Array.from({ length: 4 }, (_, index) => ally({
    key: `ally-${index}`,
    name: `灯${index + 1}`,
    hp: breakTrial ? 100 : 200,
    maxHp: breakTrial ? 100 : 200,
    mp: 96,
    maxMp: 96,
    atk: breakTrial ? 25 : 40,
    matk: breakTrial ? 24 : 38,
    def: breakTrial ? 16 : 22,
    mdef: breakTrial ? 16 : 22,
    agi: 42 - index,
    // 実編成と同様、攻撃技だけでなく一人ずつ最低限の回復手段を持つ。
    // 温存方針も主戦の瀕死時だけはこの技を使い、通常戦の資源規律は変えない。
    skills: ['iwatoshi', 'koyashi'],
  }))
}

type PilotPolicy =
  | 'attack_only_ignore'
  | 'tactical_ignore'
  | 'manual_counter'
  | 'auto_economy'
  | 'auto_steady'
  | 'auto_allOut'

interface PilotResult {
  won: boolean
  strongOpportunities: number
  strongCountered: number
  strongDamage: number[]
}

function simulatePilot(
  enemyId: string,
  seed: number,
  policy: PilotPolicy,
): PilotResult {
  let state = startBattle(pilotParty(enemyId), [combatantFromEnemy(enemyById(enemyId), 0)])
  const rng = new Rng(seed)
  let strongOpportunities = 0
  let strongCountered = 0
  const strongDamage: number[] = []
  for (let guard = 0; guard < 400 && (state.phase === 'input' || state.phase === 'anim'); guard++) {
    const actor = currentActor(state)
    if (!actor) break
    let action: BattleAction
    if (!actor.isAlly) {
      const cue = bossCueView(state, actor, 'current')
      const isStrong = cue?.phase === 'strong' && state.allies.some((member) => member.hp > 0)
      const hpBefore = isStrong ? state.allies.reduce((sum, member) => sum + member.hp, 0) : 0
      action = enemyAction(state, actor, rng)
      if (isStrong) {
        strongOpportunities++
        const survivors = state.allies.filter((member) => member.hp > 0)
        if ((cue.counter === 'receive' && survivors.every((member) => member.guard)) ||
            (cue.counter !== 'receive' && action.type === 'attack')) strongCountered++
      }
      const next = performAction(state, actor.key, action, rng).state
      if (isStrong) {
        const hpAfter = next.allies.reduce((sum, member) => sum + member.hp, 0)
        strongDamage.push(Math.max(0, hpBefore - hpAfter))
      }
      state = next
      continue
    } else {
      const foe = state.enemies.find((candidate) => candidate.hp > 0)!
      if (policy === 'attack_only_ignore') {
        action = { type: 'attack', targetKey: foe.key }
      } else if (policy === 'tactical_ignore') {
        // Same recovery/power policy, with only the committed boss oracle hidden.
        action = chooseAutoAction({
          battle: { ...state, bossMechanic: undefined },
          actor,
          policy: 'steady',
        }).action
      } else if (policy === 'manual_counter') {
        // Deterministic stand-in for a player following only the public cue.
        action = chooseAutoAction({ battle: state, actor, policy: 'steady' }).action
      } else {
        const autoPolicy = policy === 'auto_economy'
          ? 'economy'
          : policy === 'auto_steady' ? 'steady' : 'allOut'
        action = chooseAutoAction({ battle: state, actor, policy: autoPolicy }).action
      }
    }
    state = performAction(state, actor.key, action, rng).state
  }
  return {
    won: state.phase === 'won',
    strongOpportunities,
    strongCountered,
    strongDamage,
  }
}

describe('M56 主戦pilot', () => {
  it('production autoは非公開BossMechanicV1を直接読まず、公開兆しだけを使う', () => {
    const source = readFileSync(new URL('../src/core/auto_battle.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/\.bossMechanic\b/)
    expect(source).toContain('upcomingEnemyBehaviorCue')
  })

  it('三主を止・受・崩へ一意に割り当て、確定兆しを共有する', () => {
    expect(BOSS_PATTERNS_V1.map((pattern) => [pattern.enemyId, pattern.counter])).toEqual([
      ['boss_hoshimukuro', 'stop'],
      ['boss_yumemaboroshi', 'receive'],
      ['boss_hisuinushi', 'break'],
    ])
    for (const pattern of BOSS_PATTERNS_V1) {
      const battle = battleFor(pattern.enemyId, pattern.cycle)
      const enemy = battle.enemies[0]
      const view = bossCueView(battle, enemy)!
      const uiCue = upcomingEnemyBehaviorCue(battle, enemy)!
      expect(view.certainty).toBe('committed')
      expect(view.turnsUntilStrong).toBe(0)
      expect(uiCue).toMatchObject({
        certainty: 'committed',
        counter: pattern.counter,
        turnsUntilStrong: 0,
        step: { tell: pattern.tell, intent: pattern.strongIntent, danger: 'danger' },
      })
      expect(enemyAction(battle, enemy, new Rng(77))).toMatchObject({
        type: 'skill',
        skillId: pattern.strongSkillId,
      })
    }
  })

  it('止: 12%の実傷に達すると骸星の確定強手を通常攻撃へ弱化する', () => {
    const base = battleFor('boss_hoshimukuro', 3)
    const enemy = base.enemies[0]
    const required = base.bossMechanic!.requiredDamage
    const below = recordBossCounterDamage(base, enemy.key, required - 1, false)
    expect(bossCueView(below, enemy)?.remainingDamage).toBe(1)
    const stopped = recordBossCounterDamage(below, enemy.key, 1, false)
    expect(bossCueView(stopped, enemy)?.remainingDamage).toBe(0)
    const strong = { ...stopped, turn: 4 }
    expect(bossActionFor(strong, enemy)).toMatchObject({ type: 'attack', weakened: true })
  })

  it('受: 強手巡は防御で被害が明確に減り、全オート方針が防御する', () => {
    const base = battleFor('boss_yumemaboroshi', 3)
    const enemy = base.enemies[0]
    const action = enemyAction(base, enemy, new Rng(4))
    expect(action).toMatchObject({ type: 'skill', skillId: 'e_hoshikui' })
    const plain = performAction(base, enemy.key, action, new Rng(9)).state
    const guardedBase = { ...base, allies: base.allies.map((member) => ({ ...member, guard: true })) }
    const guarded = performAction(guardedBase, enemy.key, action, new Rng(9)).state
    expect(base.allies[0].hp - guarded.allies[0].hp).toBeLessThan(base.allies[0].hp - plain.allies[0].hp)
    for (const policy of ['economy', 'steady', 'allOut'] as const) {
      expect(chooseAutoAction({ battle: base, actor: base.allies[0], policy }).category).toBe('telegraph-guard')
    }
  })

  it('受: 敵より遅い一族の防御も、次巡先頭の確定強手まで維持される', () => {
    const slow = ally({ key: 'slow', agi: 1, hp: 240, maxHp: 240 })
    let state = startBattle([slow], [combatantFromEnemy(enemyById('boss_yumemaboroshi'), 0)])
    const rng = new Rng(91)
    // turn 1: enemy → ally
    let actor = currentActor(state)!
    expect(actor.isAlly).toBe(false)
    state = performAction(state, actor.key, enemyAction(state, actor, rng), rng).state
    actor = currentActor(state)!
    state = performAction(state, actor.key, { type: 'attack', targetKey: state.enemies[0].key }, rng).state
    // turn 2: enemy → slow ally。ここで次巡先頭の強手が確定している。
    actor = currentActor(state)!
    state = performAction(state, actor.key, enemyAction(state, actor, rng), rng).state
    actor = currentActor(state)!
    expect(upcomingEnemyBehaviorCue(state, state.enemies[0])?.turnsUntilStrong).toBe(0)
    state = performAction(state, actor.key, { type: 'guard' }, rng).state
    expect(state.turn).toBe(3)
    expect(currentActor(state)?.isAlly).toBe(false)
    expect(state.allies[0].guard).toBe(true)

    const guardedStart = state
    const plainStart = { ...state, allies: state.allies.map((member) => ({ ...member, guard: false })) }
    actor = currentActor(guardedStart)!
    const strong = enemyAction(guardedStart, actor, new Rng(717))
    const guardedAfter = performAction(guardedStart, actor.key, strong, new Rng(818)).state
    const plainAfter = performAction(plainStart, actor.key, strong, new Rng(818)).state
    const guardedLoss = guardedStart.allies[0].hp - guardedAfter.allies[0].hp
    const plainLoss = plainStart.allies[0].hp - plainAfter.allies[0].hp
    expect(guardedLoss).toBeGreaterThan(0)
    expect(guardedLoss).toBeLessThan(plainLoss)
    expect(guardedAfter.allies[0].guard).toBe(true)
    const afterOwnAttack = performAction(
      guardedAfter,
      guardedAfter.allies[0].key,
      { type: 'attack', targetKey: guardedAfter.enemies[0].key },
      new Rng(919),
    ).state
    expect(afterOwnAttack.allies[0].guard).toBe(false)
  })

  it('崩: 弱点技を持つ全オート方針が同じ公開兆しから地技を選ぶ', () => {
    const base = battleFor('boss_hisuinushi', 3)
    expect(bossCueView(base, base.enemies[0])?.hint).toContain('弱点属性')
    for (const policy of ['economy', 'steady', 'allOut'] as const) {
      expect(chooseAutoAction({ battle: base, actor: base.allies[0], policy })).toMatchObject({
        category: 'telegraph-break',
        action: { type: 'skill', skillId: 'g_fundogeki' },
      })
    }
  })

  it('400 seedで確定強手の種類・対象候補が兆しと不一致にならない', () => {
    for (const pattern of BOSS_PATTERNS_V1) {
      const battle = battleFor(pattern.enemyId, pattern.cycle)
      const enemy = battle.enemies[0]
      const cue = upcomingEnemyBehaviorCue(battle, enemy)!
      for (let seed = 0; seed < 400; seed++) {
        const action = enemyAction(battle, enemy, new Rng(seed))
        expect(action.type).toBe('skill')
        expect(action.skillId).toBe(pattern.strongSkillId)
        expect(cue.step.intent).toBe(pattern.strongIntent)
      }
    }
  })

  it('三主×六方針×400 seed（計7200 run）で手動/全オートの正対処と兆し無視との差を測る', () => {
    const policies: readonly PilotPolicy[] = [
      'attack_only_ignore',
      'tactical_ignore',
      'manual_counter',
      'auto_economy',
      'auto_steady',
      'auto_allOut',
    ]
    let measuredRuns = 0
    const report = BOSS_PATTERNS_V1.map((pattern) => {
      const rows = policies.map((policy) => {
        const runs: PilotResult[] = []
        for (let seed = 0; seed < 400; seed++) {
          measuredRuns++
          runs.push(simulatePilot(pattern.enemyId, seed, policy))
        }
        const opportunities = runs.reduce((sum, run) => sum + run.strongOpportunities, 0)
        const countered = runs.reduce((sum, run) => sum + run.strongCountered, 0)
        return {
          policy,
          runs,
          winRate: runs.filter((run) => run.won).length / 400,
          counterRate: opportunities > 0 ? countered / opportunities : 1,
        }
      })
      const attackOnly = rows.find((row) => row.policy === 'attack_only_ignore')!
      const countered = rows.filter((row) => !row.policy.endsWith('_ignore'))
      const pairedDamageReduction = countered.map((row) => {
        const reductions: number[] = []
        for (let seed = 0; seed < 400; seed++) {
          const ignoredRun = attackOnly.runs[seed]
          const counterRun = row.runs[seed]
          for (let index = 0; index < ignoredRun.strongDamage.length; index++) {
            const counterDamage = counterRun.strongDamage[index]
            if (counterDamage === undefined && !counterRun.won) continue
            const ignoredDamage = ignoredRun.strongDamage[index]
            reductions.push(Math.max(0, ignoredDamage - (counterDamage ?? 0)) / Math.max(ignoredDamage, 1))
          }
        }
        reductions.sort((a, b) => a - b)
        return {
          policy: row.policy,
          pairs: reductions.length,
          median: reductions[Math.floor(reductions.length / 2)] ?? 0,
        }
      })
      return {
        enemyId: pattern.enemyId,
        counter: pattern.counter,
        rows: rows.map(({ runs: _runs, ...row }) => row),
        worstCountered: Math.min(...countered.map((row) => row.winRate)),
        worstCounterRate: Math.min(...countered.map((row) => row.counterRate)),
        attackOnlyIgnored: attackOnly.winRate,
        pairedDamageReduction,
      }
    })
    expect(measuredRuns).toBe(7_200)
    expect(
      report.every((row) => (
        row.worstCountered >= .95 &&
        row.worstCounterRate >= .95 &&
        row.worstCountered - row.attackOnlyIgnored >= .05 &&
        row.pairedDamageReduction.every((metric) => metric.pairs > 0 && Number.isFinite(metric.median))
      )),
      JSON.stringify(report),
    ).toBe(true)
  }, 60_000)
})
