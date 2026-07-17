import type { BattleState, BattleLogEntry, Character, Combatant, EnemyDef, EnemyIntent, Element } from './types'
import { ELEMENT_ADVANTAGE } from './types'
import { Rng, uid } from './rng'
import { skillById } from './data/skills'
import { consumableById } from './data/consumables'
import { personalityById } from './data/personalities'
import { voiceFor } from './data/voices'
import { tomoshigataById } from './data/toza'
import { jobById } from './data/jobs'

// ---- コンバータント生成 ----
export function combatantFromChar(c: Character, row: 'front' | 'back'): Combatant {
  const p = personalityById(c.personalityId)
  const bias = p.battleBias
  const gataBias = c.tomoshigata ? tomoshigataById(c.tomoshigata).statBias : {}
  const jobBias = c.jobClass ? jobById(c.jobClass).statBias : {}
  const wAtk = c.equipment.weapon?.atk ?? 0
  const aDef = c.equipment.armor?.def ?? 0
  const charm = c.equipment.charm?.statBonus ?? {}
  const stat = (k: keyof Character['stats']) =>
    c.stats[k] + (bias[k] ?? 0) + (gataBias[k] ?? 0) + (jobBias[k] ?? 0) + ((charm as Record<string, number>)[k] ?? 0)
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
    personalityId: c.personalityId,
    weaponLegacy: c.equipment.weapon?.legacyOf,
  }
}

// M28-B: ダメージ下限割合を「攻撃側atkに反比例」で決める。減算防御(def×0.9)で弱攻撃が1固定に
// なる問題の是正。下限=生ダメ×frac が「毎撃ほぼ一定の最低ダメージ(≈7)」を全attackerに保証する。
// tierではなくatk基準にする理由(devil指摘): ボスは全てtier5だが atk32(苔ノ主)〜85(玄冬)と幅が
// あり、tier一律では弱ボスが無力・強ボスが過剰になる。atk基準なら弱敵ほど下限大・強敵ほど下限小で
// 最低ダメージが一定化し、ボスの長期戦バランス(玄冬の被弾量)を壊さない。
const FLOOR_TARGET = 13 // 下限が保証する概算の最低ダメージ(序盤の手応えの主レバー)
export function floorFracFromAtk(atk: number): number {
  return Math.max(0.08, Math.min(0.55, FLOOR_TARGET / Math.max(1, atk)))
}

// M28-B: 敵の生存力(hp)・打点(atk)のtier別強化。「1-2撃で勝ち・被弾なし」の是正。
// シミュレーション(tests/balance_sim)で宿命モードの被HP/瀕死率を見て決定。
// ボス(tier5)は据え置き(既存の長期戦バランスを壊さない)。老(_o)変異は元tierの倍率で乗る。
export function enemyPower(tier: number): { hp: number; atk: number } {
  switch (tier) {
    case 1: return { hp: 2.5, atk: 1.6 }
    case 2: return { hp: 2.1, atk: 1.45 }
    case 3: return { hp: 1.65, atk: 1.28 }
    case 4: return { hp: 1.3, atk: 1.13 }
    default: return { hp: 1, atk: 1 } // tier5 ボス
  }
}

export function combatantFromEnemy(e: EnemyDef, idx: number): Combatant {
  const pow = enemyPower(e.tier)
  const atk = Math.round(e.atk * pow.atk)
  return {
    key: `en_${e.id}_${idx}_${uid('c')}`,
    isAlly: false,
    name: idx > 0 ? `${e.name} ${String.fromCharCode(65 + idx)}` : e.name,
    element: e.element,
    hp: Math.round(e.hp * pow.hp), maxHp: Math.round(e.hp * pow.hp), mp: 999, maxMp: 999,
    atk,
    def: e.def,
    matk: atk,
    mdef: Math.round(e.def * 0.8),
    agi: e.agi,
    luk: 10,
    skills: e.skillIds,
    enemyId: e.id,
    row: 'front',
    guard: false,
    buffs: {},
    chainCount: 0,
    dmgFloorFrac: floorFracFromAtk(atk),
  }
}

export function startBattle(party: Combatant[], enemies: Combatant[]): BattleState {
  // v3.1 M12-4: 群れには「長」がいる(最大HPの個体)。斃せば雑兵は浮き足立つ
  const leader = enemies.length > 1 ? [...enemies].sort((a, b) => b.maxHp - a.maxHp)[0] : undefined
  const st: BattleState = {
    allies: party,
    enemies,
    turn: 1,
    order: [],
    orderIndex: 0,
    log: [
      { text: '魔性が現れた!', kind: 'info' },
      ...(leader ? [{ text: `${leader.name}が群れを率いている — 長を斃せば崩れる。`, kind: 'info' as const }] : []),
    ],
    phase: 'input',
    chain: 0,
    leaderKey: leader?.key,
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
  type: 'attack' | 'skill' | 'guard' | 'flee' | 'item'
  skillId?: string
  itemId?: string // M28-C: type==='item' のとき消耗品ID(在庫の増減は store 側)
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

  const push = (text: string, kind: BattleLogEntry['kind'] = 'info', meta?: Partial<BattleLogEntry>) =>
    entries.push({ text, kind, ...meta })

  // v3.1 M15-1: 文脈台詞(吹き出し) — 間が大事なので確率制御
  const speak = (c: Combatant, ctx: Parameters<typeof voiceFor>[1], p: number) => {
    if (!c.isAlly || !c.personalityId || !rng.chance(p)) return
    const legacy = ctx === 'memento' ? c.weaponLegacy : undefined
    const line = voiceFor(c.personalityId, ctx, rng, { legacy })
    if (line) push(line, 'voice', { actorKey: c.key })
  }

  const updateCombatant = (key: string, fn: (c: Combatant) => Combatant): void => {
    st = {
      ...st,
      allies: st.allies.map((c) => (c.key === key ? fn(c) : c)),
      enemies: st.enemies.map((c) => (c.key === key ? fn(c) : c)),
    }
  }

  if (action.type === 'guard') {
    updateCombatant(actorKey, (c) => ({ ...c, guard: true }))
    push(`${actor.name}は身を固めた。`, 'info', { actorKey: actor.key })
  } else if (action.type === 'flee') {
    if (!actor.isAlly) {
      // 浮き足立った雑兵の逃走(M12-4) — その個体だけ戦場から消える
      updateCombatant(actorKey, (c) => ({ ...c, hp: 0 }))
      push(`${actor.name}は算を乱して逃げ散った!`, 'info', { actorKey: actor.key })
      return endOfAction(st, entries, rng)
    }
    const allyAgi = avg(st.allies.filter((c) => c.hp > 0).map((c) => c.agi))
    const enAgi = avg(st.enemies.filter((c) => c.hp > 0).map((c) => c.agi))
    const p = Math.min(0.9, Math.max(0.25, 0.55 + (allyAgi - enAgi) * 0.012))
    if (rng.chance(p)) {
      st = { ...st, phase: 'fled' }
      push('一族は夜藪の闇に紛れて退いた。', 'info')
      return { state: st, entries }
    }
    push('退路を塞がれた!', 'info')
  } else if (action.type === 'item') {
    // M28-C: 消耗品(回復薬)。灯力は消費せず、効果を対象へ適用する。在庫の増減は store 側。
    const def = action.itemId ? consumableById(action.itemId) : undefined
    if (!def) return endOfAction(st, entries, rng)
    const friends = actor.isAlly ? st.allies : st.enemies
    const targets =
      def.effect.scope === 'party'
        ? friends.filter((c) => c.hp > 0)
        : [findCombatant(st, action.targetKey ?? '') ?? actor].filter((c) => c.hp > 0)
    for (const t of targets) {
      if (def.effect.stat === 'hp') {
        const amount = def.effect.amount
        updateCombatant(t.key, (c) => ({ ...c, hp: Math.min(c.maxHp, c.hp + amount) }))
        push(`${actor.name}は${def.name}を使った — ${t.name}の傷が${amount}癒えた。`, 'heal', {
          actorKey: actor.key, targetKey: t.key, amount,
        })
      } else {
        const amount = def.effect.amount
        updateCombatant(t.key, (c) => ({ ...c, mp: Math.min(c.maxMp, c.mp + amount) }))
        push(`${actor.name}は${def.name}を使った — ${t.name}の灯力が${amount}満ちた。`, 'heal', {
          actorKey: actor.key, targetKey: t.key, amount,
        })
      }
    }
  } else {
    // attack / skill — 静心の加護(v3.1 M16-4)で灯力の消費が減る
    const skill = action.type === 'skill' && action.skillId ? skillById(action.skillId) : undefined
    const mpCost = skill ? Math.max(1, Math.ceil(skill.mpCost * (1 - (actor.mpDiscount ?? 0)))) : 0
    if (skill && actor.mp < mpCost) {
      push(`${actor.name}は灯力が足りない!`)
      return endOfAction(st, entries, rng)
    }
    if (skill) updateCombatant(actorKey, (c) => ({ ...c, mp: c.mp - mpCost }))

    const foes = actor.isAlly ? st.enemies : st.allies
    const friends = actor.isAlly ? st.allies : st.enemies

    if (!skill || skill.type === 'attack') {
      // 攻撃前のひと声(形見の得物なら故人へ) — M15-1
      if (actor.weaponLegacy) speak(actor, 'memento', 0.3)
      else speak(actor, 'attack', 0.22)
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
            if (chain >= 1) push(`継足${chain + 1}連! 一族の連撃が重なる!`, 'chain', { targetKey: t.key })
          } else {
            st = { ...st, chain: 0, chainTarget: t.key }
          }
        }
        const isMagic = !!skill && skill.element !== undefined && actor.matk > actor.atk
        // 血汐の滾り(M16-4): 体力半分以下で火力+25%
        const rageK = actor.boonRage && actor.hp <= actor.maxHp / 2 ? 1.25 : 1
        const atkV = (isMagic ? actor.matk : actor.atk) * rageK
        const defV = (isMagic ? t.mdef : t.def) * (t.guard ? 1.8 : 1)
        const buffMult = (actor.buffs.atkUp ? 1.25 : 1) / (t.buffs.defUp ? 1.2 : 1)
        // M28-B: 減算防御で弱攻撃が1固定になるのを是正。生ダメージの一定割合(下限)は必ず通す。
        // 下限はguard/back倍率の「前」に置き、防御姿勢・後列の軽減は下限にも効かせる(devil指摘)。
        const raw = atkV * (power / 100) * (0.9 + rng.next() * 0.2)
        let dmg = Math.max(raw * (actor.dmgFloorFrac ?? 0), raw - defV * 0.9)
        dmg *= elementMult(el, t.element) * chainMult * buffMult
        if (t.guard) dmg *= 0.55
        if (t.row === 'back') dmg *= 0.8
        const critP = (actor.luk * 0.1 + (isMagic ? 0 : actor.matk * 0.05)) / 100
        const crit = rng.chance(Math.min(0.25, critP + 0.04))
        if (crit) dmg *= 1.6
        const final = Math.max(1, Math.round(dmg))
        const beforeHp = t.hp
        updateCombatant(t.key, (c) => ({ ...c, hp: Math.max(0, c.hp - final) }))
        const em = elementMult(el, t.element)
        push(
          `${actor.name}の${skill ? skill.name : '攻撃'}! ${t.name}に${final}のダメージ${crit ? '(会心!)' : ''}${em > 1 ? '(弱点!)' : em < 1 ? '(耐性)' : ''}`,
          'dmg',
          { actorKey: actor.key, targetKey: t.key, amount: final, element: el, crit, weak: em > 1 },
        )
        const after = findCombatant(st, t.key)
        // 被弾側のひと声: 危機(3割を初めて割る)は必ず、通常被弾は稀に — M15-1
        if (after && after.isAlly && after.hp > 0) {
          const crisisLine = beforeHp > t.maxHp * 0.3 && after.hp <= t.maxHp * 0.3
          if (crisisLine) speak(after, 'crisis', 0.9)
          else speak(after, 'hurt', 0.12)
        }
        if (after && after.hp <= 0) {
          push(`${t.name}は闇に還った。`, 'ko', { targetKey: t.key })
          if (st.chainTarget === t.key) st = { ...st, chain: 0, chainTarget: undefined }
          // 長の陥落(M12-4): 雑兵が浮き足立つ(攻撃弱体+以後逃走しうる)
          if (!t.isAlly && st.leaderKey === t.key && !st.morale) {
            st = {
              ...st,
              morale: true,
              enemies: st.enemies.map((c) =>
                c.hp > 0 ? { ...c, atk: Math.round(c.atk * 0.72) } : c,
              ),
            }
            push('長が斃れ、魔性どもが浮き足立った!', 'chain')
          }
        }
        // 連携奥義(M12-7): 血縁(兄妹・親子)が同じ的へ追撃する
        const t2 = findCombatant(st, t.key)
        if (actor.isAlly && actor.kinKeys && t2 && t2.hp > 0 && targets.length === 1 && rng.chance(0.18)) {
          const kin = st.allies.find((a) => a.hp > 0 && actor.kinKeys!.includes(a.key))
          if (kin) {
            speak(kin, 'kin', 0.8)
            const kdmg = Math.max(1, Math.round(kin.atk * 0.55 * (0.9 + rng.next() * 0.2) - t2.def * 0.45))
            updateCombatant(t2.key, (c) => ({ ...c, hp: Math.max(0, c.hp - kdmg) }))
            push(`血の呼応! ${kin.name}が続けて斬り込む — ${t2.name}に${kdmg}のダメージ`, 'chain', {
              actorKey: kin.key, targetKey: t2.key, amount: kdmg,
            })
            const after2 = findCombatant(st, t2.key)
            if (after2 && after2.hp <= 0) {
              push(`${t2.name}は闇に還った。`, 'ko', { targetKey: t2.key })
              if (st.chainTarget === t2.key) st = { ...st, chain: 0, chainTarget: undefined }
            }
          }
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
        push(`${skill.name}! ${t.name}の傷が${amount}癒えた。`, 'heal', {
          actorKey: actor.key, targetKey: t.key, amount, element: skill.element,
        })
      }
    } else if (skill.type === 'buff') {
      const isDef = skill.id === 'himamori' || skill.id === 'g_iwakura'
      for (const t of friends.filter((c) => c.hp > 0)) {
        updateCombatant(t.key, (c) => ({
          ...c,
          buffs: { ...c.buffs, [isDef ? 'defUp' : 'atkUp']: 3 },
        }))
      }
      push(`${actor.name}の${skill.name}! 一族の${isDef ? '守り' : '闘気'}が高まる。`, 'heal', {
        actorKey: actor.key, element: skill.element,
      })
    } else if (skill.type === 'debuff') {
      for (const t of foes.filter((c) => c.hp > 0)) {
        updateCombatant(t.key, (c) => ({ ...c, atk: Math.round(c.atk * (1 - skill.power / 100)) }))
      }
      push(`${actor.name}の${skill.name}! 敵の力が削がれた。`, 'info', {
        actorKey: actor.key, element: skill.element,
      })
    }
  }

  return endOfAction(st, entries, rng)
}

function endOfAction(st0: BattleState, entries: BattleLogEntry[], rng?: Rng): ActionResult {
  let st = st0
  // 勝敗判定
  if (st.enemies.every((c) => c.hp <= 0)) {
    st = { ...st, phase: 'won' }
    // 勝鬨のひと声(M15-1)
    if (rng) {
      const alive = st.allies.filter((c) => c.hp > 0 && c.personalityId)
      if (alive.length > 0) {
        const v = rng.pick(alive)
        const line = voiceFor(v.personalityId!, 'victory', rng)
        if (line) entries.push({ text: line, kind: 'voice', actorKey: v.key })
      }
    }
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
      return endOfAction({ ...st, orderIndex: order.length - 1 }, entries, rng)
    }
  }
  return { state: { ...st, orderIndex: idx, turn, order }, entries }
}

// 敵AI: スキルか通常攻撃、前列を優先的に狙う
export function enemyAction(st: BattleState, actor: Combatant, rng: Rng): BattleAction {
  // 長なき群れは戦意が続かない(M12-4)
  if (st.morale && rng.chance(0.22)) return { type: 'flee' }
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

// ---- M25 §5: 敵の兆し ----
// enemyAction は一切変更しない(上の関数はバイト同一)。兆しは「いつ呼ぶか」だけを足す:
// 実rngをクローンして先読みし、実戦闘の乱数消費・対象選択・威力を一切変えない。
// → ゴールデンテスト(固定RngでenemyActionの返り値が前後一致)が成立する。

/** BattleAction を兆しカテゴリへ写像。guard/flee は兆しを出さない(null)。 */
export function intentOf(action: BattleAction): EnemyIntent | null {
  if (action.type === 'attack') return 'atk'
  if (action.type === 'skill') {
    return action.skillId && skillById(action.skillId).target === 'enemies' ? 'aoe' : 'tech'
  }
  return null
}

/** 各生存敵の次行動カテゴリを先読みする。
 *  rng は new Rng(rng.state()) でクローンし、実rngを一切消費しない(挙動を変えない)。 */
export function computeIntents(st: BattleState, rng: Rng): Record<string, EnemyIntent> {
  const out: Record<string, EnemyIntent> = {}
  for (const e of st.enemies) {
    if (e.hp <= 0) continue
    const cat = intentOf(enemyAction(st, e, new Rng(rng.state())))
    if (cat) out[e.key] = cat
  }
  return out
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
