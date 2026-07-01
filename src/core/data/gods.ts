import type { God } from '../types'

// 星神十二柱 — 星契りの相手。位が高いほど強い血潮を授ける。
export const GODS: God[] = [
  {
    id: 'ishiusu', name: '石臼翁', kana: 'いしうすのおきな', rank: 1, element: 'earth',
    statBias: { vit: 22, str: 10 }, cost: 80, skillId: 'g_iwakura',
    personality: '頑固一徹、孫には甘い',
    desc: '郷の石臼に千年宿る星の翁。挽いた粉で作る団子は絶品。「儂の孫は転ばん。転んでも泣かん」',
    pactLines: ['ふん、儂の血が欲しいか。……よかろう、丈夫な子になるぞ。', 'また来たか。……団子を食っていけ。子の話はそれからじゃ。'],
    portrait: 'god_ishiusu.png',
  },
  {
    id: 'tsubame', name: '燕颪', kana: 'つばめおろし', rank: 1, element: 'wind',
    statBias: { agi: 22, dex: 10 }, cost: 80, skillId: 'g_tsubame',
    personality: '義理堅い旅烏',
    desc: '南から北へ、星の間を渡る燕の神。一宿一飯の恩は千年忘れない。「借りは返す。それが渡り者の流儀だ」',
    pactLines: ['あんたの家系には昔、世話になった。この借り、子で返すぜ。', 'また会ったな。あんたの家の子は、みんな良い目をしてる。'],
    portrait: 'god_tsubame.png',
  },
  {
    id: 'shimihime', name: '紙魚姫', kana: 'しみひめ', rank: 1, element: 'moon',
    statBias: { dex: 16, mnd: 16 }, cost: 90, skillId: 'g_kamifubuki',
    personality: '本の虫、綴の幼馴染',
    desc: '家譜の紙の間に棲む小さな女神。千年分の家譜を全て読んでいる。「あなたの曾祖母の辞世、私、大好きなの」',
    pactLines: ['家譜の続き、私にも書かせてくれる? ……子という名の頁を。', '綴には内緒よ。あの人、私が頁を折ると怒るんだから。'],
    portrait: 'god_shimihime.png',
  },
  {
    id: 'chidori', name: '澪標千鳥', kana: 'みおつくしちどり', rank: 2, element: 'water',
    statBias: { mnd: 20, vit: 12 }, cost: 200, skillId: 'g_miobiki',
    personality: '迷い船の導き手、なのに方向音痴',
    desc: '夜の海で迷う船を導く星。本人は郷への道をよく間違える。「導きの星が迷ってどこが悪いの」',
    pactLines: ['迷わない子を産みましょう。私の分まで、まっすぐ歩ける子を。', 'あら、また迷ってここへ? ……ふふ、私たち似た者同士ね。'],
    portrait: 'god_chidori.png',
  },
  {
    id: 'kagaribi', name: '篝火乙女', kana: 'かがりびおとめ', rank: 2, element: 'fire',
    statBias: { str: 18, dex: 14 }, cost: 220, skillId: 'g_ryougen',
    personality: '照れると物理的に燃える',
    desc: '祭の篝火に宿る乙女。想いが昂ぶると火柱が立つため、告白された回数だけ郷の火事がある。',
    pactLines: ['ち、契り!? わ、私と!? ……火事になっても知らないから!', '……あなたの顔を見ると、灯が安らぐの。不思議ね。'],
    portrait: 'god_kagaribi.png',
  },
  {
    id: 'yoigumo', name: '宵蜘蛛御前', kana: 'よいぐもごぜん', rank: 2, element: 'moon',
    statBias: { dex: 20, agi: 12 }, cost: 220, skillId: 'g_shibariito',
    personality: '妖しい女怪、実は良妻賢母',
    desc: '宵闇に糸を張る蜘蛛の女神。怖がられるが、その糸で郷の子らの破れた着物を夜な夜な繕っている。',
    pactLines: ['私の糸は千年切れぬ。あなたとの縁も、そういうことよ。', '子らの着物、また破けていたわね。……直しておいたから。'],
    portrait: 'god_yoigumo.png',
  },
  {
    id: 'yukiango', name: '雪安居', kana: 'ゆきあんご', rank: 2, element: 'water',
    statBias: { mnd: 18, dex: 14 }, cost: 240, skillId: 'g_yukiakatsuki',
    personality: '無口な雪僧、字が美しい',
    desc: '雪山で座禅を組み続ける僧形の星。喋らぬ代わりに雪面に字を書く。その筆跡は綴すら唸る。',
    pactLines: ['(雪面に「良縁」と書いてある)', '(雪面に「子は宝」と書いてある。少し照れているようだ)'],
    portrait: 'god_yukiango.png',
  },
  {
    id: 'tsukiura', name: '月裏兎', kana: 'つきうらのうさぎ', rank: 2, element: 'moon',
    statBias: { mnd: 22, luk: 10 }, cost: 260, skillId: 'g_hiyaku',
    personality: '月の裏の薬師、皮肉屋',
    desc: '月の裏側で薬を搗く兎の神。「不老不死の薬? 作れるけど、あんたらの八季が愛おしいのはそのせいでしょ」',
    pactLines: ['薬より効くものを教えてあげる。……家族よ。癪だけど本当なの。', 'あんたの子に苦い薬は要らないわね。私の血が入るんだから。'],
    portrait: 'god_tsukiura.png',
  },
  {
    id: 'orihime', name: '織姫野分', kana: 'おりひめのわき', rank: 3, element: 'wind',
    statBias: { dex: 24, agi: 18 }, cost: 450, skillId: 'g_tachinui',
    personality: '風を織る姫、せっかち',
    desc: '野分(台風)の風で錦を織る天の織り手。仕事が速すぎて暇を持て余し、暇すぎて夜藪の雲を千切って遊ぶ。',
    pactLines: ['契る? いいわ、早くしましょ。私、待つのは嫌いなの。', 'あなたの一族の機の音、天まで聞こえてるのよ。良い音。'],
    portrait: 'god_orihime.png',
  },
  {
    id: 'ookuma', name: '大熊星辰', kana: 'おおくませいしん', rank: 3, element: 'earth',
    statBias: { str: 26, vit: 16 }, cost: 500, skillId: 'g_fundogeki',
    personality: '熊の荒神、子煩悩',
    desc: '北天に座す大熊の星。怒れば山が割れるが、子熊(と一族の子ら)の前では地面に転がって腹を見せる。',
    pactLines: ['ガハハ! 俺の子か! 良いぞ、山より強い子にしてやる!', 'おう、また来たか! 前の子は元気か? 爪は伸びてないか?'],
    portrait: 'god_ookuma.png',
  },
  {
    id: 'narukami', name: '鳴神太鼓', kana: 'なるかみだいこ', rank: 3, element: 'star',
    statBias: { str: 22, agi: 20 }, cost: 550, skillId: 'g_yakumo',
    personality: '祭り好きの雷神',
    desc: '雷鳴を太鼓で打ち鳴らす星神。郷の祭の夜は必ず晴れる — 本人が観に来ているからである。',
    pactLines: ['契りだと? そいつは祭りだ! 太鼓を鳴らせ、酒を持てい!', 'お前んとこの祭囃子、俺のより良い音がする。悔しいから契る!'],
    portrait: 'god_narukami.png',
  },
  {
    id: 'hokushin', name: '北辰老', kana: 'ほくしんろう', rank: 4, element: 'star',
    statBias: { str: 18, vit: 18, dex: 18, agi: 18, mnd: 18, luk: 18 }, cost: 1200, skillId: 'g_hokushin',
    personality: '北極星の翁、動かざる者',
    desc: '千年動かず夜空の軸であり続けた最古の星。汐里の楽を千年聴き続けた唯一の証人。「あの娘の唄を、終わらせてやってくれ」',
    pactLines: ['……千年、待った。お前たちの誰かが、ここへ届くのを。', 'わしの血は重いぞ。それでも継ぐか。……良い目じゃ。'],
    portrait: 'god_hokushin.png',
  },
]

export function godById(id: string): God {
  const g = GODS.find((x) => x.id === id)
  if (!g) throw new Error(`unknown god: ${id}`)
  return g
}
