import { expect, test, type Page } from '@playwright/test'

const EPISODES = [
  ['yume_tabibito', 'STORY-DREAM-02', 'cg_dream_02.jpg'],
  ['yume_sora_no_ko', 'STORY-DREAM-03', 'cg_dream_03.jpg'],
  ['yume_futari', 'STORY-DREAM-04', 'cg_dream_04.jpg'],
  ['yume_ue', 'STORY-DREAM-05', 'cg_dream_05.jpg'],
  ['yume_taiyou', 'STORY-DREAM-06', 'cg_dream_06.jpg'],
  ['yume_maki', 'STORY-DREAM-07', 'cg_dream_07.jpg'],
  ['yume_itadaki', 'STORY-DREAM-08', 'cg_dream_08.jpg'],
] as const

interface GameWindow {
  __game: {
    reset: () => void
    store: { setState: (update: unknown) => void }
  }
}

async function boot(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
}

async function gotoDream(page: Page, epId: string): Promise<void> {
  await page.evaluate((id) => {
    const game = (window as never as GameWindow).__game
    game.store.setState({ screen: { id: 'dreamEp', epId: id } })
  }, epId)
}

const intersects = (a: DOMRect, b: DOMRect) =>
  Math.min(a.right, b.right) > Math.max(a.left, b.left)
  && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)

test('7篇の前面CGは16:9 containで、台詞・操作と交差しない', async ({ page }, testInfo) => {
  await boot(page)

  for (const [epId, visualId, file] of EPISODES) {
    await gotoDream(page, epId)
    const figure = page.locator(`[data-zone="dream-visual"][data-visual-id="${visualId}"]`)
    const image = figure.locator('.dream-visual-img')
    await expect(figure).toBeVisible()
    await expect(image).toHaveAttribute('src', new RegExp(`/img/${file}$`))
    await expect(image).toHaveAttribute('loading', 'lazy')
    await expect(image).toHaveAttribute('alt', /^.{60,90}$/)
    await image.evaluate((element: HTMLImageElement) => element.decode())

    const metrics = await page.evaluate(() => {
      const figureElement = document.querySelector<HTMLElement>('[data-zone="dream-visual"]')!
      const imageElement = figureElement.querySelector<HTMLImageElement>('.dream-visual-img')!
      const bodyElement = document.querySelector<HTMLElement>('.dream-episode-body')!
      const controlsElement = document.querySelector<HTMLElement>('[data-zone="dream-episode-controls"]')!
      const figureRect = figureElement.getBoundingClientRect()
      const imageRect = imageElement.getBoundingClientRect()
      const bodyRect = bodyElement.getBoundingClientRect()
      const controlsRect = controlsElement.getBoundingClientRect()
      const style = getComputedStyle(imageElement)
      return {
        figure: figureRect.toJSON(),
        image: imageRect.toJSON(),
        body: bodyRect.toJSON(),
        controls: controlsRect.toJSON(),
        objectFit: style.objectFit,
        objectPosition: style.objectPosition,
        naturalWidth: imageElement.naturalWidth,
        naturalHeight: imageElement.naturalHeight,
      }
    })

    expect(metrics.objectFit).toBe('contain')
    expect(metrics.objectPosition).toBe('50% 50%')
    expect(metrics.naturalWidth).toBe(1672)
    expect(metrics.naturalHeight).toBe(941)
    expect(metrics.figure.width / metrics.figure.height).toBeCloseTo(16 / 9, 2)
    expect(metrics.image.left).toBeGreaterThanOrEqual(metrics.figure.left)
    expect(metrics.image.right).toBeLessThanOrEqual(metrics.figure.right)
    expect(intersects(metrics.figure as DOMRect, metrics.body as DOMRect)).toBe(false)
    expect(intersects(metrics.figure as DOMRect, metrics.controls as DOMRect)).toBe(false)

    if (['mobile-360', 'mobile-390', 'tablet-768'].includes(testInfo.project.name)) {
      await page.screenshot({ path: testInfo.outputPath(`${epId}.png`), fullPage: true })
    }
  }
})

test('現篇を開いた時点では次篇1枚だけをprefetchする', async ({ page }) => {
  const requested = new Set<string>()
  page.on('request', (request) => {
    const match = request.url().match(/cg_dream_\d{2}\.jpg/)
    if (match) requested.add(match[0])
  })

  await boot(page)
  await gotoDream(page, 'yume_tabibito')
  await expect(page.locator('.dream-visual-img')).toBeVisible()
  await page.waitForTimeout(800)

  expect([...requested].sort()).toEqual(['cg_dream_02.jpg', 'cg_dream_03.jpg'])
})

test('固有CGが欠けた時はcg_kiroへfallbackする', async ({ page }) => {
  await page.route('**/img/cg_dream_02.jpg', (route) => route.abort())
  await boot(page)
  await gotoDream(page, 'yume_tabibito')

  const image = page.locator('.dream-visual-img')
  await expect(image).toHaveAttribute('data-fallback', 'true')
  await expect(image).toHaveAttribute('src', /\/img\/cg_kiro\.jpg$/)
  await expect(image).toBeVisible()
})
