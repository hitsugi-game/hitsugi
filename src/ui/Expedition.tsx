import { useState } from 'react'
import { useGame } from '../core/store'
import type { NodeType } from '../core/types'
import { REGIONS, regionById } from '../core/data/regions'
import { isAdult } from '../core/inheritance'
import { Bar, CharCard, Panel, TsuzuriLine } from './components'

export function DepartScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const depart = useGame((s) => s.depart)
  const [regionId, setRegionId] = useState<string | null>(null)
  const [party, setParty] = useState<string[]>([])

  const adults = data.family.filter((c) => c.alive && isAdult(c, data.seasonIndex))
  const toggle = (id: string) =>
    setParty((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 4 ? [...p, id] : p))

  return (
    <div className="screen">
      <h1 className="season-label" style={{ marginBottom: 14 }}>出立 — 夜藪行</h1>
      <TsuzuriLine text="行き先と、連れて行く者を選べ。四人まで。深く潜るほど実りは多いが、灯が尽きれば常夜はお前らを喰いに来る。" />

      <Panel title="行き先">
        {REGIONS.map((r) => {
          const unlocked = data.fame >= r.unlockFame
          return (
            <div
              key={r.id}
              className={`region-card ${regionId === r.id ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`}
              onClick={() => unlocked && setRegionId(r.id)}
            >
              <div>
                <div className="region-name">{r.name}</div>
                <div className="region-desc">{unlocked ? r.desc : `武功${r.unlockFame}で道が開く`}</div>
              </div>
              <div className="region-tier">
                {'★'.repeat(r.tier)}
                {data.regionsCleared.includes(r.id) ? ' 主討伐済' : r.bossId ? ' 主あり' : ''}
              </div>
            </div>
          )
        })}
      </Panel>

      <Panel title={`隊を組む(${party.length}/4)`}>
        <div className="exp-party">
          {adults.map((c) => (
            <CharCard
              key={c.id}
              char={c}
              seasonIndex={data.seasonIndex}
              selected={party.includes(c.id)}
              onClick={() => toggle(c.id)}
            />
          ))}
        </div>
      </Panel>

      <button
        className="btn btn-main"
        disabled={!regionId || party.length === 0}
        onClick={() => regionId && depart(regionId, party)}
      >
        出立する(今季を使う)
      </button>
      <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>
        郷へ戻る
      </button>
    </div>
  )
}

const NODE_META: Record<NodeType, { icon: string; label: string }> = {
  battle: { icon: '⚔️', label: '魔性の気配' },
  elite: { icon: '👹', label: '強き魔性' },
  treasure: { icon: '📦', label: '打ち捨てられた宝' },
  camp: { icon: '🔥', label: '焚火の跡' },
  event: { icon: '📜', label: '何かがある' },
  boss: { icon: '💀', label: 'この地の主' },
  start: { icon: '⛩️', label: '入口' },
}

export function ExpeditionScreen() {
  const data = useGame((s) => s.data)!
  const chooseNode = useGame((s) => s.chooseNode)
  const useReturnFire = useGame((s) => s.useReturnFire)
  const exp = data.expedition
  if (!exp) return null
  const region = regionById(exp.regionId)
  const current = exp.nodes[exp.currentNodeId]
  const choices = current.choices.map((id) => exp.nodes[id])
  const party = data.family.filter((c) => exp.partyIds.includes(c.id) && c.alive)

  return (
    <div className="screen">
      <div className="exp-header">
        <span className="exp-region">{region.name}</span>
        <div className="light-wrap">
          <div className="light-label">灯 — 尽きれば常夜が牙を剥く</div>
          <Bar value={exp.light} max={100} kind="light" />
        </div>
        <span className="resource">
          持ち帰り: 奉燈<b>{exp.loot.hoto}</b> 血珠<b>{exp.loot.ketsu}</b>
        </span>
      </div>

      {exp.light <= 0 && (
        <TsuzuriLine text="灯が尽きた! 魔性が狂気を帯びる。今すぐ帰り火を焚け、欲をかくな!" />
      )}

      <Panel title="道行き">
        {choices.length > 0 ? (
          <>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-dim)' }}>
              深さ {current.depth}/{region.depth} — 次の道を選べ
            </p>
            <div className="node-choices">
              {choices.map((n) => (
                <button key={n.id} className="node-btn" onClick={() => chooseNode(n.id)}>
                  <span className="node-icon">{NODE_META[n.type].icon}</span>
                  <span className="node-label">{NODE_META[n.type].label}</span>
                  <div className="node-depth">深さ{n.depth}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p style={{ textAlign: 'center', padding: 16 }}>
            これより先に道はない。帰り火を焚いて郷へ戻ろう。
          </p>
        )}
        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-danger" onClick={useReturnFire}>
            帰り火を焚く(成果を持って帰還)
          </button>
        </div>
      </Panel>

      <Panel title="隊の様子">
        <div className="exp-party">
          {party.map((c) => (
            <div key={c.id} className="ally-cell">
              <div className="ally-name">{c.name}</div>
              <Bar value={c.hp} max={c.maxHp} kind="hp" />
              <Bar value={c.mp} max={c.maxMp} kind="mp" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="道中の記">
        <div className="exp-log">
          {exp.log.slice(-6).map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      </Panel>
    </div>
  )
}
