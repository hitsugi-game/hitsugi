// ============================================================
// 郷の物語(会話キュー) — v3.1 M16-3
// 死・代替わり・討伐が進むたび、郷人/綴/汐里からの一言が一つずつ解禁される。
// 敗北や喪失を「隠された物語の前進」に変える仕掛け。GOSSIPは順序に意味がある —
// 配列の先頭から、条件を満たした最初の未読エントリだけが解禁対象になる。
//
// unlock: gen(到達世代)/deaths(一族の死者数)/cleared(討伐した地域数)のいずれか一つでも
// 満たせば解禁(OR)。複数指定時もOR(「代が浅くても死が多ければ聞ける」を許すため)。
//
// これは初期セット(約18本)。バルクの会話本編はM13で追補される — 増やす時は
// このまま配列へ追記するだけでよい(unlockは単調増加が望ましいが、必須ではない)。
// ============================================================

export interface GossipEntry {
  id: string
  speaker: string
  text: string
  unlock: { gen?: number; deaths?: number; cleared?: number }
}

export const GOSSIP: GossipEntry[] = [
  // ---- 序盤: 郷人が、この短命の一族に気づき始める ----
  {
    id: 'gsp_01', speaker: '郷の子ども',
    text: '「ねえ、燈守の家って、なんでみんなすぐいなくなっちゃうの?」……大人は、答えずに笑うだけだった。',
    unlock: { gen: 1, deaths: 1, cleared: 1 },
  },
  {
    id: 'gsp_02', speaker: 'タネ婆',
    text: 'あの家の子はねえ、二年で大人になって、二年で老いて、二年で逝く。まるで蛍だ。それでも郷は、あの火を頼りにしとる。',
    unlock: { gen: 2, deaths: 2, cleared: 2 },
  },
  {
    id: 'gsp_03', speaker: '木戸番の童',
    text: '燈守の家紋、見たことあるか? 蛍が一匹、灯籠に止まってる柄なんだ。……誰が最初に描いたんだろうな。',
    unlock: { gen: 2, deaths: 3, cleared: 2 },
  },
  {
    id: 'gsp_04', speaker: '鍛冶の親方',
    text: 'あの家は、代替わりのたびに刀の柄を握り直す。……握り方の癖まで、なぜか似てくる。血ってのは不思議なもんだ。',
    unlock: { gen: 3, deaths: 4, cleared: 3 },
  },
  // ---- 中盤: 郷人の愛惜が深まり、綴が汐里や玄冬の影をちらつかせ始める ----
  {
    id: 'gsp_05', speaker: '社の巫女',
    text: '大燈籠のお社には、誰の位牌もないんです。……不思議じゃありませんか? 千年、誰かを祀ってきたはずなのに。',
    unlock: { gen: 3, deaths: 5, cleared: 4 },
  },
  {
    id: 'gsp_06', speaker: '綴',
    text: '「儂は千年、家譜を書いてきた。……書くたびに思う。この命の短さは、罰なのか、務めなのか、とな」',
    unlock: { gen: 4, deaths: 6, cleared: 5 },
  },
  {
    id: 'gsp_07', speaker: '郷の老人',
    text: '御山の頂から、風に乗って楽の音が聞こえる夜がある。祭りでもないのに、な。あれを気味悪がらんのは、燈守の家くらいだ。',
    unlock: { gen: 4, deaths: 7, cleared: 6 },
  },
  {
    id: 'gsp_08', speaker: '綴',
    text: '「玄冬。……常夜の名を、あんたらは覚えておいた方がいい。あれは千年前、太陽ごと空を喰った」',
    unlock: { gen: 5, deaths: 8, cleared: 7 },
  },
  {
    id: 'gsp_09', speaker: '豆腐屋のタネ婆',
    text: 'うちの婆さまがまだ子供の頃、御山にひとり登った娘がいたそうだよ。名前は……ああ、もう誰も覚えとらん。',
    unlock: { gen: 5, deaths: 9, cleared: 8 },
  },
  {
    id: 'gsp_10', speaker: '綴',
    text: '「家譜のいちばん古い頁、紙が擦り切れて名がほとんど読めん。……儂の記憶にも、なぜかその名だけが霞んでおる」',
    unlock: { gen: 6, deaths: 10, cleared: 9 },
  },
  // ---- 中盤後半: 汐里という名が輪郭を持ち始める ----
  {
    id: 'gsp_11', speaker: '木戸番の主',
    text: '御山の風が運ぶ楽の音、うちの親父はいつも「哀しい音だ」って言ってた。哀しいのに、なぜか眠くなるようないい音だって。',
    unlock: { gen: 6, deaths: 11, cleared: 10 },
  },
  {
    id: 'gsp_12', speaker: '綴',
    text: '「汐里——初代の名だ。口にすると、擦れた家譜の墨が戻るようだ」',
    unlock: { gen: 7, deaths: 12, cleared: 11 },
  },
  {
    id: 'gsp_13', speaker: '社の巫女・鈴音',
    text: '母から聞いた話です。「大燈籠に火を灯し続ければ、いつか山の音が優しくなる」って。……何の音のことか、母も知らないまま逝きました。',
    unlock: { gen: 7, deaths: 13, cleared: 12 },
  },
  {
    id: 'gsp_14', speaker: '綴',
    text: '「玄冬の面には、ひび割れのような線がある。……あれは傷でなく、涙の痕に見える。儂だけの気のせいならいいがな」',
    unlock: { gen: 8, deaths: 14, cleared: 13 },
  },
  // ---- 終盤: 汐里自身の、細い声 ----
  {
    id: 'gsp_15', speaker: '汐里(夢のような声)',
    text: '……誰か、いるの。ねえ、誰か。千年、独りで数えてきた指が、もう何本目かも分からない。',
    unlock: { gen: 8, deaths: 15, cleared: 14 },
  },
  {
    id: 'gsp_16', speaker: '汐里(夢のような声)',
    text: '玄冬は、怖いものじゃない。……あの子は、ただ疲れて眠りたかっただけ。私が、代わりに起きていると約束したの。',
    unlock: { gen: 9, deaths: 16, cleared: 15 },
  },
  {
    id: 'gsp_17', speaker: '汐里(夢のような声)',
    text: '燈守の家……ああ、あなたたちは私の血だ。千年前、御山に登る前に置いてきた、小さな家族の。……大きくなったのね。何代分も。',
    unlock: { gen: 9, deaths: 17, cleared: 16 },
  },
  {
    id: 'gsp_18', speaker: '汐里(夢のような声)',
    text: '楽の音が、もうすぐ止む。……止めてほしいとは、言わない。ただ、最後まで独りにしないでくれると、嬉しい。',
    unlock: { gen: 10, deaths: 18, cleared: 17 },
  },
]

// 次に解禁されるべき一本を返す(未解禁 = 配列内でindex === gossipIndexの位置)。
// 条件を満たしていなければnull(その月/そのトリガーでは何も起きない)。
export function nextGossip(
  gossipIndex: number | undefined,
  ctx: { gen: number; deaths: number; cleared: number; revealShioriName?: boolean },
): GossipEntry | null {
  const idx = gossipIndex ?? 0
  // gsp12〜18はch4の唯一開示後の余韻。壊れたcursorでも実名を先に出さない。
  if (idx >= 11 && !ctx.revealShioriName) return null
  const entry = GOSSIP[idx]
  if (!entry) return null
  const u = entry.unlock
  const eligible =
    (u.gen !== undefined && ctx.gen >= u.gen) ||
    (u.deaths !== undefined && ctx.deaths >= u.deaths) ||
    (u.cleared !== undefined && ctx.cleared >= u.cleared)
  return eligible ? entry : null
}
