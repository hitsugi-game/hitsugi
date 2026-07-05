import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Character } from '../core/types'
import { godById } from '../core/data/gods'
import { useGame } from '../core/store'
import { downloadFamilyTreeCard } from './shareCard'
import { MaybeImg } from './components'
import { faceImg } from './img'

// 家系図 — 世代交代の全体像を一望する(GDD_v3 M5)
// 世代ごとに縦カラムを並べ、親子線はSVGオーバーレイで描く(人親=金、神親=薄紫の点線)。
// pure React+CSS方式: 既存のポートレート資産をそのまま使い、DOM座標をuseLayoutEffectで測って線を引く。

interface Line {
  x1: number; y1: number; x2: number; y2: number
  kind: 'human' | 'god'
  affinity?: number // 神親線のみ: その神との現在の縁(太さ/濃さに反映)
}

export function FamilyTree({ onClose }: { onClose: () => void }) {
  const family: Character[] = useGame((s) => s.data?.family ?? [])
  const godAffinity = useGame((s) => s.data?.godAffinity ?? {})
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [lines, setLines] = useState<Line[]>([])
  const [selected, setSelected] = useState<Character | null>(null)

  const byGen = useMemo(() => {
    const gens = new Map<number, Character[]>()
    for (const c of family) {
      const list = gens.get(c.gen) ?? []
      list.push(c)
      gens.set(c.gen, list)
    }
    return [...gens.entries()].sort((a, b) => a[0] - b[0])
  }, [family])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const cRect = container.getBoundingClientRect()
    const next: Line[] = []
    for (const c of family) {
      const childEl = nodeRefs.current.get(c.id)
      if (!childEl) continue
      const childRect = childEl.getBoundingClientRect()
      const cx = childRect.left + childRect.width / 2 - cRect.left + container.scrollLeft
      const cy = childRect.top - cRect.top + container.scrollTop
      if (c.humanParentId) {
        const parentEl = nodeRefs.current.get(c.humanParentId)
        if (parentEl) {
          const pRect = parentEl.getBoundingClientRect()
          next.push({
            x1: pRect.left + pRect.width / 2 - cRect.left + container.scrollLeft,
            y1: pRect.bottom - cRect.top + container.scrollTop,
            x2: cx, y2: cy,
            kind: 'human',
          })
        }
      }
      // 神親は画面外(星界)にいるため、子の少し上から短い点線を垂らして示す。
      // 線の太さ/濃さは、その神との現在の縁の深さを映す(血脈と星の絆の可視化)。
      next.push({ x1: cx, y1: cy - 26, x2: cx, y2: cy, kind: 'god', affinity: godAffinity[c.godParentId] ?? 0 })
    }
    setLines(next)
  }, [family, byGen, godAffinity])

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal familytree-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">
          家系図 — 燈守家の世代交代
          <button
            className="btn btn-ghost"
            style={{ marginLeft: 12, fontSize: 12 }}
            onClick={() => { const d = useGame.getState().data; if (d) void downloadFamilyTreeCard(d) }}
          >
            📷 一枚絵にして残す
          </button>
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
          <span className="tree-legend"><i className="tree-legend-swatch human" />人の親</span>
          <span className="tree-legend"><i className="tree-legend-swatch god" />星の親(縁が深いほど太く濃い)</span>
          {' '}— 家名をクリックすると詳細を見られる。
        </p>
        <div className="familytree-scroll" ref={containerRef}>
          <svg className="familytree-svg" width="100%" height="100%">
            {lines.map((l, i) => (
              <line
                key={i}
                x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                className={`tree-line tree-line-${l.kind}`}
                style={l.kind === 'god'
                  ? { strokeWidth: 1 + Math.min(l.affinity ?? 0, 5) * 0.7, opacity: 0.3 + Math.min(l.affinity ?? 0, 5) * 0.14 }
                  : undefined}
              />
            ))}
          </svg>
          <div className="familytree-cols">
            {byGen.map(([gen, members]) => (
              <div key={gen} className="familytree-col">
                <div className="familytree-gen-label">第{gen}代</div>
                {members.map((c) => (
                  <div
                    key={c.id}
                    ref={(el) => {
                      if (el) nodeRefs.current.set(c.id, el)
                      else nodeRefs.current.delete(c.id)
                    }}
                    className={`familytree-node ${c.alive ? 'alive' : 'dead'} ${selected?.id === c.id ? 'selected' : ''}`}
                    onClick={() => setSelected(c)}
                  >
                    {faceImg(c) && <MaybeImg src={faceImg(c)!} className="tree-face" />}
                    <span className={`element-badge el-${c.element} familytree-badge`}>
                      {c.alive ? '灯' : '逝'}
                    </span>
                    <span className="familytree-name">{c.name}</span>
                  </div>
                ))}
              </div>
            ))}
            {byGen.length === 0 && <p style={{ padding: 16 }}>まだ一人も記されていない。</p>}
          </div>
        </div>

        {selected && (
          <div className="tsuzuri" style={{ marginTop: 12 }}>
            <span className="tsuzuri-name">{selected.name.slice(0, 2)}</span>
            <span className="tsuzuri-text">
              <b style={{ color: 'var(--amber)' }}>{selected.name}</b>(第{selected.gen}代) —
              {' '}{godById(selected.godParentId).name}の子(縁{Math.floor(godAffinity[selected.godParentId] ?? 0)})。
              {selected.alive ? '存命。' : `享年八季。${selected.epitaph ? `辞世「${selected.epitaph}」` : ''}`}
              {' '}討った魔性{selected.kills}、夜藪行{selected.expeditions}度。
            </span>
          </div>
        )}

        <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: 12 }}>
          閉じる
        </button>
      </div>
    </div>
  )
}
