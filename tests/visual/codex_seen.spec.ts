// M26 §12.1 / P0-07: 図鑑を開いただけで全新着が既読化されないこと(個別既読)。
import { expect, test } from '@playwright/test'

interface W {
  __game: {
    reset: () => void
    screen: (id: string) => void
    store: { getState: () => { data: { codexSeenIds?: { enemies: string[]; gods: string[] } } }; setState: (u: unknown) => void }
  }
}

test('図鑑: 開いただけでは全新着が既読化されない(P0-07)', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window, null, { timeout: 15_000 })
  // 発見済みの魔性を数体与え、既読集合は空のままにする
  await page.evaluate(() => {
    const g = (window as never as W).__game
    g.reset()
    const d = g.store.getState().data as Record<string, unknown>
    g.store.setState({ data: { ...d, codex: { enemies: ['yobai', 'kodama', 'onibi'], gods: [] }, codexSeenIds: { enemies: [], gods: [] } } })
    g.screen('codex')
  })
  await page.waitForTimeout(900)
  // 画面mount後も既読集合は空のまま(=開いただけで全件既読化していない)
  const seen = await page.evaluate(() => (window as never as W).__game.store.getState().data.codexSeenIds)
  expect(seen?.enemies ?? [], 'mountで魔性が既読化されていない').toEqual([])
})
