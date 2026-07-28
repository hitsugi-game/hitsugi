import { useEffect, useState, lazy, Suspense, type ReactNode } from 'react'
import { useGame } from './core/store'
import { audio } from './core/audio'
import { computeBattleTension, resolveTrack } from './core/audio_model'
import { TitleScreen, IntroScreen } from './ui/Title'
import { SettingsModal } from './ui/Settings'
import { setToastSink, emitToast, type ToastKind } from './ui/toast'
import { setSaveTroubleSink, onExternalSaveChange } from './core/save'

// M60: Title/Intro以外は画面単位で遅延読込する。Pixiだけでなく、未訪問の作業面・物語面の
// CSS/描画コードも最初の一頁へ混ぜず、実際に向かう画面だけを取得する。
const HomeScreen = lazy(() => import('./ui/Home').then((m) => ({ default: m.HomeScreen })))
const PactScreen = lazy(() => import('./ui/Pact').then((m) => ({ default: m.PactScreen })))
const DepartScreen = lazy(() => import('./ui/Expedition').then((m) => ({ default: m.DepartScreen })))
const ExpeditionScreen = lazy(() => import('./ui/Expedition').then((m) => ({ default: m.ExpeditionScreen })))
const BattleScreen = lazy(() => import('./ui/Battle').then((m) => ({ default: m.BattleScreen })))
const ChronicleScreen = lazy(() => import('./ui/Chronicle').then((m) => ({ default: m.ChronicleScreen })))
const CodexScreen = lazy(() => import('./ui/Codex').then((m) => ({ default: m.CodexScreen })))
const ForgeScreen = lazy(() => import('./ui/Forge').then((m) => ({ default: m.ForgeScreen })))
const FacilitiesScreen = lazy(() => import('./ui/Facilities').then((m) => ({ default: m.FacilitiesScreen })))
const StarLotteryScreen = lazy(() => import('./ui/StarLottery').then((m) => ({ default: m.StarLotteryScreen })))
const BirthScene = lazy(() => import('./ui/Scenes').then((m) => ({ default: m.BirthScene })))
const CeremonyScene = lazy(() => import('./ui/Scenes').then((m) => ({ default: m.CeremonyScene })))
const DeathScene = lazy(() => import('./ui/Scenes').then((m) => ({ default: m.DeathScene })))
const DreamScene = lazy(() => import('./ui/Scenes').then((m) => ({ default: m.DreamScene })))
const DreamEpScene = lazy(() => import('./ui/Scenes').then((m) => ({ default: m.DreamEpScene })))
const EndingScene = lazy(() => import('./ui/Scenes').then((m) => ({ default: m.EndingScene })))
const FinaleScene = lazy(() => import('./ui/Scenes').then((m) => ({ default: m.FinaleScene })))
const JobRiteScene = lazy(() => import('./ui/Scenes').then((m) => ({ default: m.JobRiteScene })))
const LifeScene = lazy(() => import('./ui/Scenes').then((m) => ({ default: m.LifeScene })))
const VillageScreen = lazy(() => import('./ui/Village').then((m) => ({ default: m.VillageScreen })))
const DungeonScreen = lazy(() => import('./ui/Dungeon').then((m) => ({ default: m.DungeonScreen })))

const SCREEN_LOADING_LABEL: Record<string, string> = {
  home: '燈守家の記', pact: '星契り', starLottery: '星籤', village: '燈ノ郷',
  depart: '出立の絵巻', expedition: '夜藪の道', dungeon: '探索', battle: '戦支度',
  chronicle: '一族の記', codex: '図鑑', forge: '鍛冶と蔵', facilities: '郷の普請',
  birth: '命の頁', ceremony: '成人の儀', jobrite: '生業の儀', life: '一族の物語',
  death: '別れの頁', dream: '夢の頁', dreamEp: '夢の頁', ending: '結末', finale: '最後の問い',
}

function LoadingPassage({ screenId }: { screenId: string }) {
  const label = SCREEN_LOADING_LABEL[screenId] ?? '次の頁'
  return (
    <div className="route-loading" role="status" aria-live="polite" aria-label={`${label}を読み込んでいます`}>
      <span className="route-loading-mark" aria-hidden>灯</span>
      <p>{label}を開いている</p>
      <div className="route-loading-progress" aria-hidden><i /></div>
      <small>回線が途切れた時は、復旧頁から再読込とセーブ書出しができる。</small>
      <button className="btn btn-ghost" type="button" onClick={() => window.location.reload()}>読み込み直す</button>
    </div>
  )
}

function RouteFocus({ screenId, children }: { screenId: string; children: ReactNode }) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('h1')
      if (!heading) return
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [screenId])
  return children
}

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

function GameRuntime() {
  const screen = useGame((s) => s.screen)
  const battleNodeId = useGame((s) => s.battleNodeId)
  const battle = useGame((s) => s.battle)
  const battleAutoContext = useGame((s) => s.battleAutoContext)
  const dungeonRun = useGame((s) => s.dungeonRun)
  const data = useGame((s) => s.data)
  const setScreen = useGame((s) => s.setScreen)
  const founderId = data?.family[0]?.id
  const currentGeneration = data?.family.find((character) => character.isHead && character.alive)?.gen
    ?? data?.family.find((character) => character.alive)?.gen
    ?? 1
  const activeRegionId = ['depart', 'expedition', 'dungeon', 'battle'].includes(screen.id)
    ? (dungeonRun?.regionId ?? data?.dungeonRun?.regionId ?? data?.expedition?.regionId)
    : undefined

  useCollectionToasts(data)

  // 次の一手が一意な時だけ先読みする。探索中の次画面は戦闘であり、敵影へ触れた後に
  // 大きな戦支度chunkを待たせない。Title/Homeから無関係な全routeを先読みしない。
  useEffect(() => {
    if (screen.id !== 'dungeon') return
    void import('./ui/Battle')
  }, [screen.id])

  useEffect(() => {
    const node = battleNodeId ? data?.expedition?.nodes[battleNodeId] : undefined
    const track = resolveTrack(screen.id, {
      boss: battleAutoContext?.boss ?? node?.type === 'boss',
      rare: battleAutoContext?.rare,
    })
    audio.setSceneContext({
      screenId: screen.id,
      regionId: activeRegionId,
      seasonIndex: data?.seasonIndex,
      generation: currentGeneration,
      narrativeStage: data?.narrative?.stage,
    })
    audio.setLineage(founderId, currentGeneration)
    audio.play(track)
  }, [screen.id, battleNodeId, battleAutoContext?.boss, battleAutoContext?.rare, data?.expedition?.nodes, data?.seasonIndex, data?.narrative?.stage, activeRegionId, currentGeneration, founderId])

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
        return <IntroScreen onFinish={() => setScreen({ id: 'home' })} />
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
      <Suspense fallback={<LoadingPassage screenId={screen.id} />}>
        <RouteFocus screenId={screen.id}>{view}</RouteFocus>
      </Suspense>
      <SettingsButton />
      <Toaster />
      <ConflictBanner />
    </>
  )
}

export default GameRuntime
