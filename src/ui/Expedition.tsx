import { useEffect, useRef, useState } from 'react'
import { useGame } from '../core/store'
import type { NodeType, Region } from '../core/types'
import { ELEMENT_LABELS } from '../core/types'
import { REGIONS, regionById } from '../core/data/regions'
import { ENEMIES } from '../core/data/enemies'
import { regionSignOf } from '../core/data/region_visuals'
import { eventById } from '../core/expedition'
import { facilityLevel } from '../core/data/facilities'
import { dungeonByRegion } from '../dungeon/maps'
import { isAdult } from '../core/inheritance'
import { PARTY_SIZE } from '../core/constants'
import { ActionDock, useForcedDialog } from './layout/shell'
import { DepartPartyPicker } from './DepartParty'
import { Bar, Ico, MaybeImg, NightBackdrop, Panel, TsuzuriLine } from './components'
import { eventImg, gameImg, HOME_BG, regionBgR } from './img'
import './m17_home.css'
import './depart_m18.css'

// ---- 夜行の絵巻 — 麓(燈ノ郷)から頂(玄冬の座)へ登る一本道の絵地図 ----
// 40地域を tier 順の登り道として縦絵巻に配置する。位置は index から決定的に算出(データ非依存)。
const MAP_W = 440
const STEP_Y = 56
const TIER_NAMES: Record<number, string> = { 1: '山麓', 2: '中腹', 3: '奥山', 4: '山頂' }

function nodePos(i: number): { x: number; y: number } {
  // 麓が下・頂が上。x は正弦の蛇行+小さな揺らぎ(決定的)
  const x = 220 + Math.round(Math.sin(i * 1.9) * 84) + ((i * 37) % 24) - 12
  return { x, y: 150 + i * STEP_Y }
}

function AscentMap({
  regions, fame, cleared, selected, onSelect,
}: {
  regions: Region[]
  fame: number
  cleared: string[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const H = 150 + regions.length * STEP_Y + 130
  // y は上下反転(配列先頭=麓=下端)
  const posOf = (i: number) => { const p = nodePos(i); return { x: p.x, y: H - p.y } }

  // 初回表示: 選択中の地(なければ最前線)を視界の中央へ
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let target = 0
    regions.forEach((r, i) => { if (fame >= r.unlockFame) target = i })
    if (selected) {
      const i = regions.findIndex((r) => r.id === selected)
      if (i >= 0) target = i
    }
    const scale = el.clientWidth / MAP_W
    el.scrollTop = Math.max(0, posOf(target).y * scale - el.clientHeight / 2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 道: 隣接ノードを結ぶ点線(中点を制御点にした滑らかな曲線)
  const pts = regions.map((_, i) => posOf(i))
  const path = pts.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = pts[i - 1]
    const mx = (prev.x + p.x) / 2
    return `Q ${prev.x} ${(prev.y + p.y) / 2} ${mx} ${(prev.y + p.y) / 2} T ${p.x} ${p.y}`
  }).join(' ')

  // 帯(tier)の境界線
  const tierBounds: { y: number; label: string }[] = []
  regions.forEach((r, i) => {
    if (i === 0 || r.tier !== regions[i - 1].tier) {
      tierBounds.push({ y: posOf(i).y + STEP_Y * 0.7, label: `${TIER_NAMES[r.tier] ?? ''} ${'★'.repeat(r.tier)}` })
    }
  })

  return (
    <div className="ascent-wrap" ref={wrapRef}>
      <svg className="ascent-svg" viewBox={`0 0 ${MAP_W} ${H}`} role="list" aria-label="行き先の絵地図">
        {/* 空〜山肌のグラデ地 */}
        <defs>
          <linearGradient id="ascSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0a1c" />
            <stop offset="45%" stopColor="#0f1630" />
            <stop offset="100%" stopColor="#182242" />
          </linearGradient>
          <radialGradient id="ascLamp" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e8a33d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={MAP_W} height={H} fill="url(#ascSky)" />
        {/* 星(高所ほど濃く) */}
        {Array.from({ length: 70 }, (_, i) => (
          <circle key={i} cx={(i * 167.3) % MAP_W} cy={(i * 97.7) % (H * 0.75)} r={0.5 + (i % 3) * 0.4} fill="#e9debe" opacity={0.14 + (i % 5) * 0.07} />
        ))}
        {/* 帯境界 */}
        {tierBounds.map((b, i) => (
          <g key={i}>
            <line x1={16} x2={MAP_W - 16} y1={b.y} y2={b.y} stroke="rgba(201,168,106,0.22)" strokeDasharray="2 6" />
            <text x={MAP_W - 20} y={b.y - 6} textAnchor="end" fontSize={11} fill="rgba(201,168,106,0.55)" letterSpacing={2}>{b.label}</text>
          </g>
        ))}
        {/* 頂 — 玄冬の座 */}
        <circle cx={220} cy={46} r={30} fill="#0d0a18" stroke="#4a3d6b" strokeWidth={1.4} opacity={0.95} />
        <circle cx={220} cy={46} r={37} fill="none" stroke="#6b5a96" strokeWidth={0.7} opacity={0.5} />
        <text x={220} y={100} textAnchor="middle" fontSize={11} fill="#9b8fc0" letterSpacing={4}>玄冬の座</text>
        {/* 道 */}
        <path d={path} fill="none" stroke="rgba(233,222,190,0.35)" strokeWidth={2} strokeDasharray="1 7" strokeLinecap="round" />
        {/* 麓 — 燈ノ郷 */}
        <ellipse cx={pts[0].x} cy={H - 44} rx={70} ry={26} fill="url(#ascLamp)" opacity={0.5} />
        <text x={pts[0].x} y={H - 26} textAnchor="middle" fontSize={12} fill="var(--gold)" letterSpacing={4}>燈ノ郷</text>
        {/* 地域ノード */}
        {regions.map((r, i) => {
          const p = posOf(i)
          const unlocked = fame >= r.unlockFame
          const isCleared = cleared.includes(r.id)
          const isSel = selected === r.id
          const left = p.x > 220 // ラベルは山道の外側へ
          const tx = left ? p.x + 15 : p.x - 15
          return (
            <g
              key={r.id}
              className={`asc-node ${unlocked ? 'is-open' : 'is-locked'} ${isSel ? 'is-sel' : ''}`}
              onClick={() => unlocked && onSelect(r.id)}
              onKeyDown={(e) => { if (unlocked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(r.id) } }}
              tabIndex={unlocked ? 0 : -1}
              role="listitem"
              aria-label={`${r.name}${unlocked ? '' : `(武功${r.unlockFame}で開通)`}${isCleared ? '・主討伐済' : ''}`}
            >
              {isSel && <circle cx={p.x} cy={p.y} r={15} fill="none" stroke="var(--sel)" strokeWidth={2} />}
              {unlocked && !isCleared && <circle cx={p.x} cy={p.y} r={13} fill="url(#ascLamp)" opacity={0.55} />}
              <circle
                cx={p.x} cy={p.y} r={7.5}
                fill={isCleared ? '#c9a86a' : unlocked ? '#e8a33d' : '#2a3252'}
                stroke={unlocked ? '#efe6d4' : '#4a5378'} strokeWidth={1.2}
              />
              {isCleared && <text x={p.x} y={p.y + 3.4} textAnchor="middle" fontSize={9} fill="#101830" fontWeight={700}>鎮</text>}
              <text x={tx} y={p.y + 1} textAnchor={left ? 'start' : 'end'} fontSize={12.5} letterSpacing={1}
                fill={isSel ? 'var(--sel)' : unlocked ? '#efe6d4' : '#5d668c'} fontWeight={isSel ? 700 : 500}>
                {r.name}
              </text>
              <text x={tx} y={p.y + 15} textAnchor={left ? 'start' : 'end'} fontSize={9.5}
                fill={unlocked ? (isCleared ? 'rgba(201,168,106,0.8)' : 'var(--ember-text)') : '#5d668c'}>
                {unlocked ? (isCleared ? '主討伐済' : r.bossId ? '★主あり' : '') : `武功${r.unlockFame}`}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// 前回選んだ地(localStorage) — M22 §5: 開いた瞬間から右ペインを非空にする
const LAST_REGION_KEY = 'hitsugi_last_region_v1'

// 初期選択: 前回選んだ地が今も有効ならそれを、なければ最前線(解禁済みの最上段)を選ぶ
function initialRegionId(fame: number): string | null {
  const unlocked = REGIONS.filter((r) => fame >= r.unlockFame)
  if (unlocked.length === 0) return null
  let last: string | null = null
  try {
    last = localStorage.getItem(LAST_REGION_KEY)
  } catch {
    // private mode等で読めなくても初期選択は成立させる
  }
  if (last && unlocked.some((r) => r.id === last)) return last
  return unlocked[unlocked.length - 1].id
}

// 地域画 — 404時は同じ森へ黙って差し替えず、地域名入りの墨絵シルエット+「遠見が利かぬ」(M22 §5)
function RegionArt({ region }: { region: Region }) {
  const [ok, setOk] = useState(true)
  const [lastId, setLastId] = useState(region.id)
  if (region.id !== lastId) {
    setLastId(region.id)
    setOk(true)
  }
  if (!ok) {
    // 地域idから決定的に山影をずらす(欠落した地同士が同一に見えないように+名前で必ず識別)
    const h = [...region.id].reduce((a, ch) => a + ch.charCodeAt(0), 0)
    const dx = h % 60
    const mx = 50 + (h % 200)
    return (
      <div className="region-art-fallback">
        <svg viewBox="0 0 320 130" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <circle cx={mx} cy={34} r={16} fill="#b9c4e8" opacity={0.5} />
          <path d={`M0 130 L${58 + dx} 62 L${118 + dx} 104 L${182 + dx} 54 L${248 + dx} 102 L320 66 L320 130 Z`} fill="#141b36" />
          <path d={`M0 130 L${34 + dx} 96 L${96 + dx} 118 L${170 + dx} 88 L320 116 L320 130 Z`} fill="#0d1226" />
          <rect x={0} y={96} width={320} height={20} fill="#a9b7d8" opacity={0.12} />
        </svg>
        <span className="region-art-name">{region.name}</span>
        <span className="region-art-note">遠見が利かぬ — 絵姿準備中</span>
      </div>
    )
  }
  return (
    <img
      className="region-detail-img"
      src={regionBgR(region.id)}
      alt=""
      aria-hidden
      onError={() => setOk(false)}
    />
  )
}

export function DepartScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const depart = useGame((s) => s.depart)
  const departDungeon = useGame((s) => s.departDungeon)
  const [regionId, setRegionId] = useState<string | null>(() => initialRegionId(data.fame))
  const [party, setParty] = useState<string[]>([])
  const selectRegion = (id: string) => {
    setRegionId(id)
    try {
      localStorage.setItem(LAST_REGION_KEY, id)
    } catch {
      // 保存できなくても選択は成立する
    }
  }

  const adults = data.family.filter((c) => c.alive && isAdult(c, data.seasonIndex))
  const toggle = (id: string) =>
    setParty((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < PARTY_SIZE ? [...p, id] : p))

  const selectedRegion = regionId ? regionById(regionId) : null
  // 出立不可の理由はCTA近くへ常時表示する(押してから初めて出さない — M22 §1.4)
  const dockNote = adults.length === 0
    ? '成人がいない — 幼子の成長を待つか、星契りで子を授かれ'
    : !selectedRegion
      ? '行き先を選べ'
      : party.length === 0
        ? `隊を組め(${party.length}/${PARTY_SIZE})`
        : undefined

  return (
    <div className="screen depart-m18-root">
      <NightBackdrop bg={gameImg(HOME_BG)} />
      <div className="depart-readybar">
        行き先 <b>{selectedRegion ? selectedRegion.name : '未選択'}</b>
        {' ／ '}隊 <b>{party.length}/{PARTY_SIZE}</b>
        {' ／ '}灯100で発つ
      </div>
      <h1 className="season-label" style={{ marginBottom: 14 }}>出立 — 夜藪行</h1>
      <TsuzuriLine text="行き先と、連れて行く者を選べ。四人まで。深く潜るほど実りは多いが、灯が尽きれば常夜はお前らを喰いに来る。" />

      <Panel title="行き先 — 夜行の絵巻">
        <div className="depart-cols">
          <AscentMap
            regions={REGIONS}
            fame={data.fame}
            cleared={data.regionsCleared}
            selected={regionId}
            onSelect={selectRegion}
          />
          <div className="depart-side">
            {!selectedRegion ? (
              <div className="region-detail region-detail-empty">
                <p>絵巻から行き先を選べ。灯った印が、いま踏み込める地だ。</p>
                <p className="asc-legend">
                  <span className="asc-lg"><i className="asc-dot asc-dot-open" />行ける地</span>
                  <span className="asc-lg"><i className="asc-dot asc-dot-clear" />主討伐済</span>
                  <span className="asc-lg"><i className="asc-dot asc-dot-lock" />未開通</span>
                </p>
                {facilityLevel(data.facilities, 'monomi') >= 1 && (
                  <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    物見櫓の見立て — ★の数は、その地に潜む魔性の強さの目安だ。
                  </p>
                )}
              </div>
            ) : (
              (() => {
                const isCleared = data.regionsCleared.includes(selectedRegion.id)
                const boss = selectedRegion.bossId ? ENEMIES.find((e) => e.id === selectedRegion.bossId) : undefined
                const sign = regionSignOf(selectedRegion.id)
                const monomiLv = facilityLevel(data.facilities, 'monomi')
                return (
                  // key=地域id: 選び直すたび灯写し(一度だけのreveal)をやり直す
                  <div className="region-detail" key={selectedRegion.id}>
                    <div className="region-hiutsushi">
                      <RegionArt region={selectedRegion} />
                      {boss && !isCleared && (
                        <MaybeImg src={gameImg(boss.sprite)} className="region-boss-sil" />
                      )}
                      {isCleared && <span className="region-shizume-seal" aria-hidden>鎮</span>}
                    </div>
                    <div className="region-detail-head">
                      <span className="region-name">{selectedRegion.name}</span>
                      <span className="region-tier">{'★'.repeat(selectedRegion.tier)}</span>
                    </div>
                    <p className="region-desc">{selectedRegion.desc}</p>
                    <p className="region-detail-sub">
                      深さ{selectedRegion.depth}
                      {isCleared ? ' ・ 主討伐済(鎮)' : selectedRegion.bossId ? ' ・ 主あり(未討伐)' : ''}
                    </p>
                    <p className="region-detail-risk">
                      見立て★{selectedRegion.tier} ／ 推奨武功 {selectedRegion.unlockFame}
                    </p>
                    {boss && (
                      <p className="region-boss-line">
                        主 <b>{boss.name}</b>
                        {isCleared
                          ? ' — 鎮められた'
                          : ` — 討てば奉燈${boss.hoto}・血珠${boss.ketsu}`}
                      </p>
                    )}
                    {sign && (
                      <p className="region-sign-line">
                        署名 {sign.landmark} ／ 兆し 「{sign.omen}」
                      </p>
                    )}
                    {monomiLv >= 1 && boss && !isCleared && (
                      <p className="region-monomi-line">
                        物見の見立て — 主は{ELEMENT_LABELS[boss.element]}の気配を帯びる。
                      </p>
                    )}
                  </div>
                )
              })()
            )}
          </div>
        </div>
      </Panel>

      <Panel title={`隊を組む(${party.length}/${PARTY_SIZE})`}>
        <DepartPartyPicker
          adults={adults}
          family={data.family}
          seasonIndex={data.seasonIndex}
          party={party}
          onToggle={toggle}
        />
      </Panel>

      <ActionDock note={dockNote}>
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
          {selectedRegion ? `${selectedRegion.name}へ` : '行き先未選択'} ／ {party.length}人 ／ 今月を使う
        </button>
        <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>
          郷へ戻る
        </button>
      </ActionDock>
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
  const pendingEvent = useGame((s) => s.pendingEvent)
  if (!pendingEvent) return null
  return <EventDialog eventId={pendingEvent.eventId} />
}

// M22 §4: 事件は「取り返しのつかない確定」— ESC/外側クリックで閉じない(誤閉鎖防止の例外)。
// role/aria/scroll lock/初期フォーカスのみ共通契約(useForcedDialog)を配線する。
function EventDialog({ eventId }: { eventId: string }) {
  const data = useGame((s) => s.data)!
  const resolveEvent = useGame((s) => s.resolveEvent)
  const ref = useForcedDialog()
  const ev = eventById(eventId)
  return (
    <div className="modal-back" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label="事件 — 選ばねば先へ進めない" ref={ref}>
        <h2 className="panel-title">事件</h2>
        <MaybeImg src={eventImg(eventId)} className="ev-img" />
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
