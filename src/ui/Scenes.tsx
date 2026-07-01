import { useState } from 'react'
import { useGame } from '../core/store'
import { STAT_LABELS } from '../core/types'
import type { StatKey } from '../core/types'
import { godById } from '../core/data/gods'
import { personalityById } from '../core/data/personalities'
import { clearSave } from '../core/save'

export function BirthScene({ charId }: { charId: string }) {
  const data = useGame((s) => s.data)!
  const processNextScene = useGame((s) => s.processNextScene)
  const char = data.family.find((c) => c.id === charId)
  if (!char) return null
  const god = godById(char.godParentId)
  const parent = data.family.find((c) => c.id === char.humanParentId)
  const p = personalityById(char.personalityId)

  return (
    <div className="scene-screen screen">
      <div className="birth-flame">🔥</div>
      <h1 className="scene-title">誕生</h1>
      <div className="scene-body">
        <p>
          {parent?.name}と{god.name}の子、生まれる。
        </p>
        <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: '0.3em', margin: '18px 0' }}>
          {char.name}
        </p>
        <p style={{ color: 'var(--text-dim)' }}>
          第{char.gen}代 — {p.label}な子。{p.desc}
        </p>
        <div className="stat-grid" style={{ maxWidth: 360, margin: '14px auto' }}>
          {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
            <span key={k} className="stat-cell">
              <em>{STAT_LABELS[k]}</em>
              {char.potential[k]}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          与えられた命は八季。二季で成人し、隊に加われる。
        </p>
      </div>
      <button className="btn btn-main" onClick={processNextScene}>
        名を家譜に記す
      </button>
    </div>
  )
}

export function DeathScene({ charId }: { charId: string }) {
  const data = useGame((s) => s.data)!
  const processNextScene = useGame((s) => s.processNextScene)
  const char = data.family.find((c) => c.id === charId)
  if (!char) return null

  return (
    <div className="scene-screen screen">
      <div className="death-flame">🔥</div>
      <h1 className="scene-title">看取り</h1>
      <div className="scene-body">
        <p>
          {char.name}、第{char.gen}代。八つの季節を生き、灯が尽きた。
        </p>
        {char.deeds.length > 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {char.deeds.join('。')}。討った魔性{char.kills}。
          </p>
        )}
        <div className="scene-epitaph">「{char.epitaph}」</div>
        <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>
          綴「……よう生きた。あんたの八季、確かに書き留めたぞ」
        </p>
      </div>
      <button className="btn btn-main" onClick={processNextScene}>
        灯を、継ぐ
      </button>
    </div>
  )
}

const ENDING_CLEARED = [
  '御山の頂。玄冬の面が、割れて落ちる。',
  '現れたのは — 楽士の面影。千年、独りで星喰いを封じ続けた家祖、汐里。',
  '「……ああ、来てくれたのね。私の、遠い遠い子どもたち」',
  '刃を納め、当主は家譜を開く。千年分の名を、一人ずつ、読み上げていく。',
  '汐里は聴いている。子守唄を口ずさむように、頷きながら。',
  '最後の名が読まれたとき、星喰いは — 眠るように、消えた。',
  '「もう、いいのね。もう、休んでいいのね」',
  '大燈籠の火が、朝焼けの色に変わる。千年ぶりの太陽が、燈ノ郷に昇る。',
  'その春、燈守家に子が生まれた。八季で死なない、初めての子が。',
  '汝の屍を越え、灯は継がれた。',
  '— 完 —',
]

const ENDING_EXTINCT = [
  '最後の灯が、消えた。',
  '燈守家の血脈は、ここに絶えた。',
  '大燈籠の火は細り、常夜が郷を呑んでいく。',
  '……だが、家譜だけは残った。',
  '綴「いつか誰かが、この記を読む。ならばこれは敗北ではない。……中断だ」',
]

export function EndingScene() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const [beat, setBeat] = useState(0)
  const cleared = !!data.flags.cleared
  const beats = cleared ? ENDING_CLEARED : ENDING_EXTINCT
  const done = beat >= beats.length - 1

  const gens = Math.max(...data.family.map((c) => c.gen))
  const fallenCount = data.family.filter((c) => !c.alive).length
  const years = Math.floor(data.seasonIndex / 4) + 1

  return (
    <div className="scene-screen screen" onClick={() => !done && setBeat(beat + 1)}>
      <h1 className="scene-title">{cleared ? '灯継ぎ' : '断絶'}</h1>
      <div className="scene-body">
        {beats.slice(Math.max(0, beat - 2), beat + 1).map((t, i, arr) => (
          <p key={beat - arr.length + i} className={i === arr.length - 1 ? 'intro-current' : 'intro-past'}>
            {t}
          </p>
        ))}
      </div>
      {done && (
        <>
          <div className="ending-stats">
            紡がれた世代<b>{gens}</b>代 / 逝った者<b>{fallenCount}</b>人 / 費やした歳月<b>{years}</b>年
          </div>
          <button
            className="btn btn-main"
            onClick={() => {
              if (!cleared) clearSave()
              setScreen({ id: 'title' })
            }}
          >
            題目へ戻る
          </button>
        </>
      )}
      {!done && <div className="intro-hint">クリックで進む</div>}
    </div>
  )
}
