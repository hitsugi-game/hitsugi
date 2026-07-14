import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // GitHub Pages等どこに置いても動く相対パス
  test: {
    // tests/visual/* は playwright(実ブラウザ)専用。`npm run test:visual` で走らせる。
    // vitest(Node)が拾うと playwright の import で落ちるため除外する。
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/visual/**'],
  },
})
