import type { God } from '../types'

// ============================================================
// 中つ星(rank2)増員分 — 職人と芸事の星々(GDD_v3 §1: 最終36柱)
// 初期10柱は gods.ts に残る。中つ星の流儀: 一芸に秀でた働き者の神々。
// 神授技は共有の系統技 gs_{element}2(GDD_v3 §3)。
// ============================================================

export const GODS_MID: God[] = [
  {
    id: 'tsumujikaze', name: '旋風太夫', kana: 'つむじかぜだゆう', rank: 2, element: 'wind',
    statBias: { agi: 22, dex: 10 }, cost: 230, skillId: 'gs_wind2',
    personality: '舞えば風が立つ芸の人',
    desc: '天の芝居小屋の看板役者。袖を翻せば旋風が立ち、見得を切れば雲が割れる。「芸は風。掴めぬから、美しい」',
    pactLines: ['よくぞこの太夫に声をかけた。良い目利きだ。……子の初舞台、必ず観に行く。', '千秋楽の口上より緊張するね、契りってのは。……悪くない。'],
    portrait: 'god_tsumujikaze.png',
  },
  {
    id: 'inamura', name: '稲叢主', kana: 'いなむらぬし', rank: 2, element: 'earth',
    statBias: { vit: 22, str: 10 }, cost: 220, skillId: 'gs_earth2',
    personality: '実りを積み上げる寡黙な大男',
    desc: '刈り取った稲を叢に積む収穫の星。積んだ稲叢は千年崩れない。喋らないが、実りの重さで気持ちを伝える。',
    pactLines: ['(黙って、今年一番の稲穂を差し出された)', '(稲叢の上に招かれた。星がよく見える。……これが返事らしい)'],
    portrait: 'god_inamura.png',
  },
  {
    id: 'kamahen', name: '窯変殿', kana: 'かまへんどの', rank: 2, element: 'fire',
    statBias: { dex: 20, mnd: 12 }, cost: 240, skillId: 'gs_fire2',
    personality: '窯の中の奇跡を待つ陶工',
    desc: '天の登り窯を焚く陶工の星。狙って出せない釉薬の奇跡「窯変」を千年追い続ける。「思い通りにならんから、窯は面白い」',
    pactLines: ['子というのは窯変よ。親の思い通りには焼き上がらん。……そこが宝じゃ。', 'お前の家の子らは皆、良い土だ。儂の火を入れれば、良い器になる。'],
    portrait: 'god_kamahen.png',
  },
  {
    id: 'hoshiuri', name: '星売り', kana: 'ほしうり', rank: 2, element: 'star',
    statBias: { luk: 20, dex: 12 }, cost: 250, skillId: 'gs_star2',
    personality: '夜空の行商人、商売上手',
    desc: '天秤棒に星を吊るして売り歩く行商の星。「安いよ安いよ、一番星が二文だよ」——だが本当に良い星は、金では売らない。',
    pactLines: ['あんたには特別だ。銭は要らん。……代わりに、子の名を呼ぶ声を聞かせな。', '良い星が入った。あんたの子に、のしを付けてやるよ。'],
    portrait: 'god_hoshiuri.png',
  },
  {
    id: 'yozora', name: '夜空繕い', kana: 'よぞらつくろい', rank: 2, element: 'star',
    statBias: { mnd: 20, dex: 12 }, cost: 260, skillId: 'gs_star2',
    personality: '空の穴を繕う仕立て屋',
    desc: '玄冬が星を喰った痕——夜空の穴を、針と糸で繕う仕立て屋の星。繕い目は天の川に紛れて、誰も気づかない。',
    pactLines: ['空の穴はね、放っておくと広がるの。家の穴も同じ。……だから私は縫うわ。', 'あなたの家の空、この前こっそり繕っておいた。もう隙間風は入らない。'],
    portrait: 'god_yozora.png',
  },
  {
    id: 'shiosai', name: '潮騒法師', kana: 'しおさいほうし', rank: 2, element: 'water',
    statBias: { mnd: 18, vit: 14 }, cost: 210, skillId: 'gs_water2',
    personality: '波音で経を読む説法上手',
    desc: '浜の波音に経を乗せる法師星。説法は眠くなるのが常だが、この法師の波音説法だけは、眠ってもご利益がある。',
    pactLines: ['寄せる波も引く波も、みな読経。あなたの家の営みも、みな祈りですよ。', '(波音がしばらく続いた。……なぜか、心が軽い)'],
    portrait: 'god_shiosai.png',
  },
  {
    id: 'mochitsuki', name: '望月搗き', kana: 'もちつき', rank: 2, element: 'moon',
    statBias: { str: 18, vit: 14 }, cost: 220, skillId: 'gs_moon2',
    personality: '月で餅を搗く兎の親方',
    desc: '満月の臼で餅を搗く兎の親方星。月裏兎とは幼馴染だが「あいつは薬、俺は餅。効くのは餅」と譲らない。',
    pactLines: ['契りの祝いだ、搗きたてを持ってけ! 月の餅は腹持ちが千年違うぞ。', 'おう、また来たか! 杵を持て、手伝え! 話はそれからだ!'],
    portrait: 'god_mochitsuki.png',
  },
  {
    id: 'kumobiki', name: '雲曳き', kana: 'くもびき', rank: 2, element: 'wind',
    statBias: { vit: 18, agi: 14 }, cost: 200, skillId: 'gs_wind2',
    personality: '空を掃除する牛飼いの星',
    desc: '大きな雲を曳いて夜空を掃除する牛飼い星。彼が通った後の空は星がよく見える。牛の名は「のろ」。歩みは遅いが、必ず着く。',
    pactLines: ['のろの歩みでいい。着けばいい。……子育ても、そういうもんだ。', '今夜はあんたの家の上の空、綺麗に掃いといた。星がよう見えるぞ。'],
    portrait: 'god_kumobiki.png',
  },
]

// 弔いの文(中つ星増員分)
export const MOURNING_MID: Record<string, string> = {
  tsumujikaze: '「今夜の舞台は休演にした。太夫が舞えば風が立つ。……今夜の風は、しょっぱくなるからね」',
  inamura: '(稲叢の上に、小さな稲穂の人形がひとつ、そっと置かれていた。あの子の背丈と、同じ高さに)',
  kamahen: '「あの子という器は、窯変じゃった。二度と同じものは焼けん。……だから儂は、割れた欠片も全部拾う」',
  hoshiuri: '「今日は店じまいだ。……一番良い星をな、タダで置いてきちまったんだ。あの子の枕元に。商売あがったりだよ」',
  yozora: '「空にまた、小さな穴があいたわ。……ええ、繕うわよ。でも今夜だけは、開けたままにしておくの。星がひとつ、通るから」',
  shiosai: '「今夜の波音は、あの子の名を読んでおります。寄せて、引いて、また寄せて。……経とは、そういうものです」',
  mochitsuki: '「今夜の餅は、しょっぱくてかなわん。……うるさい、泣いてなんかいるか。杵が重いだけだ。……あの子の分も、供えといた」',
  kumobiki: '「のろが、歩かないんだ。あの子によく草をもらってたから。……今夜はここで野宿するよ。あの子の家がよく見える空でな」',
}
