import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { GameData } from '../src/core/types'
import { GODS } from '../src/core/data/gods'
import { importSaveString, inspectSaveSlot, isValidSave, loadGame, saveGame } from '../src/core/save'
import { getAutoBattleDefault, getReduceMotion, resetSettings } from '../src/core/settings'
import { RootErrorBoundary } from '../src/ui/RootRecovery'
import { buildDiagnosticId } from '../src/ui/root_diagnostic'
import { TitleScreen } from '../src/ui/Title'

const KEY = 'hitsugi_save_v4'
const KEY_BAK = 'hitsugi_save_v4_bak'

class FaultStorage implements Storage {
  data = new Map<string, string>()
  mode: 'normal' | 'quota' | 'error' | 'denied' | 'mutate-once' = 'normal'
  get length() { return this.data.size }
  clear() { this.data.clear() }
  getItem(key: string) {
    if (this.mode === 'denied') throw new DOMException('denied', 'SecurityError')
    return this.data.get(key) ?? null
  }
  key(index: number) { return [...this.data.keys()][index] ?? null }
  removeItem(key: string) {
    if (this.mode === 'denied') throw new DOMException('denied', 'SecurityError')
    this.data.delete(key)
  }
  setItem(key: string, value: string) {
    if (this.mode === 'quota') throw new DOMException('full', 'QuotaExceededError')
    if (this.mode === 'error' || this.mode === 'denied') throw new DOMException('denied', 'SecurityError')
    if (this.mode === 'mutate-once' && key === KEY) {
      this.mode = 'normal'
      const changed = JSON.parse(value) as Record<string, unknown>
      changed.seasonIndex = 999
      this.data.set(key, JSON.stringify(changed))
      return
    }
    this.data.set(key, value)
  }
}

function data(seasonIndex: number): GameData {
  return {
    seasonIndex,
    hoto: 10,
    ketsu: 0,
    fame: 0,
    family: [{ id: 'head', name: '灯', alive: true, gen: 1, isHead: true, hp: 10, maxHp: 10, equipment: {} }],
    pendingBirths: [],
    chronicle: [],
    inventory: [],
    regionsCleared: [],
    flags: {},
    godAffinity: {},
  } as unknown as GameData
}

const storage = new FaultStorage()

beforeEach(() => {
  storage.clear()
  storage.mode = 'normal'
  vi.stubGlobal('localStorage', storage)
})

describe('M60 save result and transaction verification', () => {
  it('validates resumable star-lottery candidates, rewards, rescue, and receipt', () => {
    const pending = {
      version: 2 as const, requestId: 'draw-10', drawNumber: 10, rank: 1 as const,
      candidateGodIds: ['ishiusu', 'tsubame', 'shimihime'],
      candidateRewards: [
        { godId: 'ishiusu', ownedAtOpen: false, affinityAtOpen: 0, mainReward: 'new-card' },
        { godId: 'tsubame', ownedAtOpen: true, affinityAtOpen: 2, mainReward: 'affinity-plus-one' },
        { godId: 'shimihime', ownedAtOpen: false, affinityAtOpen: 0, mainReward: 'new-card' },
      ],
      rescue: { kind: 'guaranteed-new', godId: 'ishiusu' }, openedAtSeason: 1,
    }
    const receipt = {
      requestId: 'draw-0', drawNumber: 1, selectedGodId: 'ishiusu',
      grantedGodIds: ['ishiusu'], affinityDelta: {},
    }
    const valid = { ...data(1), starLottery: { cards: ['tsubame'], drawsUsed: 10, history: [], pendingV2: pending, lastReceipt: receipt } }
    expect(isValidSave(valid)).toBe(true)
    expect(isValidSave({ ...valid, starLottery: { ...valid.starLottery, cards: ['tsubame', 'tsubame'] } })).toBe(false)
    expect(isValidSave({ ...valid, starLottery: { ...valid.starLottery, cards: ['unknown'] } })).toBe(false)
    expect(isValidSave({ ...valid, starLottery: { ...valid.starLottery, pendingV2: { ...pending, candidateGodIds: ['ishiusu', 'ishiusu', 'shimihime'] } } })).toBe(false)
    expect(isValidSave({ ...valid, starLottery: { ...valid.starLottery, pendingV2: { ...pending, candidateRewards: [{ ...pending.candidateRewards[0], godId: 'tsubame' }, ...pending.candidateRewards.slice(1)] } } })).toBe(false)
    expect(isValidSave({ ...valid, starLottery: { ...valid.starLottery, pendingV2: { ...pending, rescue: { kind: 'star-return', godId: 'unknown' } } } })).toBe(false)
    expect(isValidSave({ ...valid, starLottery: { ...valid.starLottery, pendingV2: { ...pending, rescue: undefined } } })).toBe(false)
    expect(isValidSave({ ...valid, starLottery: { ...valid.starLottery, pendingV2: { ...pending, rescue: { kind: 'guaranteed-new', godId: 'tsubame' } } } })).toBe(false)
    expect(isValidSave({
      ...valid,
      starLottery: {
        ...valid.starLottery,
        drawsUsed: 11,
        pendingV2: { ...pending, drawNumber: 11, rescue: { kind: 'guaranteed-new', godId: 'ishiusu' } },
      },
    })).toBe(false)
    expect(isValidSave({ ...valid, starLottery: { ...valid.starLottery, lastReceipt: { ...receipt, grantedGodIds: ['tsubame'] } } })).toBe(false)

    const ownedCandidates = ['ishiusu', 'tsubame', 'shimihime']
    const starReturnId = GODS.find((god) => !ownedCandidates.includes(god.id))!.id
    const starReturnPending = {
      ...pending,
      requestId: 'draw-11',
      drawNumber: 11,
      candidateRewards: pending.candidateRewards.map((reward) => ({
        ...reward, ownedAtOpen: true, affinityAtOpen: 5, mainReward: 'affinity-plus-one' as const,
      })),
      rescue: { kind: 'star-return' as const, godId: starReturnId },
    }
    const starReturnSave = {
      ...data(1),
      starLottery: { cards: ownedCandidates, drawsUsed: 11, history: [], pendingV2: starReturnPending },
    }
    expect(isValidSave(starReturnSave)).toBe(true)
    expect(isValidSave({
      ...starReturnSave,
      starLottery: {
        ...starReturnSave.starLottery,
        pendingV2: {
          ...starReturnPending,
          candidateRewards: starReturnPending.candidateRewards.map((reward, index) => (
            index === 0 ? { ...reward, affinityAtOpen: 4 } : reward
          )),
        },
      },
    })).toBe(false)
  })

  it('returns the persisted sequence and fingerprint only after reread verification', () => {
    const result = saveGame(data(4))
    expect(result).toMatchObject({ ok: true, saveSeq: 1, chronicleLimit: 1200 })
    if (!result.ok) throw new Error('save failed')
    expect(JSON.parse(storage.getItem(KEY)!).saveFingerprint).toBe(result.fingerprint)
    expect(loadGame()?.seasonIndex).toBe(4)
  })

  it.each(['quota', 'error'] as const)('%s failure keeps the old main and BAK byte-for-byte', (mode) => {
    expect(saveGame(data(1)).ok).toBe(true)
    expect(saveGame(data(2)).ok).toBe(true)
    const oldMain = storage.getItem(KEY)
    const oldBak = storage.getItem(KEY_BAK)
    storage.mode = mode

    const result = saveGame(data(3))

    expect(result).toMatchObject({ ok: false, previousSavePreserved: true })
    expect(storage.getItem(KEY)).toBe(oldMain)
    expect(storage.getItem(KEY_BAK)).toBe(oldBak)
  })

  it('rejects a post-write alteration, restores the old slots, and reports import failure', () => {
    expect(saveGame(data(7)).ok).toBe(true)
    expect(saveGame(data(8)).ok).toBe(true)
    const oldMain = storage.getItem(KEY)
    const oldBak = storage.getItem(KEY_BAK)
    storage.mode = 'mutate-once'

    expect(importSaveString(JSON.stringify(data(9)))).toBe(false)
    expect(storage.getItem(KEY)).toBe(oldMain)
    expect(storage.getItem(KEY_BAK)).toBe(oldBak)
    expect(loadGame()?.seasonIndex).toBe(8)
  })

  it('a successful import survives a fresh load with the complete normalized payload', () => {
    const imported = data(12)
    imported.hoto = 77
    expect(importSaveString(JSON.stringify(imported))).toBe(true)
    expect(loadGame()).toMatchObject({ seasonIndex: 12, hoto: 77, family: [{ id: 'head' }] })
  })
})

describe('M60 denied-storage fallbacks', () => {
  beforeEach(() => { storage.mode = 'denied' })

  it('reports unavailable and renders the title without throwing', () => {
    expect(inspectSaveSlot()).toBe('unavailable')
    expect(() => renderToStaticMarkup(createElement(TitleScreen))).not.toThrow()
    // SSRではuseEffectを実行しないため初期状態だけを検査する。実ブラウザでの
    // `保存できない`への遷移はrelease smokeがstorage拒否を注入して固定する。
    expect(renderToStaticMarkup(createElement(TitleScreen))).toContain('確認中')
  })

  it('uses safe setting defaults and reset does not throw', () => {
    expect(getReduceMotion()).toBe(false)
    expect(getAutoBattleDefault()).toBe(false)
    expect(() => resetSettings()).not.toThrow()
    expect(resetSettings()).toBe(false)
  })

  it('the root recovery surface keeps reload, export, settings, and diagnostic actions available', () => {
    const error = new Error('forced render failure')
    const boundary = new RootErrorBoundary({ children: createElement('div') })
    boundary.state = RootErrorBoundary.getDerivedStateFromError(error)
    const markup = renderToStaticMarkup(boundary.render())
    expect(markup).toContain('再読込する')
    expect(markup).toContain('検証済みセーブを書き出す')
    expect(markup).toContain('設定だけ初期化する')
    expect(markup).toContain('診断IDをコピー')
    expect(markup).toContain(buildDiagnosticId(error))
  })
})
