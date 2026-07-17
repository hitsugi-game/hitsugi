// M28-E / M26 §7.3: 鍛冶「購う」の master/detail 受入。
// 契約: 一覧札クリックは詳細を出すだけ(閲覧)で、購入は詳細CTAからのみ発火する。
// = 札を押しても奉燈も蔵も変わらないこと(誤タップ購入の防止)を実測する。
import { expect, test } from '@playwright/test'

interface FGW {
  __game: {
    reset: () => void
    screen: (id: string) => void
    store: { getState: () => { data: { hoto: number; inventory: unknown[] } } }
  }
}
async function gotoForgeBuy(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate(() => {
    const g = (window as never as FGW).__game
    g.reset()
    g.screen('forge')
  })
  await page.locator('[role="tablist"]').first().waitFor({ state: 'visible' })
  // 「購う」は既定タブだが、明示的に選んで確実にする
  await page.getByRole('tab', { name: '購う' }).click()
}

test('購う: 一覧札クリックは詳細を出すだけ・購入は発火しない(誤タップ防止)', async ({ page }) => {
  await gotoForgeBuy(page)
  const snap = () =>
    page.evaluate(() => {
      const d = (window as never as FGW).__game.store.getState().data
      return { hoto: d.hoto, inv: d.inventory.length }
    })
  const card = page.locator('[data-testid="forge-list-card"]').first()
  await expect(card, '購うタブに一覧札がある').toBeVisible({ timeout: 5000 })

  const before = await snap()
  await card.click() // 閲覧(選択)のみ
  // 詳細のCTA(購入ボタン)が現れる — sticky詳細ペイン or Sheet のいずれでも
  await expect(page.locator('[data-testid="forge-buy-confirm"]').first()).toBeVisible({ timeout: 3000 })

  const after = await snap()
  expect(after.hoto, '札クリックで奉燈は減らない').toBe(before.hoto)
  expect(after.inv, '札クリックで蔵は増えない').toBe(before.inv)
})
