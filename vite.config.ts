import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import packageJson from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // GitHub Pages等どこに置いても動く相対パス
  // 素材検収用HTMLは別制作物。ゲームの入口からだけ依存関係を探索する。
  optimizeDeps: { entries: ['index.html'] },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __COMMIT_SHA__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'),
  },
  test: {
    // 多数のテストがデータ全集を読むため、CPU数に比例した起動でメモリを圧迫しない。
    maxWorkers: 2,
    include: ['tests/**/*.test.{ts,tsx}'],
    // tests/visual/* は playwright(実ブラウザ)専用。`npm run test:visual` で走らせる。
    // vitest(Node)が拾うと playwright の import で落ちるため除外する。
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/visual/**', 'tests/release/**'],
  },
})
