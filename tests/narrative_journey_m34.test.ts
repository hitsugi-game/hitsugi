import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loreFor } from '../src/core/data/lore'
import { VILLAGERS } from '../src/core/data/villagers'
import { bossEmotion, regionQuestion } from '../src/core/narrative'

let bossVictoryRequiem: typeof import('../src/ui/Battle').bossVictoryRequiem
let dungeonEntryEcho: typeof import('../src/ui/Dungeon').dungeonEntryEcho
let latestVillageGossip: typeof import('../src/ui/Village').latestVillageGossip
let markVillageGossipValue: typeof import('../src/ui/Village').markVillageGossipValue
let villageGossipWasHeard: typeof import('../src/ui/Village').villageGossipWasHeard

beforeAll(async () => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
  ;({ bossVictoryRequiem } = await import('../src/ui/Battle'))
  ;({ dungeonEntryEcho } = await import('../src/ui/Dungeon'))
  ;({ latestVillageGossip, markVillageGossipValue, villageGossipWasHeard } = await import('../src/ui/Village'))
})

describe('M34 N2 主要旅程の残響', () => {
  const regionId = 'yoi_forest'
  const regionName = '宵の森'

  it('出立・入場・主戦・勝利を同じ地域縁起へ接続する', () => {
    const lore = loreFor(regionId)!

    expect(regionQuestion(regionName, 0, false)).toContain(regionName)
    expect(dungeonEntryEcho(regionId, 0)).toBe(lore.intro[0])
    expect(dungeonEntryEcho(regionId, 1)).toBe(lore.intro[1] ?? lore.intro[0])
    expect(bossEmotion(regionName, 1)).toContain(regionName)
    expect(bossVictoryRequiem(regionId)).toBe(lore.requiem[0])
  })

  it('唯一開示前は最新gossipを11で止め、実在NPC一人へ割り当てる', () => {
    const assignment = latestVillageGossip({ gossipIndex: 18, flags: {} })!

    expect(assignment.ordinal).toBe(11)
    expect(assignment.entry.id).toBe('gsp_11')
    expect(VILLAGERS.some((villager) => villager.id === assignment.villagerId)).toBe(true)
  })

  it('割り当てNPCの既存会話フラグへ聞いた印を保存し、同じ噂を一度だけにする', () => {
    const assignment = latestVillageGossip({
      gossipIndex: 18,
      flags: { reveal_shiori_name: true },
    })!
    const flag = markVillageGossipValue(undefined, 3, assignment.ordinal)

    expect(assignment.ordinal).toBe(18)
    expect(villageGossipWasHeard(flag, assignment.ordinal)).toBe(true)
    expect(villageGossipWasHeard(flag, assignment.ordinal + 1)).toBe(false)
  })
})
