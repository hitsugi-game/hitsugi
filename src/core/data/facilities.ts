// 郷の普請(v3.1 M16-6) — 奉燈を注ぎ、郷に4つの施設を建てる。代を跨いで効く恒常加護
// 効果の適用箇所: store(帰還回復/星契り誕生/月送りの縁/物見の情報)・Home(普請パネル)
export const FACILITY_MAX_LV = 3

export interface Facility {
  id: string
  name: string
  desc: string
  base: number // 建設費(奉燈) — 費用は base×(lv+1)
  effects: string[] // Lv1〜3の効果一言(UI表示用)
}

export const FACILITIES: Facility[] = [
  {
    id: 'yuya', name: '湯屋', desc: '傷を流す湯屋。帰還した一族の傷と心労を、湯気がやわらげる。',
    base: 40,
    effects: ['帰還時の回復+20%', '帰還時の回復+40%', '帰還時の回復+70%'],
  },
  {
    id: 'shoko', name: '書庫', desc: '先達の知恵を集めた書庫。子の血潮に、僅かな伸びしろを残す。',
    base: 60,
    effects: ['子の潜在値+2%', '子の潜在値+4%', '子の潜在値+7%'],
  },
  {
    id: 'yashiro', name: '社', desc: '星神を祀る社。月送りごと、契った星々への縁を篤くする。',
    base: 50,
    effects: ['月送りごと縁+0.05', '月送りごと縁+0.10', '月送りごと縁+0.15'],
  },
  {
    id: 'monomi', name: '物見櫓', desc: '夜藪を見渡す櫓。出立の前から、闇の様子が少し見える。',
    base: 45,
    effects: ['出立時に地域の敵tierを見渡せる', '階段の方角が薄く分かる', '金の敵影・宝の気配を開幕に告げる'],
  },
]

export function facilityById(id: string): Facility {
  const f = FACILITIES.find((x) => x.id === id)
  if (!f) throw new Error(`unknown facility: ${id}`)
  return f
}

// 建設/普請の費用 — 現在lvから次lvへ上げる費用(次lv基準: base×(nextLv))
// 例: 書庫(base60)を未建設→Lv1にする費用=60、Lv1→Lv2=120、Lv2→Lv3=180
export function facilityCost(id: string, currentLv: number): number {
  const f = facilityById(id)
  return f.base * (currentLv + 1)
}

// Lv1/2/3ごとの効果係数 — 湯屋(回復倍率)・書庫(潜在%)・社(縁の増分)。lv0は未建設=0
const YUYA_RECOVER = [0, 0.20, 0.40, 0.70]
const SHOKO_POTENTIAL = [0, 0.02, 0.04, 0.07]
const YASHIRO_AFFINITY = [0, 0.05, 0.10, 0.15]

export function yuyaRecoverBonus(lv: number): number {
  return YUYA_RECOVER[Math.max(0, Math.min(FACILITY_MAX_LV, lv))]
}

export function shokoPotentialBonus(lv: number): number {
  return SHOKO_POTENTIAL[Math.max(0, Math.min(FACILITY_MAX_LV, lv))]
}

export function yashiroAffinityGain(lv: number): number {
  return YASHIRO_AFFINITY[Math.max(0, Math.min(FACILITY_MAX_LV, lv))]
}

// facilities未定義/該当キー無しは常にlv0(旧セーブ互換)
export function facilityLevel(facilities: Record<string, number> | undefined, id: string): number {
  return facilities?.[id] ?? 0
}
