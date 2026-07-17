// 郷普請(v3.1 M16-6 → M18 P3) — 独立画面版。奉燈を注ぎ、代を跨いで効く4つの施設を建てる/普請する。
// 参考実装: Home.tsx 内 FacilitiesModal(内容を ScreenShell 上に載せ替え・カードグリッド化)。
// 契約: docs/UI_SHELL_API.md。store/core の変更はしない(表示専用の純関数のみ追加)。
import { useMemo, useState } from 'react'
import { useGame } from '../core/store'
import { FACILITIES, FACILITY_MAX_LV, facilityCost, facilityLevel } from '../core/data/facilities'
import { ScreenShell, StatusCallout, Sheet, CompareRow } from './layout/shell'
import { emitToast } from './toast'
import './facilities.css'
import './facilities_m26.css' // M26 §8.3: 普請の確認Sheet(facilities.cssより後 — 後勝ち)
import './facilities_polish_m29.css' // M29+: 施設カードの視覚改善(現在Lv→次Lv/費用の可読化。後勝ち)

type FacilityState = 'buildable' | 'insufficient' | 'maxed'

interface FacilityView {
  id: string
  name: string
  desc: string
  effects: string[]
  lv: number
  maxed: boolean
  cost: number
  nextEffect: string | null // 未達Lvの先頭(=次に普請すると得る効果)
  shortfall: number // 費用に対する奉燈の不足分(0以下なら足りている)
  state: FacilityState
}

// 表示専用の集計 — store/coreの値は読むだけ、書き換えない
function buildFacilityViews(hoto: number, facilities: Record<string, number> | undefined): FacilityView[] {
  return FACILITIES.map((f) => {
    const lv = facilityLevel(facilities, f.id)
    const maxed = lv >= FACILITY_MAX_LV
    const cost = maxed ? 0 : facilityCost(f.id, lv)
    const shortfall = maxed ? 0 : Math.max(0, cost - hoto)
    return {
      id: f.id,
      name: f.name,
      desc: f.desc,
      effects: f.effects,
      lv,
      maxed,
      cost,
      nextEffect: maxed ? null : f.effects[lv],
      shortfall,
      state: maxed ? 'maxed' : shortfall > 0 ? 'insufficient' : 'buildable',
    }
  })
}

function buildLabel(v: FacilityView): string {
  if (v.maxed) return '普請済み(最大)'
  return v.lv === 0 ? `建てる — ${v.cost}燈` : `Lv${v.lv + 1}へ普請 — ${v.cost}燈`
}

// 現在有効な効果(Lv0=未建設なら効果なし)。次効果は既存のnextEffectをそのまま使う(表示専用・式は複製しない)
function curEffectText(v: FacilityView): string {
  return v.lv > 0 ? v.effects[v.lv - 1] : '(未建設)'
}

// 三段普請の段階印 — 現在Lv/次Lvを丸印の列で示す(数値表記の補助・装飾のみなのでaria-hidden)
function StageMark({ lv, nextLv }: { lv: number; nextLv: number }) {
  return (
    <span className="facility-stagemark" aria-hidden="true">
      {Array.from({ length: FACILITY_MAX_LV }, (_, i) => {
        const n = i + 1
        const cls = n <= lv ? 'is-done' : n === nextLv ? 'is-next' : 'is-future'
        return <span key={n} className={`stagemark-dot ${cls}`} />
      })}
    </span>
  )
}

// M26 §8.3: 郷普請の確認Sheet。現在→次Lv・効果差分・奉燈の残りを見せてから初めてbuildFacilityを呼ぶ。
// 奉燈不足でも閲覧はできる(§3.1) — 実行CTAだけをdisabledにする。
function FacilityConfirm({ target, hoto, onClose, onDo }: {
  target: FacilityView
  hoto: number
  onClose: () => void
  onDo: () => void
}) {
  const nextLv = target.lv + 1
  const nextEffect = target.nextEffect ?? '(これ以上の普請はない)'
  return (
    <Sheet title={`${target.name} — 普請の確認`} onClose={onClose} closeLabel="やめる">
      <p className="confirm-lead">
        {target.lv === 0
          ? `${target.name}を建てる。${target.desc}`
          : `${target.name}をLv${target.lv}からLv${nextLv}へ普請する。`}
      </p>
      <div className="cmp-row">
        <span className="cmp-label">段階</span>
        <span className="cmp-val">Lv{target.lv}</span>
        <span className="cmp-arrow">→</span>
        <span className="cmp-val cmp-after">Lv{nextLv}</span>
        <StageMark lv={target.lv} nextLv={nextLv} />
      </div>
      <div className="cmp-row facility-effect-row">
        <span className="cmp-label">効果</span>
        <span className="cmp-val">{curEffectText(target)}</span>
        <span className="cmp-arrow">→</span>
        <span className="cmp-val cmp-after">{nextEffect}</span>
      </div>
      <CompareRow label="奉燈" before={hoto} after={hoto - target.cost} />
      {target.shortfall > 0 && <p className="facility-shortfall">奉燈があと{target.shortfall}足りない</p>}
      <div className="confirm-notes">
        <p>普請後、郷の景色にも反映される。</p>
      </div>
      <div className="confirm-actions">
        <button className="btn btn-ghost" onClick={onClose}>やめる</button>
        <button
          className="btn btn-main"
          data-testid="facility-build-confirm"
          disabled={target.shortfall > 0}
          onClick={onDo}
        >
          {buildLabel(target)}
        </button>
      </div>
    </Sheet>
  )
}

export function FacilitiesScreen() {
  const data = useGame((s) => s.data)!
  const buildFacility = useGame((s) => s.buildFacility)
  const [confirmId, setConfirmId] = useState<string | null>(null) // M26 §8.3: 確認対象(カード即実行を廃止)

  const views = useMemo(
    () => buildFacilityViews(data.hoto, data.facilities),
    [data.hoto, data.facilities],
  )

  // 選択中の確認対象を毎render viewsから引き直す(古い参照を保持しない)
  const confirmTarget = confirmId ? (views.find((v) => v.id === confirmId) ?? null) : null

  // 次のおすすめ = 未完成のうち費用最安の1件(自動実行はしない・提示のみ)
  const recommended = useMemo(() => {
    const open = views.filter((v) => !v.maxed)
    return open.reduce<FacilityView | null>((min, v) => (min === null || v.cost < min.cost ? v : min), null)
  }, [views])

  // 確認Sheetの実行CTAでのみbuildFacilityを呼ぶ(§8.3)
  const doBuild = (v: FacilityView) => {
    buildFacility(v.id)
    emitToast(`${v.name}を${v.lv === 0 ? '建てた' : `Lv${v.lv + 1}へ普請した`} — 残り奉燈${data.hoto - v.cost}`, 'info')
    setConfirmId(null)
  }

  return (
    <ScreenShell
      title="郷普請"
      onBack={() => useGame.getState().setScreen({ id: 'home' })}
      resources={<>奉燈 <b>{data.hoto}</b></>}
    >
      {recommended && (
        <StatusCallout kind="info" title={`次のおすすめ — ${recommended.name}(${recommended.cost}燈)`}>
          {recommended.nextEffect}
        </StatusCallout>
      )}
      <div className="facility-grid">
        {views.map((v) => (
          <div key={v.id} className={`facility-card facility-card--${v.state}`}>
            <div className="facility-card-head">
              <span className="facility-name">{v.name}</span>
              <StageMark lv={v.lv} nextLv={v.lv + 1} />
            </div>
            <div className="facility-lv-row">
              <span className="facility-lv">Lv{v.lv}<span className="facility-lv-max">/{FACILITY_MAX_LV}</span></span>
              {!v.maxed && (
                <span className="facility-cost">
                  <span className="facility-cost-label">費用</span>
                  <b>{v.cost}</b>燈
                </span>
              )}
            </div>
            <p className="facility-desc">{v.desc}</p>
            {v.nextEffect && (
              <p className="facility-next">
                <span className="facility-next-tag">次Lv</span>{v.nextEffect}
              </p>
            )}
            <ul className="facility-effects">
              {v.effects.map((e, i) => (
                <li key={i} className={i < v.lv ? 'is-achieved' : 'is-pending'}>
                  Lv{i + 1}: {e}
                </li>
              ))}
            </ul>
            <div className="facility-foot">
              {v.state === 'insufficient' && (
                <p className="facility-shortfall">奉燈があと{v.shortfall}足りない</p>
              )}
              {v.state === 'maxed' && <p className="facility-maxed-note">普請済み(最大)</p>}
              <button
                className="btn facility-build-btn"
                disabled={v.maxed}
                onClick={() => setConfirmId(v.id)}
              >
                {buildLabel(v)}
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmTarget && (
        <FacilityConfirm
          target={confirmTarget}
          hoto={data.hoto}
          onClose={() => setConfirmId(null)}
          onDo={() => doBuild(confirmTarget)}
        />
      )}
    </ScreenShell>
  )
}
