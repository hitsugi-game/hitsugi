// M25 進行ゲート — 正典 §11 の「4画面」実測受入。
//
//   「まずPhase 1とPhase 2だけを実装する。Phase 3以降へ進む前に、次の4画面を同じセーブで撮影する。
//    (1)1280×720 宵の森 地下1層の開始地点 (2)390×844 同地点 (3)1280×720 味方1対敵2 (4)390×844 同戦闘
//    この4枚で暗部率、札重なり、名札/ログ/コマンド交差が合格しなければ、
//    素材追加やroom archetypeへ進まない。」
//
// このファイルが緑になるまで M25 Phase 3(敵の兆し)/ Phase 4(room archetype)/ M26 へ進まない。
import { expect, test } from '@playwright/test'
import {
  boxesOf, crossings, deadSpaceRatio, gotoBattle, gotoDungeon,
  maxPairOverlap, snapshot,
} from './helpers'

const isMobile = (name: string) => name.startsWith('mobile')

// 暗部の受入閾値[%]。正典 §9.1 は横長PC(1280×720/1440×900)に15%、mobile-390 に20%を紐付ける。
// 縦長タブレット(768×1024)は §9.1 に明記が無い — 縦長タッチ端末=モバイル級と読み、
// PC(15%)とphone(20%)の中間の18%を採る(恣意的緩和ではなく正典分類の補完)。
const deadThreshold = (name: string): number =>
  isMobile(name) ? 20 : name.startsWith('tablet') ? 18 : 15

// ---------- ①② ダンジョン(宵の森 地下1層 開始地点) ----------

test('ダンジョン: 説明のない暗部(PC≤15% / モバイル≤20%)', async ({ page }, info) => {
  await gotoDungeon(page)
  await snapshot(page, `gate-dungeon-${info.project.name}`)
  const dead = await deadSpaceRatio(page)
  info.annotations.push({ type: 'measure', description: `暗部 ${dead.toFixed(1)}%` })
  expect(dead).toBeLessThanOrEqual(deadThreshold(info.project.name))
})

test('ダンジョン: 上端HUD要素どうしの矩形交差が0', async ({ page }) => {
  await gotoDungeon(page)
  const hud = await boxesOf(page, '[data-zone="hud-top"]')
  expect(hud.length, 'data-zone="hud-top" が1つも無い(M2未着地)').toBeGreaterThan(0)
  expect(maxPairOverlap(hud)).toBe(0)
})

test('ダンジョン: HUD / ミニマップ / D-pad / 隊員札 の相互交差が0', async ({ page }) => {
  await gotoDungeon(page)
  const [hud, mini, dpad, party] = await Promise.all([
    boxesOf(page, '[data-zone="hud-top"]'),
    boxesOf(page, '[data-zone="minimap"]'),
    boxesOf(page, '[data-zone="dpad"]'),
    boxesOf(page, '[data-zone="party"]'),
  ])
  expect(dpad.length, 'data-zone="dpad" が無い(M2未着地)').toBeGreaterThan(0)
  for (const [a, b, label] of [
    [hud, mini, 'HUD×ミニマップ'],
    [hud, dpad, 'HUD×D-pad'],
    [dpad, party, 'D-pad×隊員札'],
    [mini, dpad, 'ミニマップ×D-pad'],
  ] as const) {
    expect(crossings(a, b), label).toEqual([])
  }
})

test('ダンジョン: D-pad は48px以上・画面端から12px以上・隊員札と8px以上離れる', async ({ page }, info) => {
  await gotoDungeon(page)
  const dpad = await boxesOf(page, '[data-zone="dpad"]')
  expect(dpad.length).toBeGreaterThan(0)
  const vp = page.viewportSize()!
  for (const b of dpad) {
    expect(Math.min(b.width, b.height), 'D-pad 48px').toBeGreaterThanOrEqual(48)
    expect(b.x, '左端12px').toBeGreaterThanOrEqual(12)
    expect(vp.width - (b.x + b.width), '右端12px').toBeGreaterThanOrEqual(12)
    expect(vp.height - (b.y + b.height), '下端12px').toBeGreaterThanOrEqual(12)
  }
  const party = await boxesOf(page, '[data-zone="party"]')
  for (const d of dpad) {
    for (const p of party) {
      const gapX = Math.max(d.x - (p.x + p.width), p.x - (d.x + d.width))
      const gapY = Math.max(d.y - (p.y + p.height), p.y - (d.y + d.height))
      expect(Math.max(gapX, gapY), `D-pad と隊員札の間隔(${info.project.name})`).toBeGreaterThanOrEqual(8)
    }
  }
})

test('ダンジョン: 地図入口は可視button一つ、透明tap-zoneは0', async ({ page }) => {
  await gotoDungeon(page)
  const mapButton = page.locator('[data-zone="minimap"]')
  await expect(mapButton).toHaveCount(1)
  await expect(mapButton).toBeVisible()
  await expect(mapButton).toHaveRole('button')
  await expect(mapButton).toContainText('地図')
  await expect(page.locator('.minimap-tap-zone')).toHaveCount(0)
})

test('ダンジョン: 探索案内はengineの発見状態・短期目的・帰還条件をDOMで示す', async ({ page }) => {
  await gotoDungeon(page)
  const guide = page.locator('[data-zone="exploration-guide"]')
  await expect(guide).toBeVisible()
  await expect(guide.locator('[data-guide="pois"]')).toContainText('入口')
  await expect(guide.locator('[data-guide="objective"]')).toHaveText('石碑を探す 0/1')
  await expect(guide.locator('[data-guide="return"]')).toContainText('いつでも可')
  await expect(guide.locator('[data-guide="return"]')).toContainText('今月を使う')

  // 未発見の石碑をrun.usedへ混ぜても、発見済みとして数えてはならない。
  await page.evaluate(() => {
    const game = (window as never as { __game: { store: { getState: () => { dungeonRun: { used: string[] } | null }; setState: (v: unknown) => void } } }).__game
    const run = game.store.getState().dungeonRun
    if (run) game.store.setState({ dungeonRun: { ...run, used: ['0:1:19'] } })
  })
  await expect(guide.locator('[data-guide="objective"]')).toHaveText('石碑を探す 0/1')
  await expect(guide.locator('[data-guide="pois"]')).not.toContainText('石碑')
})

test('ダンジョン: 灯39%/0%で実機構に沿う警告を出し、帰り火は全幅常設→確認→確定の2操作', async ({ page }) => {
  await gotoDungeon(page)
  await page.evaluate(() => {
    const game = (window as never as { __game: { store: { getState: () => { dungeonRun: ({ light: number } & Record<string, unknown>) | null }; setState: (v: unknown) => void } } }).__game
    const run = game.store.getState().dungeonRun
    if (run) game.store.setState({ dungeonRun: { ...run, light: 39 } })
  })
  await expect(page.locator('[data-guide="objective"]')).toContainText('敵影が迫る')
  await expect(page.locator('.lantern-ring')).toHaveAttribute('aria-label', /敵影が速まり/)

  await page.evaluate(() => {
    const game = (window as never as { __game: { store: { getState: () => { dungeonRun: ({ light: number } & Record<string, unknown>) | null }; setState: (v: unknown) => void } } }).__game
    const run = game.store.getState().dungeonRun
    if (run) game.store.setState({ dungeonRun: { ...run, light: 0 } })
  })
  await expect(page.locator('[data-guide="objective"]')).toContainText('灯は尽きた')
  await expect(page.locator('.lantern-ring')).toHaveAttribute('aria-label', /戦闘の魔性も強化/)

  const returnButton = page.locator('.dungeon-return-dock [data-zone="return-fire"]')
  await expect(returnButton).toBeVisible()
  const box = await returnButton.boundingBox()
  expect(box).toBeTruthy()
  expect(box!.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 24)

  await returnButton.click()
  await expect(page.getByText('帰り火を焚く', { exact: true })).toBeVisible()
  const stillRunning = await page.evaluate(() => Boolean((window as never as { __game: { store: { getState: () => { dungeonRun: unknown } } } }).__game.store.getState().dungeonRun))
  expect(stillRunning, '1操作目は確認だけで帰還を確定しない').toBe(true)
  await page.getByRole('button', { name: '帰還する', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Boolean((window as never as { __game: { store: { getState: () => { dungeonRun: unknown } } } }).__game.store.getState().dungeonRun))).toBe(false)
})

// ---------- ③④ 戦闘(味方1対敵2) ----------

test('戦闘 1対2: 生存札の相互重なりが12%以下', async ({ page }, info) => {
  await gotoBattle(page, { allies: 1, enemies: 2 })
  await snapshot(page, `gate-battle-1v2-${info.project.name}`)
  const cards = [
    ...(await boxesOf(page, '[data-zone="enemy-card"]')),
    ...(await boxesOf(page, '[data-zone="ally-card"]')),
  ]
  expect(cards.length, 'data-zone の戦絵札が無い(M3未着地)').toBeGreaterThanOrEqual(3)
  const ov = maxPairOverlap(cards)
  info.annotations.push({ type: 'measure', description: `札の最大重なり ${ov.toFixed(1)}%` })
  expect(ov).toBeLessThanOrEqual(12)
})

test('戦闘 1対2: 名札 / ログ / コマンド / 行動順 の矩形交差が0', async ({ page }) => {
  await gotoBattle(page, { allies: 1, enemies: 2 })
  const [plates, log, cmds, turn] = await Promise.all([
    boxesOf(page, '[data-zone="nameplate"]'),
    boxesOf(page, '[data-zone="battle-log"]'),
    boxesOf(page, '[data-zone="command"]'),
    boxesOf(page, '[data-zone="turnorder"]'),
  ])
  expect(plates.length, 'data-zone="nameplate" が無い(M3未着地)').toBeGreaterThanOrEqual(3)
  // 名札どうしが重ならない(実測で「燈吾 137/137」と「提灯喰いB 42/42」が直接重なっていた)
  expect(maxPairOverlap(plates), '名札どうし').toBe(0)
  for (const [a, b, label] of [
    [plates, log, '名札×ログ'],
    [plates, cmds, '名札×コマンド'],
    [log, cmds, 'ログ×コマンド'],
    [turn, plates, '行動順×名札'],
  ] as const) {
    expect(crossings(a, b), label).toEqual([])
  }
})

test('戦闘 1対2: 行動順バーと報酬予告が衝突しない', async ({ page }) => {
  await gotoBattle(page, { allies: 1, enemies: 2 })
  const turn = await boxesOf(page, '[data-zone="turnorder"]')
  const reward = await boxesOf(page, '[data-zone="reward"]')
  expect(turn.length).toBeGreaterThan(0)
  expect(crossings(turn, reward), '行動順×報酬予告').toEqual([])
})

test('戦闘: 主要コマンドは44px以上(推奨48px)でスクロールなし', async ({ page }) => {
  await gotoBattle(page, { allies: 1, enemies: 2 })
  const cmds = await boxesOf(page, '[data-zone="command"]')
  expect(cmds.length, '主要コマンドが4つ無い').toBeGreaterThanOrEqual(4)
  for (const b of cmds) {
    expect(b.height, 'コマンド高さ44px').toBeGreaterThanOrEqual(44)
    expect(b.width, 'コマンド幅44px').toBeGreaterThanOrEqual(44)
  }
  // 横スクロールが発生していない
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, '横スクロール').toBeLessThanOrEqual(0)
})

test('戦闘 味方4対敵4: 札が重ならず名札も交差しない(人数別slot preset)', async ({ page }, info) => {
  await gotoBattle(page, { allies: 4, enemies: 4 })
  await snapshot(page, `gate-battle-4v4-${info.project.name}`)
  const cards = [
    ...(await boxesOf(page, '[data-zone="enemy-card"]')),
    ...(await boxesOf(page, '[data-zone="ally-card"]')),
  ]
  expect(cards.length).toBeGreaterThanOrEqual(6)
  expect(maxPairOverlap(cards), '8体時の札の重なり').toBeLessThanOrEqual(12)
  const plates = await boxesOf(page, '[data-zone="nameplate"]')
  expect(maxPairOverlap(plates), '8体時の名札').toBe(0)
})
