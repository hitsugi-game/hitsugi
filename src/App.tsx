import { useEffect, useState, lazy, Suspense } from 'react'
import { useGame } from './core/store'
import { audio } from './core/audio'
import { computeBattleTension, resolveTrack } from './core/audio_model'
import { TitleScreen, IntroScreen } from './ui/Title'
import { HomeScreen } from './ui/Home'
import { PactScreen } from './ui/Pact'
import { DepartScreen, ExpeditionScreen } from './ui/Expedition'
import { BattleScreen } from './ui/Battle'
import { ChronicleScreen } from './ui/Chronicle'
import { CodexScreen } from './ui/Codex'
import { ForgeScreen } from './ui/Forge'
import { FacilitiesScreen } from './ui/Facilities'
import { StarLotteryScreen } from './ui/StarLottery'
import { BirthScene, CeremonyScene, DeathScene, DreamScene, DreamEpScene, EndingScene, FinaleScene, JobRiteScene, LifeScene } from './ui/Scenes'
import { SettingsModal } from './ui/Settings'
import { setToastSink, emitToast, type ToastKind } from './ui/toast'
import { setSaveTroubleSink, onExternalSaveChange } from './core/save'

// M33: Village/Dungeon は PixiJS(+各engine/renderの重い依存)を引き込む2画面。遅延読込にして
// Title起動時の初回ダウンロード(単一巨大chunk 約1.78MB)から外す。郷/夜藪へ入るまでpixiはロードされない。
const VillageScreen = lazy(() => import('./ui/Village').then((m) => ({ default: m.VillageScreen })))
const DungeonScreen = lazy(() => import('./ui/Dungeon').then((m) => ({ default: m.DungeonScreen })))

// 全画面共通の設定ボタン(⚙)。音量/ミュート/演出軽減/オート既定へアクセス。
function SettingsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="mute-btn" title="設定" aria-label="設定" onClick={() => setOpen(true)}>⚙</button>
      {open && <SettingsModal onClose={() => setOpen(false)} />}
    </>
  )
}

// トースト表示器 — emitToast()で飛んできた通知を数秒だけ積んで見せる
let toastSeq = 1
function Toaster() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: ToastKind }[]>([])
  const dismissToast = (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id))
  useEffect(() => {
    setToastSink((msg, kind) => {
      const id = toastSeq++
      setToasts((t) => [...t, { id, msg, kind }].slice(-4))
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
    })
    // M19 C3: セーブ層のトラブル通知(quota/破損復旧)をtoastへ配線(core→ui依存を作らずsink経由)
    setSaveTroubleSink((msg) => emitToast(msg, 'error'))
    return () => { setToastSink(null); setSaveTroubleSink(null) }
  }, [])
  if (toasts.length === 0) return null
  return (
    <div className="toast-stack" aria-label="通知">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.kind}`}
          role={t.kind === 'error' ? 'alert' : 'status'}
          aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
        >
          <span className="toast-message">{t.msg}</span>
          <button
            type="button"
            className="toast-dismiss"
            aria-label={`通知「${t.msg}」を閉じる`}
            onClick={() => dismissToast(t.id)}
          >
            閉じる
          </button>
        </div>
      ))}
    </div>
  )
}

// M33: 複数タブ競合バナー。別タブがこの記を更新すると、こちらは保存停止(read-only)になる。
// 3秒で消えるトーストでは見落とすため、常設バナーで「保存停止」と再読み込み導線を明示する。
function ConflictBanner() {
  const [conflict, setConflict] = useState(false)
  useEffect(() => onExternalSaveChange(() => setConflict(true)), [])
  if (!conflict) return null
  return (
    <div
      role="alert"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '12px', flexWrap: 'wrap', padding: '10px 16px',
        background: 'rgba(120, 20, 20, 0.96)', color: '#ffeede',
        borderBottom: '1px solid var(--flame, #ff7a46)', fontSize: '13px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.5)',
      }}
    >
      <span>別のタブでこの記が進んだため、競合を避けてこのタブは保存を止めました。</span>
      <button className="btn btn-main" onClick={() => window.location.reload()}>最新へ再読み込み</button>
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
  const battle = useGame((s) => s.battle)
  const battleAutoContext = useGame((s) => s.battleAutoContext)
  const data = useGame((s) => s.data)

  useCollectionToasts(data)

  // M43: SPAの画面遷移でも、文書を開き直した時と同じ読み始めを保証する。
  // 前画面の深いscroll位置やbutton focusを新画面へ持ち越さない。
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('h1')
      if (!heading) return
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [screen.id])

  useEffect(() => {
    const node = battleNodeId ? data?.expedition?.nodes[battleNodeId] : undefined
    const track = resolveTrack(screen.id, {
      boss: battleAutoContext?.boss ?? node?.type === 'boss',
      rare: battleAutoContext?.rare,
    })
    audio.setLineage(data?.family[0]?.id)
    audio.play(track)
  }, [screen.id, battleNodeId, battleAutoContext?.boss, battleAutoContext?.rare, data?.expedition?.nodes, data?.family])

  // 戦況の意味を音へ返す。全戦闘オート・戦闘計算・RNGには触れない表示層の一方向接続。
  useEffect(() => {
    if (screen.id !== 'battle' || !battle) {
      audio.setTension(screen.id === 'dungeon' || screen.id === 'expedition' ? 0.18 : 0)
      return
    }
    const ratio = (members: typeof battle.allies): number => {
      const max = members.reduce((sum, member) => sum + Math.max(1, member.maxHp), 0)
      return max > 0 ? members.reduce((sum, member) => sum + Math.max(0, member.hp), 0) / max : 0
    }
    audio.setTension(computeBattleTension({
      partyHpRatio: ratio(battle.allies),
      enemyHpRatio: ratio(battle.enemies),
      boss: battleAutoContext?.boss,
      rare: battleAutoContext?.rare,
      phase: battle.phase,
    }))
  }, [screen.id, battle, battleAutoContext?.boss, battleAutoContext?.rare])

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
      case 'starLottery':
        return <StarLotteryScreen />
      case 'village':
        return <VillageScreen />
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
        return <CodexScreen initialTab={screen.tab} />
      case 'forge':
        return <ForgeScreen initialTab={screen.tab} />
      case 'facilities':
        return <FacilitiesScreen />
      case 'finale':
        return <FinaleScene />
      case 'birth':
        return <BirthScene charId={screen.charId} />
      case 'ceremony':
        return <CeremonyScene charId={screen.charId} />
      case 'jobrite':
        return <JobRiteScene charId={screen.charId} />
      case 'life':
        return <LifeScene title={screen.title} lines={screen.lines} bg={screen.bg} narrativeId={screen.narrativeId} />
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
      {/* M33: 遅延読込のVillage/Dungeonがchunkロード中のみfallback。他画面は即描画(suspendしない)。
          暗い下地でロード状態のちらつきを最小化(playwrightはcanvas可視待ちなので撮影には映らない)。 */}
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#0a0705' }} />}>
        {view}
      </Suspense>
      <SettingsButton />
      <Toaster />
      <ConflictBanner />
    </>
  )
}

export default App
