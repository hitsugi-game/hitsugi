// 交神の儀(品質刷新v3.1 M9) — 俺屍様式の二面構成
// 左=神名リスト(属性印+名+奉納点、奉納点昇順、位階タブ×属性チップ)/右=大立ち絵+情報札。
// 遺伝子画面: 親系(人)/神系の二列バー+子の見立てレンジ。確定時は炎輪カットイン。
import { useMemo, useRef, useState } from 'react'
import { useGame } from '../core/store'
import type { StatKey, GodRank, Element, Character, God, GameData } from '../core/types'
import { GOD_RANK_LABELS, STAT_LABELS, ELEMENT_LABELS, seasonLabel } from '../core/types'
import { GODS, godUnlocked } from '../core/data/gods'
import { isAdult, predictChild, godStatValue, pactCost } from '../core/inheritance'
import { CharCard, MaybeImg, NightBackdrop, Panel, TsuzuriLine } from './components'
import { GodArtFallback } from './GodArtFallback'
import { gameImg, godMaxImg, HOME_BG } from './img'
import { ActionDock, CompareRow, Sheet, StatusCallout } from './layout/shell'
import './pact_m18.css'
import './pact_m26.css' // M26 §9.5: 星契り最終確認Sheet(pact_m18.cssより後 — 後勝ち)

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

// 実ステップ表示(壱親/弐星/参見立て) — 表示専用。色+「▼現在」印の二重で伝える(M18 §5.1)
const PACT_STEPS: { numeral: string; label: string; step: 1 | 2 | 3 }[] = [
  { numeral: '壱', label: '親', step: 1 },
  { numeral: '弐', label: '星', step: 2 },
  { numeral: '参', label: '見立て', step: 3 },
]

function PactSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="pact-steps" role="list" aria-label="交神の儀の進み">
      {PACT_STEPS.map((s, i) => {
        const state = s.step < step ? 'done' : s.step === step ? 'current' : 'future'
        return (
          <div key={s.numeral} className="pact-step-wrap" role="listitem">
            <span className={`pact-step pact-step-${state}`}>
              <span className="pact-step-numeral">{s.numeral}</span>
              <span className="pact-step-label">{s.label}</span>
              {state === 'current' && <span className="pact-step-mark">▼現在</span>}
            </span>
            {i < PACT_STEPS.length - 1 && <span className="pact-step-sep">/</span>}
          </div>
        )
      })}
    </div>
  )
}

// 子の見立てレンジ(中央値)から「伸びる2能力・弱い1能力」を一言に(表示専用・予測ロジック不変)
function predictionSummary(prediction: Record<StatKey, [number, number]>): string {
  const mids = (Object.keys(STAT_LABELS) as StatKey[])
    .map((k) => [k, (prediction[k][0] + prediction[k][1]) / 2] as [StatKey, number])
    .sort((a, b) => b[1] - a[1])
  const rising = mids.slice(0, 2).map(([k]) => STAT_LABELS[k]).join('・')
  const weak = STAT_LABELS[mids[mids.length - 1][0]]
  return `伸びるは${rising}、弱いは${weak}となりそうだ。`
}

export function PactScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const doPact = useGame((s) => s.doPact)
  const [parentId, setParentId] = useState<string | null>(null)
  const [godId, setGodId] = useState<string | null>(null)
  const [rankTab, setRankTab] = useState<GodRank | 0>(0) // 0=全て
  const [elemChip, setElemChip] = useState<Element | null>(null)
  const [onlyAffordable, setOnlyAffordable] = useState(false) // 絞り込み: 費用内(M18)
  const [onlyUncontracted, setOnlyUncontracted] = useState(false) // 絞り込み: 未契約(M18)
  const [ritual, setRitual] = useState(false) // 炎輪カットイン中
  const [confirmOpen, setConfirmOpen] = useState(false) // M26 §9.5: 契りの最終確認Sheet
  const pactFiredRef = useRef(false) // 二重実行防止 — 確認Sheetの実行CTA以外からdoPactを呼ばせない呼び出し済みフラグ

  const adults = data.family.filter((c) => c.alive && isAdult(c, data.seasonIndex))
  const parent = adults.find((c) => c.id === parentId) ?? null
  const god = GODS.find((g) => g.id === godId) ?? null
  const contractedGodIds = data.codex?.gods ?? []

  // 奉納点(cost)昇順 — 俺屍の神名リスト様式。費用内/未契約は表示の絞り込みのみ(選択可否には無関係)
  const shownGods = GODS.filter((g) => {
    if (rankTab !== 0 && g.rank !== rankTab) return false
    if (elemChip !== null && g.element !== elemChip) return false
    if (onlyAffordable && data.hoto < pactCost(g, data.godAffinity[g.id] ?? 0)) return false
    if (onlyUncontracted && contractedGodIds.includes(g.id)) return false
    return true
  }).sort((a, b) => a.cost - b.cost)

  const prediction = useMemo(
    () => (parent && god ? predictChild(parent, god) : null),
    [parent, god],
  )

  // 実ステップ(壱親/弐星/参見立て) — 選択状態から導出。ロジック非依存の表示専用(M18)
  const pactStep: 1 | 2 | 3 = !parent ? 1 : !god ? 2 : 3

  // M26 §9.5: 契るCTAは確認Sheetを開くだけ(M26-P0-01是正)。doPactは確認Sheetの実行CTAからのみ呼ぶ。
  const openPactConfirm = () => {
    if (!parent || !god || ritual || confirmOpen) return
    setConfirmOpen(true)
  }

  // 確認Sheetの実行CTA(data-testid="pact-confirm")専用。pactFiredRefで二重実行を防ぎ、
  // 実行後は即Sheetを閉じて演出へ入る — 演出中はActionDockのCTAもritual状態で無効化される。
  const confirmPact = () => {
    if (!parent || !god || ritual || pactFiredRef.current) return
    pactFiredRef.current = true
    setConfirmOpen(false)
    setRitual(true)
    setTimeout(() => {
      doPact(parent.id, god.id)
      setRitual(false)
      pactFiredRef.current = false
    }, 1100)
  }

  // 画面下固定CTA(ActionDock)の状態 — 未達理由は1行のみ、優先順位: 親→星→奉燈(M18)
  const dockCost = god ? pactCost(god, data.godAffinity[god.id] ?? 0) : 0
  const dockShortfall = god ? Math.max(0, dockCost - data.hoto) : 0
  const dockNote = !parent
    ? '親を選べ'
    : !god
      ? '星神を選べ'
      : dockShortfall > 0
        ? `奉燈があと${dockShortfall}足りない`
        : undefined
  const dockReady = Boolean(parent && god && dockShortfall === 0 && !ritual)
  const dockLabel = parent && god && dockShortfall === 0
    ? `${parent.name} × ${god.name} ／ 奉燈${dockCost} ／ 契る`
    : '契る'

  return (
    <div className="screen pact-screen pact-has-dock">
      <NightBackdrop bg={gameImg(HOME_BG)} />
      <h1 className="season-label" style={{ marginBottom: 14 }}>交神の儀</h1>
      <TsuzuriLine text="星神と契れば、翌季に子が生まれる。血潮は親と神から流れ込む — 誰の血を、どの星に継がせる?" />

      <PactSteps step={pactStep} />

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
                aria-pressed={rankTab === r}
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
          <div className="god-filter-row">
            <button
              className={`btn btn-ghost filter-tab ${onlyAffordable ? 'active' : ''}`}
              aria-pressed={onlyAffordable}
              onClick={() => setOnlyAffordable((v) => !v)}
            >
              費用内
            </button>
            <button
              className={`btn btn-ghost filter-tab ${onlyUncontracted ? 'active' : ''}`}
              aria-pressed={onlyUncontracted}
              onClick={() => setOnlyUncontracted((v) => !v)}
            >
              未契約
            </button>
          </div>
        </div>

        <div className="pact-main">
          {/* 左: 神名リスト(奉納点昇順) */}
          {/* M32 a11y: role="listbox"は直下に生buttonを持ち option/roving-tabindex契約を満たさず違反だった。
              完全なlistboxキーボード実装は大改修(報告)なので、誤roleを外しネイティブbutton(Tab到達可)に、
              選択はaria-pressed・選べない星はaria-disabledで伝える最小修正に留める。 */}
          <div className="god-list">
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
                  aria-pressed={godId === g.id}
                  aria-disabled={!affordable}
                  onClick={() => affordable && setGodId(g.id)}
                >
                  <span className={`element-badge el-${g.element} god-row-el`}>{ELEMENT_LABELS[g.element]}</span>
                  <span className="god-row-name">
                    {sealed ? '???' : g.name}
                    {sealed && <span className="god-row-hint">{sealHint(g)}</span>}
                  </span>
                  {!sealed && (
                    <span className="god-row-bias">
                      {topBias(g.statBias).map(([k]) => (
                        <span key={k} className="bias-chip">{STAT_LABELS[k]}</span>
                      ))}
                    </span>
                  )}
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
              <p className="gene-predict-summary">{predictionSummary(prediction)}</p>
            </div>
          </div>
          {Math.floor(data.godAffinity[god.id] ?? 0) >= GOD_MAX_AFFINITY && (
            <StatusCallout kind="boon" title="縁が極まった">
              この星とはもはや相思相愛。契りは彩りを増すだろう。
            </StatusCallout>
          )}
          <div className="pact-quote">
            「{god.pactLines[Math.min(Math.floor(data.godAffinity[god.id] ?? 0), god.pactLines.length - 1)]}」
          </div>
        </Panel>
      )}

      <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>
        郷へ戻る
      </button>

      <ActionDock note={dockNote}>
        <button className="btn btn-main" onClick={openPactConfirm} disabled={!dockReady}>
          {dockLabel}
        </button>
      </ActionDock>

      {confirmOpen && parent && god && prediction && (
        <PactConfirmSheet
          parent={parent}
          god={god}
          data={data}
          prediction={prediction}
          cost={dockCost}
          onClose={() => setConfirmOpen(false)}
          onConfirm={confirmPact}
        />
      )}

      {ritual && god && (
        <div className="ritual-overlay">
          <div className="ritual-ring" />
          <div className="ritual-ring ritual-ring2" />
          <MaybeImg
            src={(data.godAffinity[god.id] ?? 0) >= GOD_MAX_AFFINITY ? godMaxImg(god.portrait) : gameImg(god.portrait)}
            className="ritual-cutin"
          />
          <p className="ritual-text">{god.name}との契り、結ばれる——</p>
        </div>
      )}
    </div>
  )
}

// M26 §9.5: 星契り最終確認 — 契るCTAはここでのみdoPactを呼ぶ(誤操作是正 M26-P0-01)。
// 親の顔・名前・残り灯/神の立ち絵・名前・縁/奉燈の現在→残り/子が生まれる月/見立ての強み弱みを一望させ、
// 「この月の行いとして確定し、月が進む」ことを最後に一文で示す。
function PactConfirmSheet({
  parent, god, data, prediction, cost, onClose, onConfirm,
}: {
  parent: Character
  god: God
  data: GameData
  prediction: Record<StatKey, [number, number]>
  cost: number
  onClose: () => void
  onConfirm: () => void
}) {
  const affinity = Math.floor(data.godAffinity[god.id] ?? 0)
  const isMax = affinity >= GOD_MAX_AFFINITY
  return (
    <Sheet title="星契り、最後の確かめ" onClose={onClose} closeLabel="やめる">
      <div className="pact-confirm-pair">
        <CharCard char={parent} seasonIndex={data.seasonIndex} compact />
        <div className="pact-confirm-god">
          <MaybeImg
            src={isMax ? godMaxImg(god.portrait) : gameImg(god.portrait)}
            className="pact-confirm-god-img"
          />
          <span className="pact-confirm-god-name">{god.name}</span>
          <span className="pact-confirm-god-aff">縁 {affinity}</span>
        </div>
      </div>
      <CompareRow label="奉燈" before={data.hoto} after={data.hoto - cost} />
      <p className="confirm-lead">
        子は{seasonLabel(data.seasonIndex + 1)}に生まれる。{predictionSummary(prediction)}
      </p>
      <p className="confirm-lead">この月の行いとして確定し、月が進む。</p>
      <div className="confirm-actions">
        <button className="btn btn-ghost" onClick={onClose}>やめる</button>
        <button className="btn btn-main" data-testid="pact-confirm" onClick={onConfirm}>契る</button>
      </div>
    </Sheet>
  )
}

// 神の血潮の得意分野・上位2ステータス(神選びの比較材料)
function topBias(statBias: Partial<Record<StatKey, number>>): [StatKey, number][] {
  return (Object.entries(statBias) as [StatKey, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
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
          // M22 §3: 共通✦を出さない — 属性別御影+神名焼き込み+「絵姿準備中」
          <GodArtFallback g={g} />
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
