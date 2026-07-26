// M25 §5: 敵の兆しが実戦闘で名札の上に表示されるか(入力番のみ)。
import { expect, test } from '@playwright/test'
import { gotoBattle } from './helpers'

test('敵の兆しが候補・対象・対処を文字で示し、確定表現やviewport外への溢れがない', async ({ page }) => {
  await gotoBattle(page, { allies: 1, enemies: 3 })
  const badges = page.locator('.enemy-intent')
  await expect(badges.first()).toBeVisible({ timeout: 7000 })
  const n = await badges.count()
  expect(n).toBeGreaterThan(0)
  // 行動を予約しないため、全バッジが可視文言・ariaとも「候補」と明記する。
  for (let i = 0; i < n; i++) {
    const txt = (await badges.nth(i).innerText()).trim()
    expect(txt).toContain('候補')
    expect(txt).toMatch(/(攻|術|群|逃)/)
    await expect(badges.nth(i)).toHaveAttribute('data-certainty', 'candidate')
    const label = await badges.nth(i).getAttribute('aria-label')
    expect(label).toContain('候補')
    expect(label).not.toMatch(/^次の手/)
    if (await badges.nth(i).evaluate((node) => node.classList.contains('has-behavior'))) {
      expect(txt).toMatch(/[止受崩]/)
      expect(label).toMatch(/行動候補.+確定ではない.+危険度.+対象.+対処/)
    }
    const box = await badges.nth(i).boundingBox()
    const viewport = page.viewportSize()!
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
  }
  // モバイルでは戦況欄自体を畳むが、DOM文言は同じ非確定契約を維持する。
  await expect(page.locator('.battle-tactical-note')).toContainText('次の行動候補')
})
