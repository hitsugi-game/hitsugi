import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { attachUiClickSfx } from './core/audio'
import { applyReduceMotion } from './core/settings'
import { installTestHooks } from './dev/testhooks'

attachUiClickSfx()
applyReduceMotion()
installTestHooks() // dev限定 — 実ブラウザ受入テスト(npm run test:visual)の状態投入口

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
