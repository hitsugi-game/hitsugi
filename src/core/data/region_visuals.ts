// M21頭金(M22 P1-5で先行実装): 新12地域の署名データ。
// 正本: docs/VISUAL_RECOVERY_DUNGEON_PLAN.md §7.1(署名ランドマーク/粒子/主の痕跡)。
// RegionVisualProfile本体(palette/四幕/痕跡3段階)はM21で実装する — ここは出立画面の
// 予告表示に使う「署名1語+主の痕跡」のみをデータ化し、ダンジョン実装時に拡張する。
export interface RegionSign {
  landmark: string // 署名ランドマーク(その地を一語で見分ける物)
  particle: string // 粒子/天候(M21のRegionVisualProfileへ引き継ぐ)
  omen: string // 主の痕跡(ボスの気配 — 出立時は「兆し」として見せる)
}

export const REGION_SIGNS: Record<string, RegionSign> = {
  hotarubi_no_kubochi: { landmark: '水没した石灯籠', particle: '数を揃える蛍', omen: '焦げない足跡' },
  nemurijizou_no_michi: { landmark: '首を伏せた地蔵列', particle: '苔胞子', omen: '背負われた空台座' },
  kuchinawa_no_hotoke: { landmark: '巨大な朽ち注連縄', particle: '蛇行する塵', omen: '締め跡のある仏像' },
  usugiri_no_watashiba: { landmark: '岸のない桟橋', particle: '横へ流れる霧', omen: '濡れた足跡が途中で消える' },
  hisui_no_sawa: { landmark: '割れた翡翠柱', particle: '水中の光', omen: '水面下の巨大な影' },
  nakiotoko_no_hara: { landmark: '泣き石の群れ', particle: '逆流する雨', omen: '声だけが距離を変える' },
  sabigatana_no_haka: { landmark: '刀の森', particle: '錆粉', omen: '新しい血の付いた古刀' },
  yumemaboroshi_no_yakata: { landmark: '入れ子の襖', particle: '逆向きの埃', omen: '同じ部屋の異なる遺体' },
  maboroshi_no_sandou: { landmark: '尽きない鳥居', particle: '上へ落ちる紙垂', omen: '帰路側にだけ足跡' },
  nakiryuu_no_mine: { landmark: '龍骨の稜線', particle: '横殴りの星雪', omen: '岩に残る涙の溝' },
  todome_no_kaidan: { landmark: '数の違う石段', particle: '静止する灰', omen: '一段だけ温かい石' },
  gentou_no_zenya: { landmark: '無人の宴席', particle: '上向きに落ちる酒滴', omen: '食べ物だけが減る' },
}

export function regionSignOf(regionId: string): RegionSign | null {
  return REGION_SIGNS[regionId] ?? null
}
