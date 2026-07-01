import type { ReactNode } from 'react'
import type { Character } from '../core/types'
import { STAT_LABELS, ELEMENT_LABELS, LIFESPAN_SEASONS } from '../core/types'
import { ageOf } from '../core/inheritance'
import { personalityById } from '../core/data/personalities'
import { godById } from '../core/data/gods'

// 命の灯 — 残り季節を炎の点で表す(本作の象徴UI)
export function LifeFlames({ char, seasonIndex }: { char: Character; seasonIndex: number }) {
  const age = ageOf(char, seasonIndex)
  const left = Math.max(0, LIFESPAN_SEASONS - age)
  return (
    <span className="life-flames" title={`残り${left}季`}>
      {Array.from({ length: LIFESPAN_SEASONS }, (_, i) => (
        <span key={i} className={`flame ${i < left ? 'lit' : 'out'} ${i === left - 1 ? 'last' : ''}`}>
          {i < left ? '🔥' : '・'}
        </span>
      ))}
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
      className={`char-card ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''} ${age < 2 ? 'child' : ''}`}
      onClick={onClick}
    >
      <div className="char-head">
        <span className={`element-badge el-${char.element}`}>{ELEMENT_LABELS[char.element]}</span>
        <span className="char-name">
          {char.isHead && <span className="head-mark">当主</span>}
          {char.name}
        </span>
        <span className="char-gen">{char.gen}代</span>
      </div>
      <LifeFlames char={char} seasonIndex={seasonIndex} />
      {age < 2 && <div className="child-note">幼子(あと{2 - age}季で成人)</div>}
      {!compact && (
        <>
          <div className="char-meta">
            {p.label} / {god.name}の子
          </div>
          <Bar value={char.hp} max={char.maxHp} kind="hp" />
          <Bar value={char.mp} max={char.maxMp} kind="mp" />
          <StatGrid stats={char.stats} />
        </>
      )}
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
