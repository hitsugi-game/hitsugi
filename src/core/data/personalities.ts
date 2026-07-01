import type { Personality } from '../types'

// 性根 — 台詞トーン・戦闘補正・辞世の文体に影響
export const PERSONALITIES: Personality[] = [
  {
    id: 'brave', label: '勇敢', voice: 'brave',
    desc: '先陣を切らねば気が済まない。灯より先に心が燃える。',
    battleBias: { str: 8, vit: 4 },
  },
  {
    id: 'timid', label: '臆病', voice: 'timid',
    desc: '物陰が好き。だが臆病者ほど夜藪では長生きする。',
    battleBias: { agi: 8, luk: 6 },
  },
  {
    id: 'kind', label: '慈悲深い', voice: 'kind',
    desc: '斬った魔性にも手を合わせる。郷の子らに慕われる。',
    battleBias: { mnd: 10 },
  },
  {
    id: 'rival', label: '負けず嫌い', voice: 'rival',
    desc: '兄姉の記録を破ることが生き甲斐。家譜を誰より読み込む。',
    battleBias: { dex: 8, str: 4 },
  },
  {
    id: 'easy', label: '呑気', voice: 'easy',
    desc: '八季しかない命で昼寝を欠かさない。大物である。',
    battleBias: { vit: 10 },
  },
  {
    id: 'cool', label: '冷静', voice: 'cool',
    desc: '灯の残りを常に数えている。撤退の判断を誤らない。',
    battleBias: { dex: 6, mnd: 6 },
  },
  {
    id: 'wild', label: '破天荒', voice: 'wild',
    desc: '大燈籠によじ登って叱られた。星神にもため口。',
    battleBias: { str: 10, luk: 4 },
  },
  {
    id: 'lonely', label: '寂しがり', voice: 'lonely',
    desc: '家族の帰りをいつも門で待つ。夜藪では誰かの隣を離れない。',
    battleBias: { mnd: 6, agi: 6 },
  },
]

export function personalityById(id: string): Personality {
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0]
}
