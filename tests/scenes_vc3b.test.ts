import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ENDINGS, FINALE_CHOICES } from '../src/core/data/story'

const sceneSource = readFileSync('src/ui/Scenes.tsx', 'utf8')
const sceneCss = readFileSync('src/ui/scenes_vc3b.css', 'utf8')

describe('VC3B scene surface contract', () => {
  it('9 routeを3つの共有surfaceへ固定し、9枚の背景へ分岐しない', () => {
    const routes = ['birth', 'ceremony', 'jobrite', 'life', 'death', 'dream', 'dreamEp', 'finale', 'ending']
    for (const route of routes) expect(sceneSource).toContain(`data-scene-route="${route}"`)

    expect(sceneSource).toContain("'life-thread': '命の綴り'")
    expect(sceneSource).toContain("'dream-edge': '夢の縁'")
    expect(sceneSource).toContain("'flame-crossroads': '灯の岐路'")
    expect(new Set([...sceneSource.matchAll(/data-scene-surface="([^"]+)"/g)].map((match) => match[1]))).toEqual(
      new Set(['life-thread', 'dream-edge', 'flame-crossroads']),
    )
  })

  it('primary CTA、semantic group、5幅とreduced-motionの機械契約を持つ', () => {
    expect(sceneSource).toContain('data-scene-primary="true"')
    expect(sceneSource).toContain('data-scene-group="identity"')
    expect(sceneSource).toContain('data-scene-group="decision"')
    expect(sceneCss).toMatch(/min-width:\s*1100px/)
    expect(sceneCss).toMatch(/max-width:\s*900px/)
    expect(sceneCss).toMatch(/max-width:\s*560px/)
    expect(sceneCss).toContain('@media (prefers-reduced-motion: reduce)')
    expect(sceneCss).toContain('min-height: 48px')
  })

  it('成人と生業の儀は郷への退避導線と再開先を明示する', () => {
    expect(sceneSource).toContain('data-zone="rite-return"')
    expect(sceneSource).toContain('← 郷へ戻る')
    expect(sceneSource).toContain('未決定の儀は「灯の余白」に残り、後から再開できる')
    expect(sceneCss).toMatch(/\.vc3b-rite-return[\s\S]*?min-height:\s*44px/)
  })

  it('Finaleは既存三択を直接確定せず、同格選択の後に一つの確認CTAを出す', () => {
    expect(FINALE_CHOICES.map((choice) => choice.id)).toEqual(['cut', 'save', 'inherit'])
    expect(Object.keys(ENDINGS)).toEqual(['cut', 'save', 'inherit'])
    expect(sceneSource).toContain('FINALE_CHOICES.map((c, i)')
    expect(sceneSource).toContain('onClick={() => setPendingChoice(i)}')
    expect(sceneSource).toContain('onClick={() => resolveFinale(pendingChoice)}')
    expect(sceneSource).toContain('この答えを綴じる')
  })
})
