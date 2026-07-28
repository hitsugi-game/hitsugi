import { expect, test } from '@playwright/test'
import { gotoBattle, snapshot } from './helpers'

test.beforeEach(({ browserName: _browserName }, info) => {
  test.skip(!['pc-1280', 'mobile-390'].includes(info.project.name), 'M46 acceptance uses the canonical PC and mobile viewports.')
})

test('M46 family growth stays readable without making one card full width', async ({ page }, info) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate(() => {
    const game = (window as unknown as { __game: { reset: () => void; screen: (id: string) => void } }).__game
    game.reset()
    game.screen('home')
  })

  const main = page.locator('.family-detail > .char-card').first()
  await expect(main.locator('.m46-level-line')).toContainText('Lv 1')
  await expect(main.locator('.m46-progression-detail .m46-stat-growth')).toHaveCount(6)
  const cardBox = await main.boundingBox()
  const viewport = page.viewportSize()!
  expect(cardBox).not.toBeNull()
  expect(cardBox!.width).toBeLessThan(viewport.width - 24)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
  await snapshot(page, `m46-family-growth-${info.project.name}`)
})

test('M46 reward forecast explains the exact plan and victory reveals the same settlement', async ({ page }, info) => {
  await gotoBattle(page, { allies: 1, enemies: 2 })

  const forecast = page.getByRole('button', { name: /戦果見立て/ })
  await expect(forecast).toBeVisible()
  await expect(forecast).toContainText('奉燈')
  await expect(forecast).toContainText('経験')
  await forecast.click()
  const details = page.getByRole('dialog', { name: '戦果見立ての詳細' })
  await expect(details).toContainText('出陣した存命者全員 経験')
  await expect(details).toContainText('眷属の縁')
  await expect(details).toContainText('：4%')
  await page.keyboard.press('Escape')
  await expect(details).toHaveCount(0)
  await expect(forecast).toBeFocused()

  const expected = await page.evaluate(() => {
    const game = (window as unknown as {
      __game: { store: { getState: () => { battle: { phase: string }; battleRewardSettlement: { plan: { carried: { hoto: number; ketsu: number }; immediate: { partyXp: number } } }; settleBattleVictory: () => void }; setState: (value: unknown) => void } }
    }).__game
    const state = game.store.getState()
    game.store.setState({ battle: { ...state.battle, phase: 'won' } })
    return state.battleRewardSettlement.plan
  })

  const result = page.getByRole('status', { name: '確定した戦果' })
  await expect(result).toBeVisible()
  await expect(result).toContainText(`奉燈 ${expected.carried.hoto}`)
  await expect(result).toContainText(`血珠 ${expected.carried.ketsu}`)
  await expect(result).toContainText(`出陣した存命者全員 経験 ${expected.immediate.partyXp}`)
  await expect(page.getByRole('button', { name: '戦果を携えて進む' })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  await snapshot(page, `m46-battle-reward-${info.project.name}`)
})
