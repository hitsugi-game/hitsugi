import type { EnemyDef } from '../types'

// 夜藪の魔性 — 常夜が生んだ異形たち
export const ENEMIES: EnemyDef[] = [
  // ---- Tier1: 宵の森 ----
  { id: 'chochin_kui', name: '提灯喰い', element: 'moon', tier: 1, hp: 42, atk: 12, def: 6, agi: 10, skillIds: ['e_kurayami'], hoto: 14, ketsu: 1, sprite: 'en_chochin.png', desc: '旅人の提灯を丸呑みにする小鬼。腹が仄かに光る。' },
  { id: 'kage_nezumi', name: '影鼠', element: 'earth', tier: 1, hp: 34, atk: 11, def: 5, agi: 16, skillIds: [], hoto: 10, ketsu: 1, sprite: 'en_kagenezumi.png', desc: '影から影へ走る鼠の群れ。噛まれると影が薄くなる。' },
  { id: 'onibi', name: '鬼火', element: 'fire', tier: 1, hp: 30, atk: 14, def: 4, agi: 13, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_onibi.png', desc: '無念の火が寄り集まったもの。近づく者を燃やして仲間にする。' },
  { id: 'yosuzume', name: '夜雀', element: 'wind', tier: 1, hp: 36, atk: 13, def: 5, agi: 18, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_yosuzume.png', desc: '夜道の前後を飛び回る不吉の鳥。囀りは方向感覚を狂わせる。' },

  // ---- Tier2: 提灯坂 ----
  { id: 'hone_dourou', name: '骨灯籠', element: 'fire', tier: 2, hp: 85, atk: 22, def: 14, agi: 8, skillIds: ['e_kurayami'], hoto: 30, ketsu: 2, sprite: 'en_honedourou.png', desc: '骨を組んで作られた灯籠の怪。灯る火は死者の未練。' },
  { id: 'nureginu', name: '濡れ衣', element: 'water', tier: 2, hp: 75, atk: 24, def: 10, agi: 14, skillIds: [], hoto: 28, ketsu: 2, sprite: 'en_nureginu.png', desc: '雨の夜に干し忘れた着物の怪。着た者の体温を奪い尽くす。' },
  { id: 'yogumo', name: '夜蜘蛛', element: 'moon', tier: 2, hp: 70, atk: 20, def: 12, agi: 20, skillIds: ['e_yamiuta'], hoto: 32, ketsu: 2, sprite: 'en_yogumo.png', desc: '常夜の糸を張る大蜘蛛。宵蜘蛛御前の眷属が堕ちた姿。' },
  { id: 'naki_ishi', name: '泣き石', element: 'earth', tier: 2, hp: 110, atk: 18, def: 20, agi: 5, skillIds: [], hoto: 34, ketsu: 3, sprite: 'en_nakiishi.png', desc: '夜通し啜り泣く道端の石。涙に触れると悲しみが移る。' },
  { id: 'kubinashi_andon', name: '首無し行灯', element: 'moon', tier: 2, hp: 150, atk: 28, def: 16, agi: 12, skillIds: ['e_hisui'], hoto: 70, ketsu: 5, sprite: 'en_kubinashi.png', desc: '首の代わりに行灯を掲げる武者の亡霊。灯を吸って強くなる。' },

  // ---- Tier3: 星骸の谷 ----
  { id: 'hoshikui_ko', name: '星喰いの仔', element: 'star', tier: 3, hp: 130, atk: 34, def: 18, agi: 22, skillIds: ['e_hoshikui'], hoto: 55, ketsu: 4, sprite: 'en_hoshikuiko.png', desc: '玄冬が零した欠片から生まれた仔。星の光を齧る音がする。' },
  { id: 'gesshoku_juu', name: '月蝕獣', element: 'moon', tier: 3, hp: 160, atk: 38, def: 22, agi: 16, skillIds: ['e_kurayami'], hoto: 60, ketsu: 4, sprite: 'en_gesshoku.png', desc: '月を齧った罰で永遠に飢える獣。その影は月の形に欠けている。' },
  { id: 'tanwatari', name: '谷渡り', element: 'wind', tier: 3, hp: 120, atk: 36, def: 16, agi: 30, skillIds: [], hoto: 52, ketsu: 3, sprite: 'en_taniwatari.png', desc: '谷底の風が編んだ翼人。落ちた星の骸を巣に運ぶ。' },
  { id: 'kagami_kurage', name: '鏡水母', element: 'water', tier: 3, hp: 140, atk: 30, def: 26, agi: 12, skillIds: ['e_yamiuta'], hoto: 58, ketsu: 4, sprite: 'en_kagamikurage.png', desc: '夜空を映す水母。見惚れた者は自分の顔を忘れる。' },
  { id: 'ochiboshi_mukuro', name: '堕星の骸', element: 'star', tier: 3, hp: 260, atk: 44, def: 24, agi: 18, skillIds: ['e_hoshikui', 'e_kurayami'], hoto: 130, ketsu: 8, sprite: 'en_ochiboshi.png', desc: '玄冬に喰われ堕ちた星神の亡骸。まだ祈りの形に手を組んでいる。' },

  // ---- Tier4: 灯ノ御山 ----
  { id: 'tokoyo_musha', name: '常夜武者', element: 'moon', tier: 4, hp: 220, atk: 52, def: 30, agi: 24, skillIds: ['e_kurayami'], hoto: 90, ketsu: 6, sprite: 'en_tokoyomusha.png', desc: '御山で果てた歴代当主の無念が鎧を着た姿。顔は誰にも見えない。' },
  { id: 'hitori', name: '灯盗り', element: 'fire', tier: 4, hp: 200, atk: 56, def: 26, agi: 28, skillIds: ['e_hisui'], hoto: 95, ketsu: 6, sprite: 'en_hitori.png', desc: '大燈籠の火を狙う影。奪った灯の数だけ腕が生えている。' },
  { id: 'yamabiko_bone', name: '山彦骨', element: 'earth', tier: 4, hp: 280, atk: 48, def: 38, agi: 10, skillIds: [], hoto: 100, ketsu: 7, sprite: 'en_yamabiko.png', desc: '山に呼びかけた声が骨を得た怪。答える声はいつも慟哭。' },
  { id: 'hoshikuzu_orochi', name: '星屑大蛇', element: 'star', tier: 4, hp: 320, atk: 58, def: 32, agi: 20, skillIds: ['e_hoshikui'], hoto: 120, ketsu: 8, sprite: 'en_orochi.png', desc: '喰われた星々の屑が寄り集まった大蛇。鱗の一枚一枚が消えた星座。' },

  // ---- ボス ----
  { id: 'boss_hyakume', name: '百目行灯', element: 'fire', tier: 5, hp: 480, atk: 40, def: 22, agi: 14, skillIds: ['e_hisui', 'e_kurayami'], hoto: 300, ketsu: 15, sprite: 'boss_hyakume.png', desc: '提灯坂の主。百の目で百年、郷の灯を見つめてきた。目を閉じる時、坂は闇に沈む。' },
  { id: 'boss_hoshimukuro', name: '骸星の大熊', element: 'star', tier: 5, hp: 750, atk: 55, def: 30, agi: 18, skillIds: ['e_hoshikui', 'e_kurayami'], hoto: 500, ketsu: 25, sprite: 'boss_hoshimukuro.png', desc: '星骸の谷の主。大熊星辰の兄星が玄冬に喰われた成れの果て。弟の名を呼びながら暴れる。' },
  { id: 'boss_gentou', name: '玄冬', element: 'moon', tier: 5, hp: 1200, atk: 68, def: 36, agi: 26, skillIds: ['e_hoshikui', 'e_hisui', 'e_yamiuta'], hoto: 0, ketsu: 0, sprite: 'boss_gentou.png', desc: '常夜の源、星喰いの神。その面の下は — 。' },
  { id: 'boss_shiori', name: '汐里', element: 'star', tier: 5, hp: 800, atk: 60, def: 28, agi: 30, skillIds: ['e_yamiuta', 'e_hoshikui'], hoto: 0, ketsu: 0, sprite: 'boss_shiori.png', desc: '千年前、郷を救った楽士。千年、たった独りで星喰いを封じ続けた家祖。もう、疲れている。' },
]

export function enemyById(id: string): EnemyDef {
  const e = ENEMIES.find((x) => x.id === id)
  if (!e) throw new Error(`unknown enemy: ${id}`)
  return e
}
