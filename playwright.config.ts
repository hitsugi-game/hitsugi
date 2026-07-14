// M25/M26 実ブラウザ受入テスト — `npm run test:visual`
//
// 【設計意図】
// preview系MCPツールの障害はエージェント側の話であり、プロジェクトがヘッドレスブラウザで
// 検証することを妨げない。暗部率・札の重なり率・矩形交差・ヒット領域(44/48px)は
// 実際に描画されたDOMからしか測れないため、ここで数値assertする。
//
// 【CI非経路】
// GitHub Actions のデプロイ経路(npm run build)には入れない。ローカル検証専用。
import { defineConfig, devices } from '@playwright/test'

// M26 §19 の必須viewport 5種
export const VIEWPORTS = {
  'pc-1440': { width: 1440, height: 900 },
  'pc-1280': { width: 1280, height: 720 },
  'tablet-768': { width: 768, height: 1024 },
  'mobile-390': { width: 390, height: 844 },
  'mobile-360': { width: 360, height: 800 },
} as const

export default defineConfig({
  testDir: './tests/visual',
  outputDir: './tests/visual/.artifacts',
  fullyParallel: false, // 1つのdevサーバを共有するため直列
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: 'http://localhost:5173',
    // 常夜のゲームなので、暗部率の測定にブラウザ既定の白背景を混ぜない
    colorScheme: 'dark',
  },
  projects: Object.entries(VIEWPORTS).map(([name, viewport]) => ({
    name,
    use: { ...devices['Desktop Chrome'], viewport },
  })),
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
