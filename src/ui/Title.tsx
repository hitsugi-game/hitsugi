import { useState } from 'react'
import { useGame } from '../core/store'
import { hasSave } from '../core/save'

export function TitleScreen() {
  const newGame = useGame((s) => s.newGame)
  const continueGame = useGame((s) => s.continueGame)
  const [mode, setMode] = useState<'normal' | 'narrative' | null>(null)
  const saveExists = hasSave()

  return (
    <div className="screen title-screen">
      <div className="embers" aria-hidden>
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="ember" style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${i * 0.9}s` }} />
        ))}
      </div>
      <div className="title-main">
        <h1 className="game-title">
          <span className="title-hi">灯</span>
          <span className="title-tsugi">継ぎ</span>
        </h1>
        <p className="title-sub">- HITSUGI -</p>
        <p className="title-copy">八季の命を、継いでゆけ。</p>
      </div>

      {mode === null ? (
        <div className="title-menu">
          <button className="btn btn-main" onClick={() => setMode('normal')}>
            はじめから
          </button>
          {saveExists && (
            <button className="btn" onClick={() => continueGame()}>
              つづきから
            </button>
          )}
        </div>
      ) : (
        <div className="title-menu">
          <p className="mode-ask">語り部の問い — いかに歩む?</p>
          <button className="btn btn-main" onClick={() => newGame(false)}>
            宿命(標準) — 夜は深く、灯は重い
          </button>
          <button className="btn" onClick={() => newGame(true)}>
            語り部(易しめ) — 物語を味わう歩み
          </button>
          <button className="btn btn-ghost" onClick={() => setMode(null)}>
            戻る
          </button>
        </div>
      )}
      <p className="title-ver">ver 0.1 — 燈ノ郷にて</p>
    </div>
  )
}

const INTRO_BEATS = [
  '千年前、この郷から太陽が消えた。',
  '星喰いの神・玄冬(げんとう)が、空を喰らったのだ。',
  '旅の楽士・汐里(しおり)は、己の寿命を薪として大燈籠に火を点し、郷を常夜から守った。',
  'だが火は完全ではなかった。汐里の血族には、二つの呪いが残った。',
  '一つ。生まれて八つの季節で、体の内の灯が燃え尽きること — 「八季の命」。',
  '一つ。人と子を成せぬこと — 「結ばれぬ身」。',
  'ゆえに一族は、夜空の星神と契りて子を授かり、代を継いで戦い続けてきた。',
  '目指すは夜藪の最深部、灯ノ御山の頂。玄冬の御座。',
  '……さて。千年目の当主よ。あんたの名は燈吾。残る命は、五季。',
  '筆は持った。あんたら一族の生き様、この綴(つづり)が一字も漏らさず書き残す。',
  '— ゆけ。灯を、継いでゆけ。',
]

export function IntroScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const [beat, setBeat] = useState(0)
  const done = beat >= INTRO_BEATS.length

  const advance = () => {
    if (done) return
    if (beat === INTRO_BEATS.length - 1) {
      setScreen({ id: 'home' })
    } else {
      setBeat(beat + 1)
    }
  }

  return (
    <div className="screen intro-screen" onClick={advance}>
      <div className="intro-text">
        {INTRO_BEATS.slice(Math.max(0, beat - 2), beat + 1).map((t, i, arr) => (
          <p key={beat - arr.length + i + 1} className={i === arr.length - 1 ? 'intro-current' : 'intro-past'}>
            {t}
          </p>
        ))}
      </div>
      <div className="intro-hint">クリックで進む</div>
      <button
        className="btn btn-ghost intro-skip"
        onClick={(e) => {
          e.stopPropagation()
          setScreen({ id: 'home' })
        }}
      >
        物語を飛ばす
      </button>
    </div>
  )
}
