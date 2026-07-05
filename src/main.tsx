import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { attachUiClickSfx } from './core/audio'
import { applyReduceMotion } from './core/settings'

attachUiClickSfx()
applyReduceMotion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
