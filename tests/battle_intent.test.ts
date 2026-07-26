// M47 Work2: 敵の兆しは行動予約ではなく、非拘束の候補として表示する。
// computeIntentsは実rngを消費せず、戦闘バランスを変えない。
import { describe, expect, it } from 'vitest'
import { Rng } from '../src/core/rng'
import { combatantFromEnemy, computeIntents, enemyAction, intentOf, startBattle } from '../src/core/battle'
import { ENEMIES } from '../src/core/data/enemies'
import type { Combatant } from '../src/core/types'
import { upcomingEnemyBehaviorCue } from '../src/core/enemy_behaviors'

const ally = (key: string): Combatant => ({
  key, isAlly: true, name: key, element: 'fire',
  hp: 100, maxHp: 100, mp: 20, maxMp: 20,
  atk: 30, def: 20, matk: 20, mdef: 15, agi: 15, luk: 10,
  skills: [], row: 'front', guard: false, buffs: {}, chainCount: 0,
})

const normalEnemies = (n: number): Combatant[] =>
  ENEMIES.filter((e) => !e.id.startsWith('boss_')).slice(0, n).map((e, i) => combatantFromEnemy(e, i))

describe('M25 §5 敵の兆し', () => {
  it('computeIntents は実rngを一切消費しない(バランス不変の核心)', () => {
    const st = startBattle([ally('a1'), ally('a2')], normalEnemies(3))
    const rng = new Rng(0xabc123)
    const before = rng.state()
    const intents = computeIntents(st, rng)
    expect(rng.state(), 'computeIntents後もrng状態が不変').toBe(before)
    expect(Object.keys(intents).length, '生存敵に兆しが付く').toBeGreaterThan(0)
    for (const v of Object.values(intents)) expect(['atk', 'tech', 'aoe', 'flee']).toContain(v)
  })

  it('倒れた敵には兆しを出さない', () => {
    const enemies = normalEnemies(2)
    enemies[0] = { ...enemies[0], hp: 0 }
    const st = startBattle([ally('a1')], enemies)
    const intents = computeIntents(st, new Rng(7))
    expect(intents[enemies[0].key]).toBeUndefined()
  })

  it('enemyAction は固定シードで決定論的(ゴールデン: 同一シードで完全一致)', () => {
    const st = startBattle([ally('a1'), ally('a2')], normalEnemies(2))
    const actor = st.enemies[0]
    for (let seed = 1; seed <= 1000; seed++) {
      expect(enemyAction(st, actor, new Rng(seed))).toEqual(enemyAction(st, actor, new Rng(seed)))
    }
  })

  it('intentOf: 通常攻撃→atk / 全体技→aoe / 単体技→tech / 逃走→flee / guard→null', () => {
    expect(intentOf({ type: 'attack' })).toBe('atk')
    expect(intentOf({ type: 'skill', skillId: 'enbu' })).toBe('aoe') // target: 'enemies'
    expect(intentOf({ type: 'skill', skillId: 'homura_giri' })).toBe('tech') // target: 'enemy'
    expect(intentOf({ type: 'guard' })).toBeNull()
    expect(intentOf({ type: 'flee' })).toBe('flee')
  })

  it('固定seed 200件: 士気崩壊中は固有手を断定せず、逃走も候補に含める', () => {
    const st = { ...startBattle([ally('a1'), ally('a2')], normalEnemies(3)), morale: true }
    let fleeCandidates = 0
    for (let seed = 1; seed <= 200; seed++) {
      for (const enemy of st.enemies) {
        expect(upcomingEnemyBehaviorCue(st, enemy), `seed ${seed}: 士気崩壊中の固有手`).toBeUndefined()
      }
      const intents = computeIntents(st, new Rng(seed))
      fleeCandidates += Object.values(intents).filter((intent) => intent === 'flee').length
    }
    expect(fleeCandidates, '200 seedの中で逃走候補が観測される').toBeGreaterThan(0)
  })
})
