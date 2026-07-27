import { expect, test, type Page } from '@playwright/test'

interface SheetPositionWindow {
  __game: {
    reset: () => void
    screen: (id: string) => void
  }
}

async function boot(page: Page, screen: string) {
  await page.setViewportSize({ width: 996, height: 904 })
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate((id) => {
    const game = (window as never as SheetPositionWindow).__game
    game.reset()
    game.screen(id)
  }, screen)
}

async function expectViewportCenteredSheet(page: Page) {
  await page.waitForFunction(() => {
    const backdrop = document.querySelector('.sheet-back')
    return backdrop && backdrop.getAnimations().every((animation) => animation.playState === 'finished')
  })

  const geometry = await page.evaluate(() => {
    const sheet = document.querySelector<HTMLElement>('.sheet')!
    const backdrop = document.querySelector<HTMLElement>('.sheet-back')!
    const sheetRect = sheet.getBoundingClientRect()
    const backdropRect = backdrop.getBoundingClientRect()
    return {
      viewportHeight: window.innerHeight,
      backdropTop: backdropRect.top,
      backdropBottom: backdropRect.bottom,
      sheetTop: sheetRect.top,
      sheetBottom: sheetRect.bottom,
      centerDelta: Math.abs((sheetRect.top + sheetRect.bottom) / 2 - window.innerHeight / 2),
    }
  })

  expect(geometry.backdropTop, JSON.stringify(geometry)).toBeCloseTo(0, 0)
  expect(geometry.backdropBottom, JSON.stringify(geometry)).toBeCloseTo(geometry.viewportHeight, 0)
  expect(geometry.sheetTop, JSON.stringify(geometry)).toBeGreaterThanOrEqual(15)
  expect(geometry.sheetBottom, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.viewportHeight - 15)
  expect(geometry.centerDelta, JSON.stringify(geometry)).toBeLessThanOrEqual(2)
}

test('勤めは帳までスクロールした後も、ブラウザ表示領域の中央に収まる', async ({ page }) => {
  await boot(page, 'home')
  const objectives = page.getByRole('button', { name: /務め/ })
  await objectives.scrollIntoViewIfNeeded()
  await objectives.click()
  await expect(page.getByRole('dialog', { name: '務め — 一族の目標' })).toBeVisible()
  await expectViewportCenteredSheet(page)
})

test('出立確認も勤めと同じブラウザ中央基準で表示する', async ({ page }) => {
  await boot(page, 'depart')
  await page.getByRole('button', { name: '文字一覧' }).click()
  await page.locator('.depart-region-row:not(:disabled)').first().click()
  const depart = page.getByRole('button', { name: /今月を使う/ })
  // 初期データが成人1人なら自動選出済み。複数人のfixtureでは未選出なので、その時だけ加える。
  if (await depart.isDisabled()) await page.locator('.depart-cand-toggle').first().click()
  await expect(depart).toBeEnabled()
  await depart.click()
  await expect(page.getByRole('dialog', { name: /出立の確かめ/ })).toBeVisible()
  await expectViewportCenteredSheet(page)
})
