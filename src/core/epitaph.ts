import type { Character } from './types'
import { Rng } from './rng'
import { personalityById } from './data/personalities'

// 辞世 — 性根×死因から自動生成される、その人だけの最期の言葉
type DeathCause = 'lifespan' | 'battle' | 'lost'

const EPITAPHS: Record<string, Record<DeathCause, string[]>> = {
  brave: {
    lifespan: [
      '悔いはなし。ただ、あと一戦だけ、したかったなあ。',
      '我が灯は尽きた。だが我が刃の音は、まだ夜藪に響いておろう。',
    ],
    battle: ['前のめりに倒れたか。ならば上等だ。', '背中の傷はないな? ……ならばよし。先に行くぞ。'],
    lost: ['(その勇姿を見た者は、もういない)', '(最後まで先頭を歩いていた、とだけ伝わる)'],
  },
  timid: {
    lifespan: [
      '怖くない最期なんて、初めてだ。家だからかな。',
      'いっぱい隠れて、いっぱい生き延びた。えへへ、最後だけは隠れないよ。',
    ],
    battle: ['怖かった。最後まで怖かった。でも、逃げなかったよ。', 'みんなの後ろが、私の場所だった。守れたなら、それでいい。'],
    lost: ['(物陰が好きな子だった。今もどこかに隠れている気がしてならない)', '(見つけてあげられなかった、と当主は生涯悔やんだ)'],
  },
  kind: {
    lifespan: ['斬った魔性の分まで祈って逝く。長い祈りになるねえ。', 'みんな、喧嘩しちゃだめよ。……ふふ、灯が、あったかい。'],
    battle: ['この傷は、誰かの傷の代わりなら、痛くないの。', '敵にも、祈りを。……私にも、少しだけ。'],
    lost: ['(夜藪の獣にすら慕われた人だった。きっと闇の中でも祈っている)', '(彼の残した薬草袋だけが、道端に揃えて置かれていた)'],
  },
  rival: {
    lifespan: ['家譜を見ろ。俺の欄が一番長い。……ふ、勝ち逃げだ。', '次の子へ。私の記録、超えてみなさい。超えたら、褒めてあげる。'],
    battle: ['ここで倒れるのも、記録のうちか。……次代、頼んだぞ。', '負けじゃない。これは、次に勝つための布石だ。'],
    lost: ['(家譜の自分の欄を毎晩読み返していた。その欄は、まだ終わっていない)', '(「行方知れず」の四文字を、本人が一番嫌っただろう)'],
  },
  easy: {
    lifespan: ['ようやった、ようやった。さて、長い昼寝としようか。', '八季もあれば、昼寝は千回できる。ええ人生やった。'],
    battle: ['おお、存外痛いもんやな。……まあ、ええか。', 'すまんな、ここで寝るわ。あとは、頼んだで。'],
    lost: ['(どこかで昼寝をしているだけ、と家族は長く信じていた)', '(彼の昼寝の場所は、郷で一番星がよく見えた)'],
  },
  cool: {
    lifespan: ['計算通り、八季ちょうど。……最後の誤算は、涙が出たことだ。', '灯の残りは常に数えていた。ゼロになる瞬間も、見届けてやる。'],
    battle: ['撤退の判断を誤った。……いや、誤っていない。皆は帰れた。', 'この損害で敵を全て記録した。次代は、勝てる。'],
    lost: ['(彼女の手帳の最後の頁には「灯残り三割、なお進む価値あり」とある)', '(冷静な人だった。だからこれは、覚悟の上の道だったのだろう)'],
  },
  wild: {
    lifespan: ['あー! 楽しかった! 以上!', '大燈籠のてっぺんから見た郷は最高だったぜ。怒られたけどな!'],
    battle: ['はっ、俺より無茶な奴が夜藪にいたとはな!', '派手に散る! 見とけよ、これが燈守家の花火だ!'],
    lost: ['(きっとどこかでとんでもない大物と戦っている、と皆が笑って泣いた)', '(彼の笑い声は、今も夜藪の奥から聞こえる気がする)'],
  },
  lonely: {
    lifespan: ['最後まで、誰かがそばにいてくれた。それだけで、私の八季は満点だ。', '寂しくなかった。一度も。ありがとう、ありがとう。'],
    battle: ['隣にいてくれて、ありがとう。……最後に手を、握ってくれる?', 'ひとりで逝くのだけが怖かったのに。みんなの顔が見える。よかった。'],
    lost: ['(門の前で家族を待つのが好きな子だった。今度は皆が門で待っている)', '(独りで逝かせてしまったことを、一族は千年忘れなかった)'],
  },
}

export function generateEpitaph(c: Character, cause: DeathCause, rng: Rng): string {
  const voice = personalityById(c.personalityId).voice
  const pool = EPITAPHS[voice]?.[cause] ?? EPITAPHS.brave[cause]
  return rng.pick(pool)
}

// 死因ラベル
export function deathCauseLabel(cause: DeathCause): string {
  return cause === 'lifespan' ? '八季の命、燃え尽く' : cause === 'battle' ? '夜藪に散る' : '行方知れず'
}

// 事績の文章化(家譜用)
export function formatDeed(kind: string, detail: string): string {
  void kind
  return detail
}

// 誕生の口上
export function birthLine(name: string, godName: string, rng: Rng): string {
  return rng.pick([
    `星が一つ、郷に降りた。${godName}の血を引く子、${name}。`,
    `産声が常夜を少しだけ押し返した。${name}、ここに生まれる。`,
    `${godName}より授かりし新しき灯。その名を${name}という。`,
  ])
}
