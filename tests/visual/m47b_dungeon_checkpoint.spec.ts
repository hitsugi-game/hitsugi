import { expect, test } from '@playwright/test'

interface M47bGameWindow {
  __game: {
    reset: () => void
    battle: (opts?: { allies?: number; enemies?: number }) => void
    store: {
      getState: () => Record<string, any>
      setState: (state: Record<string, unknown>) => void
    }
  }
}

test('M47B 中断再開は同じ遠征checkpointへ戻る', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window)
  await page.evaluate(() => {
    const game = (window as unknown as M47bGameWindow).__game
    game.reset()
    const initial = game.store.getState()
    const id = initial.data.family.find((character: { alive: boolean }) => character.alive).id
    initial.departDungeon('yoi_forest', [id])
    game.store.getState().chooseBoon(null)
    const entered = game.store.getState()
    game.store.setState({
      data: {
        ...entered.data,
        family: entered.data.family.map((character: { id: string; hp: number; mp: number }) => (
          character.id === id ? { ...character, hp: character.hp - 5, mp: character.mp - 2 } : character
        )),
      },
      dungeonRun: {
        ...entered.dungeonRun,
        light: 57,
        loot: { hoto: 19, ketsu: 3, items: [] },
        used: ['0:4:5'],
        introSeen: false,
      },
    })
    game.store.getState().dungeonIntroSeen()
  })

  await page.reload()
  await page.waitForFunction(() => '__game' in window)
  const resumed = await page.evaluate(() => {
    const game = (window as unknown as M47bGameWindow).__game
    const ok = game.store.getState().continueGame()
    const state = game.store.getState()
    return {
      ok,
      screen: state.screen.id,
      light: state.dungeonRun?.light,
      hoto: state.dungeonRun?.loot.hoto,
      ketsu: state.dungeonRun?.loot.ketsu,
      used: state.dungeonRun?.used,
    }
  })

  expect(resumed).toEqual({ ok: true, screen: 'dungeon', light: 57, hoto: 19, ketsu: 3, used: ['0:4:5'] })
  await expect(page.locator('.dungeon-screen')).toBeVisible()
})

test('M47B 敗北画面を閉じても永久死と月送りを取り消せない', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => '__game' in window)
  const beforeSeason = await page.evaluate(() => {
    const game = (window as unknown as M47bGameWindow).__game
    game.battle({ allies: 2, enemies: 1 })
    const state = game.store.getState()
    const ids = state.data.family.filter((character: { alive: boolean }) => character.alive).slice(0, 2).map((character: { id: string }) => character.id)
    game.store.setState({
      dungeonRun: {
        regionId: 'yoi_forest', floor: 0, x: 4, y: 5, light: 41,
        loot: { hoto: 22, ketsu: 4, items: [] }, partyIds: ids,
        log: ['夜藪へ入った。'], used: ['0:4:5'], bossDown: false, introSeen: false,
      },
    })
    game.store.getState().dungeonIntroSeen()
    const checkpoint = game.store.getState()
    game.store.setState({
      battle: {
        ...checkpoint.battle,
        phase: 'lost',
        allies: checkpoint.battle.allies.map((ally: Record<string, unknown>) => ({ ...ally, hp: 0 })),
      },
    })
    return checkpoint.data.seasonIndex
  })

  await expect.poll(() => page.evaluate(() => (window as unknown as M47bGameWindow).__game.store.getState().data.seasonIndex)).toBe(beforeSeason + 1)
  await expect(page.locator('.battle-screen')).toBeVisible()
  await expect(page.getByRole('button', { name: /帰り火へ/ })).toBeVisible()
  const resultState = await page.evaluate(() => {
    const state = (window as unknown as M47bGameWindow).__game.store.getState()
    return {
      dead: state.data.family.filter((character: { alive: boolean }) => !character.alive).length,
      persistedRun: state.data.dungeonRun ?? null,
      runtimeRun: state.dungeonRun !== null,
    }
  })
  expect(resultState).toEqual({ dead: 1, persistedRun: null, runtimeRun: true })

  // CTAを押さずにプロセス消失を再現し、保存済み結果から再開する。
  await page.reload()
  await page.waitForFunction(() => '__game' in window)
  const reloaded = await page.evaluate(() => {
    const game = (window as unknown as M47bGameWindow).__game
    const ok = game.store.getState().continueGame()
    const state = game.store.getState()
    return {
      ok,
      screen: state.screen.id,
      season: state.data.seasonIndex,
      dead: state.data.family.filter((character: { alive: boolean }) => !character.alive).length,
      persistedRun: state.data.dungeonRun ?? null,
      runtimeRun: state.dungeonRun,
    }
  })
  expect(reloaded).toEqual({
    ok: true,
    screen: 'home',
    season: beforeSeason + 1,
    dead: 1,
    persistedRun: null,
    runtimeRun: null,
  })
})
