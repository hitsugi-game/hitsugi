import { lazy, Suspense, useEffect, useState } from 'react'
import { TitleScreen } from './ui/Title'
import { audio } from './core/audio'

const GameRuntime = lazy(() => import('./GameRuntime'))

function RuntimeLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite" aria-label="一族の記を読み込んでいます">
      <span className="route-loading-mark" aria-hidden>灯</span>
      <p>一族の記を開いている</p>
      <div className="route-loading-progress" aria-hidden><i /></div>
      <small>最初の頁だけを先に開き、ゲーム本体は開始時に読み込む。</small>
      <button className="btn btn-ghost" type="button" onClick={() => window.location.reload()}>読み込み直す</button>
    </div>
  )
}

export default function App() {
  const [runtimeReady, setRuntimeReady] = useState(false)
  useEffect(() => {
    audio.setSceneContext({ screenId: 'title' })
    audio.play('title')
  }, [])
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const openForBrowserQa = () => setRuntimeReady(true)
    window.addEventListener('hitsugi:test-runtime-ready', openForBrowserQa)
    return () => window.removeEventListener('hitsugi:test-runtime-ready', openForBrowserQa)
  }, [])
  if (!runtimeReady) return <TitleScreen onRuntimeReady={() => setRuntimeReady(true)} />
  return (
    <Suspense fallback={<RuntimeLoading />}>
      <GameRuntime />
    </Suspense>
  )
}
