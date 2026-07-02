import type { God } from '../types'

// ============================================================
// 上つ星(rank3)増員分 — 天の官人・大いなる自然の星々(GDD_v3 §1: 最終28柱)
// 初期7柱は gods.ts に残る。上つ星の流儀: 世界の仕組みを預かる高位の神々。
// 神授技は共有の系統技 gs_{element}3(GDD_v3 §3)。
// ============================================================

export const GODS_HIGH: God[] = [
  {
    id: 'yumihari', name: '弓張月夜', kana: 'ゆみはりつくよ', rank: 3, element: 'moon',
    statBias: { dex: 26, agi: 16 }, cost: 460, skillId: 'gs_moon3',
    personality: '半月を弓に引く女武神',
    desc: '弓張月そのものを弓として引く月の女武神。彼女の矢は千年に一度しか放たれない——外れたことも、一度もない。',
    pactLines: ['弓は引き絞る時間が長いほど、遠くへ届く。八季という短さを、引き絞りなさい。', 'あなたの家の子らの目は良い。的を、見誤らない目よ。'],
    portrait: 'god_yumihari.png',
  },
  {
    id: 'yoimachi', name: '宵待の君', kana: 'よいまちのきみ', rank: 3, element: 'moon',
    statBias: { mnd: 26, luk: 16 }, cost: 440, skillId: 'gs_moon3',
    personality: '「待つ」ことを司る貴人',
    desc: '天で「待つこと」を司る貴人。恋文の返事も、旅人の帰りも、夜明けも——待たれているものは皆、この君の袖の内で守られている。',
    pactLines: ['千年、朝を待つ郷。……美しいと思っていたよ、ずっと。共に待とう。', '待つのは受け身ではない。最も強い祈りの形だ。あなたの家がその証。'],
    portrait: 'god_yoimachi.png',
  },
  {
    id: 'toudai', name: '燈台大臣', kana: 'とうだいのおとど', rank: 3, element: 'fire',
    statBias: { str: 22, mnd: 20 }, cost: 470, skillId: 'gs_fire3',
    personality: '天の燈台を預かる大臣',
    desc: '星々の航路を照らす天の大燈台を預かる大臣。大燈籠は、千年前にこの大臣が汐里へ火を分けた、その末の灯である。',
    pactLines: ['汐里に火を分けた日のことは、よく覚えている。……良い火の使い手の家系だ。', '灯を守る者に、位の上下はない。おぬしらも儂も、同じ灯守よ。'],
    portrait: 'god_toudai.png',
  },
  {
    id: 'unabara', name: '海原つ司', kana: 'うなばらつかさ', rank: 3, element: 'water',
    statBias: { vit: 24, mnd: 18 }, cost: 450, skillId: 'gs_water3',
    personality: '海流を司る大いなる司',
    desc: '世界の海流を束ねる司。潮の満ち引きは彼女の呼吸である。「一族の血潮も、寄せて引いて、また寄せるもの」',
    pactLines: ['血潮、という言葉を作ったのは私よ。血は潮。引いても、必ず満ちる。', 'あなたの家の八季は、私の一呼吸。……短い? いいえ。深いのよ。'],
    portrait: 'god_unabara.png',
  },
  {
    id: 'yamanami', name: '山並の大人', kana: 'やまなみのうし', rank: 3, element: 'earth',
    statBias: { vit: 28, str: 14 }, cost: 460, skillId: 'gs_earth3',
    personality: '山脈を寝かしつける巨人',
    desc: '夜ごと山脈を寝かしつけて回る巨人星。山が寝返りを打てば地震になる——ならないのは、この大人の子守のおかげ。',
    pactLines: ['山を寝かせる手だ。子の寝かしつけなど、造作もない。', 'お前の家の子は皆、寝相が良い。……儂が夜ごと、直しに行っとるからな。'],
    portrait: 'god_yamanami.png',
  },
  {
    id: 'fuhaku', name: '風伯', kana: 'ふうはく', rank: 3, element: 'wind',
    statBias: { agi: 28, dex: 14 }, cost: 480, skillId: 'gs_wind3',
    personality: '八方の風を統べる古参',
    desc: '八方の風を統べる最古参の風神。世界中の風はみな彼の孫弟子。燕颪も空風小僧も、頭が上がらない。',
    pactLines: ['儂の血を継ぐ子は、追い風しか知らずに生きる。……それも考えものじゃがの。', '燕颪の奴が世話になっとるようじゃな。あれは良い風になる。お前の子もな。'],
    portrait: 'god_fuhaku.png',
  },
  {
    id: 'ginga', name: '銀漢の渡し守', kana: 'ぎんかんのわたしもり', rank: 3, element: 'star',
    statBias: { luk: 24, mnd: 18 }, cost: 480, skillId: 'gs_star3',
    personality: '天の川の渡し舟の船頭',
    desc: '天の川を渡す舟の船頭。彼の舟に乗れるのは、会いたい者が対岸にいる者だけ。「渡し賃? 会いたい気持ちで結構」',
    pactLines: ['渡し舟から見た郷の大燈籠は、天の川のどの星より温かい色をしとる。', 'いつかお前の家の誰かが、儂の舟で対岸の家族に会いに来る。……その日まで、達者でな。'],
    portrait: 'god_ginga.png',
  },
]

// 弔いの文(上つ星増員分)
export const MOURNING_HIGH: Record<string, string> = {
  yumihari: '「今夜、千年ぶりに矢を放った。あの子の魂が迷わぬよう、道を照らす光の矢を。……私の矢は、外れない」',
  yoimachi: '「あの子が最期に待っていたものを、教えてあげよう。『次の子の産声』だ。……ああ、間に合ったとも。私が保証する」',
  toudai: '「天の燈台に、今夜ひとつ火を足した。あの子の灯だ。これからは航路を照らす側よ。……良い出世であろう」',
  unabara: '「今日、世界中の潮が一斉に引いた。数瞬だけ。……海が、あの子に頭を下げたのよ」',
  yamanami: '「今夜は山を寝かしつけながら、あの子の話をしてやった。山がみな、静かに聞いておった。……良い子守唄になったよ」',
  fuhaku: '「八方の風に命じた。あの子の家の上では、優しく吹け、と。……千年、この命令は解かん」',
  ginga: '「あの子を舟に乗せたよ。渡し賃を聞いたら『家族にまた会いたい』と。……釣りが出るほどの、渡し賃だった」',
}
