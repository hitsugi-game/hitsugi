import { expect, test, type Page } from '@playwright/test'

interface GameWindow {
  __game: {
    reset: () => void
    store: {
      getState: () => { data: Record<string, any> }
      setState: (update: unknown) => void
    }
  }
}

async function bootGallery(page: Page, longList = false) {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate((withLongList) => {
    const game = (window as never as GameWindow).__game
    game.reset()
    const data = game.store.getState().data
    const items = [
      { id: 'legacy-a', baseId: 'w_kodachi', name: '燈吾の小太刀', slot: 'weapon', atk: 9, price: 40, generation: 1, legacyOf: '燈吾', legacyFirstOwner: '燈吾', source: 'boss' },
      { id: 'legacy-b', baseId: 'a_nunoko', name: '玄の布子', slot: 'armor', def: 7, price: 40, generation: 1, legacyOf: '玄', legacyFirstOwner: '玄', source: 'rare', rareOrigin: '白い夜狐' },
      { id: 'legacy-c', baseId: 'c_omamori', name: '一灯の御守', slot: 'charm', statBonus: { luk: 9 }, price: 100, generation: 2, legacyOf: '一灯', legacyFirstOwner: '一灯', source: 'divine' },
      { id: 'legacy-d', baseId: 'w_katana', name: '継灯の打刀', slot: 'weapon', atk: 17, price: 130, generation: 1, legacyOf: '継灯', legacyFirstOwner: '継灯', source: 'chest' },
    ]
    if (withLongList) {
      for (let index = 5; index <= 16; index++) {
        items.push({
          id: `legacy-${index}`,
          baseId: 'w_kodachi',
          name: index === 16 ? '末尾の灯守刀' : `系譜の小太刀${index}`,
          slot: 'weapon',
          atk: 9 + index,
          price: 40,
          generation: index === 16 ? 0 : index,
          legacyOf: `先人${index}`,
          legacyFirstOwner: `先人${index}`,
          source: 'boss',
        })
      }
    }
    game.store.setState({
      data: {
        ...data,
        inventory: items,
        framedHeirloomIds: withLongList ? [] : ['legacy-a', 'legacy-b', 'legacy-c'],
        generationVow: { id: 'keep_names', madeById: data.family[0].id, generation: 1, setSeason: data.seasonIndex },
      },
      screen: { id: 'forge', tab: 'collection' },
    })
  }, longList)
  await expect(page.getByRole('heading', { name: '形見を、数値でなく物語として飾る' })).toBeVisible()
}

test('三品の家宝は由来・今代の約束を読め、全幅で横overflowしない', async ({ page }, info) => {
  await bootGallery(page)
  await expect(page.locator('.heirloom-frames article')).toHaveCount(3)
  await expect(page.locator('.heirloom-gallery')).toContainText('初めの持ち主')
  await expect(page.locator('.heirloom-gallery')).toContainText('今代の約束')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: `tests/visual/.shots/m60-heirloom-${info.project.name}.png`, fullPage: true })
})

test('一品を額から戻すと四品目へ差し替えできる', async ({ page }) => {
  await bootGallery(page)
  await page.getByRole('button', { name: '額から戻す' }).first().click()
  const replacement = page.locator('.heirloom-candidates .btn').filter({ hasText: '継灯の打刀' })
  await expect(replacement).toBeEnabled()
  await replacement.click()
  await expect(page.locator('.heirloom-frames article')).toHaveCount(3)
  await expect(page.locator('.heirloom-frames')).toContainText('継灯の打刀')
})

test('形見が16品あっても続きを開いて末尾を額装できる', async ({ page }) => {
  await bootGallery(page, true)
  await expect(page.getByRole('button', { name: /末尾の灯守刀/ })).toHaveCount(0)
  const more = page.getByRole('button', { name: /さらに見る/ })
  await expect(more).toContainText('残り4品')
  expect((await more.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  await more.click()
  const last = page.getByRole('button', { name: /末尾の灯守刀/ })
  await expect(last).toBeEnabled()
  await last.click()
  await expect(page.locator('.heirloom-frames')).toContainText('末尾の灯守刀')
})
