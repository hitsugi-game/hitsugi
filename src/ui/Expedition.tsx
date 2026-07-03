import { useState } from 'react'
import { useGame } from '../core/store'
import type { NodeType } from '../core/types'
import { REGIONS, regionById } from '../core/data/regions'
import { eventById } from '../core/expedition'
import { dungeonByRegion } from '../dungeon/maps'
import { isAdult } from '../core/inheritance'
import { PARTY_SIZE } from '../core/constants'
import { Bar, CharCard, Ico, MaybeImg, NightBackdrop, Panel, TsuzuriLine } from './components'
import { eventImg, gameImg, HOME_BG, regionBgR } from './img'
import './m17_home.css'

export function DepartScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const depart = useGame((s) => s.depart)
  const departDungeon = useGame((s) => s.departDungeon)
  const [regionId, setRegionId] = useState<string | null>(null)
  const [party, setParty] = useState<string[]>([])

  const adults = data.family.filter((c) => c.alive && isAdult(c, data.seasonIndex))
  const toggle = (id: string) =>
    setParty((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < PARTY_SIZE ? [...p, id] : p))

  return (
    <div className="screen">
      <NightBackdrop bg={gameImg(HOME_BG)} />
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

      <Panel title={`隊を組む(${party.length}/${PARTY_SIZE})`}>
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
        onClick={() => {
          if (!regionId) return
          // 歩行ダンジョン化済みの地域は新エンジンへ(段階移行)
          if (dungeonByRegion(regionId)) departDungeon(regionId, party)
          else depart(regionId, party)
        }}
      >
        出立する(今月を使う)
      </button>
      <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>
        郷へ戻る
      </button>
    </div>
  )
}

const NODE_META: Record<NodeType, { icon: string; iconImg: string; label: string }> = {
  battle: { icon: '⚔️', iconImg: 'node_battle', label: '魔性の気配' },
  elite: { icon: '👹', iconImg: 'node_elite', label: '強き魔性' },
  treasure: { icon: '📦', iconImg: 'node_treasure', label: '打ち捨てられた宝' },
  camp: { icon: '🔥', iconImg: 'node_camp', label: '焚火の跡' },
  event: { icon: '📜', iconImg: 'node_event', label: '何かがある' },
  boss: { icon: '💀', iconImg: 'node_boss', label: 'この地の主' },
  start: { icon: '⛩️', iconImg: 'node_start', label: '入口' },
}

export function EventModal() {
  const data = useGame((s) => s.data)!
  const pendingEvent = useGame((s) => s.pendingEvent)
  const resolveEvent = useGame((s) => s.resolveEvent)
  if (!pendingEvent) return null
  const ev = eventById(pendingEvent.eventId)
  return (
    <div className="modal-back">
      <div className="modal">
        <h2 className="panel-title">事件</h2>
        <MaybeImg src={eventImg(pendingEvent.eventId)} className="ev-img" />
        <p style={{ marginBottom: 16, fontSize: 15 }}>{ev.text}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ev.choices.map((c, i) => (
            <button
              key={i}
              className="btn"
              disabled={c.requireHoto !== undefined && data.hoto < c.requireHoto}
              onClick={() => resolveEvent(i)}
            >
              {c.label}
              {c.successRate !== undefined && ' (賭け)'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
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
    <div className="screen exp-screen">
      <div
        className="exp-bg"
        style={{ backgroundImage: `url(${regionBgR(region.id)}), url(${gameImg(region.bg)})` }}
        aria-hidden
      />
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
                  <span className="node-icon">
                    <Ico name={NODE_META[n.type].iconImg} fb={NODE_META[n.type].icon} size={22} />
                  </span>
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

      <EventModal />
    </div>
  )
}
