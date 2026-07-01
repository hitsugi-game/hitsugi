import type { Item, ItemSlot, Stats } from '../types'
import { uid } from '../rng'

interface ItemBase {
  baseId: string
  name: string
  slot: ItemSlot
  atk?: number
  def?: number
  statBonus?: Partial<Stats>
  price: number
  shopTier: number // fame段階で店に並ぶ
}

export const ITEM_BASES: ItemBase[] = [
  // 武器
  { baseId: 'w_kodachi', name: '小太刀', slot: 'weapon', atk: 8, price: 40, shopTier: 0 },
  { baseId: 'w_katana', name: '打刀', slot: 'weapon', atk: 16, price: 130, shopTier: 0 },
  { baseId: 'w_hoshiyumi', name: '星弓', slot: 'weapon', atk: 25, price: 320, shopTier: 1 },
  { baseId: 'w_naginata', name: '薙刀', slot: 'weapon', atk: 36, price: 750, shopTier: 2 },
  { baseId: 'w_hoshikiri', name: '星斬', slot: 'weapon', atk: 50, price: 1600, shopTier: 3 },
  // 防具
  { baseId: 'a_nunoko', name: '布子', slot: 'armor', def: 6, price: 40, shopTier: 0 },
  { baseId: 'a_kawado', name: '革胴', slot: 'armor', def: 12, price: 130, shopTier: 0 },
  { baseId: 'a_kusari', name: '鎖帷子', slot: 'armor', def: 20, price: 320, shopTier: 1 },
  { baseId: 'a_ooyoroi', name: '大鎧', slot: 'armor', def: 30, price: 750, shopTier: 2 },
  { baseId: 'a_hoshigoromo', name: '星衣', slot: 'armor', def: 42, price: 1600, shopTier: 3 },
  // 飾り(形見になりやすい)
  { baseId: 'c_omamori', name: '灯守の御守', slot: 'charm', statBonus: { luk: 8 }, price: 100, shopTier: 0 },
  { baseId: 'c_kanzashi', name: '簪', slot: 'charm', statBonus: { mnd: 10 }, price: 160, shopTier: 1 },
  { baseId: 'c_obidome', name: '帯留', slot: 'charm', statBonus: { vit: 10 }, price: 160, shopTier: 1 },
  { baseId: 'c_suzu', name: '鈴', slot: 'charm', statBonus: { agi: 10 }, price: 160, shopTier: 1 },
  { baseId: 'c_hoshinoo', name: '星の緒', slot: 'charm', statBonus: { str: 8, dex: 8 }, price: 500, shopTier: 2 },
]

export function itemBaseById(baseId: string): ItemBase {
  const b = ITEM_BASES.find((x) => x.baseId === baseId)
  if (!b) throw new Error(`unknown item base: ${baseId}`)
  return b
}

export function makeItem(baseId: string): Item {
  const b = itemBaseById(baseId)
  return {
    id: uid('item'),
    baseId: b.baseId,
    name: b.name,
    slot: b.slot,
    atk: b.atk,
    def: b.def,
    statBonus: b.statBonus ? { ...b.statBonus } : undefined,
    generation: 0,
    price: b.price,
  }
}

// 形見継承 — 世代を経るほど強くなる(1世代ごと基礎値+12%)
export function inheritItem(item: Item, prevOwnerName: string): Item {
  const gen = item.generation + 1
  const base = itemBaseById(item.baseId)
  const mult = 1 + gen * 0.12
  const bonus: Partial<Stats> | undefined = base.statBonus
    ? Object.fromEntries(
        Object.entries(base.statBonus).map(([k, v]) => [k, Math.round((v as number) * mult)]),
      )
    : undefined
  return {
    ...item,
    id: uid('item'),
    generation: gen,
    legacyOf: prevOwnerName,
    name: `${base.name}・${'代'.repeat(Math.min(gen, 3))}${gen > 3 ? `(${gen})` : ''}`,
    atk: base.atk ? Math.round(base.atk * mult) : undefined,
    def: base.def ? Math.round(base.def * mult) : undefined,
    statBonus: bonus,
  }
}
