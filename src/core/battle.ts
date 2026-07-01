import type { BattleState, BattleLogEntry, Character, Combatant, EnemyDef, Element } from './types'
import { ELEMENT_ADVANTAGE } from './types'
import { Rng, uid } from './rng'
import { skillById } from './data/skills'
import { personalityById } from './data/personalities'

// ---- コンバータント生成 ----
export function combatantFromChar(c: Character, row: 'front' | 'back'): Combatant {
  const p = personalityById(c.personalityId)
  const bias = p.battleBias
  const wAtk = c.equipment.weapon?.atk ?? 0
  const aDef = c.equipment.armor?.def ?? 0
  const charm = c.equipment.charm?.statBonus ?? {}
  const stat = (k: keyof Character['stats']) =>
    c.stats[k] + (bias[k] ?? 0) + ((charm as Record<string, number>)[k] ?? 0)
  return {
    key: `ally_${c.id}`,
    isAlly: true,
    name: c.name,
    element: c.element,
    hp: c.hp, maxHp: c.maxHp, mp: c.mp, maxMp: c.maxMp,
    atk: stat('str') + wAtk,
    def: Math.round(stat('vit') * 0.55) + aDef,
    matk: stat('dex'),
    mdef: Math.round(stat('mnd') * 0.6),
    agi: stat('agi'),
    luk: stat('luk'),
    skills: c.skills,
    charId: c.id,
    row,
    guard: false,
    buffs: {},
    chainCount: 0,
  }
}

export function combatantFromEnemy(e: EnemyDef, idx: number): Combatant {
  return {
    key: `en_${e.id}_${idx}_${uid('c')}`,
    isAlly: false,
    name: idx > 0 ? `${e.name} ${String.fromCharCode(65 + idx)}` : e.name,
    element: e.element,
    hp: e.hp, maxHp: e.hp, mp: 999, maxMp: 999,
    atk: e.atk,
    def: e.def,
    matk: e.atk,
    mdef: Math.round(e.def * 0.8),
    agi: e.agi,
    luk: 10,
    skills: e.skillIds,
    enemyId: e.id,
    row: 'front',
    guard: false,
    buffs: {},
    chainCount: 0,
  }
}

export function startBattle(party: Combatant[], enemies: Combatant[]): BattleState {
  const st: BattleState = {
    allies: party,
    enemies,
    turn: 1,
    order: [],
    orderIndex: 0,
    log: [{ text: '魔性が現れた!', kind: 'info' }],
    phase: 'input',
    chain: 0,
  }
  return { ...st, order: computeOrder(st) }
}

function computeOrder(st: BattleState): string[] {
  return [...st.allies, ...st.enemies]
    .filter((c) => c.hp > 0)
    .sort((a, b) => b.agi - a.agi)
    .map((c) => c.key)
}

export function findCombatant(st: BattleState, key: string): Combatant | undefined {
  return [...st.allies, ...st.enemies].find((c) => c.key === key)
}

export function currentActor(st: BattleState): Combatant | undefined {
  return findCombatant(st, st.order[st.orderIndex])
}

// ---- ダメージ計算 ----
function elementMult(atkEl: Element | undefined, defEl: Element): number {
  if (!atkEl) return 1
  if (ELEMENT_ADVANTAGE[atkEl] === defEl) return 1.35
  if (ELEMENT_ADVANTAGE[defEl] === atkEl) return 0.72
  return 1
}

export interface BattleAction {
  type: 'attack' | 'skill' | 'guard' | 'flee'
  skillId?: string
  targetKey?: string
}

export interface ActionResult {
  state: BattleState
  entries: BattleLogEntry[]
}

// 行動を解決し新しい状態を返す(不変更新)
export function performAction(st0: BattleState, actorKey: string, action: BattleAction, rng: Rng): ActionResult {
  let st = st0
  const entries: BattleLogEntry[] = []
  const actor = findCombatant(st, actorKey)
  if (!actor || actor.hp <= 0) return { state: st, entries }

  const push = (text: string, kind: BattleLogEntry['kind'] = 'info') => entries.push({ text, kind })

  const updateCombatant = (key: string, fn: (c: Combatant) => Combatant): void => {
    st = {
      ...st,
      allies: st.allies.map((c) => (c.key === key ? fn(c) : c)),
      enemies: st.enemies.map((c) => (c.key === key ? fn(c) : c)),
    }
  }

  if (action.type === 'guard') {
    updateCombatant(actorKey, (c) => ({ ...c, guard: true }))
    push(`${actor.name}は身を固めた。`)
  } else if (action.type === 'flee') {
    const allyAgi = avg(st.allies.filter((c) => c.hp > 0).map((c) => c.agi))
    const enAgi = avg(st.enemies.filter((c) => c.hp > 0).map((c) => c.agi))
    const p = Math.min(0.9, Math.max(0.25, 0.55 + (allyAgi - enAgi) * 0.012))
    if (rng.chance(p)) {
      st = { ...st, phase: 'fled' }
      push('一族は夜藪の闇に紛れて退いた。', 'info')
      return { state: st, entries }
    }
    push('退路を塞がれた!', 'info')
  } else {
    // attack / skill
    const skill = action.type === 'skill' && action.skillId ? skillById(action.skillId) : undefined
    if (skill && actor.mp < skill.mpCost) {
      push(`${actor.name}は灯力が足りない!`)
      return endOfAction(st, entries)
    }
    if (skill) updateCombatant(actorKey, (c) => ({ ...c, mp: c.mp - skill.mpCost }))

    const foes = actor.isAlly ? st.enemies : st.allies
    const friends = actor.isAlly ? st.allies : st.enemies

    if (!skill || skill.type === 'attack') {
      // 対象決定
      const power = skill?.power ?? 100
      const el = skill?.element ?? actor.element
      const targets =
        skill?.target === 'enemies'
          ? foes.filter((c) => c.hp > 0)
          : [findCombatant(st, action.targetKey ?? '') ?? rng.pick(foes.filter((c) => c.hp > 0))]
      for (const t0 of targets) {
        const t = findCombatant(st, t0.key)
        if (!t || t.hp <= 0) continue
        // 継足(味方の攻撃連携)
        let chainMult = 1
        if (actor.isAlly && targets.length === 1) {
          if (st.chainTarget === t.key) {
            const chain = Math.min(st.chain + 1, 4)
            st = { ...st, chain, chainTarget: t.key }
            chainMult = 1 + chain * 0.15
            if (chain >= 1) push(`継足${chain + 1}連! 一族の連撃が重なる!`, 'chain')
          } else {
            st = { ...st, chain: 0, chainTarget: t.key }
          }
        }
        const isMagic = !!skill && skill.element !== undefined && actor.matk > actor.atk
        const atkV = isMagic ? actor.matk : actor.atk
        const defV = (isMagic ? t.mdef : t.def) * (t.guard ? 1.8 : 1)
        const buffMult = (actor.buffs.atkUp ? 1.25 : 1) / (t.buffs.defUp ? 1.2 : 1)
        let dmg = Math.max(1, atkV * (power / 100) * (0.9 + rng.next() * 0.2) - defV * 0.9)
        dmg *= elementMult(el, t.element) * chainMult * buffMult
        if (t.guard) dmg *= 0.55
        if (t.row === 'back') dmg *= 0.8
        const critP = (actor.luk * 0.1 + (isMagic ? 0 : actor.matk * 0.05)) / 100
        const crit = rng.chance(Math.min(0.25, critP + 0.04))
        if (crit) dmg *= 1.6
        const final = Math.max(1, Math.round(dmg))
        updateCombatant(t.key, (c) => ({ ...c, hp: Math.max(0, c.hp - final) }))
        const em = elementMult(el, t.element)
        push(
          `${actor.name}の${skill ? skill.name : '攻撃'}! ${t.name}に${final}のダメージ${crit ? '(会心!)' : ''}${em > 1 ? '(弱点!)' : em < 1 ? '(耐性)' : ''}`,
          'dmg',
        )
        const after = findCombatant(st, t.key)
        if (after && after.hp <= 0) {
          push(`${t.name}は闇に還った。`, 'ko')
          if (st.chainTarget === t.key) st = { ...st, chain: 0, chainTarget: undefined }
        }
      }
    } else if (skill.type === 'heal') {
      const targets =
        skill.target === 'allies'
          ? friends.filter((c) => c.hp > 0)
          : [findCombatant(st, action.targetKey ?? '') ?? actor]
      for (const t of targets) {
        if (t.hp <= 0) continue
        const amount = Math.round((actor.matk * skill.power) / 100 + 10)
        updateCombatant(t.key, (c) => ({ ...c, hp: Math.min(c.maxHp, c.hp + amount) }))
        push(`${skill.name}! ${t.name}の傷が${amount}癒えた。`, 'heal')
      }
    } else if (skill.type === 'buff') {
      const isDef = skill.id === 'himamori' || skill.id === 'g_iwakura'
      for (const t of friends.filter((c) => c.hp > 0)) {
        updateCombatant(t.key, (c) => ({
          ...c,
          buffs: { ...c.buffs, [isDef ? 'defUp' : 'atkUp']: 3 },
        }))
      }
      push(`${actor.name}の${skill.name}! 一族の${isDef ? '守り' : '闘気'}が高まる。`, 'heal')
    } else if (skill.type === 'debuff') {
      for (const t of foes.filter((c) => c.hp > 0)) {
        updateCombatant(t.key, (c) => ({ ...c, atk: Math.round(c.atk * (1 - skill.power / 100)) }))
      }
      push(`${actor.name}の${skill.name}! 敵の力が削がれた。`, 'info')
    }
  }

  return endOfAction(st, entries)
}

function endOfAction(st0: BattleState, entries: BattleLogEntry[]): ActionResult {
  let st = st0
  // 勝敗判定
  if (st.enemies.every((c) => c.hp <= 0)) {
    st = { ...st, phase: 'won' }
    entries.push({ text: '夜藪に、僅かな静けさが戻った。', kind: 'win' })
    return { state: st, entries }
  }
  if (st.allies.every((c) => c.hp <= 0)) {
    st = { ...st, phase: 'lost' }
    entries.push({ text: '一族の灯が、闇に呑まれた……', kind: 'lose' })
    return { state: st, entries }
  }
  // 次の行動者へ
  let idx = st.orderIndex + 1
  let turn = st.turn
  let order = st.order
  let allies = st.allies
  let enemies = st.enemies
  if (idx >= order.length) {
    idx = 0
    turn += 1
    // ターン終了処理: ガード解除・バフ減衰
    const decay = (c: Combatant): Combatant => ({
      ...c,
      guard: false,
      buffs: {
        atkUp: c.buffs.atkUp && c.buffs.atkUp > 1 ? c.buffs.atkUp - 1 : undefined,
        defUp: c.buffs.defUp && c.buffs.defUp > 1 ? c.buffs.defUp - 1 : undefined,
      },
    })
    allies = allies.map(decay)
    enemies = enemies.map(decay)
    st = { ...st, allies, enemies }
    order = computeOrder(st)
  } else {
    // 死者スキップ
    while (idx < order.length) {
      const c = findCombatant(st, order[idx])
      if (c && c.hp > 0) break
      idx++
    }
    if (idx >= order.length) {
      return endOfAction({ ...st, orderIndex: order.length - 1 }, entries)
    }
  }
  return { state: { ...st, orderIndex: idx, turn, order }, entries }
}

// 敵AI: スキルか通常攻撃、前列を優先的に狙う
export function enemyAction(st: BattleState, actor: Combatant, rng: Rng): BattleAction {
  const alive = st.allies.filter((c) => c.hp > 0)
  if (alive.length === 0) return { type: 'guard' }
  const front = alive.filter((c) => c.row === 'front')
  const pool = front.length > 0 && rng.chance(0.7) ? front : alive
  const target = rng.pick(pool)
  if (actor.skills.length > 0 && rng.chance(0.35)) {
    return { type: 'skill', skillId: rng.pick(actor.skills), targetKey: target.key }
  }
  return { type: 'attack', targetKey: target.key }
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
