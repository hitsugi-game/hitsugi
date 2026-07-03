// 交神の儀(品質刷新v3.1 M9) — 俺屍様式の二面構成
// 左=神名リスト(属性印+名+奉納点、奉納点昇順、位階タブ×属性チップ)/右=大立ち絵+情報札。
// 遺伝子画面: 親系(人)/神系の二列バー+子の見立てレンジ。確定時は炎輪カットイン。
import { useMemo, useState } from 'react'
import { useGame } from '../core/store'
import type { StatKey, GodRank, Element } from '../core/types'
import { GOD_RANK_LABELS, STAT_LABELS, ELEMENT_LABELS } from '../core/types'
import { GODS, godUnlocked } from '../core/data/gods'
import { isAdult, predictChild, godStatValue, pactCost } from '../core/inheritance'
import { CharCard, NightBackdrop, Panel, TsuzuriLine } from './components'
import { gameImg, godMaxImg, HOME_BG } from './img'

// 封印中の神の解放条件を一言で(unlock条件から自動生成)
function sealHint(g: (typeof GODS)[number]): string {
  const u = g.unlock
  if (!u) return ''
  const parts: string[] = []
  if (u.fame !== undefined) parts.push(`武功${u.fame}`)
  if (u.regionId !== undefined) parts.push('とある地の主の討伐')
  if (u.gen !== undefined) parts.push(`第${u.gen}代の血`)
  return `${parts.join('と')}で道が開く`
}

const GOD_EMOJI: Record<string, string> = {
  ishiusu: '🗿', tsubame: '🐦', shimihime: '📖', chidori: '🌊', kagaribi: '🔥',
  yoigumo: '🕸️', yukiango: '☃️', tsukiura: '🐇', orihime: '🧵', ookuma: '🐻',
  narukami: '🥁', hokushin: '🌟',
}

export function PactScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const doPact = useGame((s) => s.doPact)
  const [parentId, setParentId] = useState<string | null>(null)
  const [godId, setGodId] = useState<string | null>(null)
  const [rankTab, setRankTab] = useState<GodRank | 0>(0) // 0=全て
  const [elemChip, setElemChip] = useState<Element | null>(null)
  const [ritual, setRitual] = useState(false) // 炎輪カットイン中

  const adults = data.family.filter((c) => c.alive && isAdult(c, data.seasonIndex))
  const parent = adults.find((c) => c.id === parentId) ?? null
  const god = GODS.find((g) => g.id === godId) ?? null

  // 奉納点(cost)昇順 — 俺屍の神名リスト様式
  const shownGods = GODS.filter(
    (g) => (rankTab === 0 || g.rank === rankTab) && (elemChip === null || g.element === elemChip),
  ).sort((a, b) => a.cost - b.cost)

  const prediction = useMemo(
    () => (parent && god ? predictChild(parent, god) : null),
    [parent, god],
  )

  const beginRitual = () => {
    if (!parent || !god || ritual) return
    setRitual(true)
    setTimeout(() => {
      doPact(parent.id, god.id)
      setRitual(false)
    }, 1100)
  }

  return (
    <div className="screen pact-screen">
      <NightBackdrop bg={gameImg(HOME_BG)} />
      <h1 className="season-label" style={{ marginBottom: 14 }}>交神の儀</h1>
      <TsuzuriLine text="星神と契れば、翌季に子が生まれる。血潮は親と神から流れ込む — 誰の血を、どの星に継がせる?" />

      <Panel title="契る者を選ぶ">
        <div className="exp-party">
          {adults.map((c) => (
            <CharCard
              key={c.id}
              char={c}
              seasonIndex={data.seasonIndex}
              compact
              selected={parentId === c.id}
              onClick={() => setParentId(c.id)}
            />
          ))}
        </div>
      </Panel>

      <Panel title={`星神を選ぶ — 奉燈 ${data.hoto}`}>
        <div className="god-filter">
          <div className="god-filter-row">
            {([0, 1, 2, 3, 4] as const).map((r) => (
              <button
                key={r}
                className={`btn btn-ghost filter-tab ${rankTab === r ? 'active' : ''}`}
                onClick={() => setRankTab(r)}
              >
                {r === 0 ? '全て' : GOD_RANK_LABELS[r]}
              </button>
            ))}
          </div>
          <div className="god-filter-row">
            {(Object.keys(ELEMENT_LABELS) as Element[]).map((el) => (
              <button
                key={el}
                className={`element-badge el-${el} elem-chip ${elemChip === el ? 'active' : ''}`}
                title={`${ELEMENT_LABELS[el]}の星だけ見る`}
                onClick={() => setElemChip(elemChip === el ? null : el)}
              >
                {ELEMENT_LABELS[el]}
              </button>
            ))}
          </div>
        </div>

        <div className="pact-main">
          {/* 左: 神名リスト(奉納点昇順) */}
          <div className="god-list" role="listbox">
            {shownGods.length === 0 && (
              <p className="god-list-empty">その条件の星は、今夜は見えない。</p>
            )}
            {shownGods.map((g) => {
              const sealed = !godUnlocked(g, data)
              const affinity = Math.floor(data.godAffinity[g.id] ?? 0)
              const eff = pactCost(g, data.godAffinity[g.id] ?? 0) // 縁の割引(M12-2)
              const affordable = data.hoto >= eff && !sealed
              return (
                <button
                  key={g.id}
                  className={`god-row ${godId === g.id ? 'selected' : ''} ${!affordable ? 'locked' : ''}`}
                  onClick={() => affordable && setGodId(g.id)}
                >
                  <span className={`element-badge el-${g.element} god-row-el`}>{ELEMENT_LABELS[g.element]}</span>
                  <span className="god-row-name">
                    {sealed ? '???' : g.name}
                    {sealed && <span className="god-row-hint">{sealHint(g)}</span>}
                  </span>
                  {affinity > 0 && !sealed && <span className="god-row-affinity">縁{affinity}</span>}
                  <span className="god-row-cost">
                    {sealed ? '—' : eff}
                    {!sealed && eff < g.cost && <span className="god-row-base">{g.cost}</span>}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 右: 大立ち絵+情報札 */}
          <div className="god-stage">
            {god ? (
              <GodPortraitPane godId={god.id} sealedHint={null} affinity={Math.floor(data.godAffinity[god.id] ?? 0)} />
            ) : (
              <div className="god-stage-empty">
                <span className="god-stage-star">✦</span>
                <p>左の星名を選ぶと、その姿が顕れる</p>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {parent && god && prediction && (
        <Panel title={`遺伝子の見立て — ${parent.name} × ${god.name}`}>
          <div className="gene-grid">
            <div className="gene-col">
              <div className="gene-col-title">親の血潮(人系)</div>
              {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
                <GeneBar key={k} label={STAT_LABELS[k]} value={parent.potential[k]} tone="human" />
              ))}
            </div>
            <div className="gene-col">
              <div className="gene-col-title">神の血潮(星系)</div>
              {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
                <GeneBar key={k} label={STAT_LABELS[k]} value={godStatValue(god, k)} tone="god" />
              ))}
            </div>
            <div className="gene-col gene-col-wide">
              <div className="gene-col-title">子の見立て(範囲)</div>
              {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => {
                const [lo, hi] = prediction[k]
                return (
                  <div key={k} className="predict-row">
                    <span className="predict-label">{STAT_LABELS[k]}</span>
                    <span className="predict-track">
                      <span
                        className="predict-range"
                        style={{ left: `${(lo / 120) * 100}%`, width: `${((hi - lo) / 120) * 100}%` }}
                      />
                    </span>
                    <span className="predict-num">{lo}〜{hi}</span>
                  </div>
                )
              })}
              <p className="gene-note">
                期待値: 親の脈×0.48+星の脈×0.55(上限120)。星脈は{ELEMENT_LABELS[god.element]}(七割)/
                {ELEMENT_LABELS[parent.element]}(三割)で子の灯座の軸となる。
              </p>
            </div>
          </div>
          <div className="pact-quote">
            「{god.pactLines[Math.min(Math.floor(data.godAffinity[god.id] ?? 0), god.pactLines.length - 1)]}」
          </div>
          <button className="btn btn-main" onClick={beginRitual} disabled={ritual}>
            契りを結ぶ(奉燈{pactCost(god, data.godAffinity[god.id] ?? 0)}・今月を使う)
          </button>
        </Panel>
      )}

      <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>
        郷へ戻る
      </button>

      {ritual && god && (
        <div className="ritual-overlay">
          <div className="ritual-ring" />
          <div className="ritual-ring ritual-ring2" />
          <p className="ritual-text">{god.name}との契り、結ばれる——</p>
        </div>
      )}
    </div>
  )
}

// 大立ち絵パネル — 縁MAX(affinity>=5)なら第二立ち絵を優先し、god_*→炎のオーラへ静かに退避する
const GOD_MAX_AFFINITY = 5

function GodPortraitPane({ godId, affinity }: { godId: string; sealedHint: string | null; affinity: number }) {
  const g = GODS.find((x) => x.id === godId)!
  // 退避連鎖: 縁MAXの第二立ち絵 → 通常立ち絵 → (全滅)属性オーラ。godIdが変われば連鎖をやり直す。
  const candidates = affinity >= GOD_MAX_AFFINITY ? [godMaxImg(g.portrait), gameImg(g.portrait)] : [gameImg(g.portrait)]
  const [idx, setIdx] = useState(0)
  const [lastGodId, setLastGodId] = useState(godId)
  if (godId !== lastGodId) {
    setLastGodId(godId)
    setIdx(0)
  }
  const src = idx < candidates.length ? candidates[idx] : null
  const isMax = src !== null && idx === 0 && affinity >= GOD_MAX_AFFINITY
  return (
    <div className="god-pane">
      <div className={`god-pane-art el-bg-${g.element}`}>
        {src ? (
          <img
            className={`god-pane-img ${isMax ? 'god-max' : ''}`}
            src={src}
            alt=""
            onError={() => setIdx((i) => i + 1)}
          />
        ) : (
          <div className="god-pane-fallback" data-el={g.element}>
            <span className="god-pane-glyph">{GOD_EMOJI[g.id] ?? '✦'}</span>
            <span className="god-pane-aura" />
          </div>
        )}
      </div>
      <div className="god-pane-info">
        <div className="god-pane-rank">{GOD_RANK_LABELS[g.rank]} / {ELEMENT_LABELS[g.element]}の星</div>
        <div className="god-pane-name">{g.name}</div>
        <div className="god-pane-kana">{g.kana}</div>
        <div className="god-pane-cost">
          奉納 <b>{g.cost}</b>
          {affinity > 0 && <span className="god-pane-aff"> ・縁 {affinity}</span>}
        </div>
        <div className="god-pane-person">{g.personality}</div>
        <p className="god-pane-desc">{g.desc}</p>
      </div>
    </div>
  )
}

function GeneBar({ label, value, tone }: { label: string; value: number; tone: 'human' | 'god' }) {
  return (
    <div className="gene-bar-row">
      <span className="gene-bar-label">{label}</span>
      <span className="gene-bar-track">
        <span className={`gene-bar-fill gene-${tone}`} style={{ width: `${Math.min(100, (value / 120) * 100)}%` }} />
      </span>
      <span className="gene-bar-num">{value}</span>
    </div>
  )
}
