import { create } from 'zustand'
import type {
  BattleLogEntry, BattleState, GameData, Item, Screen,
} from './types'
import type { BattleAction } from './battle'
import { LIFESPAN_SEASONS, seasonLabel } from './types'
import { Rng } from './rng'
import { GODS, godById } from './data/gods'
import { regionById } from './data/regions'
import { enemyById } from './data/enemies'
import { makeItem, inheritItem, itemBaseById } from './data/items'
import {
  conceiveChild, makeFounder, recalcStats, ageOf,
} from './inheritance'
import {
  combatantFromChar, combatantFromEnemy, startBattle, performAction, enemyAction, currentActor,
} from './battle'
import { generateExpedition, rollTreasure, campHeal, LIGHT_COST } from './expedition'
import { generateEpitaph, deathCauseLabel, birthLine } from './epitaph'
import { saveGame, loadGame } from './save'

// UIへ流す演出イベント(誕生・死亡は順に画面表示)
type PendingScene = { kind: 'birth'; charId: string } | { kind: 'death'; charId: string }

interface GameStore {
  screen: Screen
  data: GameData | null
  battle: BattleState | null
  battleNodeId: string | null
  battleLogQueue: BattleLogEntry[]
  pendingScenes: PendingScene[]
  rng: Rng

  // メタ
  newGame: (narrativeMode: boolean) => void
  continueGame: () => boolean
  setScreen: (s: Screen) => void
  processNextScene: () => void

  // 郷での行動(いずれも1季を消費)
  doPact: (parentId: string, godId: string) => void
  doFestival: () => void
  doRest: () => void

  // 店・装備(季を消費しない)
  buyItem: (baseId: string) => void
  equipItem: (charId: string, itemId: string) => void

  // 出立〜探索
  depart: (regionId: string, partyIds: string[]) => void
  chooseNode: (nodeId: string) => void
  useReturnFire: () => void

  // 戦闘
  battleCommand: (action: BattleAction) => void
  drainBattleLog: () => BattleLogEntry[]
  finishBattle: () => void
}

function newRng(): Rng {
  return new Rng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0)
}

export const useGame = create<GameStore>((set, get) => {
  // ---- 内部ヘルパ ----
  const mutate = (fn: (d: GameData) => GameData): GameData => {
    const d = get().data
    if (!d) throw new Error('no game data')
    const nd = fn(d)
    set({ data: nd })
    return nd
  }

  const chronicle = (d: GameData, kind: 'birth' | 'death' | 'pact' | 'triumph' | 'event' | 'era', text: string, charId?: string): GameData => ({
    ...d,
    chronicle: [...d.chronicle, { season: d.seasonIndex, kind, text, charId }],
  })

  // 季節を進める — 誕生と死(寿命)をここで処理
  const advanceSeason = (): void => {
    const rng = get().rng
    const scenes: PendingScene[] = []
    let d = get().data!
    d = { ...d, seasonIndex: d.seasonIndex + 1 }

    // 誕生
    const due = d.pendingBirths.filter((b) => b.dueSeason <= d.seasonIndex)
    d = { ...d, pendingBirths: d.pendingBirths.filter((b) => b.dueSeason > d.seasonIndex) }
    for (const b of due) {
      const god = godById(b.godId)
      const parent = d.family.find((c) => c.id === b.parentId)
      if (!parent) continue
      const gen = parent.gen + 1
      const child = conceiveChild(
        parent, god, gen, d.seasonIndex, rng,
        d.family.map((c) => c.name),
      )
      d = { ...d, family: [...d.family, child] }
      d = chronicle(d, 'birth', birthLine(child.name, god.name, rng), child.id)
      scenes.push({ kind: 'birth', charId: child.id })
    }

    // 寿命 — 八季の命
    for (const c of d.family) {
      if (!c.alive) continue
      if (ageOf(c, d.seasonIndex) >= LIFESPAN_SEASONS) {
        const epitaph = generateEpitaph(c, 'lifespan', rng)
        // 形見: 装備は継承品として蔵へ
        const keepsakes: Item[] = []
        for (const slot of ['weapon', 'armor', 'charm'] as const) {
          const it = c.equipment[slot]
          if (it) keepsakes.push(inheritItem(it, c.name))
        }
        d = {
          ...d,
          inventory: [...d.inventory, ...keepsakes],
          family: d.family.map((x) =>
            x.id === c.id
              ? { ...x, alive: false, deathSeason: d.seasonIndex, deathCause: deathCauseLabel('lifespan'), epitaph, equipment: {}, isHead: false }
              : x,
          ),
        }
        d = chronicle(d, 'death', `${c.name}、${deathCauseLabel('lifespan')}。享年八季。「${epitaph}」`, c.id)
        scenes.push({ kind: 'death', charId: c.id })
      }
    }

    // 当主継承
    if (!d.family.some((c) => c.alive && c.isHead)) {
      const successor = [...d.family]
        .filter((c) => c.alive)
        .sort((a, b) => a.bornSeason - b.bornSeason)[0]
      if (successor) {
        d = {
          ...d,
          family: d.family.map((x) => (x.id === successor.id ? { ...x, isHead: true, deeds: [...x.deeds, '当主を継いだ'] } : x)),
        }
        d = chronicle(d, 'era', `${successor.name}、第${successor.gen}代当主を継ぐ。`)
      }
    }

    // 成長(全員再計算)
    d = { ...d, family: d.family.map((c) => (c.alive ? recalcStats(c, d.seasonIndex) : c)) }

    // 血脈断絶チェック
    const extinct = !d.family.some((c) => c.alive) && d.pendingBirths.length === 0
    d = { ...d, seed: rng.state() }
    saveGame(d)
    set({ data: d, pendingScenes: [...get().pendingScenes, ...scenes] })

    if (extinct) {
      set({ screen: { id: 'ending' }, data: { ...d, flags: { ...d.flags, extinct: true } } })
      return
    }
    get().processNextScene()
  }

  return {
    screen: { id: 'title' },
    data: null,
    battle: null,
    battleNodeId: null,
    battleLogQueue: [],
    pendingScenes: [],
    rng: newRng(),

    newGame: (narrativeMode) => {
      const rng = newRng()
      const founder = makeFounder(0, rng)
      let d: GameData = {
        seasonIndex: 0,
        family: [founder],
        hoto: 150,
        ketsu: 0,
        inventory: [makeItem('w_kodachi'), makeItem('a_nunoko')],
        godAffinity: {},
        fame: 0,
        regionsCleared: [],
        chronicle: [],
        pendingBirths: [],
        flags: {},
        narrativeMode,
        seed: rng.state(),
      }
      d = chronicle(d, 'era', `${seasonLabel(0)}。燈守家最後の血脈・燈吾、大燈籠の前に立つ。残る命、五季。`)
      set({ data: d, rng, screen: { id: 'intro' }, pendingScenes: [], battle: null })
      saveGame(d)
    },

    continueGame: () => {
      const d = loadGame()
      if (!d) return false
      set({ data: d, rng: new Rng(d.seed ^ (Date.now() >>> 0)), screen: { id: 'home' }, pendingScenes: [] })
      return true
    },

    setScreen: (s) => set({ screen: s }),

    processNextScene: () => {
      const scenes = get().pendingScenes
      if (scenes.length === 0) {
        set({ screen: { id: 'home' } })
        return
      }
      const [next, ...rest] = scenes
      set({
        pendingScenes: rest,
        screen: next.kind === 'birth' ? { id: 'birth', charId: next.charId } : { id: 'death', charId: next.charId },
      })
    },

    doPact: (parentId, godId) => {
      const god = godById(godId)
      mutate((d) => {
        if (d.hoto < god.cost) return d
        let nd: GameData = {
          ...d,
          hoto: d.hoto - god.cost,
          pendingBirths: [...d.pendingBirths, { godId, parentId, dueSeason: d.seasonIndex + 1 }],
          godAffinity: { ...d.godAffinity, [godId]: (d.godAffinity[godId] ?? 0) + 1 },
        }
        const parent = d.family.find((c) => c.id === parentId)
        nd = chronicle(nd, 'pact', `${parent?.name}、${god.name}と星契りを結ぶ。`)
        return nd
      })
      advanceSeason()
    },

    doFestival: () => {
      mutate((d) => {
        const cost = 30
        if (d.hoto < cost) return d
        let nd: GameData = {
          ...d,
          hoto: d.hoto - cost,
          family: d.family.map((c) => (c.alive ? { ...c, fatigue: Math.max(0, c.fatigue - 40), hp: c.maxHp, mp: c.maxMp } : c)),
          godAffinity: Object.fromEntries(GODS.map((g) => [g.id, (d.godAffinity[g.id] ?? 0) + 0.5])),
        }
        nd = chronicle(nd, 'event', '郷で祭が開かれた。太鼓の音は星まで届いたという。')
        return nd
      })
      advanceSeason()
    },

    doRest: () => {
      mutate((d) => ({
        ...d,
        family: d.family.map((c) => (c.alive ? { ...c, hp: c.maxHp, mp: c.maxMp, fatigue: Math.max(0, c.fatigue - 60) } : c)),
      }))
      advanceSeason()
    },

    buyItem: (baseId) => {
      mutate((d) => {
        const base = itemBaseById(baseId)
        if (d.hoto < base.price) return d
        return { ...d, hoto: d.hoto - base.price, inventory: [...d.inventory, makeItem(baseId)] }
      })
    },

    equipItem: (charId, itemId) => {
      mutate((d) => {
        const item = d.inventory.find((i) => i.id === itemId)
        if (!item) return d
        const char = d.family.find((c) => c.id === charId)
        if (!char || !char.alive) return d
        const prev = char.equipment[item.slot]
        return {
          ...d,
          inventory: [...d.inventory.filter((i) => i.id !== itemId), ...(prev ? [prev] : [])],
          family: d.family.map((c) =>
            c.id === charId ? { ...c, equipment: { ...c.equipment, [item.slot]: item } } : c,
          ),
        }
      })
    },

    depart: (regionId, partyIds) => {
      const { rng } = get()
      const region = regionById(regionId)
      mutate((d) => ({
        ...d,
        expedition: generateExpedition(region, partyIds, rng),
        family: d.family.map((c) =>
          partyIds.includes(c.id) ? { ...c, expeditions: c.expeditions + 1 } : c,
        ),
      }))
      set({ screen: { id: 'expedition' } })
    },

    chooseNode: (nodeId) => {
      const { rng } = get()
      const d = get().data!
      const exp = d.expedition
      if (!exp) return
      const node = exp.nodes[nodeId]
      if (!node) return
      const region = regionById(exp.regionId)

      let light = Math.max(0, exp.light - LIGHT_COST.move)
      let log = [...exp.log]
      let loot = { ...exp.loot, items: [...exp.loot.items] }

      if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
        const defs = (node.enemyIds ?? []).map((id) => enemyById(id))
        const party = d.family
          .filter((c) => exp.partyIds.includes(c.id) && c.alive && c.hp > 0)
          .map((c, i) => combatantFromChar(c, i < 2 ? 'front' : 'back'))
        // 灯が尽きていると敵が強化される(常夜の重圧)
        const dark = light <= 0
        const enemies = defs.map((e, i) =>
          combatantFromEnemy(dark ? { ...e, atk: Math.round(e.atk * 1.4), hp: Math.round(e.hp * 1.2) } : e, i),
        )
        const battle = startBattle(party, enemies)
        if (dark) battle.log.push({ text: '灯は尽きた。常夜の重圧が魔性を狂わせている……!', kind: 'info' })
        mutate((dd) => ({
          ...dd,
          expedition: { ...exp, currentNodeId: nodeId, light, log, nodes: { ...exp.nodes } },
        }))
        set({ battle, battleNodeId: nodeId, screen: { id: 'battle' }, battleLogQueue: [...battle.log] })
        return
      }

      // 非戦闘ノード
      if (node.type === 'treasure') {
        const t = rollTreasure(region, rng)
        loot = {
          hoto: loot.hoto + t.hoto,
          ketsu: loot.ketsu + t.ketsu,
          items: t.item ? [...loot.items, t.item] : loot.items,
        }
        log.push(t.text)
      } else if (node.type === 'camp') {
        const { hpRatio, lightGain } = campHeal()
        light = Math.min(100, light + lightGain)
        mutate((dd) => ({
          ...dd,
          family: dd.family.map((c) =>
            exp.partyIds.includes(c.id) && c.alive
              ? { ...c, hp: Math.min(c.maxHp, Math.round(c.hp + c.maxHp * hpRatio)), mp: Math.min(c.maxMp, c.mp + 10) }
              : c,
          ),
        }))
        log.push('焚火を囲んだ。誰かが故郷の唄を口ずさむ。傷が癒え、灯が少し戻った。')
      } else if (node.type === 'event') {
        // M1では簡易イベント: 奉燈か灯のどちらか
        if (rng.chance(0.5)) {
          const gain = 10 + region.tier * 8
          loot = { ...loot, hoto: loot.hoto + gain }
          log.push(`道端の地蔵に誰かが供えた奉燈${gain}を見つけた。手を合わせて頂く。`)
        } else {
          light = Math.min(100, light + 12)
          log.push('夜藪の切れ間から星明かりが差した。灯が少し回復した。')
        }
      }

      const nodes = { ...exp.nodes, [nodeId]: { ...node, cleared: true } }
      mutate((dd) => ({
        ...dd,
        expedition: { ...exp, currentNodeId: nodeId, light, log, loot, nodes },
      }))

      // 最深部到達(ボスなし地域) → 自動帰還
      if (node.choices.length === 0) {
        get().useReturnFire()
      }
    },

    useReturnFire: () => {
      const d = get().data!
      const exp = d.expedition
      if (!exp) return
      const gainedFame = Math.round(exp.loot.hoto / 8) + exp.loot.ketsu * 2
      let nd: GameData = {
        ...d,
        hoto: d.hoto + exp.loot.hoto,
        ketsu: d.ketsu + exp.loot.ketsu,
        inventory: [...d.inventory, ...exp.loot.items],
        fame: d.fame + gainedFame,
        expedition: undefined,
      }
      nd = {
        ...nd,
        chronicle: [...nd.chronicle, {
          season: nd.seasonIndex, kind: 'triumph' as const,
          text: `${regionById(exp.regionId).name}より帰還。奉燈${exp.loot.hoto}、血珠${exp.loot.ketsu}、武功${gainedFame}を得た。`,
        }],
      }
      set({ data: nd })
      advanceSeason()
    },

    battleCommand: (action) => {
      const { battle, rng } = get()
      if (!battle || battle.phase !== 'input') return
      const actor = currentActor(battle)
      if (!actor || !actor.isAlly) return

      let entries: BattleLogEntry[] = []
      let st = battle
      const r1 = performAction(st, actor.key, action, rng)
      st = r1.state
      entries = [...entries, ...r1.entries]

      // 敵のターンを味方の番まで自動処理
      let guard = 0
      while (st.phase === 'input' && guard < 30) {
        const cur = currentActor(st)
        if (!cur) break
        if (cur.isAlly) break
        const ai = enemyAction(st, cur, rng)
        const r = performAction(st, cur.key, ai, rng)
        st = r.state
        entries = [...entries, ...r.entries]
        guard++
      }

      set({ battle: st, battleLogQueue: [...get().battleLogQueue, ...entries] })
    },

    drainBattleLog: () => {
      const q = get().battleLogQueue
      set({ battleLogQueue: [] })
      return q
    },

    finishBattle: () => {
      const { battle, battleNodeId, rng } = get()
      const d = get().data!
      const exp = d.expedition
      if (!battle || !exp || !battleNodeId) return
      const node = exp.nodes[battleNodeId]
      const region = regionById(exp.regionId)

      // 戦闘後のHP/MPをキャラへ反映
      let family = d.family.map((c) => {
        const cb = battle.allies.find((a) => a.charId === c.id)
        if (!cb) return c
        return { ...c, hp: Math.max(battle.phase === 'won' || battle.phase === 'fled' ? 1 : 0, cb.hp), mp: cb.mp }
      })

      if (battle.phase === 'won') {
        const defs = (node.enemyIds ?? []).map((id) => enemyById(id))
        const hoto = defs.reduce((s, e) => s + e.hoto, 0)
        const ketsu = defs.reduce((s, e) => s + e.ketsu, 0)
        const kills = defs.length
        family = family.map((c) =>
          exp.partyIds.includes(c.id) && c.alive ? { ...c, kills: c.kills + kills } : c,
        )
        const lightCost = node.type === 'elite' ? LIGHT_COST.elite : LIGHT_COST.battle
        const light = Math.max(0, exp.light - lightCost)
        const nodes = { ...exp.nodes, [battleNodeId]: { ...node, cleared: true } }
        let nd: GameData = {
          ...d,
          family,
          expedition: {
            ...exp, light, nodes,
            loot: { ...exp.loot, hoto: exp.loot.hoto + hoto, ketsu: exp.loot.ketsu + ketsu },
            log: [...exp.log, `魔性を討った。奉燈${hoto}を得た。`],
          },
        }

        // ボス討伐
        if (node.type === 'boss' && region.bossId) {
          const bossName = enemyById(region.bossId).name
          nd = {
            ...nd,
            regionsCleared: [...new Set([...nd.regionsCleared, region.id])],
            fame: nd.fame + 60,
            chronicle: [...nd.chronicle, {
              season: nd.seasonIndex, kind: 'triumph' as const,
              text: `${region.name}の主・${bossName}を討伐! 一族の武功、天に届く。`,
            }],
          }
          // 当主・パーティに事績
          nd = {
            ...nd,
            family: nd.family.map((c) =>
              exp.partyIds.includes(c.id) && c.alive
                ? { ...c, deeds: [...c.deeds, `${bossName}を討った`] }
                : c,
            ),
          }
          // 最終ボス撃破 → エンディング
          if (region.id === 'akashi_miyama') {
            set({ data: { ...nd, flags: { ...nd.flags, cleared: true } }, battle: null, battleNodeId: null, screen: { id: 'ending' } })
            saveGame(get().data!)
            return
          }
        }
        set({ data: nd, battle: null, battleNodeId: null, screen: { id: 'expedition' } })
        return
      }

      if (battle.phase === 'fled') {
        const light = Math.max(0, exp.light - 4)
        set({
          data: { ...d, family, expedition: { ...exp, light, log: [...exp.log, '命からがら逃げ延びた。'] } },
          battle: null, battleNodeId: null, screen: { id: 'expedition' },
        })
        return
      }

      // 全滅 — 隊は夜藪に消える(行方知れず)。持ち帰りは半分だけ届く。
      let nd: GameData = { ...d, family }
      const lostNames: string[] = []
      nd = {
        ...nd,
        family: nd.family.map((c) => {
          if (!exp.partyIds.includes(c.id) || !c.alive) return c
          lostNames.push(c.name)
          const epitaph = generateEpitaph(c, 'lost', rng)
          return {
            ...c, alive: false, hp: 0,
            deathSeason: nd.seasonIndex,
            deathCause: deathCauseLabel('lost'),
            epitaph,
            isHead: false,
          }
        }),
        hoto: nd.hoto + Math.round(exp.loot.hoto / 2),
        ketsu: nd.ketsu + Math.round(exp.loot.ketsu / 2),
        expedition: undefined,
      }
      nd = {
        ...nd,
        chronicle: [...nd.chronicle, {
          season: nd.seasonIndex, kind: 'death' as const,
          text: `${regionById(exp.regionId).name}にて隊は全滅。${lostNames.join('、')}、行方知れず。`,
        }],
      }
      set({ data: nd, battle: null, battleNodeId: null })
      advanceSeason()
    },
  }
})
