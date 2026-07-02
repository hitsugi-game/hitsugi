import { create } from 'zustand'
import type {
  BattleLogEntry, BattleState, Character, Combatant, GameData, Item, MottoId, Screen,
} from './types'
import type { BattleAction } from './battle'
import { LIFESPAN_MONTHS, seasonLabel, isFestivalMonth } from './types'
import { Rng } from './rng'
import { GODS, godById } from './data/gods'
import { regionById } from './data/regions'
import { enemyById } from './data/enemies'
import { makeItem, inheritItem, itemBaseById, reforgeItem, reforgeCost, REFORGE_MAX } from './data/items'
import { loreFor } from './data/lore'
import { CHAPTERS, ENDINGS } from './data/story'
import { FAME_SEAL_THRESHOLD } from './constants'
import {
  conceiveChild, makeFounder, recalcStats, ageOf, pactCost,
} from './inheritance'
import {
  combatantFromChar, combatantFromEnemy, startBattle, performAction, enemyAction, currentActor,
} from './battle'
import {
  generateExpedition, rollTreasure, campHeal, LIGHT_COST,
  pickEvent, eventById, pickEnemies,
} from './expedition'
import { ITEM_BASES } from './data/items'
import { generateEpitaph, deathCauseLabel, birthLine } from './epitaph'
import { saveGame, loadGame } from './save'
import type { DungeonRun } from '../dungeon/types'
import { dungeonByRegion } from '../dungeon/maps'
import type { Tomoshigata, JobClassId } from './types'
import { tozaOf } from './data/toza'
import { jobById, JOB_SKILL_UNLOCK_AGES } from './data/jobs'
import { hatsujinScene, kizunaScene, hosoriScene, dailyScene } from './lifeEvents'

// UIへ流す演出イベント(誕生・死亡は順に画面表示)
type PendingScene =
  | { kind: 'birth'; charId: string }
  | { kind: 'death'; charId: string }
  | { kind: 'ceremony'; charId: string }
  | { kind: 'jobrite'; charId: string } // 生業の儀(月齢12)
  | { kind: 'dream' }
  | { kind: 'life'; title: string; lines: { speaker: string; text: string }[]; bg?: string }

interface GameStore {
  screen: Screen
  data: GameData | null
  battle: BattleState | null
  battleNodeId: string | null
  battleLogQueue: BattleLogEntry[]
  pendingScenes: PendingScene[]
  pendingEvent: { eventId: string; nodeId: string } | null
  dungeonRun: DungeonRun | null
  battleSource: 'node' | 'dungeon' | 'dungeonBoss'
  rng: Rng

  // メタ
  newGame: (narrativeMode: boolean) => void
  newLegacyGame: () => void // 継承新周回 — 形見一つと血の濃さを持ち越す
  continueGame: () => boolean
  setScreen: (s: Screen) => void
  processNextScene: () => void

  // 郷での行動(いずれも1季を消費)
  doPact: (parentId: string, godId: string) => void
  doFestival: () => void
  doRest: () => void

  // 成人の儀 — 灯型を授ける
  assignTomoshigata: (charId: string, gata: Tomoshigata) => void

  // 生業の儀 — 家業を選ぶ(月齢12)
  assignJobClass: (charId: string, jobId: JobClassId) => void
  renameCharacter: (charId: string, name: string) => void
  setMotto: (motto: MottoId) => void
  forgeUpgrade: (itemId: string) => void
  setLastWords: (charId: string, words: string) => void
  resolveFinale: (choiceIndex: number) => void

  // 店・装備・修練(季を消費しない)
  buyItem: (baseId: string) => void
  equipItem: (charId: string, itemId: string) => void
  trainStat: (charId: string, key: keyof GameData['family'][number]['potential']) => void

  // 事件
  resolveEvent: (choiceIdx: number) => void

  // 出立〜探索
  depart: (regionId: string, partyIds: string[]) => void
  chooseNode: (nodeId: string) => void
  useReturnFire: () => void

  // 歩行ダンジョン(v2)
  departDungeon: (regionId: string, partyIds: string[]) => void
  dungeonSetPos: (x: number, y: number) => void
  dungeonStep: () => void
  dungeonEncounter: (boss?: boolean, golden?: boolean) => void
  goldenBattle: boolean // v3.1 M15-5: 金の敵影との戦闘中(勝てば実り2.5倍)
  dungeonSpecial: (kind: string, x: number, y: number) => void
  dungeonAdvanceFloor: () => void
  dungeonReturn: () => void

  // 戦闘
  battleCommand: (action: BattleAction) => void
  drainBattleLog: () => BattleLogEntry[]
  finishBattle: () => void
}

function newRng(): Rng {
  return new Rng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0)
}

// dev時のみ: 自動プレイテスト用にストアを公開
declare global {
  interface Window {
    __game?: unknown
    __counts?: Record<string, number | string[]>
  }
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

  // v3.1 M12: 血縁(連携奥義の相手)と家訓の補正を戦闘員へ付与
  const enrichAllies = (party: Combatant[], chars: Character[], motto?: MottoId): Combatant[] => {
    const byId = new Map(chars.map((c) => [c.id, c]))
    return party.map((cb) => {
      const me = cb.charId ? byId.get(cb.charId) : undefined
      const kinKeys = me
        ? party
            .filter((o) => {
              if (o === cb || !o.charId) return false
              const other = byId.get(o.charId)
              if (!other) return false
              const siblings = !!me.humanParentId && me.humanParentId === other.humanParentId
              const parentChild = me.id === other.humanParentId || other.id === me.humanParentId
              return siblings || parentChild
            })
            .map((o) => o.key)
        : []
      return {
        ...cb,
        kinKeys: kinKeys.length > 0 ? kinKeys : undefined,
        atk: cb.atk + (motto === 'budan' ? 2 : 0),
        matk: cb.matk + (motto === 'gakumon' ? 2 : 0),
      }
    })
  }

  // 季節を進める — 誕生と死(寿命)をここで処理
  const advanceSeason = (): void => {
    const rng = get().rng
    const scenes: PendingScene[] = []
    let d = get().data!
    d = { ...d, seasonIndex: d.seasonIndex + 1 }

    // 誕生 — v3.1 M12: 縁の加護(下振れ緩和)/隔世遺伝/稀に双子
    const due = d.pendingBirths.filter((b) => b.dueSeason <= d.seasonIndex)
    d = { ...d, pendingBirths: d.pendingBirths.filter((b) => b.dueSeason > d.seasonIndex) }
    for (const b of due) {
      const god = godById(b.godId)
      const parent = d.family.find((c) => c.id === b.parentId)
      if (!parent) continue
      const gen = parent.gen + 1
      const affinity = d.godAffinity[b.godId] ?? 0
      const twins = rng.chance(0.06)
      const count = twins ? 2 : 1
      for (let i = 0; i < count; i++) {
        const child = conceiveChild(
          parent, god, gen, d.seasonIndex, rng,
          d.family.map((c) => c.name),
          affinity, d.family,
        )
        d = { ...d, family: [...d.family, child] }
        d = chronicle(d, 'birth', birthLine(child.name, god.name, rng), child.id)
        if (child.deeds.some((x) => x.includes('隔世遺伝'))) {
          d = chronicle(d, 'event', `${child.name}に、祖の血が強く顕れている。`, child.id)
        }
        if (child.deeds.some((x) => x.includes('神童'))) {
          d = chronicle(d, 'era', `${child.name}、神童の相を持って生まれる — 郷がどよめいた。`, child.id)
        }
        scenes.push({ kind: 'birth', charId: child.id })
      }
      if (twins) d = chronicle(d, 'event', `${parent.name}に双子が生まれた — 郷は二重の産声に沸いた。`)
    }

    // 寿命 — 八季の命
    for (const c of d.family) {
      if (!c.alive) continue
      if (ageOf(c, d.seasonIndex) >= LIFESPAN_MONTHS) {
        const epitaph = generateEpitaph(c, 'lifespan', rng)
        // 形見: 装備は継承品として蔵へ
        const keepsakes: Item[] = []
        for (const slot of ['weapon', 'armor', 'charm'] as const) {
          const it = c.equipment[slot]
          if (it) keepsakes.push(inheritItem(it, c.name, c.kills))
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

    // 成人の儀 — 生後6月を迎えた子は灯型を授かる
    for (const c of d.family) {
      if (c.alive && !c.tomoshigata && ageOf(c, d.seasonIndex) >= 6) {
        scenes.push({ kind: 'ceremony', charId: c.id })
      }
    }

    // 生業の儀 — 生後12月、灯座を持つ者は家業を選ぶ(GDD_v3 §2)
    for (const c of d.family) {
      if (c.alive && c.tomoshigata && !c.jobClass && ageOf(c, d.seasonIndex) >= 12) {
        scenes.push({ kind: 'jobrite', charId: c.id })
      }
    }

    // 灯細りの夜 — 死のひと月前、最後の対話
    for (const c of d.family) {
      if (c.alive && ageOf(c, d.seasonIndex) === 23 && !c.deeds.includes('灯細りの夜を過ごした')) {
        const witness = d.family.find((x) => x.alive && x.isHead && x.id !== c.id)
          ?? d.family.find((x) => x.alive && x.id !== c.id)
          ?? null
        scenes.push({ kind: 'life', ...hosoriScene(c, witness) })
        d = {
          ...d,
          family: d.family.map((x) =>
            x.id === c.id ? { ...x, deeds: [...x.deeds, '灯細りの夜を過ごした'] } : x,
          ),
        }
      }
    }

    // 絆と日常 — 静かな月には、家族の暮らしの一場面がある(v3.1 M15-3で日常を追加)
    if (scenes.length === 0 && rng.chance(0.3)) {
      if (rng.chance(0.5)) {
        const daily = dailyScene(d.family, d.seasonIndex, rng)
        if (daily) scenes.push({ kind: 'life', ...daily })
      }
      if (scenes.length === 0) {
        const adults = d.family.filter((c) => c.alive && ageOf(c, d.seasonIndex) >= 6)
        if (adults.length >= 2) {
          const pair = rng.shuffle(adults).slice(0, 2)
          scenes.push({ kind: 'life', ...kizunaScene(pair[0], pair[1], rng) })
        }
      }
    }

    // 本編の章(v3.1 M15-4) — 条件を満たした月に一度だけ語られる
    if (scenes.length === 0) {
      const chapterDue = CHAPTERS.find((ch) => {
        if (d.flags[ch.id]) return false
        switch (ch.id) {
          case 'ch1': return d.seasonIndex >= 2
          case 'ch2': return d.regionsCleared.length >= 1
          case 'ch3': return d.regionsCleared.length >= 5
          case 'ch4': return (d.loreFrags?.['akashi_miyama'] ?? 0) >= 3 || d.regionsCleared.length >= 10
          case 'ch5': return d.fame >= FAME_SEAL_THRESHOLD
          default: return false
        }
      })
      if (chapterDue) {
        d = { ...d, flags: { ...d.flags, [chapterDue.id]: true } }
        d = chronicle(d, 'era', `【${chapterDue.title}】語り継がれる千年の真実が、一つ明らかになった。`)
        scenes.push({ kind: 'life', title: chapterDue.title, lines: chapterDue.lines })
      }
    }

    // 灯座の深まり — 月齢で固有技が開く(10月・14月・18月=奥義)
    d = {
      ...d,
      family: d.family.map((c) => {
        if (!c.alive || !c.tomoshigata) return c
        const toza = tozaOf(c.tomoshigata, c.element)
        const age = ageOf(c, d.seasonIndex)
        const learned = [...c.skills]
        let awakened = false
        if (age >= 10 && !learned.includes(toza.skills[1].id)) learned.push(toza.skills[1].id)
        if (age >= 14 && !learned.includes(toza.skills[2].id)) learned.push(toza.skills[2].id)
        if (age >= 18 && !learned.includes(toza.ougi.id)) {
          learned.push(toza.ougi.id)
          awakened = true
        }
        if (learned.length === c.skills.length) return c
        if (awakened) {
          d = chronicle(d, 'event', `${c.name}、灯座「${toza.name}」の奥義に開眼す。`)
        }
        return { ...c, skills: learned }
      }),
    }

    // 家業の年季 — 月齢で家業技が開く(GDD_v3 §2)
    d = {
      ...d,
      family: d.family.map((c) => {
        if (!c.alive || !c.jobClass) return c
        const job = jobById(c.jobClass)
        const age = ageOf(c, d.seasonIndex)
        const learned = [...c.skills]
        job.skillIds.forEach((sid, i) => {
          if (age >= JOB_SKILL_UNLOCK_AGES[i] && !learned.includes(sid)) learned.push(sid)
        })
        if (learned.length === c.skills.length) return c
        return { ...c, skills: learned }
      }),
    }

    // 成長(全員再計算)
    d = { ...d, family: d.family.map((c) => (c.alive ? recalcStats(c, d.seasonIndex) : c)) }

    // 郷の営み — 郷人たちが大燈籠に捧げる奉燈(月次・討伐が進むほど郷が潤う)
    d = { ...d, hoto: d.hoto + 3 + d.regionsCleared.length * 2 }

    // 夢渡り — 星骸の谷を制した夜、当主の夢に家祖が現れる
    if (d.regionsCleared.includes('hoshimukuro_tani') && !d.flags.dreamSeen) {
      d = { ...d, flags: { ...d.flags, dreamSeen: true } }
      d = chronicle(d, 'event', '当主、不思議な夢を見る。目覚めた頬に、涙の痕。')
      scenes.push({ kind: 'dream' })
    }

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
    pendingEvent: null,
    dungeonRun: null,
    battleSource: 'node',
    goldenBattle: false,
    rng: newRng(),

    newGame: (narrativeMode) => {
      const rng = newRng()
      const founder0 = makeFounder(0, rng)
      const founder = {
        ...founder0,
        tomoshigata: 'homura' as Tomoshigata,
        skills: [...founder0.skills, 'tz_hf1'],
        equipment: { weapon: makeItem('w_kodachi'), armor: makeItem('a_nunoko') },
      }
      let d: GameData = {
        seasonIndex: 0,
        family: [founder],
        hoto: 150,
        ketsu: 0,
        inventory: [],
        godAffinity: {},
        fame: 0,
        regionsCleared: [],
        chronicle: [],
        pendingBirths: [],
        flags: {},
        narrativeMode,
        seed: rng.state(),
      }
      d = chronicle(d, 'era', `${seasonLabel(0)}。燈守家最後の血脈・燈吾、大燈籠の前に立つ。残る命、五季(十五月)。`)
      set({ data: d, rng, screen: { id: 'intro' }, pendingScenes: [], battle: null, battleNodeId: null, pendingEvent: null, battleLogQueue: [] })
      saveGame(d)
    },

    newLegacyGame: () => {
      const prev = get().data
      const prevCycle = prev?.flags.ngCycle
      const cycle = (typeof prevCycle === 'number' ? prevCycle : 0) + 1
      // 最も代を重ねた品を一つだけ、次の千年紀へ
      const allItems = [
        ...(prev?.inventory ?? []),
        ...(prev?.family.flatMap((c) => Object.values(c.equipment).filter((x): x is Item => !!x)) ?? []),
      ]
      const heirloom = [...allItems].sort((a, b) => b.generation - a.generation)[0]
      get().newGame(prev?.narrativeMode ?? false)
      mutate((d) => {
        let nd: GameData = {
          ...d,
          inventory: heirloom ? [...d.inventory, { ...heirloom }] : d.inventory,
          // 千年紀を重ねた血は最初から濃い
          family: d.family.map((c) => {
            const boosted = { ...c.potential }
            for (const k of Object.keys(boosted) as (keyof typeof boosted)[]) {
              boosted[k] = Math.min(120, boosted[k] + cycle * 4)
            }
            return recalcStats({ ...c, potential: boosted }, d.seasonIndex)
          }),
          flags: { ...d.flags, ngCycle: cycle },
        }
        nd = chronicle(nd, 'era', `第${cycle + 1}の千年紀、始まる。${heirloom ? `先の一族の「${heirloom.name}」が蔵に眠っている。` : ''}`)
        return nd
      })
      saveGame(get().data!)
    },

    continueGame: () => {
      const d = loadGame()
      if (!d) return false
      set({
        data: { ...d, expedition: undefined },
        rng: new Rng(d.seed ^ (Date.now() >>> 0)),
        screen: { id: 'home' },
        pendingScenes: [], battle: null, battleNodeId: null, pendingEvent: null, battleLogQueue: [],
      })
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
        screen:
          next.kind === 'birth'
            ? { id: 'birth', charId: next.charId }
            : next.kind === 'death'
              ? { id: 'death', charId: next.charId }
              : next.kind === 'ceremony'
                ? { id: 'ceremony', charId: next.charId }
                : next.kind === 'jobrite'
                  ? { id: 'jobrite', charId: next.charId }
                  : next.kind === 'life'
                    ? { id: 'life', title: next.title, lines: next.lines, bg: next.bg }
                    : { id: 'dream' },
      })
    },

    doPact: (parentId, godId) => {
      const god = godById(godId)
      // v3.1 M12-2: 縁による奉納点の割引/信心の家訓は縁の実りが深い
      const d0 = get().data
      const cost = pactCost(god, d0?.godAffinity[godId] ?? 0)
      if ((d0?.hoto ?? 0) < cost) return // 奉燈不足なら月も進めない
      mutate((d) => {
        if (d.hoto < cost) return d
        const affGain = d.motto === 'shinjin' ? 1.5 : 1
        let nd: GameData = {
          ...d,
          hoto: d.hoto - cost,
          pendingBirths: [...d.pendingBirths, { godId, parentId, dueSeason: d.seasonIndex + 1 }],
          godAffinity: { ...d.godAffinity, [godId]: (d.godAffinity[godId] ?? 0) + affGain },
          codex: { enemies: d.codex?.enemies ?? [], gods: [...new Set([...(d.codex?.gods ?? []), godId])] },
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
        if (d.hoto < cost || !isFestivalMonth(d.seasonIndex)) return d
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

    assignTomoshigata: (charId, gata) => {
      mutate((d) => {
        const c = d.family.find((x) => x.id === charId)
        if (!c || !c.alive || c.tomoshigata) return d
        const toza = tozaOf(gata, c.element)
        let nd: GameData = {
          ...d,
          family: d.family.map((x) =>
            x.id === charId
              ? {
                  ...x,
                  tomoshigata: gata,
                  skills: x.skills.includes(toza.skills[0].id) ? x.skills : [...x.skills, toza.skills[0].id],
                  deeds: [...x.deeds, `成人の儀にて灯座「${toza.name}」を授かる`],
                }
              : x,
          ),
        }
        nd = chronicle(nd, 'event', `${c.name}、成人の儀。灯座「${toza.name}」を授かる。`)
        return nd
      })
      get().processNextScene()
    },

    assignJobClass: (charId, jobId) => {
      mutate((d) => {
        const c = d.family.find((x) => x.id === charId)
        if (!c || !c.alive || c.jobClass) return d
        const job = jobById(jobId)
        const first = job.skillIds[0]
        let nd: GameData = {
          ...d,
          family: d.family.map((x) =>
            x.id === charId
              ? {
                  ...x,
                  jobClass: jobId,
                  skills: x.skills.includes(first) ? x.skills : [...x.skills, first],
                  deeds: [...x.deeds, `生業の儀にて家業「${job.name}」を選ぶ`],
                }
              : x,
          ),
        }
        nd = chronicle(nd, 'event', `${c.name}、生業の儀。家業「${job.name}」の道を歩み始める。`)
        return nd
      })
      get().processNextScene()
    },

    // v3.1 M12-8: 家訓 — 当主が家風を定める(一代につき一度)
    setMotto: (motto) => {
      mutate((d) => {
        if (d.motto === motto) return d
        let nd: GameData = { ...d, motto }
        const head = d.family.find((c) => c.alive && c.isHead)
        nd = chronicle(nd, 'era', `${head?.name ?? '当主'}、家訓「${motto === 'budan' ? '武断' : motto === 'gakumon' ? '学問' : motto === 'shinjin' ? '信心' : '商売'}」を掲げる。`)
        return nd
      })
    },

    // v3.1 M12-1: 打ち直し — 鍛冶で装備を鍛える(遺品は銘を保ったまま深まる)
    forgeUpgrade: (itemId) => {
      mutate((d) => {
        // 所在を探す: 蔵(inventory)か、誰かの装備か
        const inv = d.inventory.find((it) => it.id === itemId)
        let owner: Character | undefined
        let slot: 'weapon' | 'armor' | 'charm' | undefined
        if (!inv) {
          for (const c of d.family) {
            for (const s of ['weapon', 'armor', 'charm'] as const) {
              if (c.equipment[s]?.id === itemId) {
                owner = c
                slot = s
              }
            }
          }
        }
        const item = inv ?? (owner && slot ? owner.equipment[slot] : undefined)
        if (!item || item.generation >= REFORGE_MAX) return d
        const cost = reforgeCost(item)
        if (d.hoto < cost.hoto || d.ketsu < cost.ketsu) return d
        const forged = reforgeItem(item)
        let nd: GameData = { ...d, hoto: d.hoto - cost.hoto, ketsu: d.ketsu - cost.ketsu }
        if (inv) {
          nd = { ...nd, inventory: nd.inventory.map((it) => (it.id === itemId ? forged : it)) }
        } else if (owner && slot) {
          nd = {
            ...nd,
            family: nd.family.map((c) =>
              c.id === owner!.id ? { ...c, equipment: { ...c.equipment, [slot!]: forged } } : c,
            ),
          }
        }
        nd = chronicle(nd, 'event', `鍛冶場に槌音が響く — 「${item.name}」を「${forged.name}」に打ち直した。`)
        return nd
      })
    },

    // v3.1 M15-4: 千年の岐路 — 最終決戦後の選択で結末が分岐する
    resolveFinale: (choiceIndex) => {
      const types = ['cut', 'save', 'inherit'] as const
      const t = types[Math.max(0, Math.min(2, choiceIndex))]
      mutate((d) => {
        let nd: GameData = { ...d, flags: { ...d.flags, cleared: true, endingType: choiceIndex } }
        nd = chronicle(nd, 'era', `一族の選択 —「${ENDINGS[t].title}」。千年の答えが、ここに定まる。`)
        return nd
      })
      saveGame(get().data!)
      set({ screen: { id: 'ending' } })
    },

    // v3.1 M15-2: 看取りの遺言 — 故人の言葉が家譜に残る
    setLastWords: (charId, words) => {
      const trimmed = words.trim().slice(0, 40)
      if (!trimmed) return
      mutate((d) => {
        const c = d.family.find((x) => x.id === charId)
        if (!c || c.alive || c.lastWords) return d
        let nd: GameData = {
          ...d,
          family: d.family.map((x) => (x.id === charId ? { ...x, lastWords: trimmed } : x)),
        }
        nd = chronicle(nd, 'event', `${c.name}の遺言 — 「${trimmed}」`, c.id)
        return nd
      })
    },

    // v3.1 M9(M16-2): 誕生時の命名。家譜の産声の行も新しい名で書き直す
    renameCharacter: (charId, name) => {
      const trimmed = name.trim().slice(0, 8)
      if (!trimmed) return
      mutate((d) => {
        const c = d.family.find((x) => x.id === charId)
        if (!c || !c.alive) return d
        const oldName = c.name
        if (oldName === trimmed) return d
        return {
          ...d,
          family: d.family.map((x) => (x.id === charId ? { ...x, name: trimmed } : x)),
          chronicle: d.chronicle.map((e) =>
            e.charId === charId && e.kind === 'birth' ? { ...e, text: e.text.replaceAll(oldName, trimmed) } : e,
          ),
        }
      })
    },

    resolveEvent: (choiceIdx) => {
      const { rng, pendingEvent } = get()
      const d = get().data!

      // ---- ダンジョン内の祠イベント ----
      if (pendingEvent?.nodeId.startsWith('dg:')) {
        const run = get().dungeonRun
        if (!run) {
          set({ pendingEvent: null })
          return
        }
        const ev = eventById(pendingEvent.eventId)
        const choice = ev.choices[choiceIdx]
        if (!choice) return
        if (choice.requireHoto !== undefined && d.hoto < choice.requireHoto) return
        const success = choice.successRate === undefined || rng.chance(choice.successRate)
        const effect = success ? choice.outcomes[0] : (choice.outcomes[1] ?? choice.outcomes[0])
        const region = regionById(run.regionId)
        let nd: GameData = { ...d }
        let light = run.light
        let log = [...run.log, effect.log]
        if (effect.hoto) nd = { ...nd, hoto: Math.max(0, nd.hoto + effect.hoto) }
        if (effect.ketsu) nd = { ...nd, ketsu: nd.ketsu + effect.ketsu }
        if (effect.fame) nd = { ...nd, fame: nd.fame + effect.fame }
        if (effect.light) light = Math.max(0, Math.min(100, light + effect.light))
        if (effect.hpRatio) {
          nd = {
            ...nd,
            family: nd.family.map((c) =>
              run.partyIds.includes(c.id) && c.alive
                ? { ...c, hp: Math.max(1, Math.min(c.maxHp, Math.round(c.hp + c.maxHp * effect.hpRatio!))) }
                : c,
            ),
          }
        }
        if (effect.itemTier) {
          const pool = ITEM_BASES.filter((b) => b.shopTier <= region.tier)
          const item = makeItem(rng.pick(pool).baseId)
          nd = { ...nd, inventory: [...nd.inventory, item] }
          log = [...log, `「${item.name}」を手に入れた。`]
        }
        set({ data: nd, dungeonRun: { ...run, light, log }, pendingEvent: null })
        if (effect.battle) get().dungeonEncounter(false)
        return
      }

      const exp = d.expedition
      if (!pendingEvent || !exp || !exp.nodes[pendingEvent.nodeId]) {
        set({ pendingEvent: null })
        return
      }
      const ev = eventById(pendingEvent.eventId)
      const choice = ev.choices[choiceIdx]
      if (!choice) return
      if (choice.requireHoto !== undefined && d.hoto < choice.requireHoto) return
      const success = choice.successRate === undefined || rng.chance(choice.successRate)
      const effect = success ? choice.outcomes[0] : (choice.outcomes[1] ?? choice.outcomes[0])
      const region = regionById(exp.regionId)
      const node = exp.nodes[pendingEvent.nodeId]

      let nd: GameData = { ...d }
      let light = exp.light
      let log = [...exp.log, effect.log]
      if (effect.hoto) nd = { ...nd, hoto: Math.max(0, nd.hoto + effect.hoto) }
      if (effect.ketsu) nd = { ...nd, ketsu: nd.ketsu + effect.ketsu }
      if (effect.fame) nd = { ...nd, fame: nd.fame + effect.fame }
      if (effect.light) light = Math.max(0, Math.min(100, light + effect.light))
      if (effect.hpRatio) {
        nd = {
          ...nd,
          family: nd.family.map((c) =>
            exp.partyIds.includes(c.id) && c.alive
              ? { ...c, hp: Math.max(1, Math.min(c.maxHp, Math.round(c.hp + c.maxHp * effect.hpRatio!))) }
              : c,
          ),
        }
      }
      if (effect.itemTier) {
        const pool = ITEM_BASES.filter((b) => b.shopTier <= region.tier)
        const item = makeItem(rng.pick(pool).baseId)
        nd = { ...nd, inventory: [...nd.inventory, item] }
        log = [...log, `「${item.name}」を手に入れた。`]
      }

      const nodes = { ...exp.nodes, [pendingEvent.nodeId]: { ...node, cleared: true } }
      nd = { ...nd, expedition: { ...exp, light, log, nodes } }
      set({ data: nd, pendingEvent: null })

      if (effect.battle) {
        const enemyIds = pickEnemies(region, 'battle', node.depth, rng)
        const nodes2 = { ...nodes, [pendingEvent.nodeId]: { ...node, cleared: false, enemyIds } }
        set({ data: { ...nd, expedition: { ...nd.expedition!, nodes: nodes2 } } })
        const party = enrichAllies(
          nd.family
            .filter((c) => exp.partyIds.includes(c.id) && c.alive && c.hp > 0)
            .map((c, i) => combatantFromChar(c, i < 2 ? 'front' : 'back')),
          nd.family,
          nd.motto,
        )
        const ease = nd.narrativeMode ? 0.78 : 1
        const enemies = enemyIds.map((id, i) => {
          const def = enemyById(id)
          return combatantFromEnemy(
            { ...def, atk: Math.round(def.atk * ease), hp: Math.round(def.hp * ease) },
            i,
          )
        })
        const battle = startBattle(party, enemies)
        set({ battle, battleNodeId: pendingEvent.nodeId, screen: { id: 'battle' }, battleLogQueue: [...battle.log] })
        return
      }

      // 最深部だった場合は自動帰還
      if (node.choices.length === 0) get().useReturnFire()
    },

    trainStat: (charId, key) => {
      mutate((d) => {
        if (d.ketsu < 5) return d
        const c = d.family.find((x) => x.id === charId)
        if (!c || !c.alive || c.potential[key] >= 120) return d
        const nd: GameData = {
          ...d,
          ketsu: d.ketsu - 5,
          family: d.family.map((x) =>
            x.id === charId
              ? recalcStats({ ...x, potential: { ...x.potential, [key]: Math.min(120, x.potential[key] + 3) } }, d.seasonIndex)
              : x,
          ),
        }
        return nd
      })
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
        const party = enrichAllies(
          d.family
            .filter((c) => exp.partyIds.includes(c.id) && c.alive && c.hp > 0)
            .map((c, i) => combatantFromChar(c, i < 2 ? 'front' : 'back')),
          d.family,
          d.motto,
        )
        // 灯が尽きていると敵が強化される(常夜の重圧)/ 語り部モードは敵が穏やか
        const dark = light <= 0
        const ease = d.narrativeMode ? 0.78 : 1
        const enemies = defs.map((e, i) =>
          combatantFromEnemy(
            {
              ...e,
              atk: Math.round(e.atk * (dark ? 1.4 : 1) * ease),
              hp: Math.round(e.hp * (dark ? 1.2 : 1) * ease),
            },
            i,
          ),
        )
        const battle = startBattle(party, enemies)
        if (node.type === 'boss' || node.type === 'elite') {
          battle.log.unshift({ text: defs[0].desc, kind: 'info' })
        }
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
        // 選択式の事件 — 選択はUIから resolveEvent で戻る
        const ev = pickEvent(rng)
        mutate((dd) => ({
          ...dd,
          expedition: { ...exp, currentNodeId: nodeId, light, log },
        }))
        set({ pendingEvent: { eventId: ev.id, nodeId } })
        return
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
      const gainedFame = Math.round(exp.loot.hoto / 10) + exp.loot.ketsu * 2
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

    // ---- 歩行ダンジョン(v2) ----
    departDungeon: (regionId, partyIds) => {
      // v3.1 M14: 初到達なら縁起の導入が語られる
      const firstVisit = !(get().data?.regionsVisited ?? []).includes(regionId)
      const lore = loreFor(regionId)
      const introLines = firstVisit && lore ? lore.intro : []
      const run: DungeonRun = {
        regionId,
        floor: 0,
        x: -1,
        y: -1,
        light: 100,
        loot: { hoto: 0, ketsu: 0, items: [] },
        partyIds,
        log: [`${regionById(regionId).name}に足を踏み入れた。灯を絶やすな。`, ...introLines],
        used: [],
        bossDown: false,
      }
      mutate((d) => ({
        ...d,
        family: d.family.map((c) =>
          partyIds.includes(c.id) ? { ...c, expeditions: c.expeditions + 1 } : c,
        ),
        regionsVisited: [...new Set([...(d.regionsVisited ?? []), regionId])],
      }))
      set({ dungeonRun: run, screen: { id: 'dungeon' } })
    },

    dungeonSetPos: (x, y) => {
      const run = get().dungeonRun
      if (!run) return
      set({ dungeonRun: { ...run, x, y } })
    },

    dungeonStep: () => {
      const run = get().dungeonRun
      if (!run) return
      // v3.1 M12-6: 熱狂の赤い火 — 稀に灯が緋に燃え、魔性は凶暴に、実りは豊かになる
      let frantic = run.frantic
      let log = run.log
      if (frantic && frantic > 0) {
        frantic -= 1
        if (frantic === 0) log = [...log, '緋の火が鎮まり、灯はいつもの色に戻った。']
      } else if (run.light > 30 && get().rng.chance(0.012)) {
        frantic = 45
        log = [...log, '灯が緋に燃え上がった! 熱狂の赤い火 — 魔性は猛るが、実りは倍加する!']
      }
      set({ dungeonRun: { ...run, light: Math.max(0, run.light - 0.45), frantic, log } })
    },

    dungeonEncounter: (boss = false, golden = false) => {
      const { rng } = get()
      const run = get().dungeonRun
      const d = get().data
      if (!run || !d) return
      const region = regionById(run.regionId)
      const ease = d.narrativeMode ? 0.78 : 1
      const dark = run.light <= 0
      const enemyIds = boss
        ? [region.bossId ?? 'kubinashi_andon'] // 地域の主(未設定地域は首無し行灯が主代わり)
        : pickEnemies(region, 'battle', run.floor + 2, rng)
      const party = enrichAllies(
        d.family
          .filter((c) => run.partyIds.includes(c.id) && c.alive && c.hp > 0)
          .map((c, i) => combatantFromChar(c, i < 2 ? 'front' : 'back')),
        d.family,
        d.motto,
      )
      // 主が未設定の地域はエリート級を主に見立てて強化する。真の主(tier5)は素の強さで十分
      const standInBoss = boss && !region.bossId
      const enemies = enemyIds.map((id, i) => {
        const def = enemyById(id)
        return combatantFromEnemy(
          {
            ...def,
            atk: Math.round(def.atk * ease * (dark ? 1.4 : 1) * (standInBoss ? 1.5 : 1)),
            hp: Math.round(def.hp * ease * (dark ? 1.2 : 1) * (standInBoss ? 2.2 : 1)),
          },
          i,
        )
      })
      const battle = startBattle(party, enemies)
      if (boss) {
        const bossDef = enemyById(enemyIds[0])
        // v3.1 M14: 対峙の言(縁起) → 主の説明 → 開戦
        const prelude = loreFor(run.regionId)?.bossPrelude ?? []
        battle.log.unshift({ text: `この地の闇が、ひとつに凝った——${region.name}の主だ!`, kind: 'info' })
        battle.log.unshift({ text: bossDef.desc, kind: 'info' })
        for (let i = prelude.length - 1; i >= 0; i--) {
          battle.log.unshift({ text: prelude[i], kind: 'info' })
        }
      }
      if (dark) battle.log.push({ text: '灯は尽きた。常夜の重圧が魔性を狂わせている……!', kind: 'info' })
      // 図鑑: 遭遇した魔性を記録(M14)
      mutate((dd) => ({
        ...dd,
        codex: {
          enemies: [...new Set([...(dd.codex?.enemies ?? []), ...enemyIds])],
          gods: dd.codex?.gods ?? [],
        },
      }))
      if (golden) {
        battle.log.push({ text: '金色の敵影だ! 逃がすな — 実りは並の比ではない!', kind: 'chain' })
      }
      set({
        battle,
        battleSource: boss ? 'dungeonBoss' : 'dungeon',
        battleNodeId: null,
        goldenBattle: golden,
        screen: { id: 'battle' },
        battleLogQueue: [...battle.log],
      })
    },

    dungeonSpecial: (kind, x, y) => {
      const { rng } = get()
      const run = get().dungeonRun
      const d = get().data
      if (!run || !d) return
      const region = regionById(run.regionId)
      const key = `${run.floor}:${x}:${y}`
      const mark = (extra: Partial<DungeonRun>) =>
        set({ dungeonRun: { ...get().dungeonRun!, used: [...run.used, key], ...extra } })

      if (kind === 'monument') {
        // v3.1 M14: 石碑 — 縁起の欠片を拾う(地域ごと3片で核心が開く)
        const lore = loreFor(run.regionId)
        const have = d.loreFrags?.[run.regionId] ?? 0
        if (!lore || have >= 3) {
          mark({ log: [...run.log, '古い石碑だ。刻まれた文字は、もう読み尽くした。'] })
          return
        }
        const frag = lore.fragments[have]
        const now = have + 1
        mutate((dd) => {
          let nd: GameData = {
            ...dd,
            loreFrags: { ...(dd.loreFrags ?? {}), [run.regionId]: now },
          }
          if (now === 3) {
            nd = { ...nd, hoto: nd.hoto + 25 }
            nd = chronicle(nd, 'event', `${region.name}の縁起、その核心に触れる — 石碑の欠片が三つ、揃った。`)
          }
          return nd
        })
        const lines = [`石碑の欠片(${now}/3) — ${frag}`]
        if (now === 3) lines.push(...lore.core, '(縁起の核心に触れた。奉燈25を授かる)')
        else if (now === 1) lines.push(...lore.stir)
        mark({ log: [...run.log, ...lines] })
        return
      }

      if (kind === 'chest') {
        const t = rollTreasure(region, rng)
        mark({
          loot: {
            hoto: run.loot.hoto + t.hoto,
            ketsu: run.loot.ketsu + t.ketsu,
            items: t.item ? [...run.loot.items, t.item] : run.loot.items,
          },
          log: [...run.log, t.text],
        })
      } else if (kind === 'camp') {
        const { hpRatio, lightGain } = campHeal()
        mutate((dd) => ({
          ...dd,
          family: dd.family.map((c) =>
            run.partyIds.includes(c.id) && c.alive
              ? { ...c, hp: Math.min(c.maxHp, Math.round(c.hp + c.maxHp * hpRatio)), mp: Math.min(c.maxMp, c.mp + 10) }
              : c,
          ),
        }))
        mark({
          light: Math.min(100, run.light + lightGain),
          log: [...run.log, '焚火を囲んだ。誰かが故郷の唄を口ずさむ。傷が癒え、灯が少し戻った。'],
        })
      } else if (kind === 'shrine') {
        const ev = pickEvent(rng, run.regionId) // 地域固有事件を優先(M14)
        mark({})
        set({ pendingEvent: { eventId: ev.id, nodeId: `dg:${key}` } })
      } else if (kind === 'boss') {
        if (run.bossDown) return
        get().dungeonEncounter(true)
      }
      // stairs/entrance はUI側で確認ダイアログを出してから dungeonAdvanceFloor/dungeonReturn を呼ぶ
    },

    dungeonAdvanceFloor: () => {
      const run = get().dungeonRun
      if (!run) return
      const dungeon = dungeonByRegion(run.regionId)
      if (!dungeon || run.floor + 1 >= dungeon.floors.length) return
      set({
        dungeonRun: {
          ...run,
          floor: run.floor + 1,
          x: -1,
          y: -1,
          log: [...run.log, `さらに深く——地下${run.floor + 2}層へ。`],
        },
      })
    },

    dungeonReturn: () => {
      const run = get().dungeonRun
      const d = get().data
      if (!run || !d) return
      const gainedFame = Math.round(run.loot.hoto / 10) + run.loot.ketsu * 2 + (run.bossDown ? 40 : 0)
      let nd: GameData = {
        ...d,
        hoto: d.hoto + run.loot.hoto,
        ketsu: d.ketsu + run.loot.ketsu,
        inventory: [...d.inventory, ...run.loot.items],
        fame: d.fame + gainedFame,
      }
      nd = chronicle(nd, 'triumph', `${regionById(run.regionId).name}より帰還。奉燈${run.loot.hoto}、血珠${run.loot.ketsu}、武功${gainedFame}を得た。`)

      // 初陣 — 初めての夜藪から帰った子の夜
      const head = nd.family.find((c) => c.alive && c.isHead) ?? null
      const debutScenes: PendingScene[] = []
      for (const c of nd.family) {
        if (run.partyIds.includes(c.id) && c.alive && c.expeditions === 1 && !c.deeds.includes('初陣を飾った')) {
          nd = {
            ...nd,
            family: nd.family.map((x) => (x.id === c.id ? { ...x, deeds: [...x.deeds, '初陣を飾った'] } : x)),
          }
          debutScenes.push({ kind: 'life', ...hatsujinScene(c, head, get().rng) })
        }
      }
      set({ data: nd, dungeonRun: null, pendingScenes: [...get().pendingScenes, ...debutScenes] })
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
      const { battle, battleNodeId, rng, battleSource } = get()
      const d = get().data!

      // ---- 歩行ダンジョンでの戦闘結果 ----
      if (battleSource === 'dungeon' || battleSource === 'dungeonBoss') {
        const run = get().dungeonRun
        if (!battle || !run) return
        let family = d.family.map((c) => {
          const cb = battle.allies.find((a) => a.charId === c.id)
          if (!cb) return c
          return { ...c, hp: Math.max(battle.phase === 'won' || battle.phase === 'fled' ? 1 : 0, cb.hp), mp: cb.mp }
        })
        if (battle.phase === 'won') {
          // 玄冬撃破 → 面が割れ、家祖・汐里との最終戦(二段目)へ
          if (battle.enemies.some((e) => e.enemyId === 'boss_gentou') && !d.flags.shioriPhase) {
            const healed = battle.allies.map((a) => ({
              ...a,
              hp: Math.max(a.hp, Math.round(a.maxHp * 0.45)),
              mp: Math.min(a.maxMp, a.mp + 25),
              guard: false,
              buffs: {},
            }))
            const shioriDef = enemyById('boss_shiori')
            const easeS = d.narrativeMode ? 0.78 : 1
            const battle2 = startBattle(healed, [combatantFromEnemy(
              { ...shioriDef, atk: Math.round(shioriDef.atk * easeS), hp: Math.round(shioriDef.hp * easeS) },
              0,
            )])
            battle2.log = [
              { text: '玄冬の面が、割れて落ちる——', kind: 'info' },
              { text: '現れたのは、楽士の面影。千年、独りで星喰いを封じ続けた家祖・汐里。', kind: 'info' },
              { text: '「……ああ、来てくれたのね。私の、遠い遠い子どもたち」', kind: 'info' },
              { text: '汐里は楽を構えた。千年の最後の演目——看取ってやれ!', kind: 'info' },
            ]
            set({
              data: { ...d, family, flags: { ...d.flags, shioriPhase: true } },
              battle: battle2,
              battleLogQueue: [...battle2.log],
            })
            return
          }
          // 汐里を看取った — 千年の夜が明ける
          if (battle.enemies.some((e) => e.enemyId === 'boss_shiori')) {
            let nd: GameData = {
              ...d,
              family,
              regionsCleared: [...new Set([...d.regionsCleared, run.regionId])],
              flags: { ...d.flags, cleared: true },
            }
            nd = chronicle(nd, 'era', '灯ノ御山の頂にて、家祖・汐里と相まみえる。千年の答えを、選ぶ時。')
            set({
              data: nd,
              battle: null,
              battleSource: 'node',
              goldenBattle: false,
              dungeonRun: null,
              pendingScenes: [],
              screen: { id: 'finale' }, // v3.1 M15-4: 結末の選択へ
            })
            saveGame(get().data!)
            return
          }
          const defs = battle.enemies
            .map((e) => (e.enemyId ? enemyById(e.enemyId) : null))
            .filter((x): x is NonNullable<typeof x> => !!x)
          // 赤い火(M12-6)+商売の家訓(M12-8)+金の敵影(M15-5)で実りが増す
          const lootK =
            ((run.frantic ?? 0) > 0 ? 1.5 : 1) *
            (d.motto === 'shobai' ? 1.08 : 1) *
            (get().goldenBattle ? 2.5 : 1)
          const hoto = Math.round(defs.reduce((s, e) => s + e.hoto, 0) * lootK)
          const ketsu = Math.round(defs.reduce((s, e) => s + e.ketsu, 0) * lootK)
          family = family.map((c) =>
            run.partyIds.includes(c.id) && c.alive ? { ...c, kills: c.kills + defs.length } : c,
          )
          const isBoss = battleSource === 'dungeonBoss'
          let nd: GameData = { ...d, family }
          if (isBoss) {
            nd = chronicle(nd, 'triumph', `${regionById(run.regionId).name}の主を討伐! 一族の武功、天に届く。`)
            nd = {
              ...nd,
              family: nd.family.map((c) =>
                run.partyIds.includes(c.id) && c.alive ? { ...c, deeds: [...c.deeds, `${regionById(run.regionId).name}の主を討った`] } : c,
              ),
              regionsCleared: [...new Set([...nd.regionsCleared, run.regionId])],
            }
            // v3.1 M14: 鎮魂 — 縁起の結び。欠片3つ揃っていれば「土地の記」が完成する
            const lore = loreFor(run.regionId)
            if (lore) {
              nd = chronicle(nd, 'event', `【鎮魂】${lore.requiem[0]}`)
              if ((nd.loreFrags?.[run.regionId] ?? 0) >= 3) {
                nd = { ...nd, hoto: nd.hoto + 40 }
                nd = chronicle(nd, 'era', `${regionById(run.regionId).name}の「土地の記」、家譜に綴られる。(奉燈40)`)
              }
            }
          }
          set({
            data: nd,
            battle: null,
            battleSource: 'node',
            goldenBattle: false,
            dungeonRun: {
              ...run,
              bossDown: run.bossDown || isBoss,
              light: Math.max(0, run.light - 6),
              loot: { ...run.loot, hoto: run.loot.hoto + hoto, ketsu: run.loot.ketsu + ketsu },
              log: [...run.log, isBoss ? '主を討った! 森に静寂が戻る。' : `魔性を討った。奉燈${hoto}を得た。`],
            },
            screen: { id: 'dungeon' },
          })
          return
        }
        if (battle.phase === 'fled') {
          set({
            data: { ...d, family },
            battle: null,
            battleSource: 'node',
            goldenBattle: false,
            dungeonRun: { ...run, light: Math.max(0, run.light - 3), log: [...run.log, '命からがら逃げ延びた。'] },
            screen: { id: 'dungeon' },
          })
          return
        }
        // 全滅 — 一人生還
        let nd: GameData = { ...d, family }
        const partyAlive = nd.family.filter((c) => run.partyIds.includes(c.id) && c.alive)
        const survivor = [...partyAlive].sort((a, b) => b.potential.luk - a.potential.luk)[0]
        const lostNames: string[] = []
        nd = {
          ...nd,
          family: nd.family.map((c) => {
            if (!run.partyIds.includes(c.id) || !c.alive) return c
            if (survivor && c.id === survivor.id) {
              return { ...c, hp: 1, mp: 0, fatigue: Math.min(100, c.fatigue + 40), deeds: [...c.deeds, '全滅の夜藪から独り生還した'] }
            }
            lostNames.push(c.name)
            return {
              ...c, alive: false, hp: 0,
              deathSeason: nd.seasonIndex,
              deathCause: deathCauseLabel('lost'),
              epitaph: generateEpitaph(c, 'lost', rng),
              isHead: false,
            }
          }),
          hoto: nd.hoto + Math.round(run.loot.hoto / 2),
          ketsu: nd.ketsu + Math.round(run.loot.ketsu / 2),
        }
        nd = chronicle(nd, 'death',
          lostNames.length > 0
            ? `${regionById(run.regionId).name}にて隊は壊滅。${lostNames.join('、')}、行方知れず。${survivor ? `${survivor.name}だけが、綴の灯に導かれて生還した。` : ''}`
            : `${regionById(run.regionId).name}より${survivor?.name ?? '当主'}、満身創痍で生還。`,
        )
        set({ data: nd, battle: null, battleSource: 'node',
            goldenBattle: false, dungeonRun: null })
        advanceSeason()
        return
      }

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
        // 玄冬撃破 → 面が割れ、汐里との最終戦(二段目)へ
        if (node.enemyIds?.includes('boss_gentou') && !d.flags.shioriPhase) {
          const healed = battle.allies.map((a) => ({
            ...a,
            hp: Math.max(a.hp, Math.round(a.maxHp * 0.45)),
            mp: Math.min(a.maxMp, a.mp + 25),
            guard: false,
            buffs: {},
          }))
          const shioriDef = enemyById('boss_shiori')
          const easeS = d.narrativeMode ? 0.78 : 1
          const shiori = [combatantFromEnemy(
            { ...shioriDef, atk: Math.round(shioriDef.atk * easeS), hp: Math.round(shioriDef.hp * easeS) },
            0,
          )]
          const battle2 = startBattle(healed, shiori)
          battle2.log = [
            { text: '玄冬の面が、割れて落ちる——', kind: 'info' },
            { text: '現れたのは、楽士の面影。千年、独りで星喰いを封じ続けた家祖・汐里。', kind: 'info' },
            { text: '「……ああ、来てくれたのね。私の、遠い遠い子どもたち」', kind: 'info' },
            { text: '汐里は楽を構えた。千年の最後の演目——看取ってやれ!', kind: 'info' },
          ]
          const nodes = { ...exp.nodes, [battleNodeId]: { ...node, enemyIds: ['boss_shiori'] } }
          set({
            data: { ...d, family, flags: { ...d.flags, shioriPhase: true }, expedition: { ...exp, nodes } },
            battle: battle2,
            battleLogQueue: [...battle2.log],
          })
          return
        }
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
          // 最終ボス撃破 → 千年の岐路(探索状態は畳む) — v3.1 M15-4
          if (region.id === 'akashi_miyama') {
            set({
              data: { ...nd, expedition: undefined, flags: { ...nd.flags, cleared: true } },
              battle: null, battleNodeId: null, pendingScenes: [], screen: { id: 'finale' },
            })
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

      // 全滅 — 隊は夜藪に消える(行方知れず)。ただし最も星運の強い一人だけ、
      // 綴が家譜の頁を燃やした灯に導かれて生還する。持ち帰りは半分だけ届く。
      let nd: GameData = { ...d, family }
      const partyAlive = nd.family.filter((c) => exp.partyIds.includes(c.id) && c.alive)
      const survivor = [...partyAlive].sort((a, b) => b.potential.luk - a.potential.luk)[0]
      const lostNames: string[] = []
      nd = {
        ...nd,
        family: nd.family.map((c) => {
          if (!exp.partyIds.includes(c.id) || !c.alive) return c
          if (survivor && c.id === survivor.id) {
            return {
              ...c, hp: 1, mp: 0,
              fatigue: Math.min(100, c.fatigue + 40),
              deeds: [...c.deeds, '全滅の夜藪から独り生還した'],
            }
          }
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
      const wipeText = lostNames.length > 0
        ? `${regionById(exp.regionId).name}にて隊は壊滅。${lostNames.join('、')}、行方知れず。${survivor ? `${survivor.name}だけが、綴の灯に導かれて生還した。` : ''}`
        : `${regionById(exp.regionId).name}より${survivor?.name ?? '当主'}、満身創痍で生還。`
      nd = {
        ...nd,
        chronicle: [...nd.chronicle, {
          season: nd.seasonIndex, kind: 'death' as const,
          text: wipeText,
        }],
      }
      set({ data: nd, battle: null, battleNodeId: null })
      advanceSeason()
    },
  }
})

if (import.meta.env.DEV) {
  window.__game = useGame
  // ランタイム生成コンテンツ(敵の変異/装備の系譜/家業の技)はテキスト静的解析では
  // 数え漏れる。実データで件数とid重複を検証するためのdev専用フック(GDD_v3 §6)。
  import('./data/gods').then(({ GODS }) => {
    import('./data/enemies').then(({ ENEMIES }) => {
      import('./data/items').then(({ ITEM_BASES }) => {
        import('./expedition').then(({ EVENTS }) => {
          import('./data/jobs').then(({ JOB_CLASSES, allJobSkills }) => {
            const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i)
            window.__counts = {
              gods: GODS.length,
              godDupes: dupes(GODS.map((g) => g.id)),
              enemies: ENEMIES.length,
              enemyDupes: dupes(ENEMIES.map((e) => e.id)),
              items: ITEM_BASES.length,
              itemDupes: dupes(ITEM_BASES.map((i) => i.baseId)),
              events: EVENTS.length,
              eventDupes: dupes(EVENTS.map((e) => e.id)),
              jobs: JOB_CLASSES.length,
              jobSkills: allJobSkills().length,
              jobSkillDupes: dupes(allJobSkills().map((s) => s.id)),
            }
            // eslint-disable-next-line no-console
            console.log('[__counts]', window.__counts)
          })
        })
      })
    })
  })
}
