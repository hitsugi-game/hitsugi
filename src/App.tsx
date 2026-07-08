import { useEffect, useState } from 'react'
import { useGame } from './core/store'
import { audio } from './core/audio'
import type { TrackName } from './core/audio'
import { TitleScreen, IntroScreen } from './ui/Title'
import { HomeScreen } from './ui/Home'
import { PactScreen } from './ui/Pact'
import { DepartScreen, ExpeditionScreen } from './ui/Expedition'
import { DungeonScreen } from './ui/Dungeon'
import { BattleScreen } from './ui/Battle'
import { ChronicleScreen } from './ui/Chronicle'
import { CodexScreen } from './ui/Codex'
import { BirthScene, CeremonyScene, DeathScene, DreamScene, DreamEpScene, EndingScene, FinaleScene, JobRiteScene, LifeScene } from './ui/Scenes'
import { SettingsModal } from './ui/Settings'
import { setToastSink, emitToast, type ToastKind } from './ui/toast'

// 全画面共通の設定ボタン(⚙)。音量/ミュート/演出軽減/オート既定へアクセス。
function SettingsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="mute-btn" title="設定" onClick={() => setOpen(true)}>⚙</button>
      {open && <SettingsModal onClose={() => setOpen(false)} />}
    </>
  )
}

// トースト表示器 — emitToast()で飛んできた通知を数秒だけ積んで見せる
let toastSeq = 1
function Toaster() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: ToastKind }[]>([])
  useEffect(() => {
    setToastSink((msg, kind) => {
      const id = toastSeq++
      setToasts((t) => [...t, { id, msg, kind }].slice(-4))
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
    })
    return () => setToastSink(null)
  }, [])
  if (toasts.length === 0) return null
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>{t.msg}</div>
      ))}
    </div>
  )
}

// 図鑑/地域の伸びを検知して獲得トーストを飛ばす(storeは触らずdataの差分のみ見る)。
// モジュールレベルで前回値を保持しStrictModeの二重実行に強くする。
let lastCodexEnemies = -1
let lastCodexGods = -1
let lastRegions = -1
function useCollectionToasts(data: ReturnType<typeof useGame.getState>['data']) {
  useEffect(() => {
    if (!data) return
    const en = data.codex?.enemies?.length ?? 0
    const gd = data.codex?.gods?.length ?? 0
    const rg = data.regionsCleared.length
    if (lastCodexEnemies >= 0 && en > lastCodexEnemies) emitToast(`魔性図鑑 +${en - lastCodexEnemies}`, 'codex')
    if (lastCodexGods >= 0 && gd > lastCodexGods) emitToast(`星神図鑑 +${gd - lastCodexGods}`, 'codex')
    if (lastRegions >= 0 && rg > lastRegions) emitToast('新たな地の主を鎮めた', 'region')
    lastCodexEnemies = en
    lastCodexGods = gd
    lastRegions = rg
  }, [data])
}

function App() {
  const screen = useGame((s) => s.screen)
  const battleNodeId = useGame((s) => s.battleNodeId)
  const data = useGame((s) => s.data)

  useCollectionToasts(data)

  // ボタン操作音(委譲リスナー1本)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('.btn, .node-btn, .god-card, .region-card, .char-card.clickable')) {
        audio.se('click')
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    const track = ((): TrackName => {
      switch (screen.id) {
        case 'title':
        case 'intro':
          return 'title'
        case 'home':
        case 'pact':
        case 'depart':
        case 'chronicle':
          return 'home'
        case 'expedition':
        case 'dungeon':
          return 'expedition'
        case 'battle': {
          const node = battleNodeId ? data?.expedition?.nodes[battleNodeId] : undefined
          return node?.type === 'boss' ? 'boss' : 'battle'
        }
        case 'birth':
        case 'death':
        case 'dream':
        case 'dreamEp':
        case 'ceremony':
        case 'jobrite':
        case 'life':
        case 'ending':
          return 'scene'
        default:
          return 'none'
      }
    })()
    audio.play(track)
  }, [screen, battleNodeId, data])

  const view = (() => {
    switch (screen.id) {
      case 'title':
        return <TitleScreen />
      case 'intro':
        return <IntroScreen />
      case 'home':
        return <HomeScreen />
      case 'pact':
        return <PactScreen />
      case 'depart':
        return <DepartScreen />
      case 'expedition':
        return <ExpeditionScreen />
      case 'dungeon':
        return <DungeonScreen />
      case 'battle':
        return <BattleScreen />
      case 'chronicle':
        return <ChronicleScreen />
      case 'codex':
        return <CodexScreen />
      case 'finale':
        return <FinaleScene />
      case 'birth':
        return <BirthScene charId={screen.charId} />
      case 'ceremony':
        return <CeremonyScene charId={screen.charId} />
      case 'jobrite':
        return <JobRiteScene charId={screen.charId} />
      case 'life':
        return <LifeScene title={screen.title} lines={screen.lines} bg={screen.bg} />
      case 'death':
        return <DeathScene charId={screen.charId} />
      case 'dream':
        return <DreamScene />
      case 'dreamEp':
        return <DreamEpScene epId={screen.epId} />
      case 'ending':
        return <EndingScene />
      default:
        return <TitleScreen />
    }
  })()

  return (
    <>
      {view}
      <SettingsButton />
      <Toaster />
    </>
  )
}

export default App
