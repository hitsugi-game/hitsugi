// 図鑑(品質刷新v3.1 M14) — 魔性/星神/土地の記のコレクション
// 「収集して読み返す楽しみ」の受け皿。開示条件: 魔性=遭遇 / 星神=契り / 土地の記=訪問・欠片・討伐
import { useState } from 'react'
import { useGame } from '../core/store'
import { ELEMENT_LABELS, GOD_RANK_LABELS } from '../core/types'
import { ENEMIES } from '../core/data/enemies'
import { GODS } from '../core/data/gods'
import { REGIONS } from '../core/data/regions'
import { REGION_LORE } from '../core/data/lore'
import { MaybeImg, NightBackdrop, Panel } from './components'
import { gameImg, HOME_BG, regionBgR } from './img'

type Tab = 'enemies' | 'gods' | 'lore' | 'nemesis'

// 変異(若_w/老_o)を基礎種に畳む
function baseEnemyId(id: string): string {
  return id.replace(/_[wo]$/, '')
}

export function CodexScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const [tab, setTab] = useState<Tab>('lore')

  const seenEnemies = new Set((data.codex?.enemies ?? []).map(baseEnemyId))
  const knownGods = new Set([
    ...(data.codex?.gods ?? []),
    ...Object.entries(data.godAffinity).filter(([, v]) => v > 0).map(([k]) => k),
  ])
  const visited = new Set(data.regionsVisited ?? [])
  const cleared = new Set(data.regionsCleared)
  const frags = data.loreFrags ?? {}

  // 基礎種(変異を除いた一覧)+ボス
  const baseEnemies = ENEMIES.filter((e) => !/_[wo]$/.test(e.id))
  const enemySeen = baseEnemies.filter((e) => seenEnemies.has(e.id)).length
  const godSeen = GODS.filter((g) => knownGods.has(g.id)).length
  const loreRegions = REGIONS.filter((r) => REGION_LORE[r.id])
  const loreDone = loreRegions.filter((r) => cleared.has(r.id) && (frags[r.id] ?? 0) >= 3).length
  const nemeses = data.nemeses ?? []
  const enemyOf = (id: string) => ENEMIES.find((e) => e.id === id)
  const regionName = (id: string) => REGIONS.find((r) => r.id === id)?.name ?? '夜藪'

  return (
    <div className="screen">
      <NightBackdrop bg={gameImg(HOME_BG)} />
      <h1 className="season-label" style={{ marginBottom: 14 }}>図鑑 — 一族の見聞録</h1>

      <div className="god-filter-row" style={{ marginBottom: 12 }}>
        <button className={`btn btn-ghost filter-tab ${tab === 'lore' ? 'active' : ''}`} onClick={() => setTab('lore')}>
          土地の記 {loreDone}/{loreRegions.length}
        </button>
        <button className={`btn btn-ghost filter-tab ${tab === 'enemies' ? 'active' : ''}`} onClick={() => setTab('enemies')}>
          魔性 {enemySeen}/{baseEnemies.length}
        </button>
        <button className={`btn btn-ghost filter-tab ${tab === 'gods' ? 'active' : ''}`} onClick={() => setTab('gods')}>
          星神 {godSeen}/{GODS.length}
        </button>
        {nemeses.length > 0 && (
          <button className={`btn btn-ghost filter-tab ${tab === 'nemesis' ? 'active' : ''}`} onClick={() => setTab('nemesis')}>
            宿敵 {nemeses.length}
          </button>
        )}
      </div>

      {tab === 'lore' && (
        <Panel title="土地の記 — 石碑の欠片を集め、主を鎮めると綴られる">
          {loreRegions.map((r) => {
            const lore = REGION_LORE[r.id]
            const v = visited.has(r.id)
            const f = frags[r.id] ?? 0
            const c = cleared.has(r.id)
            return (
              <div key={r.id} className={`lore-entry ${c ? 'pacified' : ''}`}>
                <div className="lore-head">
                  <span className="lore-name">{v ? r.name : '???'}</span>
                  <span className="lore-state">
                    {v ? `欠片 ${f}/3` : '未踏'} {c && '・鎮魂済'}
                    {c && f >= 3 && ' ・土地の記 完'}
                  </span>
                </div>
                {v && (
                  <div className="lore-body">
                    <div className="lore-banner-wrap">
                      <MaybeImg src={regionBgR(r.id)} className="lore-banner" />
                      {c && <span className="lore-seal" title="主を鎮めた地">鎮</span>}
                    </div>
                    {lore.intro.map((l, i) => <p key={`i${i}`}>{l}</p>)}
                    {f >= 1 && lore.stir.map((l, i) => <p key={`s${i}`} className="lore-stir">{l}</p>)}
                    {f >= 3 && lore.core.map((l, i) => <p key={`c${i}`} className="lore-core">{l}</p>)}
                    {c && lore.requiem.map((l, i) => <p key={`r${i}`} className="lore-requiem">{l}</p>)}
                    {f < 3 && !c && <p className="lore-hint">— 石碑の欠片が、続きを知っている。</p>}
                  </div>
                )}
              </div>
            )
          })}
        </Panel>
      )}

      {tab === 'enemies' && (
        <Panel title="魔性見聞 — 遭った者だけが姿を知る">
          <div className="codex-grid">
            {baseEnemies.map((e) => {
              const seen = seenEnemies.has(e.id)
              return (
                <div key={e.id} className={`codex-card ${seen ? '' : 'unknown'}`}>
                  {seen && <MaybeImg src={gameImg(e.sprite)} className="codex-thumb" />}
                  <div className="codex-name">{seen ? e.name : '???'}</div>
                  <div className="codex-meta">
                    {seen ? `${ELEMENT_LABELS[e.element]} / 剛${e.tier}` : '—'}
                  </div>
                  {seen && <p className="codex-desc">{e.desc}</p>}
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      {tab === 'nemesis' && (
        <Panel title="宿敵 — 一族の血を吸い、名を得た魔性">
          {nemeses.length === 0 && <p style={{ fontSize: 13 }}>まだ宿敵はいない。……それは幸運か、まだ夜が浅いか。</p>}
          <div className="codex-grid">
            {nemeses.map((n) => {
              const e = enemyOf(n.enemyId)
              return (
                <div key={n.id} className="codex-card nemesis-card">
                  {e && <MaybeImg src={gameImg(e.sprite)} className="codex-thumb nemesis-thumb" />}
                  <div className="codex-name">{n.name}</div>
                  <div className="nemesis-level">{'★'.repeat(n.level)}{'☆'.repeat(Math.max(0, 5 - n.level))}</div>
                  <p className="codex-desc">
                    <b style={{ color: '#d8a7a0' }}>{n.victim}</b>を喰らい、{regionName(n.regionId)}にて名を得た。
                    逃すたび強くなる。討てば、特別な実りを遺す。
                  </p>
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      {tab === 'gods' && (
        <Panel title="星神名鑑 — 契りを交わした星々">
          <div className="codex-grid">
            {GODS.map((g) => {
              const known = knownGods.has(g.id)
              return (
                <div key={g.id} className={`codex-card ${known ? '' : 'unknown'}`}>
                  {known && <MaybeImg src={gameImg(g.portrait)} className="codex-thumb codex-thumb-tall" />}
                  <div className="codex-name">{known ? g.name : '???'}</div>
                  <div className="codex-meta">
                    {known ? `${GOD_RANK_LABELS[g.rank]} / ${ELEMENT_LABELS[g.element]}の星` : '—'}
                  </div>
                  {known && <p className="codex-desc">{g.desc}</p>}
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>
        郷へ戻る
      </button>
    </div>
  )
}
