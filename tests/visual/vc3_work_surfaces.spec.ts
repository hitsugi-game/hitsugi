import path from 'node:path'
import { expect, test } from '@playwright/test'

interface WorkSurfaceWindow {
  __game: {
    reset: () => void
    screen: (id: string) => void
    store: {
      getState: () => {
        data: { family: { id: string; alive: boolean }[] }
        depart: (regionId: string, partyIds: string[]) => void
      }
    }
  }
}

async function boot(page: import('@playwright/test').Page, screen: string) {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate((id) => {
    const game = (window as never as WorkSurfaceWindow).__game
    game.reset()
    game.screen(id)
  }, screen)
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
}

test('鍛冶: 人物・三枠・推薦が在庫より先に読め、狭幅でも横溢れしない', async ({ page }, info) => {
  await boot(page, 'forge')
  const workbench = page.getByTestId('forge-workbench')
  await expect(workbench).toBeVisible()
  await expect(workbench.locator('.forge-body-slot')).toHaveCount(3)
  expect(await workbench.locator('.forge-recommendation').count()).toBeLessThanOrEqual(3)
  await expect(page.getByTestId('forge-list-card')).toHaveCount(0)
  const catalogue = page.getByRole('button', { name: '全品から探す' })
  await expect(catalogue).toBeVisible()
  if (info.project.name === 'pc-1280' || info.project.name === 'mobile-390') {
    await page.screenshot({
      path: path.join(process.cwd(), 'docs', 'qa', 'baselines', `20260721-vc3-forge-focused-${info.project.name}.png`),
      fullPage: true,
    })
  }
  await catalogue.click()
  const firstCard = page.getByTestId('forge-list-card').first()
  await expect(firstCard).toBeVisible()
  expect((await workbench.boundingBox())!.y).toBeLessThan((await firstCard.boundingBox())!.y)
  expect(await page.getByTestId('forge-list-card').count()).toBeLessThanOrEqual(50)
  await expectNoHorizontalOverflow(page)
})

test('蔵: 人物と三枠の後に目的入口を出し、選ぶまで長い棚を開かない', async ({ page }, info) => {
  await boot(page, 'forge')
  await page.getByRole('tab', { name: '装備' }).click()
  await expect(page.getByTestId('forge-workbench')).toBeVisible()
  await expect(page.getByTestId('forge-list-card')).toHaveCount(0)
  if (info.project.name === 'pc-1280' || info.project.name === 'mobile-390') {
    await page.screenshot({
      path: path.join(process.cwd(), 'docs', 'qa', 'baselines', `20260721-vc3-storehouse-focused-${info.project.name}.png`),
      fullPage: true,
    })
  }
  const recent = page.getByRole('button', { name: /最近得た品/ })
  await recent.click()
  await expect(recent).toHaveAttribute('aria-pressed', 'true')
  expect(await page.getByTestId('forge-list-card').count()).toBeLessThanOrEqual(50)
  await expectNoHorizontalOverflow(page)
})

test('出立: 四候補とmap/listが同じ選択を共有し、確定前にSheetを挟む', async ({ page }, info) => {
  await boot(page, 'depart')
  const candidates = page.locator('.depart-shortlist-card')
  expect(await candidates.count()).toBeLessThanOrEqual(4)
  const artMap = page.locator('.ascent-wrap')
  await expect(artMap.locator('svg')).toHaveCount(0)
  await expect(artMap.locator('.ascent-map-art')).toHaveCount(1)
  await expect(artMap.locator('.ascent-entry')).toHaveCount(40)
  await expect(artMap.locator('.asc-place-art img')).toHaveCount(0)
  const selectedArt = artMap.locator('.asc-place.is-sel')
  await expect(selectedArt).toHaveCount(1)
  const selectedWithinScroll = await selectedArt.evaluate((node) => {
    const scroll = node.closest('.ascent-wrap')
    if (!scroll) return false
    const itemRect = node.getBoundingClientRect()
    const scrollRect = scroll.getBoundingClientRect()
    return itemRect.top >= scrollRect.top - 1 && itemRect.bottom <= scrollRect.bottom + 1
  })
  expect(selectedWithinScroll).toBe(true)
  if (info.project.name === 'pc-1280' || info.project.name === 'mobile-390') {
    await page.screenshot({
      path: path.join(process.cwd(), 'docs', 'qa', 'baselines', `20260721-m38-depart-emakimono-${info.project.name}.png`),
      fullPage: true,
    })
    // モバイルはレスポンシブ状態により絵地図面が非表示になるため、可視時だけ部分証拠を撮る。
    if (await artMap.isVisible()) {
      await artMap.screenshot({
        path: path.join(process.cwd(), 'docs', 'qa', 'baselines', `20260721-m38-depart-map-${info.project.name}.png`),
      })
    }
  }
  await page.getByRole('button', { name: '文字一覧' }).click()
  const firstOpen = page.locator('.depart-region-row:not(:disabled)').first()
  await firstOpen.click()
  const selectedName = (await firstOpen.locator('b').textContent())?.trim()
  await expect(page.locator('.depart-readybar')).toContainText(selectedName ?? '')
  const departButton = page.getByRole('button', { name: /今月を使う/ })
  // 成人1人なら初期選出済み。複数人のfixtureで未選出の時だけ候補を加える。
  if (await departButton.isDisabled()) await page.locator('.depart-cand-toggle').first().click()
  await expect(departButton).toBeEnabled()
  await departButton.click()
  await expect(page.getByRole('dialog', { name: /出立の確かめ/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /出立の確かめ/ })).toHaveCount(0)
  await expect(departButton).toBeFocused()
  await departButton.click()
  await page.getByTestId('sheet-backdrop').click({ position: { x: 4, y: 4 } })
  await expect(page.getByRole('dialog', { name: /出立の確かめ/ })).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
})

test('遠征: 地域・現在節・隊・帰還が一枚の絵巻にある', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate(() => {
    const game = (window as never as WorkSurfaceWindow).__game
    game.reset()
    const state = game.store.getState()
    const adult = state.data.family.find((character) => character.alive)
    if (!adult) throw new Error('fixture has no living family member')
    state.depart('yoi_forest', [adult.id])
  })
  const scroll = page.getByTestId('expedition-scroll-surface')
  await expect(scroll).toBeVisible()
  await expect(scroll.getByText('いまいる節')).toBeVisible()
  await expect(scroll.getByText('隊の様子')).toBeVisible()
  await expect(scroll.getByRole('button', { name: /帰り火を焚く/ })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('1600px: 作業面の主役と判断面が過剰に離れず横溢れしない', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'pc-1440', '1600px補完は一つのdesktop projectだけで測る')
  await page.setViewportSize({ width: 1600, height: 1000 })
  await boot(page, 'forge')
  const workbench = page.getByTestId('forge-workbench')
  await expect(workbench).toBeVisible()
  const box = await workbench.boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(900)
  await expectNoHorizontalOverflow(page)
})
