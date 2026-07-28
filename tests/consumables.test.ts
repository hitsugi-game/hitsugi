// M28-C: 回復薬(消耗品)の受入実測。devil規律の3点を機械検証する:
//  (1) 消耗品購入→装備一覧(inventory)に不在(equipmentと別系統)
//  (2) 消耗品入りセーブ load→save→load で安定(旧セーブ互換の optional フィールド)
//  (3) 戦闘で道具→HP回復し在庫が1減る / 在庫0では使えない(ターンを消費しない)
import { beforeEach, describe, expect, it } from 'vitest'
import { LANTERN_TENDING_COST, LANTERN_TENDING_RATIO, useGame } from '../src/core/store'
import { saveGame, loadGame } from '../src/core/save'
import { consumableById, CONSUMABLES } from '../src/core/data/consumables'

const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    key: (index: number) => [...storage.keys()][index] ?? null,
    get length() { return storage.size },
  },
})

beforeEach(() => {
  storage.clear()
  useGame.getState().newGame(false)
})

describe('M28-C 回復薬(消耗品)', () => {
  it('郷の灯芯手入れは月を送らず、選んだ一人のMPだけを回復する', () => {
    const initial = useGame.getState().data!
    const target = initial.family[0]
    const other = initial.family[1]
    const targetMp = 0
    const otherMp = other ? Math.max(0, other.mp - 1) : undefined
    useGame.setState({
      data: {
        ...initial,
        hoto: 100,
        family: initial.family.map((character) => character.id === target.id
          ? { ...character, mp: targetMp }
          : other && character.id === other.id ? { ...character, mp: otherMp! } : character),
      },
    })

    useGame.getState().tendLantern(target.id)

    const after = useGame.getState().data!
    const tended = after.family.find((character) => character.id === target.id)!
    expect(tended.mp).toBe(Math.ceil(target.maxMp * LANTERN_TENDING_RATIO))
    expect(after.hoto).toBe(100 - LANTERN_TENDING_COST)
    expect(after.seasonIndex).toBe(initial.seasonIndex)
    if (other) expect(after.family.find((character) => character.id === other.id)!.mp).toBe(otherMp)
  })

  it('灯力満タンまたは奉燈不足では灯芯手入れの対価を取らない', () => {
    const initial = useGame.getState().data!
    const target = initial.family[0]
    useGame.setState({ data: { ...initial, hoto: 100 } })
    useGame.getState().tendLantern(target.id)
    expect(useGame.getState().data!.hoto).toBe(100)

    useGame.setState({
      data: {
        ...useGame.getState().data!,
        hoto: LANTERN_TENDING_COST - 1,
        family: useGame.getState().data!.family.map((character) => character.id === target.id
          ? { ...character, mp: 0 }
          : character),
      },
    })
    useGame.getState().tendLantern(target.id)
    const after = useGame.getState().data!
    expect(after.hoto).toBe(LANTERN_TENDING_COST - 1)
    expect(after.family.find((character) => character.id === target.id)!.mp).toBe(0)
  })

  it('購入で在庫が増え奉燈が減る / equipment・inventoryには入らない(devil)', () => {
    const g = useGame.getState()
    useGame.setState({ data: { ...g.data!, hoto: 1000, consumables: [] } }) // 初期備えを空にして純増を測る
    const def = consumableById('araigusa')!
    const invBefore = useGame.getState().data!.inventory.length

    useGame.getState().buyConsumable('araigusa')
    useGame.getState().buyConsumable('araigusa')

    const d = useGame.getState().data!
    const stack = (d.consumables ?? []).find((s) => s.id === 'araigusa')
    expect(stack?.count).toBe(2)
    expect(d.hoto).toBe(1000 - def.price * 2)
    // devil #1: 装備一覧(inventory)を汚さない。どの家族の装備スロットにも紛れない。
    expect(d.inventory.length).toBe(invBefore)
    expect(d.inventory.some((i) => i.id === 'araigusa' || i.baseId === 'araigusa')).toBe(false)
    for (const c of d.family) {
      expect(Object.values(c.equipment).some((it) => it?.baseId === 'araigusa')).toBe(false)
    }
  })

  it('奉燈が足りなければ買えない', () => {
    const g = useGame.getState()
    useGame.setState({ data: { ...g.data!, hoto: 5, consumables: [] } })
    useGame.getState().buyConsumable('neri_kou') // price 58
    const d = useGame.getState().data!
    expect(d.consumables ?? []).toEqual([])
    expect(d.hoto).toBe(5)
  })

  it('M33 ⑮: 上位薬は解禁武功(unlockFame)未満では買えず、到達後に買える', () => {
    const g = useGame.getState()
    // 万金膏(unlockFame 150)。奉燈は潤沢だが武功100(未満)では購えない。
    useGame.setState({ data: { ...g.data!, hoto: 1000, fame: 100, consumables: [] } })
    useGame.getState().buyConsumable('bankin_kou')
    let d = useGame.getState().data!
    expect(d.consumables ?? [], '武功未満では在庫が増えない(ゲートが効いている)').toEqual([])
    expect(d.hoto, '武功未満では奉燈も減らない').toBe(1000)
    // 武功150到達後は買える。
    useGame.setState({ data: { ...useGame.getState().data!, fame: 150 } })
    useGame.getState().buyConsumable('bankin_kou')
    d = useGame.getState().data!
    expect((d.consumables ?? []).find((s) => s.id === 'bankin_kou')?.count, '解禁後は買える').toBe(1)
    expect(d.hoto, '解禁後は奉燈が減る').toBe(1000 - 130)
  })

  it('消耗品入りセーブが load→save→load で安定(devil #2 旧セーブ互換)', () => {
    const g = useGame.getState()
    const withConsum = { ...g.data!, consumables: [{ id: 'araigusa', count: 3 }, { id: 'tomoshi_abura', count: 1 }] }
    saveGame(withConsum)
    const loaded1 = loadGame()!
    expect(loaded1.consumables).toEqual([{ id: 'araigusa', count: 3 }, { id: 'tomoshi_abura', count: 1 }])
    saveGame(loaded1)
    const loaded2 = loadGame()!
    expect(loaded2.consumables).toEqual([{ id: 'araigusa', count: 3 }, { id: 'tomoshi_abura', count: 1 }])
  })

  it('旧セーブ(consumables無し)はundefinedのままload安定', () => {
    const g = useGame.getState()
    const legacy = { ...g.data! }
    delete (legacy as Record<string, unknown>).consumables
    saveGame(legacy)
    const loaded = loadGame()!
    // undefined でも壊れない(購入時に [] から積み上がる)
    expect(loaded.consumables).toBeUndefined()
  })

  it('戦闘で道具→HP回復し在庫が1減る / 在庫0では使えない', () => {
    const g0 = useGame.getState()
    const leader = g0.data!.family[0]
    useGame.setState({ data: { ...g0.data!, hoto: 1000, consumables: [{ id: 'neri_kou', count: 1 }] } })
    useGame.getState().departDungeon('yoi_forest', [leader.id])
    useGame.getState().dungeonEncounter(false, false)
    const battle = useGame.getState().battle
    expect(battle).not.toBeNull()

    // 当主を負傷させてから道具で回復(効果が見えるように)
    const ally = battle!.allies[0]
    const woundedHp = 10
    useGame.setState({
      battle: { ...battle!, allies: battle!.allies.map((a) => (a.key === ally.key ? { ...a, hp: woundedHp } : a)) },
    })

    useGame.getState().battleCommand({ type: 'item', itemId: 'neri_kou', targetKey: ally.key })
    const after = useGame.getState()
    // 回復の証跡はログで確認(battleCommandは道具使用後に敵ターンも自動処理するため、
    // 最終hpは敵の反撃を含みうる。ここでは「道具が回復を発火させた」ことを検証する)。
    const healLog = after.battleLogQueue.find((e) => e.kind === 'heal' && e.text.includes('練り膏'))
    expect(healLog).toBeDefined()
    expect(healLog!.amount).toBe(consumableById('neri_kou')!.effect.amount)
    const healed = after.battle!.allies.find((a) => a.key === ally.key)!
    expect(healed.hp).toBeGreaterThan(woundedHp) // 負傷値より確実に増えている
    // 在庫は1→0(=スタック消滅)
    expect((after.data!.consumables ?? []).find((s) => s.id === 'neri_kou')).toBeUndefined()

    // 在庫0でもう一度使っても在庫はマイナスにならず、無効(データ不変)
    const stacksBefore = after.data!.consumables ?? []
    useGame.getState().battleCommand({ type: 'item', itemId: 'neri_kou', targetKey: ally.key })
    expect(useGame.getState().data!.consumables ?? []).toEqual(stacksBefore)
  })

  it('全消耗品の定義が健全(id一意・効果量正・価格正)', () => {
    const ids = new Set<string>()
    for (const c of CONSUMABLES) {
      expect(ids.has(c.id)).toBe(false)
      ids.add(c.id)
      expect(c.price).toBeGreaterThan(0)
      expect(c.effect.amount).toBeGreaterThan(0)
      expect(['hp', 'mp']).toContain(c.effect.stat)
      expect(['one', 'party']).toContain(c.effect.scope)
    }
  })
})
