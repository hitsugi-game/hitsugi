import { expect, test } from '@playwright/test'
import { ENEMIES } from '../../src/core/data/enemies'
import { GODS } from '../../src/core/data/gods'
import { REGIONS } from '../../src/core/data/regions'
import type { GameData } from '../../src/core/types'

test('初見導線の星契り説明とPC・スマホの横幅', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  // dev専用runtimeの遅延切替で、クリック済みのTitleが再mountする競合を避ける。
  await page.waitForFunction(() => '__game' in window)
  await page.getByRole('button', { name: 'はじめから', exact: true }).click()
  await page.getByRole('button', { name: /宿命/ }).click()
  await page.getByRole('button', { name: '物語を飛ばす' }).click()
  await expect(page.locator('.home-screen')).toBeVisible()
  await expect(page.locator('.home-screen')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: `docs/qa/quality-20261014/home-${info.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: /星契り — 次代を授かる/ }).click()
  await expect(page.getByRole('heading', { name: '交神の儀' })).toBeFocused()
  await expect(page.locator('.pact-screen')).toContainText('翌月に子が生まれる')
  await expect(page.locator('.pact-screen')).not.toContainText('翌季に子が生まれる')
  await expect(page.locator('.pact-screen')).not.toContainText('左の星名')
  await expect(page.locator('.pact-screen')).toHaveCSS('opacity', '1')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: `docs/qa/quality-20261014/pact-${info.project.name}.png`, fullPage: true })
  expect(errors).toEqual([])
})

test('一項目残る収集を100%と表示せず、全収集時だけ達成する', async ({ page }, info) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window)
  const fixture = {
    enemies: ENEMIES.map((e) => e.id),
    gods: GODS.map((g) => g.id),
    regions: REGIONS.map((r) => r.id),
  }
  await page.evaluate((f) => {
    const game = (window as unknown as { __game: {
      reset: () => void
      store: { getState: () => { data: GameData }; setState: (v: unknown) => void }
    } }).__game
    game.reset()
    const data = game.store.getState().data
    game.store.setState({
      data: { ...data, godAffinity: {}, codex: { enemies: f.enemies, gods: f.gods.slice(1) },
        regionsCleared: f.regions, loreFrags: Object.fromEntries(f.regions.map((id) => [id, 3])) },
      screen: { id: 'chronicle' },
    })
  }, fixture)
  await expect(page.getByRole('heading', { name: '一族の記録 — 総合収集率 99%' })).toBeVisible()
  await page.screenshot({ path: `docs/qa/quality-20261014/collection-${info.project.name}.png`, fullPage: true })
  await page.evaluate((gods) => {
    const game = (window as unknown as { __game: { store: {
      getState: () => { data: GameData }; setState: (v: unknown) => void
    } } }).__game
    const data = game.store.getState().data
    game.store.setState({ data: { ...data, codex: { ...data.codex, gods } } })
  }, fixture.gods)
  await expect(page.getByRole('heading', { name: '一族の記録 — 総合収集率 100%' })).toBeVisible()
})

test('縁だけでは契約数や契約称号を付与しない', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window)
  await page.evaluate((gods) => {
    const game = (window as unknown as { __game: {
      reset: () => void
      store: { getState: () => { data: GameData }; setState: (v: unknown) => void }
    } }).__game
    game.reset()
    const data = game.store.getState().data
    game.store.setState({ data: {
      ...data, codex: { enemies: [], gods: [] }, chronicle: [],
      godAffinity: Object.fromEntries(gods.map((id) => [id, 0.5])),
    }, screen: { id: 'chronicle' } })
  }, GODS.map((god) => god.id))
  await expect(page.locator('.rec-cell').filter({ hasText: '契った星神' }).locator('.rec-num')).toHaveText('0')
  await expect(page.locator('.rec-cell').filter({ hasText: '識る星神' }).locator('.rec-num')).toHaveText('180/180')
  await page.getByRole('tab', { name: '称号' }).click()
  await expect(page.locator('.title-badge[title="星神の半分(50%)と契る"]')).toHaveClass(/locked/)
  await expect(page.locator('.title-badge[title="全ての星神(100%)と契る"]')).toHaveClass(/locked/)
  await expect(page.locator('.title-badge[title="全ての星神を識る"]')).toHaveClass(/earned/)
})

test('割引後の奉燈77で星契りの入口と助言が一致する', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window)
  await page.evaluate(() => {
    const game = (window as unknown as { __game: {
      reset: () => void
      store: { getState: () => { data: GameData }; setState: (v: unknown) => void }
    } }).__game
    game.reset()
    const data = game.store.getState().data
    game.store.setState({ data: { ...data, hoto: 77, godAffinity: { ishiusu: 1 } }, screen: { id: 'home' } })
  })
  const pact = page.getByRole('button', { name: /星契り — 次代を授かる/ })
  await expect(pact).toBeEnabled()
  await expect(page.locator('.home-screen')).not.toContainText('契りにあと3')
  await pact.click()
  await expect(page.locator('.pact-screen')).toBeVisible()
})

test('保存確認中は新規開始を止め、既存の記を確認なしに上書きしない', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hitsugi_save_v4', '{existing-record-to-recover'))
  let releaseSave: () => void = () => {}
  const ready = new Promise<void>((resolve) => { releaseSave = resolve })
  await page.route('**/src/core/save.ts', async (route) => {
    await ready
    await route.continue()
  })
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.title-save-state')).toHaveAttribute('data-state', 'checking')
    await expect(page.getByRole('button', { name: 'はじめから', exact: true })).toBeDisabled()
    expect(await page.evaluate(() => localStorage.getItem('hitsugi_save_v4'))).toBe('{existing-record-to-recover')
  } finally {
    releaseSave()
  }
  await expect(page.locator('.title-save-state')).toHaveAttribute('data-state', 'damaged')
  await page.waitForFunction(() => '__game' in window)
  await page.getByRole('button', { name: 'はじめから', exact: true }).click()
  await expect(page.getByRole('button', { name: '承知の上で、始める', exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('hitsugi_save_v4'))).toBe('{existing-record-to-recover')
})

test('選んだ結末は再読込で復帰し、最終頁を読んだ後だけ郷へ再開する', async ({ page }, info) => {
  test.skip(!['pc-1280', 'mobile-390'].includes(info.project.name), 'PCとスマホで保存・読了の実画面を確認する')
  for (const choice of [0, 1, 2]) {
    await page.goto('/')
    await page.waitForFunction(() => '__game' in window)
    await expect(page.getByRole('button', { name: '設定', exact: true })).toBeVisible()
    await page.evaluate((index) => {
      const game = (window as unknown as { __game: {
        reset: () => void
        store: { getState: () => { resolveFinale: (choice: number) => void } }
      } }).__game
      game.reset()
      game.store.getState().resolveFinale(index)
    }, choice)
    await expect(page.locator('[data-scene-route="ending"]')).toBeVisible()
    await page.getByRole('button', { name: '次へ ▸', exact: true }).click()
    await page.reload()
    await page.waitForFunction(() => '__game' in window)
    // hook設置直後のTitle→GameRuntime切替を待ち、破棄されるbuttonを押さない。
    await expect(page.getByRole('button', { name: '設定', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'つづきから', exact: true }).click()
    await expect(page.locator('[data-scene-route="ending"]')).toBeVisible()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hitsugi_save_v4')!).flags.endingType)).toBe(choice)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hitsugi_save_v4')!).flags.endingPending)).toBe(true)
    // 結末の頁数は有限。上限を超えてクリックし続けない。
    for (let turn = 0; turn < 25 && await page.getByRole('button', { name: '次へ ▸', exact: true }).count(); turn += 1) {
      await page.getByRole('button', { name: '次へ ▸', exact: true }).click()
    }
    await expect(page.getByRole('button', { name: '題目へ戻る', exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('hitsugi_save_v4')!).flags.endingPending)).toBe(false)
    await page.reload()
    await page.waitForFunction(() => '__game' in window)
    await expect(page.getByRole('button', { name: '設定', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'つづきから', exact: true }).click()
    await expect(page.locator('.home-screen')).toBeVisible()
  }
})
