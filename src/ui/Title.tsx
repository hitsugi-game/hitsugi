import { useRef, useState } from 'react'
import { useGame } from '../core/store'
import { hasSave, downloadSave, importSaveString, clearSave } from '../core/save'
import { SceneBg } from './components'
import { emitToast } from './toast'

// タイトル背景 — 常夜の御山と大燈籠(SVG一枚絵)
function TitleArt() {
  const stars = Array.from({ length: 46 }, (_, i) => ({
    x: (i * 191.3) % 1200,
    y: (i * 73.7) % 420,
    r: 0.6 + (i % 4) * 0.5,
    o: 0.25 + (i % 5) * 0.14,
  }))
  return (
    <svg className="title-art" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0e1d" />
          <stop offset="62%" stopColor="#131c38" />
          <stop offset="100%" stopColor="#1d1630" />
        </linearGradient>
        <radialGradient id="peakDark" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#2a2140" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#2a2140" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#e8a33d" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e8a33d" stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width="1200" height="800" fill="url(#sky)" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#e9debe" opacity={s.o} />
      ))}

      {/* 玄冬 — 山頂に座す暗い月輪 */}
      <circle cx="600" cy="190" r="120" fill="url(#peakDark)" />
      <circle cx="600" cy="190" r="64" fill="#0d0a18" stroke="#4a3d6b" strokeWidth="1.5" opacity="0.9" />
      <circle cx="600" cy="190" r="72" fill="none" stroke="#6b5a96" strokeWidth="0.8" opacity="0.5" />

      {/* 灯ノ御山 */}
      <path d="M0 800 L280 420 L420 560 L600 240 L780 540 L930 400 L1200 800 Z" fill="#0e1224" />
      <path d="M0 800 L280 420 L420 560 L600 240 L780 540 L930 400 L1200 800 Z" fill="#141a33" opacity="0.5" transform="translate(0 60)" />

      {/* 夜藪の霞 */}
      <ellipse cx="300" cy="640" rx="380" ry="60" fill="#1d2547" opacity="0.5" filter="url(#soft)" />
      <ellipse cx="900" cy="670" rx="420" ry="70" fill="#191231" opacity="0.55" filter="url(#soft)" />

      {/* 郷のシルエット */}
      <g fill="#080b16">
        <path d="M80 800 v-56 l34 -22 l34 22 v56 Z" />
        <path d="M200 800 v-44 l28 -18 l28 18 v44 Z" />
        <path d="M950 800 v-50 l30 -20 l30 20 v50 Z" />
        <path d="M1060 800 v-40 l26 -16 l26 16 v40 Z" />
      </g>

      {/* 大燈籠 */}
      <ellipse cx="600" cy="662" rx="150" ry="120" fill="url(#lampGlow)" />
      <g>
        <rect x="588" y="560" width="24" height="10" fill="#5c4a2a" />
        <path d="M574 570 h52 l8 18 h-68 Z" fill="#3c2f1a" />
        <rect x="576" y="588" width="48" height="74" rx="8" fill="#c98a2d" opacity="0.92" />
        <rect x="576" y="588" width="48" height="74" rx="8" fill="none" stroke="#5c4a2a" strokeWidth="2" />
        <line x1="600" y1="588" x2="600" y2="662" stroke="#5c4a2a" strokeWidth="1.6" opacity="0.8" />
        <line x1="576" y1="625" x2="624" y2="625" stroke="#5c4a2a" strokeWidth="1.6" opacity="0.8" />
        <path d="M568 662 h64 l-6 14 h-52 Z" fill="#3c2f1a" />
        <ellipse cx="600" cy="622" rx="10" ry="16" fill="#fff3d6" filter="url(#soft)" />
      </g>
    </svg>
  )
}

export function TitleScreen() {
  const newGame = useGame((s) => s.newGame)
  const continueGame = useGame((s) => s.continueGame)
  const [mode, setMode] = useState<'normal' | 'narrative' | 'data' | null>(null)
  const [confirmNew, setConfirmNew] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const saveExists = hasSave()

  // 「はじめから」— 既存セーブがあれば上書き確認を挟む
  const onNewGame = () => { if (saveExists) setConfirmNew(true); else setMode('normal') }
  const onImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = importSaveString(String(reader.result))
      emitToast(ok ? 'セーブを読み込んだ。「つづきから」で再開できる。' : '読み込めなかった(壊れたファイル)。', ok ? 'info' : 'error')
    }
    reader.readAsText(file)
  }

  return (
    <div className="screen title-screen">
      <img
        className="title-art-img"
        src={`${import.meta.env.BASE_URL}img/title_key.jpg`}
        alt=""
        aria-hidden
      />
      <TitleArt />
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

      {confirmNew ? (
        <div className="title-menu">
          <p className="mode-ask">既に一族の記がある。新たに始めれば、それは失われる。よいか?</p>
          <button className="btn btn-main" onClick={() => { setConfirmNew(false); setMode('normal') }}>
            承知の上で、始める
          </button>
          <button className="btn btn-ghost" onClick={() => setConfirmNew(false)}>
            やめておく
          </button>
        </div>
      ) : mode === 'data' ? (
        <div className="title-menu">
          <p className="mode-ask">セーブの管理</p>
          <button className="btn" disabled={!saveExists} onClick={() => { if (!downloadSave()) emitToast('書き出すセーブが無い。', 'error') }}>
            セーブを書き出す(バックアップ)
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            セーブを読み込む(ファイルから)
          </button>
          <button className="btn btn-ghost" disabled={!saveExists} onClick={() => { if (confirm('この端末のセーブを完全に消す。取り消せない。よいか?')) { clearSave(); emitToast('セーブを消した。', 'info'); setMode(null) } }}>
            セーブを消す
          </button>
          <button className="btn btn-ghost" onClick={() => setMode(null)}>
            戻る
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = '' }} />
        </div>
      ) : mode === null ? (
        <div className="title-menu">
          <button className="btn btn-main" onClick={onNewGame}>
            はじめから
          </button>
          {saveExists && (
            <button className="btn" onClick={() => continueGame()}>
              つづきから
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setMode('data')}>
            セーブの管理
          </button>
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
  '旅の楽士は、己の寿命を薪として大燈籠に火を点し、郷を常夜から守った。',
  'だが火は完全ではなかった。その楽士の血族には、二つの呪いが残った。',
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
      <SceneBg file="cg_prologue.png" />
      <div className="intro-text">
        {INTRO_BEATS.slice(Math.max(0, beat - 2), beat + 1).map((t, i, arr) => (
          <p key={beat - arr.length + i + 1} className={i === arr.length - 1 ? 'intro-current' : 'intro-past'}>
            {t}
          </p>
        ))}
      </div>
      <div className="scene-pager" onClick={(e) => e.stopPropagation()}>
        <span className="scene-page-mark">頁 {beat + 1}／{INTRO_BEATS.length}</span>
        <button className="btn scene-next" onClick={advance}>次へ ▸</button>
      </div>
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
