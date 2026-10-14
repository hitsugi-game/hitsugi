import { readFileSync } from 'node:fs'
import { beforeEach, expect, it } from 'vitest'
import { useGame } from '../src/core/store'
import { computeObjectives } from '../src/ui/homeObjectives'
import { ENDINGS } from '../src/core/data/story'

beforeEach(() => useGame.getState().newGame(false))

it.each([0, 1, 2])('結末%dの達成は共通の選択を示し、夜明けを一律に断言しない', (endingType) => {
  const base = useGame.getState().data!
  const data = { ...base, flags: { ...base.flags, cleared: true, endingType } }
  const before = JSON.stringify(data)
  const objective = computeObjectives(data, 1).long[0]
  expect(objective).toEqual({ text: '千年の答えを選ぶ', done: true })
  expect(objective.text).not.toContain('朝を還す')
  expect(JSON.stringify(data)).toBe(before)
})

it.each([{}, { cleared: true }, { cleared: true, finalePending: true },
  { cleared: true, endingType: -1 }, { cleared: true, endingType: 3 },
  { cleared: false, endingType: 1 }])('選択が確認できない状態では達成を付けない: %j', (flags) => {
  const data = { ...useGame.getState().data!, flags }
  expect(computeObjectives(data, 1).long[0]).toEqual({ text: '千年の答えを選ぶ', done: false })
})

it('再戦中も、以前の周回内で選んだ答えの達成を消さない', () => {
  const data = { ...useGame.getState().data!, flags: { cleared: true, endingType: 2, finalePending: true } }
  expect(computeObjectives(data, 1).long[0].done).toBe(true)
})

it('継ぐ後日談は既存本文と同じ代替わりを使い、就任後の八季を約束しない', () => {
  const source = readFileSync(new URL('../src/ui/Scenes.tsx', import.meta.url), 'utf8')
  const epilogue = source.match(/const ENDING_INHERIT = \[([\s\S]*?)\n\]/)?.[1]
  expect(epilogue).toBeTruthy()
  expect(ENDINGS.inherit.beats.join('\n')).toContain('代替わりのたびに')
  expect(epilogue).toContain('代替わりのたびに')
  expect(epilogue).not.toContain('八季ごと')
  expect(epilogue).toContain('夜は、明けない')
})
