import { useState } from 'react'
import type { Element, God } from '../core/types'
import { gameImg } from './img'

// M22 P0-3: 神立ち絵の欠落フォールバック(docs/POLISH_FIX_INSTRUCTIONS_CLAUDE.md §3)。
// 巨大な共通記号(✦)で「同じ絵」に見せない — 属性別の御影シルエット+神名の焼き込み+「絵姿準備中」。
// 神名が必ず入るため、絵が欠けた二柱が同一に見えることはない。

const EL_COLOR: Record<Element, string> = {
  fire: '#ff9d45',
  water: '#5b95cf',
  wind: '#7fae8f',
  earth: '#b08d55',
  moon: '#9b7fc2',
  star: '#c9d8f0',
}

// 属性ごとの御標(みしるべ) — 頭上/背後の紋
function ElementMotif({ el, c }: { el: Element; c: string }) {
  switch (el) {
    case 'fire':
      return (
        <g fill={c} opacity={0.8}>
          <path d="M100 16 C107 30 109 38 100 50 C91 38 93 30 100 16 Z" />
          <path d="M78 32 C82 40 83 45 78 52 C73 45 74 40 78 32 Z" />
          <path d="M122 32 C126 40 127 45 122 52 C117 45 118 40 122 32 Z" />
        </g>
      )
    case 'water':
      return (
        <g stroke={c} strokeWidth={3} fill="none" opacity={0.75} strokeLinecap="round">
          <path d="M52 206 Q100 190 148 206" />
          <path d="M58 220 Q100 206 142 220" />
          <path d="M66 234 Q100 222 134 234" />
        </g>
      )
    case 'wind':
      return (
        <g stroke={c} strokeWidth={3} fill="none" opacity={0.75} strokeLinecap="round">
          <path d="M34 116 Q76 96 118 114 Q146 126 164 108" />
          <path d="M40 146 Q84 130 124 144 Q148 152 162 140" />
        </g>
      )
    case 'earth':
      return (
        <g fill={c} opacity={0.55}>
          <path d="M54 62 L100 14 L146 62 Z" />
          <path d="M34 70 L64 40 L84 70 Z" opacity={0.7} />
        </g>
      )
    case 'moon':
      return <path d="M126 28 A38 38 0 1 0 126 108 A30 30 0 1 1 126 28 Z" fill={c} opacity={0.65} />
    default: // star
      return (
        <path
          d="M100 14 L108 46 L140 38 L116 60 L140 82 L108 74 L100 106 L92 74 L60 82 L84 60 L60 38 L92 46 Z"
          fill={c}
          opacity={0.55}
        />
      )
  }
}

export function GodArtFallback({ g, compact, className }: { g: Pick<God, 'id' | 'name' | 'kana' | 'element'>; compact?: boolean; className?: string }) {
  const c = EL_COLOR[g.element]
  return (
    <div className={`god-pane-fallback god-fallback ${compact ? 'god-fallback-sm' : ''} ${className ?? ''}`} data-el={g.element}>
      <span className="god-pane-aura" />
      <svg className="god-fallback-svg" viewBox="0 0 200 260" aria-hidden>
        <ElementMotif el={g.element} c={c} />
        {/* 御影 — 頭と衣の墨シルエット(属性色の縁光) */}
        <g fill="#0b0f1e" stroke={c} strokeOpacity={0.6} strokeWidth={1.6}>
          <circle cx="100" cy="74" r="20" />
          <path d="M100 92 C76 100 63 124 59 160 C55 198 57 220 61 236 L139 236 C143 220 145 198 141 160 C137 124 124 100 100 92 Z" />
        </g>
      </svg>
      <span className="god-fallback-name">{g.name}</span>
      {!compact && <span className="god-fallback-kana">{g.kana}</span>}
      <span className="god-fallback-note">絵姿準備中</span>
    </div>
  )
}

// 画像があれば表示し、404なら御影シルエットへ退避する(godIdが変われば試行し直す)
export function GodImgOrFallback({
  g, src, className, compact,
}: {
  g: Pick<God, 'id' | 'name' | 'kana' | 'element' | 'portrait'>
  src?: string
  className?: string
  compact?: boolean
}) {
  const [ok, setOk] = useState(true)
  const [lastId, setLastId] = useState(g.id)
  if (g.id !== lastId) {
    setLastId(g.id)
    setOk(true)
  }
  if (!ok) return <GodArtFallback g={g} compact={compact} className={className ? `${className} is-fallback` : undefined} />
  return (
    <img
      className={className}
      src={src ?? gameImg(g.portrait)}
      alt=""
      aria-hidden
      onError={() => setOk(false)}
    />
  )
}
