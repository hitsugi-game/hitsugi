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

// 初期15点 — baseIdはセーブ内の形見が参照するため改名禁止(GDD_v3 §5)
const FOUNDING_ITEMS: ItemBase[] = [
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

// ============================================================
// 系譜装備(GDD_v3 §1: 最終540点への骨格) — 銘は手書き、数値はtier式
// 各系譜15段。段iの数値は式から導出し、shopTier=段i(地域討伐数で順次解禁)。
// 武器4系譜+防具4系譜+飾り3系譜 = 165点(+初期15=180)
// ============================================================
interface ItemSeries {
  prefix: string // baseId接頭辞(sw_ 等 — 既存idと衝突しない)
  slot: ItemSlot
  kind: 'atk' | 'def' | 'bonus'
  bonusKeys?: (keyof Stats)[] // kind=bonus時に伸ばす血潮
  base: number // 段0の基準値
  growth: number // 段ごとの倍率
  basePrice: number
  names: string[] // 15段の銘(弱→強)
}

const SERIES: ItemSeries[] = [
  {
    prefix: 'sw_katana', slot: 'weapon', kind: 'atk', base: 9, growth: 1.2, basePrice: 45,
    names: ['数打ちの脇差', '古びた打刀', '研ぎ直しの太刀', '郷鍛冶の業物', '二代目の銘刀', '夜藪断ち', '灯映しの刃', '無銘の名刀', '常夜切り', '星鋼の太刀', '月匂の太刀', '銘・宵灯', '銘・明けの標', '銘・千年灯', '家宝・暁隠し'],
  },
  {
    prefix: 'sw_yumi', slot: 'weapon', kind: 'atk', base: 8, growth: 1.2, basePrice: 42,
    names: ['竹の丸木弓', '狩人の半弓', '塗りの重籐弓', '鷹落としの弓', '夜雀落とし', '射手の誉れ', '灯矢の大弓', '風切りの弓', '星降ろしの弓', '月輪の弓', '流星射抜き', '銘・遠灯', '銘・夜貫き', '銘・天の弓張', '家宝・朝告げの弓'],
  },
  {
    prefix: 'sw_yari', slot: 'weapon', kind: 'atk', base: 10, growth: 1.19, basePrice: 48,
    names: ['竹槍', '木戸番の手槍', '穂先直しの槍', '猪落としの槍', '夜道の十文字', '魔性威しの大身', '灯穂の槍', '常夜通し', '影縫いの槍', '星穂の槍', '月夜裂き', '銘・一番灯', '銘・宵払い', '銘・千夜通し', '家宝・大燈籠の柱'],
  },
  {
    prefix: 'sw_tsuchi', slot: 'weapon', kind: 'atk', base: 11, growth: 1.19, basePrice: 50,
    names: ['杵', '石割りの木槌', '鍛冶場の小槌', '岩砕きの鎚', '山彦返しの大槌', '魔性潰し', '灯座の重鎚', '常夜割り', '地鳴りの大槌', '星鉄の鎚', '月面砕き', '銘・鬼鎮め', '銘・山眠らせ', '銘・千貫灯', '家宝・打ち初めの鎚'],
  },
  {
    prefix: 'sa_doumaru', slot: 'armor', kind: 'def', base: 7, growth: 1.2, basePrice: 45,
    names: ['継ぎの胴着', '革の胴丸', '鋲打ちの胴丸', '郷仕立ての具足', '夜行の胴丸', '魔性避けの具足', '灯守の胴丸', '常夜の具足', '影通さずの鎧', '星糸縅の鎧', '月光の胴丸', '銘・宵固め', '銘・夜明かし', '銘・千夜の殻', '家宝・初代の具足'],
  },
  {
    prefix: 'sa_haori', slot: 'armor', kind: 'def', base: 6, growth: 1.2, basePrice: 40,
    names: ['野良着', '刺し子の半纏', '厚織りの羽織', '夜露弾きの羽織', '火の粉除けの羽織', '魔性目くらまし', '灯映しの羽織', '常夜歩きの外套', '影紛れの羽織', '星紋の陣羽織', '月渡りの羽織', '銘・宵羽', '銘・夜風通さず', '銘・千夜羽織', '家宝・汐里の残り布'],
  },
  {
    prefix: 'sa_kote', slot: 'armor', kind: 'def', base: 8, growth: 1.19, basePrice: 50,
    names: ['布の手甲', '革籠手', '鎖入りの籠手', '鍛冶の焼け籠手', '夜爪返しの籠手', '魔性受けの大籠手', '灯持ちの籠手', '常夜受け', '影弾きの籠手', '星鋼の籠手', '月受けの大袖', '銘・宵受け', '銘・夜盾', '銘・千夜受け', '家宝・当主代々の籠手'],
  },
  {
    prefix: 'sa_kabuto', slot: 'armor', kind: 'def', base: 9, growth: 1.19, basePrice: 55,
    names: ['編笠', '塗りの陣笠', '鉢金', '郷鍛冶の兜', '夜目の眉庇', '魔性睨みの面頬', '灯前立の兜', '常夜の星兜', '影見抜きの兜', '星辰の前立', '月輪の大兜', '銘・宵冠', '銘・夜明けの鉢', '銘・千夜の冠', '家宝・御山拝みの兜'],
  },
  {
    prefix: 'sc_omamori', slot: 'charm', kind: 'bonus', bonusKeys: ['luk', 'mnd'], base: 5, growth: 1.17, basePrice: 60,
    names: ['紙の御守', '社の御守', '巫女の祈り符', '大燈籠の火符', '夜道の護り', '魔性遠ざけ', '灯結びの符', '常夜の護符', '影祓いの札', '星詠みの符', '月護りの符', '銘・宵の加護', '銘・夜越えの符', '銘・千夜符', '家宝・初代の願文'],
  },
  {
    prefix: 'sc_kushi', slot: 'charm', kind: 'bonus', bonusKeys: ['mnd', 'dex'], base: 5, growth: 1.17, basePrice: 65,
    names: ['木の櫛', '椿油の櫛', '塗りの櫛', '螺鈿の櫛', '夜髪の櫛', '魔性見抜きの簪', '灯映えの簪', '常夜の玉簪', '影透かしの櫛', '星鏤めの簪', '月枝の簪', '銘・宵化粧', '銘・夜梳き', '銘・千夜の艶', '家宝・花嫁の櫛'],
  },
  {
    prefix: 'sc_obidome', slot: 'charm', kind: 'bonus', bonusKeys: ['vit', 'str'], base: 5, growth: 1.17, basePrice: 65,
    names: ['組紐の帯留', '瑪瑙の帯留', '琥珀の帯留', '鍛鉄の帯飾り', '夜歩きの帯', '魔性弾きの帯留', '灯石の帯留', '常夜石の帯', '影石の帯留', '星石の帯留', '月長石の帯', '銘・宵締め', '銘・夜固め', '銘・千夜帯', '家宝・祝言の帯留'],
  },
]

// 系譜→ItemBase展開(数値は式が単一情報源)
function seriesItems(s: ItemSeries): ItemBase[] {
  return s.names.map((name, i) => {
    const v = Math.round(s.base * Math.pow(s.growth, i))
    const price = Math.round(s.basePrice * Math.pow(1.52, i))
    const it: ItemBase = { baseId: `${s.prefix}${i}`, name, slot: s.slot, price, shopTier: i }
    if (s.kind === 'atk') it.atk = v
    else if (s.kind === 'def') it.def = v
    else if (s.bonusKeys) {
      it.statBonus = Object.fromEntries(s.bonusKeys.map((k, j) => [k, Math.max(1, Math.round(v * (j === 0 ? 1 : 0.6)))]))
    }
    return it
  })
}

export const ITEM_BASES: ItemBase[] = [...FOUNDING_ITEMS, ...SERIES.flatMap(seriesItems)]

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
