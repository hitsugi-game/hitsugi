// M18 共通殻 — 画面/小窓/固定CTA/タブ/状態表示の共通コンポーネント(UI_UX_REDESIGN_PLAN §6)
// 契約(docs/UI_SHELL_API.md が正典):
//  - クリック音: 既存クラス(.btn / .filter-tab 等)を継承する。個別のSFX配線は禁止(main.tsx委譲)。
//  - 文言: 独立画面=「郷へ戻る」/ モーダル=「閉じる」/ 選択取消=「やめる」。
//  - フォーカス: Sheetは開時に保存→閉時に復帰。Tabは内部循環。ESCで閉じる。背景スクロールはロック。
import { useEffect, useRef, type ReactNode } from 'react'

// ---- フォーカス管理(Sheet/確認面で共用) ----
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// M22 §4: Sheet系は同時に1枚だけ(入れ子非対応)。2枚目のマウントは設計違反として開発時に検知する。
let activeSheetCount = 0

// フルスクリーンmodal(家系図など)にも同じ契約を配線できるようexport(M22 §4)
export function useSheetBehavior(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    activeSheetCount += 1
    if (activeSheetCount > 1) {
      console.error('[Sheet] 同時に2枚以上のSheetが開いている(入れ子非対応)。呼び出し側の排他を確認せよ。')
    }
    const opener = document.activeElement as HTMLElement | null
    // 背景スクロールロック(入れ子は想定しない — API文書に明記)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // 初期フォーカスは小窓内の最初の操作要素へ
    const first = ref.current
      ? [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].find((el) => !el.hasAttribute('disabled'))
      : undefined
    first?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      // フォーカストラップ: 端で反対側へ循環
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled'))
      if (items.length === 0) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      activeSheetCount -= 1
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus() // 呼び出し元へフォーカス復帰
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return ref
}

// M22 §4: 閉じられない確定ダイアログ(事件の選択・取り返しのつかない確定)用。
// scroll lock+初期フォーカスのみ配線し、ESC/外側クリックでは閉じない(誤閉鎖防止の例外)。
// 使用側は選択肢ボタンを必ず提供すること。
export function useForcedDialog() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = ref.current
      ? [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].find((el) => !el.hasAttribute('disabled'))
      : undefined
    first?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])
  return ref
}

// ---- ScreenShell — 独立作業画面の殻: 上部戻る/画面題/資源、下部に任意のActionDock ----
export function ScreenShell({
  title, onBack, backLabel = '郷へ戻る', resources, tabs, dock, children,
}: {
  title: string
  onBack: () => void
  backLabel?: string
  resources?: ReactNode // 右上の資源表示(例: <>奉燈 {hoto}</>)
  tabs?: ReactNode // WorkspaceTabs を渡すと題の直下に固定される
  dock?: ReactNode // ActionDock を渡すと下部固定+本文に余白を確保
  children: ReactNode
}) {
  return (
    <div className={`screen shell ${dock ? 'has-dock' : ''}`}>
      <header className="shell-head">
        <button className="btn btn-ghost shell-back" onClick={onBack}>← {backLabel}</button>
        <h1 className="shell-title">{title}</h1>
        {resources && <div className="shell-res">{resources}</div>}
      </header>
      {tabs}
      <div className="shell-body">{children}</div>
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
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 className="sheet-title">{title}</h2>
          <button className="btn btn-ghost sheet-close" onClick={onClose}>{closeLabel}</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

// ---- WorkspaceTabs — 作業画面の固定タブ。SFXは .filter-tab 既存クラスが担う ----
export function WorkspaceTabs<T extends string>({
  tabs, active, onChange,
}: {
  tabs: { key: T; label: string; badge?: number }[]
  active: T
  onChange: (key: T) => void
}) {
  return (
    <div className="ws-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
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
