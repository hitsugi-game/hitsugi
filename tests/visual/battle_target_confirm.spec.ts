import { expect, test } from '@playwright/test'
import { boxesOf, crossings, gotoBattle } from './helpers'

test('戦闘上端: 行動順・設定・報酬予告・敵兆し・敵札が競合せず行動順は一行内に収まる', async ({ page }) => {
  await gotoBattle(page, { allies: 1, enemies: 2 })

  const [rail, turn, settings, reward, intents, enemyCards] = await Promise.all([
    boxesOf(page, '[data-zone="battle-top"]'),
    boxesOf(page, '[data-zone="turnorder"]'),
    boxesOf(page, '.mute-btn'),
    boxesOf(page, '[data-zone="reward"]'),
    boxesOf(page, '.enemy-intent'),
    boxesOf(page, '[data-zone="enemy-card"]'),
  ])
  expect(rail).toHaveLength(1)
  expect(turn).toHaveLength(1)
  expect(settings).toHaveLength(1)

  for (const [a, b, label] of [
    [turn, settings, '行動順×設定'],
    [turn, reward, '行動順×報酬予告'],
    [reward, settings, '報酬予告×設定'],
    [turn, intents, '行動順×敵兆し'],
    [turn, enemyCards, '行動順×敵札'],
    [reward, intents, '報酬予告×敵兆し'],
    [reward, enemyCards, '報酬予告×敵札'],
    [settings, intents, '設定×敵兆し'],
    [settings, enemyCards, '設定×敵札'],
    [intents, enemyCards, '敵兆し×敵札'],
  ] as const) {
    expect(crossings(a, b), label).toEqual([])
  }

  const turnLayout = await page.locator('[data-zone="turnorder"]').evaluate((el) => {
    const style = getComputedStyle(el)
    return {
      flexWrap: style.flexWrap,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      railRight: el.parentElement?.getBoundingClientRect().right ?? 0,
      turnRight: el.getBoundingClientRect().right,
    }
  })
  expect(turnLayout.flexWrap).toBe('nowrap')
  expect(turnLayout.scrollWidth, '行動順の内容が親から溢れない').toBeLessThanOrEqual(turnLayout.clientWidth)
  expect(turnLayout.turnRight).toBeLessThanOrEqual(turnLayout.railRight)
})

test('通常攻撃: 対象選択と予告だけでは発火せず明示実行だけが戦闘を進める', async ({ page }) => {
  await gotoBattle(page, { allies: 1, enemies: 2 })

  // PC戦支度盤は目的の補足文をaccessible nameへ含み、mobileは短名のまま。両方の先頭語を固定する。
  const attack = page.getByRole('button', { name: /^攻撃/ }).first()
  const firstEnemy = page.locator('.combatant.is-enemy').filter({ has: page.locator('[data-zone="enemy-card"]') }).first()
  const hpOf = async () => (await firstEnemy.getAttribute('aria-label'))?.match(/体力(\d+\/\d+)/)?.[1]
  const hpBefore = await hpOf()

  // root状態の敵札は操作対象ではなく、クリックしても即攻撃しない。
  await firstEnemy.click()
  expect(await hpOf()).toBe(hpBefore)
  await expect(attack).toBeEnabled()

  await attack.click()
  const target = page.locator('.combatant.is-enemy[role="button"]').first()
  await expect(target).toBeFocused()
  await target.press('Enter')

  const confirm = page.locator('#battle-action-confirm')
  const execute = page.getByRole('button', { name: 'この行動を実行' })
  await expect(confirm).toBeVisible()
  await expect(confirm).toContainText('攻撃')
  await expect(confirm).toContainText('相性')
  await expect(confirm).toContainText('継足')
  await expect(confirm).toContainText('対象体力')
  await expect(target).toHaveAttribute('aria-pressed', 'true')
  await expect(execute).toBeFocused()
  expect(await hpOf()).toBe(hpBefore)

  // 一段目Escは確認→標的選択、二段目Escは起点の攻撃釦へ戻す。
  await page.keyboard.press('Escape')
  await expect(confirm).toBeHidden()
  await expect(target).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(attack).toBeFocused()

  // 数字キーも選択止まり。最後の明示実行でだけ手番が進む。
  await attack.click()
  await page.keyboard.press('1')
  await expect(confirm).toBeVisible()
  expect(await hpOf()).toBe(hpBefore)
  await execute.click()
  await expect(confirm).toBeHidden()
  await expect(attack).toBeDisabled()
})
