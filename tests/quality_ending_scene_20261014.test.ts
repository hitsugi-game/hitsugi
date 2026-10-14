import { beforeEach, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useGame } from '../src/core/store'
import { EndingScene } from '../src/ui/Scenes'

// SSRでも現fixtureを読む。storeのcommandやstateは実実装のまま使う。
vi.mock('../src/core/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/core/store')>()
  const useCurrentGame = Object.assign(
    ((selector: (state: ReturnType<typeof actual.useGame.getState>) => unknown) => selector(actual.useGame.getState())),
    actual.useGame,
  )
  return { ...actual, useGame: useCurrentGame }
})

beforeEach(() => useGame.getState().newGame(false))

it.each([0, 1, 2])('過去の結末%dがあっても、今回断絶なら断絶本文を描画する', (endingType) => {
  const data = useGame.getState().data!
  useGame.setState({ data: { ...data, flags: { ...data.flags, cleared: true, endingType, extinct: true } } })
  const html = renderToStaticMarkup(createElement(EndingScene))
  expect(html).toContain('最後の灯が、消えた。')
  expect(html).toContain('断絶')
  expect(html).not.toContain('cg_end_')
  expect(useGame.getState().data!.flags.cleared).toBe(true)
})
