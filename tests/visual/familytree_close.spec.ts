// 家系図(全画面modal)から元のメニューへ戻る導線の回帰テスト。
// ユーザー報告「家系図から戻る導線がない」の是正 — topbarのwrapやノッチ(safe-area)に隠れない
// 固定の「✕ 閉じる」を常設し、ESCと並ぶ確実な出口にした。全5幅で可視・44px・押下で閉じることを固定する。
import { expect, test } from '@playwright/test'
import { boxesOf, snapshot } from './helpers'

async function openFamilyTree(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate(() => {
    const g = (window as unknown as { __game: { reset: () => void; screen: (id: string) => void } }).__game
    g.reset()
    g.screen('home')
  })
  // 郷の帳「家系図」を開く
  await page.getByRole('button', { name: /家系図/ }).first().click()
  await page.locator('.familytree-fullscreen').waitFor({ state: 'visible' })
}

test('家系図: 常設の閉じる導線が可視・44px・押下で元のメニューへ戻る', async ({ page }, info) => {
  await openFamilyTree(page)
  await page.waitForTimeout(450) // screenIn フェードイン完了を待ってから撮る(不透明確認)
  await snapshot(page, `familytree-${info.project.name}`)

  const close = page.locator('.familytree-close-float')
  await expect(close, '固定の閉じる釦が見える').toBeVisible()
  await expect(close).toHaveAttribute('aria-label', /閉じ|戻/)
  const box = (await boxesOf(page, '.familytree-close-float'))[0]
  expect(box, '閉じる釦が可視で寸法を持つ').toBeTruthy()
  expect(Math.min(box.width, box.height), 'タッチ目標44px').toBeGreaterThanOrEqual(44)

  // 押すと家系図が閉じ、元のメニュー(Home)へ戻る
  await close.click()
  await expect(page.locator('.familytree-fullscreen'), '押下で家系図が閉じる').toBeHidden()
})
