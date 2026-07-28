import { expect, test, type Page } from '@playwright/test'

interface GameWindow {
  __game: {
    reset: () => void
    screen: (id: string) => void
    store: { setState: (update: unknown) => void; getState: () => { data: Record<string, any> } }
  }
}

async function boot(page: Page, screen: unknown): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate((next) => {
    const game = (window as never as GameWindow).__game
    game.reset()
    game.store.setState({ screen: next })
  }, screen)
  await page.waitForTimeout(450)
}

test('新規Homeは報酬より最優先を一件だけ示し、PCの第一画面に今月の決断が入る', async ({ page }) => {
  await boot(page, { id: 'home' })
  await expect(page.getByTestId('nippari-close')).toHaveCount(0)
  await expect(page.locator('.callout').filter({ hasText: '今月の最優先' })).toHaveCount(1)
  await expect(page.locator('.action-card.rec')).toHaveCount(1)
  if ((page.viewportSize()?.width ?? 0) >= 960 && (page.viewportSize()?.height ?? 9999) >= 700) {
    const box = await page.getByRole('heading', { name: /今月の決断/ }).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y).toBeLessThan(page.viewportSize()!.height)
  }
})

test('画面進入は先頭へ戻りh1を読み始めにする。星契り初期は推薦三柱', async ({ page }) => {
  await boot(page, { id: 'home' })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.evaluate(() => (window as never as GameWindow).__game.screen('pact'))
  await expect(page.getByRole('heading', { name: '交神の儀' })).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.locator('.god-row')).toHaveCount(3)
  await expect(page.getByTestId('pact-recommendation-reason')).toHaveCount(3)
  await expect(page.locator('.exp-party .char-card.selected')).toHaveCount(1)
  await page.getByRole('button', { name: '全ての星を見る' }).click()
  await expect(page.locator('.god-row')).toHaveCount(180)
  expect(await page.locator('.god-row[tabindex="0"]').count()).toBeLessThanOrEqual(1)
})

test('出立は唯一成人を仮編成し、mobileは周辺五地点の横絵巻にする', async ({ page }) => {
  await boot(page, { id: 'depart' })
  await expect(page.locator('.depart-readybar')).toContainText('隊 1/4')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  if ((page.viewportSize()?.width ?? 0) <= 640) {
    await expect(page.locator('.ascent-wrap')).toBeHidden()
    await expect(page.locator('.ascent-mobile-place')).toHaveCount(5)
    const height = await page.locator('.ascent-mobile-strip').evaluate((element) => element.getBoundingClientRect().height)
    expect(height).toBeLessThan(220)
  }
})

test('宝具録は小太刀で絞り、解除すれば54棚へ戻る', async ({ page }) => {
  await boot(page, { id: 'forge', tab: 'collection' })
  const search = page.getByRole('searchbox', { name: /宝具録/ })
  await search.fill('小太刀')
  await expect(page.locator('.collection-shelf')).toHaveCount(1)
  await search.fill('存在しない宝具')
  await expect(page.locator('.collection-shelf')).toHaveCount(0)
  await page.getByRole('button', { name: '検索を解除して54棚へ戻る' }).click()
  await expect(page.locator('.collection-shelf')).toHaveCount(54)
})

test('郷のD-padと見渡すはkeyboard holdとreleaseをariaで伝える', async ({ page }) => {
  await boot(page, { id: 'village' })
  const up = page.getByRole('button', { name: '上へ' })
  await up.focus()
  await up.dispatchEvent('keydown', { key: ' ', code: 'Space' })
  await expect(up).toHaveAttribute('aria-pressed', 'true')
  await up.dispatchEvent('keyup', { key: ' ', code: 'Space' })
  await expect(up).toHaveAttribute('aria-pressed', 'false')

  const survey = page.getByRole('button', { name: /郷を見渡す/ })
  await survey.focus()
  await survey.dispatchEvent('keydown', { key: 'Enter', code: 'Enter' })
  await expect(survey).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.village-host')).toHaveAttribute('data-camera-mode', 'survey')
  await survey.dispatchEvent('keyup', { key: 'Enter', code: 'Enter' })
  await expect(survey).toHaveAttribute('aria-pressed', 'false')
})

test('次代の約束は後継と今代の約束を月消費なしで保存する', async ({ page }) => {
  await boot(page, { id: 'home' })
  await page.evaluate(() => {
    const game = (window as never as GameWindow).__game
    const data = game.store.getState().data
    const head = data.family[0]
    game.store.setState({
      data: {
        ...data,
        family: [head, { ...head, id: 'm43-heir', name: '継灯', isHead: false, gen: 2, bornSeason: data.seasonIndex }],
      },
    })
  })
  await page.getByRole('button', { name: /次代の約束/ }).click()
  await page.getByRole('button', { name: '継灯 第2代・残り24月' }).click()
  await page.getByRole('button', { name: /名を忘れない/ }).click()
  const result = await page.evaluate(() => {
    const data = (window as never as GameWindow).__game.store.getState().data
    return { heir: data.designatedHeirId, vow: data.generationVow?.id, season: data.seasonIndex }
  })
  expect(result).toEqual({ heir: 'm43-heir', vow: 'keep_names', season: 0 })
})

test('星籤は実確率を示し、保存済み三星からkeyboardでも一柱だけ確定する', async ({ page }) => {
  await boot(page, { id: 'home' })
  await page.evaluate(() => {
    const game = (window as never as GameWindow).__game
    const data = game.store.getState().data
    game.store.setState({
      data: {
        ...data,
        fame: 50,
        journeyMetrics: {
          startedAtMs: 1,
          milestones: { ...(data.journeyMetrics?.milestones ?? {}), first_return: { atMs: 2, season: 0 } },
        },
      },
    })
  })
  await page.getByRole('button', { name: /星籤/ }).click()
  await expect(page.getByRole('heading', { name: '星籤' })).toBeFocused()
  await expect(page.getByText('60%', { exact: true })).toBeVisible()
  await expect(page.getByText('2%', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '三星をひらく' }).click()
  await expect(page.getByText('籤を一回使い、候補三柱を保存します。')).toBeVisible()
  await page.getByRole('button', { name: 'この籤をひらく' }).click()
  await expect(page.getByText(/^第1籤・/)).toBeVisible()
  await expect(page.locator('.star-lottery-candidate-select')).toHaveCount(3)
  const candidate = page.locator('.star-lottery-candidate-select').first()
  await candidate.focus()
  await candidate.press('Enter')
  const choose = page.getByRole('button', { name: 'この星を選ぶ' })
  expect((await choose.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  await choose.click()
  await expect(page.getByText(/で確定します/)).toBeVisible()
  await page.getByRole('button', { name: '縁を結ぶ' }).click()
  const result = await page.evaluate(() => {
    const lottery = (window as never as GameWindow).__game.store.getState().data.starLottery
    return { drawsUsed: lottery?.drawsUsed, pending: lottery?.pendingV2, history: lottery?.history.length }
  })
  expect(result).toEqual({ drawsUsed: 1, pending: undefined, history: 1 })
  await expect(page.locator('.star-lottery-grid > button.owned')).toHaveCount(1)
  await expect(page.locator('.star-lottery-grid > button')).toHaveCount(1)
  await expect(page.locator('.star-lottery-grid > .unknown')).toHaveCount(179)
  expect(await page.locator('.star-lottery-grid > .unknown').evaluateAll((nodes) => (
    nodes.every((node) => (node as HTMLElement).tabIndex === -1)
  ))).toBe(true)
})
