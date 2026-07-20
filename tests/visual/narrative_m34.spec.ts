import { expect, test, type Page } from '@playwright/test'

interface GameWindow {
  __game: {
    reset: () => void
    store: {
      getState: () => { data: Record<string, unknown> }
      setState: (update: unknown) => void
    }
  }
}

async function gotoFinale(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate(() => {
    const game = (window as never as GameWindow).__game
    game.reset()
    const data = game.store.getState().data as {
      family: Array<Record<string, unknown>>
      narrative?: Record<string, unknown>
    }
    const head = data.family[0]
    const ancestor = {
      ...head,
      id: 'm34-ancestor',
      name: '灯子',
      alive: false,
      isHead: false,
      deathSeason: 4,
      lastWords: '次の灯を、ひとりにするな。',
      epitaph: '最初の灯を運んだ者',
    }
    game.store.setState({
      data: {
        ...data,
        family: [ancestor, { ...head, name: '継火', isHead: true }],
        narrative: {
          ...(data.narrative ?? {}),
          stage: 'finale',
          seen: [],
          queued: [],
          completed: [],
          deferred: [],
          active: null,
          resonance: { cut: 999, save: 0, inherit: 0 },
        },
      },
      screen: { id: 'finale' },
    })
  })
  await expect(page.getByRole('heading', { name: '千年の岐路' })).toBeVisible()
}

test('三択は履歴傾向に左右されず同順・同装飾・全て選択可能', async ({ page }) => {
  await gotoFinale(page)
  const choices = page.locator('[data-zone="finale-choices"] button')
  await expect(choices).toHaveCount(3)
  await expect(choices.nth(0)).toContainText('送る')
  await expect(choices.nth(1)).toContainText('救う')
  await expect(choices.nth(2)).toContainText('継ぐ')
  const classes = await choices.evaluateAll((nodes) => nodes.map((node) => node.className))
  expect(new Set(classes).size).toBe(1)
  for (let i = 0; i < 3; i++) await expect(choices.nth(i)).toBeEnabled()
  await expect(page.locator('[data-zone="finale-choices"] [class*="recommend"], [data-zone="finale-choices"] [class*="badge"]')).toHaveCount(0)
})

test('一族の固有名を返し、狭幅でも三択へスクロール到達できる', async ({ page }, testInfo) => {
  await gotoFinale(page)
  await expect(page.getByRole('region', { name: '一族がここまで運んだもの' })).toContainText('灯子')
  const choices = page.locator('[data-zone="finale-choices"] button')
  await choices.last().scrollIntoViewIfNeeded()
  await expect(choices.last()).toBeVisible()

  const geometry = await page.evaluate(() => {
    const memory = document.querySelector<HTMLElement>('.finale-memory')!.getBoundingClientRect()
    const choice = document.querySelector<HTMLElement>('.finale-choices')!.getBoundingClientRect()
    const screen = document.querySelector<HTMLElement>('.finale-screen')!
    return {
      separated: memory.bottom <= choice.top,
      scrollable: screen.scrollHeight <= screen.clientHeight || getComputedStyle(screen).overflowY === 'auto',
    }
  })
  expect(geometry.separated).toBe(true)
  expect(geometry.scrollable).toBe(true)

  if (['mobile-360', 'mobile-390', 'tablet-768'].includes(testInfo.project.name)) {
    await page.screenshot({ path: testInfo.outputPath('finale.png'), fullPage: true })
  }
})

test('灯の余白は7日通知を一度出し、完読済みの章を進行不変で再読できる', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  await page.evaluate(() => {
    const game = (window as never as GameWindow).__game
    game.reset()
    const data = game.store.getState().data as {
      narrative?: Record<string, unknown>
    }
    const unread = { kind: 'dreamEp', epId: 'yume_tabibito' }
    const archived = {
      kind: 'life', narrativeId: 'ch-test-reread', title: '読み返す灯',
      lines: [{ speaker: '綴', text: '読み返しても、選んだ道は変わらない。' }],
    }
    game.store.setState({
      data: {
        ...data,
        narrative: {
          ...(data.narrative ?? {}),
          completed: ['ch-test-reread'],
          deferred: [unread],
          archive: [archived],
          deferredSince: { 'dream:yume_tabibito': Date.now() - 8 * 24 * 60 * 60 * 1000 },
          deferredReminderShown: [],
        },
      },
      screen: { id: 'home' },
    })
  })

  await expect(page.getByTestId('narrative-overdue-reminder')).toContainText('急がずここから続きを読める')
  await page.getByRole('button', { name: /灯の余白/ }).click()
  await expect(page.getByRole('heading', { name: '家譜に綴じた物語' })).toBeVisible()
  await page.getByRole('button', { name: /読み返す灯/ }).click()
  await expect(page.getByRole('heading', { name: '読み返す灯' })).toBeVisible()
  await expect(page.getByRole('button', { name: '後で読む' })).toHaveCount(0)
  await page.getByRole('button', { name: 'この夜を憶えておく' }).click()

  const result = await page.evaluate(() => {
    const game = (window as never as GameWindow).__game
    const data = game.store.getState().data as {
      narrative: { completed: string[]; deferredReminderShown: string[] }
    }
    return {
      completedCount: data.narrative.completed.filter((id) => id === 'ch-test-reread').length,
      reminderCount: data.narrative.deferredReminderShown.filter((id) => id === 'dream:yume_tabibito').length,
    }
  })
  expect(result).toEqual({ completedCount: 1, reminderCount: 1 })
})
