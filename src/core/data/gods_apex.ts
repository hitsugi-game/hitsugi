import type { God } from '../types'

// ============================================================
// 極ツ星(rank4)増員分 — 世界の根に触れる星々(GDD_v3 §1: 最終8柱)
// 北辰老は gods.ts に残る。極ツ星の流儀: 物語の核心に指をかける神々。
// 全柱 unlock 付き(GDD_v3 §3)。神授技は gs_{element}4。
// ============================================================

export const GODS_APEX: God[] = [
  {
    id: 'amatsuhi', name: '天津日の残照', kana: 'あまつひのざんしょう', rank: 4, element: 'fire',
    statBias: { str: 24, mnd: 24, luk: 12 }, cost: 800, skillId: 'gs_fire4',
    personality: '消えた太陽の、残り香',
    desc: '千年前に玄冬へ喰われた太陽——その最後の残照が凝った星。誰よりも眩しく、誰よりも寂しい。「私は本体ではないよ。……夕焼けの、忘れ物さ」',
    pactLines: ['太陽の子を産むといい。常夜の郷にこそ、ふさわしい。', '……いつか本物の朝が来たら、私は消える。それまでの縁だ。大事にしよう。'],
    portrait: 'god_amatsuhi.png',
    unlock: { regionId: 'hoshimukuro_tani' },
  },
  {
    id: 'ushimitsu', name: '丑三の大御', kana: 'うしみつのおおみ', rank: 4, element: 'moon',
    statBias: { dex: 26, agi: 22, mnd: 12 }, cost: 700, skillId: 'gs_moon4',
    personality: '夜の最も深い刻の主',
    desc: '丑三つ刻——夜が最も深く、静かな刻の主。常夜千年は、彼にとって千年続く「自分の時間」。だが最近、少し飽きたらしい。',
    pactLines: ['千年、儂の刻が続いた。……正直に言おう。朝が恋しいのは、儂も同じよ。', '夜の底を知る子になる。夜の底を知る者だけが、灯の値打ちを知る。'],
    portrait: 'god_ushimitsu.png',
    unlock: { regionId: 'chochin_zaka' },
  },
  {
    id: 'amanogawa', name: '天の川母神', kana: 'あまのがわのははがみ', rank: 4, element: 'water',
    statBias: { vit: 24, mnd: 26, luk: 10 }, cost: 900, skillId: 'gs_water4',
    personality: '星々すべての母、大河の女神',
    desc: '夜空を流れる大河にして、星々みなの母。星神たちは皆、彼女の川から掬い上げられた雫である。「汐里も、あなたたちも、みんな私の子ですよ」',
    pactLines: ['八代。よくぞ絶やさず繋ぎました。母として、これほど誇らしいことはない。', '私の川の水を一雫、その子に。……渇かない心を持つ子になるでしょう。'],
    portrait: 'god_amanogawa.png',
    unlock: { gen: 8 },
  },
]

// 弔いの文(極ツ星増員分)
export const MOURNING_APEX: Record<string, string> = {
  amatsuhi: '「私の残照を、少しだけあの子の墓標に当てておいた。……千年ぶりに、夕焼けというものを思い出したよ」',
  ushimitsu: '「今夜の丑三つ刻は、いつもより長い。……儂が延ばした。あの子との別れを惜しむ者らのために、夜の底を少しだけ広げた」',
  amanogawa: '「お帰りなさい、私の子。川はすべての雫を憶えています。あなたが流れた岸辺のことも、ぜんぶ、ぜんぶ」',
}
