import type { God, GameData } from '../types'
import { FAME_SEAL_THRESHOLD } from '../constants'
import { GODS_LOW, MOURNING_LOW } from './gods_low'
import { GODS_MID, MOURNING_MID } from './gods_mid'
import { GODS_HIGH, MOURNING_HIGH } from './gods_high'
import { GODS_APEX, MOURNING_APEX } from './gods_apex'

// 星神 — 星契りの相手。位が高いほど強い血潮を授ける。
// 初期24柱は本ファイル(FOUNDING_GODS)、増員分は位階別ファイル(gods_low/mid/high/apex)。
// 結合エクスポートは末尾のGODS/MOURNING(GDD_v3 §5)。
const FOUNDING_GODS: God[] = [
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
  // ---- 第二陣(13〜24柱) ----
  {
    id: 'minomushi', name: '蓑虫親父', kana: 'みのむしのおやじ', rank: 1, element: 'earth',
    statBias: { vit: 18, mnd: 8 }, cost: 85, skillId: 'g_minomushi',
    personality: '出不精の甲斐性なし、だが中は温かい',
    desc: '軒先の蓑に千年籠る星。「外は寒いじゃろ」が口癖。蓑の中には子ども用の綿入れが常備されている。',
    pactLines: ['……蓑から出にゃならんのか? ……子のためなら、まあ、出るか。', 'お前さんとこの子は皆、儂の蓑で昼寝した。良い寝相じゃった。'],
    portrait: 'god_minomushi.png',
  },
  {
    id: 'kaiyose', name: '貝寄せ乙女', kana: 'かいよせおとめ', rank: 1, element: 'water',
    statBias: { luk: 16, mnd: 10 }, cost: 90, skillId: 'g_kaiyose',
    personality: '浜辺の拾いもの上手',
    desc: '貝寄風(かいよせ)の吹く夜、浜の貝殻を集めて回る星。集めた貝には必ず一つ、真珠が混ざっているという。',
    pactLines: ['いい貝殻あげる。耳に当てると、遠い海の音がするの。……契り、する?', 'あなたの家の子の笑い声、貝殻に集めてあるのよ。ほら。'],
    portrait: 'god_kaiyose.png',
  },
  {
    id: 'kagebousi', name: '影法師', kana: 'かげぼうし', rank: 1, element: 'moon',
    statBias: { agi: 18, dex: 10 }, cost: 95, skillId: 'g_kagebousi',
    personality: '無口な影絵の名人',
    desc: '行灯の影から生まれた星。手影絵で郷の子らを笑わせるのが唯一の道楽。狐、兎、それから——先代当主の顔。',
    pactLines: ['(影が狐の形になり、頷いた)', '(影が兎を作って見せてから、そっとお前の影に重なった)'],
    portrait: 'god_kagebousi.png',
  },
  {
    id: 'kazaguruma', name: '風車翁', kana: 'かざぐるまのおきな', rank: 2, element: 'wind',
    statBias: { agi: 20, luk: 10 }, cost: 210, skillId: 'g_kazaguruma',
    personality: '回るものなら何でも好き',
    desc: '八枚羽根の大風車を背負う翁。水車も風車も独楽も、回るものは全て翁の孫弟子。「回っとる間は、倒れんのじゃ」',
    pactLines: ['人生も風車での、止まると倒れる。じゃから回り続けい。……契るか?', 'お前の家の水車、調子良う回っとるな。儂が夜な夜な油を差しとる。'],
    portrait: 'god_kazaguruma.png',
  },
  {
    id: 'yuya', name: '湯屋女将', kana: 'ゆやのおかみ', rank: 2, element: 'water',
    statBias: { vit: 20, str: 12 }, cost: 230, skillId: 'g_yuya',
    personality: '肝っ玉女将、湯加減に厳しい',
    desc: '天の川の源泉で湯屋を営む女神。星神も魔性も、暖簾をくぐれば皆ただの客。「背中、流したげようか?」',
    pactLines: ['うちの湯は傷にも呪いにも効くよ。……あんたの子にも、効くといいねえ。', 'また来たね。タオルは自分で持っといで、って言ったろ!(笑)'],
    portrait: 'god_yuya.png',
  },
  {
    id: 'suzuriumi', name: '硯海姫', kana: 'すずりうみひめ', rank: 2, element: 'moon',
    statBias: { mnd: 20, dex: 12 }, cost: 240, skillId: 'g_suzuriumi',
    personality: '綴の墨の卸元、文人肌',
    desc: '硯の海に棲む姫。綴が千年使う墨は全て彼女の海から汲まれる。「家譜の一字一字に、私の海が入っているのよ」',
    pactLines: ['あなたの家譜、私の墨で書かれているの。つまり——もう家族も同然でしょう?', '良い字を書く子になるわ。墨の濃さでわかるの。'],
    portrait: 'god_suzuriumi.png',
  },
  {
    id: 'kodama', name: '木霊童子', kana: 'こだまどうじ', rank: 2, element: 'earth',
    statBias: { mnd: 18, vit: 12 }, cost: 220, skillId: 'g_kodama',
    personality: '返事が三回返ってくる',
    desc: '山びこの源の童子。呼べば必ず三回返す。悲しい声には、三回とも違う励ましを返してくれる。',
    pactLines: ['契る?(契る? 契る? ……うん!)', 'また来たの?(来たの? 来たの? ……嬉しい!)'],
    portrait: 'god_kodama.png',
  },
  {
    id: 'hanabi', name: '花火師寅次', kana: 'はなびしとらじ', rank: 2, element: 'fire',
    statBias: { str: 20, luk: 12 }, cost: 250, skillId: 'g_hanabi',
    personality: '宵越しの火薬は持たない',
    desc: '星々の間で花火を打ち上げる職人。流れ星の半分は寅次の仕事。「一瞬で消えるから綺麗なんだ。……お前さんらと同じよ」',
    pactLines: ['短え命ほどでかく咲く。お前んとこの子は、俺が保証する。でかい花だ。', 'よう。今夜も一発、祝いに上げてくか。'],
    portrait: 'god_hanabi.png',
  },
  {
    id: 'shigure', name: '時雨紫', kana: 'しぐれのむらさき', rank: 3, element: 'water',
    statBias: { dex: 24, mnd: 14 }, cost: 470, skillId: 'g_shigure',
    personality: '通り雨のような気まぐれ美人',
    desc: '初時雨の化身。彼女が袖を振ると郷に静かな雨が降る。雨音で泣き声を隠してやるのが、千年続けてきた優しさ。',
    pactLines: ['雨は嫌い? ……そう。でも、泣くときに便利よ。誰にも聞こえないから。', 'あなたの家の屋根の雨音、私、千年分覚えているの。'],
    portrait: 'god_shigure.png',
  },
  {
    id: 'noroshi', name: '狼煙彦', kana: 'のろしひこ', rank: 3, element: 'fire',
    statBias: { agi: 22, str: 16 }, cost: 480, skillId: 'g_noroshi',
    personality: '早駆けの伝令神',
    desc: '天と地の間を狼煙で繋ぐ俊足の神。訃報より吉報を運ぶのが速い。「悪い知らせは、俺が追い越してやる」',
    pactLines: ['契りの狼煙、天まで上げてきた。もう天界中が知ってるぜ、お前の子のこと。', 'よう! お前んとこの吉報なら、いつでも最速で届けてやる!'],
    portrait: 'god_noroshi.png',
  },
  {
    id: 'hoshikaji', name: '星鍛冶翁', kana: 'ほしかじのおきな', rank: 3, element: 'star',
    statBias: { str: 24, dex: 16 }, cost: 520, skillId: 'g_hoshikaji',
    personality: '墜ちた星を鍛え直す鍛冶神',
    desc: '玄冬に喰われ墜ちた星の欠片を拾い、鍛え直して夜空へ打ち上げる翁。「直せない星はない。……直せない家もない」',
    pactLines: ['儂の子は、折れん。曲がっても、儂が鍛え直すからの。', 'お前の家の形見、良い鉄じゃ。誰が打った? ……ほう、先々代の。道理で。'],
    portrait: 'god_hoshikaji.png',
  },
  {
    id: 'byakuya', name: '白夜巫女', kana: 'びゃくやのみこ', rank: 3, element: 'star',
    statBias: { mnd: 24, luk: 14 }, cost: 540, skillId: 'g_byakuya',
    personality: '遠い国の朝を知る巫女',
    desc: '常夜の届かぬ北の果て、太陽の沈まぬ国から来た巫女。彼女の袖の内には、まだ小さな朝が一つ残っている。',
    pactLines: ['朝を見たことは? ……ないのね。なら、あなたの子の代で、きっと。', 'この袖の中の朝、少しだけ分けてあげる。子守唄の代わりに。'],
    portrait: 'god_byakuya.png',
  },
  {
    id: 'hokushin', name: '北辰老', kana: 'ほくしんろう', rank: 4, element: 'star',
    statBias: { str: 18, vit: 18, dex: 18, agi: 18, mnd: 18, luk: 18 }, cost: 1200, skillId: 'g_hokushin',
    personality: '北極星の翁、動かざる者',
    desc: '千年動かず夜空の軸であり続けた最古の星。家祖の楽を千年聴き続けた唯一の証人。「あの娘の唄を、終わらせてやってくれ」',
    pactLines: ['……千年、待った。お前たちの誰かが、ここへ届くのを。', 'わしの血は重いぞ。それでも継ぐか。……良い目じゃ。'],
    portrait: 'god_hokushin.png',
    unlock: { fame: FAME_SEAL_THRESHOLD },
  },
]

// 結合(初期24柱+位階別増員分)
export const GODS: God[] = [...FOUNDING_GODS, ...GODS_LOW, ...GODS_MID, ...GODS_HIGH, ...GODS_APEX]

export function godById(id: string): God {
  const g = GODS.find((x) => x.id === id)
  if (!g) throw new Error(`unknown god: ${id}`)
  return g
}

// 封印判定 — unlock条件(AND)を満たしているか。無指定の神は常に契れる。
export function godUnlocked(
  g: God,
  data: Pick<GameData, 'fame' | 'regionsCleared' | 'family'>,
): boolean {
  const u = g.unlock
  if (!u) return true
  if (u.fame !== undefined && data.fame < u.fame) return false
  if (u.regionId !== undefined && !data.regionsCleared.includes(u.regionId)) return false
  if (u.gen !== undefined && !data.family.some((c) => c.gen >= u.gen!)) return false
  return true
}

// 弔いの文 — 契った子が逝ったとき、星の親から届く手紙。
// 神々は、子の行く末をずっと見ている。
const FOUNDING_MOURNING: Record<string, string> = {
  ishiusu: '「良い子じゃった。転んでも泣かん子じゃった。……今夜の団子は、供えの分だけ甘くしておく」',
  tsubame: '「借りがまた増えちまった。あの子の分の空は、俺が代わりに渡っておく。良い風だったぜ、あんたの子は」',
  shimihime: '「あの子の頁、何度も読み返しているの。良い一生だったわ。……インクが滲んだのは、内緒よ」',
  chidori: '「迷わず逝けたかしら。……大丈夫、あの子の帰り道は、私がいちばん明るく照らしたから」',
  kagaribi: '「あの子の灯は、私の火より熱かった。……今夜は私が郷の火の番をするわ。誰にも消させない」',
  yoigumo: '「あの子の着物、最後にもう一度だけ繕わせてもらったわ。旅立ちに、ほつれは似合わないもの」',
  yukiango: '(雪面に、いつもより深く「善き生」と刻まれている。文字の周りだけ、雪が融けていた)',
  tsukiura: '「薬師のくせに、看取ることしかできなかった。……ばか。いい子すぎるのよ、あんたの家の子は」',
  orihime: '「あの子の糸、機に織り込んだわ。夜空のどこかで、今夜から一筋光っているのがそれよ」',
  ookuma: '「よく生きた! よく戦った! 泣かんぞ、俺は! ……すまん、嘘だ。星が滲んで見えん」',
  narukami: '「あの子の為に、今夜は太鼓を打たん。静かな夜空を見てくれ。あれが俺の弔いだ」',
  hokushin: '「千年、多くの子らを見送ってきた。……それでも、慣れるものではないな。良い灯だった」',
  minomushi: '「……蓑の中の綿入れ、あの子の分だけ、どうしても片付けられん。もう少し、このままでいさせてくれ」',
  kaiyose: '「あの子の笑い声の貝、浜で一番いい場所に埋めたの。千年経ったら、真珠になっているわ」',
  kagebousi: '(その夜、行灯の影がいつまでも、小さな子どもの形をしていた)',
  kazaguruma: '「あの子の風車、まだ回っとるよ。回っとる間は、倒れとらんのじゃ。儂はそう思うことにしとる」',
  yuya: '「あの子の背中、最後にもう一度流してやりたかったねえ。……湯、熱めに沸かしといたよ。おいで」',
  suzuriumi: '「綴に、あの子の欄には私の一番いい墨を使うよう言っておいたわ。千年、褪せない墨を」',
  kodama: '「さよなら(さよなら、さよなら)……ちがう、言い直す。またね(またね、またね、またね)」',
  hanabi: '「今夜、誰にも頼まれてない花火を一発上げた。あの子のだ。でかくて、短くて、最高の花火だった」',
  shigure: '「今日の雨は、私。……ごめんなさいね、しばらく止みそうにないの」',
  noroshi: '「訃報だけは、追い越せなかった。……すまない。せめてあの子の武勇伝は、俺が天界中に届ける」',
  hoshikaji: '「あの子は、儂が鍛えた中で一番の星だった。打ち直しはせん。あのままで、完成しとる」',
  byakuya: '「袖の中の朝を、少しだけあの子に持たせました。常夜の向こうで、道に迷わないように」',
}

export const MOURNING: Record<string, string> = {
  ...FOUNDING_MOURNING,
  ...MOURNING_LOW,
  ...MOURNING_MID,
  ...MOURNING_HIGH,
  ...MOURNING_APEX,
}
