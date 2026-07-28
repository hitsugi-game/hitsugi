import { expect, test, type Page } from '@playwright/test'

function monitorConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    if (message.type() === 'error' || /Each child in a list should have a unique "key" prop/.test(text)) problems.push(`${message.type()}: ${text}`)
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  return problems
}

test('production Title → Home → Pact flow renders without browser errors or QA hooks', async ({ page }) => {
  const problems = monitorConsole(page)
  await page.goto('/')
  await expect(page.locator('.title-screen')).toBeVisible()
  await expect(page.evaluate(() => '__game' in window)).resolves.toBe(false)

  await page.getByRole('button', { name: 'はじめから' }).click()
  await page.getByRole('button', { name: /宿命/ }).click()
  await page.getByRole('button', { name: '物語を飛ばす' }).click()
  await expect(page.locator('.home-screen')).toBeVisible()

  await page.getByRole('button', { name: /星契り — 次代を授かる/ }).click()
  await expect(page.getByRole('heading', { name: '交神の儀' })).toBeVisible()

  expect(problems, problems.join('\n')).toEqual([])
})

test('damaged save remains recoverable and never produces a blank screen', async ({ page }) => {
  const problems = monitorConsole(page)
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('hitsugi_save_v4', '{broken')
    localStorage.setItem('hitsugi_save_v4_bak', '[]')
  })
  await page.reload()
  await expect(page.locator('.title-screen')).toBeVisible()
  await expect(page.locator('.title-save-state')).toContainText(/読めない|読み込めなかった/)
  await expect(page.getByRole('button', { name: 'セーブの管理' })).toBeVisible()
  expect(problems, problems.join('\n')).toEqual([])
})

test('corrupt main save resumes from a verified BAK in the production bundle', async ({ page }) => {
  const problems = monitorConsole(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'はじめから' }).click()
  await page.getByRole('button', { name: /宿命/ }).click()
  await page.getByRole('button', { name: '物語を飛ばす' }).click()
  await expect(page.locator('.home-screen')).toBeVisible()
  await page.evaluate(() => {
    const main = localStorage.getItem('hitsugi_save_v4')
    if (!main) throw new Error('new game did not persist a main save')
    localStorage.setItem('hitsugi_save_v4_bak', main)
    localStorage.setItem('hitsugi_save_v4', '{broken')
  })
  await page.reload()
  await expect(page.locator('.title-save-state')).toContainText(/控えから復せる|控えから復旧可能/)
  await page.getByRole('button', { name: '控えからつづける' }).click()
  await expect(page.locator('.home-screen')).toBeVisible()
  expect(problems, problems.join('\n')).toEqual([])
})

test('a failed production lazy chunk reaches the root recovery page instead of a blank screen', async ({ page }) => {
  await page.route('**/GameRuntime-*.js', (route) => route.abort('failed'))
  await page.goto('/')
  await page.getByRole('button', { name: 'はじめから' }).click()
  await page.getByRole('button', { name: /宿命/ }).click()
  await expect(page.locator('.root-recovery')).toBeVisible()
  await expect(page.getByRole('heading', { name: '画面を開けなかった。' })).toBeVisible()
  await expect(page.getByRole('button', { name: '再読込する' })).toBeVisible()
  await expect(page.getByRole('button', { name: '検証済みセーブを書き出す' })).toBeVisible()
  await expect(page.getByRole('button', { name: '診断IDをコピー' })).toBeVisible()
})

test('denied browser storage is disclosed and non-saving play reaches Home', async ({ page }) => {
  const problems = monitorConsole(page)
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value: () => { throw new DOMException('denied by release smoke', 'SecurityError') },
      })
    }
  })
  await page.goto('/')
  await expect(page.locator('.title-screen')).toBeVisible()
  await expect(page.locator('.title-save-state')).toContainText(/保存できない|保存領域/)
  await expect(page.getByRole('button', { name: 'はじめから' })).toBeEnabled()
  await page.getByRole('button', { name: 'はじめから' }).click()
  await page.getByRole('button', { name: /宿命/ }).click()
  await page.getByRole('button', { name: '物語を飛ばす' }).click()
  await expect(page.locator('.home-screen')).toBeVisible()
  expect(problems, problems.join('\n')).toEqual([])
})
