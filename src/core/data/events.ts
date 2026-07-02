import type { EventDef } from '../expedition'

// ============================================================
// 夜藪の事件・増員分(GDD_v3 §1: 最終180) — 初期8件は expedition.ts に残る。
// 書式は既存準拠: 宣言的outcomes(成功/失敗)、賭けはsuccessRate、対価はrequireHoto。
// 原則(GDD_v3): 理不尽なし — 失敗しても物語として納得でき、全損はさせない。
// ============================================================

export const EXTRA_EVENTS: EventDef[] = [
  {
    id: 'tabibito_haka',
    text: '苔むした小さな墓が立っている。刻まれた名は読めないが、誰かが最近まで花を供えていた形跡がある。',
    choices: [
      { label: '花を手向けて祈る', outcomes: [{ log: '祈りを捧げた。ふと、袖に奉燈が重い。墓の主の礼らしい。', hoto: 25, fame: 2 }] },
      { label: '通り過ぎる', outcomes: [{ log: '静かに一礼だけして通り過ぎた。' }] },
    ],
  },
  {
    id: 'hotaru_kawa',
    text: '常夜に蛍の川が流れている。死者の灯とも、星の子とも言う。掬えば何かが宿るかもしれない。',
    choices: [
      { label: '両手で掬う', successRate: 0.65, outcomes: [{ log: '蛍が掌で珠になった。温かい。', ketsu: 3 }, { log: '蛍は指の間をすり抜けた。……綺麗だったから、良し。', light: 5 }] },
      { label: '眺めるだけにする', outcomes: [{ log: 'しばし見惚れた。心が軽くなった。', hpRatio: 0.1 }] },
    ],
  },
  {
    id: 'wasuremono_kasa',
    text: '道の真ん中に、真新しい唐傘が開いて置いてある。夜露はないのに、傘の下だけ乾いている。',
    choices: [
      { label: '傘の下で休む', successRate: 0.6, outcomes: [{ log: '不思議と疲れが取れた。傘は礼のように一度回って消えた。', hpRatio: 0.2 }, { log: '傘が浪人に化けた! 一戦交える羽目に。', battle: true }] },
      { label: '関わらない', outcomes: [{ log: '傘はいつまでもこちらを「見て」いた。' }] },
    ],
  },
  {
    id: 'kobito_ichiba',
    text: '木の根の間で、小さき者たちが市を開いている。人には見えぬはずの市が、なぜか今夜は見える。',
    choices: [
      { label: '奉燈で買い物する', requireHoto: 30, outcomes: [{ log: '豆粒ほどの品を買った。持ち帰ると、良い品に化けた。', hoto: -30, itemTier: 2 }] },
      { label: '冷やかして回る', outcomes: [{ log: '小さき者らに笑われたが、道中の噂話を聞けた。', fame: 3 }] },
    ],
  },
  {
    id: 'sakasa_taki',
    text: '水が下から上へ流れる逆さ滝。滝壺(滝口?)に何かが光っている。登って取るのは骨だ。',
    choices: [
      { label: '登って取る', successRate: 0.55, outcomes: [{ log: '光の正体は血珠の塊だった!', ketsu: 4 }, { log: '滝に弾かれ、したたかに打った。', hpRatio: -0.2 }] },
      { label: '無理はしない', outcomes: [{ log: '逆さ滝に一礼して先へ。無理をしないのも強さだ。' }] },
    ],
  },
  {
    id: 'yobu_koe',
    text: '藪の奥から、死んだはずの家族の声がする。「こっちだよ」と。声は優しく、懐かしい。',
    choices: [
      { label: '声を追う', successRate: 0.5, outcomes: [{ log: '声の主は形見の残り香だった。遺品を見つけた。', itemTier: 1, fame: 2 }, { log: '魔性の擬態だった! 血の気が引く。', battle: true }] },
      { label: '「もう逝け」と告げる', outcomes: [{ log: '声は少し泣いて、消えた。……正しい別れだった。', light: 8, fame: 3 }] },
    ],
  },
  {
    id: 'hoshi_no_ido',
    text: '涸れ井戸の底に星が一つ落ちている。弱っているが、まだ瞬いている。',
    choices: [
      { label: '井戸に降りて助ける', successRate: 0.7, outcomes: [{ log: '星は礼を言い、夜空へ帰った。灯が力強くなった。', light: 18, fame: 4 }, { log: '足を滑らせた。星は自力で飛んでいった。薄情な。', hpRatio: -0.15 }] },
      { label: '綱を垂らすだけ垂らす', outcomes: [{ log: '星は綱を伝って出てきた。小さく瞬いて礼をした。', light: 8 }] },
    ],
  },
  {
    id: 'nokosare_bento',
    text: '切り株の上に、竹皮包みの弁当がある。まだ温かい。持ち主の姿はどこにもない。',
    choices: [
      { label: 'ありがたく食べる', successRate: 0.75, outcomes: [{ log: '沁みる旨さ。誰かの「置き弁」の風習らしい。', hpRatio: 0.25 }, { log: '食べた直後、持ち主(魔性)が戻ってきた!', battle: true }] },
      { label: '手を付けない', outcomes: [{ log: '横に小石を置いて「見た」印だけ残した。' }] },
    ],
  },
  {
    id: 'kagami_numa',
    text: '底なしの鏡沼。水面に映るのは今の自分ではなく、「なりたかった自分」だという。',
    choices: [
      { label: '覗き込む', outcomes: [{ log: '水面の自分は、少しだけ笑っていた。……悪くない。心が定まる。', hpRatio: 0.15, fame: 2 }] },
      { label: '石を投げて壊す', outcomes: [{ log: '波紋の下から魔性が顔を出した!', battle: true }] },
    ],
  },
  {
    id: 'michikusa_uma',
    text: '夜藪に馬がいる。鞍には行商の荷。主を探すそぶりで、こちらの袖を噛んで引く。',
    choices: [
      { label: 'ついて行く', successRate: 0.65, outcomes: [{ log: '倒れた行商人を発見、介抱した。荷の一部を礼にくれた。', hoto: 45, fame: 3 }, { log: '行商人はすでに事切れていた。せめて荷を郷へ届けよう。', hoto: 20, fame: 5 }] },
      { label: '馬だけ郷へ帰す', outcomes: [{ log: '馬の尻を叩いて郷へ走らせた。あとで礼があるだろう。', fame: 2 }] },
    ],
  },
  {
    id: 'ehon_no_kire',
    text: '絵本の頁が一枚、枝に引っかかっている。描かれた鬼が、頁の中で震えている。「破らないで」と聞こえた。',
    choices: [
      { label: '頁を懐にしまう', outcomes: [{ log: '鬼は安堵した。以後、道中の魔性が妙に及び腰だ。鬼が睨みを利かせているらしい。', light: 10 }] },
      { label: '風に返す', outcomes: [{ log: '頁は飛んでいった。遠くで「ありがとう」と小さく。', fame: 1 }] },
    ],
  },
  {
    id: 'shinboku_taore',
    text: '雷に裂かれた神木が倒れている。樹皮の下で、宿っていた小さな神が潰されかけている。',
    choices: [
      { label: '総出で持ち上げる', successRate: 0.6, outcomes: [{ log: '小神を救い出した。「恩は星に代えて返す」と消えた。', ketsu: 3, fame: 5 }, { log: '幹はびくともしない。だが隙間を掘って救い出した。皆、泥だらけ。', fame: 5, hpRatio: -0.1 }] },
      { label: '手を合わせるだけ', outcomes: [{ log: '祈った。神木の最期の葉が一枚、掌に落ちた。', itemTier: 1 }] },
    ],
  },
  {
    id: 'yozakura',
    text: '常夜に咲く夜桜が一本。散った花びらが地面に着く前に、灯のように仄かに光る。',
    choices: [
      { label: '花見をする', outcomes: [{ log: '短い宴。誰かが唄い、誰かが泣いた。良い夜だ。', hpRatio: 0.2, light: 6 }] },
      { label: '花びらを集める', outcomes: [{ log: '光る花びらを袋に詰めた。薬師が高く買うだろう。', hoto: 35 }] },
    ],
  },
  {
    id: 'ishi_jizo',
    text: '首の欠けた石地蔵。傍らに、欠けた首が転がっている。誰かが乗せ直すのを待っているようだ。',
    choices: [
      { label: '首を乗せ直す', outcomes: [{ log: '地蔵の顔がほんのり笑った。……見間違いではないと思う。', fame: 3, light: 8 }] },
      { label: '拝んで通る', outcomes: [{ log: '首なしのまま拝まれた地蔵は、少し寂しそうだった。' }] },
    ],
  },
  {
    id: 'takara_no_chizu',
    text: '骸の握る手に、古い絵図。「三歩、灯の消える方へ」とだけ読める。',
    choices: [
      { label: '絵図に従う', successRate: 0.55, outcomes: [{ log: '土中から先人の埋蔵金!', hoto: 70 }, { log: '掘り当てたのは空の甕。中に「はずれ」の木札。誰の悪戯だ。', light: -6 }] },
      { label: '骸を弔い絵図は燃やす', outcomes: [{ log: '「宝より弔いを選んだか」と風が笑った気がした。', fame: 4 }] },
    ],
  },
  {
    id: 'kitsune_yomeiri',
    text: '狐の嫁入り行列に出くわした。提灯の列が延々と続く。横切るのは無礼、待つのは長い。',
    choices: [
      { label: '祝いの奉燈を包む', requireHoto: 20, outcomes: [{ log: '狐たちは喜び、行列は道を開けた。祝い返しまでくれた。', hoto: -20, ketsu: 2, light: 10 }] },
      { label: '列の後ろで待つ', outcomes: [{ log: '長い行列だった……。灯が少し細ったが、花嫁狐が会釈をくれた。', light: -8, fame: 2 }] },
    ],
  },
  {
    id: 'furin_no_ki',
    text: '無数の風鈴が下がる木。風もないのに、一つだけ鳴っている。呼んでいるのだろうか。',
    choices: [
      { label: '鳴る風鈴に触れる', outcomes: [{ log: '風鈴は澄んだ音を残して砕けた。中から小さな珠。', ketsu: 2 }] },
      { label: '耳を澄ませる', outcomes: [{ log: '音は道順を教えていた。近道を見つけた。', light: 12 }] },
    ],
  },
  {
    id: 'nurikabe_michi',
    text: '見えない壁に道を塞がれた。押しても引いてもびくともしない。壁のくせに、少し息遣いがする。',
    choices: [
      { label: '壁の下を蹴る(古来の作法)', successRate: 0.7, outcomes: [{ log: '「痛っ」と声がして壁は退いた。作法は正しかった。', fame: 2 }, { log: '作法が古すぎたらしい。怒った壁と一戦。', battle: true }] },
      { label: '迂回する', outcomes: [{ log: '大回りして灯が細った。', light: -10 }] },
    ],
  },
  {
    id: 'hina_nagashi',
    text: '小川を雛人形が流れてくる。厄を乗せて流された雛だ。拾えば厄ごと拾うと言うが……雛は、泣いている気がする。',
    choices: [
      { label: '拾って厄ごと引き受ける', successRate: 0.5, outcomes: [{ log: '雛は微笑んだ。厄は……何も起きない。優しさが厄を解いたか。', fame: 6, itemTier: 2 }, { log: '厄が来た! 灯が大きく揺れる。だが雛は救われた顔をしている。', light: -15, fame: 6 }] },
      { label: '流れに任せる', outcomes: [{ log: '雛は流れていった。それが、雛の役目ではある。' }] },
    ],
  },
  {
    id: 'yamainu_oyako',
    text: '山犬の親子が道を塞ぐ。母犬は傷つき、仔犬が威嚇してくる。腹を空かせているだけのようだ。',
    choices: [
      { label: '兵糧を分ける', outcomes: [{ log: '親子は食べ、頭を下げるように一鳴きして森へ。以後、遠吠えが魔性を遠ざけてくれる。', light: 14 }] },
      { label: '刺激せず離れる', outcomes: [{ log: 'そっと離れた。仔犬の威嚇は最後まで勇敢だった。' }] },
    ],
  },
  {
    id: 'kanashibari_zaka',
    text: '坂の途中で、隊全員の足が動かなくなった。金縛りの坂だ。坂の主が「通行料」を待っている。',
    choices: [
      { label: '奉燈を置く', requireHoto: 25, outcomes: [{ log: '足が軽くなった。坂の上から「まいど」と声。', hoto: -25 }] },
      { label: '力ずくで進む', successRate: 0.6, outcomes: [{ log: '気合で振りほどいた! 坂の主が「近頃の若いもんは」とぼやく。', fame: 3 }, { log: '踏ん張りすぎて筋を痛めた。', hpRatio: -0.15 }] },
    ],
  },
  {
    id: 'hoshizukiyo_utage',
    text: '星神たちの宴の残り火に出くわした。誰もいないが、膳が並び、酒が満ち、まだ温かい。',
    choices: [
      { label: '相伴に与る', successRate: 0.65, outcomes: [{ log: '神々の残り物は五臓六腑に沁みた。', hpRatio: 0.3 }, { log: '食べ過ぎた。動きが鈍い。だが後悔はない。', hpRatio: 0.15, light: -6 }] },
      { label: '膳を整えて去る', outcomes: [{ log: '片付けだけして去った。後日、星から礼の文が届くという。', fame: 5 }] },
    ],
  },
  {
    id: 'sutebune',
    text: '藪の中に、なぜか川舟が捨てられている。舟板に「御山まで 三人乗り」と彫ってある。川はない。',
    choices: [
      { label: '乗ってみる', successRate: 0.5, outcomes: [{ log: '舟は藪の上をひと駆けし、ずいぶん先まで運んでくれた!', light: 20 }, { log: '舟はびくともしない。ただの捨て舟だった。……彫り書きは何なんだ。' }] },
      { label: '薪にする', outcomes: [{ log: '罰当たりな気もしたが、良い薪になった。', light: 10 }] },
    ],
  },
  {
    id: 'warabe_uta',
    text: 'どこからか童唄が聞こえる。「とおりゃんせ」に似て、少し違う。歌詞が、帰り道を教えている気がする。',
    choices: [
      { label: '唄を覚えて従う', outcomes: [{ log: '唄の通りに歩くと、安全な道に出た。', light: 15 }] },
      { label: '唄い返す', outcomes: [{ log: '藪の奥で、嬉しそうな笑い声。小さな贈り物が置かれていた。', ketsu: 2 }] },
    ],
  },
  {
    id: 'oni_no_wasuremono',
    text: '巨大な金棒が地面に刺さっている。鬼の忘れ物だ。持ち主が取りに戻る前に、どうする。',
    choices: [
      { label: '引き抜いてみる', successRate: 0.45, outcomes: [{ log: '抜けた! 溶かせば良い鉄になる。', hoto: 55, fame: 4 }, { log: '抜けない上に、戻ってきた鬼と鉢合わせ!', battle: true }] },
      { label: '触らぬ神に祟りなし', outcomes: [{ log: '後刻、取りに戻った鬼が「触られなかった」ことに満足げだったという。' }] },
    ],
  },
  {
    id: 'amayadori_dou',
    text: '突然の夜雨。小さなお堂が一つ。先客がいる——蓑を着た大きな影が、黙って端に寄って場所を空けた。',
    choices: [
      { label: '隣で雨宿りする', outcomes: [{ log: '影と無言で雨音を聞いた。雨が上がると影は蓑虫親父の使いだったと分かった。土産までくれた。', hpRatio: 0.15, hoto: 15 }] },
      { label: '雨の中を進む', outcomes: [{ log: '濡れ鼠になった。灯も湿気た。', light: -8, hpRatio: -0.05 }] },
    ],
  },
  {
    id: 'sakazuki_kawa',
    text: '川面を盃が流れてくる。上流で誰かが「流し盃」の宴をしている。盃には和歌が添えてある。',
    choices: [
      { label: '返歌を流す', successRate: 0.6, outcomes: [{ log: '上流から歓声。宴の主(風流な魔性)が酒肴を流してくれた。', hpRatio: 0.2, fame: 3 }, { log: '歌が下手だったらしい。川が少し冷たくなった。……傷つく。' }] },
      { label: '盃だけ頂く', outcomes: [{ log: '良い盃だ。蔵の飾りになる。', hoto: 20 }] },
    ],
  },
  {
    id: 'tsuki_no_kakera',
    text: '月の欠片が落ちている。月蝕獣の齧り残しだ。素手で触れば凍るほど冷たい光。',
    choices: [
      { label: '布で包んで持ち帰る', outcomes: [{ log: '月の欠片を手に入れた。薬にも術にもなる逸品。', ketsu: 4 }] },
      { label: '空へ投げ返す', successRate: 0.7, outcomes: [{ log: '欠片は月へ帰っていった。月が礼に道を照らす。', light: 16, fame: 3 }, { log: '届かず落ちてきた。危ない危ない。', hpRatio: -0.05 }] },
    ],
  },
  {
    id: 'mayoiga',
    text: '藪の奥に立派な屋敷——迷い家だ。誰もいない。持ち出した物は福を呼ぶというが、家自体が「試して」いる。',
    choices: [
      { label: '一つだけ頂く', outcomes: [{ log: '椀を一つ頂いた。迷い家は満足したように消えた。福の椀だ。', itemTier: 3 }] },
      { label: '何も取らず一礼して出る', outcomes: [{ log: '出た途端、袖に小判。「欲のない客は初めてだ」と家の声。', hoto: 60 }] },
      { label: '上がり込んで休む', outcomes: [{ log: '囲炉裏で温まった。家が子守唄を歌ってくれた。', hpRatio: 0.3 }] },
    ],
  },
  {
    id: 'kubi_hikoki',
    text: '古戦場跡。折れた旗指物の下で、骸が「まだ戦は終わらぬか」と問うてくる。',
    choices: [
      { label: '「終わった」と告げる', outcomes: [{ log: '骸は「そうか」とだけ言い、崩れて土に還った。安らかに。', fame: 4, light: 6 }] },
      { label: '「我らが引き継いだ」と告げる', outcomes: [{ log: '骸は笑い、自らの刀を差し出して土に還った。', itemTier: 2 }] },
    ],
  },
  {
    id: 'yuki_onna_ko',
    text: '季節外れの冷気。雪女の子どもが迷子になって泣いている。触れれば凍るが、放ってもおけない。',
    choices: [
      { label: '声だけで道案内する', outcomes: [{ log: '雪の子は何度も振り返りながら帰っていった。置き土産に、溶けない氷。', ketsu: 3 }] },
      { label: '上着を貸して送る', successRate: 0.6, outcomes: [{ log: '上着は凍ったが、雪女の母から丁重な礼が届いた。', hoto: 40, fame: 3 }, { log: '送り届けたが、うっかり手が触れて凍傷に。', hpRatio: -0.15, fame: 3 }] },
    ],
  },
  {
    id: 'sennin_shougi',
    text: '岩の上で仙人風の翁が独り将棋を指している。「一手、指してみるか」と盤を差し出された。',
    choices: [
      { label: '一手指す', successRate: 0.5, outcomes: [{ log: '妙手! 翁は膝を打ち、褒美に秘伝の丸薬をくれた。', hpRatio: 0.25, fame: 3 }, { log: '悪手。翁は溜息をつき、それでも茶をくれた。……優しい。', hpRatio: 0.05 }] },
      { label: '観戦する', outcomes: [{ log: '翁の独り将棋は千年目らしい。相手の駒が少し動いた気がした。' }] },
    ],
  },
  {
    id: 'akai_torii',
    text: '朽ちた鳥居が横倒しになっている。潜るべき鳥居を跨ぐことになる。神域の入口だったものだ。',
    choices: [
      { label: '立て直す', successRate: 0.65, outcomes: [{ log: '総出で立て直した。神域の残り香が隊を祝福する。', fame: 5, light: 10 }, { log: '重すぎて断念。だが誠意は届いたらしく、風が優しい。', fame: 2 }] },
      { label: '脇を通る', outcomes: [{ log: '鳥居に触れぬよう、脇を抜けた。' }] },
    ],
  },
  {
    id: 'kemono_michi',
    text: '獣道が二手に分かれる。片方は獣の匂いが濃く、片方は妙に「無臭」だ。無臭の道は、何かがおかしい。',
    choices: [
      { label: '獣の匂いの道', outcomes: [{ log: '獣たちの通り道だった。彼らに倣って安全に抜けた。', light: 8 }] },
      { label: '無臭の道', successRate: 0.5, outcomes: [{ log: '魔性の巣の跡地——空き家だった。残り物を頂く。', hoto: 40, ketsu: 2 }, { log: '巣は空き家ではなかった。', battle: true }] },
    ],
  },
  {
    id: 'kome_dawara',
    text: '米俵が三つ、道端に積んである。「ご自由に」と札。……こんな夜藪の奥で? 罠の匂いもする。',
    choices: [
      { label: 'ありがたく担ぐ', successRate: 0.7, outcomes: [{ log: '本当にただの善意だった。郷の誰かの「置き俵」だ。', hoto: 50 }, { log: '俵の中身は魔性だった!', battle: true }] },
      { label: '一俵だけ頂く', outcomes: [{ log: '慎み深さが吉と出た。俵の陰から「感心感心」と声。', hoto: 25, fame: 2 }] },
    ],
  },
  {
    id: 'e_no_naka',
    text: '巨大な絵馬が木に掛かっている。描かれた景色が本物のように奥行きを持ち、中から水音がする。',
    choices: [
      { label: '絵の中に手を入れる', successRate: 0.55, outcomes: [{ log: '絵の中の川から鮎を掴み取った! 絵の魚は極上の味。', hpRatio: 0.2 }, { log: '絵の中の何かに手を掴まれた! 振りほどいたが冷や汗。', light: -8 }] },
      { label: '絵馬に願いを書き足す', outcomes: [{ log: '「一族安寧」と書いた。絵の中の空が少し明るくなった。', fame: 3 }] },
    ],
  },
  {
    id: 'furudanuki_shibai',
    text: '古狸が一座を組んで芝居をしている。客は狸ばかり。演目は「燈守家の千年」——お前たちの家の話だ。',
    choices: [
      { label: '最後まで観る', outcomes: [{ log: '先祖たちの物語に涙した。狸の演技は真に迫っていた。木戸銭は取られた。', hpRatio: 0.15, fame: 4 }] },
      { label: '「事実と違う」と野次る', outcomes: [{ log: '座長狸が「では取材させろ」と食い下がってきた。次回作が楽しみだ。', fame: 2 }] },
    ],
  },
  {
    id: 'shiroi_hebi',
    text: '白蛇が岩の上でとぐろを巻いている。財の神の使いだ。目が合った。値踏みされている。',
    choices: [
      { label: '奉燈を供える', requireHoto: 40, outcomes: [{ log: '白蛇は満足げに頷き、脱け殻を残して消えた。金運の殻だ。', hoto: -40, itemTier: 3, fame: 3 }] },
      { label: '静かに拝む', outcomes: [{ log: '白蛇は「見逃してやる」という顔で去った。何様……いや、神様か。' }] },
    ],
  },
  {
    id: 'ochiba_no_te',
    text: '落ち葉の山が、ひとりでに手の形を作って「待て」をしている。中に誰かいるのか、葉そのものの意思か。',
    choices: [
      { label: '落ち葉をどける', successRate: 0.6, outcomes: [{ log: '中から冬眠しかけの小さな山神。「起こしてくれて助かった、寝過ごすところだった」', ketsu: 3, fame: 2 }, { log: '中は空だった。手の形は「この先危険」の警告だったらしい。慎重に進む。', light: 6 }] },
      { label: '「待て」に従い迂回', outcomes: [{ log: '素直に迂回した。遠くで落ち葉が拍手のように舞った。', light: -5, fame: 2 }] },
    ],
  },
  {
    id: 'tsuchi_no_ko',
    text: '土の中から槌に似た太い生き物が転がり出てきた。噂に聞く槌の子だ。捕まえれば幸運が来るという。',
    choices: [
      { label: '追いかけて捕まえる', successRate: 0.4, outcomes: [{ log: '捕まえた! ……瞬間、掌からするりと消え、幸運だけが残った。', hoto: 45, ketsu: 3 }, { log: '転がる方が速い。見失った。悔しいが、いい運動になった。', hpRatio: 0.05 }] },
      { label: '道を譲る', outcomes: [{ log: '槌の子はころころ転がっていった。妙に和んだ。' }] },
    ],
  },
  {
    id: 'kaminari_ochiba',
    text: '雷獣が木の上で毛づくろいをしている。鳴神太鼓の眷属だ。落とした毛が、ぱちぱちと帯電している。',
    choices: [
      { label: '毛を拾い集める', successRate: 0.65, outcomes: [{ log: '雷の毛を拾った。痺れたが、良い素材だ。', ketsu: 3, hpRatio: -0.05 }, { log: '雷獣に気づかれた。怒ってはいないが、威嚇の放電で髪が逆立った。', hpRatio: -0.1 }] },
      { label: '太鼓の口真似で挨拶', outcomes: [{ log: '雷獣は「主の知り合いか」という顔で毛を一房分けてくれた。', ketsu: 2, fame: 2 }] },
    ],
  },
  {
    id: 'sakaya_no_kura',
    text: '打ち捨てられた造り酒屋の蔵。中から良い香りがする。百年物の忘れられた酒があるかもしれない。',
    choices: [
      { label: '蔵を探す', successRate: 0.6, outcomes: [{ log: '百年古酒を発見! 一口で生き返る心地。残りは郷へ。', hpRatio: 0.3, hoto: 30 }, { log: '酒は酢になっていた。……酢も貴重だが、夢がない。', hoto: 10 }] },
      { label: '蔵の神に断ってから探す', requireHoto: 15, outcomes: [{ log: '作法が通じた。蔵の神が最良の一本を指し示してくれた。', hoto: -15, hpRatio: 0.3, ketsu: 2 }] },
    ],
  },
  {
    id: 'hagoromo_matsu',
    text: '松の枝に美しい羽衣がかかっている。持ち主は水浴び中らしい。伝承では、隠せば天女は帰れなくなる。',
    choices: [
      { label: '見なかったことにする', outcomes: [{ log: '静かに離れた。背後で水音と、安堵の気配。後日、羽根が一枚届いた。', itemTier: 2, fame: 3 }] },
      { label: '枝の高い所へ掛け直す', outcomes: [{ log: '風で落ちぬよう掛け直した。天女の笑い声が「ありがと」と。', light: 12, fame: 3 }] },
    ],
  },
  {
    id: 'inishie_no_hokora',
    text: '文字が磨滅した古い祠。祀られていた神の名を、もう誰も知らない。祠は、それでも掃き清められるのを待っている。',
    choices: [
      { label: '掃除して祈る', outcomes: [{ log: '名もなき神の気配が、深く深く頭を下げた気がした。', fame: 5, light: 10 }] },
      { label: '名を勝手につけて祀る', outcomes: [{ log: '「灯待さま」と名付けた。祠が明らかに嬉しそうに軋んだ。新しい神が生まれた瞬間かもしれない。', fame: 6 }] },
    ],
  },
  {
    id: 'kawauso_shonin',
    text: '川獺が二本足で立ち、風呂敷を広げて店を開いている。「奥さん、いい茶碗あるよ」……奥さんではない。',
    choices: [
      { label: '茶碗を買う', requireHoto: 25, outcomes: [{ log: '買った茶碗は存外の名品だった。獺の目利きは本物。', hoto: -25, itemTier: 2 }] },
      { label: '値切る', successRate: 0.5, outcomes: [{ log: '交渉成立。半値で名品を手に入れた。獺は「商売上手め」と笑った。', hoto: -12, itemTier: 2 }, { log: '「冷やかしかい!」と水をかけられた。びしょ濡れ。', hpRatio: -0.05 }] },
    ],
  },
  {
    id: 'hi_no_ataranai_hana',
    text: '岩陰に、光の当たらぬ場所でだけ咲く花が群生している。摘めば薬になるが、群生は千年かけて育ったものだ。',
    choices: [
      { label: '少しだけ摘む', outcomes: [{ log: '三本だけ摘んだ。花は残りを揺らして「それでいい」と言うようだった。', ketsu: 2, hpRatio: 0.1 }] },
      { label: '株分けして郷に持ち帰る', successRate: 0.55, outcomes: [{ log: '株分け成功。郷の薬師が泣いて喜ぶだろう。', hoto: 40, fame: 4 }, { log: '株は途中で萎れた。……千年の花は、あの岩陰でしか生きられないのだ。', fame: 1 }] },
    ],
  },
  {
    id: 'tanuki_bayashi',
    text: '腹鼓の音が近づいてくる。狸囃子だ。音に釣られて踊れば仲間と認められるが、踊りには体力を使う。',
    choices: [
      { label: '踊る', outcomes: [{ log: '踊り明かした。疲れたが、狸たちが「祝儀だ」と山の幸をくれた。', hpRatio: -0.1, hoto: 35, ketsu: 2 }] },
      { label: '手拍子だけ打つ', outcomes: [{ log: '手拍子も立派な参加と認められた。囃子が疲れを揉みほぐす。', hpRatio: 0.1 }] },
    ],
  },
  {
    id: 'seki_no_baba',
    text: '関所のような門があり、婆が一人座っている。「通りたくば、いちばん大事なものの名を言え」',
    choices: [
      { label: '家族の名を言う', outcomes: [{ log: '婆は「合格」と頷き、門は開いた。「千年、その答えだけが門を開けてきた」', fame: 4, light: 8 }] },
      { label: '「灯」と言う', outcomes: [{ log: '婆は「惜しい」と笑った。「灯は大事なものを照らすもの。もういっぺん考えな」——考え直して通った。', light: 4 }] },
    ],
  },
  {
    id: 'wata_no_yuki',
    text: '綿雪のようなものが降ってきた。触れると温かい。空を見上げると、大きな白い獣が毛繕いをしている。',
    choices: [
      { label: '毛を集めて綿入れを作る', outcomes: [{ log: '天獣の毛で綿入れが出来た。ほのかに温かい逸品。', itemTier: 2 }] },
      { label: '見上げて手を振る', outcomes: [{ log: '獣は照れたのか、大量の毛を降らせて逃げた。雪まみれ、いや毛まみれ。', hpRatio: 0.1, hoto: 15 }] },
    ],
  },
  {
    id: 'kagerou_ichiza',
    text: '陽炎のように揺らめく旅の一座が通り過ぎていく。最後尾の楽士が、聞き覚えのある子守唄を口ずさんでいる。',
    choices: [
      { label: '唄の出所を尋ねる', outcomes: [{ log: '楽士は「千年前、山の上の女(ひと)に習った」と答え、揺らめいて消えた。家譜に書き加えるべき証言だ。', fame: 6 }] },
      { label: '一緒に口ずさむ', outcomes: [{ log: '唄が重なった一瞬、灯が大きく燃えた。血が、唄を覚えている。', light: 14 }] },
    ],
  },
  {
    id: 'suzuri_no_ike',
    text: '墨のように黒い池。だが濁りではなく、澄んだ黒だ。硯海姫の領地の端らしい。筆を浸せば良い墨が取れる。',
    choices: [
      { label: '墨を汲む', outcomes: [{ log: '極上の墨を得た。綴への良い土産になる。「これで良い辞世が書ける」と喜ぶだろう。少し複雑だ。', hoto: 30, fame: 2 }] },
      { label: '水面に字を書く', outcomes: [{ log: '指で「無事」と書いた。字は沈み、郷の家譜に同じ字が浮かんだという。安否の便りが届いた。', fame: 3 }] },
    ],
  },
  {
    id: 'yotsuji_no_uranai',
    text: '四辻に辻占の翁が座っている。「一族の行く末、観てやろうか。ただし観たものは変えられぬぞ」',
    choices: [
      { label: '観てもらう', outcomes: [{ log: '翁は長く黙り、やがて「……良い終わり方じゃ」とだけ言った。それで十分だった。', fame: 3, hpRatio: 0.1 }] },
      { label: '断る', outcomes: [{ log: '「知らぬまま歩くのも強さよ」と翁は袖から飴をくれた。', hpRatio: 0.05 }] },
    ],
  },
  {
    id: 'hotoke_no_zou',
    text: '倒れた仏像が半ば土に埋もれている。掘り起こすのは大仕事だが、野ざらしは忍びない。',
    choices: [
      { label: '掘り起こして安置する', outcomes: [{ log: '半日がかりで安置した。仏の顔が夕(?)日に映えた——常夜なのに、一瞬、光が差した。', fame: 6, light: 12, hpRatio: -0.1 }] },
      { label: '顔の土だけ払う', outcomes: [{ log: 'せめて顔だけ、と土を払った。仏は微笑んでいた。', fame: 2 }] },
    ],
  },
]
