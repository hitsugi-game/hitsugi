import type { GameData } from './types'

const KEY = 'hitsugi_save_v1'

export function saveGame(data: GameData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // 容量超過等 — ゲーム進行は止めない
  }
}

export function loadGame(): GameData | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameData
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(KEY) !== null
}

export function clearSave(): void {
  localStorage.removeItem(KEY)
}
