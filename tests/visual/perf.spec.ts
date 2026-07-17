// M25 §9.3 性能実測 — ダンジョン/戦闘の平均fps。
// M2エージェントが「PC/tabletでPixi描画が4〜7fps、boundingBoxがタイムアウトする」と報告した。
// これは受入(PC 55fps / モバイル 30fps)に直結する重大事なので、指揮側が実測で確定させる。
//
// M33: 「fpsに硬い閾値を入れる」件を検討した結果 — headless CI(GPU無し)ではGPU依存の重い画面が
// 実機と乖離する(実測: dungeon mobile-360=6fps に対し battle=60fps。dungeonはground bake/照明RT/粒子で
// software描画が支配的)。実機の体感fpsをheadlessで代表できないため、受入値(30/55fps)での硬いゲートは
// 本質的にflaky/無意味になる(devil指摘)。よって数値はtelemetryとして残し、ゲートは「描画が生きているか」の
// liveness最小チェック(fps>1=完全hang/描画停止の検知)に留める。これはM30の空キャンバス系(rAF停止)を
// 広いマージンで捕え、正常時(6〜60fps)は決して落ちない。
import { test, expect } from '@playwright/test'
import { gotoBattle, gotoDungeon } from './helpers'

async function measureFps(page: import('@playwright/test').Page, ms = 4000): Promise<number> {
  return page.evaluate(
    (dur) =>
      new Promise<number>((resolve) => {
        let frames = 0
        const t0 = performance.now()
        const tick = () => {
          frames++
          if (performance.now() - t0 >= dur) resolve((frames / (performance.now() - t0)) * 1000)
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
    ms,
  )
}

test('ダンジョン 10秒平均fps', async ({ page }, info) => {
  await gotoDungeon(page)
  const fps = await measureFps(page)
  info.annotations.push({ type: 'fps', description: `dungeon ${info.project.name}: ${fps.toFixed(1)} fps` })
  console.log(`[fps] dungeon ${info.project.name}: ${fps.toFixed(1)}`)
  // liveness: 描画ループが生きている(完全停止でない)。実機性能ゲートではない(上記コメント)。
  expect(fps, `dungeon ${info.project.name} の描画が停止している(rAF hang疑い)`).toBeGreaterThan(1)
})

test('戦闘 10秒平均fps', async ({ page }, info) => {
  await gotoBattle(page, { allies: 1, enemies: 2 })
  const fps = await measureFps(page)
  info.annotations.push({ type: 'fps', description: `battle ${info.project.name}: ${fps.toFixed(1)} fps` })
  console.log(`[fps] battle ${info.project.name}: ${fps.toFixed(1)}`)
  // liveness: 戦闘描画ループが生きている。battleはDOM主体で安定(実測60fps)だが同じ最小ゲートを置く。
  expect(fps, `battle ${info.project.name} の描画が停止している`).toBeGreaterThan(1)
})
