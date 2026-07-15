// M26 §12.1: 図鑑の個別既読へのセーブ移行。旧セーブ(件数マーク)→ ID集合を忠実変換する。
// 受入: 忠実性(件数分だけ既読・超過分は新着のまま)・冪等性・isValidSaveを壊さない。
import { describe, expect, it } from 'vitest'
import { migrateCodexSeen, isValidSave } from '../src/core/save'
import type { GameData } from '../src/core/types'

// 最小の有効セーブ(isValidSaveを通す下限)+ codex 件数マーク
function oldSave(seenEn: number, seenGd: number): GameData {
  return {
    family: [{ id: 'c1', alive: true } as never],
    seasonIndex: 12,
    hoto: 40,
    chronicle: [],
    godAffinity: {},
    flags: { codexSeenEn: seenEn, codexSeenGods: seenGd },
    codex: { enemies: ['a', 'b', 'c', 'd', 'e'], gods: ['g1', 'g2', 'g3'] },
  } as unknown as GameData
}

describe('M26 §12.1 migrateCodexSeen', () => {
  it('件数マークが示す既読分だけを ID集合へ忠実変換する(超過分は新着のまま)', () => {
    const migrated = migrateCodexSeen(oldSave(3, 1))
    expect(migrated.codexSeenIds).toEqual({ enemies: ['a', 'b', 'c'], gods: ['g1'] })
    // d,e と g2,g3 は既読集合に無い = 新着のまま残る
    expect(migrated.codexSeenIds!.enemies).not.toContain('d')
    expect(migrated.codexSeenIds!.gods).not.toContain('g2')
  })

  it('件数0なら既読集合は空(全項目が新着のまま)', () => {
    expect(migrateCodexSeen(oldSave(0, 0)).codexSeenIds).toEqual({ enemies: [], gods: [] })
  })

  it('冪等: codexSeenIds が既にあれば変更しない', () => {
    const already = { ...oldSave(3, 1), codexSeenIds: { enemies: ['x'], gods: [] } }
    expect(migrateCodexSeen(already).codexSeenIds).toEqual({ enemies: ['x'], gods: [] })
  })

  it('移行後もセーブは有効(isValidSaveを壊さない)+ 変異種は正規化される', () => {
    const withVariant = { ...oldSave(2, 0), codex: { enemies: ['boss_w', 'oni_o', 'c'], gods: [] } }
    const migrated = migrateCodexSeen(withVariant)
    expect(isValidSave(migrated)).toBe(true)
    // boss_w → boss / oni_o → oni の baseEnemyId 正規化
    expect(migrated.codexSeenIds!.enemies).toEqual(['boss', 'oni'])
  })

  it('旧フィールド(flags.codexSeen*)は保持され後方互換を壊さない', () => {
    const migrated = migrateCodexSeen(oldSave(3, 1))
    expect(migrated.flags.codexSeenEn).toBe(3)
    expect(migrated.flags.codexSeenGods).toBe(1)
  })
})
