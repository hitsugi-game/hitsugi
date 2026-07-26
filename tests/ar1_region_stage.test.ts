import { beforeEach, describe, expect, it, vi } from 'vitest'
import { captureRegionVisualVersion, isRegionVisualV2Enabled } from '../src/core/feature_flags'
import {
  HOTARUBI_FLOOR_0_AR1,
  captureRegionStageSession,
  resolveRegionStageContract,
} from '../src/core/data/region_stage_contracts'
import type { GameData } from '../src/core/types'
import { useGame } from '../src/core/store'

class MemStorage {
  store = new Map<string, string>()
  getItem(key: string) { return this.store.get(key) ?? null }
  setItem(key: string, value: string) { this.store.set(key, value) }
  removeItem(key: string) { this.store.delete(key) }
  clear() { this.store.clear() }
}

const mem = new MemStorage()
// @ts-expect-error Vitest node environment receives the minimal browser persistence surface.
globalThis.localStorage = mem

function game(): GameData {
  return {
    seasonIndex: 0,
    family: [{
      id: 'c1', name: '灯', alive: true, gen: 1, isHead: true, hp: 10, maxHp: 10,
      mp: 5, maxMp: 5, equipment: {}, deeds: [], expeditions: 0,
    }],
    hoto: 100,
    ketsu: 0,
    inventory: [],
    godAffinity: {},
    fame: 10,
    regionsCleared: [],
    chronicle: [],
    pendingBirths: [],
    flags: {},
    narrativeMode: false,
    seed: 1,
  } as unknown as GameData
}

beforeEach(() => {
  mem.clear()
  vi.unstubAllEnvs()
  useGame.setState({
    data: game(),
    screen: { id: 'home' },
    dungeonRun: null,
    boonDraft: null,
  })
})

describe('regionVisualV2 feature flag', () => {
  it('defaults ON after M36 and still accepts explicit environment control', () => {
    expect(isRegionVisualV2Enabled({ envValue: undefined, dev: false, search: '' })).toBe(true)
    expect(isRegionVisualV2Enabled({ envValue: '', dev: false, search: '' })).toBe(true)
    expect(captureRegionVisualVersion({ envValue: 'true', dev: false })).toBe('v2')
    expect(captureRegionVisualVersion({ envValue: 'garbage', dev: false })).toBe('v2')
    expect(captureRegionVisualVersion({ envValue: 'false', dev: false })).toBe('v1')
  })

  it('allows query override only in DEV, including a reproducible forced OFF path', () => {
    expect(isRegionVisualV2Enabled({ envValue: '0', dev: true, search: '?regionVisualV2=1' })).toBe(true)
    expect(isRegionVisualV2Enabled({ envValue: '1', dev: true, search: '?regionVisualV2=0' })).toBe(false)
    expect(isRegionVisualV2Enabled({ envValue: '0', dev: false, search: '?regionVisualV2=1' })).toBe(false)
  })
})

describe('AR1 region stage resolver', () => {
  it('resolves only Hotarubi floor 0 with a captured v2 version', () => {
    expect(resolveRegionStageContract({
      regionId: 'hotarubi_no_kubochi', floor: 0, visualVersion: 'v2',
    })?.id).toBe(HOTARUBI_FLOOR_0_AR1.id)
    expect(resolveRegionStageContract({
      regionId: 'hotarubi_no_kubochi', floor: 0, visualVersion: 'v1',
    })).toBeNull()
    expect(resolveRegionStageContract({
      regionId: 'hotarubi_no_kubochi', floor: 1, visualVersion: 'v2',
    })).toBeNull()
    expect(resolveRegionStageContract({ regionId: 'yoi_forest', floor: 0, visualVersion: 'v2' })).toBeNull()
  })

  it('declares the fixed material, landmark, foreground, motion, navigation, and danger grammar', () => {
    const contract = HOTARUBI_FLOOR_0_AR1
    expect(contract.groundMaterials).toEqual(['wet-soil', 'shallow-black-water'])
    expect(contract.landmark.id).toBe('drowned-shrine')
    expect(contract.landmark.assetPath).toMatch(/drowned-shrine-firefly-reed.+\.webp$/)
    expect(contract.foreground.id).toBe('firefly-reeds')
    expect(contract.foreground.assetPath).toMatch(/foreground-root-reed.+\.webp$/)
    expect(contract.ambientMotion.id).toBe('reverse-embers-and-water-rings')
    expect(contract.ambientMotion.emberPool + contract.ambientMotion.ringPool + contract.ambientMotion.mistPool).toBeLessThanOrEqual(16)
    expect(contract.navigationCue.id).toBe('flattened-grass-and-reflected-lamps')
    expect(contract.dangerCue).toMatchObject({ id: 'reverse-ember-flow', leadSeconds: [3, 8] })
  })

  it('rejects an unexpected captured contract id instead of silently switching contracts', () => {
    expect(resolveRegionStageContract({
      regionId: 'hotarubi_no_kubochi',
      floor: 0,
      visualVersion: 'v2',
      stageContractId: 'ar1:other',
    })).toBeNull()
  })
})

describe('AR1 expedition checkpoint capture', () => {
  it('persists the captured version/contract so a resumed run never switches presentation', () => {
    vi.stubEnv('VITE_REGION_VISUAL_V2', '1')
    useGame.getState().departDungeon('hotarubi_no_kubochi', ['c1'])

    const state = useGame.getState()
    expect(state.dungeonRun).toMatchObject({
      visualVersion: 'v2',
      stageContractId: HOTARUBI_FLOOR_0_AR1.id,
      regionId: 'hotarubi_no_kubochi',
      floor: 0,
    })
    expect(state.data?.dungeonRun).toMatchObject({
      visualVersion: 'v2',
      stageContractId: HOTARUBI_FLOOR_0_AR1.id,
      regionId: 'hotarubi_no_kubochi',
      floor: 0,
    })
  })

  it('captures the default M36 V2 presentation for non-AR1 regions without forcing a special image contract', () => {
    useGame.getState().departDungeon('yoi_forest', ['c1'])
    expect(useGame.getState().dungeonRun).toMatchObject({
      visualVersion: 'v2',
      regionId: 'yoi_forest',
      floor: 0,
    })
    expect(useGame.getState().dungeonRun?.stageContractId).toBeUndefined()
  })

  it('captures V1 for a new run when the flag is OFF', () => {
    vi.stubEnv('VITE_REGION_VISUAL_V2', '0')
    useGame.getState().departDungeon('hotarubi_no_kubochi', ['c1'])
    expect(useGame.getState().dungeonRun).toMatchObject(captureRegionStageSession('hotarubi_no_kubochi', 'v1'))
    expect(useGame.getState().dungeonRun?.stageContractId).toBeUndefined()
  })
})
