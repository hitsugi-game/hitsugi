// M19 C2: セーブ硬化(C3)の回帰テスト — bound/検証/BAK復旧/saveSeq/quota梯子/インポート/移行
import { beforeEach, describe, expect, it } from 'vitest'
import type { ChronicleEntry, GameData } from '../src/core/types'
import { boundChronicle, isValidSave, saveGame, loadGame, importSaveString, clearSave } from '../src/core/save'
import { migrateM34Narrative, recoverNarrativeOnLoad } from '../src/core/narrative'

// ---- localStorage スタブ(容量制限をシミュレートできる) ----
class MemStorage {
  store = new Map<string, string>()
  limit: number | null = null // setItemあたりの最大文字数(quota模擬)
  getItem(k: string) { return this.store.get(k) ?? null }
  setItem(k: string, v: string) {
    if (this.limit !== null && v.length > this.limit) {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    }
    this.store.set(k, v)
  }
  removeItem(k: string) { this.store.delete(k) }
  clear() { this.store.clear() }
}
const mem = new MemStorage()
// @ts-expect-error node環境へlocalStorageを注入
globalThis.localStorage = mem

const KEY = 'hitsugi_save_v4'
const KEY_BAK = 'hitsugi_save_v4_bak'

// 最小の有効GameData(テスト対象関数が触るフィールドのみ実体・他はcastで補う)
function makeData(over: Partial<GameData> = {}): GameData {
  return {
    seasonIndex: 0,
    hoto: 100,
    ketsu: 0,
    fame: 0,
    family: [{ id: 'c1', name: '燈吾', alive: true, gen: 1, isHead: true, hp: 10, maxHp: 10, equipment: {} }],
    pendingBirths: [],
    chronicle: [],
    inventory: [],
    regionsCleared: [],
    flags: {},
    godAffinity: {},
    ...over,
  } as unknown as GameData
}

const ev = (i: number): ChronicleEntry => ({ season: i, kind: 'event', text: `出来事${i}` }) as ChronicleEntry
const birth = (i: number): ChronicleEntry => ({ season: i, kind: 'birth', text: `誕生${i}` }) as ChronicleEntry

beforeEach(() => {
  mem.clear()
  mem.limit = null
})

describe('boundChronicle', () => {
  it('上限以下はそのまま返す', () => {
    const es = [ev(1), birth(2), ev(3)]
    expect(boundChronicle(es, 10)).toBe(es)
  })
  it('event以外は無条件で全保持し、eventは新しい順に残す(元順序維持)', () => {
    const es: ChronicleEntry[] = []
    for (let i = 0; i < 50; i++) es.push(ev(i))
    es.push(birth(50))
    for (let i = 51; i < 60; i++) es.push(ev(i))
    const out = boundChronicle(es, 20)
    expect(out.length).toBe(20)
    expect(out.some((e) => e.kind === 'birth')).toBe(true) // birthは古くても残る
    // eventは新しい19件 — 最古のevent(0)は消える
    expect(out.find((e) => e.text === '出来事0')).toBeUndefined()
    expect(out.find((e) => e.text === '出来事59')).toBeDefined()
    // 元順序が保たれている(season昇順のまま)
    const seasons = out.map((e) => e.season)
    expect([...seasons].sort((a, b) => a - b)).toEqual(seasons)
  })
  it('非eventだけで上限超過でも非eventは落とさない(devil必須修正c)', () => {
    const es: ChronicleEntry[] = []
    for (let i = 0; i < 30; i++) es.push(birth(i))
    const out = boundChronicle(es, 10)
    expect(out.length).toBe(30) // 骨格は削らない(上限より骨格保持を優先)
  })
})

describe('isValidSave', () => {
  it('最小の有効セーブを受理する', () => {
    expect(isValidSave(makeData())).toBe(true)
  })
  it('意味的破損を弾く(devil必須修正a)', () => {
    expect(isValidSave(makeData({ family: [] as unknown as GameData['family'] }))).toBe(false) // 空族
    expect(isValidSave(makeData({ seasonIndex: -1 }))).toBe(false)
    expect(isValidSave(makeData({ seasonIndex: Number.NaN }))).toBe(false)
    expect(isValidSave(makeData({ hoto: Number.POSITIVE_INFINITY }))).toBe(false)
    expect(isValidSave({ ...makeData(), chronicle: 'broken' })).toBe(false)
    expect(isValidSave(null)).toBe(false)
  })
  it('M34 narrativeの壊れた入れ子をimport境界で弾く', () => {
    expect(isValidSave({ ...makeData(), narrative: { deferred: 42 } })).toBe(false)
    expect(isValidSave({ ...makeData(), narrative: { deferred: [{ kind: 'life', title: '欠損', lines: 42 }] } })).toBe(false)
    expect(isValidSave({ ...makeData(), narrative: { lastReturn: {} } })).toBe(false)
    expect(isValidSave({ ...makeData(), narrative: { resonance: { cut: Number.NaN, save: 0, inherit: 0 } } })).toBe(false)
  })
})

describe('saveGame / loadGame', () => {
  it('往復でsaveSeqが単調に増える+BAKに直前世代が残る', () => {
    saveGame(makeData({ seasonIndex: 1 }))
    saveGame(makeData({ seasonIndex: 2 }))
    const main = JSON.parse(mem.getItem(KEY)!)
    const bak = JSON.parse(mem.getItem(KEY_BAK)!)
    expect(main.saveSeq).toBe(2)
    expect(bak.saveSeq).toBe(1)
    expect(bak.seasonIndex).toBe(1)
    expect(loadGame()!.seasonIndex).toBe(2)
  })
  it('本体が破損したらBAKから復旧する', () => {
    saveGame(makeData({ seasonIndex: 5 }))
    saveGame(makeData({ seasonIndex: 6 }))
    mem.store.set(KEY, '{broken json')
    expect(loadGame()!.seasonIndex).toBe(5)
  })
  it('本体が意味的破損(空族)でもBAKから復旧する', () => {
    saveGame(makeData({ seasonIndex: 5 }))
    saveGame(makeData({ seasonIndex: 6 }))
    const corrupted = JSON.parse(mem.getItem(KEY)!)
    corrupted.family = []
    mem.store.set(KEY, JSON.stringify(corrupted))
    expect(loadGame()!.seasonIndex).toBe(5)
  })
  it('本体のnarrativeが破損しても正常なBAKから復旧する', () => {
    saveGame(makeData({ seasonIndex: 5 }))
    saveGame(makeData({ seasonIndex: 6 }))
    const corrupted = JSON.parse(mem.getItem(KEY)!)
    corrupted.narrative = { deferred: 42 }
    mem.store.set(KEY, JSON.stringify(corrupted))
    expect(loadGame()!.seasonIndex).toBe(5)
  })
  it('NG+の季リセット(seasonIndex退行)では誤復旧しない(saveSeq方式)', () => {
    saveGame(makeData({ seasonIndex: 300 })) // 旧周回の終盤
    saveGame(makeData({ seasonIndex: 0 }))   // 新周回の頭(正当な退行)
    expect(loadGame()!.seasonIndex).toBe(0)  // BAK(300)に負けない
  })
  it('quota時は梯子で年代記を畳んで保存する(セーブ全喪失にしない)', () => {
    const chron: ChronicleEntry[] = []
    for (let i = 0; i < 3000; i++) chron.push(ev(i))
    const d = makeData({ chronicle: chron })
    const fullLen = JSON.stringify({ ...d, chronicle: boundChronicle(chron, 1200) }).length
    mem.limit = Math.floor(fullLen * 0.6) // 1200では入らない容量
    saveGame(d)
    const saved = mem.getItem(KEY)
    expect(saved).not.toBeNull()
    const parsed = JSON.parse(saved!)
    expect(parsed.chronicle.length).toBeLessThanOrEqual(600)
  })
  it('clearSaveはBAKも消す', () => {
    saveGame(makeData())
    saveGame(makeData())
    clearSave()
    expect(mem.getItem(KEY)).toBeNull()
    expect(mem.getItem(KEY_BAK)).toBeNull()
  })
})

describe('importSaveString', () => {
  it('無効JSONと意味的破損を弾く', () => {
    expect(importSaveString('not json')).toBe(false)
    expect(importSaveString(JSON.stringify({ family: [], seasonIndex: 0 }))).toBe(false)
    expect(importSaveString(JSON.stringify({ ...makeData(), narrative: { deferred: 42 } }))).toBe(false)
    expect(importSaveString(JSON.stringify({ ...makeData(), narrative: { lastReturn: {} } }))).toBe(false)
  })
  it('有効ならsaveGame経路(bound+saveSeq)で書く(devil必須修正d)', () => {
    const chron: ChronicleEntry[] = []
    for (let i = 0; i < 2000; i++) chron.push(ev(i))
    expect(importSaveString(JSON.stringify(makeData({ chronicle: chron })))).toBe(true)
    const parsed = JSON.parse(mem.getItem(KEY)!)
    expect(parsed.chronicle.length).toBeLessThanOrEqual(1200) // 生setItemでなくboundを通過
    expect(parsed.saveSeq).toBe(1)
  })
})

describe('旧版移行', () => {
  it('v3セーブをv4へ移行して旧キーを消す', () => {
    const v3 = makeData({ seasonIndex: 12 })
    mem.store.set('hitsugi_save_v3', JSON.stringify(v3))
    const loaded = loadGame()!
    expect(loaded.seasonIndex).toBe(12)
    expect(mem.getItem('hitsugi_save_v3')).toBeNull()
    expect(mem.getItem(KEY)).not.toBeNull()
  })
})

describe('M34 物語schema移行', () => {
  const revealingCases: { name: string; data: Partial<GameData> }[] = [
    { name: 'ch4 only', data: { flags: { ch4: true } } },
    { name: 'gossipIndex 12', data: { gossipIndex: 12 } },
    { name: 'shioriPhase', data: { flags: { shioriPhase: true } } },
    { name: 'endingType 0', data: { flags: { endingType: 0 } } },
    { name: 'endingType 1', data: { flags: { endingType: 1 } } },
    { name: 'endingType 2', data: { flags: { endingType: 2 } } },
    { name: 'cleared', data: { flags: { cleared: true } } },
  ]

  for (const fixture of revealingCases) {
    it(`sentinel欠落legacyの${fixture.name}は実名既知として一度だけ補記待ちにする`, () => {
      const d = makeData(fixture.data)
      const migrated = migrateM34Narrative(d)
      expect(migrated.flags.m34_narrative_schema).toBe(1)
      expect(migrated.flags.reveal_shiori_name).toBe(true)
      expect(migrated.flags.legacy_shiori_recap_pending).toBe(true)
      expect(migrateM34Narrative(migrated)).toEqual(migrated)
    })
  }

  it('gossipIndex 11と全条件偽は匿名を維持する', () => {
    for (const d of [makeData(), makeData({ gossipIndex: 11 })]) {
      const migrated = migrateM34Narrative(d)
      expect(migrated.flags.reveal_shiori_name).toBe(false)
      expect(migrated.flags.legacy_shiori_recap_pending).toBe(false)
    }
  })

  it('post-M34のch4途中saveへlegacy ORを再適用せず灯の余白へ回収する', () => {
    const current = makeData({
      flags: {
        m34_narrative_schema: 1,
        ch4: true,
        ch4_completed: false,
        reveal_shiori_name: false,
      },
    })
    const loaded = recoverNarrativeOnLoad(current)
    expect(loaded.flags.reveal_shiori_name).toBe(false)
    expect(loaded.flags.legacy_shiori_recap_pending).not.toBe(true)
    expect(loaded.narrative?.deferred.some((scene) => scene.kind === 'life' && scene.narrativeId === 'ch4')).toBe(true)
  })

  it('表示中sceneは完了扱いにせず灯の余白へ戻す', () => {
    const active = { kind: 'dream' as const }
    const d = migrateM34Narrative(makeData({ flags: { m34_narrative_schema: 1 } }))
    const loaded = recoverNarrativeOnLoad({ ...d, narrative: { ...d.narrative!, active } })
    expect(loaded.flags.dreamSeen).not.toBe(true)
    expect(loaded.narrative?.active).toBeUndefined()
    expect(loaded.narrative?.deferred).toContainEqual(active)
  })

  it('v1/v3/v4の全legacy境界fixtureを同じ規則で移行する', () => {
    const versions = ['hitsugi_save_v1', 'hitsugi_save_v3', KEY]
    const fixtures: { name: string; patch: Partial<GameData>; reveal: boolean }[] = [
      { name: 'ch4 only', patch: { flags: { ch4: true } }, reveal: true },
      { name: 'gossipIndex 11', patch: { gossipIndex: 11 }, reveal: false },
      { name: 'gossipIndex 12', patch: { gossipIndex: 12 }, reveal: true },
      { name: 'shioriPhase', patch: { flags: { shioriPhase: true } }, reveal: true },
      { name: 'endingType 0', patch: { flags: { endingType: 0 } }, reveal: true },
      { name: 'endingType 1', patch: { flags: { endingType: 1 } }, reveal: true },
      { name: 'endingType 2', patch: { flags: { endingType: 2 } }, reveal: true },
      { name: 'cleared', patch: { flags: { cleared: true } }, reveal: true },
      { name: 'all false', patch: {}, reveal: false },
    ]
    for (const version of versions) {
      for (const fixture of fixtures) {
        mem.clear()
        mem.store.set(version, JSON.stringify(makeData(fixture.patch)))
        const loaded = loadGame()
        expect(loaded, `${version} / ${fixture.name}`).not.toBeNull()
        expect(loaded!.flags.reveal_shiori_name, `${version} / ${fixture.name}`).toBe(fixture.reveal)
        expect(loaded!.flags.legacy_shiori_recap_pending, `${version} / ${fixture.name}`).toBe(fixture.reveal)
        expect(loaded!.flags.m34_narrative_schema).toBe(1)
      }
    }
  })
})
