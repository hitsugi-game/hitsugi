import { useEffect, useRef, useState } from 'react'
import { useGame } from '../core/store'
import { regionById } from '../core/data/regions'
import { MONTH_NAMES } from '../core/types'
import { dungeonByRegion } from '../dungeon/maps'
import { DungeonEngine } from '../dungeon/engine'
import { TILE_CHARS } from '../dungeon/types'
import type { DungeonRun } from '../dungeon/types'
import { boonById } from '../core/data/boons'
import { Bar, MaybeImg } from './components'
import { Sheet } from './layout/shell'
import { regionSignOf } from '../core/data/region_visuals'
import { getReduceMotion } from '../core/settings'
import { regionBgR, stageOf, uiIcon } from './img'
import { ageOf } from '../core/inheritance'
import { EventModal } from './Expedition'
import { audio } from '../core/audio'
import './dungeon_m23.css'
import './dungeon_m24.css'
import './dungeon_m25.css'

// 地域背景 → 環境音レイヤーの対応(M10)
const AMBIENCE_BY_BG: Record<string, 'forest' | 'zaka' | 'tani' | 'miyama'> = {
  'bg_forest.png': 'forest', 'bg_zaka.png': 'zaka', 'bg_tani.png': 'tani', 'bg_miyama.png': 'miyama',
}

// M25 §3.2(7): D-padの各方向ボタンへ個別のaria-labelを付ける
const DPAD_ARIA_LABEL: Record<'up' | 'down' | 'left' | 'right', string> = {
  up: '上', down: '下', left: '左', right: '右',
}

// UI視覚(2026-07-17): 隊員HP札の瀕死しきい値。表示専用の派生値であり、戦闘/探索の計算には使わない。
const PARTY_HP_CRITICAL_RATIO = 0.25

// M24 §4.5: 短期目的の算出(石碑の残数はfloorDef.ascii+run.usedから導出、階段発見/灯不足はengine/runから)
function monumentProgress(ascii: string[], floorIndex: number, used: string[]): { found: number; total: number } {
  const usedSet = new Set(used)
  let total = 0
  let found = 0
  for (let y = 0; y < ascii.length; y++) {
    const row = ascii[y]
    for (let x = 0; x < row.length; x++) {
      if (TILE_CHARS[row[x]] !== 'monument') continue
      total++
      if (usedSet.has(`${floorIndex}:${x}:${y}`)) found++
    }
  }
  return { found, total }
}

function shortTermGoal(light: number, stairsFound: boolean, m: { found: number; total: number }): string {
  if (light < 15) return '帰り火を考えよ'
  if (stairsFound) return '下り階段を見つけた'
  if (m.total > 0 && m.found < m.total) return `石碑を探す ${m.found}/${m.total}`
  return '下り階段を探す'
}

// 灯籠の炎リング — 灯ゲージの視覚化(俺屍の月齢リング様式)
// 踏査%+短期目的を1つの帯として表示(M24 §4.5/§4.6)。engineをpollingするが500ms間隔で軽負荷。
function ObjectivePlate({
  engineRef, run, floorAscii,
}: {
  engineRef: React.MutableRefObject<{ exploreRatio(): number; stairsFound(): boolean } | null>
  run: DungeonRun
  floorAscii: string[]
}) {
  const [pct, setPct] = useState(0)
  const [stairs, setStairs] = useState(false)
  useEffect(() => {
    const t = setInterval(() => {
      setPct(Math.round((engineRef.current?.exploreRatio() ?? 0) * 100))
      setStairs(engineRef.current?.stairsFound() ?? false)
    }, 500)
    return () => clearInterval(t)
  }, [engineRef])
  const monuments = monumentProgress(floorAscii, run.floor, run.used)
  const goal = shortTermGoal(run.light, stairs, monuments)
  return (
    <div className="objective-plate">
      <span className="objective-goal" data-zone="hud-top">{goal}</span>
      <span className="objective-explore" data-zone="hud-top">踏査 {pct}%</span>
    </div>
  )
}

// M24 §4.6: 直近一文だけを画面下中央へ3〜5秒(3行常設をやめる)。履歴は小休止から読む。
function RecentLog({ log }: { log: string[] }) {
  const last = log[log.length - 1]
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<number | null>(null)
  useEffect(() => {
    if (!last) return
    setVisible(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    const life = getReduceMotion() ? 5000 : 3800
    timerRef.current = window.setTimeout(() => setVisible(false), life)
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [last])
  if (!last || !visible) return null
  return (
    <div className="dungeon-log-line" role="status" aria-live="polite">
      {last}
    </div>
  )
}

function LanternRing({ pct }: { pct: number }) {
  const R = 24
  const C = 2 * Math.PI * R
  const level = pct < 15 ? 'crit' : pct < 40 ? 'low' : 'ok'
  return (
    <div className={`lantern-ring lantern-${level}`} data-zone="hud-top" title={`灯 ${Math.round(pct)}/100`}>
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

type Confirm = { kind: 'stairs' } | { kind: 'return' } | { kind: 'pause' } | null

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
  // 眷属(式神, v3.1 M16-5): 随行中の一体の属性(未捕獲/未設定ならundefined)
  const familiarElement = data.familiars?.find((f) => f.enemyId === data.activeFamiliar)?.element

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
          audio.se('footstep')
        },
        onEncounter: (golden) => {
          audio.se('encounter')
          dungeonEncounter(false, golden)
        },
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
        familiarReveal: familiarElement === 'earth', // 眷属「宝目」(M16-5): 開幕に宝箱/石碑を表示
        // M23(指示7): 地域プロファイル+四幕(畏=最終前/座=ボス階)+鎮(討伐後)
        regionId: run.regionId,
        act:
          run.floor === dungeon.floors.length - 1
            ? 'seat'
            : run.floor === dungeon.floors.length - 2
              ? 'dread'
              : 'norm',
        cleared: data.regionsCleared.includes(run.regionId),
        showLandmark: run.floor === 0,
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

  // 地域の環境音(M10): 探索中だけ地域系統の音を敷き、離脱で止める
  useEffect(() => {
    audio.startAmbience(AMBIENCE_BY_BG[region.bg] ?? 'none')
    return () => audio.stopAmbience()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region.bg])

  const lastLightRef = useRef(run.light)
  useEffect(() => {
    engineRef.current?.setLight(run.light)
    // 灯が危険域(15%)を跨いで降下した瞬間だけ error 警告音(連打を避ける)
    if (lastLightRef.current >= 15 && run.light < 15 && run.light > 0) {
      audio.se('error')
    }
    lastLightRef.current = run.light
  }, [run.light])

  // 熱狂の赤い火(v3.1 M12-6): 松明が緋に燃え、敵影が凶暴化する
  useEffect(() => {
    engineRef.current?.setFrantic((run.frantic ?? 0) > 0)
  }, [run.frantic])

  // M29修正: 主討伐後(bossDown)にボス床を封じる。以後ボス床を踏んでも戦闘演出が空発火しない。
  useEffect(() => {
    if (run.bossDown) engineRef.current?.sealBoss()
  }, [run.bossDown])

  // 闇夜の目(v3.1 M16-4)+眷属「韋駄天」(風, v3.1 M16-5): 敵影に気取られにくく
  useEffect(() => {
    engineRef.current?.setStealth((run.boons ?? []).includes('yamiyo') || familiarElement === 'wind')
  }, [run.boons, familiarElement])

  // 眷属「夜目」(月, v3.1 M16-5→実効化): ミニマップに敵影を検知半径内で点す
  useEffect(() => {
    engineRef.current?.setNightVision(familiarElement === 'moon')
  }, [familiarElement])

  useEffect(() => {
    engineRef.current?.setPaused(!!pendingEvent || confirm !== null || !!boonDraft)
  }, [pendingEvent, confirm, boonDraft])

  // ESC / P で一時停止メニュー(他モーダルが開いていない時のみ)。開いていれば閉じる。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') return
      if (pendingEvent || boonDraft) return
      setConfirm((c) => (c === null ? { kind: 'pause' } : c.kind === 'pause' ? null : c))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingEvent, boonDraft])

  const dpad = (dir: 'up' | 'down' | 'left' | 'right', label: string) => (
    <button
      className="dpad-btn"
      data-zone="dpad"
      aria-label={DPAD_ARIA_LABEL[dir]}
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

      {/* M24 §4.6→M25 §3.2: 灯・地名・階層・短期目的を左上〜上中央の一帯へ統合。資源/暦は右寄せの小型表示。
          390px幅ではdungeon_m25.cssが2段gridへ再配置し、暦・資源・帰り火は非表示にして小休止sheetへ寄せる。 */}
      <div className="dungeon-hud-band" key={run.floor}>
        <LanternRing pct={run.light} />
        <div className="hud-band-text">
          <div className="hud-band-title" data-zone="hud-top">
            <span className="hud-region-name">{region.name}</span>
            <span className="hud-floor-num">地下{run.floor + 1}層</span>
          </div>
          <ObjectivePlate engineRef={engineRef} run={run} floorAscii={floorDef.ascii} />
        </div>
        <div className="hud-band-spacer" />
        <span className="hud-calendar">
          {MONTH_NAMES[data.seasonIndex % 12]}・{Math.floor(data.seasonIndex / 12) + 1}年目
        </span>
        <span className="hud-resource-chip">
          奉燈<b>{run.loot.hoto}</b> 血珠<b>{run.loot.ketsu}</b>
        </span>
        <button
          className="btn hud-pause-btn"
          data-zone="hud-top"
          onClick={() => setConfirm({ kind: 'pause' })}
          title="小休止(ESC)"
        >
          ☰ 小休止
        </button>
        {/* M25 §3.2 row2: モバイルの2段目に置く可視ミニマップ拡大ボタン(既存の不可視tap-zoneと併存) */}
        <button
          className="btn btn-ghost hud-minimap-btn"
          data-zone="hud-top"
          aria-label="地図を拡大表示する"
          title="地図を拡大"
          onClick={() => engineRef.current?.toggleMinimapZoom()}
        >
          🗺
        </button>
        <button className="btn btn-danger hud-return-btn" data-zone="return-fire" onClick={() => setConfirm({ kind: 'return' })}>
          帰り火
        </button>
      </div>

      {/* M24 §4.6: ミニマップ(Pixi描画)の上に重ねる不可視タップ域 — 拡大トグル */}
      <button
        className="minimap-tap-zone"
        data-zone="minimap"
        aria-label="地図の拡大表示を切り替える"
        onClick={() => engineRef.current?.toggleMinimapZoom()}
      />

      <FirstActIntro />

      <div className="dungeon-hud-party">
        {party.map((c) => {
          const isCritical = c.maxHp > 0 && c.hp / c.maxHp <= PARTY_HP_CRITICAL_RATIO
          return (
            <div key={c.id} className={`ally-cell${isCritical ? ' is-critical' : ''}`} data-zone="party">
              <div className="ally-name">{c.name}</div>
              <Bar value={c.hp} max={c.maxHp} kind="hp" />
            </div>
          )
        })}
      </div>

      <RecentLog log={run.log} />

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

      {/* 特殊床/帰還の確認 — 中央モーダルでなく下部の短い選択面(§5.3。SheetはPC=中央小窓/モバイル=下から) */}
      {confirm && confirm.kind === 'pause' && (
        <Sheet title="小休止" onClose={() => setConfirm(null)} closeLabel="探索に戻る">
          {/* M25 §3.2: 暦・今回の実りは小休止sheetへ寄せる(モバイルの上端HUDからは外す) */}
          <div className="pause-info-row">
            <span className="pause-calendar">
              {MONTH_NAMES[data.seasonIndex % 12]}・{Math.floor(data.seasonIndex / 12) + 1}年目
            </span>
            <span className="hud-resource-chip">
              奉燈<b>{run.loot.hoto}</b> 血珠<b>{run.loot.ketsu}</b>
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.8, marginBottom: 12 }}>
            移動: 矢印キー / 画面をタップ。<br />
            設定(音量・演出): 画面右上の ⚙。<br />
            灯が細るほど魔性は狂暴になる。深追いは禁物。
          </p>
          <div className="confirm-actions">
            {/* M25: 帰り火は小休止→本ボタンの2操作で到達できる導線 */}
            <button className="btn btn-danger" data-zone="return-fire" onClick={() => { setConfirm({ kind: 'return' }) }}>帰り火を焚く(郷へ)</button>
            <button className="btn btn-main" onClick={() => setConfirm(null)}>探索に戻る</button>
          </div>
        </Sheet>
      )}
      {confirm && confirm.kind === 'stairs' && (
        <Sheet title="下り階段" onClose={() => setConfirm(null)} closeLabel="やめる">
          <p style={{ marginBottom: 12, fontSize: 13.5 }}>さらに深く潜るか? 深いほど実りは多いが、夜も濃い。</p>
          <div className="confirm-actions">
            <button className="btn btn-ghost" onClick={() => setConfirm(null)}>やめる</button>
            <button className="btn btn-main" onClick={() => { setConfirm(null); dungeonAdvanceFloor() }}>降りる</button>
          </div>
        </Sheet>
      )}
      {confirm && confirm.kind === 'return' && (
        <Sheet title="帰り火を焚く" onClose={() => setConfirm(null)} closeLabel="やめる">
          <p style={{ marginBottom: 6, fontSize: 13.5 }}>
            いま帰れば、奉燈<b>{run.loot.hoto}</b>・血珠<b>{run.loot.ketsu}</b>を確実に持ち帰る。(今月を使う)
          </p>
          <p style={{ marginBottom: 12, fontSize: 12.5, color: 'var(--text-dim)' }}>
            進み続ければ実りは増えるが、隊が倒れれば持ち帰りは望めない。
          </p>
          <div className="confirm-actions">
            <button className="btn btn-ghost" onClick={() => setConfirm(null)}>やめる</button>
            <button className="btn btn-main" onClick={() => { setConfirm(null); dungeonReturn() }}>帰還する</button>
          </div>
        </Sheet>
      )}

      {/* 灯の加護ドラフト(v3.1 M16-4) — この遠征だけの三択 */}
      {boonDraft && (
        <Sheet title="灯の加護 — ひとつだけ、授かれる" onClose={() => chooseBoon(null)} closeLabel="見送る">
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
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-dim)' }}>{b.desc}</span>
              </button>
            )
          })}
        </Sheet>
      )}

      {/* 授かった加護の帯 */}
      {(run.boons?.length ?? 0) > 0 && (
        <div className="boon-strip">
          {run.boons!.map((id) => (
            <span key={id} className="boon-chip" title={boonById(id)?.desc}>
              <MaybeImg src={uiIcon(`boon_${id}`)} className="boon-chip-ico" />
              {boonById(id)?.name?.replace('の加護', '').replace('の心得', '')}
            </span>
          ))}
        </div>
      )}

      <EventModal />
    </div>
  )
}


// M23(指示7 V3): 第一幕「閾」 — 入場時に地名と署名を一度だけ見せる導入。
// 操作は止めない(pointer-events: none)。初入力または2秒の早い方で消える。
// run単位のintroSeenで戦闘往復・再マウントでの再表示を防ぐ。reduce-motion時はフェード無し。
function FirstActIntro() {
  const run = useGame((s) => s.dungeonRun)!
  const dungeonIntroSeen = useGame((s) => s.dungeonIntroSeen)
  const [visible, setVisible] = useState(run.floor === 0 && !run.introSeen)
  useEffect(() => {
    if (!visible) return
    // 見せた時点で即記録する — 解散(2秒/入力)前に敵影遭遇で戦闘へ落ちても再表示しない(レビュー反映)
    dungeonIntroSeen()
    const done = () => setVisible(false)
    const timer = window.setTimeout(done, 2000)
    const onInput = () => done()
    window.addEventListener('keydown', onInput)
    window.addEventListener('pointerdown', onInput)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onInput)
      window.removeEventListener('pointerdown', onInput)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])
  if (!visible) return null
  const region = regionById(run.regionId)
  const sign = regionSignOf(run.regionId)
  return (
    <div className={`act-intro ${getReduceMotion() ? 'act-intro-static' : ''}`} role="status" aria-live="polite">
      <MaybeImg src={regionBgR(region.id)} className="act-intro-bg" />
      <div className="act-intro-body">
        <span className="act-intro-tier">{'★'.repeat(region.tier)}</span>
        <h2 className="act-intro-name">{region.name}</h2>
        {sign && <p className="act-intro-sign">{sign.landmark} ・ {sign.particle}</p>}
      </div>
    </div>
  )
}
