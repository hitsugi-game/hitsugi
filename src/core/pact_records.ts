import { GODS } from './data/gods'
import type { GameData } from './types'

/** 縁は祭りや星籤でも増えるため、契約の証拠には用いない。 */
export function recordedPactGodIds(data: Pick<GameData, 'codex' | 'chronicle'>): Set<string> {
  const recorded = new Set(data.codex?.gods ?? [])
  // 図鑑導入前のセーブは、明記された契りの年代記だけを補助記録とする。
  const pactTexts = data.chronicle.filter((entry) => entry.kind === 'pact').map((entry) => entry.text)
  return new Set(GODS.filter((god) => recorded.has(god.id)
    || pactTexts.some((text) => text.endsWith(`、${god.name}と星契りを結ぶ。`)))
    .map((god) => god.id))
}
