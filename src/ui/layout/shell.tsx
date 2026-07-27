// M18 共通殻 — 画面/小窓/固定CTA/タブ/状態表示の共通コンポーネント(UI_UX_REDESIGN_PLAN §6)
// 契約(docs/UI_SHELL_API.md が正典):
//  - クリック音: 既存クラス(.btn / .filter-tab 等)を継承する。個別のSFX配線は禁止(main.tsx委譲)。
//  - 文言: 独立画面=「郷へ戻る」/ モーダル=「閉じる」/ 選択取消=「やめる」。
//  - フォーカス: Sheetは開時に保存→閉時に復帰。Tabは内部循環。ESCで閉じる。背景スクロールはロック。
import { useId, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ---- フォーカス管理(useSheetBehavior/useForcedDialog)はdialogs.tsへ分離(M22) ----
// hookはコンポーネントファイルからexportしない(Fast Refresh対象を保つ)。利用側は './layout/dialogs' から直接importする。
import { useSheetBehavior } from './dialogs'
import './shell_fix_m29.css' // M29+: mobile幅での .shell-head 横スクロール是正(後勝ち)

// M26 §15.1: WAI-ARIA tabs。作業画面は同時に1枚しかマウントされないため、
// タブが指すパネルはScreenShellの本文1枚で足りる(内容が差し替わる単一パネル方式)。
const WS_PANEL_ID = 'ws-tabpanel'
const wsTabId = (key: string) => `ws-tab-${key}`

// ---- ScreenShell — 独立作業画面の殻: 上部戻る/画面題/資源、下部に任意のActionDock ----
export function ScreenShell({
  title, onBack, backLabel = '郷へ戻る', resources, tabs, activeTab, dock, children,
}: {
  title: string
  onBack: () => void
  backLabel?: string
  resources?: ReactNode // 右上の資源表示(例: <>奉燈 {hoto}</>)
  tabs?: ReactNode // WorkspaceTabs を渡すと題の直下に固定される
  activeTab?: string // WorkspaceTabs使用時に選択中tabのkeyを渡すと、本文をtabpanelとして関連付ける(§15.1)
  dock?: ReactNode // ActionDock を渡すと下部固定+本文に余白を確保
  children: ReactNode
}) {
  // タブ有り + activeTab既知のとき、本文を role=tabpanel にして選択中tabへ aria-labelledby で紐づける
  const panelProps =
    tabs && activeTab != null
      ? { role: 'tabpanel' as const, id: WS_PANEL_ID, 'aria-labelledby': wsTabId(activeTab), tabIndex: 0 }
      : {}
  return (
    <div className={`screen shell ${dock ? 'has-dock' : ''}`}>
      <header className="shell-head">
        <button className="btn btn-ghost shell-back" onClick={onBack}>← {backLabel}</button>
        <h1 className="shell-title">{title}</h1>
        {resources && <div className="shell-res">{resources}</div>}
      </header>
      {tabs}
      <div className="shell-body" {...panelProps}>{children}</div>
      {dock}
    </div>
  )
}

// ---- ActionDock — 画面下固定の主要CTA。note=未達条件/費用の1行(CTAの直上) ----
export function ActionDock({ note, children }: { note?: ReactNode; children: ReactNode }) {
  return (
    <div className="action-dock">
      {note && <p className="dock-note">{note}</p>}
      <div className="dock-row">{children}</div>
    </div>
  )
}

// ---- Sheet — 小さな選択/確認の小窓。ESC/背景クリック/フォーカス復帰/trap/scroll lock 内蔵 ----
export function Sheet({
  title, onClose, closeLabel = '閉じる', children,
}: {
  title: string
  onClose: () => void
  closeLabel?: string
  children: ReactNode
}) {
  const ref = useSheetBehavior(onClose)
  const titleId = useId()
  // `.screen` の入場アニメーションは transform を含むため、その子に fixed レイヤを置くと
  // ビューポートでなくスクロール済みの画面が配置基準になる。body へ逃がし、常に画面内へ固定する。
  return createPortal(
    <div className="sheet-back" data-testid="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 id={titleId} className="sheet-title">{title}</h2>
          <button className="btn btn-ghost sheet-close" aria-label={`${title}を${closeLabel}`} onClick={onClose}>{closeLabel}</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

// ---- WorkspaceTabs — 作業画面の固定タブ(WAI-ARIA tabs 準拠)。SFXは .filter-tab 既存クラスが担う ----
// §15.1: role=tab/tablist + id/aria-controls + roving tabIndex(選択中のみ0) + Left/Right/Home/End。
// 選択方式は既存の「クリックで選択」に合わせ自動選択(矢印移動=選択)へ統一する。
export function WorkspaceTabs<T extends string>({
  tabs, active, onChange,
}: {
  tabs: { key: T; label: string; badge?: number }[]
  active: T
  onChange: (key: T) => void
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = tabs.findIndex((t) => t.key === active)
    if (idx < 0) return
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % tabs.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next < 0) return
    e.preventDefault()
    const key = tabs[next].key
    onChange(key)
    document.getElementById(wsTabId(key))?.focus() // 自動選択 — 焦点も移す
  }
  return (
    <div className="ws-tabs" role="tablist" onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.key}
          id={wsTabId(t.key)}
          role="tab"
          aria-selected={active === t.key}
          aria-controls={WS_PANEL_ID}
          tabIndex={active === t.key ? 0 : -1}
          className={`btn btn-ghost filter-tab ${active === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          <LiveBadge count={t.badge} />
        </button>
      ))}
    </div>
  )
}

// ---- StatusCallout — 危機/好機/情報。色+印+文言の三重で伝える(色だけに依存しない) ----
const CALLOUT_MARK = { crisis: '危', boon: '好', info: '報' } as const
export function StatusCallout({
  kind, title, action, children,
}: {
  kind: 'crisis' | 'boon' | 'info'
  title: string
  action?: ReactNode // 解決へ直行するボタン(例: <button className="btn">静養へ</button>)
  children?: ReactNode
}) {
  return (
    <div className={`callout callout-${kind}`}>
      <span className="callout-mark">{CALLOUT_MARK[kind]}</span>
      <div className="callout-body">
        <span className="callout-title">{title}</span>
        {children && <span className="callout-text">{children}</span>}
      </div>
      {action && <div className="callout-action">{action}</div>}
    </div>
  )
}

// ---- LiveBadge — 新着/達成/更新可。0/未定義なら描画しない(チェックリストB) ----
export function LiveBadge({ count, label }: { count?: number; label?: string }) {
  if (!count || count <= 0) return null
  return <span className="live-badge">{label ? `${label}${count}` : count}</span>
}

// ---- EmptyGuide — 空状態+次の行動 ----
export function EmptyGuide({ text, actionLabel, onAction }: { text: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="empty-guide">
      <p>{text}</p>
      {actionLabel && onAction && (
        <button className="btn" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  )
}

// ---- CompareRow — 変更前→変更後。増減は記号+色(色だけに依存しない) ----
export function CompareRow({ label, before, after }: { label: string; before: number; after: number }) {
  const d = after - before
  return (
    <div className="cmp-row">
      <span className="cmp-label">{label}</span>
      <span className="cmp-val">{before}</span>
      <span className="cmp-arrow">→</span>
      <span className="cmp-val cmp-after">{after}</span>
      {d !== 0 && <span className={`cmp-delta ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? `+${d}` : d}</span>}
    </div>
  )
}

// ---- LifeThread — 署名要素「命脈」。点列を火の線で結ぶ低水準プリミティブ。
// 画面ごとの意味づけ(家族/契り/継足/年代)は呼び出し側が nodes で表現する。 ----
export function LifeThread({
  nodes, orientation = 'horizontal', dim = false,
}: {
  nodes: { label?: string; lit?: boolean }[] // lit=false は「絶えた/未到達」の節
  orientation?: 'horizontal' | 'vertical'
  dim?: boolean
}) {
  if (nodes.length === 0) return null
  const L = 100
  const step = nodes.length > 1 ? L / (nodes.length - 1) : 0
  const pos = (i: number) => (nodes.length > 1 ? i * step : L / 2)
  const horiz = orientation === 'horizontal'
  return (
    <svg
      className={`lifethread ${dim ? 'is-dim' : ''} ${horiz ? 'lt-h' : 'lt-v'}`}
      viewBox={horiz ? `0 -8 ${L} 16` : `-8 0 16 ${L}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="ltFlame" x1="0" y1="0" x2={horiz ? '1' : '0'} y2={horiz ? '0' : '1'}>
          <stop offset="0%" stopColor="#b97a1e" />
          <stop offset="55%" stopColor="#ff9d45" />
          <stop offset="100%" stopColor="#ffcf70" />
        </linearGradient>
      </defs>
      <line
        x1={horiz ? 0 : 0} y1={horiz ? 0 : 0}
        x2={horiz ? L : 0} y2={horiz ? 0 : L}
        stroke="url(#ltFlame)" strokeWidth={1.6} strokeLinecap="round" opacity={0.75}
      />
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={horiz ? pos(i) : 0}
          cy={horiz ? 0 : pos(i)}
          r={n.lit === false ? 2 : 3}
          fill={n.lit === false ? '#2a3252' : 'url(#ltFlame)'}
          stroke={n.lit === false ? '#4a5378' : '#ffe7b0'}
          strokeWidth={0.8}
        />
      ))}
    </svg>
  )
}
