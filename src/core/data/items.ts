import type { Item, ItemSlot, ItemSource, Stats } from '../types'
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
    names: ['野良着', '刺し子の半纏', '厚織りの羽織', '夜露弾きの羽織', '火の粉除けの羽織', '魔性目くらまし', '灯映しの羽織', '常夜歩きの外套', '影紛れの羽織', '星紋の陣羽織', '月渡りの羽織', '銘・宵羽', '銘・夜風通さず', '銘・千夜羽織', '家宝・家祖の残り布'],
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
  // ---- GDD_v3 M3b増設: 武器4/防具4/飾り4系譜(装備180→360) ----
  {
    prefix: 'sw_kama', slot: 'weapon', kind: 'atk', base: 9, growth: 1.19, basePrice: 44,
    names: ['刈り鎌', '野良鎌', '研ぎ鎌', '二丁鎌', '夜草刈り', '魔性刈り', '灯鎌', '常夜刈り', '影薙ぎの鎌', '星刈りの鎌', '月草刈り', '銘・宵刈り', '銘・夜薙ぎ', '銘・千夜鎌', '家宝・初代の鎌'],
  },
  {
    prefix: 'sw_kusarigama', slot: 'weapon', kind: 'atk', base: 8, growth: 1.2, basePrice: 46,
    names: ['粗末な鎖鎌', '町の鎖鎌', '油差しの鎖鎌', '搦め手の鎖鎌', '夜搦め', '魔性絡め取り', '灯鎖の鎌', '常夜絡め', '影鎖の鎌', '星鎖鎌', '月鎖搦め', '銘・宵搦め', '銘・夜縛り', '銘・千夜鎖', '家宝・搦め手の証'],
  },
  {
    prefix: 'sw_jutte', slot: 'weapon', kind: 'atk', base: 8, growth: 1.19, basePrice: 42,
    names: ['木の十手', '鉄十手', '鉤十手', '房付き十手', '夜番の十手', '魔性打ち十手', '灯十手', '常夜十手', '影受けの十手', '星十手', '月受け十手', '銘・宵十手', '銘・夜捕り', '銘・千夜十手', '家宝・目明かしの十手'],
  },
  {
    prefix: 'sw_tantou', slot: 'weapon', kind: 'atk', base: 7, growth: 1.2, basePrice: 40,
    names: ['懐刀', '護り短刀', '研ぎ短刀', '忍び短刀', '夜隠しの短刀', '魔性突きの短刀', '灯短刀', '常夜突き', '影短刀', '星突きの短刀', '月影短刀', '銘・宵突き', '銘・夜隠し', '銘・千夜短刀', '家宝・守り刀'],
  },
  {
    prefix: 'sa_shitagi', slot: 'armor', kind: 'def', base: 6, growth: 1.19, basePrice: 38,
    names: ['麻の下着', '綿入れ下着', '厚手の下着', '郷仕立ての下着', '夜冷え知らずの下着', '魔性避けの下着', '灯温めの下着', '常夜下着', '影通さぬ下着', '星編みの下着', '月肌着', '銘・宵肌', '銘・夜温め', '銘・千夜下着', '家宝・初着の名残'],
  },
  {
    prefix: 'sa_suneate', slot: 'armor', kind: 'def', base: 7, growth: 1.19, basePrice: 42,
    names: ['布脛当て', '革脛当て', '鋲打ち脛当て', '郷鍛冶の脛当て', '夜駆けの脛当て', '魔性避けの脛当て', '灯脛当て', '常夜脛当て', '影脛当て', '星脛当て', '月脛当て', '銘・宵駆け', '銘・夜疾り', '銘・千夜脛当て', '家宝・韋駄天の脛当て'],
  },
  {
    prefix: 'sa_men', slot: 'armor', kind: 'def', base: 8, growth: 1.19, basePrice: 48,
    names: ['布面', '革面', '鉄面', '郷鍛冶の面', '夜目の面', '魔性睨みの面', '灯面', '常夜面', '影面', '星面', '月面', '銘・宵面', '銘・夜叉面', '銘・千夜面', '家宝・翁面'],
  },
  {
    prefix: 'sa_tate', slot: 'armor', kind: 'def', base: 9, growth: 1.2, basePrice: 52,
    names: ['板盾', '籐盾', '鉄板盾', '郷鍛冶の盾', '夜守りの盾', '魔性防ぎの盾', '灯盾', '常夜の大盾', '影防ぎの盾', '星盾', '月影の盾', '銘・宵の盾', '銘・夜城壁', '銘・千夜盾', '家宝・不落の盾'],
  },
  {
    prefix: 'sc_netsuke', slot: 'charm', kind: 'bonus', bonusKeys: ['luk', 'dex'], base: 5, growth: 1.17, basePrice: 58,
    names: ['木彫りの根付', '象牙の根付', '漆塗りの根付', '郷細工の根付', '夜咄の根付', '魔性避けの根付', '灯根付', '常夜根付', '影根付', '星根付', '月根付', '銘・宵細工', '銘・夜彫り', '銘・千夜根付', '家宝・初代の根付'],
  },
  {
    prefix: 'sc_kinchaku', slot: 'charm', kind: 'bonus', bonusKeys: ['str', 'vit'], base: 5, growth: 1.17, basePrice: 60,
    names: ['布巾着', '刺し子巾着', '塗り巾着', '郷織りの巾着', '夜歩きの巾着', '魔性除けの巾着', '灯巾着', '常夜巾着', '影巾着', '星巾着', '月巾着', '銘・宵袋', '銘・夜携え', '銘・千夜巾着', '家宝・旅立ちの巾着'],
  },
  {
    prefix: 'sc_juzu', slot: 'charm', kind: 'bonus', bonusKeys: ['mnd', 'luk'], base: 6, growth: 1.17, basePrice: 68,
    names: ['木の数珠', '水晶数珠', '瑪瑙数珠', '社伝来の数珠', '夜祈りの数珠', '魔性祓いの数珠', '灯数珠', '常夜数珠', '影祓いの数珠', '星数珠', '月数珠', '銘・宵祈り', '銘・夜念', '銘・千夜数珠', '家宝・巫女伝来の数珠'],
  },
  {
    prefix: 'sc_udewa', slot: 'charm', kind: 'bonus', bonusKeys: ['agi', 'str'], base: 5, growth: 1.17, basePrice: 62,
    names: ['組紐の腕輪', '銅の腕輪', '銀の腕輪', '郷細工の腕輪', '夜守りの腕輪', '魔性弾きの腕輪', '灯腕輪', '常夜腕輪', '影腕輪', '星腕輪', '月腕輪', '銘・宵腕輪', '銘・夜守り', '銘・千夜腕輪', '家宝・初陣の腕輪'],
  },
  // ---- GDD_v3 M3c増設: 武器4/防具4/飾り4系譜(装備360→540) ----
  {
    prefix: 'sw_shakujo', slot: 'weapon', kind: 'atk', base: 8, growth: 1.19, basePrice: 43,
    names: ['木の錫杖', '鉄輪錫杖', '塗り錫杖', '社伝来の錫杖', '夜祓いの錫杖', '魔性祓いの錫杖', '灯錫杖', '常夜祓い', '影祓いの錫杖', '星錫杖', '月錫杖', '銘・宵祓い', '銘・夜念杖', '銘・千夜杖', '家宝・巫女伝来の錫杖'],
  },
  {
    prefix: 'sw_tessen', slot: 'weapon', kind: 'atk', base: 8, growth: 1.19, basePrice: 44,
    names: ['紙扇', '鉄扇', '塗り鉄扇', '郷細工の鉄扇', '夜風の鉄扇', '魔性払いの鉄扇', '灯扇', '常夜扇', '影扇', '星扇', '月扇', '銘・宵扇', '銘・夜払い', '銘・千夜扇', '家宝・舞い手の扇'],
  },
  {
    prefix: 'sw_fundou', slot: 'weapon', kind: 'atk', base: 9, growth: 1.19, basePrice: 45,
    names: ['縄分銅', '鉄分銅鎖', '鎖分銅', '郷鍛冶の分銅鎖', '夜搦めの鎖', '魔性絡めの鎖', '灯分銅', '常夜鎖', '影分銅鎖', '星分銅', '月分銅鎖', '銘・宵鎖', '銘・夜絡め', '銘・千夜鎖', '家宝・搦め手の鎖'],
  },
  {
    prefix: 'sw_kunai', slot: 'weapon', kind: 'atk', base: 7, growth: 1.2, basePrice: 41,
    names: ['粗末な苦无', '鉄苦无', '研ぎ苦无', '忍びの苦无', '夜投げの苦无', '魔性突きの苦无', '灯苦无', '常夜苦无', '影苦无', '星苦无', '月苦无', '銘・宵投げ', '銘・夜隠し苦无', '銘・千夜苦无', '家宝・忍びの証'],
  },
  {
    prefix: 'sa_kataate', slot: 'armor', kind: 'def', base: 7, growth: 1.19, basePrice: 40,
    names: ['布肩当て', '革肩当て', '鋲打ち肩当て', '郷鍛冶の肩当て', '夜守りの肩当て', '魔性避けの肩当て', '灯肩当て', '常夜肩当て', '影肩当て', '星肩当て', '月肩当て', '銘・宵肩', '銘・夜守り肩', '銘・千夜肩当て', '家宝・当主代々の肩当て'],
  },
  {
    prefix: 'sa_zukin', slot: 'armor', kind: 'def', base: 6, growth: 1.19, basePrice: 38,
    names: ['布頭巾', '綿入れ頭巾', '厚手頭巾', '郷仕立ての頭巾', '夜目の頭巾', '魔性避けの頭巾', '灯頭巾', '常夜頭巾', '影頭巾', '星頭巾', '月頭巾', '銘・宵頭巾', '銘・夜隠れ', '銘・千夜頭巾', '家宝・初代の頭巾'],
  },
  {
    prefix: 'sa_haidate', slot: 'armor', kind: 'def', base: 8, growth: 1.19, basePrice: 46,
    names: ['布佩楯', '革佩楯', '鋲打ち佩楯', '郷鍛冶の佩楯', '夜駆けの佩楯', '魔性避けの佩楯', '灯佩楯', '常夜佩楯', '影佩楯', '星佩楯', '月佩楯', '銘・宵佩楯', '銘・夜疾り佩楯', '銘・千夜佩楯', '家宝・韋駄天の佩楯'],
  },
  {
    prefix: 'sa_jinbaori', slot: 'armor', kind: 'def', base: 9, growth: 1.2, basePrice: 50,
    names: ['野良陣羽織', '刺し子陣羽織', '厚織り陣羽織', '郷仕立ての陣羽織', '夜行の陣羽織', '魔性避けの陣羽織', '灯陣羽織', '常夜の陣羽織', '影紛れの陣羽織', '星紋の陣羽織', '月渡りの陣羽織', '銘・宵羽織', '銘・夜風陣羽織', '銘・千夜陣羽織', '家宝・大将の陣羽織'],
  },
  {
    prefix: 'sc_nioibukuro', slot: 'charm', kind: 'bonus', bonusKeys: ['mnd', 'vit'], base: 5, growth: 1.17, basePrice: 56,
    names: ['麻の匂い袋', '絹の匂い袋', '塗り匂い袋', '郷織りの匂い袋', '夜香の匂い袋', '魔性除けの匂い袋', '灯匂い袋', '常夜匂い袋', '影匂い袋', '星匂い袋', '月匂い袋', '銘・宵香', '銘・夜薫り', '銘・千夜香', '家宝・初代の匂い袋'],
  },
  {
    prefix: 'sc_sensyafuda', slot: 'charm', kind: 'bonus', bonusKeys: ['luk', 'mnd'], base: 6, growth: 1.17, basePrice: 64,
    names: ['紙の千社札', '木の千社札', '漆塗り千社札', '社伝来の千社札', '夜詣での千社札', '魔性祓いの千社札', '灯千社札', '常夜千社札', '影祓いの千社札', '星千社札', '月千社札', '銘・宵詣で', '銘・夜念札', '銘・千夜札', '家宝・満願の千社札'],
  },
  {
    prefix: 'sc_mimikazari', slot: 'charm', kind: 'bonus', bonusKeys: ['dex', 'luk'], base: 5, growth: 1.17, basePrice: 60,
    names: ['貝殻の耳飾り', '珊瑚の耳飾り', '瑪瑙の耳飾り', '郷細工の耳飾り', '夜光の耳飾り', '魔性避けの耳飾り', '灯耳飾り', '常夜耳飾り', '影耳飾り', '星耳飾り', '月耳飾り', '銘・宵耳飾り', '銘・夜光り耳飾り', '銘・千夜耳飾り', '家宝・花嫁の耳飾り'],
  },
  {
    prefix: 'sc_yubiwa', slot: 'charm', kind: 'bonus', bonusKeys: ['str', 'dex'], base: 5, growth: 1.17, basePrice: 63,
    names: ['組紐の指輪', '銅の指輪', '銀の指輪', '郷細工の指輪', '夜結びの指輪', '魔性弾きの指輪', '灯指輪', '常夜指輪', '影指輪', '星指輪', '月指輪', '銘・宵結び', '銘・夜約束', '銘・千夜指輪', '家宝・祝言の指輪'],
  },
  // ---- M13増設: 武器6/防具6/飾り6系譜(装備540→810) ----
  {
    prefix: 'sw_ono', slot: 'weapon', kind: 'atk', base: 10, growth: 1.19, basePrice: 48,
    names: ['薪割り斧', '山刃の斧', '鍛え斧', '郷鍛冶の手斧', '夜伐りの斧', '魔性断ちの斧', '灯柄の斧', '常夜割り斧', '影断ちの大斧', '星刃の斧', '月光断ちの斧', '銘・宵断ち', '銘・夜割り', '銘・千夜斧', '家宝・杣人の一振り'],
  },
  {
    prefix: 'sw_kanabo', slot: 'weapon', kind: 'atk', base: 11, growth: 1.19, basePrice: 52,
    names: ['木の棍棒', '鉄鋲棍棒', '重ね金棒', '郷鍛冶の金棒', '夜打ちの金棒', '魔性砕きの金棒', '灯金棒', '常夜砕き', '影砕きの金棒', '星鉄金棒', '月砕きの金棒', '銘・宵砕き', '銘・夜叩き', '銘・千夜金棒', '家宝・鬼殺しの金棒'],
  },
  {
    prefix: 'sw_nagamaki', slot: 'weapon', kind: 'atk', base: 9, growth: 1.2, basePrice: 45,
    names: ['木柄の長刀', '荒研ぎの長巻', '厚刃の長巻', '郷鍛冶の長巻', '夜長巻', '魔性薙ぎの長巻', '灯薙ぎの長巻', '常夜長巻', '影薙ぎの長巻', '星長巻', '月光長巻', '銘・宵薙ぎ', '銘・夜長払い', '銘・千夜長巻', '家宝・武者払いの長巻'],
  },
  {
    prefix: 'sw_bisento', slot: 'weapon', kind: 'atk', base: 10, growth: 1.19, basePrice: 50,
    names: ['木柄の眉尖刀', '荒鍛えの眉尖刀', '反り刃の眉尖刀', '郷鍛冶の眉尖刀', '夜払いの眉尖刀', '魔性薙ぎ払いの眉尖刀', '灯尖刀', '常夜薙ぎ', '影払いの眉尖刀', '星尖刀', '月光尖刀', '銘・宵払い', '銘・夜薙ぎ払い', '銘・千夜尖刀', '家宝・僧兵伝来の尖刀'],
  },
  {
    prefix: 'sw_chigiriki', slot: 'weapon', kind: 'atk', base: 8, growth: 1.2, basePrice: 44,
    names: ['木の乳切木', '縄分銅の乳切木', '鎖分銅の乳切木', '郷鍛冶の乳切木', '夜打ちの乳切木', '魔性打ちの乳切木', '灯乳切木', '常夜打ち', '影打ちの乳切木', '星分銅乳切木', '月分銅乳切木', '銘・宵打ち', '銘・夜叩き分銅', '銘・千夜乳切木', '家宝・道場伝来の乳切木'],
  },
  {
    prefix: 'sw_masakari', slot: 'weapon', kind: 'atk', base: 11, growth: 1.19, basePrice: 55,
    names: ['木柄の鉞', '重ね鉞', '厚刃の鉞', '郷鍛冶の鉞', '夜断ちの鉞', '魔性断ちの大鉞', '灯鉞', '常夜断ち', '影断ちの鉞', '星鉞', '月光断ちの鉞', '銘・宵断ち鉞', '銘・夜割り鉞', '銘・千夜鉞', '家宝・山賊退治の鉞'],
  },
  {
    prefix: 'sa_wakibiki', slot: 'armor', kind: 'def', base: 6, growth: 1.19, basePrice: 38,
    names: ['布脇引', '革脇引', '鋲打ち脇引', '郷仕立ての脇引', '夜守りの脇引', '魔性避けの脇引', '灯脇引', '常夜脇引', '影脇引', '星脇引', '月脇引', '銘・宵脇守り', '銘・夜守り脇引', '銘・千夜脇引', '家宝・当主代々の脇引'],
  },
  {
    prefix: 'sa_nodowa', slot: 'armor', kind: 'def', base: 7, growth: 1.19, basePrice: 40,
    names: ['布喉輪', '革喉輪', '鋲打ち喉輪', '郷鍛冶の喉輪', '夜守りの喉輪', '魔性避けの喉輪', '灯喉輪', '常夜喉輪', '影喉輪', '星喉輪', '月喉輪', '銘・宵喉守り', '銘・夜守り喉輪', '銘・千夜喉輪', '家宝・不死身の喉輪'],
  },
  {
    prefix: 'sa_kusazuri', slot: 'armor', kind: 'def', base: 7, growth: 1.2, basePrice: 42,
    names: ['布草摺', '革草摺', '鋲打ち草摺', '郷鍛冶の草摺', '夜駆けの草摺', '魔性避けの草摺', '灯草摺', '常夜草摺', '影草摺', '星草摺', '月草摺', '銘・宵草摺', '銘・夜疾り草摺', '銘・千夜草摺', '家宝・韋駄天の草摺'],
  },
  {
    prefix: 'sa_manchira', slot: 'armor', kind: 'def', base: 8, growth: 1.19, basePrice: 46,
    names: ['布満智羅', '革満智羅', '鎖入り満智羅', '郷鍛冶の満智羅', '夜守りの満智羅', '魔性避けの満智羅', '灯満智羅', '常夜満智羅', '影満智羅', '星満智羅', '月満智羅', '銘・宵胸守り', '銘・夜守り満智羅', '銘・千夜満智羅', '家宝・武者伝来の満智羅'],
  },
  {
    prefix: 'sa_tekkou', slot: 'armor', kind: 'def', base: 6, growth: 1.19, basePrice: 40,
    names: ['布手甲', '革手甲', '鋲打ち手甲', '郷鍛冶の手甲', '夜受けの手甲', '魔性受けの手甲', '灯手甲', '常夜手甲', '影手甲', '星手甲', '月手甲', '銘・宵手守り', '銘・夜受け手甲', '銘・千夜手甲', '家宝・当主代々の手甲'],
  },
  {
    prefix: 'sa_koshiate', slot: 'armor', kind: 'def', base: 8, growth: 1.2, basePrice: 48,
    names: ['布腰当て', '革腰当て', '鋲打ち腰当て', '郷鍛冶の腰当て', '夜守りの腰当て', '魔性避けの腰当て', '灯腰当て', '常夜腰当て', '影腰当て', '星腰当て', '月腰当て', '銘・宵腰守り', '銘・夜守り腰当て', '銘・千夜腰当て', '家宝・当主代々の腰当て'],
  },
  {
    prefix: 'sc_inrou', slot: 'charm', kind: 'bonus', bonusKeys: ['mnd', 'vit'], base: 5, growth: 1.17, basePrice: 60,
    names: ['木の印籠', '漆塗りの印籠', '蒔絵の印籠', '郷細工の印籠', '夜薬の印籠', '魔性避けの印籠', '灯印籠', '常夜の印籠', '影印籠', '星詠みの印籠', '月印籠', '銘・宵薬籠', '銘・夜守り印籠', '銘・千夜印籠', '家宝・御典医伝来の印籠'],
  },
  {
    prefix: 'sc_ema', slot: 'charm', kind: 'bonus', bonusKeys: ['luk', 'mnd'], base: 5, growth: 1.17, basePrice: 56,
    names: ['木の絵馬', '社の絵馬', '願掛けの絵馬', '郷細工の絵馬', '夜詣での絵馬', '魔性除けの絵馬', '灯絵馬', '常夜の絵馬', '影祓いの絵馬', '星詠みの絵馬', '月絵馬', '銘・宵願', '銘・夜越えの絵馬', '銘・千夜絵馬', '家宝・大燈籠奉納の絵馬'],
  },
  {
    prefix: 'sc_temari', slot: 'charm', kind: 'bonus', bonusKeys: ['agi', 'dex'], base: 5, growth: 1.17, basePrice: 58,
    names: ['糸屑の手鞠', '綿手鞠', '色糸手鞠', '郷細工の手鞠', '夜遊びの手鞠', '魔性弾きの手鞠', '灯手鞠', '常夜の手鞠', '影弾きの手鞠', '星紋の手鞠', '月紋の手鞠', '銘・宵遊び', '銘・夜遊びの鞠', '銘・千夜手鞠', '家宝・幼子形見の手鞠'],
  },
  {
    prefix: 'sc_hamaya', slot: 'charm', kind: 'bonus', bonusKeys: ['str', 'luk'], base: 6, growth: 1.17, basePrice: 62,
    names: ['木の破魔矢', '社の破魔矢', '朱塗りの破魔矢', '郷細工の破魔矢', '夜祓いの破魔矢', '魔性祓いの破魔矢', '灯破魔矢', '常夜の破魔矢', '影祓いの破魔矢', '星詠みの破魔矢', '月破魔矢', '銘・宵祓い矢', '銘・夜越えの破魔矢', '銘・千夜破魔矢', '家宝・大燈籠奉納の破魔矢'],
  },
  {
    prefix: 'sc_hyoutan', slot: 'charm', kind: 'bonus', bonusKeys: ['vit', 'mnd'], base: 6, growth: 1.17, basePrice: 64,
    names: ['素焼きの瓢箪', '漆塗りの瓢箪', '銀口の瓢箪', '郷細工の瓢箪', '夜酒の瓢箪', '魔性避けの瓢箪', '灯瓢箪', '常夜の瓢箪', '影瓢箪', '星詠みの瓢箪', '月瓢箪', '銘・宵酒', '銘・夜越えの瓢箪', '銘・千夜瓢箪', '家宝・隠居翁の瓢箪'],
  },
  {
    prefix: 'sc_koma', slot: 'charm', kind: 'bonus', bonusKeys: ['agi', 'luk'], base: 5, growth: 1.17, basePrice: 68,
    names: ['木の独楽', '色塗りの独楽', '鉄芯の独楽', '郷細工の独楽', '夜回しの独楽', '魔性弾きの独楽', '灯独楽', '常夜の独楽', '影弾きの独楽', '星紋の独楽', '月紋の独楽', '銘・宵回し', '銘・夜回しの独楽', '銘・千夜独楽', '家宝・軒下名人の独楽'],
  },
]

// M33 ⑯: 価格成長を性能成長(growth)に少しの割増(プレミアム)を掛けた率にする。旧は全系列一律 1.52^i で、
// 性能growth(1.17〜1.20)から乖離し tier14 で性能あたり27〜39倍という急峻なカーブだった(買値専用=売却なし)。
// growth連動にすると価格/性能比は全系列で PREMIUM^i に収束し、tier14でも tier0 の約10倍に収まる
// (item_price.test.ts が上限12倍を独立にpin)。既存セーブの個体価格(Item.price)は非遡及(新規購入から適用)。
const PRICE_GROWTH_PREMIUM = 1.18
// 系譜→ItemBase展開(数値は式が単一情報源)
function seriesItems(s: ItemSeries): ItemBase[] {
  return s.names.map((name, i) => {
    const v = Math.round(s.base * Math.pow(s.growth, i))
    const price = Math.round(s.basePrice * Math.pow(s.growth * PRICE_GROWTH_PREMIUM, i))
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

export function makeItem(baseId: string, source?: ItemSource): Item {
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
    source,
  }
}

// 世代倍率から能力値を引き直す共通処理(継承・打ち直しの単一情報源)
function applyGeneration(item: Item, gen: number, name: string, legacyOf?: string): Item {
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
    legacyOf: legacyOf ?? item.legacyOf,
    name,
    atk: base.atk ? Math.round(base.atk * mult) : undefined,
    def: base.def ? Math.round(base.def * mult) : undefined,
    statBonus: bonus,
  }
}

// 形見継承 — 世代を経るほど強くなる(1世代ごと基礎値+12%)
// v3.1 M12-1: 故人の討伐数が多いほど銘が深く刻まれる(60討伐ごと+1世代、最大+2)
export function inheritItem(item: Item, prevOwnerName: string, ownerKills = 0): Item {
  const bonus = Math.min(2, Math.floor(ownerKills / 60))
  const gen = item.generation + 1 + bonus
  const base = itemBaseById(item.baseId)
  const name = `${base.name}・${'代'.repeat(Math.min(gen, 3))}${gen > 3 ? `(${gen})` : ''}`
  return {
    ...applyGeneration(item, gen, name, prevOwnerName),
    legacyFirstOwner: item.legacyFirstOwner ?? prevOwnerName,
  }
}

// 打ち直し(v3.1 M12-1) — 鍛冶で能動的に鍛える。遺品は銘を保ったまま深まる
export function reforgeItem(item: Item): Item {
  const gen = item.generation + 1
  const base = itemBaseById(item.baseId)
  const name = item.legacyOf
    ? `${base.name}・${'代'.repeat(Math.min(gen, 3))}${gen > 3 ? `(${gen})` : ''}`
    : `${base.name}+${gen}`
  return applyGeneration(item, gen, name)
}

// 打ち直しの費用(世代が深いほど高くつく)
export function reforgeCost(item: Item): { hoto: number; ketsu: number } {
  return { hoto: 45 + item.generation * 40, ketsu: 2 + item.generation * 2 }
}

// 打ち直し後の見込み値(確認画面用) — applyGenerationと同じ「base×(1+世代×0.12)」から引く。
// 現在値×1.12の近似では世代1以降に丸め誤差が複利で乗り、確認画面と実結果がズレる(M22レビュー反映)。
export function previewReforge(item: Item): { atk?: number; def?: number; statBonus?: Partial<Stats> } {
  const base = itemBaseById(item.baseId)
  const mult = 1 + (item.generation + 1) * 0.12
  return {
    atk: base.atk ? Math.round(base.atk * mult) : undefined,
    def: base.def ? Math.round(base.def * mult) : undefined,
    statBonus: base.statBonus
      ? Object.fromEntries(
          Object.entries(base.statBonus).map(([k, v]) => [k, Math.round((v as number) * mult)]),
        )
      : undefined,
  }
}

export const REFORGE_MAX = 5 // 打ち直し・継承を合わせた世代上限
