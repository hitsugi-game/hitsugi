import { useState, type ReactNode } from 'react'
import { useGame } from '../core/store'
import type { Character } from '../core/types'
import { STAT_LABELS, ELEMENT_LABELS, LIFESPAN_MONTHS } from '../core/types'
import { AGE_CURVE, ageOf } from '../core/inheritance'
import { growthBonus, growthCapacity, levelCap, xpToNext } from '../core/character_progression'
import type { StatKey } from '../core/types'
import { personalityById } from '../core/data/personalities'
import { godById } from '../core/data/gods'
import { tozaOf } from '../core/data/toza'
import { charSprite, faceImg, gameImg, HOME_BG, provisionalFaceImg, stageOf, uiIcon } from './img'

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

// 立ち絵 — 顔絵(性根で個人が見分く)→老い姿→成人姿→星脈の稽古着姿、の順に静かに退避。
// 灯型未定の幼子も人物として見える。成人の儀で選んだ型の顔絵へ移る。
export function Portrait({
  char, seasonIndex, size,
}: { char: Character; seasonIndex: number; size?: 'sm' }) {
  const age = ageOf(char, seasonIndex)
  const stage = stageOf(age)
  const isChild = age < 6 || !char.tomoshigata
  const provisional = provisionalFaceImg(char)
  // 退避連鎖: 候補srcを順に試し、全滅時だけ炎へ退避(charのidが変われば連鎖をやり直す)
  const candidates = isChild
    ? [provisional]
    : ([faceImg(char), stage === 'elder' ? charSprite(char, 'elder') : null, charSprite(char)]
        .filter(Boolean) as string[]).concat(provisional)
  const [idx, setIdx] = useState(0)
  const key = `${char.id}:${stage}:${char.tomoshigata ?? 'unformed'}`
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setIdx(0)
  }
  const src = idx < candidates.length ? candidates[idx] : null
  const isFace = src !== null && (idx === 0 || src === provisional)
  return (
    <span
      className={`portrait ${size === 'sm' ? 'portrait-sm' : ''} ${isChild ? 'is-child' : ''} ${isFace ? 'is-face' : ''}`}
      data-el={char.element}
      aria-hidden
    >
      {src ? (
        <img src={src} alt="" onError={() => setIdx((i) => i + 1)} />
      ) : (
        <span className="portrait-flame">{'\u{1F525}'}</span>
      )}
    </span>
  )
}

// 画像アイコン — 生成済みなら絵に、未生成なら従来の絵文字のまま(M17)
export function Ico({ name, fb, size = 20 }: { name: string; fb: string; size?: number }) {
  const [ok, setOk] = useState(true)
  if (!ok) return <span className="ico-fb">{fb}</span>
  return (
    <img
      className="ico" width={size} height={size} src={uiIcon(name)} alt="" aria-hidden
      onError={() => setOk(false)}
    />
  )
}

// あれば表示・なければ静かに消える汎用画像(M17)
export function MaybeImg({ src, className, alt = '' }: { src: string | null; className?: string; alt?: string }) {
  const [ok, setOk] = useState(true)
  const [lastSrc, setLastSrc] = useState(src)
  if (src !== lastSrc) {
    setLastSrc(src)
    setOk(true)
  }
  if (!ok || !src) return null
  return <img className={className} src={src} alt={alt} aria-hidden={alt === ''} onError={() => setOk(false)} />
}

export function CharCard({
  char, seasonIndex, selected, onClick, compact, progressionMode, children,
}: {
  char: Character
  seasonIndex: number
  selected?: boolean
  onClick?: () => void
  compact?: boolean
  progressionMode?: 'summary' | 'detail'
  children?: ReactNode
}) {
  const p = personalityById(char.personalityId)
  const god = godById(char.godParentId)
  const age = ageOf(char, seasonIndex)
  const className = `char-card ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''} ${age < 6 ? 'child' : ''}`
  const content = (
    <>
      <div className="char-card-row">
        <div className="char-portrait-wrap">
          <Portrait char={char} seasonIndex={seasonIndex} size={compact ? 'sm' : undefined} />
          {char.tomoshigata && (
            <MaybeImg
              src={gameImg(`emb_${char.tomoshigata}_${char.element}.png`)}
              className="char-emb"
            />
          )}
        </div>
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
          {progressionMode && (
            <CharacterProgression
              char={char}
              seasonIndex={seasonIndex}
              detail={progressionMode === 'detail'}
            />
          )}
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
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        aria-pressed={Boolean(selected)}
        onClick={onClick}
      >
        {content}
      </button>
    )
  }
  return <div className={className}>{content}</div>
}

const M46_STAT_KEYS: readonly StatKey[] = ['str', 'vit', 'dex', 'agi', 'mnd', 'luk']

function aptitudeLabel(value: number): string {
  if (value >= 90) return '極'
  if (value >= 70) return '秀'
  if (value >= 55) return '得意'
  if (value >= 40) return '並'
  return '苦手'
}

function CharacterProgression({
  char, seasonIndex, detail,
}: {
  char: Character
  seasonIndex: number
  detail: boolean
}) {
  const level = Number.isFinite(char.level) ? Math.max(1, Math.floor(char.level)) : 1
  const exp = Number.isFinite(char.exp) ? Math.max(0, Math.floor(char.exp)) : 0
  const cap = levelCap(char)
  const required = level < cap ? xpToNext(level) : 0
  const expPct = required > 0 ? Math.min(100, (exp / required) * 100) : 100
  const top = [...M46_STAT_KEYS]
    .sort((a, b) => char.potential[b] - char.potential[a] || a.localeCompare(b))
    .slice(0, 2)
  const age = Math.min(23, Math.max(0, ageOf(char, seasonIndex)))

  return (
    <div className="m46-progression-summary">
      <div className="m46-level-line">
        <span className="m46-level-value">Lv {level} / {cap}</span>
        <span className={`m46-level-state${level >= cap ? ' is-open' : ''}`}>
          {level >= cap ? '資質開花' : `経験 ${exp} / ${required}`}
        </span>
      </div>
      <div
        className="m46-exp-track"
        role="progressbar"
        aria-label={level >= cap ? '資質開花' : `次のレベルまでの経験 ${exp} / ${required}`}
        aria-valuemin={0}
        aria-valuemax={required || 1}
        aria-valuenow={level >= cap ? 1 : exp}
      >
        <span className="m46-exp-fill" style={{ width: `${expPct}%` }} />
      </div>
      <div className="m46-aptitude-tags" aria-label="高い資質">
        {top.map((key) => (
          <span className="m46-aptitude-tag" key={key}>{STAT_LABELS[key]} {aptitudeLabel(char.potential[key])}</span>
        ))}
      </div>
      {detail && (
        <div className="m46-progression-detail" aria-label="資質と熟達の詳細">
          {M46_STAT_KEYS.map((key) => {
            const bonus = growthBonus(char, key)
            const levelLimitValue = Math.max(1, Math.round((char.potential[key] + growthCapacity(char, key)) * AGE_CURVE[age]))
            const marks = char.trainingMarks?.[key] ?? 0
            return (
              <div className="m46-stat-growth" key={key}>
                <span className="m46-stat-growth-head"><span>{STAT_LABELS[key]}</span><b>{char.stats[key]}</b></span>
                <span className="m46-stat-growth-meta">資質{char.potential[key]}・鍛錬{marks}回</span>
                <span className="m46-stat-growth-meta">熟達+{bonus}・Lv上限時{levelLimitValue}</span>
              </div>
            )
          })}
        </div>
      )}
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

// 常夜の郷 — 世界表現は必ず一枚絵に寄せる。SVG/CSSの代替風景は重ねない。
export function NightBackdrop({ bg }: { bg?: string }) {
  const [bgOk, setBgOk] = useState(true)
  const seasonIndex = useGame((s) => s.data?.seasonIndex)
  const season = seasonIndex !== undefined && seasonIndex !== null ? seasonKind(seasonIndex) : null
  const resolvedBg = bg ?? gameImg(HOME_BG)
  return (
    <div className="backdrop" aria-hidden>
      <span className="backdrop-base" />
      {bgOk && (
        <img
          className="backdrop-photo"
          src={resolvedBg}
          alt=""
          onError={() => setBgOk(false)}
        />
      )}
      <span className="backdrop-veil" />
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
