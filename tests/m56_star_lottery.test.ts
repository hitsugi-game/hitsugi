import { describe, expect, it } from 'vitest'
import { GODS, godById } from '../src/core/data/gods'
import { markJourneyMilestone } from '../src/core/journey_metrics'
import { Rng } from '../src/core/rng'
import {
  claimStarLottery,
  migrateStarLottery,
  nextStarLotteryOdds,
  openStarLottery,
} from '../src/core/star_lottery'
import type { GameData, GodRank } from '../src/core/types'

function data(patch: Partial<GameData> = {}): GameData {
  const base = {
    seasonIndex: 2, family: [{ id: 'h', hp: 10, equipment: {}, expeditions: 0 }], hoto: 0, ketsu: 0,
    inventory: [], godAffinity: {}, fame: 5000, regionsCleared: [], chronicle: [], pendingBirths: [],
    flags: {}, narrativeMode: false, seed: 1,
  } as unknown as GameData
  return markJourneyMilestone({ ...base, ...patch }, 'first_return', 1000)
}

describe('M56 三星択一', () => {
  it('次回実確率は基礎・20回・50回保証を同じ純関数で返す', () => {
    expect(nextStarLotteryOdds(1)).toEqual({ 1: 60, 2: 28, 3: 10, 4: 2 })
    expect(nextStarLotteryOdds(20)).toEqual({ 1: 0, 2: 0, 3: 1000 / 12, 4: 200 / 12 })
    expect(nextStarLotteryOdds(50)).toEqual({ 1: 0, 2: 0, 3: 0, 4: 100 })
  })

  it('openは同位階の異なる三柱を保存し、同request再送は同候補を返す', () => {
    const original = data()
    const first = openStarLottery(original, 'open-1', 1, new Rng(17))
    expect(first.pending).not.toBeNull()
    expect(new Set(first.pending!.candidateGodIds).size).toBe(3)
    expect(new Set(first.pending!.candidateGodIds.map((id) => godById(id).rank))).toEqual(new Set([first.pending!.rank]))
    expect(first.data.starLottery?.drawsUsed).toBe(1)

    const retry = openStarLottery(first.data, 'open-1', 1, new Rng(999))
    expect(retry.pending).toEqual(first.pending)
    expect(openStarLottery(first.data, 'other', 2, new Rng(999)).reason).toBe('pending_exists')
  })

  it('claimは一柱だけ確定し、二重送信は同receiptで報酬を増やさない', () => {
    const opened = openStarLottery(data(), 'claim-1', 1, new Rng(5))
    const chosen = opened.pending!.candidateGodIds[1]
    const first = claimStarLottery(opened.data, 'claim-1', 1, chosen)
    expect(first.receipt?.selectedGodId).toBe(chosen)
    expect(migrateStarLottery(first.data).pendingV2).toBeUndefined()
    expect(migrateStarLottery(first.data).cards).toContain(chosen)

    const retry = claimStarLottery(first.data, 'claim-1', 1, chosen)
    expect(retry.receipt).toEqual(first.receipt)
    expect(retry.data).toEqual(first.data)
  })

  it('10回保証は別候補を選んでも未所持添え札を一度だけ付与する', () => {
    const missing = GODS.find((god) => god.rank === 4)!
    const allButOne = GODS.filter((god) => god.id !== missing.id).map((god) => god.id)
    const original = data({
      starLottery: { cards: allButOne, drawsUsed: 9, history: [] },
    })
    const opened = openStarLottery(original, 'ten', 10, new Rng(22))
    expect(opened.pending?.rescue).toEqual({ kind: 'guaranteed-new', godId: missing.id })
    const different = opened.pending!.candidateGodIds.find((id) => id !== missing.id)!
    const claimed = claimStarLottery(opened.data, 'ten', 10, different)
    expect(claimed.result?.newGodIds).toEqual([missing.id])
    expect(claimed.receipt?.grantedGodIds).toEqual([different, missing.id])
  })

  it('1000 seed×50籤で保証違反0、new-firstの中央値48以上・p10 45以上', () => {
    const newCounts: number[] = []
    const rankObservations: Record<GodRank, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    for (let seed = 0; seed < 1000; seed++) {
      let current = data({ seed, fame: 5000 })
      for (let draw = 1; draw <= 50; draw++) {
        const opened = openStarLottery(current, `s${seed}-d${draw}`, draw, new Rng(current.seed))
        expect(opened.pending, `seed ${seed} draw ${draw}`).not.toBeNull()
        rankObservations[opened.pending!.rank] += 1
        const owned = new Set(migrateStarLottery(opened.data).cards)
        const chosen = opened.pending!.candidateGodIds.find((id) => !owned.has(id)) ?? opened.pending!.candidateGodIds[0]
        const claimed = claimStarLottery(opened.data, opened.pending!.requestId, draw, chosen)
        expect(claimed.receipt).not.toBeNull()
        current = claimed.data
        if (draw % 10 === 0 && migrateStarLottery(current).cards.length < GODS.length) {
          expect(claimed.result!.newGodIds.length).toBeGreaterThan(0)
        }
      }
      newCounts.push(migrateStarLottery(current).cards.length)
    }
    newCounts.sort((a, b) => a - b)
    expect(newCounts[Math.floor(newCounts.length * .5)]).toBeGreaterThanOrEqual(48)
    expect(newCounts[Math.floor(newCounts.length * .1)]).toBeGreaterThanOrEqual(45)
    expect(rankObservations[4]).toBeGreaterThan(0)
  }, 30_000)
})
