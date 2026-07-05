// UI設定 — localStorage永続。音量は audio.ts が持つ。
// 旧セーブ/初回は既定値(モーション有効・オート既定OFF)。

const RM_KEY = 'hitsugi_reduce_motion'
const AB_KEY = 'hitsugi_auto_default'

export function getReduceMotion(): boolean {
  return localStorage.getItem(RM_KEY) === '1'
}

export function setReduceMotion(on: boolean): void {
  localStorage.setItem(RM_KEY, on ? '1' : '0')
  applyReduceMotion()
}

// <html> に reduce-motion クラスを付け外し(CSSがアニメを抑制)。起動時とトグル時に呼ぶ。
export function applyReduceMotion(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('reduce-motion', getReduceMotion())
  }
}

export function getAutoBattleDefault(): boolean {
  return localStorage.getItem(AB_KEY) === '1'
}

export function setAutoBattleDefault(on: boolean): void {
  localStorage.setItem(AB_KEY, on ? '1' : '0')
}
