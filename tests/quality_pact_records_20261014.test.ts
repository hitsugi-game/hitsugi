import { describe, expect, it } from 'vitest'
import { GODS } from '../src/core/data/gods'
import { recordedPactGodIds } from '../src/core/pact_records'
import type { GameData } from '../src/core/types'

describe('契った星神と識った星神を分ける', () => {
  it('祭りで全ての縁が増えても契約数は増えない', () => {
    const data = {
      godAffinity: Object.fromEntries(GODS.map((god) => [god.id, 0.5])),
      chronicle: [],
    }
    expect(recordedPactGodIds(data).size).toBe(0)
  })

  it('実際の契約IDだけを数え、重複や未知のIDを除く', () => {
    expect([...recordedPactGodIds({
      codex: { enemies: [], gods: [GODS[0].id, GODS[0].id, 'unknown'] }, chronicle: [],
    })]).toEqual([GODS[0].id])
  })

  it('旧セーブの明示的な契りを年代記から復元する', () => {
    const data: Pick<GameData, 'codex' | 'chronicle'> = {
      chronicle: [
        { season: 1, kind: 'pact', text: `燈吾、${GODS[0].name}と星契りを結ぶ。` },
        { season: 2, kind: 'pact', text: `燈吾、${GODS[0].name}と星契りを結ぶ。` },
        { season: 3, kind: 'event', text: `燈吾、${GODS[1].name}と星契りを結ぶ。` },
        { season: 4, kind: 'pact', text: `${GODS[2].name}への縁が深まった。` },
      ],
    }
    expect([...recordedPactGodIds(data)]).toEqual([GODS[0].id])
  })

  it('全180柱の契約記録がそろって初めて全契約になる', () => {
    const data = { codex: { enemies: [], gods: GODS.map((god) => god.id) }, chronicle: [] }
    expect(recordedPactGodIds(data).size).toBe(180)
    data.codex.gods.pop()
    expect(recordedPactGodIds(data).size).toBe(179)
  })
})
