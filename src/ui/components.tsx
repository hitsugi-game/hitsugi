import { useState, type ReactNode } from 'react'
import { useGame } from '../core/store'
import type { Character } from '../core/types'
import { STAT_LABELS, ELEMENT_LABELS, LIFESPAN_MONTHS } from '../core/types'
import { ageOf } from '../core/inheritance'
import { personalityById } from '../core/data/personalities'
import { godById } from '../core/data/gods'
import { tozaOf } from '../core/data/toza'
import { charSprite, gameImg } from './img'

// 命の灯 — 炎ひとつが一季(三月)。八つの炎が「八季の命」を表す(本作の象徴UI)
export function LifeFlames({ char, seasonIndex }: { char: Character; seasonIndex: number }) {
  const age = ageOf(char, seasonIndex)
  const left = Math.max(0, LIFESPAN_MONTHS - age) // 残り月数
  const flames = Math.ceil(left / 3) // 灯っている炎(=残り季)
  return (
    <span className="life-flames" title={`残り${left}ヶ月`}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className={`flame ${i < flames ? 'lit' : 'out'} ${i === flames - 1 ? 'last' : ''}`}>
          {i < flames ? '🔥' : '・'}
        </span>
      ))}
      <span className="life-months">{left}月</span>
    </span>
  )
}

export function Bar({ value, max, kind }: { value: number; max: number; kind: 'hp' | 'mp' | 'light' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className={`bar bar-${kind}`}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
      <span className="bar-text">
        {Math.round(value)}/{max}
      </span>
    </div>
  )
}

export function StatGrid({ stats }: { stats: Character['stats'] }) {
  return (
    <div className="stat-grid">
      {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map((k) => (
        <span key={k} className="stat-cell">
          <em>{STAT_LABELS[k]}</em>
          {stats[k]}
        </span>
      ))}
    </div>
  )
}

// 立ち絵 — 灯型×性別の切り絵歩行スプライトを転用。幼子/未読込は灯のシルエットへ。
export function Portrait({
  char, seasonIndex, size,
}: { char: Character; seasonIndex: number; size?: 'sm' }) {
  const [failed, setFailed] = useState(false)
  const age = ageOf(char, seasonIndex)
  const src = charSprite(char)
  const isChild = age < 6 || !char.tomoshigata
  const showImg = !isChild && !!src && !failed
  return (
    <span
      className={`portrait ${size === 'sm' ? 'portrait-sm' : ''} ${isChild ? 'is-child' : ''}`}
      data-el={char.element}
      aria-hidden
    >
      {showImg ? (
        <img src={src!} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="portrait-flame">{'\u{1F525}'}</span>
      )}
    </span>
  )
}

export function CharCard({
  char, seasonIndex, selected, onClick, compact, children,
}: {
  char: Character
  seasonIndex: number
  selected?: boolean
  onClick?: () => void
  compact?: boolean
  children?: ReactNode
}) {
  const p = personalityById(char.personalityId)
  const god = godById(char.godParentId)
  const age = ageOf(char, seasonIndex)
  return (
    <div
      className={`char-card ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''} ${age < 6 ? 'child' : ''}`}
      onClick={onClick}
    >
      <div className="char-card-row">
        <Portrait char={char} seasonIndex={seasonIndex} size={compact ? 'sm' : undefined} />
        <div className="char-card-body">
          <div className="char-head">
            <span className={`element-badge el-${char.element}`}>{ELEMENT_LABELS[char.element]}</span>
            <span className="char-name">
              {char.isHead && <span className="head-mark">当主</span>}
              {char.name}
            </span>
            <span className="char-gen">{char.gen}代</span>
          </div>
          <LifeFlames char={char} seasonIndex={seasonIndex} />
          {age < 6 && <div className="child-note">幼子(あと{6 - age}月で成人)</div>}
          {!compact && (
            <>
              <div className="char-meta">
                {p.label} / {god.name}の子
                {char.tomoshigata && ` / 灯座「${tozaOf(char.tomoshigata, char.element).name}」`}
              </div>
              <Bar value={char.hp} max={char.maxHp} kind="hp" />
              <Bar value={char.mp} max={char.maxMp} kind="mp" />
              <StatGrid stats={char.stats} />
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

// 綴(ナビゲーター)の一言
export function TsuzuriLine({ text }: { text: string }) {
  return (
    <div className="tsuzuri">
      <span className="tsuzuri-name">綴</span>
      <span className="tsuzuri-text">{text}</span>
    </div>
  )
}

export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className ?? ''}`}>
      {title && <h2 className="panel-title">{title}</h2>}
      {children}
    </section>
  )
}

// 演出シーンの背景絵。未生成の画は静かに隠し、演出は文字だけでも成立させる。
export function SceneBg({ file }: { file: string }) {
  const [ok, setOk] = useState(true)
  if (!ok) return null
  return <img className="scene-bg" src={gameImg(file)} alt="" aria-hidden onError={() => setOk(false)} />
}

// 季節の風物(v3.1 M15-8): 月に応じて雪・花びら・蛍・紅葉が郷に舞う
function seasonKind(month: number): 'snow' | 'petal' | 'firefly' | 'momiji' {
  const m = ((month % 12) + 12) % 12
  if (m >= 11 || m <= 1) return 'snow' // 師走〜如月
  if (m <= 4) return 'petal' // 弥生〜皐月
  if (m <= 7) return 'firefly' // 水無月〜葉月
  return 'momiji' // 長月〜霜月
}

const SEASON_GLYPH = { snow: '❄', petal: '❀', firefly: '●', momiji: '🍁' } as const

// 常夜の郷 — 画面奥に敷く一枚絵(SVG)。生成画像が来るまでの土台であり、来た後も霞として残る。
// bg を渡すと本画像を上に重ね、無ければ(未生成でも)このSVGだけで成立する。
export function NightBackdrop({ bg }: { bg?: string }) {
  const [bgOk, setBgOk] = useState(true)
  const seasonIndex = useGame((s) => s.data?.seasonIndex)
  const season = seasonIndex !== undefined && seasonIndex !== null ? seasonKind(seasonIndex) : null
  const stars = Array.from({ length: 54 }, (_, i) => ({
    x: (i * 197.3) % 1200,
    y: (i * 61.7) % 380,
    r: 0.6 + (i % 4) * 0.5,
    o: 0.35 + (i % 5) * 0.13,
  }))
  const roofs = Array.from({ length: 9 }, (_, i) => 120 + i * 118 + (i % 3) * 20)
  return (
    <div className="backdrop" aria-hidden>
      <svg className="backdrop-art" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="bdSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0e1d" />
            <stop offset="60%" stopColor="#111a34" />
            <stop offset="100%" stopColor="#1a1430" />
          </linearGradient>
          <radialGradient id="bdLamp" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#e8a33d" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#e8a33d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="720" fill="url(#bdSky)" />
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#e9debe" opacity={s.o} />
        ))}
        {/* 遠山の稜線 */}
        <path d="M0 720 L180 430 L340 520 L520 360 L700 500 L860 400 L1040 500 L1200 380 L1200 720 Z" fill="#1a2140" opacity="0.95" />
        <path d="M0 720 L260 500 L460 580 L680 470 L900 560 L1120 470 L1200 520 L1200 720 Z" fill="#232c4e" opacity="0.85" />
        {/* 手前の稜線に灯のリムライト */}
        <path d="M0 720 L260 500 L460 580 L680 470 L900 560 L1120 470 L1200 520" fill="none" stroke="#e8a33d" strokeWidth="1.2" opacity="0.18" />
        {/* 郷の家並みのシルエット */}
        <g fill="#080b16">
          {roofs.map((x, i) => (
            <path key={i} d={`M${x} 720 v-${36 + (i % 3) * 10} l${22 + (i % 2) * 6} -${16 + (i % 3) * 5} l${22 + (i % 2) * 6} ${16 + (i % 3) * 5} v${36 + (i % 3) * 10} Z`} />
          ))}
        </g>
        {/* 大燈籠のあかり */}
        <ellipse cx="600" cy="690" rx="240" ry="150" fill="url(#bdLamp)" />
      </svg>
      {bg && bgOk && (
        <img
          className="backdrop-photo"
          src={bg}
          alt=""
          onError={() => setBgOk(false)}
        />
      )}
      {season && (
        <div className={`season-fx season-${season}`} aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="season-particle"
              style={{
                left: `${(i * 37 + 8) % 100}%`,
                animationDelay: `${(i * 1.7) % 9}s`,
                animationDuration: `${8 + (i % 4) * 2.4}s`,
                fontSize: `${10 + (i % 3) * 4}px`,
              }}
            >
              {SEASON_GLYPH[season]}
            </span>
          ))}
        </div>
      )}
      <div className="backdrop-veil" />
    </div>
  )
}
