import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Character } from '../core/types'
import { godById } from '../core/data/gods'
import { useGame } from '../core/store'
import { downloadFamilyTreeCard } from './shareCard'
import { MaybeImg } from './components'
import { useSheetBehavior } from './layout/dialogs'
import { faceImg } from './img'
import './familytree_m18.css'
import './familytree_m26.css'

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
  const nodeRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [lines, setLines] = useState<Line[]>([])
  const [selected, setSelected] = useState<Character | null>(null)
  const [query, setQuery] = useState('')
  const [aliveOnly, setAliveOnly] = useState(false)

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

  // M22 §4: フルスクリーンmodalにもSheetと同じ契約を配線
  // (ESC/フォーカストラップ/開閉フォーカス復帰/背景scroll lock — useSheetBehaviorへ集約)
  const dialogRef = useSheetBehavior(onClose)

  // ノードが画面中央に来るよう familytree-scroll の scrollLeft/Top を調整する(命脈線の計算には触れない)
  const scrollNodeIntoView = (id: string) => {
    const container = containerRef.current
    const el = nodeRefs.current.get(id)
    if (!container || !el) return
    const cRect = container.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    const targetLeft = container.scrollLeft + (eRect.left - cRect.left) - container.clientWidth / 2 + eRect.width / 2
    const targetTop = container.scrollTop + (eRect.top - cRect.top) - container.clientHeight / 2 + eRect.height / 2
    container.scrollTo({ left: Math.max(0, targetLeft), top: Math.max(0, targetTop), behavior: 'smooth' })
  }

  const goToHead = () => {
    const head = family.find((c) => c.isHead)
    if (head) scrollNodeIntoView(head.id)
  }

  const trimmedQuery = query.trim()
  const hitIds = useMemo(() => {
    if (!trimmedQuery) return new Set<string>()
    return new Set(family.filter((c) => c.name.includes(trimmedQuery)).map((c) => c.id))
  }, [family, trimmedQuery])

  useEffect(() => {
    if (!trimmedQuery) return
    const first = family.find((c) => c.name.includes(trimmedQuery))
    if (first) scrollNodeIntoView(first.id)
  }, [trimmedQuery, family])

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className="modal familytree-modal familytree-fullscreen"
        role="dialog"
        aria-modal="true"
        aria-label="家系図"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="familytree-topbar">
          <h2 className="panel-title familytree-title">家系図</h2>
          <div className="familytree-toolbar">
            <input
              type="text"
              className="familytree-search"
              placeholder="人物名で検索"
              aria-label="人物検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-ghost" onClick={goToHead}>
              当主へ戻る
            </button>
            <button
              className={`btn btn-ghost filter-tab ${aliveOnly ? 'active' : ''}`}
              aria-pressed={aliveOnly}
              onClick={() => setAliveOnly((v) => !v)}
            >
              存命のみ
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { const d = useGame.getState().data; if (d) void downloadFamilyTreeCard(d) }}
            >
              📷 一枚絵にして残す
            </button>
          </div>
          <button className="btn btn-ghost familytree-close" onClick={onClose}>
            閉じる
          </button>
        </div>
        <p className="familytree-legend-row" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
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
                {members.map((c) => {
                  const isHit = hitIds.has(c.id)
                  const isDimmed = aliveOnly && !c.alive
                  const nodeClass = [
                    'familytree-node',
                    c.alive ? 'alive' : 'dead',
                    selected?.id === c.id ? 'selected' : '',
                    isHit ? 'is-hit' : '',
                    isDimmed ? 'is-dimmed' : '',
                  ].filter(Boolean).join(' ')
                  return (
                    <button
                      key={c.id}
                      type="button"
                      ref={(el) => {
                        if (el) nodeRefs.current.set(c.id, el)
                        else nodeRefs.current.delete(c.id)
                      }}
                      className={nodeClass}
                      onClick={() => setSelected(c)}
                      data-testid="familytree-node"
                    >
                      {faceImg(c) && <MaybeImg src={faceImg(c)!} className="tree-face" />}
                      <span className={`element-badge el-${c.element} familytree-badge`}>
                        {c.alive ? '灯' : '逝'}
                      </span>
                      <span className="familytree-name">{c.name}</span>
                    </button>
                  )
                })}
              </div>
            ))}
            {byGen.length === 0 && <p style={{ padding: 16 }}>まだ一人も記されていない。</p>}
          </div>
        </div>

        {selected && (
          <div className="tsuzuri familytree-detail-band" style={{ marginTop: 12 }}>
            <span className="tsuzuri-name">{selected.name.slice(0, 2)}</span>
            <span className="tsuzuri-text">
              <b style={{ color: 'var(--amber)' }}>{selected.name}</b>(第{selected.gen}代) —
              {' '}{godById(selected.godParentId).name}の子(縁{Math.floor(godAffinity[selected.godParentId] ?? 0)})。
              {selected.alive ? '存命。' : `享年八季。${selected.epitaph ? `辞世「${selected.epitaph}」` : ''}`}
              {' '}討った魔性{selected.kills}、夜藪行{selected.expeditions}度。
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
