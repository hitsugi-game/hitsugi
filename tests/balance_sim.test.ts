// M28-B: 戦闘バランスのシミュレーション実測(devil規律=推測でなく数値・忠実harness)。
// 既存 battle 関数を headless で回す。player policy = 常時通常攻撃(=オート/最弱プレイ)。
// enemy = 実 enemyAction。narrative易化(敵atk/hp×0.78)を再現。指標に「瀕死率」を含む。
// ボス安全表(devil必須): 下限導入がボス戦を破綻(勝てない)させないことを確認する。
import { describe, expect, it } from 'vitest'
import { combatantFromChar, combatantFromEnemy, currentActor, enemyAction, floorFracFromAtk, performAction, startBattle } from '../src/core/battle'
import { skillById } from '../src/core/data/skills'
import { ENEMIES, enemyById } from '../src/core/data/enemies'
import { itemBaseById } from '../src/core/data/items'
import { REGIONS, regionById } from '../src/core/data/regions'
import { pickEnemies } from '../src/core/expedition'
import { recalcStats } from '../src/core/inheritance'
import { scaleEncounterEnemy } from '../src/core/encounter_difficulty'
import { Rng } from '../src/core/rng'
import {
  DUNGEON_STEP_LIGHT_COST,
  DUNGEON_VICTORY_LIGHT_COST,
  isDarkLight,
} from '../src/dungeon/light_pressure'
import { dungeonByRegion } from '../src/dungeon/maps'
import { activeShadeCount } from '../src/dungeon/shade_population'
import type { BattleAction, BattleState, Character, Combatant, Element, EnemyDef, Item, Stats } from '../src/core/types'

type Row = 'front' | 'back'
function ally(name: string, atk: number, def: number, hp: number, agi: number, row: Row, mp = 45, skills: string[] = []): Combatant {
  return {
    key: name, isAlly: true, name, element: 'fire',
    hp, maxHp: hp, mp, maxMp: mp,
    atk, def, matk: Math.round(atk * 0.75), mdef: Math.round(def * 0.8), agi, luk: 14,
    skills, row, guard: false, buffs: {}, chainCount: 0, dmgFloorFrac: floorFracFromAtk(atk), // 実 combatantFromChar と同一
  }
}
// 代表party: 素手gen1(序盤) / 装備gen3(中盤) / 精鋭gen6(ボス到達時・devil worst def~120)
const earlyParty = (): Combatant[] => [ally('当主', 38, 23, 137, 34, 'front'), ally('二人目', 34, 20, 130, 30, 'front'), ally('三人目', 30, 18, 120, 28, 'back')]
// M33: 現実policy用に、精鋭PTへ「大防御(def48)/攻撃バフ/回復/攻撃技」を持たせる。
// attack固定policy(既存テスト)では skills は未使用なので、既存の「ボス安全表」結果には影響しない。
const bossParty = (): Combatant[] => [
  ally('当主', 72, 92, 210, 30, 'front', 90, ['gs_earth3', 'homura_giri']), // 大防御(power48) + 攻撃
  ally('二人目', 66, 78, 195, 28, 'front', 90, ['kien', 'homura_giri']),      // 攻撃バフ(power30) + 攻撃
  ally('三人目', 60, 70, 180, 26, 'back', 90, ['koyashi', 'homura_giri']),    // 回復(130) + 攻撃
  ally('四人目', 58, 66, 175, 32, 'back', 80, ['homura_giri']),
]

// M47 Work3: 「装備gen3相当」を曖昧な手打ちCombatantでなく、実Character→combatantFromChar経路で固定する。
// 店初期装備を三度継いだ形見(+36%)、人物3代目・月齢15・熟達Lv6を中盤基準とする。
const MID_SEASON = 15
const MID_ITEM_GENERATION = 3
const MID_LEVEL = 6

function inheritedMidItem(baseId: string, owner: string): Item {
  const base = itemBaseById(baseId)
  const mult = 1 + MID_ITEM_GENERATION * 0.12
  return {
    id: `mid_${owner}_${baseId}`,
    baseId,
    name: `${base.name}・三代`,
    slot: base.slot,
    atk: base.atk ? Math.round(base.atk * mult) : undefined,
    def: base.def ? Math.round(base.def * mult) : undefined,
    statBonus: base.statBonus
      ? Object.fromEntries(Object.entries(base.statBonus).map(([key, value]) => [key, Math.round(value * mult)])) as Partial<Stats>
      : undefined,
    generation: MID_ITEM_GENERATION,
    legacyOf: '先代',
    source: 'shop',
  }
}

function midCharacter(
  id: string,
  name: string,
  element: Element,
  personalityId: string,
  potential: Stats,
  skills: string[],
  isHead = false,
): Character {
  const base: Character = {
    id,
    name,
    gen: 3,
    sex: id === 'mid_2' ? 'm' : 'f',
    bornSeason: 0,
    potential,
    level: MID_LEVEL,
    exp: 0,
    stats: potential,
    hp: 1,
    maxHp: 1,
    mp: 1,
    maxMp: 1,
    element,
    personalityId,
    skills,
    equipment: {
      weapon: inheritedMidItem('w_katana', id),
      armor: inheritedMidItem('a_kawado', id),
    },
    godParentId: 'mid_fixture',
    isHead,
    alive: true,
    kills: 30,
    expeditions: 8,
    deeds: [],
    fatigue: 0,
  }
  return recalcStats(base, MID_SEASON)
}

function midCharacters(): Character[] {
  return [
    midCharacter('mid_1', '三代当主', 'fire', 'brave', { str: 55, vit: 52, dex: 48, agi: 46, mnd: 44, luk: 42 }, ['kien', 'homura_giri'], true),
    midCharacter('mid_2', '三代守手', 'earth', 'easy', { str: 48, vit: 58, dex: 44, agi: 40, mnd: 46, luk: 40 }, ['himamori', 'iwatoshi']),
    midCharacter('mid_3', '三代癒手', 'water', 'kind', { str: 42, vit: 48, dex: 50, agi: 44, mnd: 60, luk: 46 }, ['ooinori', 'koyashi', 'mikagami']),
    midCharacter('mid_4', '三代星手', 'star', 'rival', { str: 50, vit: 46, dex: 58, agi: 55, mnd: 48, luk: 45 }, ['gs_star2', 'hoshiugachi']),
  ]
}

const midParty = (): Combatant[] => midCharacters().map((character, index) => combatantFromChar(character, index < 2 ? 'front' : 'back'))

// M33: 現実的な味方policy — 「瀕死なら回復 / 未バフならバフ / それ以外は最強攻撃技 or 素手」。
// これで ⑬(バフ効果量のpower反映)が sim の勝敗・被HP・瀕死率へ反映される(旧attack固定では不可視)。
function smartAllyAction(st: BattleState, actor: Combatant): BattleAction {
  const foe = st.enemies.find((e) => e.hp > 0)
  if (!foe) return { type: 'attack' }
  const my = actor.skills.map((id) => skillById(id))
  // 1. 瀕死(<40%)の味方がいて回復技が撃てる
  const wounded = st.allies.filter((a) => a.hp > 0 && a.hp < a.maxHp * 0.4).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
  const heal = my.find((s) => s.type === 'heal' && actor.mp >= s.mpCost)
  if (wounded && heal) return { type: 'skill', skillId: heal.id, targetKey: heal.target === 'ally' ? wounded.key : undefined }
  // 2. 自分が未バフでバフ技が撃てる(序盤に一度)
  const buff = my.find((s) => s.type === 'buff' && actor.mp >= s.mpCost)
  const buffed = buff && (buff.buffKind === 'def' ? actor.buffs.defMag : actor.buffs.atkMag)
  if (buff && !buffed) return { type: 'skill', skillId: buff.id }
  // 3. 最強の単体攻撃技 or 素手
  const atk = my.filter((s) => s.type === 'attack' && s.target === 'enemy' && actor.mp >= s.mpCost).sort((a, b) => b.power - a.power)[0]
  if (atk) return { type: 'skill', skillId: atk.id, targetKey: foe.key }
  return { type: 'attack', targetKey: foe.key }
}

const TIER1_BASE = ENEMIES.filter((e) => e.tier === 1 && !e.id.startsWith('boss_') && !/_[wo]$/.test(e.id))
// 探索用: hpMul/atkMul で敵の生存力・打点を試す(採用値は combatantFromEnemy へ焼く)
let HP_MUL = 1, ATK_MUL = 1
function eased(e: EnemyDef, ease: number): EnemyDef {
  return { ...e, atk: Math.round(e.atk * ease * ATK_MUL), hp: Math.round(e.hp * ease * HP_MUL) }
}

interface SimResult {
  won: boolean
  phase: BattleState['phase']
  rounds: number
  allyHpLossPct: number
  nearDeath: boolean
  allies: Combatant[]
}
function simBattle(party: Combatant[], enemies: Combatant[], rng: Rng, smart = false): SimResult {
  let st: BattleState = startBattle(party.map((c) => ({ ...c })), enemies.map((c) => ({ ...c })))
  const initHp = st.allies.reduce((s, a) => s + a.maxHp, 0)
  let nearDeath = false
  let guard = 0
  while ((st.phase === 'input' || st.phase === 'anim') && guard < 300) {
    const actor = currentActor(st)
    if (!actor) break
    if (actor.isAlly) {
      const foe = st.enemies.find((e) => e.hp > 0)
      if (!foe) break
      const action: BattleAction = smart ? smartAllyAction(st, actor) : { type: 'attack', targetKey: foe.key }
      st = performAction(st, actor.key, action, rng).state
    } else {
      st = performAction(st, actor.key, enemyAction(st, actor, rng), rng).state
    }
    if (st.allies.some((a) => a.hp > 0 && a.hp < a.maxHp * 0.3)) nearDeath = true
    guard++
  }
  const finalHp = st.allies.reduce((s, a) => s + a.hp, 0)
  return {
    won: st.phase === 'won',
    phase: st.phase,
    rounds: guard,
    allyHpLossPct: ((initHp - finalHp) / initHp) * 100,
    nearDeath,
    allies: st.allies,
  }
}

function agg(n: number, make: (rng: Rng) => { party: Combatant[]; enemies: Combatant[] }, smart = false) {
  let wins = 0, roundsSum = 0, lossSum = 0, near = 0
  for (let s = 1; s <= n; s++) {
    const setup = make(new Rng(s * 40503))
    const r = simBattle(setup.party, setup.enemies, new Rng(s * 2654435761), smart)
    if (r.won) wins++
    roundsSum += r.rounds; lossSum += r.allyHpLossPct; if (r.nearDeath) near++
  }
  return { winRate: wins / n, avgRounds: roundsSum / n, avgHpLossPct: lossSum / n, nearDeathRate: near / n }
}

const report = (label: string, a: ReturnType<typeof agg>) =>
  console.log(`[balance] ${label}: 勝率${(a.winRate * 100).toFixed(0)}% 行動${a.avgRounds.toFixed(1)} 被HP${a.avgHpLossPct.toFixed(1)}% 瀕死${(a.nearDeathRate * 100).toFixed(0)}%`)

// 実歩行floorの敵影数は maps.gen.ts → activeShadeCount のproduction経路から導出する。
// 戦闘間には平均12歩を置き、歩行0.45/歩と勝利6をproduction定数から差し引く。
const MID_REGION_ID = 'hoshimukuro_tani'
const STEPS_BETWEEN_ENCOUNTERS = 12

interface FloorScenario {
  floorIndex: number
  startLight: number
}

interface FloorRunResult {
  completed: boolean
  wiped: boolean
  nearDeath: boolean
  hpRatio: number
  mpRatio: number
  actions: number
  darkBattles: number
  mpExhausted: boolean
  fightsWon: number
  endLight: number
}

function encounterCountForFloor(floorIndex: number): number {
  const floor = dungeonByRegion(MID_REGION_ID)?.floors[floorIndex]
  if (!floor) throw new Error(`missing ${MID_REGION_ID} floor ${floorIndex}`)
  return activeShadeCount(floor.shades)
}

function routeForFloor(seed: number, floorIndex: number): EnemyDef[][] {
  const rng = new Rng(seed ^ 0x47c0de)
  const region = regionById(MID_REGION_ID)
  const encounterDepth = floorIndex + 2
  return Array.from({ length: encounterCountForFloor(floorIndex) }, () =>
    pickEnemies(region, 'battle', encounterDepth, rng).map(enemyById),
  )
}

function resetForNextBattle(base: Combatant[], result: Combatant[]): Combatant[] {
  const vitals = new Map(result.map((ally) => [ally.key, { hp: ally.hp, mp: ally.mp }]))
  return base.map((ally) => ({
    ...ally,
    hp: vitals.get(ally.key)?.hp ?? 0,
    mp: vitals.get(ally.key)?.mp ?? 0,
    guard: false,
    buffs: {},
    chainCount: 0,
  }))
}

function simFloor(seed: number, options: { smart: boolean; narrativeMode: boolean } & FloorScenario): FloorRunResult {
  const base = midParty()
  let party = base.map((ally) => ({ ...ally }))
  let light = options.startLight
  let nearDeath = false
  let actions = 0
  let darkBattles = 0
  let fightsWon = 0
  const rng = new Rng(seed ^ 0x9e3779b9)

  const encounterCount = encounterCountForFloor(options.floorIndex)
  for (const defs of routeForFloor(seed, options.floorIndex)) {
    const dark = isDarkLight(light)
    if (dark) darkBattles += 1
    const enemies = defs.map((def, index) => combatantFromEnemy(scaleEncounterEnemy(def, {
      narrativeMode: options.narrativeMode,
      dark,
    }), index))
    const result = simBattle(party, enemies, rng, options.smart)
    actions += result.rounds
    nearDeath ||= result.nearDeath
    party = resetForNextBattle(base, result.allies)
    if (!result.won) break
    fightsWon += 1
    light = Math.max(0, light - DUNGEON_VICTORY_LIGHT_COST - DUNGEON_STEP_LIGHT_COST * STEPS_BETWEEN_ENCOUNTERS)
  }

  const hpNow = party.reduce((sum, ally) => sum + Math.max(0, ally.hp), 0)
  const hpMax = base.reduce((sum, ally) => sum + ally.maxHp, 0)
  const mpNow = party.reduce((sum, ally) => sum + Math.max(0, ally.mp), 0)
  const mpMax = base.reduce((sum, ally) => sum + ally.maxMp, 0)
  return {
    completed: fightsWon === encounterCount,
    wiped: party.every((ally) => ally.hp <= 0),
    nearDeath,
    hpRatio: hpNow / hpMax,
    mpRatio: mpNow / mpMax,
    actions,
    darkBattles,
    mpExhausted: party.some((ally) => ally.hp > 0 && ally.mp <= 0),
    fightsWon,
    endLight: light,
  }
}

function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * q)))
  return sorted[index] ?? 0
}

function wilson95(successes: number, n: number): [number, number] {
  if (n === 0) return [0, 0]
  const z = 1.959963984540054
  const p = successes / n
  const denominator = 1 + (z * z) / n
  const center = (p + (z * z) / (2 * n)) / denominator
  const half = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / denominator
  return [Math.max(0, center - half), Math.min(1, center + half)]
}

function aggregateFloor(n: number, options: { smart: boolean; narrativeMode: boolean } & FloorScenario) {
  const rows = Array.from({ length: n }, (_, index) => simFloor((index + 1) * 40503, options))
  const completed = rows.filter((row) => row.completed).length
  const near = rows.filter((row) => row.nearDeath).length
  const wiped = rows.filter((row) => row.wiped).length
  return {
    n,
    completionRate: completed / n,
    completionCi95: wilson95(completed, n),
    wipeRate: wiped / n,
    nearDeathRate: near / n,
    nearDeathCi95: wilson95(near, n),
    hpP10: quantile(rows.map((row) => row.hpRatio), 0.1),
    hpP50: quantile(rows.map((row) => row.hpRatio), 0.5),
    hpP90: quantile(rows.map((row) => row.hpRatio), 0.9),
    mpP10: quantile(rows.map((row) => row.mpRatio), 0.1),
    mpP50: quantile(rows.map((row) => row.mpRatio), 0.5),
    mpP90: quantile(rows.map((row) => row.mpRatio), 0.9),
    mpExhaustionRate: rows.filter((row) => row.mpExhausted).length / n,
    avgActions: rows.reduce((sum, row) => sum + row.actions, 0) / n,
    avgDarkBattles: rows.reduce((sum, row) => sum + row.darkBattles, 0) / n,
    avgFightsWon: rows.reduce((sum, row) => sum + row.fightsWon, 0) / n,
    endLightP50: quantile(rows.map((row) => row.endLight), 0.5),
  }
}

function reportFloor(label: string, row: ReturnType<typeof aggregateFloor>): void {
  console.log(
    `[balance-m47] ${label} n=${row.n} 完遂${(row.completionRate * 100).toFixed(1)}%`
    + ` CI[${(row.completionCi95[0] * 100).toFixed(1)},${(row.completionCi95[1] * 100).toFixed(1)}]`
    + ` 全滅${(row.wipeRate * 100).toFixed(1)}% 瀕死${(row.nearDeathRate * 100).toFixed(1)}%`
    + ` HPp10/50/90=${(row.hpP10 * 100).toFixed(0)}/${(row.hpP50 * 100).toFixed(0)}/${(row.hpP90 * 100).toFixed(0)}%`
    + ` MPp10/50/90=${(row.mpP10 * 100).toFixed(0)}/${(row.mpP50 * 100).toFixed(0)}/${(row.mpP90 * 100).toFixed(0)}%`
    + ` MP枯渇${(row.mpExhaustionRate * 100).toFixed(1)}% 行動${row.avgActions.toFixed(1)} 闇戦${row.avgDarkBattles.toFixed(1)}`,
  )
}

// M33 ⑭: 玄冬は実 boss_gentou(実skillIds e_hoshikui/e_hisui/e_yamiuta)を使う。
// 旧は骸星のkitをspreadした非忠実な代役だった(devil指摘)。実kitで測ることで玄冬の本当の難度を評価する。
const BOSSES: [string, EnemyDef][] = [
  ['苔ノ主(序ボス)', enemyById('boss_kokenushi')],
  ['骸星大熊(終盤)', enemyById('boss_hoshimukuro')],
  ['玄冬(実kit)', enemyById('boss_gentou')],
]

const TIER3_REGIONS = REGIONS.filter((region) => region.tier === 3 && region.bossId)

function aggregateMidBoss(regionId: string, n: number, smart: boolean, narrativeMode = false, dark = false) {
  const region = regionById(regionId)
  const boss = enemyById(region.bossId!)
  return agg(n, () => ({
    party: midParty(),
    enemies: [combatantFromEnemy(scaleEncounterEnemy(boss, { narrativeMode, dark }), 0)],
  }), smart)
}

describe('M28-B 戦闘バランス実測(忠実harness)', () => {
  it('M47中盤fixture: 人物3代目・熟達Lv6・三代形見を実変換経路で固定する', () => {
    const characters = midCharacters()
    const party = midParty()
    expect(characters).toHaveLength(4)
    expect(characters.every((character) => character.gen === 3 && character.level === MID_LEVEL)).toBe(true)
    expect(characters.every((character) => character.equipment.weapon?.generation === MID_ITEM_GENERATION)).toBe(true)
    expect(characters.every((character) => character.equipment.armor?.generation === MID_ITEM_GENERATION)).toBe(true)
    expect(itemBaseById('w_katana').shopTier).toBe(0)
    expect(itemBaseById('a_kawado').shopTier).toBe(0)
    // earlyPartyと終盤bossPartyの間にあることを実効Combatant値で固定する。
    expect(Math.min(...party.map((ally) => ally.atk))).toBeGreaterThan(Math.min(...earlyParty().map((ally) => ally.atk)))
    expect(Math.max(...party.map((ally) => ally.def))).toBeLessThan(Math.max(...bossParty().map((ally) => ally.def)))
  })

  it('M47中盤1floor: 実マップ敵影数でHP/MP・灯を持ち越し、入口/帰還線/灯枯れを400seed計測する', () => {
    const matrix: Record<string, ReturnType<typeof aggregateFloor>> = {}
    for (const [scenario, startLight, floorIndex] of [
      ['入口', 100, 0],       // shades 7 → 実配置5体、depth 2
      ['帰還線', 43, 3],     // shades 10 → 実配置8体、depth 5
      ['灯枯れ', 0, 4],      // shades 4 → 実配置2体、depth 6
    ] as const) {
      for (const narrativeMode of [false, true]) {
        for (const smart of [false, true]) {
          const key = `${scenario}_${narrativeMode ? 'narrative' : 'fate'}_${smart ? 'smart' : 'dumb'}`
          matrix[key] = aggregateFloor(400, { startLight, floorIndex, narrativeMode, smart })
          reportFloor(key, matrix[key])
        }
      }
    }

    // 同じseed・条件は完全一致する。UIやPixiのMath.randomには依存しない決定論境界。
    expect(simFloor(40503, { startLight: 0, floorIndex: 4, narrativeMode: false, smart: true }))
      .toEqual(simFloor(40503, { startLight: 0, floorIndex: 4, narrativeMode: false, smart: true }))

    // 固定5戦へ戻らないよう、実マップ密度と探索実配置の契約を番人にする。
    expect([0, 1, 2, 3, 4].map(encounterCountForFloor)).toEqual([5, 6, 7, 8, 2])

    const brightSmart = matrix['入口_fate_smart']
    const brightDumb = matrix['入口_fate_dumb']
    const returnDumb = matrix['帰還線_fate_dumb']
    const returnSmart = matrix['帰還線_fate_smart']
    const darkSmart = matrix['灯枯れ_fate_smart']
    expect(brightSmart.completionRate).toBeGreaterThanOrEqual(0.95)
    expect(brightSmart.completionRate).toBeGreaterThanOrEqual(brightDumb.completionRate)
    expect(darkSmart.completionRate).toBeGreaterThanOrEqual(0.95)
    // 実floor再測定後にX=60%を採用。明灯入口ではなく、帰還判断が生じる深層1floorを中盤圧力gateとする。
    expect(returnDumb.nearDeathRate, '素手policyは深層の帰還線で60%以上が一度は瀕死').toBeGreaterThanOrEqual(0.60)
    expect(returnSmart.completionRate, '戦術policyは深層の帰還線でも95%以上完遂').toBeGreaterThanOrEqual(0.95)
    expect(returnSmart.nearDeathRate).toBeLessThanOrEqual(returnDumb.nearDeathRate)
    expect(returnSmart.hpP10).toBeGreaterThan(returnDumb.hpP10)
    expect(matrix['入口_narrative_smart'].completionRate).toBeGreaterThanOrEqual(brightSmart.completionRate)
    expect(matrix['灯枯れ_narrative_smart'].completionRate).toBeGreaterThanOrEqual(darkSmart.completionRate)
  }, 120_000)

  it('M47旧elite互換: 現歩行経路には無いelite poolを中盤本表から分離して測る', () => {
    const region = regionById(MID_REGION_ID)
    const dumb = agg(400, (rng) => ({
      party: midParty(),
      enemies: pickEnemies(region, 'elite', 6, rng).map((id, index) => combatantFromEnemy(enemyById(id), index)),
    }))
    const smart = agg(400, (rng) => ({
      party: midParty(),
      enemies: pickEnemies(region, 'elite', 6, rng).map((id, index) => combatantFromEnemy(enemyById(id), index)),
    }), true)
    report('旧elite互換 素手', dumb)
    report('旧elite互換 戦術', smart)
    expect(smart.winRate).toBeGreaterThanOrEqual(dumb.winRate)
  })

  it('M47中盤主: tier3全11地域を中盤PTの素手/戦術で測り、単一主を中盤全体の代表にしない', () => {
    expect(TIER3_REGIONS).toHaveLength(11)
    for (const region of TIER3_REGIONS) {
      const dumb = aggregateMidBoss(region.id, 200, false)
      const smart = aggregateMidBoss(region.id, 200, true)
      report(`中盤主 ${region.name} 素手`, dumb)
      report(`中盤主 ${region.name} 戦術`, smart)
      expect(smart.winRate, `${region.name}: 戦術が素手より不利にならない`).toBeGreaterThanOrEqual(dumb.winRate)
    }
  }, 120_000)

  it('M47補正契約: 語り部・灯枯れ・主代わりを同じ単一情報源から構成する', () => {
    const base = enemyById('kubinashi_andon')
    expect(scaleEncounterEnemy(base, { narrativeMode: true, dark: false }).atk).toBe(Math.round(base.atk * 0.78))
    expect(scaleEncounterEnemy(base, { narrativeMode: false, dark: true }).atk).toBe(Math.round(base.atk * 1.4))
    expect(scaleEncounterEnemy(base, { narrativeMode: false, dark: true }).hp).toBe(Math.round(base.hp * 1.2))
    expect(scaleEncounterEnemy(base, { narrativeMode: false, dark: false, standInBoss: true }).atk).toBe(Math.round(base.atk * 1.5))
    expect(scaleEncounterEnemy(base, { narrativeMode: false, dark: false, standInBoss: true }).hp).toBe(Math.round(base.hp * 2.2))

    const rows: Record<string, ReturnType<typeof agg>> = {}
    for (const narrativeMode of [false, true]) {
      for (const dark of [false, true]) {
        const key = `${narrativeMode ? 'narrative' : 'fate'}_${dark ? 'dark' : 'light'}`
        rows[key] = agg(200, () => ({
          party: midParty(),
          enemies: [combatantFromEnemy(scaleEncounterEnemy(base, { narrativeMode, dark, standInBoss: true }), 0)],
        }), true)
        report(`主代わり ${key}`, rows[key])
      }
    }
    expect(rows.narrative_light.winRate).toBeGreaterThanOrEqual(rows.fate_light.winRate)
    expect(rows.narrative_dark.winRate).toBeGreaterThanOrEqual(rows.fate_dark.winRate)
  })

  it('序盤tier1: 手応え導入(被HP有意)かつ勝てる', () => {
    HP_MUL = 1; ATK_MUL = 1 // enemyPowerはcombatantFromEnemyへ焼いたので harness側は素通し
    const results: Record<string, ReturnType<typeof agg>> = {}
    for (const ease of [1, 0.78]) {
      for (const n of [2, 3]) {
        const a = agg(400, (rng) => ({
          party: earlyParty(),
          enemies: Array.from({ length: n }, (_, i) => combatantFromEnemy(eased(rng.pick(TIER1_BASE), ease), i)),
        }))
        results[`${n}_${ease}`] = a
        report(`序盤 敵${n}体 ${ease === 1 ? '宿命' : '語り部'}`, a)
      }
    }
    // 受入: 宿命モードで「1-2撃勝ち・被弾1固定」を是正(旧値は被HP<2%・行動<6)。過剰化(全滅)もしない。
    expect(results['3_1'].winRate).toBe(1) // 序盤3体でも worst-play(オート)で必ず勝てる
    expect(results['3_1'].avgHpLossPct).toBeGreaterThan(5) // 手応え: 3体で被HP>5%(旧≈1%)
    expect(results['2_1'].avgHpLossPct).toBeGreaterThan(2) // 2体でも被弾する
    expect(results['3_1'].avgRounds).toBeGreaterThan(9) // 1-2撃で終わらない
    expect(results['2_1'].winRate).toBe(1)
  })

  it('ボス安全表: 下限導入が実ボスを破綻させない(devil必須)', () => {
    HP_MUL = 1; ATK_MUL = 1
    const win: Record<string, number> = {}
    for (const [name, boss] of BOSSES) {
      for (const ease of [1, 0.78]) {
        const a = agg(120, () => ({ party: bossParty(), enemies: [combatantFromEnemy(eased(boss, ease), 0)] }))
        win[`${name}_${ease}`] = a.winRate
        report(`ボス ${name} ${ease === 1 ? '宿命' : '語り部'}`, a)
      }
    }
    // 実ボス(苔ノ主/骸星大熊)は worst-play でも100%勝てる。合成玄冬(想定最強)も破綻(勝率<90%)させない。
    expect(win['苔ノ主(序ボス)_1']).toBe(1)
    expect(win['骸星大熊(終盤)_1']).toBe(1)
    // M33 ⑭: 玄冬は実kit(atk低下+150スパイク)で戦術必須の最終ボス。旧の「素手で玄冬≥0.9」は
    // fake弱玄冬(骸星kitのspread)に基づく誤ったoracleだった。実kitでは素手プレイは勝率0.5前後=
    // 「完全な詰みではないが戦術を強く要求する」。この下限/上限で緩和後の難度をbracketする:
    expect(win['玄冬(実kit)_1'], '緩和後、素手でも運が良ければ勝てる(完全な詰みでない)').toBeGreaterThan(0.4)
    expect(win['玄冬(実kit)_1'], '最終ボスは素手で確実勝ちにしない(over-easingの番人=戦術を要求)').toBeLessThan(0.85)
    // 確実な勝利は「現実policy(バフ/回復)」テストで担保する(下)。
  })

  it('現実policy(バフ/回復を使う)でも終盤ボスは手応えを残す(M33 ⑬受入)', () => {
    HP_MUL = 1; ATK_MUL = 1
    const smart: Record<string, ReturnType<typeof agg>> = {}
    const dumb: Record<string, ReturnType<typeof agg>> = {}
    for (const [name, boss] of BOSSES) {
      smart[name] = agg(150, () => ({ party: bossParty(), enemies: [combatantFromEnemy(boss, 0)] }), true)
      dumb[name] = agg(150, () => ({ party: bossParty(), enemies: [combatantFromEnemy(boss, 0)] }), false)
      report(`ボス ${name} 現実policy`, smart[name])
      report(`ボス ${name} 素手policy `, dumb[name])
    }
    const g = smart['玄冬(実kit)']
    // ① 現実policy(バフ/回復)なら玄冬に安定して勝てる — 戦術に意味がある。
    expect(g.winRate, '現実policyなら玄冬に勝てる').toBeGreaterThanOrEqual(0.9)
    // ② バフ/回復を使う方が素手より有利 = sim が確かにバフ効果(⑬)を見ている証跡(devil CRITICAL-1の解消)。
    expect(g.winRate, 'バフ/回復policyは素手より不利にならない').toBeGreaterThanOrEqual(dumb['玄冬(実kit)'].winRate)
    // ③ ⑬でバフを power反映+強化しても、玄冬は無傷の作業ゲーにしない(被HPが有意に残る)。
    expect(g.avgHpLossPct, '玄冬は依然として削られる(作業ゲー化しない)').toBeGreaterThan(8)
    // ④ M33 ⑭: 崖緩和の受入 — 戦術(バフ/回復)プレイなら玄冬の瀕死は稀(素手79%のような崖にしない)。
    expect(g.nearDeathRate, '戦術プレイなら玄冬で瀕死は稀(崖でない)').toBeLessThan(0.35)
  })
})
