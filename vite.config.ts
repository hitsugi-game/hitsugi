import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import packageJson from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // GitHub Pages等どこに置いても動く相対パス
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __COMMIT_SHA__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'),
  },
  test: {
    // tests/visual/* は playwright(実ブラウザ)専用。`npm run test:visual` で走らせる。
    // vitest(Node)が拾うと playwright の import で落ちるため除外する。
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/visual/**', 'tests/release/**'],
  },
})
