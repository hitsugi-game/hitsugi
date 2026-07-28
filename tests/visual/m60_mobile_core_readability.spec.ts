import { expect, test, type Page } from '@playwright/test'
import { boxesOf, crossings, gotoBattle } from './helpers'

const acceptanceProjects = new Set(['pc-1280', 'mobile-390', 'mobile-360'])

test.beforeEach(async ({ page: _ }, info) => {
  test.skip(!acceptanceProjects.has(info.project.name), 'M60 acceptance uses PC1280/mobile390/mobile360.')
})

interface HomeGameWindow {
  __game: {
    reset: () => void
    screen: (id: string) => void
    store: {
      getState: () => { data: { family: Array<Record<string, unknown>> } & Record<string, unknown> }
      setState: (next: unknown) => void
    }
  }
}

async function bootHome(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate(() => {
    const game = (window as unknown as HomeGameWindow).__game
    game.reset()
    game.store.setState({ screen: { id: 'home' } })
  })
  await page.locator('.home-screen').waitFor({ state: 'visible' })
}

async function setFamilySize(page: Page, count: number): Promise<void> {
  await page.evaluate((familyCount) => {
    const game = (window as unknown as HomeGameWindow).__game
    const current = game.store.getState().data
    const head = current.family[0]
    const family = Array.from({ length: familyCount }, (_, index) => ({
      ...head,
      id: `${String(head.id)}__m60_${familyCount}_${index}`,
      name: index === 0 ? '燈守の当主' : `継ぎ手${index + 1}`,
      isHead: index === 0,
    }))
    game.store.setState({ data: { ...current, family } })
  }, count)
}

test('戦闘: 兆しと対処は12px・二行で、全文をclick/keyboardの一操作で読める', async ({ page }) => {
  await gotoBattle(page, { allies: 4, enemies: 4 })
  const cues = page.locator('.enemy-intent.has-behavior')
  await expect(cues.first()).toBeVisible({ timeout: 7_000 })

  const metrics = await cues.evaluateAll((nodes) => nodes.map((node) => {
    const tell = node.querySelector<HTMLElement>('.intent-tell')!
    const response = node.querySelector<HTMLElement>('.intent-response')!
    return {
      tellSize: Number.parseFloat(getComputedStyle(tell).fontSize),
      responseSize: Number.parseFloat(getComputedStyle(response).fontSize),
      tellOneLine: tell.scrollHeight <= Number.parseFloat(getComputedStyle(tell).lineHeight) * 1.2,
      responseOneLine: response.scrollHeight <= Number.parseFloat(getComputedStyle(response).lineHeight) * 1.2,
      text: node.textContent ?? '',
    }
  }))
  for (const metric of metrics) {
    expect(metric.tellSize).toBeGreaterThanOrEqual(12)
    expect(metric.responseSize).toBeGreaterThanOrEqual(12)
    expect(metric.tellOneLine).toBe(true)
    expect(metric.responseOneLine).toBe(true)
    expect(metric.text).toMatch(/[危警]/)
    expect(metric.text).toMatch(/[止受崩]/)
  }
  await expect(page.locator('.combatant[role="button"]')).toHaveCount(0)
  const cueHeights = await cues.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height))
  cueHeights.forEach((height) => expect(height).toBeGreaterThanOrEqual(44))

  const trigger = cues.first()
  await trigger.click()
  const reader = page.getByRole('dialog')
  await expect(reader).toBeVisible()
  await expect(reader).toContainText(/行動候補・確定ではない/)
  await expect(reader).toContainText(/危険度/)
  await expect(reader).toContainText(/対象/)
  await expect(reader).toContainText(/対処/)
  await reader.getByRole('button', { name: '戦場へ戻る' }).click()
  await expect(trigger).toBeFocused()

  await trigger.press('Enter')
  await expect(reader).toBeVisible()
  await reader.getByRole('button', { name: '戦場へ戻る' }).press('Enter')
  await expect(trigger).toBeFocused()
  await page.screenshot({ path: `tests/visual/.shots/m60-battle-${test.info().project.name}.png`, fullPage: true })
})

test('戦闘: 200%表示でも兆し・敵札・味方札・ログが交差しない', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc-1280', '200% browser zoom is represented by a 640px effective CSS viewport.')
  await page.setViewportSize({ width: 640, height: 720 })
  await gotoBattle(page, { allies: 4, enemies: 4 })

  const [cues, enemies, allies, log] = await Promise.all([
    boxesOf(page, '.enemy-intent.has-behavior'),
    boxesOf(page, '.combatant.is-enemy [data-zone="enemy-card"]'),
    boxesOf(page, '.combatant.is-ally [data-zone="ally-card"]'),
    boxesOf(page, '.battle-log-strip'),
  ])
  expect(crossings(cues, enemies), '兆し×敵札').toEqual([])
  expect(crossings(cues, allies), '兆し×味方札').toEqual([])
  expect(crossings(cues, log), '兆し×ログ').toEqual([])
  expect(crossings(enemies, allies), '敵札×味方札').toEqual([])
  expect(crossings(enemies, log), '敵札×ログ').toEqual([])
  expect(crossings(allies, log), '味方札×ログ').toEqual([])
})

for (const count of [1, 2, 4, 8]) {
  test(`郷: 一族${count}人で重複要約と横overflowを作らず重要文字を12px以上にする`, async ({ page }, info) => {
    await bootHome(page)
    await setFamilySize(page, count)

    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
    const detail = page.locator('.family-detail > .char-card')
    await expect(detail).toBeVisible()
    expect((await page.locator('.family-mp-care-action').boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)

    if (count === 1) {
      await expect(page.locator('.family-smalls')).toHaveCount(0)
      return
    }

    const cards = page.locator('.family-smalls > .char-card')
    await expect(cards).toHaveCount(count)
    await expect(cards.filter({ has: page.locator('.family-selected-status:visible') })).toHaveCount(1)
    await expect(cards.locator('.m46-progression-summary:visible')).toHaveCount(count - 1)

    const importantSizes = await cards.locator([
      '.char-name:visible',
      '.char-gen:visible',
      '.head-mark:visible',
      '.life-months:visible',
      '.m46-level-line:visible',
      '.m46-aptitude-tag:visible',
      '.family-selected-status > *:visible',
    ].join(',')).evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize)))
    expect(importantSizes.length).toBeGreaterThan(0)
    for (const size of importantSizes) expect(size).toBeGreaterThanOrEqual(12)
    const familyLabels = await page.locator('.family-folio-heading > *, .family-mp-care > div > *').evaluateAll(
      (nodes) => nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize)),
    )
    for (const size of familyLabels) expect(size).toBeGreaterThanOrEqual(12)

    if (info.project.name.startsWith('mobile-') && count >= 2) {
      const first = await cards.nth(0).boundingBox()
      const second = await cards.nth(1).boundingBox()
      expect(first).not.toBeNull()
      expect(second).not.toBeNull()
      expect(Math.abs(first!.y - second!.y), 'mobileは二列で同じ行へ収める').toBeLessThanOrEqual(2)
      expect(second!.x, '二枚目は一枚目の右').toBeGreaterThan(first!.x + first!.width - 2)
    }
    if (count === 8) {
      await page.screenshot({ path: `tests/visual/.shots/m60-family-8-${info.project.name}.png`, fullPage: true })
    }
  })
}
