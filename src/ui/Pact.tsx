import { useMemo, useState } from 'react'
import { useGame } from '../core/store'
import type { StatKey } from '../core/types'
import { GOD_RANK_LABELS, STAT_LABELS, ELEMENT_LABELS } from '../core/types'
import { GODS } from '../core/data/gods'
import { isAdult, predictChild } from '../core/inheritance'
import { CharCard, Panel, TsuzuriLine } from './components'

export function PactScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const doPact = useGame((s) => s.doPact)
  const [parentId, setParentId] = useState<string | null>(null)
  const [godId, setGodId] = useState<string | null>(null)

  const adults = data.family.filter((c) => c.alive && isAdult(c, data.seasonIndex))
  const parent = adults.find((c) => c.id === parentId) ?? null
  const god = GODS.find((g) => g.id === godId) ?? null

  const prediction = useMemo(
    () => (parent && god ? predictChild(parent, god) : null),
    [parent, god],
  )

  return (
    <div className="screen">
      <h1 className="season-label" style={{ marginBottom: 14 }}>星契りの儀</h1>
      <TsuzuriLine text="星神と契れば、翌季に子が生まれる。血潮は親と神から流れ込む — 誰の血を、どの星に継がせる?" />

      <Panel title="契る者を選ぶ">
        <div className="exp-party">
          {adults.map((c) => (
            <CharCard
              key={c.id}
              char={c}
              seasonIndex={data.seasonIndex}
              compact
              selected={parentId === c.id}
              onClick={() => setParentId(c.id)}
            />
          ))}
        </div>
      </Panel>

      <Panel title={`星神を選ぶ — 奉燈 ${data.hoto}`}>
        <div className="god-grid">
          {GODS.map((g) => {
            const affordable = data.hoto >= g.cost
            const affinity = Math.floor(data.godAffinity[g.id] ?? 0)
            return (
              <div
                key={g.id}
                className={`god-card ${godId === g.id ? 'selected' : ''} ${!affordable ? 'locked' : ''}`}
                onClick={() => affordable && setGodId(g.id)}
              >
                <div className="god-rank">{GOD_RANK_LABELS[g.rank]} / {ELEMENT_LABELS[g.element]}の星</div>
                <div className="god-name">{g.name}</div>
                <div className="god-kana">{g.kana}</div>
                <div className="god-cost">奉燈 {g.cost}{affinity > 0 ? ` ・縁 ${affinity}` : ''}</div>
                <div className="god-person">{g.personality}</div>
                {godId === g.id && <div className="god-desc">{g.desc}</div>}
              </div>
            )
          })}
        </div>
      </Panel>

      {parent && god && prediction && (
        <Panel title={`${parent.name} × ${god.name} — 子の血潮(見立て)`}>
          {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => {
            const [lo, hi] = prediction[k]
            return (
              <div key={k} className="predict-row">
                <span className="predict-label">{STAT_LABELS[k]}</span>
                <span className="predict-track">
                  <span
                    className="predict-range"
                    style={{ left: `${(lo / 120) * 100}%`, width: `${((hi - lo) / 120) * 100}%` }}
                  />
                </span>
                <span className="predict-num">{lo}〜 {hi}</span>
              </div>
            )
          })}
          <div className="pact-quote">
            「{god.pactLines[Math.min(Math.floor(data.godAffinity[god.id] ?? 0), god.pactLines.length - 1)]}」
          </div>
          <button className="btn btn-main" onClick={() => doPact(parent.id, god.id)}>
            契りを結ぶ(奉燈{god.cost}・今季を使う)
          </button>
        </Panel>
      )}

      <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>
        郷へ戻る
      </button>
    </div>
  )
}
