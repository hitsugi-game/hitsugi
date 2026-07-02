import type { Character } from './types'
import { Rng } from './rng'
import { personalityById } from './data/personalities'

// ============================================================
// ライフイベント — 「その子だけの人生」を作る会話群
// 初陣 / 絆(家族の掛け合い) / 灯細りの夜(死の前月)
// 感情移入の本丸。台詞は性根(voice)で分岐する
// ============================================================

export interface LifeLine {
  speaker: string // 表示名('' で地の文)
  text: string
}

export interface LifeScenePayload {
  title: string
  lines: LifeLine[]
  bg?: string // 情景CG(public/img/)
}

const v = (c: Character) => personalityById(c.personalityId).voice

// ---- 初陣 — 初めての夜藪から帰った夜 ----
export function hatsujinScene(c: Character, head: Character | null, rng: Rng): LifeScenePayload {
  const opener: LifeLine = { speaker: '', text: `${c.name}、初陣より帰還。その夜、大燈籠の下で。` }
  const byVoice: Record<string, LifeLine[]> = {
    brave: [
      { speaker: c.name, text: '見たか、今日の私の太刀筋! 明日はもっと深くまで行ける!' },
      { speaker: '綴', text: '「……初陣で笑って帰る奴は、長生きするか、しないかのどちらかだ」' },
    ],
    timid: [
      { speaker: c.name, text: '……怖かった。ずっと、膝が笑ってた。でも……帰ってこられた。' },
      { speaker: head?.name ?? '綴', text: '「帰ってくることが、いちばん難しくて、いちばん偉い。よくやった」' },
    ],
    kind: [
      { speaker: c.name, text: '斬った魔性……あれも昔は、何かの生きものだったのかな。' },
      { speaker: '綴', text: '「そう思える灯は、闇の中で一等よく見える。忘れるな」' },
    ],
    rival: [
      { speaker: c.name, text: '家譜を見せて。私の初陣、歴代で何番目に早い?' },
      { speaker: '綴', text: '「三番目じゃ。……悔しいか? その顔、二番目だった曾祖父とそっくりよ」' },
    ],
    easy: [
      { speaker: c.name, text: 'いやあ、夜藪って歩くだけで疲れるんやなあ。腹減った〜。' },
      { speaker: '綴', text: '「初陣の晩飯は誰より旨い。千年変わらん決まりごとだ」' },
    ],
    cool: [
      { speaker: c.name, text: '灯の残量、敵の出現間隔、記録してきた。次はもっと効率よく回れる。' },
      { speaker: '綴', text: '「頼もしいことだ。……だがな、たまには夜空も見上げておけ」' },
    ],
    wild: [
      { speaker: c.name, text: 'あはは! 魔性って案外もろいな! 明日は主のところまで行こうぜ!' },
      { speaker: head?.name ?? '綴', text: '「その意気や良し。だが無茶と勇気は別物だ — 帰ってこその一族よ」' },
    ],
    lonely: [
      { speaker: c.name, text: '……夜藪で、ずっとみんなの背中を見てた。あれが家族なんだね。' },
      { speaker: '綴', text: '「ああ。そしてお前の背中も、いつか誰かが見て育つ」' },
    ],
  }
  const lines = byVoice[v(c)] ?? byVoice.brave
  void rng
  return { title: '初陣の夜', lines: [opener, ...lines], bg: 'cg_hatsujin.png' }
}

// ---- 絆 — 月々の家族の掛け合い(組み合わせで変化) ----
export function kizunaScene(a: Character, b: Character, rng: Rng): LifeScenePayload {
  const key = [v(a), v(b)].sort().join('+')
  const rel = a.humanParentId === b.id ? '親子' : b.humanParentId === a.id ? '親子' : '一族'
  const opener: LifeLine = { speaker: '', text: `ある夜。${a.name}と${b.name}、囲炉裏の傍らで。` }

  const pairs: Record<string, LifeLine[]> = {
    'brave+timid': [
      { speaker: a.name, text: '前を歩くのは私の役目。お前は後ろで、私の背中だけ見てればいい。' },
      { speaker: b.name, text: '……うん。でも、あなたが振り向いたとき、ちゃんと立ってるように、するから。' },
    ],
    'brave+brave': [
      { speaker: a.name, text: '次の出撃、先陣はもらう。' },
      { speaker: b.name, text: 'は? 冗談。灯より先に燃えるのはこの私。' },
      { speaker: '', text: '——結局、二人並んで駆けることでいつも決着する。' },
    ],
    'kind+wild': [
      { speaker: b.name, text: 'なあなあ、大燈籠のてっぺんに登ると郷が全部見えるんだぜ。' },
      { speaker: a.name, text: 'こら。……それで、綺麗だった?' },
      { speaker: b.name, text: '……うん。すっげえ綺麗だった。今度一緒に登る?' },
    ],
    'cool+easy': [
      { speaker: a.name, text: '起きて。昼寝が一刻を超えている。時間の無駄よ。' },
      { speaker: b.name, text: 'ん〜……無駄こそ、二年しかない命の贅沢っちゅうもんや……すぴー。' },
      { speaker: '', text: `${a.name}は何か言いかけて、やめて、そっと羽織をかけた。` },
    ],
    'lonely+lonely': [
      { speaker: a.name, text: '……ねえ。私が先に逝ったら、寂しい?' },
      { speaker: b.name, text: '寂しいよ。すごく。……だから、一日でも長く、一緒にいよう。' },
    ],
    'rival+rival': [
      { speaker: a.name, text: '討伐数、私が上。' },
      { speaker: b.name, text: '生涯奉燈は私が上。' },
      { speaker: '綴', text: '「家譜が擦り切れるから毎晩数えに来るのはやめんか、お前たち」' },
    ],
    'timid+timid': [
      { speaker: a.name, text: '(小声)……夜藪の音、まだ夢に出る?' },
      { speaker: b.name, text: '(小声)……出る。でも、隣にあなたの布団があると、すぐ眠れる。' },
    ],
    'brave+kind': [
      { speaker: a.name, text: 'お前は優しすぎる。夜藪では、その一瞬の迷いが命取りだ。' },
      { speaker: b.name, text: 'あなたは強すぎる。だからその傷、私が手当てするまで動かないの。' },
    ],
  }

  const generic: LifeLine[] = [
    { speaker: a.name, text: rel === '親子' ? 'お前が生まれた日のこと、今でも覚えてる。小さくて、灯みたいに温かかった。' : '私たちの灯、あとどれくらいだろうな。' },
    { speaker: b.name, text: rel === '親子' ? '……その話、もう百回目。でも、もう一回聞かせて。' : '数えるのはよそう。数えたら、歩けなくなる。' },
    { speaker: '', text: '囲炉裏の火が、ぱちりと爆ぜた。' },
  ]

  void rng
  return { title: '絆 — 囲炉裏の夜', lines: [opener, ...(pairs[key] ?? generic)] }
}

// ---- 灯細りの夜 — 死の前月、当主(または家族)との最後の対話 ----
export function hosoriScene(c: Character, witness: Character | null): LifeScenePayload {
  const w = witness && witness.id !== c.id ? witness.name : '綴'
  const opener: LifeLine = {
    speaker: '',
    text: `${c.name}の灯が、細り始めた。残り、ひと月。本人がいちばんよく分かっている。`,
  }
  const byVoice: Record<string, LifeLine[]> = {
    brave: [
      { speaker: c.name, text: 'なあ。最後にもう一度だけ、夜藪に出たい。……だめか?' },
      { speaker: w, text: '「……ああ、行こう。最後まで、あなたは前を歩く人だ」' },
    ],
    timid: [
      { speaker: c.name, text: 'ずっと怖がりのまま、終わっちゃった。……かっこ悪いね。' },
      { speaker: w, text: '「怖いのに二年間戦い抜いた人を、誰が怖がりと呼ぶものか」' },
      { speaker: c.name, text: '……えへへ。最後に、いいこと聞いた。' },
    ],
    kind: [
      { speaker: c.name, text: '私の形見はね、いちばん寒がりの子にあげて。あの簪、温かいから。' },
      { speaker: w, text: '「……自分の心配をしろと、何度言えば」' },
      { speaker: c.name, text: 'これが私の心配ごとなの。最後まで、変えないわ。' },
    ],
    rival: [
      { speaker: c.name, text: '家譜に書いておいて。「この記録を破る子を、楽しみに待つ」って。' },
      { speaker: w, text: '「破られたら悔しくないのか」' },
      { speaker: c.name, text: '悔しいわよ。でもそれ以上に——嬉しいでしょうね。' },
    ],
    easy: [
      { speaker: c.name, text: '最後の月は、ぜーんぶ昼寝に使うって決めた。' },
      { speaker: w, text: '「……最後まで、お前らしいな」' },
      { speaker: c.name, text: 'せやろ? 星のよう見える縁側、あそこ、次の子にも教えたってな。' },
    ],
    cool: [
      { speaker: c.name, text: '帳簿は整理した。装備の目録も。引き継ぎに漏れはない。' },
      { speaker: w, text: '「……相変わらずだ。何か、し残したことは」' },
      { speaker: c.name, text: '…………夕焼けを、もう少し見ておけばよかった。それだけ。' },
    ],
    wild: [
      { speaker: c.name, text: '祭りだ! 私の灯が消える前に、郷いちばんのでかい祭りをやろう!' },
      { speaker: w, text: '「湿っぽいのは嫌いか」' },
      { speaker: c.name, text: '当たり前だろ! 泣くのは祭りのあと! 笑って送れ!' },
    ],
    lonely: [
      { speaker: c.name, text: '……手、握っててくれる? 消える時まで、ずっと。' },
      { speaker: w, text: '「ずっとだ。約束する」' },
      { speaker: c.name, text: 'なら、もう怖くない。……ねえ、私、この家に生まれてよかった。' },
    ],
  }
  return { title: '灯細りの夜', lines: [opener, ...(byVoice[v(c)] ?? byVoice.brave)], bg: 'cg_hosori.png' }
}
