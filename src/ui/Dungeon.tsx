import { useEffect, useRef, useState } from 'react'
import { useGame } from '../core/store'
import { regionById } from '../core/data/regions'
import { dungeonByRegion } from '../dungeon/maps'
import { DungeonEngine } from '../dungeon/engine'
import { Bar } from './components'
import { EventModal } from './Expedition'

type Confirm = { kind: 'stairs' } | { kind: 'return' } | null

export function DungeonScreen() {
  const run = useGame((s) => s.dungeonRun)
  if (!run) return null
  return <DungeonFloor key={run.floor} />
}

function DungeonFloor() {
  const data = useGame((s) => s.data)!
  const run = useGame((s) => s.dungeonRun)!
  const pendingEvent = useGame((s) => s.pendingEvent)
  const dungeonSetPos = useGame((s) => s.dungeonSetPos)
  const dungeonStep = useGame((s) => s.dungeonStep)
  const dungeonEncounter = useGame((s) => s.dungeonEncounter)
  const dungeonSpecial = useGame((s) => s.dungeonSpecial)
  const dungeonAdvanceFloor = useGame((s) => s.dungeonAdvanceFloor)
  const dungeonReturn = useGame((s) => s.dungeonReturn)

  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<DungeonEngine | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)

  const region = regionById(run.regionId)
  const dungeon = dungeonByRegion(run.regionId)!
  const floorDef = dungeon.floors[run.floor]
  const party = data.family.filter((c) => run.partyIds.includes(c.id) && c.alive)

  useEffect(() => {
    if (!hostRef.current) return
    const engine = new DungeonEngine(
      hostRef.current,
      floorDef,
      run.x >= 0 ? { x: run.x, y: run.y } : null,
      run.used,
      run.floor,
      {
        onStep: (x, y) => {
          dungeonSetPos(x, y)
          dungeonStep()
        },
        onEncounter: () => dungeonEncounter(false),
        onSpecialTile: (kind, x, y) => {
          if (kind === 'stairs') setConfirm({ kind: 'stairs' })
          else if (kind === 'entrance') setConfirm({ kind: 'return' })
          else {
            dungeonSpecial(kind, x, y)
            if (kind === 'chest' || kind === 'camp' || kind === 'shrine') {
              engineRef.current?.markUsed(x, y)
            }
          }
        },
      },
      // 隊列の先頭が歩く姿になる(灯型×性別のスプライト)
      party[0]
        ? { gata: party[0].tomoshigata ?? 'homura', sex: party[0].sex }
        : undefined,
    )
    engineRef.current = engine
    if (import.meta.env.DEV) {
      ;(window as unknown as { __dungeon?: unknown }).__dungeon = engine
    }
    void engine.init()
    return () => {
      engine.destroy()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.floor])

  useEffect(() => {
    engineRef.current?.setLight(run.light)
  }, [run.light])

  useEffect(() => {
    engineRef.current?.setPaused(!!pendingEvent || confirm !== null)
  }, [pendingEvent, confirm])

  const dpad = (dir: 'up' | 'down' | 'left' | 'right', label: string) => (
    <button
      className="dpad-btn"
      onPointerDown={(e) => {
        e.preventDefault()
        engineRef.current?.pressDir(dir, true)
      }}
      onPointerUp={() => engineRef.current?.pressDir(dir, false)}
      onPointerLeave={() => engineRef.current?.pressDir(dir, false)}
    >
      {label}
    </button>
  )

  return (
    <div className="dungeon-screen">
      <div className="dungeon-canvas" ref={hostRef} />

      <div className="dungeon-hud-top">
        <span className="exp-region">
          {region.name} 地下{run.floor + 1}層
        </span>
        <div className="light-wrap">
          <div className="light-label">灯</div>
          <Bar value={Math.round(run.light)} max={100} kind="light" />
        </div>
        <span className="resource">
          奉燈<b>{run.loot.hoto}</b> 血珠<b>{run.loot.ketsu}</b>
        </span>
        <button className="btn btn-danger" onClick={() => setConfirm({ kind: 'return' })}>
          帰り火
        </button>
      </div>

      <div className="dungeon-hud-party">
        {party.map((c) => (
          <div key={c.id} className="ally-cell">
            <div className="ally-name">{c.name}</div>
            <Bar value={c.hp} max={c.maxHp} kind="hp" />
          </div>
        ))}
      </div>

      <div className="dungeon-log">
        {run.log.slice(-3).map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>

      <div className="dpad">
        <div />
        {dpad('up', '▲')}
        <div />
        {dpad('left', '◀')}
        <div />
        {dpad('right', '▶')}
        <div />
        {dpad('down', '▼')}
        <div />
      </div>

      {confirm && (
        <div className="modal-back">
          <div className="modal" style={{ maxWidth: 420 }}>
            {confirm.kind === 'stairs' ? (
              <>
                <p style={{ marginBottom: 12 }}>下り階段がある。さらに深く潜るか?(深いほど実りは多いが、夜も濃い)</p>
                <button
                  className="btn btn-main"
                  onClick={() => {
                    setConfirm(null)
                    dungeonAdvanceFloor()
                  }}
                >
                  降りる
                </button>
              </>
            ) : (
              <>
                <p style={{ marginBottom: 12 }}>
                  帰り火を焚いて郷へ戻るか? 奉燈{run.loot.hoto}・血珠{run.loot.ketsu}を持ち帰る。(今月を使う)
                </p>
                <button
                  className="btn btn-main"
                  onClick={() => {
                    setConfirm(null)
                    dungeonReturn()
                  }}
                >
                  帰還する
                </button>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => setConfirm(null)}>
              やめる
            </button>
          </div>
        </div>
      )}

      <EventModal />
    </div>
  )
}
