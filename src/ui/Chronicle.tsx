// M18 P5: 家譜 — 独立作業画面(UI_UX_REDESIGN_PLAN §5.10)
// 概要/称号/故人/年代記の4タブ。表示ロジック(computeRecords/ACHIEVEMENTS)は移動のみ・計算変更なし。
// 契約: docs/UI_SHELL_API.md。store/core の変更はしない(表示専用の定数・絞り込みのみ追加)。
import { useState } from 'react'
import { useGame } from '../core/store'
import { seasonLabel } from '../core/types'
import type { ChronicleEntry, GameData } from '../core/types'
import { godById, GODS } from '../core/data/gods'
import { ENEMIES } from '../core/data/enemies'
import { REGIONS } from '../core/data/regions'
import { REGION_LORE } from '../core/data/lore'
import { downloadChronicleCard, copyShareText } from './shareCard'
import { MaybeImg, Panel } from './components'
import { faceImg } from './img'
import { FamilyTree } from './FamilyTree'
import { ScreenShell, WorkspaceTabs, ActionDock, LifeThread } from './layout/shell'
import './chronicle_m18.css'

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

// 称号 — 記録から純粋に導出(読み取り専用・コアループ非改変)。達成/未達を一覧表示。
type RecordSummary = ReturnType<typeof computeRecords>
const ACHIEVEMENTS: { name: string; hint: string; test: (r: RecordSummary) => boolean }[] = [
  { name: '初めての看取り', hint: '一族の誰かを看取る', test: (r) => r.fallenN >= 1 },
  { name: '五代の家', hint: '五代まで血を継ぐ', test: (r) => r.gens >= 5 },
  { name: '十代の家', hint: '十代まで血を継ぐ', test: (r) => r.gens >= 10 },
  { name: '長寿の一族', hint: '二十年を生き延びる', test: (r) => r.years >= 20 },
  { name: '大家族', hint: '一族の総数が三十に至る', test: (r) => r.alive + r.fallenN >= 30 },
  { name: '百の魔性を討つ', hint: '討伐数100', test: (r) => r.kills >= 100 },
  { name: '千の魔性を討つ', hint: '討伐数1000', test: (r) => r.kills >= 1000 },
  { name: '千年の武', hint: '武功500', test: (r) => r.fame >= 500 },
  { name: '眷属を率いる者', hint: '眷属を六体懐かせる', test: (r) => r.familiars >= 6 },
  { name: '常夜百層・踏破', hint: '常夜百層を制す', test: (r) => r.towerBest >= 100 },
  { name: '常夜を鎮む', hint: '全ての地の主を鎮める', test: (r) => r.regionsCleared >= r.regionsTotal && r.regionsTotal > 0 },
  { name: '魔性図鑑・完', hint: '全ての魔性を見る', test: (r) => r.enemySeen >= r.enemyTotal && r.enemyTotal > 0 },
  { name: '星神図鑑・完', hint: '全ての星神を識る', test: (r) => r.godSeen >= r.godTotal && r.godTotal > 0 },
  { name: '土地の記・完', hint: '全ての土地の記を綴る', test: (r) => r.loreDone >= r.loreTotal && r.loreTotal > 0 },
  { name: '総べてを蒐む', hint: '総合収集率100%', test: (r) => r.collPct >= 100 },
]

// 年代記の種別絞り込み(M18 P5: 表示専用の定数・store/coreは変更しない)
const KIND_LABEL: Record<ChronicleEntry['kind'], string> = {
  birth: '誕生', death: '死', pact: '契り', triumph: '勝鬨', event: '出来事', era: '節目',
}
type KindFilter = 'all' | ChronicleEntry['kind']
const KIND_FILTERS: KindFilter[] = ['all', 'birth', 'death', 'pact', 'triumph', 'event', 'era']
const CHRON_PAGE = 200 // 大量一覧対策(§7契約): 直近200件+さらに繰る(200件刻み)

type Tab = 'overview' | 'titles' | 'fallen' | 'chronicle'
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: '概要' },
  { key: 'titles', label: '称号' },
  { key: 'fallen', label: '故人' },
  { key: 'chronicle', label: '年代記' },
]

export function ChronicleScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const [tab, setTab] = useState<Tab>('overview')
  const [copied, setCopied] = useState(false)
  const [showTree, setShowTree] = useState(false)
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [chronShown, setChronShown] = useState(CHRON_PAGE)

  const fallen = data.family.filter((c) => !c.alive)
  const rec = computeRecords(data)
  const achieved = ACHIEVEMENTS.filter((a) => a.test(rec))
  const head = data.family.find((c) => c.isHead)

  const chronAll = [...data.chronicle].reverse()
  const chronFiltered = kindFilter === 'all' ? chronAll : chronAll.filter((e) => e.kind === kindFilter)

  const changeKindFilter = (k: KindFilter) => {
    setKindFilter(k)
    setChronShown(CHRON_PAGE)
  }

  return (
    <ScreenShell
      title="家譜 — 燈守家千年紀"
      onBack={() => setScreen({ id: 'home' })}
      resources={head ? <>当主 <b>{head.name}</b>(第{head.gen}代)</> : undefined}
      tabs={<WorkspaceTabs tabs={TABS} active={tab} onChange={setTab} />}
      dock={
        <ActionDock>
          <button className="btn btn-main" onClick={() => setShowTree(true)}>
            家系図を見る
          </button>
          <span className="chron-keep-group">
            <span className="chron-keep-label">残す</span>
            <button className="btn" onClick={() => downloadChronicleCard(data)}>
              画像保存
            </button>
            <button
              className="btn"
              onClick={async () => {
                const ok = await copyShareText(data)
                setCopied(ok)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? '写した!' : '共有文コピー'}
            </button>
          </span>
        </ActionDock>
      }
    >
      {tab === 'overview' && (
        <Panel title={`一族の記録 — 総合収集率 ${rec.collPct}%`}>
          {/* 命脈 — 継がれた世代を灯る節で、次代をまだ点らぬ節で結ぶ(A案署名要素) */}
          <div className="chron-thread" title={`第${rec.gens}代まで継承`}>
            <LifeThread nodes={[...Array.from({ length: Math.max(1, rec.gens) }, () => ({ lit: true })), { lit: false }]} />
          </div>
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
      )}

      {tab === 'titles' && (
        <Panel title={`称号 — ${achieved.length}/${ACHIEVEMENTS.length}`}>
          <div className="titles-grid">
            {ACHIEVEMENTS.map((a) => {
              const got = a.test(rec)
              return (
                <div key={a.name} className={`title-badge ${got ? 'earned' : 'locked'}`} title={a.hint}>
                  <span className="title-badge-mark">{got ? '◉' : '○'}</span>
                  <span className="title-badge-name">{got ? a.name : '？？？'}</span>
                  <span className="title-badge-hint">{a.hint}</span>
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      {tab === 'fallen' && (
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
      )}

      {tab === 'chronicle' && (
        <Panel title={`年代記 — ${chronFiltered.length}件`}>
          <div className="chron-filter-row">
            {KIND_FILTERS.map((k) => (
              <button
                key={k}
                className={`btn btn-ghost filter-tab ${kindFilter === k ? 'active' : ''}`}
                onClick={() => changeKindFilter(k)}
              >
                {k === 'all' ? '全て' : KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="chronicle-scroll">
            {chronFiltered.length === 0 && <p>まだ何も記されていない。</p>}
            {chronFiltered.slice(0, chronShown).map((e, i) => {
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
          {chronFiltered.length > chronShown && (
            <button className="btn btn-ghost chron-more" onClick={() => setChronShown(chronShown + CHRON_PAGE)}>
              さらに繰る(残り{chronFiltered.length - chronShown}件)
            </button>
          )}
        </Panel>
      )}

      {showTree && <FamilyTree onClose={() => setShowTree(false)} />}
    </ScreenShell>
  )
}
