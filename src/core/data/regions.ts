import type { Region } from '../types'
import { FAME_SEAL_THRESHOLD } from '../constants'

// 夜藪の地域 — 武功(fame)で順に解放
export const REGIONS: Region[] = [
  {
    id: 'yoi_forest', name: '宵の森', tier: 1, depth: 6, unlockFame: 0,
    desc: '郷のすぐ外に広がる薄闇の森。かつては茸狩りの山だった。',
    bg: 'bg_forest.png',
  },
  {
    id: 'nureen_no_tsuji', name: '濡れ縁の辻', tier: 1, depth: 6, unlockFame: 8, bossId: 'boss_nureonna',
    desc: '雨も降らぬのに、いつも湿っている辻。踏み込むと、静かに水音がついてくる。',
    bg: 'bg_forest.png',
  },
  {
    id: 'karasu_no_sato', name: '烏の里', tier: 1, depth: 6, unlockFame: 15, bossId: 'boss_karasumaru',
    desc: '烏天狗の眷属が巣食う里。里といっても、もう人は住んでいない。',
    bg: 'bg_forest.png',
  },
  {
    id: 'tourou_kuzure_michi', name: '灯篭崩れ道', tier: 1, depth: 6, unlockFame: 22, bossId: 'boss_touroumori',
    desc: '崩れた灯篭が延々と続く道。誰も灯していないのに、火だけは絶えない。',
    bg: 'bg_forest.png',
  },
  {
    id: 'mushishigure_michi', name: '蟲時雨の径', tier: 1, depth: 6, unlockFame: 30, bossId: 'boss_kokenushi',
    desc: '羽虫の羽音が雨のように降り注ぐ小径。踏み入るたび、羽音が濃くなる。',
    bg: 'bg_forest.png',
  },
  {
    id: 'karita_no_bourei', name: '苅田の亡霊', tier: 1, depth: 6, unlockFame: 38, bossId: 'boss_kakashimusha',
    desc: '刈り取られたはずの田が、夜ごと稲穂を揺らす。誰も耕していないというのに。',
    bg: 'bg_forest.png',
  },
  {
    id: 'yaregasa_douhyou', name: '破れ傘の道標', tier: 1, depth: 6, unlockFame: 45, bossId: 'boss_karakasababa',
    desc: '朽ちた傘が道しるべのように連なる山道。数えるたび本数が違うという。',
    bg: 'bg_forest.png',
  },
  {
    id: 'minomushi_no_kairou', name: '蓑虫の廻廊', tier: 1, depth: 6, unlockFame: 52, bossId: 'boss_minomushinushi',
    desc: '無数の蓑虫が垂れ下がる回廊。風もないのに、絶えず小さく揺れている。',
    bg: 'bg_forest.png',
  },
  {
    id: 'chochin_zaka', name: '提灯坂', tier: 2, depth: 8, unlockFame: 60, bossId: 'boss_hyakume',
    desc: '無数の朽ちた提灯が並ぶ古い参道。誰が灯すのか、火だけは絶えない。',
    bg: 'bg_zaka.png',
  },
  {
    id: 'haikyo_goten', name: '廃墟の御殿', tier: 2, depth: 8, unlockFame: 180, bossId: 'boss_yureidono',
    desc: '誰の持ち物だったかも忘れられた大きな御殿の廃墟。夜ごと奥座敷に灯りが点る。',
    bg: 'bg_zaka.png',
  },
  {
    id: 'nurikabe_koji', name: '塗壁小路', tier: 2, depth: 8, unlockFame: 100, bossId: 'boss_nurikabeoyakata',
    desc: '見えない壁が幾重にも立ち塞がる小路。押しても引いても、壁は壁のまま。',
    bg: 'bg_zaka.png',
  },
  {
    id: 'kare_numa', name: '涸れ沼の畔', tier: 2, depth: 8, unlockFame: 140, bossId: 'boss_hiruhime',
    desc: '千年前に涸れたはずの沼。畔に立つと、今も地中で水の音がする。',
    bg: 'bg_zaka.png',
  },
  {
    id: 'oboro_bashi', name: '朧橋', tier: 2, depth: 8, unlockFame: 75, bossId: 'boss_oborofunayuurei',
    desc: '霧の向こうに霞んで見える橋。渡り切ったと思っても、いつも同じ岸に立っている。',
    bg: 'bg_zaka.png',
  },
  {
    id: 'suzuriishi_no_saka', name: '硯石の坂', tier: 2, depth: 8, unlockFame: 120, bossId: 'boss_suzuridama',
    desc: '硯の形をした岩がいくつも転がる坂道。踏むたびに、微かに墨の匂いがする。',
    bg: 'bg_zaka.png',
  },
  {
    id: 'rousoku_kashi', name: '蝋燭河岸', tier: 2, depth: 8, unlockFame: 160, bossId: 'boss_rousokuoni',
    desc: '涸れた河岸に蝋燭が延々と並ぶ。灯る火は誰も点けていないのに消えることがない。',
    bg: 'bg_zaka.png',
  },
  {
    id: 'kagami_ga_fuchi', name: '鏡ヶ淵', tier: 2, depth: 8, unlockFame: 200, bossId: 'boss_kagamibuchinushi',
    desc: '澄みきった淵。覗き込むと、自分によく似た何かが一拍遅れてこちらを見返す。',
    bg: 'bg_zaka.png',
  },
  {
    id: 'hoshimukuro_tani', name: '星骸の谷', tier: 3, depth: 10, unlockFame: 220, bossId: 'boss_hoshimukuro',
    desc: '玄冬に喰われた星々が墜ちて積もる谷。星の骸は今も微かに瞬く。',
    bg: 'bg_tani.png',
  },
  {
    id: 'kaji_ato', name: '鍛地の跡', tier: 3, depth: 10, unlockFame: 260, bossId: 'boss_kajishinnou',
    desc: '常夜に沈んだ古い鍛冶場の廃墟。今も鎚の音が絶えないという。',
    bg: 'bg_tani.png',
  },
  {
    id: 'hakkotsu_bayashi', name: '白骨林', tier: 3, depth: 10, unlockFame: 350, bossId: 'boss_hakkotsu',
    desc: '古戦場の骨が根を張って林になったと伝わる森。風のない夜も、木々が鳴る。',
    bg: 'bg_tani.png',
  },
  {
    id: 'akashi_miyama', name: '灯ノ御山', tier: 4, depth: 12, unlockFame: FAME_SEAL_THRESHOLD, bossId: 'boss_gentou',
    desc: '常夜の中心。頂に玄冬が座す。千年、誰も頂に届いていない。',
    bg: 'bg_miyama.png',
  },
]

export function regionById(id: string): Region {
  const r = REGIONS.find((x) => x.id === id)
  if (!r) throw new Error(`unknown region: ${id}`)
  return r
}
