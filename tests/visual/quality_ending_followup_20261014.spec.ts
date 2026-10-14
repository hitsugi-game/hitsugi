import { expect, test } from '@playwright/test'
import type { GameData } from '../../src/core/types'

type GameHooks = {
  reset: () => void
  store: {
    getState: () => { data: GameData; resolveFinale: (choice: number) => void }
    setState: (value: unknown) => void
  }
}

for (const endingType of [undefined, 0, 1, 2]) {
  test(`共通目標は結末${endingType ?? '未選択'}の記録に合わせて表示する`, async ({ page }, info) => {
    await page.goto('/')
    await page.waitForFunction(() => '__game' in window)
    await expect(page.getByRole('button', { name: '設定', exact: true })).toBeVisible()
    await page.evaluate((choice) => {
      const game = (window as unknown as { __game: GameHooks }).__game
      game.reset()
      const data = game.store.getState().data
      game.store.setState({
        data: { ...data, flags: { ...data.flags, cleared: true, ...(choice === null ? {} : { endingType: choice }) } },
        screen: { id: 'home' },
      })
    }, endingType ?? null)
    await page.getByRole('button', { name: /^務め/ }).click()
    const objective = page.locator('.obj-row').filter({ hasText: '千年の答えを選ぶ' })
    await expect(objective).toBeVisible()
    if (endingType === undefined) await expect(objective).not.toHaveClass(/done/)
    else await expect(objective).toHaveClass(/done/)
    await expect(page.locator('.obj-tier').filter({ hasText: '常夜に朝を還す' })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    if (endingType === 2) {
      await objective.scrollIntoViewIfNeeded()
      await expect(objective).toBeInViewport()
      await page.screenshot({ path: `docs/qa/quality-followup-20261014/objective-inherit-${info.project.name}.png` })
    }
  })
}

test('継ぐの本文と後日談は代替わりの交代を一貫して伝える', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window)
  await expect(page.getByRole('button', { name: '設定', exact: true })).toBeVisible()
  await page.evaluate(() => {
    const game = (window as unknown as { __game: GameHooks }).__game
    game.reset()
    game.store.getState().resolveFinale(2)
  })
  await expect(page.locator('[data-scene-route="ending"]')).toBeVisible()
  const pages: string[] = []
  for (let turn = 0; turn < 25; turn += 1) {
    const current = await page.locator('.intro-current').innerText()
    pages.push(current)
    if (current.startsWith('夜は、明けない。だが頂の座は')) {
      await expect(page.locator('[data-scene-route="ending"]')).toHaveCSS('opacity', '1')
      await expect(page.locator('.intro-current')).toHaveCSS('opacity', '1')
      await page.screenshot({ path: `docs/qa/quality-followup-20261014/ending-inherit-${info.project.name}.png`, fullPage: true })
    }
    const next = page.getByRole('button', { name: '次へ ▸', exact: true })
    if (await next.count() === 0) break
    await next.click()
  }
  await expect(page.getByRole('button', { name: '題目へ戻る', exact: true })).toBeVisible()
  expect(pages.filter((text) => text.includes('代替わりのたびに'))).toHaveLength(2)
  expect(pages.join('\n')).not.toContain('八季ごと')
  expect(pages.some((text) => text.startsWith('夜は、明けない。だが頂の座は'))).toBe(true)
  expect(errors).toEqual([])
})
