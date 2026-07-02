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

  // ---- Tier1 増員2波(GDD_v3 M3b) ----
  { id: 'warabe_kage', name: '童影', element: 'moon', tier: 1, hp: 33, atk: 11, def: 5, agi: 15, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_warabekage.png', desc: '遊び相手を探してさまよう子供の影。捕まると鬼ごっこが終わらなくなる。' },
  { id: 'ochiba_zamurai', name: '落葉侍', element: 'wind', tier: 1, hp: 38, atk: 13, def: 7, agi: 12, skillIds: [], hoto: 13, ketsu: 1, sprite: 'en_ochibazamurai.png', desc: '積もった落葉が刀を持った侍の形に固まった怪。踏まれると怒って襲いかかる。' },
  { id: 'hone_karasu', name: '骨烏', element: 'earth', tier: 1, hp: 31, atk: 12, def: 6, agi: 14, skillIds: [], hoto: 11, ketsu: 1, sprite: 'en_honekarasu.png', desc: '骨だけになった烏の群れ。啼き声は生前より不吉になった。' },
  { id: 'chi_no_ike', name: '血の池虫', element: 'fire', tier: 1, hp: 35, atk: 14, def: 5, agi: 9, skillIds: [], hoto: 13, ketsu: 1, sprite: 'en_chinoike.png', desc: '赤く濁った水たまりに湧く小さな虫の群れ。触れると熱を持つ。' },
  { id: 'sunakake', name: '砂かけ狸', element: 'earth', tier: 1, hp: 37, atk: 10, def: 8, agi: 11, skillIds: [], hoto: 11, ketsu: 1, sprite: 'en_sunakake.png', desc: '通りすがりに砂を浴びせる悪戯好きの狸。悪意はないが実害はある。' },
  { id: 'kuchisake_kagami', name: '裂け鏡', element: 'moon', tier: 1, hp: 32, atk: 13, def: 4, agi: 13, skillIds: ['e_kurayami'], hoto: 14, ketsu: 1, sprite: 'en_kuchisakekagami.png', desc: 'ひびの入った手鏡の怪。覗き込んだ顔を歪めて映す。' },
  { id: 'nurenezumi', name: '濡れ鼠火', element: 'fire', tier: 1, hp: 33, atk: 12, def: 5, agi: 16, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_nurenezumi.png', desc: '水に落ちて燃え続ける奇妙な鼠火。消えそうで消えない。' },
  { id: 'tsuchibotaru', name: '土蛍', element: 'earth', tier: 1, hp: 29, atk: 11, def: 4, agi: 17, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_tsuchibotaru.png', desc: '土中から湧く蛍もどき。光は綺麗だが触れると土気を吸われる。' },
  { id: 'kazamimi', name: '風耳', element: 'wind', tier: 1, hp: 30, atk: 13, def: 4, agi: 20, skillIds: [], hoto: 13, ketsu: 1, sprite: 'en_kazamimi.png', desc: '大きな耳だけの怪。噂話を集めるためだけに夜道をさまよう。' },
  { id: 'komoriuta_ningyou', name: '子守唄人形', element: 'moon', tier: 1, hp: 36, atk: 12, def: 6, agi: 10, skillIds: ['e_yamiuta'], hoto: 14, ketsu: 1, sprite: 'en_komoriutaningyou.png', desc: '捨てられた人形が子守唄を口ずさみながら徘徊する。歌は少し調子外れ。' },

  // ---- Tier2 増員2波 ----
  { id: 'ame_onna', name: '雨女房', element: 'water', tier: 2, hp: 82, atk: 21, def: 12, agi: 13, skillIds: [], hoto: 30, ketsu: 2, sprite: 'en_ameonna.png', desc: '傘も差さず歩き続ける女の怪。すれ違うと体が芯から冷える。' },
  { id: 'yamawaro', name: '山童', element: 'earth', tier: 2, hp: 95, atk: 20, def: 16, agi: 10, skillIds: [], hoto: 31, ketsu: 2, sprite: 'en_yamawaro.png', desc: '山仕事を手伝うふりをして道具を隠す悪戯な河童の遠縁。' },
  { id: 'kubittake', name: '首丈', element: 'moon', tier: 2, hp: 78, atk: 23, def: 11, agi: 15, skillIds: ['e_kurayami'], hoto: 33, ketsu: 2, sprite: 'en_kubittake.png', desc: '首だけが異様に伸びる怪。伸びた首は元に戻すのに苦労する。' },
  { id: 'hi_no_tama', name: '火の玉侍', element: 'fire', tier: 2, hp: 80, atk: 24, def: 10, agi: 16, skillIds: [], hoto: 32, ketsu: 2, sprite: 'en_hinotamazamurai.png', desc: '討ち死にした侍の執念が火の玉となって彷徨う。刀の記憶だけが残る。' },
  { id: 'ubagabi', name: '姥が火', element: 'fire', tier: 2, hp: 76, atk: 22, def: 9, agi: 18, skillIds: [], hoto: 29, ketsu: 2, sprite: 'en_ubagabi.png', desc: '油を盗んだ老婆の魂が変じた火の玉。今も油の匂いを追いかける。' },
  { id: 'nozuchi', name: '野槌', element: 'earth', tier: 2, hp: 130, atk: 16, def: 22, agi: 4, skillIds: [], hoto: 35, ketsu: 3, sprite: 'en_nozuchi.png', desc: '槌の形をした太い蛇のような怪。転がって突進する以外何もしない。' },
  { id: 'zashiki_warashi_kage', name: '座敷童の影', element: 'moon', tier: 2, hp: 72, atk: 19, def: 13, agi: 19, skillIds: [], hoto: 34, ketsu: 2, sprite: 'en_zashikiwarashikage.png', desc: '本来は福を呼ぶはずの座敷童が、夜藪で影だけの姿に堕ちたもの。' },
  { id: 'kappa_nokori', name: '名残河童', element: 'water', tier: 2, hp: 88, atk: 20, def: 14, agi: 12, skillIds: [], hoto: 31, ketsu: 2, sprite: 'en_kapparokori.png', desc: '涸れた川に取り残された河童。皿の水が乾きかけ気が立っている。' },
  { id: 'inbi', name: '陰火武者', element: 'moon', tier: 2, hp: 84, atk: 25, def: 12, agi: 14, skillIds: ['e_hisui'], hoto: 36, ketsu: 3, sprite: 'en_inbimusha.png', desc: '陰の気だけで動く鎧武者。中身はとうに失われている。' },
  { id: 'karasuten', name: '烏天狗崩れ', element: 'wind', tier: 2, hp: 79, atk: 23, def: 11, agi: 22, skillIds: [], hoto: 33, ketsu: 2, sprite: 'en_karasutenkuzure.png', desc: '修行に破れて堕ちた天狗もどき。翼はもう満足に使えない。' },

  // ---- Tier3 増員2波 ----
  { id: 'nue', name: '鵺', element: 'moon', tier: 3, hp: 145, atk: 34, def: 19, agi: 22, skillIds: ['e_kurayami'], hoto: 55, ketsu: 4, sprite: 'en_nue.png', desc: '猿・虎・蛇が混ざった鳴き声を持つ怪。姿を見た者は少ない。' },
  { id: 'oosakabe', name: '長壁女', element: 'earth', tier: 3, hp: 155, atk: 32, def: 21, agi: 12, skillIds: [], hoto: 54, ketsu: 4, sprite: 'en_oosakabe.png', desc: '古い天守に棲むと伝わる女怪。夜藪に迷い込んだ一柱がここに堕ちた。' },
  { id: 'raiju_ko', name: '雷獣の仔', element: 'fire', tier: 3, hp: 128, atk: 38, def: 16, agi: 24, skillIds: [], hoto: 57, ketsu: 4, sprite: 'en_raijuko.png', desc: '雷獣王の眷属からはぐれた仔。まだ制御できない電光を撒き散らす。' },
  { id: 'funayurei', name: '船幽霊', element: 'water', tier: 3, hp: 138, atk: 33, def: 20, agi: 15, skillIds: ['e_yamiuta'], hoto: 56, ketsu: 4, sprite: 'en_funayurei.png', desc: '沈んだ舟の亡霊。柄杓を貸すと水を注がれ沈められる、との言い伝え通りの怪。' },
  { id: 'ittanmomen', name: '一反木綿', element: 'wind', tier: 3, hp: 118, atk: 30, def: 14, agi: 28, skillIds: [], hoto: 53, ketsu: 3, sprite: 'en_ittanmomen.png', desc: '一反の布が意志を持ち夜空を飛ぶ。巻きつかれると息が詰まる。' },
  { id: 'nurikabe_oni', name: '塗壁鬼', element: 'earth', tier: 3, hp: 165, atk: 29, def: 26, agi: 6, skillIds: [], hoto: 58, ketsu: 4, sprite: 'en_nurikabeoni.png', desc: '見えない壁が鬼の顔を持つに至った上位種。押しても引いても動かない。' },
  { id: 'kasha', name: '火車', element: 'fire', tier: 3, hp: 148, atk: 36, def: 18, agi: 20, skillIds: ['e_hisui'], hoto: 60, ketsu: 5, sprite: 'en_kasha.png', desc: '死者を奪いに来るという妖怪の車。車輪は常に燃えている。' },
  { id: 'yamachichi', name: '山地乳', element: 'earth', tier: 3, hp: 132, atk: 35, def: 17, agi: 19, skillIds: [], hoto: 55, ketsu: 4, sprite: 'en_yamachichi.png', desc: '眠る者の息を吸うという猿に似た怪。息を吸われても死にはしないが酷く消耗する。' },
  { id: 'akaeimusha', name: '赤鱏武者', element: 'water', tier: 3, hp: 142, atk: 32, def: 22, agi: 13, skillIds: [], hoto: 57, ketsu: 4, sprite: 'en_akaeimusha.png', desc: '海だったはずの土地に現れる巨大な鱏の亡霊。武具を纏っている理由は誰も知らない。' },
  { id: 'yamawarai', name: '山嗤い', element: 'earth', tier: 3, hp: 150, atk: 31, def: 24, agi: 10, skillIds: ['e_kurayami'], hoto: 56, ketsu: 4, sprite: 'en_yamawarai.png', desc: '理由もなく笑い続ける山の怪。笑い声を聞いた者は道に迷いやすくなる。' },

  // ---- Tier4 増員2波 ----
  { id: 'nurarihyon', name: 'ぬらりひょん崩れ', element: 'moon', tier: 4, hp: 235, atk: 53, def: 29, agi: 24, skillIds: ['e_kurayami'], hoto: 96, ketsu: 6, sprite: 'en_nurarihyon.png', desc: '妖怪の総大将を騙る堕ちた者。貫禄だけは本物に劣らない。' },
  { id: 'daidarabotchi_ashi', name: '大太法師の足跡', element: 'earth', tier: 4, hp: 300, atk: 44, def: 40, agi: 6, skillIds: [], hoto: 105, ketsu: 8, sprite: 'en_daidarabotchi.png', desc: '巨人の足跡そのものが独立して歩き回る現象。踏まれれば助からない。' },
  { id: 'gashadokuro', name: 'がしゃどくろ', element: 'earth', tier: 4, hp: 270, atk: 56, def: 30, agi: 18, skillIds: ['e_kurayami'], hoto: 100, ketsu: 7, sprite: 'en_gashadokuro.png', desc: '無数の骨が集まった巨大な骸骨。歩くたびがしゃがしゃと音を立てる。' },
  { id: 'kyuubi_kage', name: '九尾の影', element: 'fire', tier: 4, hp: 245, atk: 60, def: 26, agi: 26, skillIds: ['e_hisui'], hoto: 110, ketsu: 7, sprite: 'en_kyuubikage.png', desc: '妖狐の伝説が影だけとなって夜藪に落ちた姿。尾は数えるたび本数が違う。' },
  { id: 'umibouzu', name: '海坊主崩れ', element: 'water', tier: 4, hp: 280, atk: 50, def: 34, agi: 14, skillIds: [], hoto: 98, ketsu: 6, sprite: 'en_umibouzu.png', desc: '海のない山中に現れる坊主頭の巨怪。由来は誰にも分からない。' },
  { id: 'raijin_taiko', name: '雷神太鼓崩れ', element: 'fire', tier: 4, hp: 225, atk: 62, def: 25, agi: 22, skillIds: [], hoto: 108, ketsu: 7, sprite: 'en_raijintaiko.png', desc: '鳴神太鼓の力を真似た偽物の太鼓が化けた姿。音は本物より濁っている。' },
  { id: 'nue_juku', name: '鵺の熟れたる姿', element: 'moon', tier: 4, hp: 255, atk: 54, def: 32, agi: 20, skillIds: ['e_kurayami', 'e_yamiuta'], hoto: 104, ketsu: 7, sprite: 'en_nuejuku.png', desc: '鵺がさらに夜藪の毒気を吸って成長した姿。鳴き声で三匹分の恐怖を運ぶ。' },
  { id: 'oomukade', name: '大百足', element: 'earth', tier: 4, hp: 265, atk: 52, def: 33, agi: 16, skillIds: [], hoto: 99, ketsu: 6, sprite: 'en_oomukade.png', desc: '山ひとつを取り巻くという伝説の大百足。夜藪では一部だけが顔を出す。' },
  { id: 'tengu_taishou', name: '天狗大将', element: 'wind', tier: 4, hp: 215, atk: 59, def: 27, agi: 32, skillIds: ['e_hoshikui'], hoto: 106, ketsu: 7, sprite: 'en_tengutaishou.png', desc: '天狗の中でも武勇に優れた将。羽団扇の一振りで隊列を吹き飛ばす。' },
  { id: 'kokuyousekihime', name: '黒曜石姫', element: 'star', tier: 4, hp: 240, atk: 57, def: 31, agi: 21, skillIds: ['e_hoshikui'], hoto: 112, ketsu: 8, sprite: 'en_kokuyousekihime.png', desc: '墜ちた星が黒曜石の刃と化して人の形を取った姫。斬れ味は玄冬の眷属随一。' },

  // ---- Tier1 増員3波(GDD_v3 M3c) ----
  { id: 'kumomura_gumo', name: '蜘蛛叢', element: 'earth', tier: 1, hp: 33, atk: 11, def: 6, agi: 15, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_kumomuragumo.png', desc: '藪の隅に群れる小蜘蛛の集団。一匹一匹は弱いが、群れると存外しつこい。' },
  { id: 'nuka_bouzu', name: '糠坊主', element: 'earth', tier: 1, hp: 36, atk: 10, def: 7, agi: 9, skillIds: [], hoto: 11, ketsu: 1, sprite: 'en_nukabouzu.png', desc: '捨てられた糠床が坊主の形に固まった怪。触れると独特の匂いが移る。' },
  { id: 'shitakiri_suzume', name: '舌切雀の成れ果て', element: 'wind', tier: 1, hp: 31, atk: 13, def: 4, agi: 17, skillIds: [], hoto: 13, ketsu: 1, sprite: 'en_shitakirisuzume.png', desc: '伝承の雀の遠縁。舌ではなく、旅人の言葉を切り取っていくという。' },
  { id: 'yubune_yurei', name: '湯船幽霊', element: 'water', tier: 1, hp: 34, atk: 11, def: 6, agi: 10, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_yubuneyurei.png', desc: '打ち捨てられた湯船に宿る幽霊。今も誰かが入るのを待っている。' },
  { id: 'akachouchin_bi', name: '赤提灯火', element: 'fire', tier: 1, hp: 30, atk: 14, def: 4, agi: 12, skillIds: [], hoto: 13, ketsu: 1, sprite: 'en_akachouchinbi.png', desc: '一杯飲み屋の赤提灯に灯った未練の火。呑んだ酒の分だけ大きくなる。' },
  { id: 'karesusuki_te', name: '枯薄の手', element: 'wind', tier: 1, hp: 32, atk: 12, def: 5, agi: 14, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_karesusukite.png', desc: '枯れた薄が手の形に絡み合った怪。掴まれると存外離れない。' },
  { id: 'doro_gaeru', name: '泥蛙', element: 'earth', tier: 1, hp: 38, atk: 10, def: 8, agi: 8, skillIds: [], hoto: 11, ketsu: 1, sprite: 'en_dorogaeru.png', desc: '沼地の泥から生まれた大蛙。鳴き声で夜の湿気を呼ぶ。' },
  { id: 'akatonbo_gun', name: '赤蜻蛉群', element: 'fire', tier: 1, hp: 29, atk: 13, def: 4, agi: 19, skillIds: [], hoto: 13, ketsu: 1, sprite: 'en_akatonbogun.png', desc: '季節外れに群れる赤蜻蛉の一団。羽音が不吉に響く。' },
  { id: 'ishidourou_kobi', name: '石灯籠子火', element: 'fire', tier: 1, hp: 35, atk: 12, def: 6, agi: 10, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_ishidourou.png', desc: '倒れた石灯籠に宿る小さな火。倒れたことを未だに根に持っている。' },
  { id: 'kagerou_ko', name: '陽炎子', element: 'fire', tier: 1, hp: 28, atk: 13, def: 3, agi: 18, skillIds: [], hoto: 13, ketsu: 1, sprite: 'en_kagerouko.png', desc: '揺らめく陽炎が子供の形になった怪。捕まえようとすると輪郭が崩れる。' },
  { id: 'tsurikane_mushi', name: '釣鐘虫', element: 'earth', tier: 1, hp: 37, atk: 11, def: 7, agi: 11, skillIds: [], hoto: 11, ketsu: 1, sprite: 'en_tsurikanemushi.png', desc: '寺の釣鐘に住み着いた虫の集合体。振動を好み、静けさを嫌う。' },

  // ---- Tier2 増員3波 ----
  { id: 'nurioni_ko', name: '塗鬼子', element: 'earth', tier: 2, hp: 90, atk: 21, def: 15, agi: 9, skillIds: [], hoto: 32, ketsu: 2, sprite: 'en_nurionikoko.png', desc: '塗壁の眷属で、まだ幼い個体。壁になりきれず、鬼の姿のまま彷徨う。' },
  { id: 'kawausobi', name: '川獺火', element: 'water', tier: 2, hp: 83, atk: 22, def: 12, agi: 15, skillIds: [], hoto: 31, ketsu: 2, sprite: 'en_kawausobi.png', desc: '溺れた川獺の魂が燐火となって漂う。人懐こいが、近づくと肌が湿る。' },
  { id: 'kumogakushi', name: '雲隠れ', element: 'wind', tier: 2, hp: 77, atk: 24, def: 10, agi: 21, skillIds: [], hoto: 33, ketsu: 2, sprite: 'en_kumogakushi.png', desc: '雲に紛れて奇襲する怪。見えている間はまだ本気を出していない。' },
  { id: 'sekizou_oni', name: '石像鬼', element: 'earth', tier: 2, hp: 115, atk: 19, def: 19, agi: 6, skillIds: [], hoto: 34, ketsu: 3, sprite: 'en_sekizouoni.png', desc: '古い石像に宿った鬼。日中は像のふりをしているが、夜は本性を現す。' },
  { id: 'hone_taiko', name: '骨太鼓', element: 'fire', tier: 2, hp: 79, atk: 23, def: 11, agi: 17, skillIds: [], hoto: 30, ketsu: 2, sprite: 'en_honetaiko.png', desc: '骨を張った太鼓の怪。打つたびに骨の音が夜藪に響き渡る。' },
  { id: 'shiroi_kitsune', name: '白い狐火', element: 'moon', tier: 2, hp: 81, atk: 21, def: 13, agi: 16, skillIds: ['e_kurayami'], hoto: 32, ketsu: 2, sprite: 'en_shiroikitsune.png', desc: '雪のように白い狐火の群れ。導くふりをして、迷わせるのが常。' },
  { id: 'ikitsuki_dou', name: '息継ぎ堂', element: 'earth', tier: 2, hp: 125, atk: 17, def: 21, agi: 5, skillIds: [], hoto: 35, ketsu: 3, sprite: 'en_ikitsukidou.png', desc: '旅人が一息つくための小堂に宿った怪。休ませてはくれるが、長居はさせない。' },
  { id: 'namida_ike', name: '涙池', element: 'water', tier: 2, hp: 92, atk: 20, def: 16, agi: 10, skillIds: [], hoto: 31, ketsu: 2, sprite: 'en_namidaike.png', desc: '誰かの涙が集まってできたという小池の怪。触れると悲しみが伝染する。' },
  { id: 'yamiyo_karasu', name: '闇夜烏', element: 'moon', tier: 2, hp: 74, atk: 25, def: 10, agi: 20, skillIds: [], hoto: 33, ketsu: 2, sprite: 'en_yamiyokarasu.png', desc: '闇そのものが烏の形を取った怪。鳴き声さえ闇に呑まれて聞こえない。' },
  { id: 'ame_kozou', name: '雨小僧', element: 'water', tier: 2, hp: 86, atk: 21, def: 13, agi: 14, skillIds: [], hoto: 30, ketsu: 2, sprite: 'en_amekozou.png', desc: '雨雲を連れて歩く小僧の怪。彼が通ると乾いた道もぬかるむ。' },

  // ---- Tier3 増員3波 ----
  { id: 'shourou_oni', name: '鐘楼鬼', element: 'moon', tier: 3, hp: 140, atk: 33, def: 20, agi: 17, skillIds: ['e_yamiuta'], hoto: 55, ketsu: 4, sprite: 'en_shourouoni.png', desc: '打ち捨てられた鐘楼に棲む鬼。鐘の音の代わりに、己の叫びを響かせる。' },
  { id: 'yamiyo_kajiya', name: '闇夜鍛冶屋', element: 'fire', tier: 3, hp: 135, atk: 37, def: 17, agi: 16, skillIds: ['e_hisui'], hoto: 58, ketsu: 4, sprite: 'en_yamiyokajiya.png', desc: '闇の中でしか鎚を振れなくなった鍛冶屋の怪。打つ武具はどれも呪われている。' },
  { id: 'kawa_akago', name: '川赤子', element: 'water', tier: 3, hp: 128, atk: 32, def: 21, agi: 12, skillIds: [], hoto: 56, ketsu: 4, sprite: 'en_kawaakago.png', desc: '川辺で泣く赤子の声だけの怪。抱き上げようとした者は二度と帰らない。' },
  { id: 'kaze_no_hakaba', name: '風の墓場', element: 'wind', tier: 3, hp: 122, atk: 35, def: 15, agi: 25, skillIds: [], hoto: 54, ketsu: 3, sprite: 'en_kazenohakaba.png', desc: '風だけが集まって墓標の形を成した怪。風が墓標を運び去る音が不気味に響く。' },
  { id: 'tsuchigumo_taishou', name: '土蜘蛛大将', element: 'earth', tier: 3, hp: 160, atk: 30, def: 27, agi: 8, skillIds: [], hoto: 60, ketsu: 5, sprite: 'en_tsuchigumotaishou.png', desc: '土蜘蛛の一党を束ねる大将格。地中から不意打ちで糸を放つ。' },
  { id: 'namakubi_dourou', name: '生首灯籠', element: 'fire', tier: 3, hp: 132, atk: 34, def: 18, agi: 19, skillIds: ['e_kurayami'], hoto: 57, ketsu: 4, sprite: 'en_namakubidourou.png', desc: '生首の形をした灯籠の怪。灯る火は、まだ誰かを捜しているようだ。' },
  { id: 'mizu_kagami_onna', name: '水鏡女', element: 'water', tier: 3, hp: 145, atk: 29, def: 23, agi: 13, skillIds: ['e_yamiuta'], hoto: 55, ketsu: 4, sprite: 'en_mizukagamionna.png', desc: '水面に映る自分の姿を憎む女怪。見た者の顔まで映して連れ去ろうとする。' },
  { id: 'yamikoe_daiko', name: '闇声太鼓', element: 'fire', tier: 3, hp: 138, atk: 36, def: 19, agi: 15, skillIds: [], hoto: 59, ketsu: 4, sprite: 'en_yamikoedaiko.png', desc: '打つたびに闇の声が漏れる太鼓の怪。音を聞いた者は方向感覚を失う。' },
  { id: 'houki_gami', name: '箒神の堕影', element: 'wind', tier: 3, hp: 125, atk: 33, def: 16, agi: 24, skillIds: [], hoto: 53, ketsu: 3, sprite: 'en_houkigami.png', desc: '座敷を掃く神が堕ちた姿。掃かれた埃が目潰しとなって襲ってくる。' },
  { id: 'yoi_no_hitodama', name: '宵の人魂', element: 'fire', tier: 3, hp: 130, atk: 35, def: 17, agi: 21, skillIds: ['e_hisui'], hoto: 56, ketsu: 4, sprite: 'en_yoinohitodama.png', desc: '宵の口にだけ現れる人魂の群れ。夜が深まるほど数を増す。' },

  // ---- Tier4 増員3波 ----
  { id: 'shura_no_katamari', name: '修羅の塊', element: 'fire', tier: 4, hp: 255, atk: 60, def: 28, agi: 19, skillIds: ['e_hisui'], hoto: 105, ketsu: 7, sprite: 'en_shuranokatamari.png', desc: '幾多の戦で流された血が凝り固まった怪。修羅場の記憶だけを繰り返す。' },
  { id: 'yamiyo_daikaizoku', name: '闇夜大魁族', element: 'moon', tier: 4, hp: 270, atk: 55, def: 30, agi: 17, skillIds: ['e_kurayami'], hoto: 100, ketsu: 6, sprite: 'en_yamiyodaikaizoku.png', desc: '常夜の海賊を名乗る一党の頭目格。船もない山中で、なぜか航海の歌を歌う。' },
  { id: 'hoshikui_ryuu', name: '星喰い竜', element: 'star', tier: 4, hp: 260, atk: 58, def: 29, agi: 22, skillIds: ['e_hoshikui'], hoto: 115, ketsu: 8, sprite: 'en_hoshikuiryuu.png', desc: '玄冬の眷属の中でも古参の竜。喰らった星の数だけ鱗が増えるという。' },
  { id: 'jibaku_saburou', name: '地縛三郎', element: 'earth', tier: 4, hp: 295, atk: 50, def: 36, agi: 10, skillIds: [], hoto: 98, ketsu: 6, sprite: 'en_jibakusaburou.png', desc: '土地に縛られたまま動けなくなった武者の霊。その場を動けぬ分、力は強い。' },
  { id: 'kaminari_oni', name: '雷鬼', element: 'fire', tier: 4, hp: 230, atk: 62, def: 24, agi: 24, skillIds: [], hoto: 107, ketsu: 7, sprite: 'en_kaminarioni.png', desc: '雷雲を纏う鬼。一歩踏み出すたび、稲光が地を這う。' },
  { id: 'suibaku_ryuujin', name: '水爆竜神', element: 'water', tier: 4, hp: 275, atk: 53, def: 32, agi: 15, skillIds: ['e_kurayami'], hoto: 96, ketsu: 6, sprite: 'en_suibakuryuujin.png', desc: '暴走する水流そのものが竜神の形を取った怪。触れた者を一瞬で押し流す。' },
  { id: 'nokorihi_shogun', name: '残り火将軍', element: 'fire', tier: 4, hp: 245, atk: 59, def: 27, agi: 20, skillIds: ['e_hisui'], hoto: 110, ketsu: 7, sprite: 'en_nokorihishogun.png', desc: '燃え尽きたはずの陣が最後に燃やした将の霊。灰の鎧を纏い今も戦場に立つ。' },
  { id: 'yuki_warashi', name: '雪童子崩れ', element: 'water', tier: 1, hp: 33, atk: 12, def: 6, agi: 13, skillIds: [], hoto: 12, ketsu: 1, sprite: 'en_yukiwarashi.png', desc: '季節外れの雪を纏う童子姿の怪。触れた場所だけ、うっすら霜が降りる。' },
  { id: 'gunma_no_zangeki', name: '軍馬の残骸', element: 'earth', tier: 4, hp: 250, atk: 56, def: 30, agi: 22, skillIds: [], hoto: 102, ketsu: 6, sprite: 'en_gunmanozangeki.png', desc: '古戦場で斃れた軍馬の骨が今も駆け続ける怪。蹄の音だけが夜藪に響く。' },
]

// ---- ボス(変異なし・固有) ----
const BOSSES: EnemyDef[] = [
  { id: 'boss_kokenushi', name: '苔ノ主', element: 'earth', tier: 5, hp: 480, atk: 32, def: 20, agi: 10, skillIds: [], hoto: 130, ketsu: 6, sprite: 'boss_kokenushi.png', desc: '蟲時雨の径の主。全身を苔と羽虫の羽音が覆う古木の精。動きは鈍いが、絡みつく苔は容赦がない。' },
  { id: 'boss_karakasababa', name: '傘婆', element: 'wind', tier: 5, hp: 540, atk: 36, def: 22, agi: 20, skillIds: ['e_kurayami'], hoto: 150, ketsu: 7, sprite: 'boss_karakasababa.png', desc: '数多の唐傘小僧を従える傘婆。開いた傘の骨は数え切れず、閉じれば骨だけの姿が覗く。' },
  { id: 'boss_yureidono', name: '幽霊殿', element: 'moon', tier: 5, hp: 690, atk: 40, def: 25, agi: 18, skillIds: ['e_kurayami', 'e_yamiuta'], hoto: 220, ketsu: 11, sprite: 'boss_yureidono.png', desc: '打ち捨てられた御殿の主。誰も住んでいないはずの奥座敷に、今も灯りが点る。' },
  { id: 'boss_kajishinnou', name: '鍛地神王', element: 'fire', tier: 5, hp: 980, atk: 62, def: 38, agi: 15, skillIds: ['e_hisui'], hoto: 320, ketsu: 16, sprite: 'boss_kajishinnou.png', desc: '常夜に沈んだ古い鍛冶場の神。打ち続けた武具は誰にも渡らぬまま山を成す。' },
  { id: 'boss_karasumaru', name: '烏丸太夫', element: 'wind', tier: 5, hp: 510, atk: 34, def: 19, agi: 26, skillIds: ['e_hoshikui'], hoto: 145, ketsu: 7, sprite: 'boss_karasumaru.png', desc: '烏天狗崩れどもを束ねる太夫格。舞うたびに黒羽根が刃となって舞い散る。' },
  { id: 'boss_nurikabeoyakata', name: '塗壁親方', element: 'earth', tier: 5, hp: 720, atk: 30, def: 42, agi: 6, skillIds: [], hoto: 210, ketsu: 10, sprite: 'boss_nurikabeoyakata.png', desc: '無数の塗壁を束ねる親方格。押しても引いても壊れず、根負けした旅人だけが道を諦める。' },
  { id: 'boss_hiruhime', name: '沼主蛭姫', element: 'water', tier: 5, hp: 620, atk: 38, def: 24, agi: 14, skillIds: ['e_kurayami'], hoto: 200, ketsu: 10, sprite: 'boss_hiruhime.png', desc: '涸れ沼の畔に棲む蛭の女王。沼が涸れてなお、地中の水脈を吸い続けている。' },
  { id: 'boss_hakkotsu', name: '白骨大将', element: 'moon', tier: 5, hp: 780, atk: 46, def: 28, agi: 16, skillIds: ['e_kurayami', 'e_hisui'], hoto: 260, ketsu: 13, sprite: 'boss_hakkotsu.png', desc: '白骨林に眠る古戦場の総大将。骨の軍勢を率いた無念が、今も戦を終えられずにいる。' },
  { id: 'boss_hyakume', name: '百目行灯', element: 'fire', tier: 5, hp: 900, atk: 50, def: 26, agi: 14, skillIds: ['e_hisui', 'e_kurayami'], hoto: 300, ketsu: 15, sprite: 'boss_hyakume.png', desc: '提灯坂の主。百の目で百年、郷の灯を見つめてきた。目を閉じる時、坂は闇に沈む。' },
  { id: 'boss_hoshimukuro', name: '骸星の大熊', element: 'star', tier: 5, hp: 1600, atk: 70, def: 34, agi: 18, skillIds: ['e_hoshikui', 'e_kurayami'], hoto: 500, ketsu: 25, sprite: 'boss_hoshimukuro.png', desc: '星骸の谷の主。大熊星辰の兄星が玄冬に喰われた成れの果て。弟の名を呼びながら暴れる。' },
  { id: 'boss_gentou', name: '玄冬', element: 'moon', tier: 5, hp: 2400, atk: 85, def: 40, agi: 26, skillIds: ['e_hoshikui', 'e_hisui', 'e_yamiuta'], hoto: 0, ketsu: 0, sprite: 'boss_gentou.png', desc: '常夜の源、星喰いの神。その面の下は — 。' },
  { id: 'boss_shiori', name: '汐里', element: 'star', tier: 5, hp: 1500, atk: 78, def: 32, agi: 30, skillIds: ['e_yamiuta', 'e_hoshikui'], hoto: 0, ketsu: 0, sprite: 'boss_shiori.png', desc: '千年前、郷を救った楽士。千年、たった独りで星喰いを封じ続けた家祖。もう、疲れている。' },
  { id: 'boss_nureonna', name: '濡れ女', element: 'water', tier: 5, hp: 400, atk: 26, def: 16, agi: 12, skillIds: [], hoto: 90, ketsu: 4, sprite: 'boss_nureonna.png', desc: '濡れ縁の辻に佇む女の怪。長い黒髪の先から絶えず滴が落ち、辻全体をしっとりと湿らせる。' },
  { id: 'boss_touroumori', name: '灯篭守', element: 'fire', tier: 5, hp: 450, atk: 29, def: 18, agi: 10, skillIds: ['e_hisui'], hoto: 105, ketsu: 5, sprite: 'boss_touroumori.png', desc: '崩れた灯篭の列を守る古い番人の霊。消えかけの火を抱え、道を塞ぐ者には容赦がない。' },
  { id: 'boss_kakashimusha', name: '案山子武者', element: 'earth', tier: 5, hp: 500, atk: 33, def: 20, agi: 8, skillIds: [], hoto: 120, ketsu: 6, sprite: 'boss_kakashimusha.png', desc: '苅田に立ち尽くす案山子が武者の姿を得た怪。動きは鈍重だが、藁の腕の一振りは重い。' },
  { id: 'boss_minomushinushi', name: '蓑虫嚢主', element: 'wind', tier: 5, hp: 540, atk: 30, def: 24, agi: 16, skillIds: ['e_kurayami'], hoto: 135, ketsu: 6, sprite: 'boss_minomushinushi.png', desc: '蓑虫の廻廊に巣くう巨大な嚢の主。無数の子蓑虫を纏い、揺れるたびに小さな棘が舞う。' },
  { id: 'boss_oborofunayuurei', name: '朧舟幽鬼', element: 'water', tier: 5, hp: 580, atk: 35, def: 22, agi: 16, skillIds: ['e_kurayami'], hoto: 155, ketsu: 8, sprite: 'boss_oborofunayuurei.png', desc: '朧橋の下を漂う舟形の幽鬼。渡ろうとする者を舟に乗せ、対岸のない川を延々と漕ぎ続けさせる。' },
  { id: 'boss_suzuridama', name: '硯魂', element: 'moon', tier: 5, hp: 650, atk: 39, def: 26, agi: 12, skillIds: ['e_hisui'], hoto: 175, ketsu: 9, sprite: 'boss_suzuridama.png', desc: '硯石の坂に棲みつく硯の付喪神。刷った墨は全て、届かなかった文の言葉だという。' },
  { id: 'boss_rousokuoni', name: '蝋燭鬼', element: 'fire', tier: 5, hp: 700, atk: 44, def: 24, agi: 18, skillIds: ['e_hisui', 'e_kurayami'], hoto: 195, ketsu: 10, sprite: 'boss_rousokuoni.png', desc: '蝋燭河岸に居座る鬼。売れ残った蝋燭の魂が集まり、一つの意思を持つに至った。' },
  { id: 'boss_kagamibuchinushi', name: '鏡淵の主', element: 'moon', tier: 5, hp: 760, atk: 42, def: 30, agi: 14, skillIds: ['e_kurayami', 'e_yamiuta'], hoto: 215, ketsu: 11, sprite: 'boss_kagamibuchinushi.png', desc: '鏡のように澄んだ淵の主。水面に映る者の姿を写し取り、いつまでも淵の底に留め置く。' },
  { id: 'boss_kageboushiosa', name: '影法師長', element: 'moon', tier: 5, hp: 790, atk: 48, def: 28, agi: 22, skillIds: ['e_kurayami'], hoto: 230, ketsu: 12, sprite: 'boss_kageboushiosa.png', desc: '影法師の丘に群れる影たちの長。日輪の落ちぬ夜でも、その輪郭だけは濃い黒を保っている。' },
  { id: 'boss_kottounonushi', name: '骨董の主', element: 'earth', tier: 5, hp: 830, atk: 45, def: 36, agi: 10, skillIds: ['e_hisui'], hoto: 245, ketsu: 12, sprite: 'boss_kottounonushi.png', desc: '骨董坂に積み上がった品々の付喪神が寄り合って生まれた主。値のつかない品ほど、その力は濃い。' },
  { id: 'boss_hyakkiyakousendatsu', name: '百鬼夜行の先達', element: 'wind', tier: 5, hp: 870, atk: 50, def: 32, agi: 24, skillIds: ['e_hoshikui', 'e_kurayami'], hoto: 260, ketsu: 13, sprite: 'boss_hyakkiyakousendatsu.png', desc: '百鬼夜行の辻で行列を先導する者。その後ろに続く鬼たちの数は、見る者の数だけ違うという。' },
  { id: 'boss_tokoyaminobannin', name: '常闇の番人', element: 'moon', tier: 5, hp: 910, atk: 52, def: 38, agi: 16, skillIds: ['e_kurayami', 'e_yamiuta'], hoto: 280, ketsu: 14, sprite: 'boss_tokoyaminobannin.png', desc: '常闇の回廊の最奥に立つ番人。灯ノ御山へ至る道が近いことを、その重い佇まいだけで知らせてくる。' },
  { id: 'boss_hoshikuimushi', name: '星喰い蟲', element: 'star', tier: 5, hp: 950, atk: 56, def: 36, agi: 22, skillIds: ['e_hoshikui', 'e_kurayami'], hoto: 300, ketsu: 15, sprite: 'boss_hoshikuimushi.png', desc: '星喰い野を覆う蟲の大群が一体となった怪。玄冬の眷属と噂され、墜ちた星の欠片を求めて蠢き続ける。' },
  { id: 'boss_chouchounomukuro', name: '町長の骸', element: 'moon', tier: 5, hp: 1020, atk: 58, def: 40, agi: 14, skillIds: ['e_kurayami', 'e_yamiuta'], hoto: 320, ketsu: 16, sprite: 'boss_chouchounomukuro.png', desc: '亡者町の中心に居座る、かつての長の骸。今も町の名を呼び続け、誰も答えぬ点呼を取っている。' },
  { id: 'boss_maeburenokage', name: '前触れの影', element: 'moon', tier: 5, hp: 1100, atk: 62, def: 44, agi: 20, skillIds: ['e_kurayami', 'e_yamiuta', 'e_hoshikui'], hoto: 350, ketsu: 18, sprite: 'boss_maeburenokage.png', desc: '玄冬前庭に落ちる、誰のものでもない影。灯ノ御山の頂で待つ者の気配が、ここまで及んでいる証だという。' },
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
