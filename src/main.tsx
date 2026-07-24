import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './ui/m40_coal_workshop.css'
import { attachUiClickSfx } from './core/audio'
import { applyReduceMotion } from './core/settings'
import { installTestHooks } from './dev/testhooks'

const detachUiClickSfx = attachUiClickSfx()
if (import.meta.hot) import.meta.hot.dispose(detachUiClickSfx)
applyReduceMotion()
installTestHooks() // dev限定 — 実ブラウザ受入テスト(npm run test:visual)の状態投入口

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
