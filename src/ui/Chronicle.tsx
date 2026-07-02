import { useState } from 'react'
import { useGame } from '../core/store'
import { seasonLabel } from '../core/types'
import { godById } from '../core/data/gods'
import { downloadChronicleCard, copyShareText } from './shareCard'
import { Panel } from './components'
import { FamilyTree } from './FamilyTree'

export function ChronicleScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const [copied, setCopied] = useState(false)
  const [showTree, setShowTree] = useState(false)
  const fallen = data.family.filter((c) => !c.alive)

  return (
    <div className="screen">
      <h1 className="season-label" style={{ marginBottom: 14 }}>家譜 — 燈守家千年紀</h1>

      <Panel title="逝きし者たち">
        <div className="chronicle-scroll">
          {fallen.length === 0 && <p>まだ誰も欠けていない。……それがどれほど稀有なことか。</p>}
          {fallen.map((c) => (
            <div key={c.id} className="fallen-card">
              <span className="fallen-name">
                {c.name}(第{c.gen}代)
              </span>
              <span className="fallen-cause">
                {c.deathCause} — {godById(c.godParentId).name}の子
              </span>
              {c.deeds.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {c.deeds.join('。')}。討った魔性{c.kills}、夜藪行{c.expeditions}度。
                </div>
              )}
              {c.epitaph && <div className="fallen-epitaph">「{c.epitaph}」</div>}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="年代記">
        <div className="chronicle-scroll">
          {[...data.chronicle].reverse().map((e, i) => (
            <div key={i} className="chron-entry">
              <span className="chron-season">{seasonLabel(e.season)}</span>
              <span className={`chron-${e.kind}`}>{e.text}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="home-actions">
        <button className="btn btn-main" onClick={() => setShowTree(true)}>
          🌳 家系図を見る
        </button>
        <button className="btn" onClick={() => downloadChronicleCard(data)}>
          家譜を一枚絵に残す(画像保存)
        </button>
        <button
          className="btn"
          onClick={async () => {
            const ok = await copyShareText(data)
            setCopied(ok)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? '写した!' : '語り草を写す(共有文コピー)'}
        </button>
        <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>
          郷へ戻る
        </button>
      </div>

      {showTree && <FamilyTree onClose={() => setShowTree(false)} />}
    </div>
  )
}
