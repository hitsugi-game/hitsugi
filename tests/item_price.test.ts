import { describe, expect, it } from 'vitest'
import { ITEM_BASES } from '../src/core/data/items'
import type { ItemBase } from '../src/core/types'

// M33 ⑯: 装備の価格カーブが性能に対して急峻すぎないことを固定する。旧は全系列一律 1.52^i で、
// tier14 の「性能あたり価格」が tier0 の27〜39倍という急勾配だった。growth連動へ是正した後の
// 上限を、現formulaからの逆算でなく独立の設計上限(12倍)としてpinする(devil指摘)。
const perfOf = (b: ItemBase): number =>
  b.atk ?? b.def ?? (b.statBonus ? Object.values(b.statBonus).reduce((s, v) => s + (v ?? 0), 0) : 0)

describe('装備価格カーブ — 性能あたり価格の急峻さを抑える(M33 ⑯)', () => {
  it('全系列で tier14 の性能あたり価格が tier0 の12倍以内', () => {
    // baseId = `${prefix}${tier}` を prefix でまとめる(末尾の数字がtier)。
    const bySeries = new Map<string, ItemBase[]>()
    for (const b of ITEM_BASES) {
      const m = b.baseId.match(/^(.*?)(\d+)$/)
      if (!m) continue
      const arr = bySeries.get(m[1]) ?? []
      arr.push(b)
      bySeries.set(m[1], arr)
    }
    let checked = 0
    for (const [prefix, items] of bySeries) {
      const sorted = [...items].sort((a, b) => a.shopTier - b.shopTier)
      const lo = sorted[0]
      const hi = sorted[sorted.length - 1]
      if (hi.shopTier - lo.shopTier < 10) continue // 短い系列(FOUNDING等)は対象外
      const loRatio = lo.price / Math.max(1, perfOf(lo))
      const hiRatio = hi.price / Math.max(1, perfOf(hi))
      expect(hiRatio / loRatio, `${prefix}: tier${hi.shopTier}の性能あたり価格が急峻(${(hiRatio / loRatio).toFixed(1)}x)`).toBeLessThanOrEqual(12)
      checked++
    }
    expect(checked, '15段の系列が検査対象になっている').toBeGreaterThan(5)
  })
})
