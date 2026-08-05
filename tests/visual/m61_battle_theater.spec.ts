import { expect, test, type Page } from '@playwright/test'
import { boxesOf, maxPairOverlap, snapshot } from './helpers'

const CONTRACT_ID = 'ar1:hotarubi-no-kubochi:floor-0:hvr-1'

interface M61Window {
  __game: {
    battle: (opts?: { allies?: number; enemies?: number; boss?: boolean }) => void
    store: {
      getState: () => { data: { family: { id: string; alive: boolean }[] } }
      setState: (state: Record<string, unknown>) => void
    }
  }
}

async function gotoM61Battle(page: Page, allies = 3, enemies = 2): Promise<void> {
  await page.goto('/?regionVisualV2=1')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate(({ allies, enemies, contractId }) => {
    const game = (window as unknown as M61Window).__game
    game.battle({ allies, enemies })
    const partyIds = game.store.getState().data.family.filter((c) => c.alive).slice(0, allies).map((c) => c.id)
    game.store.setState({
      dungeonRun: {
        regionId: 'hotarubi_no_kubochi',
        floor: 0,
        x: -1,
        y: -1,
        light: 100,
        loot: { hoto: 0, ketsu: 0, items: [] },
        partyIds,
        log: [],
        used: [],
        bossDown: false,
        introSeen: true,
        visualVersion: 'v2',
        stageContractId: contractId,
      },
    })
  }, { allies, enemies, contractId: CONTRACT_ID })
  await expect(page.locator('.battle-screen')).toBeVisible()
  await page.waitForTimeout(900)
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
}

test('M61 灯脈劇場は5画面幅で上段・左右対峙・軍議盤を保つ', async ({ page }, info) => {
  await gotoM61Battle(page)

  const root = page.locator('.battle-screen')
  await expect(root).toHaveAttribute('data-battle-layout', 'tomoshibi-theater')
  await expect(root).toHaveAttribute('data-stage-contract-id', CONTRACT_ID)
  await expect(page.locator('.ar1-battle-stage')).toHaveAttribute('data-scene-layering', 'battle-first')
  await expect(page.locator('.ar1-stage-region-art')).toHaveCount(1)
  await expect(page.locator('.battle-stage-bg, .stage-ground')).toHaveCount(0)

  const [top] = await boxesOf(page, '[data-zone="battle-top"]')
  const [stage] = await boxesOf(page, '.battle-stage')
  const [bottom] = await boxesOf(page, '.battle-bottom')
  expect(top).toBeDefined()
  expect(stage).toBeDefined()
  expect(bottom).toBeDefined()
  expect(top.y + top.height).toBeLessThanOrEqual(stage.y + 1)
  expect(stage.y + stage.height).toBeLessThanOrEqual(bottom.y + 1)

  const enemies = await boxesOf(page, '[data-zone="enemy-card"]')
  const allies = await boxesOf(page, '[data-zone="ally-card"]')
  expect(enemies).toHaveLength(2)
  expect(allies).toHaveLength(3)
  expect(maxPairOverlap(enemies)).toBeLessThanOrEqual(12)
  expect(maxPairOverlap(allies)).toBeLessThanOrEqual(12)

  const viewport = page.viewportSize()!
  if (viewport.width > 768) {
    const enemyCenter = enemies.reduce((sum, box) => sum + box.x + box.width / 2, 0) / enemies.length
    const allyCenter = allies.reduce((sum, box) => sum + box.x + box.width / 2, 0) / allies.length
    expect(enemyCenter).toBeLessThan(allyCenter)
  } else {
    expect(Math.max(...enemies.map((box) => box.y + box.height))).toBeLessThanOrEqual(Math.min(...allies.map((box) => box.y)) + 1)
  }

  const imageState = await page.locator('.battle-screen img:visible').evaluateAll((images) => images.map((node) => {
    const image = node as HTMLImageElement
    return { src: image.currentSrc || image.src, complete: image.complete, width: image.naturalWidth }
  }))
  const combatantImages = await page.locator('.combatant img:visible').count()
  expect(combatantImages).toBeGreaterThanOrEqual(5)
  expect(imageState.length).toBeGreaterThanOrEqual(combatantImages)
  expect(imageState.filter((image) => !image.complete || image.width <= 0)).toEqual([])
  await expect(page.locator('.enemy-art-missing')).toHaveCount(0)
  await snapshot(page, `m61-battle-theater-${info.project.name}`)

  const turnOrder = page.locator('[data-zone="turnorder"]')
  await expect(turnOrder).toHaveAttribute('aria-label', /行動順：現在、.+、1手後、.+、2手後、/)
  if (viewport.width <= 560) {
    const fullOrder = turnOrder.locator('.turn-order-more')
    const summary = fullOrder.locator('summary')
    await expect(summary).toBeVisible()
    const summaryBox = await summary.boundingBox()
    expect(summaryBox?.width).toBeGreaterThanOrEqual(44)
    expect(summaryBox?.height).toBeGreaterThanOrEqual(44)
    await summary.click()
    await expect(turnOrder.locator('.turn-order-detail')).toBeVisible()
    await expect(turnOrder.locator('.turn-order-detail li')).toHaveCount(5)
    await snapshot(page, `m61-turn-order-open-${info.project.name}`)
    await summary.click()
  }

  const controls = await page.locator('[data-zone="command"], .cmd-auto-persist, .auto-policy-chip').evaluateAll((elements) => elements
    .filter((element) => {
      const box = element.getBoundingClientRect()
      return box.width > 0 && box.height > 0
    })
    .map((element) => {
      const box = element.getBoundingClientRect()
      return { label: element.textContent?.trim() ?? element.className, w: box.width, h: box.height }
    }))
  expect(controls.length).toBeGreaterThanOrEqual(9)
  for (const control of controls) {
    expect(control.w, control.label).toBeGreaterThanOrEqual(44)
    expect(control.h, control.label).toBeGreaterThanOrEqual(44)
  }
  const backgroundPointer = await page.locator('.ar1-stage-region-art').evaluate((element) => getComputedStyle(element).pointerEvents)
  expect(backgroundPointer).toBe('none')

  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(overflow.viewport)
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport)
})

test('M61 1024px境界でも軍議盤の戦況欄を切らず、主要操作を保つ', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc-1280', '1024px境界は代表1projectだけで検証する')
  await page.setViewportSize({ width: 1024, height: 768 })
  await gotoM61Battle(page)

  await expect(page.locator('.turnpanel-detail')).toBeHidden()
  const controls = page.locator('[data-zone="command"], .cmd-auto-persist, .auto-policy-chip')
  const controlBoxes = await controls.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return {
      label: element.textContent?.trim() ?? element.className,
      width: box.width,
      height: box.height,
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      visible: style.display !== 'none' && style.visibility !== 'hidden',
    }
  }))
  expect(controlBoxes.length).toBeGreaterThanOrEqual(9)
  for (const control of controlBoxes) {
    expect(control.visible, control.label).toBe(true)
    expect(control.width, control.label).toBeGreaterThanOrEqual(44)
    expect(control.height, control.label).toBeGreaterThanOrEqual(44)
    expect(control.left, control.label).toBeGreaterThanOrEqual(0)
    expect(control.right, control.label).toBeLessThanOrEqual(1024)
    expect(control.top, control.label).toBeGreaterThanOrEqual(0)
    expect(control.bottom, control.label).toBeLessThanOrEqual(768)
  }
  const overflow = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
  expect(overflow.document).toBeLessThanOrEqual(overflow.viewport)
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport)
})

test('M61 標的は札選択で止まり、下段の明示実行だけが戦闘を進める', async ({ page }) => {
  await gotoM61Battle(page, 3, 2)
  const attack = page.getByRole('button', { name: /^攻撃/ }).first()
  await expect(attack).toBeEnabled()
  await attack.click()
  const target = page.locator('.combatant.is-enemy .combatant-hitbox').first()
  await expect(target).toBeFocused()
  await target.press('Enter')
  await expect(page.locator('#battle-action-confirm')).toBeVisible()
  await expect(target).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'この行動を実行' })).toBeFocused()
})
