import { expect, test } from '@playwright/test'

interface AudioSnapshot {
  desiredTrack: string
  activeTrack: string
  desiredAmbience: string
  contextState: string
  musicTimers: number
  ambienceTimers: number
  unlocked: boolean
  muted: boolean
  mix: { master: number; music: number; effects: number; ambience: number }
}

interface AudioWindow {
  __game: {
    reset: () => void
    screen: (id: string) => void
    dungeon: () => void
    battle: (options: { boss?: boolean }) => void
    rareBattle: () => void
    audio: {
      debugSnapshot: () => AudioSnapshot
      toggleMute: () => boolean
      setMusicVolume: (value: number) => void
    }
  }
}

async function snapshot(page: import('@playwright/test').Page): Promise<AudioSnapshot> {
  return page.evaluate(() => (window as unknown as AudioWindow).__game.audio.debugSnapshot())
}

test.beforeEach(({ browserName: _browserName }, info) => {
  test.skip(!['pc-1280', 'mobile-390'].includes(info.project.name), 'M50 audio acceptance uses canonical PC/mobile widths.')
})

test('M50 waits for a gesture, then keeps one adaptive music scheduler through screen changes', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window)
  const before = await snapshot(page)
  expect(before.desiredTrack).toBe('title')
  expect(before.contextState).toBe('uncreated')
  expect(before.musicTimers).toBe(0)

  await page.getByRole('button', { name: '設定' }).click()
  await expect.poll(async () => (await snapshot(page)).activeTrack).toBe('title')
  expect((await snapshot(page)).musicTimers).toBe(1)
  await page.keyboard.press('Escape')

  await page.evaluate(() => {
    const game = (window as unknown as AudioWindow).__game
    game.reset()
    game.screen('home')
  })
  await expect.poll(async () => (await snapshot(page)).activeTrack).toBe('home')
  await page.evaluate(() => (window as unknown as AudioWindow).__game.screen('codex'))
  await expect.poll(async () => (await snapshot(page)).activeTrack).toBe('archive')
  await page.evaluate(() => (window as unknown as AudioWindow).__game.screen('finale'))
  await expect.poll(async () => (await snapshot(page)).activeTrack).toBe('finale')
  expect((await snapshot(page)).musicTimers).toBe(1)
})

test('M50 separates persisted music volume and restores ambience after mute', async ({ page }, info) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window)
  await page.getByRole('button', { name: '設定' }).click()
  const modal = page.getByRole('dialog', { name: '道具箱 — 設定' })
  await expect(modal.getByLabel('音楽の音量')).toBeVisible()
  await expect(modal.getByLabel('効果音の音量')).toBeVisible()
  await expect(modal.getByLabel('環境音の音量')).toBeVisible()
  const settingsLayout = await modal.evaluate((node) => {
    const sheet = node as HTMLElement
    const groups = Array.from(sheet.querySelectorAll<HTMLElement>('.settings-tool-group'))
      .map((group) => group.getBoundingClientRect().toJSON())
    const rowsInside = Array.from(sheet.querySelectorAll<HTMLElement>('.setting-row')).every((row) => {
      const rowBox = row.getBoundingClientRect()
      return Array.from(row.children).every((child) => {
        const box = child.getBoundingClientRect()
        return box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1
      })
    })
    return {
      width: sheet.getBoundingClientRect().width,
      scrollDelta: sheet.scrollWidth - sheet.clientWidth,
      groups,
      rowsInside,
    }
  })
  expect(settingsLayout.scrollDelta, `${info.project.name}: 設定Sheet横overflow`).toBeLessThanOrEqual(1)
  expect(settingsLayout.rowsInside, `${info.project.name}: 音量操作を設定欄内に収める`).toBe(true)
  if (info.project.name === 'pc-1280') {
    expect(settingsLayout.width).toBeGreaterThanOrEqual(780)
    expect(settingsLayout.groups[1].left).toBeGreaterThanOrEqual(settingsLayout.groups[0].right + 8)
  } else {
    expect(settingsLayout.width).toBeLessThanOrEqual(390)
    expect(settingsLayout.groups[1].top).toBeGreaterThan(settingsLayout.groups[0].bottom)
  }
  await modal.getByLabel('音楽の音量').fill('37')
  expect((await snapshot(page)).mix.music).toBeCloseTo(0.37)
  await page.keyboard.press('Escape')

  await page.evaluate(() => (window as unknown as AudioWindow).__game.dungeon())
  await expect.poll(async () => (await snapshot(page)).ambienceTimers).toBe(1)
  await page.evaluate(() => (window as unknown as AudioWindow).__game.audio.toggleMute())
  expect((await snapshot(page)).ambienceTimers).toBe(0)
  await page.evaluate(() => (window as unknown as AudioWindow).__game.audio.toggleMute())
  await expect.poll(async () => (await snapshot(page)).ambienceTimers).toBe(1)

  await page.reload()
  await page.waitForFunction(() => '__game' in window)
  expect((await snapshot(page)).mix.music).toBeCloseTo(0.37)
})

test('M50 suspends hidden-page audio and restores the desired score and ambience', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window)
  await page.getByRole('button', { name: '設定' }).click()
  await page.keyboard.press('Escape')
  await page.evaluate(() => (window as unknown as AudioWindow).__game.dungeon())
  await expect.poll(async () => (await snapshot(page)).activeTrack).toBe('expedition')
  await expect.poll(async () => (await snapshot(page)).ambienceTimers).toBe(1)

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(async () => (await snapshot(page)).contextState).toBe('suspended')
  expect((await snapshot(page)).musicTimers).toBe(0)
  expect((await snapshot(page)).ambienceTimers).toBe(0)

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(async () => (await snapshot(page)).contextState).toBe('running')
  await expect.poll(async () => (await snapshot(page)).activeTrack).toBe('expedition')
  await expect.poll(async () => (await snapshot(page)).ambienceTimers).toBe(1)
})

test('M50 distinguishes ordinary, rare and boss battle scores', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window)
  await page.getByRole('button', { name: '設定' }).click()
  await page.keyboard.press('Escape')
  await page.evaluate(() => (window as unknown as AudioWindow).__game.battle({ boss: false }))
  await expect.poll(async () => (await snapshot(page)).desiredTrack).toBe('battle')
  await page.evaluate(() => (window as unknown as AudioWindow).__game.rareBattle())
  await expect.poll(async () => (await snapshot(page)).desiredTrack).toBe('rare')
  await page.evaluate(() => (window as unknown as AudioWindow).__game.battle({ boss: true }))
  await expect.poll(async () => (await snapshot(page)).desiredTrack).toBe('boss')
  expect((await snapshot(page)).musicTimers).toBe(1)
})
