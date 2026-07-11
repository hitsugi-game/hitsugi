// M22 §4: 小窓/確定ダイアログの共通挙動フック(shell.tsxから分離 — hookのexportを
// コンポーネントファイルに混ぜるとFast Refreshが効かなくなるため専用ファイルに置く)。
// 契約: docs/UI_SHELL_API.md — ESC/外側クリック/フォーカス復帰/trap/scroll lock。
import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// Sheet系は同時に1枚だけ(入れ子非対応)。2枚目のマウントは設計違反として開発時に検知する。
// StrictModeの二重実行はmount→unmount→mountの順で走るため誤検知しない。
let activeSheetCount = 0

function firstFocusable(root: HTMLElement | null): HTMLElement | undefined {
  if (!root) return undefined
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].find((el) => !el.hasAttribute('disabled'))
}

// フォーカストラップ: Tabで端に達したら反対側へ循環させる(Sheet/確定ダイアログ共用)
function trapTabWithin(e: KeyboardEvent, root: HTMLElement | null) {
  if (e.key !== 'Tab' || !root) return
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled'))
  if (items.length === 0) return
  const firstEl = items[0]
  const lastEl = items[items.length - 1]
  // ダイアログ外へフォーカスが逃げていた場合も先頭へ引き戻す
  const active = document.activeElement as HTMLElement | null
  if (!active || !root.contains(active)) {
    e.preventDefault()
    firstEl.focus()
    return
  }
  if (e.shiftKey && active === firstEl) {
    e.preventDefault()
    lastEl.focus()
  } else if (!e.shiftKey && active === lastEl) {
    e.preventDefault()
    firstEl.focus()
  }
}

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
    firstFocusable(ref.current)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      trapTabWithin(e, ref.current)
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

// 閉じられない確定ダイアログ(事件の選択・取り返しのつかない確定)用。
// scroll lock+初期フォーカス+Tabトラップを配線し、ESC/外側クリックでは閉じない(誤閉鎖防止の例外)。
// トラップがないとShift+Tabで背後の操作(道選び/帰り火)へ届いてしまう(M22最終レビューHIGH反映)。
// 使用側は選択肢ボタンを必ず提供すること。
export function useForcedDialog() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstFocusable(ref.current)?.focus()
    const onKey = (e: KeyboardEvent) => trapTabWithin(e, ref.current)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [])
  return ref
}
