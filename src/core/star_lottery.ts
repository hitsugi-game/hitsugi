import { GODS } from './data/gods'
import { migrateJourneyMetrics } from './journey_metrics'
import { Rng } from './rng'
import type {
  GameData,
  God,
  GodRank,
  StarLotteryCandidateRewardV2,
  StarLotteryHistoryEntry,
  StarLotteryPendingV2,
  StarLotteryReceiptV2,
  StarLotteryState,
} from './types'

export const STAR_LOTTERY_RATES: Readonly<Record<GodRank, number>> = {
  1: 60,
  2: 28,
  3: 10,
  4: 2,
}
export const STAR_LOTTERY_HISTORY_MAX = 50
export const STAR_LOTTERY_AFFINITY_RESCUE = 1

const GOD_IDS = new Set(GODS.map((god) => god.id))
const GOD_BY_ID = new Map(GODS.map((god) => [god.id, god]))

function safeInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

function cleanRescue(value: unknown): StarLotteryPendingV2['rescue'] | undefined {
  if (!value || typeof value !== 'object') return undefined
  const rescue = value as Partial<NonNullable<StarLotteryPendingV2['rescue']>>
  if ((rescue.kind !== 'guaranteed-new' && rescue.kind !== 'star-return') ||
      typeof rescue.godId !== 'string' || !GOD_IDS.has(rescue.godId)) return undefined
  return { kind: rescue.kind, godId: rescue.godId }
}

/**
 * M56 protocol §4: a pending draw is a saved reward transaction, not display-only
 * data. Validate the open-time ownership snapshot and every rescue precondition
 * before either load or claim is allowed to use it.
 */
export function isValidStarLotteryPendingV2(
  value: unknown,
  drawsUsed: number,
  ownedGodIds: readonly string[],
): value is StarLotteryPendingV2 {
  if (!value || typeof value !== 'object') return false
  const pending = value as Partial<StarLotteryPendingV2>
  if (pending.version !== 2 || typeof pending.requestId !== 'string' ||
      !pending.requestId.trim() ||
      safeInt(pending.drawNumber) !== drawsUsed || pending.drawNumber !== drawsUsed ||
      ![1, 2, 3, 4].includes(pending.rank as number) ||
      !Array.isArray(pending.candidateGodIds) || pending.candidateGodIds.length !== 3 ||
      new Set(pending.candidateGodIds).size !== 3 ||
      !Array.isArray(pending.candidateRewards) || pending.candidateRewards.length !== 3) return false
  const ids = pending.candidateGodIds
  if (ids.some((id) => typeof id !== 'string' || !GOD_IDS.has(id) || GOD_BY_ID.get(id)?.rank !== pending.rank)) return false
  const owned = new Set(ownedGodIds)
  for (let i = 0; i < 3; i++) {
    const reward = pending.candidateRewards[i]
    if (!reward || reward.godId !== ids[i] || typeof reward.ownedAtOpen !== 'boolean' ||
        !Number.isInteger(reward.affinityAtOpen) || reward.affinityAtOpen < 0 ||
        (reward.mainReward !== 'new-card' && reward.mainReward !== 'affinity-plus-one')) return false
    if (reward.ownedAtOpen !== owned.has(reward.godId)) return false
    if (reward.mainReward !== (reward.ownedAtOpen ? 'affinity-plus-one' : 'new-card')) return false
  }
  if (!Number.isInteger(pending.openedAtSeason) || (pending.openedAtSeason ?? -1) < 0) return false

  const unseen = GODS.filter((god) => !owned.has(god.id))
  const guaranteeActive = drawsUsed % 10 === 0 && unseen.length > 0
  const rescue = cleanRescue(pending.rescue)
  if (pending.rescue !== undefined && !rescue) return false
  if (guaranteeActive && rescue?.kind !== 'guaranteed-new') return false
  if (!guaranteeActive && rescue?.kind === 'guaranteed-new') return false
  if (rescue && owned.has(rescue.godId)) return false

  if (rescue?.kind === 'guaranteed-new') {
    const rescueIsCandidate = ids.includes(rescue.godId)
    if (!rescueIsCandidate) {
      // A candidate-external guarantee is only possible when the chosen rank
      // was already complete at open time.
      const currentRankComplete = GODS
        .filter((god) => god.rank === pending.rank)
        .every((god) => owned.has(god.id))
      if (!currentRankComplete) return false
    }
  }
  if (rescue?.kind === 'star-return') {
    if (guaranteeActive || ids.includes(rescue.godId) ||
        !pending.candidateRewards.every((reward) => reward.ownedAtOpen && reward.affinityAtOpen >= 5) ||
        unseen.length === 0) return false
  }
  return true
}

function cleanPending(value: unknown, drawsUsed: number, ownedGodIds: readonly string[]): StarLotteryPendingV2 | undefined {
  if (!isValidStarLotteryPendingV2(value, drawsUsed, ownedGodIds)) return undefined
  const pending = value
  const rewards: StarLotteryCandidateRewardV2[] = pending.candidateRewards.map((reward) => ({
    godId: reward.godId,
    ownedAtOpen: reward.ownedAtOpen,
    affinityAtOpen: safeInt(reward.affinityAtOpen),
    mainReward: reward.mainReward,
  }))
  return {
    version: 2,
    requestId: pending.requestId.trim().slice(0, 80),
    drawNumber: drawsUsed,
    rank: pending.rank,
    candidateGodIds: pending.candidateGodIds,
    candidateRewards: rewards as StarLotteryPendingV2['candidateRewards'],
    rescue: cleanRescue(pending.rescue),
    openedAtSeason: safeInt(pending.openedAtSeason),
  }
}

function cleanReceipt(value: unknown): StarLotteryReceiptV2 | undefined {
  if (!value || typeof value !== 'object') return undefined
  const receipt = value as Partial<StarLotteryReceiptV2>
  if (typeof receipt.requestId !== 'string' || !Number.isFinite(receipt.drawNumber) ||
      typeof receipt.selectedGodId !== 'string' || !GOD_IDS.has(receipt.selectedGodId) ||
      !Array.isArray(receipt.grantedGodIds) ||
      receipt.grantedGodIds.some((id) => typeof id !== 'string' || !GOD_IDS.has(id)) ||
      !receipt.affinityDelta || typeof receipt.affinityDelta !== 'object') return undefined
  const affinityDelta: Record<string, number> = {}
  for (const [id, amount] of Object.entries(receipt.affinityDelta)) {
    if (GOD_IDS.has(id) && Number.isFinite(amount) && amount > 0) affinityDelta[id] = safeInt(amount)
  }
  return {
    requestId: receipt.requestId.trim().slice(0, 80),
    drawNumber: safeInt(receipt.drawNumber),
    selectedGodId: receipt.selectedGodId,
    grantedGodIds: [...new Set(receipt.grantedGodIds)],
    affinityDelta,
    rescue: cleanRescue(receipt.rescue),
  }
}

export function migrateStarLottery(data: GameData): StarLotteryState {
  const source = data.starLottery
  const legacyCards = source
    ? source.cards
    : [...(data.codex?.gods ?? []), ...Object.keys(data.godAffinity ?? {}).filter((id) => (data.godAffinity?.[id] ?? 0) > 0)]
  const cards = [...new Set((Array.isArray(legacyCards) ? legacyCards : []).filter((id) => GOD_IDS.has(id)))]
  const history = (Array.isArray(source?.history) ? source.history : [])
    .filter((entry) => entry && typeof entry.requestId === 'string' && Number.isFinite(entry.drawNumber))
    .slice(0, STAR_LOTTERY_HISTORY_MAX)
    .map((entry) => ({
      ...entry,
      drawNumber: safeInt(entry.drawNumber),
      godIds: (Array.isArray(entry.godIds) ? entry.godIds : []).filter((id) => GOD_IDS.has(id)),
      newGodIds: (Array.isArray(entry.newGodIds) ? entry.newGodIds : []).filter((id) => GOD_IDS.has(id)),
      duplicateGodIds: (Array.isArray(entry.duplicateGodIds) ? entry.duplicateGodIds : []).filter((id) => GOD_IDS.has(id)),
      affinityGained: safeInt(entry.affinityGained),
      atSeason: safeInt(entry.atSeason),
      selectedGodId: typeof entry.selectedGodId === 'string' && GOD_IDS.has(entry.selectedGodId) ? entry.selectedGodId : undefined,
      rescue: cleanRescue(entry.rescue),
    }))
  const drawsUsed = safeInt(source?.drawsUsed)
  return {
    cards,
    drawsUsed,
    history,
    lastRequestId: typeof source?.lastRequestId === 'string' ? source.lastRequestId : undefined,
    pendingV2: cleanPending(source?.pendingV2, drawsUsed, cards),
    lastReceipt: cleanReceipt(source?.lastReceipt),
  }
}

export function isStarLotteryUnlocked(data: GameData): boolean {
  return !!migrateJourneyMetrics(data, data.journeyMetrics?.startedAtMs ?? 0).milestones.first_return
}

/** 初帰還で1回、以後は累計武功50ごとに1回。武功自体は消費しない。 */
export function earnedStarLotteryDraws(data: GameData): number {
  if (!isStarLotteryUnlocked(data)) return 0
  return 1 + Math.floor(Math.max(0, data.fame) / 50)
}

export function remainingStarLotteryDraws(data: GameData): number {
  return Math.max(0, earnedStarLotteryDraws(data) - migrateStarLottery(data).drawsUsed)
}

export function nextStarLotteryOdds(drawNumber: number): Readonly<Record<GodRank, number>> {
  const floor: GodRank = drawNumber % 50 === 0 ? 4 : drawNumber % 20 === 0 ? 3 : 1
  const total = ([1, 2, 3, 4] as GodRank[])
    .filter((rank) => rank >= floor)
    .reduce((sum, rank) => sum + STAR_LOTTERY_RATES[rank], 0)
  return {
    1: floor <= 1 ? STAR_LOTTERY_RATES[1] * 100 / total : 0,
    2: floor <= 2 ? STAR_LOTTERY_RATES[2] * 100 / total : 0,
    3: floor <= 3 ? STAR_LOTTERY_RATES[3] * 100 / total : 0,
    4: STAR_LOTTERY_RATES[4] * 100 / total,
  }
}

function weightedRank(rng: Rng, floor: GodRank = 1): GodRank {
  const ranks = ([1, 2, 3, 4] as GodRank[]).filter((rank) => rank >= floor)
  const total = ranks.reduce((sum, rank) => sum + STAR_LOTTERY_RATES[rank], 0)
  let cursor = rng.next() * total
  for (const rank of ranks) {
    cursor -= STAR_LOTTERY_RATES[rank]
    if (cursor < 0) return rank
  }
  return ranks[ranks.length - 1]
}

function pickGod(rng: Rng, candidates: readonly God[]): God {
  return candidates[Math.min(candidates.length - 1, Math.floor(rng.next() * candidates.length))]
}

function pickThree(rng: Rng, candidates: readonly God[], forcedId?: string): [God, God, God] {
  const chosen: God[] = []
  if (forcedId) {
    const forced = candidates.find((god) => god.id === forcedId)
    if (forced) chosen.push(forced)
  }
  const remainder = rng.shuffle(candidates.filter((god) => !chosen.some((entry) => entry.id === god.id)))
  chosen.push(...remainder.slice(0, 3 - chosen.length))
  return chosen as [God, God, God]
}

export interface StarLotteryOpenOutcome {
  data: GameData
  pending: StarLotteryPendingV2 | null
  reason?: 'locked' | 'no_draws' | 'invalid_request' | 'pending_exists' | 'stale_request'
}

export function openStarLottery(
  data: GameData,
  requestId: string,
  expectedDrawNumber: number,
  rng: Rng,
): StarLotteryOpenOutcome {
  const cleanRequestId = requestId.trim().slice(0, 80)
  if (!cleanRequestId) return { data, pending: null, reason: 'invalid_request' }
  const state = migrateStarLottery(data)
  if (state.pendingV2) {
    if (state.pendingV2.requestId === cleanRequestId && state.pendingV2.drawNumber === expectedDrawNumber) {
      return { data: { ...data, starLottery: state }, pending: state.pendingV2 }
    }
    return { data, pending: null, reason: 'pending_exists' }
  }
  if (!isStarLotteryUnlocked(data)) return { data, pending: null, reason: 'locked' }
  if (expectedDrawNumber !== state.drawsUsed + 1) return { data, pending: null, reason: 'stale_request' }
  if (remainingStarLotteryDraws({ ...data, starLottery: state }) <= 0) return { data, pending: null, reason: 'no_draws' }

  const localRng = new Rng(rng.state())
  const rankFloor: GodRank = expectedDrawNumber % 50 === 0 ? 4 : expectedDrawNumber % 20 === 0 ? 3 : 1
  const rank = weightedRank(localRng, rankFloor)
  const pool = GODS.filter((god) => god.rank === rank)
  const owned = new Set(state.cards)
  const unseenInRank = pool.filter((god) => !owned.has(god.id))
  const unseenAny = GODS.filter((god) => !owned.has(god.id))
  const guaranteeActive = expectedDrawNumber % 10 === 0 && unseenAny.length > 0
  const guaranteed = guaranteeActive
    ? pickGod(localRng, unseenInRank.length > 0 ? unseenInRank : unseenAny)
    : undefined
  const candidates = pickThree(localRng, pool, guaranteed?.rank === rank ? guaranteed.id : undefined)
  const allAffinityMax = candidates.every((god) => owned.has(god.id) && (data.godAffinity?.[god.id] ?? 0) >= 5)
  const starReturn = !guaranteeActive && allAffinityMax && unseenAny.length > 0
    ? pickGod(localRng, unseenAny)
    : undefined
  const rescue = guaranteed
    ? { kind: 'guaranteed-new' as const, godId: guaranteed.id }
    : starReturn
      ? { kind: 'star-return' as const, godId: starReturn.id }
      : undefined
  const candidateRewards = candidates.map((god): StarLotteryCandidateRewardV2 => {
    const ownedAtOpen = owned.has(god.id)
    return {
      godId: god.id,
      ownedAtOpen,
      affinityAtOpen: safeInt(data.godAffinity?.[god.id]),
      mainReward: ownedAtOpen ? 'affinity-plus-one' : 'new-card',
    }
  }) as StarLotteryPendingV2['candidateRewards']
  const pending: StarLotteryPendingV2 = {
    version: 2,
    requestId: cleanRequestId,
    drawNumber: expectedDrawNumber,
    rank,
    candidateGodIds: candidates.map((god) => god.id) as [string, string, string],
    candidateRewards,
    rescue,
    openedAtSeason: data.seasonIndex,
  }
  const nextState: StarLotteryState = {
    ...state,
    drawsUsed: expectedDrawNumber,
    pendingV2: pending,
    lastRequestId: cleanRequestId,
  }
  return {
    data: { ...data, starLottery: nextState, seed: localRng.state() },
    pending,
  }
}

export interface StarLotteryClaimOutcome {
  data: GameData
  receipt: StarLotteryReceiptV2 | null
  result: StarLotteryHistoryEntry | null
  reason?: 'invalid_request' | 'pending_missing' | 'already_settled' | 'invalid_candidate'
}

export function claimStarLottery(
  data: GameData,
  requestId: string,
  drawNumber: number,
  godId: string,
): StarLotteryClaimOutcome {
  const cleanRequestId = requestId.trim().slice(0, 80)
  const state = migrateStarLottery(data)
  if (!cleanRequestId || !GOD_IDS.has(godId)) return { data, receipt: null, result: null, reason: 'invalid_request' }
  if (!state.pendingV2) {
    if (state.lastReceipt?.requestId === cleanRequestId && state.lastReceipt.drawNumber === drawNumber) {
      const previous = state.history.find((entry) => entry.requestId === cleanRequestId) ?? null
      return { data: { ...data, starLottery: state }, receipt: state.lastReceipt, result: previous }
    }
    return {
      data,
      receipt: null,
      result: null,
      reason: drawNumber <= state.drawsUsed ? 'already_settled' : 'pending_missing',
    }
  }
  const pending = state.pendingV2
  if (pending.requestId !== cleanRequestId || pending.drawNumber !== drawNumber) {
    return { data, receipt: null, result: null, reason: 'invalid_request' }
  }
  const reward = pending.candidateRewards.find((candidate) => candidate.godId === godId)
  if (!reward) return { data, receipt: null, result: null, reason: 'invalid_candidate' }

  const affinityDelta: Record<string, number> = {}
  const newGodIds: string[] = []
  const duplicateGodIds: string[] = []
  if (reward.mainReward === 'new-card') newGodIds.push(godId)
  else {
    duplicateGodIds.push(godId)
    affinityDelta[godId] = STAR_LOTTERY_AFFINITY_RESCUE
  }
  const rescueId = pending.rescue?.godId
  if (rescueId && rescueId !== godId) newGodIds.push(rescueId)
  const grantedGodIds = [...new Set([godId, ...(rescueId && rescueId !== godId ? [rescueId] : [])])]
  const godAffinity = { ...(data.godAffinity ?? {}) }
  for (const [id, amount] of Object.entries(affinityDelta)) godAffinity[id] = (godAffinity[id] ?? 0) + amount
  const receipt: StarLotteryReceiptV2 = {
    requestId: cleanRequestId,
    drawNumber,
    selectedGodId: godId,
    grantedGodIds,
    affinityDelta,
    rescue: pending.rescue,
  }
  const result: StarLotteryHistoryEntry = {
    requestId: cleanRequestId,
    drawNumber,
    godIds: grantedGodIds,
    newGodIds: [...new Set(newGodIds)],
    duplicateGodIds,
    affinityGained: Object.values(affinityDelta).reduce((sum, amount) => sum + amount, 0),
    rankFloor: drawNumber % 50 === 0 ? 4 : drawNumber % 20 === 0 ? 3 : undefined,
    atSeason: data.seasonIndex,
    selectedGodId: godId,
    rescue: pending.rescue,
  }
  const nextState: StarLotteryState = {
    ...state,
    cards: [...new Set([...state.cards, ...newGodIds])],
    history: [result, ...state.history].slice(0, STAR_LOTTERY_HISTORY_MAX),
    lastRequestId: cleanRequestId,
    pendingV2: undefined,
    lastReceipt: receipt,
  }
  return {
    data: { ...data, godAffinity, starLottery: nextState },
    receipt,
    result,
  }
}

export interface StarLotteryDrawOutcome {
  data: GameData
  result: StarLotteryHistoryEntry | null
  reason?: 'locked' | 'no_draws' | 'invalid_request'
}

/** V1互換API。runtime UIはsave-firstのopen/claimを使う。 */
export function drawStarLottery(data: GameData, requestId: string, rng: Rng): StarLotteryDrawOutcome {
  const state = migrateStarLottery(data)
  const previous = state.history.find((entry) => entry.requestId === requestId.trim().slice(0, 80))
  if (previous) return { data: { ...data, starLottery: state }, result: previous }
  const expectedDrawNumber = state.drawsUsed + 1
  const opened = openStarLottery(data, requestId, expectedDrawNumber, rng)
  if (!opened.pending) {
    const reason = opened.reason === 'locked' || opened.reason === 'no_draws' || opened.reason === 'invalid_request'
      ? opened.reason
      : 'invalid_request'
    return { data, result: null, reason }
  }
  const claimed = claimStarLottery(opened.data, requestId, expectedDrawNumber, opened.pending.candidateGodIds[0])
  return { data: claimed.data, result: claimed.result }
}
