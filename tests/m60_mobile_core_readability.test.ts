import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const battle = readFileSync('src/ui/Battle.tsx', 'utf8')
const battleCss = readFileSync('src/ui/battle_m43.css', 'utf8')
const home = readFileSync('src/ui/Home.tsx', 'utf8')
const homeCss = readFileSync('src/ui/m17_home.css', 'utf8')

describe('M60 mobile core readability contracts', () => {
  it('keeps the two battle cue rows at 12px and exposes a complete non-color reading', () => {
    expect(battleCss).toContain("grid-template-areas: 'dot tell' 'dot response'")
    expect(battleCss).not.toMatch(/intent-(?:tell|response)[^{]*\{[^}]*font-size:\s*(?:8|9|10|11)(?:px|\.\d+px)/s)
    expect(battle).toContain('操作して全文を読む')
    expect(battle).toContain('危険度')
    expect(battle).toContain('対象')
    expect(battle).toContain('対処')
    expect(battle).toContain('intent-reader-backdrop')
    expect(battle).toContain("behaviorCue?.certainty === 'committed'")
    expect(battle).toContain('cueTimingLabel')
    expect(battleCss).toContain("[data-certainty='committed']")
  })

  it('opens the full cue without running the enemy-card action', () => {
    expect(battle).toContain('event.stopPropagation()')
    expect(battle).toContain("event.key === 'Enter' || event.key === ' '")
    expect(battle).toContain('setIntentDisclosureOpen(true)')
    expect(battle).toContain('aria-expanded={behaviorCue ? intentDisclosureOpen : undefined}')
  })

  it('retains every family button while replacing the selected duplicate summary with a status marker', () => {
    expect(home).toContain('const smalls = c.alive')
    expect(home).toContain('family-selected-status')
    expect(homeCss).toContain('.family-smalls .char-card.selected .char-card-row { display: none; }')
    expect(homeCss).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(homeCss).toContain('.home-screen .family-smalls .m46-level-line')
  })
})
