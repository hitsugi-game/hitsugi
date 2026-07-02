// フィールド描画テーマ(品質刷新v3.1 M7a) — 背景4系統ごとの配色・プロップ・照明特性
// region.bg(bg_forest/bg_zaka/bg_tani/bg_miyama)から解決する。

export type BgFamily = 'forest' | 'zaka' | 'tani' | 'miyama'

export type PropKind =
  | 'bamboo' | 'tree' | 'bush' | 'log' | 'rock'
  | 'stonewall' | 'lantern' | 'fence' | 'brokenlantern'
  | 'spire' | 'bone' | 'crystal' | 'cairn'
  | 'torii' | 'grave' | 'pillar' | 'wisp'

export interface DungeonTheme {
  family: BgFamily
  groundBase: number // ほぼ黒の地色(系統で色味を変える)
  groundJitter: number // タイルごとのトーン揺らぎ幅(0-255スケール)
  stain: number // 大きな染みの色
  grass: number // 下草の色
  waterDeep: number // 水面の基調
  waterGlint: number // 水面ハイライト
  veilAlpha: number // 暗闇ベールの基本α(灯100%時)
  torchTint: number // プレイヤー松明グロー
  lanternTint: number // 定置光(焚火・提灯)グロー
  shrineTint: number // 祠の冷光
  bossTint: number // ボスの間の妖光
  wallProps: PropKind[] // 壁面プロップの候補(先頭ほど出やすい)
  runProp: PropKind // 壁ラン(連続壁)に並べる区画プロップ
  bigProp: PropKind // 孤立壁・角に立つ大物
  gauntletProp: PropKind // ボス参道に連ねる門
}

const THEMES: Record<BgFamily, DungeonTheme> = {
  forest: {
    family: 'forest',
    groundBase: 0x0a0f12,
    groundJitter: 7,
    stain: 0x11201a,
    grass: 0x1d3326,
    waterDeep: 0x0e1d30,
    waterGlint: 0x3c6a8f,
    veilAlpha: 0.8,
    torchTint: 0xff9d45,
    lanternTint: 0xffb85c,
    shrineTint: 0x9b7fc2,
    bossTint: 0xc73e3a,
    wallProps: ['bamboo', 'tree', 'bush', 'rock', 'log'],
    runProp: 'bush',
    bigProp: 'tree',
    gauntletProp: 'tree',
  },
  zaka: {
    family: 'zaka',
    groundBase: 0x120d0e,
    groundJitter: 6,
    stain: 0x1e1512,
    grass: 0x2b2a1c,
    waterDeep: 0x101b2e,
    waterGlint: 0x4a6a8f,
    veilAlpha: 0.82,
    torchTint: 0xff9d45,
    lanternTint: 0xffae4f,
    shrineTint: 0x9b7fc2,
    bossTint: 0xc73e3a,
    wallProps: ['stonewall', 'lantern', 'fence', 'rock', 'brokenlantern'],
    runProp: 'fence',
    bigProp: 'lantern',
    gauntletProp: 'torii',
  },
  tani: {
    family: 'tani',
    groundBase: 0x0a0c14,
    groundJitter: 6,
    stain: 0x131829,
    grass: 0x22303a,
    waterDeep: 0x0c1a30,
    waterGlint: 0x5a7fb0,
    veilAlpha: 0.84,
    torchTint: 0xffa04e,
    lanternTint: 0xd8e8ff,
    shrineTint: 0x8ea8d8,
    bossTint: 0xc73e3a,
    wallProps: ['spire', 'bone', 'rock', 'crystal', 'cairn'],
    runProp: 'bone',
    bigProp: 'spire',
    gauntletProp: 'bone',
  },
  miyama: {
    family: 'miyama',
    groundBase: 0x0d0a12,
    groundJitter: 5,
    stain: 0x191024,
    grass: 0x282436,
    waterDeep: 0x120e26,
    waterGlint: 0x7a6ab0,
    veilAlpha: 0.86,
    torchTint: 0xffa754,
    lanternTint: 0xc9a86a,
    shrineTint: 0x9b7fc2,
    bossTint: 0xd84848,
    wallProps: ['grave', 'pillar', 'torii', 'rock', 'wisp'],
    runProp: 'grave',
    bigProp: 'torii',
    gauntletProp: 'torii',
  },
}

export function themeForBg(bg: string): DungeonTheme {
  if (bg.includes('zaka')) return THEMES.zaka
  if (bg.includes('tani')) return THEMES.tani
  if (bg.includes('miyama')) return THEMES.miyama
  return THEMES.forest
}

// 敵影・オーラ・技表現で共有する属性色
export const ELEMENT_COLORS: Record<string, number> = {
  fire: 0xff9d45,
  water: 0x4a86c8,
  wind: 0x7fae8f,
  earth: 0x9a7a4a,
  moon: 0x9b7fc2,
  star: 0xc9d8f0,
}
