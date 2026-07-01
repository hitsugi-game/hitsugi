import { useGame } from '../core/store'
import { seasonLabel } from '../core/types'
import { godById } from '../core/data/gods'
import { Panel } from './components'

export function ChronicleScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
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

      <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>
        郷へ戻る
      </button>
    </div>
  )
}
