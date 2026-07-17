// M-B/M-C(2026-07-17): 戦闘入力の回帰テスト(ultrawide 1873px)。
// 装飾レイヤ(.stage-ground / .battle-stage-bg)がコマンド盤の上に被さり「技」「オート」の
// クリックを横取りしていた実害(ユーザー報告)の再発防止。pointer-events:none で装飾は
// 永久にクリック対象外。あわせて戦場は max-width で中央に収める(散開構図の是正)。
import { expect, test } from '@playwright/test'
import { gotoBattle } from './helpers'

test.use({ viewport: { width: 1873, height: 896 } })

test('ultrawide: オートが押せて「オート中」へ切り替わる', async ({ page }) => {
  await gotoBattle(page, { allies: 3, enemies: 2 })
  const auto = page.getByRole('button', { name: /オート/ })
  await expect(auto).toBeVisible()
  const before = (await auto.textContent())?.trim()
  await auto.click({ timeout: 3000 })
  await page.waitForTimeout(300)
  const after = (await auto.textContent())?.trim()
  expect(before).not.toBe(after) // トグルの手応え(オート ⇔ オート中)
})

test('ultrawide: 技が押せて技メニューが開く', async ({ page }) => {
  await gotoBattle(page, { allies: 3, enemies: 2 })
  const skill = page.getByRole('button', { name: '技' })
  await skill.click({ timeout: 3000 })
  await page.waitForTimeout(400)
  const skillItems = await page.evaluate(
    () => document.querySelectorAll('[class*="skill"] button, button[class*="skill"]').length,
  )
  expect(skillItems).toBeGreaterThan(0)
})

test('ultrawide: 装飾レイヤがコマンド盤のクリックを奪わない', async ({ page }) => {
  await gotoBattle(page, { allies: 1, enemies: 2 })
  // 主要4コマンド全ての中心点で、最前面要素が装飾(.stage-ground/.battle-stage-bg)でないこと
  for (const name of ['攻撃', '技', '防御', '逃げる']) {
    const btn = page.getByRole('button', { name })
    const box = await btn.boundingBox()
    expect(box, `${name} が可視`).toBeTruthy()
    const top = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null
      return el ? el.className || el.tagName : 'null'
    }, [box!.x + box!.width / 2, box!.y + box!.height / 2])
    expect(String(top), `${name} の最前面が装飾レイヤでない`).not.toMatch(/stage-ground|battle-stage-bg/)
  }
})
