import { expect, test, type Page } from '@playwright/test'
import type { GameData } from '../../src/core/types'
import { GODS } from '../../src/core/data/gods'

async function openPact(page: Page, options: { fame?: number; hoto?: number; parent?: boolean } = {}) {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window)
  await page.evaluate((options) => {
    const game = (window as unknown as { __game: {
      reset: () => void
      store: { getState: () => { data: GameData }; setState: (value: unknown) => void }
    } }).__game
    game.reset()
    const data = game.store.getState().data
    game.store.setState({ data: {
      ...data, fame: options.fame ?? 520, hoto: options.hoto ?? 0, regionsCleared: [],
      family: data.family.map((character) => ({ ...character, alive: options.parent !== false })),
    }, screen: { id: 'pact' } })
  }, options)
  await expect(page.locator('.pact-screen')).toBeVisible()
}

async function apexList(page: Page) {
  await page.getByRole('button', { name: '全ての星を見る', exact: true }).click()
  await page.getByRole('button', { name: '極ツ星', exact: true }).click()
  return page.locator('.god-row[aria-disabled="false"]')
}

test('封印行に先頭を塞がれても、閲覧可能な極ツ星へTabで入れる', async ({ page }) => {
  await openPact(page)
  const available = await apexList(page)
  await expect(available).toHaveCount(2)
  await expect(page.locator('.god-row[tabindex="0"]')).toHaveCount(1)
  await expect(page.locator('.god-row[tabindex="0"]')).toHaveAttribute('aria-disabled', 'false')
  await page.getByRole('button', { name: '未契約', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(available.first()).toBeFocused()
})

test('矢印・Home・Endは封印行を飛ばし、閲覧選択を勝手に変更しない', async ({ page }) => {
  await openPact(page)
  const available = await apexList(page)
  await available.first().click()
  await expect(available.first()).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(available.last()).toBeFocused()
  await expect(available.first()).toHaveAttribute('aria-pressed', 'true')
  await expect(available.last()).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('ArrowDown')
  await expect(available.first()).toBeFocused()
  await page.keyboard.press('End')
  await expect(available.last()).toBeFocused()
  await page.keyboard.press('Home')
  await expect(available.first()).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(available.last()).toBeFocused()
})

test('フィルタと薦め切替でTab入口を補正し、0件からも安全に戻れる', async ({ page }) => {
  await openPact(page)
  const available = await apexList(page)
  await available.last().focus()
  await page.getByRole('button', { name: '薦め三柱へ戻る', exact: true }).click()
  await expect(page.locator('.god-row[tabindex="0"]')).toHaveCount(1)
  await expect(page.locator('.god-row[aria-pressed="true"]')).toHaveCount(0)
  await page.getByRole('button', { name: '全ての星を見る', exact: true }).click()
  await expect(page.locator('.god-row[tabindex="0"]')).toHaveCount(1)
  await page.getByRole('button', { name: '費用内', exact: true }).click()
  await expect(page.locator('.god-row')).toHaveCount(0)
  await expect(page.locator('.god-list-empty')).toBeVisible()
  await page.getByRole('button', { name: '費用内', exact: true }).click()
  await expect(page.locator('.god-row[tabindex="0"]')).toHaveCount(1)
  await expect(page.locator('.god-row[aria-pressed="true"]')).toHaveCount(0)
})

test('全封印・親なしでは無効行へ入らず、費用不足だけなら閲覧できる', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await openPact(page, { fame: 0 })
  await apexList(page)
  await expect(page.locator('.god-row[aria-disabled="false"]')).toHaveCount(0)
  await expect(page.locator('.god-row[tabindex="0"]')).toHaveCount(0)
  await openPact(page, { parent: false })
  await expect(page.locator('.god-row[tabindex="0"]')).toHaveCount(0)
  await expect(page.locator('.god-row[aria-pressed="true"]')).toHaveCount(0)
  await openPact(page, { hoto: 0 })
  await expect(page.locator('.god-row[tabindex="0"]')).toHaveCount(1)
  await page.locator('.god-row[tabindex="0"]').click()
  await expect(page.locator('.god-stage .god-name').or(page.locator('.god-stage img')).first()).toBeVisible()
  await expect(page.locator('[data-testid="pact-confirm"]')).toHaveCount(0)
  await expect(page.locator('.action-dock button').last()).toBeDisabled()
  expect(errors).toEqual([])
})

test('属性・未契約フィルタでも閲覧行だけにTab入口を保ち、0件から復帰する', async ({ page }) => {
  await openPact(page)
  await page.getByRole('button', { name: '全ての星を見る', exact: true }).click()
  await page.locator('.god-row[aria-disabled="false"]').last().focus()
  await page.locator('.elem-chip[title="火の星だけ見る"]').click()
  await expect(page.locator('.god-row[tabindex="0"]')).toHaveCount(1)
  await expect(page.locator('.god-row[tabindex="0"] .god-row-el')).toHaveText('火')
  await expect(page.locator('.god-row[aria-pressed="true"]')).toHaveCount(0)
  await page.evaluate((ids) => {
    const game = (window as unknown as { __game: { store: {
      getState: () => { data: GameData }; setState: (value: unknown) => void
    } } }).__game
    const data = game.store.getState().data
    game.store.setState({ data: { ...data, codex: { ...data.codex, enemies: data.codex?.enemies ?? [], gods: ids } } })
  }, GODS.map((god) => god.id))
  await page.getByRole('button', { name: '未契約', exact: true }).click()
  await expect(page.locator('.god-row')).toHaveCount(0)
  await page.getByRole('button', { name: '未契約', exact: true }).click()
  await expect(page.locator('.god-row[tabindex="0"]')).toHaveCount(1)
  await expect(page.locator('.god-row[tabindex="0"]')).toHaveAttribute('aria-disabled', 'false')
})
