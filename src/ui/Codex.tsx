// 図鑑(M18 P5) — 独立画面版。土地/魔性/星神/宿敵の見聞録。
// 参考: docs/UI_UX_REDESIGN_PLAN.md §5.10「図鑑」。契約: docs/UI_SHELL_API.md。
// 発見判定・データ導出のロジックは既存を移動のみ(変更禁止)。store/core は読むだけ。
// 未知は個別カードで並べず章/属性/tierごとに集約行へ。カード選択→詳細面(右ペイン/下部)へ長文を逃がす。
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useGame } from '../core/store'
import {
  ELEMENT_LABELS, GOD_RANK_LABELS,
  type Region, type God, type EnemyDef, type NemesisRecord,
} from '../core/types'
import { ENEMIES } from '../core/data/enemies'
import { GODS } from '../core/data/gods'
import { REGIONS } from '../core/data/regions'
import { REGION_LORE } from '../core/data/lore'
import { MaybeImg, NightBackdrop } from './components'
import { GodImgOrFallback } from './GodArtFallback'
import { gameImg, HOME_BG, regionBgR } from './img'
import { ScreenShell, WorkspaceTabs, EmptyGuide } from './layout/shell'
import './codex_m18.css'

type Tab = 'lore' | 'enemies' | 'gods' | 'nemesis'
const PAGE = 50 // 大量一覧は50件刻み(§7契約)

// 変異(若_w/老_o)を基礎種に畳む
function baseEnemyId(id: string): string {
  return id.replace(/_[wo]$/, '')
}

// ---- 表示専用の集約(章/属性/tierごとに既知カード+未知件数へ束ねる) ----
interface GroupEntry<T> { key: string; label: string; known: T[]; unknownCount: number }

function groupItems<T>(
  items: T[],
  isKnown: (item: T) => boolean,
  keyOf: (item: T) => string,
  labelOf: (key: string) => string,
  order: string[],
): GroupEntry<T>[] {
  const byKey = new Map<string, T[]>()
  for (const item of items) {
    const k = keyOf(item)
    const arr = byKey.get(k)
    if (arr) arr.push(item)
    else byKey.set(k, [item])
  }
  return order
    .filter((k) => byKey.has(k))
    .map((k) => {
      const arr = byKey.get(k)!
      return { key: k, label: labelOf(k), known: arr.filter(isKnown), unknownCount: arr.filter((it) => !isKnown(it)).length }
    })
}

// グループ内は既知カードのみ描画し、未知は「未知 あとN種」の集約行へ。shownは全グループ通しの表示上限。
function GroupedCards<T>({
  groups, shown, onMore, renderCard,
}: {
  groups: GroupEntry<T>[]
  shown: number
  onMore: () => void
  renderCard: (item: T) => ReactNode
}) {
  let rendered = 0
  const totalKnown = groups.reduce((sum, g) => sum + g.known.length, 0)
  return (
    <>
      {groups.map((g) => {
        if (g.known.length === 0 && g.unknownCount === 0) return null
        const remain = Math.max(0, shown - rendered)
        const visible = g.known.slice(0, remain)
        rendered += visible.length
        return (
          <div className="codex-group" key={g.key}>
            <div className="codex-group-head">{g.label}</div>
            {visible.length > 0 && <div className="codex-grid">{visible.map((it) => renderCard(it))}</div>}
            {g.unknownCount > 0 && <div className="codex-unknown-row">未知 あと{g.unknownCount}種</div>}
          </div>
        )
      })}
      {totalKnown > shown && (
        <button className="btn btn-ghost codex-more" onClick={onMore}>さらに表示({totalKnown - shown}件)</button>
      )}
    </>
  )
}

// ---- 詳細面 — グリッドには置かない長文をここへ ----
function LoreDetail({ r, frags, cleared }: { r: Region; frags: number; cleared: boolean }) {
  const lore = REGION_LORE[r.id]
  return (
    <div className="codex-detail-panel">
      <div className="lore-banner-wrap">
        <MaybeImg src={regionBgR(r.id)} className="codex-detail-banner" />
        {cleared && <span className="lore-seal" title="主を鎮めた地">鎮</span>}
      </div>
      <div className="codex-detail-name">{r.name}</div>
      <div className="codex-detail-meta">
        欠片 {frags}/3{cleared && ' ・鎮魂済'}{cleared && frags >= 3 && ' ・土地の記 完'}
      </div>
      <div className="codex-detail-body">
        {lore.intro.map((l, i) => <p key={`i${i}`}>{l}</p>)}
        {frags >= 1 && lore.stir.map((l, i) => <p key={`s${i}`} className="lore-stir">{l}</p>)}
        {frags >= 3 && lore.core.map((l, i) => <p key={`c${i}`} className="lore-core">{l}</p>)}
        {cleared && lore.requiem.map((l, i) => <p key={`r${i}`} className="lore-requiem">{l}</p>)}
        {frags < 3 && !cleared && <p className="lore-hint">— 石碑の欠片が、続きを知っている。</p>}
      </div>
    </div>
  )
}

function EnemyDetail({ e }: { e: EnemyDef }) {
  return (
    <div className="codex-detail-panel">
      <MaybeImg src={gameImg(e.sprite)} className="codex-detail-thumb" />
      <div className="codex-detail-name">{e.name}</div>
      <div className="codex-detail-meta">{ELEMENT_LABELS[e.element]} / 剛{e.tier}</div>
      <div className="codex-detail-body"><p>{e.desc}</p></div>
    </div>
  )
}

function GodDetail({ g }: { g: God }) {
  return (
    <div className="codex-detail-panel">
      <GodImgOrFallback g={g} className="codex-detail-thumb" compact />
      <div className="codex-detail-name">{g.name}</div>
      <div className="codex-detail-meta">{GOD_RANK_LABELS[g.rank]} / {ELEMENT_LABELS[g.element]}の星</div>
      <div className="codex-detail-body"><p>{g.desc}</p></div>
    </div>
  )
}

function NemesisDetail({ n, enemy, regionName }: { n: NemesisRecord; enemy: EnemyDef | undefined; regionName: string }) {
  return (
    <div className="codex-detail-panel">
      {enemy && <MaybeImg src={gameImg(enemy.sprite)} className="codex-detail-thumb nemesis-thumb" />}
      <div className="codex-detail-name">{n.name}</div>
      <div className="nemesis-level">{'★'.repeat(n.level)}{'☆'.repeat(Math.max(0, 5 - n.level))}</div>
      <div className="codex-detail-body">
        <p><b style={{ color: '#d8a7a0' }}>{n.victim}</b>を喰らい、{regionName}にて名を得た。逃すたび強くなる。討てば、特別な実りを遺す。</p>
      </div>
    </div>
  )
}

export function CodexScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const markCodexItemSeen = useGame((s) => s.markCodexItemSeen)
  const [tab, setTab] = useState<Tab>('lore')
  // M26 §12.1: 新着 = 発見済みだが「まだ開いていない」項目。開いた瞬間の未読集合をセッション内に固定し、
  // その項目を開いた時だけ個別に既読化する(画面mountで全件を消さない)。
  // (StrictMode二重実行でもref初期化は一度きり)
  const freshRef = useRef<{ en: Set<string>; gods: Set<string> } | null>(null)
  if (!freshRef.current) {
    const seenEn = new Set(data.codexSeenIds?.enemies ?? [])
    const seenGd = new Set(data.codexSeenIds?.gods ?? [])
    const enArr = (data.codex?.enemies ?? []).map(baseEnemyId)
    const gdArr = data.codex?.gods ?? []
    freshRef.current = {
      en: new Set(enArr.filter((id) => !seenEn.has(id))),
      gods: new Set(gdArr.filter((id) => !seenGd.has(id))),
    }
  }
  const fresh = freshRef.current
  const [freshOnly, setFreshOnly] = useState(false)
  // freshOnly はタブ別に振る舞う: タブを移ったら解除し、空一覧を引き継がない(§12.1)
  useEffect(() => { setFreshOnly(false) }, [tab])
  // タブごとに選択カード/表示件数を保持(§6.3: 滞在中は状態を失わない)
  const [selByTab, setSelByTab] = useState<Partial<Record<Tab, string>>>({})
  const [shownByTab, setShownByTab] = useState<Record<Tab, number>>({ lore: PAGE, enemies: PAGE, gods: PAGE, nemesis: PAGE })

  const seenEnemies = new Set((data.codex?.enemies ?? []).map(baseEnemyId))
  const knownGods = new Set([
    ...(data.codex?.gods ?? []),
    ...Object.entries(data.godAffinity).filter(([, v]) => v > 0).map(([k]) => k),
  ])
  const visited = new Set(data.regionsVisited ?? [])
  const cleared = new Set(data.regionsCleared)
  const frags = data.loreFrags ?? {}
  const nemeses = data.nemeses ?? []

  // 基礎種(変異を除いた一覧)
  const baseEnemies = ENEMIES.filter((e) => !/_[wo]$/.test(e.id))
  const enemySeen = baseEnemies.filter((e) => seenEnemies.has(e.id)).length
  const godSeen = GODS.filter((g) => knownGods.has(g.id)).length
  const loreRegions = REGIONS.filter((r) => REGION_LORE[r.id])
  const loreDone = loreRegions.filter((r) => cleared.has(r.id) && (frags[r.id] ?? 0) >= 3).length
  const enemyOf = (id: string) => ENEMIES.find((e) => e.id === id)
  const regionName = (id: string) => REGIONS.find((r) => r.id === id)?.name ?? '夜藪'

  const selectedId = selByTab[tab] ?? null
  // 項目を開いた時に個別既読化する(§12.1: mount一括ではなく開いた時だけ)
  const select = (id: string) => {
    setSelByTab((m) => ({ ...m, [tab]: id }))
    if (tab === 'enemies') markCodexItemSeen('enemies', id)
    else if (tab === 'gods') markCodexItemSeen('gods', id)
  }
  const shown = shownByTab[tab]
  const showMore = () => setShownByTab((m) => ({ ...m, [tab]: m[tab] + PAGE }))

  // 章(地域の剛度帯)ごとに束ねる
  const loreGroups = groupItems(
    loreRegions,
    (r) => visited.has(r.id),
    (r) => String(r.tier),
    (k) => `第${k}章`,
    [...new Set(loreRegions.map((r) => String(r.tier)))].sort((a, b) => Number(a) - Number(b)),
  )
  // 属性ごとに束ねる
  const enemyGroups = groupItems(
    freshOnly ? baseEnemies.filter((e) => fresh.en.has(e.id)) : baseEnemies,
    (e) => seenEnemies.has(e.id),
    (e) => e.element,
    (k) => `${ELEMENT_LABELS[k as keyof typeof ELEMENT_LABELS]}の魔性`,
    Object.keys(ELEMENT_LABELS),
  )
  // 位(下つ星〜極ツ星)ごとに束ねる
  const godGroups = groupItems(
    freshOnly ? GODS.filter((g) => fresh.gods.has(g.id)) : GODS,
    (g) => knownGods.has(g.id),
    (g) => String(g.rank),
    (k) => GOD_RANK_LABELS[Number(k) as keyof typeof GOD_RANK_LABELS],
    ['1', '2', '3', '4'],
  )

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'lore', label: `土地 ${loreDone}/${loreRegions.length}` },
    { key: 'enemies', label: `魔性 ${enemySeen}/${baseEnemies.length}`, badge: fresh.en.size },
    { key: 'gods', label: `星神 ${godSeen}/${GODS.length}`, badge: fresh.gods.size },
    ...(nemeses.length > 0 ? [{ key: 'nemesis' as const, label: `宿敵 ${nemeses.length}` }] : []),
  ]

  const selectedLore = tab === 'lore' && selectedId ? loreRegions.find((r) => r.id === selectedId) : undefined
  const selectedEnemy = tab === 'enemies' && selectedId ? baseEnemies.find((e) => e.id === selectedId) : undefined
  const selectedGod = tab === 'gods' && selectedId ? GODS.find((g) => g.id === selectedId) : undefined
  const selectedNemesis = tab === 'nemesis' && selectedId ? nemeses.find((n) => n.id === selectedId) : undefined
  const hasSelection = !!(selectedLore || selectedEnemy || selectedGod || selectedNemesis)

  return (
    <ScreenShell
      title="図鑑"
      onBack={() => setScreen({ id: 'home' })}
      tabs={<WorkspaceTabs tabs={TABS} active={tab} onChange={setTab} />}
      activeTab={tab}
    >
      <NightBackdrop bg={gameImg(HOME_BG)} />
      <div className="codex-layout">
        <div className="codex-list">
          {(tab === 'enemies' || tab === 'gods') && (fresh.en.size + fresh.gods.size > 0 || freshOnly) && (
            <div className="codex-fresh-row">
              <button
                className={`btn btn-ghost filter-tab ${freshOnly ? 'active' : ''}`}
                onClick={() => setFreshOnly(!freshOnly)}
              >
                新着だけ見る{tab === 'enemies' ? `(${fresh.en.size})` : `(${fresh.gods.size})`}
              </button>
            </div>
          )}
          {tab === 'lore' && (
            <GroupedCards
              groups={loreGroups}
              shown={shown}
              onMore={showMore}
              renderCard={(r) => (
                <button
                  key={r.id}
                  className={`btn codex-card codex-card-btn ${selectedId === r.id ? 'is-sel' : ''}`}
                  onClick={() => select(r.id)}
                >
                  <MaybeImg src={regionBgR(r.id)} className="codex-thumb" />
                  <span className="codex-name">{r.name}</span>
                  <span className="codex-meta">
                    欠片 {frags[r.id] ?? 0}/3{cleared.has(r.id) ? ' ・鎮魂済' : ''}
                  </span>
                </button>
              )}
            />
          )}

          {tab === 'enemies' && (
            <GroupedCards
              groups={enemyGroups}
              shown={shown}
              onMore={showMore}
              renderCard={(e) => (
                <button
                  key={e.id}
                  className={`btn codex-card codex-card-btn ${selectedId === e.id ? 'is-sel' : ''}`}
                  onClick={() => select(e.id)}
                >
                  <MaybeImg src={gameImg(e.sprite)} className="codex-thumb" />
                  <span className="codex-name">{e.name}</span>
                  <span className="codex-meta">{ELEMENT_LABELS[e.element]} / 剛{e.tier}</span>
                </button>
              )}
            />
          )}

          {tab === 'gods' && (
            <GroupedCards
              groups={godGroups}
              shown={shown}
              onMore={showMore}
              renderCard={(g) => (
                <button
                  key={g.id}
                  className={`btn codex-card codex-card-btn ${selectedId === g.id ? 'is-sel' : ''}`}
                  onClick={() => select(g.id)}
                >
                  <GodImgOrFallback g={g} className="codex-thumb codex-thumb-tall" compact />
                  <span className="codex-name">{g.name}</span>
                  <span className="codex-meta">{GOD_RANK_LABELS[g.rank]} / {ELEMENT_LABELS[g.element]}の星</span>
                </button>
              )}
            />
          )}

          {tab === 'nemesis' && (
            <>
              {nemeses.length === 0 ? (
                <EmptyGuide text="まだ宿敵はいない。……それは幸運か、まだ夜が浅いか。" />
              ) : (
                <>
                  <div className="codex-grid">
                    {nemeses.slice(0, shown).map((n) => {
                      const e = enemyOf(n.enemyId)
                      return (
                        <button
                          key={n.id}
                          className={`btn codex-card codex-card-btn nemesis-card ${selectedId === n.id ? 'is-sel' : ''}`}
                          onClick={() => select(n.id)}
                        >
                          {e && <MaybeImg src={gameImg(e.sprite)} className="codex-thumb nemesis-thumb" />}
                          <span className="codex-name">{n.name}</span>
                          <span className="nemesis-level">{'★'.repeat(n.level)}{'☆'.repeat(Math.max(0, 5 - n.level))}</span>
                        </button>
                      )
                    })}
                  </div>
                  {nemeses.length > shown && (
                    <button className="btn btn-ghost codex-more" onClick={showMore}>さらに表示({nemeses.length - shown}体)</button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="codex-detail">
          {selectedLore && <LoreDetail r={selectedLore} frags={frags[selectedLore.id] ?? 0} cleared={cleared.has(selectedLore.id)} />}
          {selectedEnemy && <EnemyDetail e={selectedEnemy} />}
          {selectedGod && <GodDetail g={selectedGod} />}
          {selectedNemesis && (
            <NemesisDetail n={selectedNemesis} enemy={enemyOf(selectedNemesis.enemyId)} regionName={regionName(selectedNemesis.regionId)} />
          )}
          {!hasSelection && <div className="codex-detail-empty">カードを選ぶと、ここに詳しく綴られる。</div>}
        </div>
      </div>
    </ScreenShell>
  )
}
