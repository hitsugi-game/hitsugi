import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const home = readFileSync('src/ui/Home.tsx', 'utf8')
const css = readFileSync('src/ui/m17_home.css', 'utf8')

describe('M49 今月の決断ジャンプ', () => {
  it('決断を見るは移動先を明示し、選択可能なカードへフォーカスを渡す', () => {
    expect(home).toContain('data-testid="decision-jump"')
    expect(home).toContain('aria-controls="monthly-decisions"')
    expect(home).toContain('target.querySelector<HTMLButtonElement>')
    expect(home).toContain("button:not(:disabled)")
    expect(home).toContain('focus({ preventScroll: true })')
    expect(home).toContain('setDecisionAttention(true)')
    expect(home).toContain("block: 'start'")
    expect(home).toContain('id="monthly-decisions"')
  })

  it('固定ヘッダーに隠れない位置へスクロールする', () => {
    expect(css).toContain('scroll-margin-top: 112px')
    expect(css).toContain('.home-core-actions.is-jump-target .panel')
  })
})
