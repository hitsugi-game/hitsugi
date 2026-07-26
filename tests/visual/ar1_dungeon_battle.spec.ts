import { expect, test, type Page } from '@playwright/test'
import { snapshot } from './helpers'

const CONTRACT_ID = 'ar1:hotarubi-no-kubochi:floor-0:hvr-1'

interface Ar1GameWindow {
  __game: {
    reset: () => void
    battle: (opts?: { allies?: number; enemies?: number; boss?: boolean }) => void
    rareBattle: (opts?: { regionId?: string; allies?: number }) => void
    store: {
      getState: () => {
        data: {
          seasonIndex: number
          family: { id: string; alive: boolean }[]
          inventory: { name: string }[]
        }
        battle: null | { phase: string }
        dungeonRun: null | { loot: { items: { name: string }[] }; log: string[] }
        rareEncounter: null | { markId: string; enemyName: string; drop: { name: string } }
        departDungeon: (regionId: string, partyIds: string[]) => void
        dungeonReturn: () => void
        finishBattle: () => void
      }
      setState: (state: Record<string, unknown>) => void
    }
    screen: (id: string) => void
  }
  __dungeon?: { ar1VisualBudget: () => unknown; regionExperienceVisualBudget: () => unknown }
}

async function bootV2Dungeon(page: Page, regionId = 'hotarubi_no_kubochi', floor = 0): Promise<void> {
  await page.goto('/?regionVisualV2=1')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate(({ regionId, floor }) => {
    const game = (window as unknown as Ar1GameWindow).__game
    game.reset()
    const ids = game.store.getState().data.family.filter((c) => c.alive).slice(0, 1).map((c) => c.id)
    game.store.getState().departDungeon(regionId, ids)
    const run = game.store.getState().dungeonRun as Record<string, unknown>
    game.store.setState({ dungeonRun: { ...run, floor }, boonDraft: null })
  }, { regionId, floor })
  await page.locator('.dungeon-screen canvas').waitFor({ state: 'visible' })
  await page.waitForFunction(() => !!(window as unknown as Ar1GameWindow).__dungeon, null, { timeout: 15_000 })
  // canvas insertion precedes async texture/walk-sprite loading; wait for one
  // completed V2 renderer budget instead of racing it with a fixed delay.
  await page.waitForFunction(() => {
    const engine = (window as unknown as Ar1GameWindow).__dungeon
    if (!engine) return false
    return engine.ar1VisualBudget() !== null || engine.regionExperienceVisualBudget() !== null
  }, null, { timeout: 15_000 })
}

async function continueToBattle(page: Page): Promise<void> {
  await page.evaluate(() => {
    const game = (window as unknown as Ar1GameWindow).__game
    const run = game.store.getState().dungeonRun
    game.battle({ allies: 1, enemies: 2 })
    game.store.setState({ dungeonRun: run })
    history.replaceState({}, '', '/?regionVisualV2=0')
  })
  await page.locator('.battle-screen').waitFor({ state: 'visible' })
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  expect(overflow.document).toBeLessThanOrEqual(overflow.viewport)
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport)
}

test('AR1 Dungeon and Battle preserve one Hotarubi stage identity and pooled budget', async ({ page }, info) => {
  test.setTimeout(60_000)
  const kitResponses: { url: string; status: number }[] = []
  page.on('response', (response) => {
    if (response.url().includes('/visual-recovery/hotarubi/')) {
      kitResponses.push({ url: response.url(), status: response.status() })
    }
  })
  await bootV2Dungeon(page)

  const dungeon = page.locator('.dungeon-screen')
  await expect(dungeon).toHaveAttribute('data-visual-version', 'v2')
  await expect(dungeon).toHaveAttribute('data-stage-contract-id', CONTRACT_ID)
  await expect(dungeon).toHaveAttribute('data-stage-ground-materials', 'wet-soil,shallow-black-water')
  await expect(dungeon).toHaveAttribute('data-stage-navigation-cue', 'flattened-grass-and-reflected-lamps')
  await expect(dungeon).toHaveAttribute('data-stage-danger-cue', 'reverse-ember-flow')
  const budget = await page.evaluate(() => (window as unknown as Ar1GameWindow).__dungeon?.ar1VisualBudget()) as {
    staticGraphics: number; textures: number; poiMarkers: number; telegraphs: number
    embers: number; rings: number; mist: number
  }
  expect(budget).toMatchObject({
    staticGraphics: 6,
    textures: 2,
    telegraphs: 1,
    embers: 10,
    rings: 3,
    mist: 2,
  })
  expect(budget.poiMarkers).toBeGreaterThan(0)
  await snapshot(page, `ar1-dungeon-hotarubi-${info.project.name}`)
  expect(kitResponses).toHaveLength(2)
  expect(kitResponses.every((response) => response.status === 200)).toBe(true)
  expect(kitResponses.some((response) => response.url.includes('drowned-shrine-firefly-reed'))).toBe(true)
  expect(kitResponses.some((response) => response.url.includes('foreground-root-reed'))).toBe(true)

  await continueToBattle(page)
  const battle = page.locator('.battle-screen')
  await expect(battle).toHaveAttribute('data-visual-version', 'v2')
  await expect(battle).toHaveAttribute('data-stage-contract-id', CONTRACT_ID)
  await expect(page.locator('.ar1-battle-stage')).toHaveAttribute('data-stage-contract-id', CONTRACT_ID)
  await expect(page.locator('.ar1-stage-identity')).toContainText('螢火の窪地・水没社')
  await expect(page.locator('.ar1-stage-identity')).toContainText('濡土と浅水')
  await expect(page.locator('.battle-stage-bg')).toHaveCount(0)
  await expect(page.locator('.stage-ground')).toHaveCount(0)

  const identity = await page.locator('.ar1-stage-identity').boundingBox()
  const viewport = page.viewportSize()
  expect(identity).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(identity!.x).toBeGreaterThanOrEqual(0)
  expect(identity!.x + identity!.width).toBeLessThanOrEqual(viewport!.width)
  await snapshot(page, `ar1-battle-hotarubi-${info.project.name}`)
})

test('V2 gate keeps OFF on V1 and gives non-AR1 floors/regions a code-native regional layer', async ({ page }) => {
  test.setTimeout(60_000)
  const kitRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/visual-recovery/hotarubi/')) kitRequests.push(request.url())
  })
  await page.goto('/?regionVisualV2=0')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate(() => {
    const game = (window as unknown as Ar1GameWindow).__game
    game.reset()
    const id = game.store.getState().data.family.find((c) => c.alive)!.id
    game.store.getState().departDungeon('hotarubi_no_kubochi', [id])
    game.store.setState({ boonDraft: null })
  })
  await page.locator('.dungeon-screen canvas').waitFor({ state: 'visible' })
  await expect(page.locator('.dungeon-screen')).toHaveAttribute('data-visual-version', 'v1')
  await expect(page.locator('.dungeon-screen')).not.toHaveAttribute('data-stage-contract-id', CONTRACT_ID)

  await bootV2Dungeon(page, 'hotarubi_no_kubochi', 1)
  await expect(page.locator('.dungeon-screen')).toHaveAttribute('data-visual-version', 'v2')
  expect(await page.evaluate(() => (window as unknown as Ar1GameWindow).__dungeon?.ar1VisualBudget())).toBeNull()
  expect(await page.evaluate(() => (window as unknown as Ar1GameWindow).__dungeon?.regionExperienceVisualBudget())).toMatchObject({
    textures: 0, telegraphs: 2,
  })

  await bootV2Dungeon(page, 'yoi_forest', 0)
  await expect(page.locator('.dungeon-screen')).toHaveAttribute('data-visual-version', 'v2')
  expect(await page.evaluate(() => (window as unknown as Ar1GameWindow).__dungeon?.ar1VisualBudget())).toBeNull()
  expect(await page.evaluate(() => (window as unknown as Ar1GameWindow).__dungeon?.regionExperienceVisualBudget())).toMatchObject({
    textures: 0, landmarks: 0, telegraphs: 2,
  })
  await expect(page.locator('.dungeon-region-backdrop[data-region-art="yoi_forest"]')).toBeVisible()
  expect(kitRequests).toEqual([])
})

test('AR1R-B gives only rare/boss combatants a hero treatment and keeps rare drop through return', async ({ page }) => {
  await page.goto('/?regionVisualV2=1')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  const rare = await page.evaluate((contractId) => {
    const game = (window as unknown as Ar1GameWindow).__game
    game.rareBattle({ regionId: 'hotarubi_no_kubochi', allies: 1 })
    const state = game.store.getState()
    game.store.setState({
      dungeonRun: {
        ...state.dungeonRun,
        visualVersion: 'v2',
        stageContractId: contractId,
      },
    })
    return state.rareEncounter
  }, CONTRACT_ID)
  expect(rare).not.toBeNull()

  const rareBattle = page.locator('.battle-screen')
  await expect(rareBattle).toHaveAttribute('data-hero-treatment', 'rare')
  await expect(rareBattle).toHaveAttribute('data-rare-mark-id', rare!.markId)
  await expect(page.locator('.ar1-hero-mark')).toHaveCount(1)
  await expect(page.locator('.ar1-hero-mark')).toContainText(rare!.enemyName)
  await expect(page.locator('.ar1-hero-mark')).toContainText(rare!.drop.name)
  await expect(page.locator('.battle-hero-rare .combatant.is-enemy')).toHaveCount(1)
  await expect(page.locator('.battle-hero-rare .combatant.is-ally')).toHaveCount(1)
  await expectNoHorizontalOverflow(page)

  const trace = await page.evaluate(() => {
    const game = (window as unknown as Ar1GameWindow).__game
    const before = game.store.getState()
    game.store.setState({ battle: { ...before.battle!, phase: 'won' } })
    game.store.getState().finishBattle()
    const won = game.store.getState()
    const result = {
      loot: won.dungeonRun?.loot.items.map((item) => item.name) ?? [],
      log: won.dungeonRun?.log ?? [],
      expected: before.rareEncounter!.drop.name,
    }
    won.dungeonReturn()
    return {
      ...result,
      inventory: game.store.getState().data.inventory.map((item: { name: string }) => item.name),
    }
  })
  expect(trace.loot).toContain(trace.expected)
  expect(trace.log.some((line) => line.includes('帰還するまで'))).toBe(true)
  expect(trace.inventory).toContain(trace.expected)

  await bootV2Dungeon(page)
  await page.evaluate(() => {
    const game = (window as unknown as Ar1GameWindow).__game
    const run = game.store.getState().dungeonRun
    game.battle({ allies: 1, boss: true })
    game.store.setState({ dungeonRun: run })
  })
  const bossBattle = page.locator('.battle-screen')
  await expect(bossBattle).toHaveAttribute('data-hero-treatment', 'boss')
  await expect(page.locator('.ar1-hero-mark')).toHaveCount(1)
  await expect(page.locator('.battle-hero-boss .combatant.is-boss')).toHaveCount(1)
  await expect(page.locator('.battle-hero-boss .combatant.is-enemy:not(.is-boss)')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
})

test('AR1R-B 1600px completion frame has no overflow and retains keyboard targeting with reduced motion', async ({ page }, info) => {
  test.skip(info.project.name !== 'pc-1280', 'One explicit ultrawide probe is sufficient beside the five-project matrix.')
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await bootV2Dungeon(page)
  await expectNoHorizontalOverflow(page)
  await continueToBattle(page)
  await expectNoHorizontalOverflow(page)

  const ember = page.locator('.ar1-stage-embers i').first()
  await expect(ember).toHaveCSS('animation-name', 'none')

  // PCはM47の補足文をaccessible nameへ含み、mobileは短い「攻撃」だけになる。
  const attack = page.getByRole('button', { name: /^攻撃(?:\s|$)/ })
  await attack.focus()
  await expect(attack).toBeFocused()
  await page.keyboard.press('Enter')
  const firstTarget = page.locator('.combatant.targetable').first()
  await expect(firstTarget).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(attack).toBeFocused()
})

test('AR1 return keeps the expedition consequence visible in Home and Village', async ({ page }, info) => {
  test.setTimeout(60_000)
  await bootV2Dungeon(page)
  await continueToBattle(page)

  await page.evaluate(() => {
    const game = (window as unknown as Ar1GameWindow).__game
    const run = game.store.getState().dungeonRun as Record<string, unknown>
    game.store.setState({
      battle: null,
      dungeonRun: {
        ...run,
        bossDown: true,
        loot: { hoto: 18, ketsu: 1, items: [] },
      },
    })
    game.store.getState().dungeonReturn()
    game.screen('home')
  })

  await expect(page.locator('.home-screen')).toBeVisible()
  await page.getByRole('button', { name: /^灯の余白/ }).click()
  const traces = page.locator('.return-traces')
  await expect(traces).toBeVisible()
  await expect(traces).toContainText('蛍火の窪地')
  await snapshot(page, `ar1-home-return-trace-${info.project.name}`)

  await page.evaluate(() => {
    history.replaceState({}, '', '/?regionVisualV2=1')
    ;(window as unknown as Ar1GameWindow).__game.screen('village')
  })
  await page.locator('.village-screen canvas').waitFor({ state: 'visible' })
  const village = page.locator('.village-screen')
  await expect(village).toHaveAttribute('data-village-visual', 'v2')
  await expect(village).toHaveAttribute('data-village-return-trace', 'victory-ash')
  await expect(village).toHaveAttribute('data-village-return-id', /return:/)
  await snapshot(page, `ar1-village-return-trace-${info.project.name}`)
})
