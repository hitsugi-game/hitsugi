import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './ui/m40_coal_workshop.css'
import { attachUiClickSfx } from './core/audio'
import { applyReduceMotion } from './core/settings'
import { RootErrorBoundary } from './ui/RootRecovery'

const detachUiClickSfx = attachUiClickSfx()
if (import.meta.hot) import.meta.hot.dispose(detachUiClickSfx)
applyReduceMotion()
if (import.meta.env.DEV) {
  // dev受入だけが巨大なテスト状態投入部を読む。本番の最初の頁へゲーム全データを逆流させない。
  void import('./dev/testhooks').then(({ installTestHooks }) => installTestHooks())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
