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
import { BirthScene, CeremonyScene, DeathScene, DreamScene, EndingScene, FinaleScene, JobRiteScene, LifeScene } from './ui/Scenes'
import { SettingsModal } from './ui/Settings'

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

function App() {
  const screen = useGame((s) => s.screen)
  const battleNodeId = useGame((s) => s.battleNodeId)
  const data = useGame((s) => s.data)

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
    </>
  )
}

export default App
