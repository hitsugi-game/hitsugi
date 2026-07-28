import { expect, test, type Page } from '@playwright/test'

interface GameWindow {
  __game: {
    reset: () => void
    store: {
      getState: () => { data: { family: Array<{ id: string }>; flags: Record<string, unknown>; narrative?: Record<string, unknown> } }
      setState: (update: unknown) => void
    }
  }
}

async function boot(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
}

async function gotoRoute(page: Page, route: string): Promise<void> {
  await page.evaluate((routeId) => {
    const game = (window as never as GameWindow).__game
    game.reset()
    const state = game.store.getState()
    const charId = state.data.family[0].id
    const screen = routeId === 'birth' || routeId === 'ceremony' || routeId === 'jobrite' || routeId === 'death'
      ? { id: routeId, charId }
      : routeId === 'life'
        ? { id: 'life', title: '継がれた夜', lines: [{ speaker: '綴', text: 'この一行を、次の頁へ。' }] }
        : routeId === 'dreamEp'
          ? { id: 'dreamEp', epId: 'yume_tabibito' }
          : { id: routeId }
    game.store.setState({
      data: routeId === 'ending'
        ? { ...state.data, flags: { ...state.data.flags, cleared: true, endingType: 0 } }
        : state.data,
      screen,
    })
  }, route)
  await expect(page.locator(`[data-scene-route="${route}"]`)).toBeVisible()
}

const ROUTES = [
  ['birth', 'life-thread', '命の綴り'],
  ['ceremony', 'life-thread', '命の綴り'],
  ['jobrite', 'life-thread', '命の綴り'],
  ['life', 'life-thread', '命の綴り'],
  ['death', 'life-thread', '命の綴り'],
  ['dream', 'dream-edge', '夢の縁'],
  ['dreamEp', 'dream-edge', '夢の縁'],
  ['finale', 'flame-crossroads', '灯の岐路'],
  ['ending', 'flame-crossroads', '灯の岐路'],
] as const

test('9 routeは共有surface・3 group以下・primary CTA最大1・横overflow 0', async ({ page }) => {
  await boot(page)

  for (const [route, surface, label] of ROUTES) {
    await gotoRoute(page, route)
    const root = page.locator(`[data-scene-route="${route}"]`)
    await expect(root).toHaveAttribute('data-scene-surface', surface)
    await expect(root.locator('.vc3b-surface-kicker')).toContainText(label)

    const metrics = await root.evaluate((element) => {
      const groups = new Set(
        [...element.querySelectorAll<HTMLElement>('[data-scene-group]')].map((node) => node.dataset.sceneGroup),
      )
      const primary = [...element.querySelectorAll<HTMLElement>('[data-scene-primary="true"]')]
        .filter((node) => getComputedStyle(node).display !== 'none')
      return {
        groups: groups.size,
        primary: primary.length,
        primaryMinHeight: primary[0]?.getBoundingClientRect().height ?? 48,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      }
    })
    expect(metrics.groups).toBeLessThanOrEqual(3)
    expect(metrics.primary).toBeLessThanOrEqual(1)
    expect(metrics.primaryMinHeight).toBeGreaterThanOrEqual(44)
    expect(metrics.overflow).toBeLessThanOrEqual(1)
  }
})

test('灯の岐路は三択の順と同格を保ち、確認後だけendingへ進む', async ({ page }) => {
  await boot(page)
  await gotoRoute(page, 'finale')
  const choices = page.locator('[data-zone="finale-choices"] > .finale-choice')
  await expect(choices).toHaveCount(3)
  await expect(choices.nth(0)).toContainText('送る')
  await expect(choices.nth(1)).toContainText('救う')
  await expect(choices.nth(2)).toContainText('継ぐ')
  expect(new Set(await choices.evaluateAll((nodes) => nodes.map((node) => node.className))).size).toBe(1)

  await choices.nth(0).click()
  await expect(page.locator('[data-scene-route="finale"]')).toBeVisible()
  await expect(page.getByRole('group', { name: /^送る.*の確認$/ })).toBeVisible()
  await expect(page.locator('[data-scene-primary="true"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'この答えを綴じる' }).click()
  await expect(page.locator('[data-scene-route="ending"]')).toBeVisible()
})

test('成人の儀は画面内から郷へ戻り、灯の余白から同じ儀を再開できる', async ({ page }) => {
  await boot(page)
  await page.evaluate(() => {
    const game = (window as never as GameWindow).__game
    game.reset()
    const state = game.store.getState()
    const charId = state.data.family[0].id
    const scene = { kind: 'ceremony', charId }
    game.store.setState({
      data: { ...state.data, narrative: { ...state.data.narrative, active: scene, activeOpenedAt: Date.now() } },
      screen: { id: 'ceremony', charId },
    })
  })

  const back = page.getByRole('button', { name: '← 郷へ戻る' })
  await expect(back).toBeVisible()
  const geometry = await back.evaluate((button) => {
    const rect = button.getBoundingClientRect()
    return { height: rect.height, top: rect.top, bottom: rect.bottom, viewport: window.innerHeight }
  })
  expect(geometry.height).toBeGreaterThanOrEqual(44)
  expect(geometry.top).toBeGreaterThanOrEqual(0)
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport)

  await back.click()
  await expect(page.locator('.home-screen')).toBeVisible()
  await page.getByRole('button', { name: /^灯の余白/ }).click()
  await page.getByRole('button', { name: /成人の儀 — 灯座を選ぶ/ }).click()
  await expect(page.locator('[data-scene-route="ceremony"]')).toBeVisible()
})

test('reduced-motionでもsurfaceと選択情報を失わない', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await boot(page)
  await gotoRoute(page, 'dreamEp')
  await expect(page.locator('[data-scene-surface="dream-edge"]')).toBeVisible()
  await expect(page.locator('[data-zone="dream-visual"] img')).toHaveAttribute('alt', /.+/)
  const duration = await page.locator('.vc3b-scene').evaluate((element) => getComputedStyle(element).animationDuration)
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.00001)
})
