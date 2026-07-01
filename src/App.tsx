import { useGame } from './core/store'
import { TitleScreen, IntroScreen } from './ui/Title'
import { HomeScreen } from './ui/Home'
import { PactScreen } from './ui/Pact'
import { DepartScreen, ExpeditionScreen } from './ui/Expedition'
import { BattleScreen } from './ui/Battle'
import { ChronicleScreen } from './ui/Chronicle'
import { BirthScene, DeathScene, EndingScene } from './ui/Scenes'

function App() {
  const screen = useGame((s) => s.screen)

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
    case 'battle':
      return <BattleScreen />
    case 'chronicle':
      return <ChronicleScreen />
    case 'birth':
      return <BirthScene charId={screen.charId} />
    case 'death':
      return <DeathScene charId={screen.charId} />
    case 'ending':
      return <EndingScene />
    default:
      return <TitleScreen />
  }
}

export default App
