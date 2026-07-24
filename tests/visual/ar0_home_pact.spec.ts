import { expect, test, type Locator, type Page } from '@playwright/test'

interface UiGameWindow {
  __game: {
    reset: () => void
    screen: (id: string) => void
    store: {
      getState: () => { data: { family: Array<Record<string, unknown>>; hoto: number; seasonIndex: number } }
      setState: (next: unknown) => void
    }
  }
}

async function boot(page: Page, screen: 'home' | 'pact'): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate((screenId) => {
    const game = (window as unknown as UiGameWindow).__game
    game.reset()
    game.screen(screenId)
  }, screen)
  await page.locator(`.${screen}-screen`).waitFor({ state: 'visible' })
}

async function tabTo(page: Page, target: Locator, maxTabs = 180): Promise<void> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((node) => node === document.activeElement)) return
  }
  throw new Error(`Tabで対象へ到達できない: ${await target.getAttribute('class')}`)
}

async function expectVisibleKeyboardFocus(target: Locator): Promise<void> {
  await expect(target).toBeFocused()
  const focus = await target.evaluate((node) => {
    const style = getComputedStyle(node)
    return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) }
  })
  expect(focus.outlineStyle).not.toBe('none')
  expect(focus.outlineWidth).toBeGreaterThanOrEqual(2)
}

test('郷: 全5幅でページ横overflowを発生させない', async ({ page }, info) => {
  await boot(page, 'home')
  await page.waitForTimeout(100)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `横overflow (${info.project.name})`).toBeLessThanOrEqual(0)
})

test('郷: 一族小札はTab到達・Space実行・focus可視で、選択後も同じDOMとfocusを保つ', async ({ page }) => {
  await boot(page, 'home')
  await page.evaluate(() => {
    const game = (window as unknown as UiGameWindow).__game
    const current = game.store.getState().data
    const head = current.family[0]
    const sibling = { ...head, id: `${String(head.id)}__focus`, name: '焦点を継ぐ者', isHead: false }
    game.store.setState({ data: { ...current, family: [head, sibling] } })
  })

  const cards = page.locator('.family-smalls button.char-card.clickable')
  await expect(cards).toHaveCount(2)
  const target = cards.nth(1)
  const identity = await target.evaluate((node) => {
    const key = 'ar0NodeIdentity'
    ;(node as HTMLElement).dataset[key] = 'kept'
    return (node as HTMLElement).dataset[key]
  })
  expect(identity).toBe('kept')

  await tabTo(page, target)
  await expectVisibleKeyboardFocus(target)
  await page.keyboard.press('Space')
  await expect(target).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.family-main > .char-card').first()).toContainText('焦点を継ぐ者')
  await expectVisibleKeyboardFocus(target)
  expect(await target.getAttribute('data-ar0-node-identity')).toBe('kept')
})

test('郷: 一族小札はPC/mobileで氏名を縦割れさせず、札内に情報を収める', async ({ page }, info) => {
  await boot(page, 'home')
  await page.evaluate(() => {
    const game = (window as unknown as UiGameWindow).__game
    const current = game.store.getState().data
    const head = current.family[0]
    const adult = { ...head, id: `${String(head.id)}__adult`, name: '宵闇を継ぐ者', isHead: false }
    const child = {
      ...head,
      id: `${String(head.id)}__child`,
      name: '玄',
      isHead: false,
      bornSeason: current.seasonIndex,
      tomoshigata: undefined,
    }
    game.store.setState({ data: { ...current, family: [head, adult, child] } })
  })

  const rail = page.locator('.family-smalls')
  const cards = rail.locator('button.char-card.clickable')
  await expect(cards).toHaveCount(3)
  await expect(rail).toBeVisible()
  const railOverflow = await rail.evaluate((node) => node.scrollWidth - node.clientWidth)
  expect(railOverflow, `${info.project.name}: 一族札を横送りにしない`).toBeLessThanOrEqual(1)

  const metrics = await cards.evaluateAll((nodes) => nodes.map((node) => {
    const card = node as HTMLElement
    const name = card.querySelector<HTMLElement>('.char-name')!
    const head = card.querySelector<HTMLElement>('.char-head')!
    const row = card.querySelector<HTMLElement>('.char-card-row')!
    const cardBox = card.getBoundingClientRect()
    const rowBox = row.getBoundingClientRect()
    const nameStyle = getComputedStyle(name)
    return {
      cardWidth: cardBox.width,
      headHeight: head.getBoundingClientRect().height,
      rowInsideX: rowBox.left >= cardBox.left - 1 && rowBox.right <= cardBox.right + 1,
      rowInsideY: rowBox.top >= cardBox.top - 1 && rowBox.bottom <= cardBox.bottom + 1,
      wordBreak: nameStyle.wordBreak,
      overflowWrap: nameStyle.overflowWrap,
    }
  }))

  for (const metric of metrics) {
    expect(metric.cardWidth, `${info.project.name}: 小札に可読幅がある`).toBeGreaterThanOrEqual(248)
    expect(metric.headHeight, `${info.project.name}: 氏名が縦一列にならない`).toBeLessThanOrEqual(44)
    expect(metric.rowInsideX, `${info.project.name}: 横方向が札内に収まる`).toBe(true)
    expect(metric.rowInsideY, `${info.project.name}: 縦方向が札内に収まる`).toBe(true)
    expect(metric.wordBreak, `${info.project.name}: 氏名を一文字ずつ割らない`).toBe('keep-all')
    expect(metric.overflowWrap, `${info.project.name}: 氏名にanywhereを使わない`).toBe('normal')
  }
  await expect(cards.nth(2)).toContainText('玄')
  await expect(cards.nth(2).locator('.portrait img')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('星契り: 奉燈不足でもTab/Spaceで詳細閲覧でき、契約CTAだけを理由付きで止める', async ({ page }) => {
  await boot(page, 'pact')
  await page.evaluate(() => {
    const game = (window as unknown as UiGameWindow).__game
    const current = game.store.getState().data
    game.store.setState({ data: { ...current, hoto: 0 } })
  })

  const parent = page.locator('.exp-party button.char-card.clickable').first()
  await tabTo(page, parent)
  await expectVisibleKeyboardFocus(parent)
  await page.keyboard.press('Space')
  await expect(parent).toHaveAttribute('aria-pressed', 'true')
  const insufficient = page.locator('.god-row.unaffordable').first()
  await expect(insufficient).toBeVisible()
  await expect(insufficient).toHaveAttribute('aria-disabled', 'false')
  await tabTo(page, insufficient)
  await expectVisibleKeyboardFocus(insufficient)
  await page.keyboard.press('Space')
  await expect(insufficient).toHaveAttribute('aria-pressed', 'true')
  await expectVisibleKeyboardFocus(insufficient)
  await expect(page.locator('.god-stage .god-pane')).toBeVisible()
  await expect(page.locator('.action-dock')).toContainText(/奉燈があと\d+足りない/)
  await expect(page.locator('.action-dock .btn-main')).toBeDisabled()
})

test('星契り: 確認SheetをEscapeで閉じると契りCTAへfocusが戻る', async ({ page }) => {
  await boot(page, 'pact')
  await page.evaluate(() => {
    const game = (window as unknown as UiGameWindow).__game
    const current = game.store.getState().data
    game.store.setState({ data: { ...current, hoto: 9_999 } })
  })

  const parent = page.locator('.exp-party button.char-card.clickable').first()
  await tabTo(page, parent)
  await page.keyboard.press('Space')
  const god = page.locator('.god-row:not(.locked)').first()
  await tabTo(page, god)
  await page.keyboard.press('Space')

  const trigger = page.locator('.action-dock .btn-main')
  await expect(trigger).toBeEnabled()
  // Dock直前の戻るbuttonから実Tabで到達できることを固定する。神名帳は最大120行あり、
  // 先頭からの総当たりTabでは証明に不要な反復と実行時間だけが増えるため、隣接順を検査する。
  await page.getByRole('button', { name: '郷へ戻る' }).focus()
  await page.keyboard.press('Tab')
  await expectVisibleKeyboardFocus(trigger)
  await page.keyboard.press('Space')
  await expect(page.getByRole('dialog', { name: '星契り、最後の確かめ' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '星契り、最後の確かめ' })).toHaveCount(0)
  await expectVisibleKeyboardFocus(trigger)
})

test('星契り: 封印中の星は選択して詳細を開けない', async ({ page }) => {
  await boot(page, 'pact')
  await page.getByRole('button', { name: '全ての星を見る' }).click()
  const sealed = page.locator('.god-row.locked').first()
  await expect(sealed).toBeVisible()
  await expect(sealed).toHaveAttribute('aria-disabled', 'true')
  // aria-disabledにより通常操作はブラウザ側で止まる。強制dispatchでもhandlerが詳細を開かないことを確認する。
  await sealed.dispatchEvent('click')
  await expect(sealed).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.god-stage-empty')).toBeVisible()
})
