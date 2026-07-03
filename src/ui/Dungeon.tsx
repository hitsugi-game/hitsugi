import { useEffect, useRef, useState } from 'react'
import { useGame } from '../core/store'
import { regionById } from '../core/data/regions'
import { MONTH_NAMES } from '../core/types'
import { dungeonByRegion } from '../dungeon/maps'
import { DungeonEngine } from '../dungeon/engine'
import { boonById } from '../core/data/boons'
import { Bar, MaybeImg } from './components'
import { stageOf, uiIcon } from './img'
import { ageOf } from '../core/inheritance'
import { EventModal } from './Expedition'

// 灯籠の炎リング — 灯ゲージの視覚化(俺屍の月齢リング様式)
function LanternRing({ pct }: { pct: number }) {
  const R = 24
  const C = 2 * Math.PI * R
  const level = pct < 15 ? 'crit' : pct < 40 ? 'low' : 'ok'
  return (
    <div className={`lantern-ring lantern-${level}`} title={`灯 ${Math.round(pct)}/100`}>
      <svg viewBox="0 0 64 64" width="64" height="64">
        <circle cx="32" cy="32" r={R} fill="rgba(11,15,30,0.7)" stroke="rgba(201,168,106,0.25)" strokeWidth="3" />
        <circle
          cx="32" cy="32" r={R} fill="none"
          stroke="url(#lg)" strokeWidth="3.6" strokeLinecap="round"
          strokeDasharray={`${(C * pct) / 100} ${C}`}
          transform="rotate(-90 32 32)"
        />
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c9a86a" />
            <stop offset="100%" stopColor="#ff9d45" />
          </linearGradient>
        </defs>
        <g className="ring-flame" transform="translate(32 36)">
          <path d="M0,-14 C6,-7 5,0 0,4 C-5,0 -6,-7 0,-14Z" fill="#ff9d45" />
          <path d="M0,-8 C3,-4 2.6,0 0,2.4 C-2.6,0 -3,-4 0,-8Z" fill="#ffe8b0" />
        </g>
      </svg>
      <span className="ring-label">灯 {Math.round(pct)}</span>
    </div>
  )
}

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
  const boonDraft = useGame((s) => s.boonDraft)
  const chooseBoon = useGame((s) => s.chooseBoon)
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
        onEncounter: (golden) => dungeonEncounter(false, golden),
        onSpecialTile: (kind, x, y) => {
          if (kind === 'stairs') setConfirm({ kind: 'stairs' })
          else if (kind === 'entrance') setConfirm({ kind: 'return' })
          else {
            dungeonSpecial(kind, x, y)
            if (kind === 'chest' || kind === 'camp' || kind === 'shrine' || kind === 'monument') {
              engineRef.current?.markUsed(x, y)
            }
          }
        },
      },
      // 隊列の先頭が歩く姿になる(灯型×性別×年齢段階のスプライト — 老いた当主は老い姿で歩く)
      party[0]
        ? {
            gata: party[0].tomoshigata ?? 'homura',
            sex: party[0].sex,
            stage: stageOf(ageOf(party[0], data.seasonIndex)),
          }
        : undefined,
      // v3.1: テーマ/照明/プロップ散布のためのフロア情報
      {
        bg: region.bg,
        tier: region.tier as 1 | 2 | 3 | 4,
        seed: floorDef.seed,
        isBossFloor: run.floor === dungeon.floors.length - 1,
      },
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

  // 熱狂の赤い火(v3.1 M12-6): 松明が緋に燃え、敵影が凶暴化する
  useEffect(() => {
    engineRef.current?.setFrantic((run.frantic ?? 0) > 0)
  }, [run.frantic])

  // 闇夜の目(v3.1 M16-4): 敵影に気取られにくく
  useEffect(() => {
    engineRef.current?.setStealth((run.boons ?? []).includes('yamiyo'))
  }, [run.boons])

  useEffect(() => {
    engineRef.current?.setPaused(!!pendingEvent || confirm !== null || !!boonDraft)
  }, [pendingEvent, confirm, boonDraft])

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

      <div className="dungeon-hud-left">
        <LanternRing pct={run.light} />
        <div className="month-plate">
          <span className="month-name">{MONTH_NAMES[data.seasonIndex % 12]}</span>
          <span className="month-year">{Math.floor(data.seasonIndex / 12) + 1}年目</span>
        </div>
      </div>

      <div className="dungeon-title-plate" key={run.floor}>
        {region.name} 地下{run.floor + 1}層
      </div>

      <div className="dungeon-hud-top">
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

      {/* 灯の加護ドラフト(v3.1 M16-4) — この遠征だけの三択 */}
      {boonDraft && (
        <div className="modal-back">
          <div className="modal" style={{ maxWidth: 440 }}>
            <h2 className="panel-title">灯の加護 — ひとつだけ、授かれる</h2>
            {boonDraft.map((id) => {
              const b = boonById(id)
              if (!b) return null
              return (
                <button
                  key={id}
                  className="btn"
                  style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }}
                  onClick={() => chooseBoon(id)}
                >
                  <MaybeImg src={uiIcon(`boon_${b.id}`)} className="boon-ico" />
                  <b>{b.name}</b>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)' }}>{b.desc}</span>
                </button>
              )
            })}
            <button className="btn btn-ghost" onClick={() => chooseBoon(null)}>
              見送る
            </button>
          </div>
        </div>
      )}

      {/* 授かった加護の帯 */}
      {(run.boons?.length ?? 0) > 0 && (
        <div className="boon-strip">
          {run.boons!.map((id) => (
            <span key={id} className="boon-chip" title={boonById(id)?.desc}>
              {boonById(id)?.name?.replace('の加護', '').replace('の心得', '')}
            </span>
          ))}
        </div>
      )}

      <EventModal />
    </div>
  )
}
