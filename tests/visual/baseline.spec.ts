// M25 ベースライン実測 — 修正前の数値を記録する(assertしない)。
// 目的: 実測基盤が端から端まで動くことの証明 + M25 §1 のユーザー検収所見を数値で裏づける。
// 受入の合否は gate.spec.ts が判定する。
import { test } from '@playwright/test'
import { deadSpaceRatio, gotoBattle, gotoDungeon, gotoVillage, pureBlackRatio, snapshot } from './helpers'

async function report(page: Parameters<typeof pureBlackRatio>[0], label: string) {
  const dead = await deadSpaceRatio(page)
  const black = await pureBlackRatio(page)
  const line = `[baseline] ${label}: 説明のない暗部 ${dead.toFixed(1)}% (うち純黒 ${black.toFixed(1)}%)`
  console.log(line)
  test.info().annotations.push({ type: 'baseline', description: line })
}

test('ダンジョン(宵の森B1・開始地点)', async ({ page }, info) => {
  await gotoDungeon(page)
  await snapshot(page, `baseline-dungeon-${info.project.name}`)
  await report(page, `dungeon ${info.project.name}`)
})

test('戦闘(味方1対敵2)', async ({ page }, info) => {
  await gotoBattle(page, { allies: 1, enemies: 2 })
  await snapshot(page, `baseline-battle-1v2-${info.project.name}`)
  await report(page, `battle 1v2 ${info.project.name}`)
})

test('郷の歩行マップ', async ({ page }, info) => {
  await gotoVillage(page)
  await snapshot(page, `baseline-village-${info.project.name}`)
  await report(page, `village ${info.project.name}`)
})
