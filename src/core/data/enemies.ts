import type { EnemyDef, EnemyTier } from '../types'

// 夜藪の魔性 — 常夜が生んだ異形たち
// スケール規約(GDD_v3・WORKLOG設計決定): 手書きするのは「基礎種」のみ。
// 各基礎種は 若(tier-1・弱体)/常(基準)/老(tier+1・強化) の三変異に自動展開される。
// 変異は姿(sprite)を共有するため、画像の後追い生成は基礎種の数だけで済む。
const BASE_ENEMIES: EnemyDef[] = [
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

  // ---- Tier1 増員(GDD_v3) ----
  { id: 'koke_bouzu', name: '苔坊主', element: 'earth', tier: 1, hp: 38, atk: 12, def: 8, agi: 7, skillIds: [], hoto: 11, ketsu: 1, sprite: 'en_kokebouzu.png', desc: '倒木に生えた苔が経を覚えて起き上がった小坊主。読経はでたらめ。' },
  { id: 'azuki_arai', name: '小豆洗い', element: 'water', tier: 1, hp: 32, atk: 10, def: 5, agi: 14, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_azukiarai.png', desc: '沢で小豆を洗う音だけの怪。近づく者の足音を洗い流して迷わせる。' },
  { id: 'kazakiri_bane', name: '風切り羽', element: 'wind', tier: 1, hp: 30, atk: 13, def: 4, agi: 19, skillIds: [], hoto: 13, ketsu: 1, sprite: 'en_kazakiribane.png', desc: '夜鳥の抜け羽が風を覚えて飛び回る。羽先は小刀より鋭い。' },
  { id: 'donguri_mujina', name: '団栗貉', element: 'earth', tier: 1, hp: 35, atk: 11, def: 6, agi: 13, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_dongurimujina.png', desc: '団栗を溜め込みすぎて森を忘れた貉。頬袋に去年の秋が入っている。' },
  { id: 'yonaki_suzu', name: '夜泣き鈴', element: 'moon', tier: 1, hp: 34, atk: 12, def: 6, agi: 11, skillIds: ['e_yamiuta'], hoto: 13, ketsu: 1, sprite: 'en_yonakisuzu.png', desc: '捨てられた鈴が夜ごと泣く。あやすと懐くが、あやし方は誰も知らない。' },
  { id: 'shizuku_onna', name: '雫女', element: 'water', tier: 1, hp: 36, atk: 11, def: 6, agi: 10, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_shizukuonna.png', desc: '軒先の雨垂れに宿る女怪。数えた雫の数だけ背が伸びる。' },

  // ---- Tier2 増員 ----
  { id: 'karakasa_rounin', name: '唐傘浪人', element: 'wind', tier: 2, hp: 80, atk: 23, def: 12, agi: 15, skillIds: [], hoto: 30, ketsu: 2, sprite: 'en_karakasarounin.png', desc: '破れ傘に宿った浪人の未練。一本足の剣術は存外に速い。' },
  { id: 'doro_daruma', name: '泥達磨', element: 'earth', tier: 2, hp: 120, atk: 19, def: 18, agi: 6, skillIds: [], hoto: 32, ketsu: 2, sprite: 'en_dorodaruma.png', desc: '田の泥が達磨の形に固まった怪。七転八起、倒しても倒しても起きる。' },
  { id: 'hibashira_gitsune', name: '火柱狐', element: 'fire', tier: 2, hp: 78, atk: 25, def: 10, agi: 17, skillIds: [], hoto: 33, ketsu: 2, sprite: 'en_hibashiragitsune.png', desc: '尾が火柱になった狐。嫁入りの行列を焼かれてから、火を憎み、火になった。' },
  { id: 'tsurara_onna', name: '氷柱女', element: 'water', tier: 2, hp: 82, atk: 22, def: 13, agi: 12, skillIds: ['e_kurayami'], hoto: 31, ketsu: 2, sprite: 'en_tsuraraonna.png', desc: '軒の氷柱が見た夢の形。触れた者の体温を、春と勘違いして吸い尽くす。' },
  { id: 'hoshimushi', name: '星蝕虫', element: 'star', tier: 2, hp: 75, atk: 21, def: 11, agi: 16, skillIds: ['e_hoshikui'], hoto: 34, ketsu: 3, sprite: 'en_hoshimushi.png', desc: '星明かりを齧る蚕に似た虫。糸を吐くと、そこだけ夜が濃くなる。' },

  // ---- Tier3 増員 ----
  { id: 'ao_andon', name: '青行灯', element: 'moon', tier: 3, hp: 135, atk: 35, def: 18, agi: 18, skillIds: ['e_yamiuta'], hoto: 56, ketsu: 4, sprite: 'en_aoandon.png', desc: '百物語の百話目に灯る青い行灯。語り終えた者の影を連れて行く。' },
  { id: 'kaze_kurai', name: '風喰らい', element: 'wind', tier: 3, hp: 125, atk: 37, def: 15, agi: 26, skillIds: [], hoto: 54, ketsu: 3, sprite: 'en_kazekurai.png', desc: '風を喰って肥える見えざる顎。奴が満腹の夜、夜藪は不気味に凪ぐ。' },
  { id: 'yamauba_kage', name: '山姥影', element: 'earth', tier: 3, hp: 150, atk: 33, def: 22, agi: 10, skillIds: ['e_kurayami'], hoto: 57, ketsu: 4, sprite: 'en_yamaubakage.png', desc: '山姥の伝承だけが影となって残った怪。囲炉裏の匂いに引き寄せられる。' },
  { id: 'hitodama_gyouretsu', name: '人魂行列', element: 'fire', tier: 3, hp: 130, atk: 36, def: 16, agi: 20, skillIds: ['e_hisui'], hoto: 58, ketsu: 4, sprite: 'en_hitodamagyouretsu.png', desc: '行き場のない人魂が列を成して夜藪を巡る。列の先頭は千年、決まらない。' },
  { id: 'fuchi_kagami', name: '淵鏡', element: 'water', tier: 3, hp: 140, atk: 31, def: 24, agi: 11, skillIds: ['e_yamiuta'], hoto: 56, ketsu: 4, sprite: 'en_fuchikagami.png', desc: '底なし淵の水面が鏡となった怪。映った者の「最も帰りたい場所」を映して誘う。' },

  // ---- Tier4 増員 ----
  { id: 'kurayami_douji', name: '暗闇童子', element: 'moon', tier: 4, hp: 230, atk: 54, def: 28, agi: 26, skillIds: ['e_kurayami'], hoto: 95, ketsu: 6, sprite: 'en_kurayamidouji.png', desc: '常夜そのものが「子ども」を真似て作った似姿。遊び方を知らず、壊すだけ。' },
  { id: 'hoshisaki', name: '星裂き', element: 'star', tier: 4, hp: 250, atk: 57, def: 28, agi: 22, skillIds: ['e_hoshikui'], hoto: 105, ketsu: 7, sprite: 'en_hoshisaki.png', desc: '玄冬の爪が独り歩きした怪。裂かれた星の傷痕が、夜空の皺になる。' },
  { id: 'jinari_gama', name: '地鳴り蝦蟇', element: 'earth', tier: 4, hp: 290, atk: 46, def: 36, agi: 8, skillIds: [], hoto: 100, ketsu: 7, sprite: 'en_jinarigama.png', desc: '鳴けば山が答える大蝦蟇。腹の下に、呑んだ社が一つ沈んでいる。' },
  { id: 'shiranui_shou', name: '不知火将', element: 'fire', tier: 4, hp: 240, atk: 55, def: 30, agi: 20, skillIds: ['e_hisui'], hoto: 100, ketsu: 6, sprite: 'en_shiranuishou.png', desc: '海に出るはずの不知火が山へ迷い込み、鎧を得た姿。軍配の代わりに灯を振る。' },
  { id: 'mizuchi_kage', name: '蛟影', element: 'water', tier: 4, hp: 260, atk: 50, def: 32, agi: 18, skillIds: ['e_kurayami'], hoto: 98, ketsu: 6, sprite: 'en_mizuchikage.png', desc: '天に昇り損ねた蛟の影だけが谷川に残った。影のくせに、濡れている。' },
  { id: 'kamikakushi', name: '神隠し', element: 'wind', tier: 4, hp: 210, atk: 58, def: 24, agi: 30, skillIds: ['e_yamiuta'], hoto: 102, ketsu: 7, sprite: 'en_kamikakushi.png', desc: '「隠す」という現象そのものの怪。奴に触れられた者の名は、呼んでも山彦が返らない。' },
]

// ---- ボス(変異なし・固有) ----
const BOSSES: EnemyDef[] = [
  { id: 'boss_hyakume', name: '百目行灯', element: 'fire', tier: 5, hp: 900, atk: 50, def: 26, agi: 14, skillIds: ['e_hisui', 'e_kurayami'], hoto: 300, ketsu: 15, sprite: 'boss_hyakume.png', desc: '提灯坂の主。百の目で百年、郷の灯を見つめてきた。目を閉じる時、坂は闇に沈む。' },
  { id: 'boss_hoshimukuro', name: '骸星の大熊', element: 'star', tier: 5, hp: 1600, atk: 70, def: 34, agi: 18, skillIds: ['e_hoshikui', 'e_kurayami'], hoto: 500, ketsu: 25, sprite: 'boss_hoshimukuro.png', desc: '星骸の谷の主。大熊星辰の兄星が玄冬に喰われた成れの果て。弟の名を呼びながら暴れる。' },
  { id: 'boss_gentou', name: '玄冬', element: 'moon', tier: 5, hp: 2400, atk: 85, def: 40, agi: 26, skillIds: ['e_hoshikui', 'e_hisui', 'e_yamiuta'], hoto: 0, ketsu: 0, sprite: 'boss_gentou.png', desc: '常夜の源、星喰いの神。その面の下は — 。' },
  { id: 'boss_shiori', name: '汐里', element: 'star', tier: 5, hp: 1500, atk: 78, def: 32, agi: 30, skillIds: ['e_yamiuta', 'e_hoshikui'], hoto: 0, ketsu: 0, sprite: 'boss_shiori.png', desc: '千年前、郷を救った楽士。千年、たった独りで星喰いを封じ続けた家祖。もう、疲れている。' },
]

// ---- 変異展開(GDD_v3) ----
// 若(_w): 基本ひとつ下のtierに現れる未熟な個体。弱いが報酬も薄い。
// 老(_o): 基本ひとつ上のtierに現れる古強者。強く、実り多い。
// 端のtierは範囲内にクランプ(同tier内の弱個体/強個体として現れる)。姿は基礎種と共有。
const r = Math.round
function variantsOf(base: EnemyDef): EnemyDef[] {
  const young: EnemyDef = {
    ...base,
    id: `${base.id}_w`,
    name: `若き${base.name}`,
    tier: Math.max(1, base.tier - 1) as EnemyTier,
    hp: r(base.hp * 0.62), atk: r(base.atk * 0.7), def: r(base.def * 0.68), agi: r(base.agi * 0.9),
    hoto: r(base.hoto * 0.6), ketsu: Math.max(1, r(base.ketsu * 0.5)),
    desc: `${base.name}の若い個体。粗削りだが、怖いもの知らずの分だけ厄介。`,
  }
  const old: EnemyDef = {
    ...base,
    id: `${base.id}_o`,
    name: `老いたる${base.name}`,
    tier: Math.min(4, base.tier + 1) as EnemyTier,
    hp: r(base.hp * 1.55), atk: r(base.atk * 1.35), def: r(base.def * 1.3), agi: r(base.agi * 1.05),
    hoto: r(base.hoto * 1.8), ketsu: Math.max(1, r(base.ketsu * 1.8)),
    desc: `長い夜を生き延びた${base.name}の古強者。手練れの気配を纏う。`,
  }
  return [young, base, old]
}

// 結合(基礎40種→変異込み+ボス)。exportの形は従来と互換。
export const ENEMIES: EnemyDef[] = [...BASE_ENEMIES.flatMap(variantsOf), ...BOSSES]

export function enemyById(id: string): EnemyDef {
  const e = ENEMIES.find((x) => x.id === id)
  if (!e) throw new Error(`unknown enemy: ${id}`)
  return e
}
