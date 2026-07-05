import { useState } from 'react'
import { useGame } from '../core/store'
import { seasonLabel } from '../core/types'
import type { GameData } from '../core/types'
import { godById, GODS } from '../core/data/gods'
import { ENEMIES } from '../core/data/enemies'
import { REGIONS } from '../core/data/regions'
import { REGION_LORE } from '../core/data/lore'
import { downloadChronicleCard, copyShareText } from './shareCard'
import { MaybeImg, Panel } from './components'
import { faceImg } from './img'
import { FamilyTree } from './FamilyTree'

// 一族の記録 — 既存のdataから純粋関数で集計(新規storeフィールド不要)
function computeRecords(data: GameData) {
  const fam = data.family
  const gens = fam.length > 0 ? Math.max(...fam.map((c) => c.gen)) : 0
  const alive = fam.filter((c) => c.alive).length
  const fallenN = fam.length - alive
  const kills = fam.reduce((s, c) => s + (c.kills ?? 0), 0)
  const exped = fam.reduce((s, c) => s + (c.expeditions ?? 0), 0)
  const years = Math.floor(data.seasonIndex / 12) + 1
  const towerBest = typeof data.flags?.towerBest === 'number' ? data.flags.towerBest : 0
  // 収集(Codexと同じ基準)
  const seenEnemies = new Set((data.codex?.enemies ?? []).map((id) => id.replace(/_[wo]$/, '')))
  const knownGods = new Set([...(data.codex?.gods ?? []), ...Object.entries(data.godAffinity).filter(([, v]) => v > 0).map(([k]) => k)])
  const cleared = new Set(data.regionsCleared)
  const frags = data.loreFrags ?? {}
  const baseEnemies = ENEMIES.filter((e) => !/_[wo]$/.test(e.id))
  const loreRegions = REGIONS.filter((r) => REGION_LORE[r.id])
  const enemySeen = baseEnemies.filter((e) => seenEnemies.has(e.id)).length
  const godSeen = GODS.filter((g) => knownGods.has(g.id)).length
  const loreDone = loreRegions.filter((r) => cleared.has(r.id) && (frags[r.id] ?? 0) >= 3).length
  const collTotal = baseEnemies.length + GODS.length + loreRegions.length
  const collDone = enemySeen + godSeen + loreDone
  const collPct = collTotal > 0 ? Math.round((collDone / collTotal) * 100) : 0
  return {
    gens, alive, fallenN, kills, exped, years, towerBest, fame: data.fame,
    godsPacted: knownGods.size, familiars: data.familiars?.length ?? 0,
    regionsCleared: data.regionsCleared.length, regionsTotal: REGIONS.length,
    enemySeen, enemyTotal: baseEnemies.length, godSeen, godTotal: GODS.length,
    loreDone, loreTotal: loreRegions.length, collPct,
  }
}

export function ChronicleScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const [copied, setCopied] = useState(false)
  const [showTree, setShowTree] = useState(false)
  const fallen = data.family.filter((c) => !c.alive)
  const rec = computeRecords(data)

  return (
    <div className="screen">
      <h1 className="season-label" style={{ marginBottom: 14 }}>家譜 — 燈守家千年紀</h1>

      <Panel title={`一族の記録 — 総合収集率 ${rec.collPct}%`}>
        <div className="records-grid">
          <div className="rec-cell"><span className="rec-num">{rec.gens}</span><span className="rec-lbl">紡いだ世代</span></div>
          <div className="rec-cell"><span className="rec-num">{rec.years}</span><span className="rec-lbl">歳月(年)</span></div>
          <div className="rec-cell"><span className="rec-num">{rec.fame}</span><span className="rec-lbl">武功</span></div>
          <div className="rec-cell"><span className="rec-num">{rec.kills}</span><span className="rec-lbl">討った魔性</span></div>
          <div className="rec-cell"><span className="rec-num">{rec.exped}</span><span className="rec-lbl">夜藪行</span></div>
          <div className="rec-cell"><span className="rec-num">{rec.alive}<small>/{rec.alive + rec.fallenN}</small></span><span className="rec-lbl">存命 / 一族</span></div>
          <div className="rec-cell"><span className="rec-num">{rec.godsPacted}</span><span className="rec-lbl">契った星神</span></div>
          <div className="rec-cell"><span className="rec-num">{rec.familiars}</span><span className="rec-lbl">懐いた眷属</span></div>
          {rec.towerBest > 0 && <div className="rec-cell"><span className="rec-num">{rec.towerBest}<small>層</small></span><span className="rec-lbl">常夜百層 最高</span></div>}
          <div className="rec-cell"><span className="rec-num">{rec.regionsCleared}<small>/{rec.regionsTotal}</small></span><span className="rec-lbl">鎮めた地</span></div>
          <div className="rec-cell"><span className="rec-num">{rec.enemySeen}<small>/{rec.enemyTotal}</small></span><span className="rec-lbl">見た魔性</span></div>
          <div className="rec-cell"><span className="rec-num">{rec.godSeen}<small>/{rec.godTotal}</small></span><span className="rec-lbl">識る星神</span></div>
          <div className="rec-cell"><span className="rec-num">{rec.loreDone}<small>/{rec.loreTotal}</small></span><span className="rec-lbl">土地の記</span></div>
        </div>
      </Panel>

      <Panel title="逝きし者たち">
        <div className="chronicle-scroll">
          {fallen.length === 0 && <p>まだ誰も欠けていない。……それがどれほど稀有なことか。</p>}
          {fallen.map((c) => (
            <div key={c.id} className="fallen-card">
              <MaybeImg src={faceImg(c)} className="fallen-face" />
              <div className="fallen-body">
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
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="年代記">
        <div className="chronicle-scroll">
          {[...data.chronicle].reverse().map((e, i) => {
            const ch = e.charId ? data.family.find((c) => c.id === e.charId) : undefined
            return (
              <div key={i} className={`chron-entry chron-kind-${e.kind}`}>
                {ch && <MaybeImg src={faceImg(ch)} className="chron-face" />}
                <span className="chron-season">{seasonLabel(e.season)}</span>
                <span className={`chron-${e.kind}`}>{e.text}</span>
              </div>
            )
          })}
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
