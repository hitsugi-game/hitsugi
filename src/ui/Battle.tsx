// 戦闘画面(品質刷新v3.1 M8) — 俺屍様式の側面視ステージ
// 敵は左に雁行、味方は右に雁行(歩行スプライト流用)。演出はBattleLogEntryのメタデータ駆動:
// 踏み込み→被弾フラッシュ→ダメージ数字ポップ→KO溶暗。属性別バースト、行動者の題字タグ、
// 戦利品スロット(M12-5)、台詞チャネル(M15-1土台: kind:'voice')を備える。
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useGame, type BattleRewardSettlement } from '../core/store'
import type { BattleLogEntry, BattleState, Character, Combatant, Element, EnemyIntent, Item, SkillTarget } from '../core/types'
import { ELEMENT_LABELS, ELEMENT_ADVANTAGE, STAT_LABELS } from '../core/types'
import { currentActor, type BattleAction } from '../core/battle'
import { upcomingEnemyBehaviorCue, type EnemyBehaviorCue } from '../core/enemy_behaviors'

// 相性: 攻がADVANTAGEで防を突けば有利、逆なら不利
type Matchup = 'adv' | 'dis' | 'even'
function matchup(atk: Element | undefined, def: Element): Matchup {
  if (!atk) return 'even'
  if (ELEMENT_ADVANTAGE[atk] === def) return 'adv'
  if (ELEMENT_ADVANTAGE[def] === atk) return 'dis'
  return 'even'
}
import { audio } from '../core/audio'
import {
  getAutoBattleDefault, getAutoPolicySettings, setAutoPolicySettings,
  type AutoBattlePolicy,
} from '../core/settings'
import { chooseAutoAction } from '../core/auto_battle'
import { skillById } from '../core/data/skills'
import { consumableById } from '../core/data/consumables'
import { enemyById } from '../core/data/enemies'
import { regionById } from '../core/data/regions'
import { resolveRegionStageContract, type RegionStageContract } from '../core/data/region_stage_contracts'
import { loreFor } from '../core/data/lore'
import { bossEmotion } from '../core/narrative'
import { Bar, MaybeImg, Portrait } from './components'
import { gameImg, spriteImg, poseImg, skillIcon, cutinImg, regionBgR, bossBgImg } from './img'
import { BattleArtFrame, type CardTier } from './battle/BattleArtFrame'
import './m17_battle.css'
import './battle_m24.css'
import './battle_m25.css'
import './battle_ar1.css'
import './battle_m43.css'
import './battle_m46.css'
import './battle_m47.css'

function Ar1BattleStage({ contract }: { contract: RegionStageContract }) {
  return (
    <div
      className="ar1-battle-stage"
      data-stage-contract-id={contract.id}
      data-ground-materials={contract.groundMaterials.join(',')}
      data-navigation-cue={contract.navigationCue.id}
      data-danger-cue={contract.dangerCue.id}
      data-scene-layering="battle-first"
    >
      <div className="ar1-stage-environment" aria-hidden="true">
        <div
          className="ar1-stage-region-art"
          style={{ backgroundImage: `url(${regionBgR(contract.regionId)})` }}
        />
        <div className="ar1-stage-night" />
        <div className="ar1-stage-mist">
          {Array.from({ length: contract.ambientMotion.mistPool }, (_, i) => <i key={i} />)}
        </div>
        <div className="ar1-stage-rings">
          {Array.from({ length: contract.ambientMotion.ringPool }, (_, i) => <i key={i} />)}
        </div>
        <div className="ar1-stage-embers">
          {Array.from({ length: contract.ambientMotion.emberPool }, (_, i) => <i key={i} />)}
        </div>
      </div>
      <div className="ar1-stage-identity" role="status" aria-label={`${contract.name}。${contract.navigationCue.label}。危険の兆し: ${contract.dangerCue.label}`}>
        <span>現在地</span><strong>{contract.name}</strong><small>濡土と浅水 ・ {contract.landmark.label}</small>
      </div>
    </div>
  )
}

type TargetMenu =
  | { kind: 'target'; skillId?: string; itemId?: string; side: 'enemy' | 'ally' }

type ConfirmMenu = {
  kind: 'confirm'
  source: TargetMenu
  action: BattleAction
  actionName: string
  targetKey: string
}

type Menu =
  | { kind: 'root' }
  | { kind: 'skill' }
  | { kind: 'item' } // M28-C: 道具(回復薬)一覧
  | TargetMenu
  | ConfirmMenu

// AR0: 対象札の操作は「選択」だけに限定し、ここでは戦闘コマンドを発火しない。
// 通常攻撃/単体技/単体道具は必ず確認盤を経由してから実行する。
function targetConfirmation(source: TargetMenu, targetKey: string): ConfirmMenu {
  if (source.itemId) {
    return {
      kind: 'confirm', source, targetKey,
      actionName: consumableById(source.itemId)?.name ?? '道具',
      action: { type: 'item', itemId: source.itemId, targetKey },
    }
  }
  if (source.skillId) {
    return {
      kind: 'confirm', source, targetKey,
      actionName: skillById(source.skillId).name,
      action: { type: 'skill', skillId: source.skillId, targetKey },
    }
  }
  return {
    kind: 'confirm', source, targetKey,
    actionName: '攻撃',
    action: { type: 'attack', targetKey },
  }
}

interface FxEvent {
  id: number
  kind: 'lunge' | 'hit' | 'heal' | 'ko' | 'guard'
  amount?: number
  crit?: boolean
  weak?: boolean
  element?: string
  voice?: string
}

// 灯脈(§3.3/M25§4.3) — 行動者→対象の足元を結ぶ一時的な線。座標は.stage-battlersに対する%(0-100)。
// actorKey/targetKeyはaction layerの暗転対象判定(§4.3手順1)にも流用し、追加のrect取得を発生させない。
interface VeinEvent {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  kind: 'atk' | 'heal'
  pulse: boolean // 連撃中は脈動(devil S7: 接触点アニメ自体は既存lungeを維持し、灯脈のみ新規)
  actorKey: string
  targetKey: string
}

let fxSeq = 1

// 継足の次撃倍率。行動順bar横の常設表示と中央chain-veinの両方から参照する共通式
function chainMultiplier(chain: number): number {
  return 1 + Math.min(chain + 1, 4) * 0.15
}

// M25§4.4: 「攻撃/技名 → 対象名」表示ラベルの組み立て(表示専用・戦闘計算には触れない)
function actionLabel(battle: BattleState, actionName: string, targetKey?: string): string {
  if (!targetKey) return actionName
  const t = battle.allies.find((c) => c.key === targetKey) ?? battle.enemies.find((c) => c.key === targetKey)
  return t ? `${actionName} → ${t.name}` : actionName
}

// M25§4.3 手順5: 灯脈の走行(既存veinDraw/actionSparkTravelのCSS時間と揃える)+55〜75msのhit-stop。
// M32: オート中、味方のHPがこの割合を下回ったら回復薬を優先使用する(理不尽死の防止)
const AUTO_POLICY_LABEL: Record<AutoBattlePolicy, string> = { steady: '堅実', economy: '温存', allOut: '全力' }
const AUTO_POLICIES = Object.keys(AUTO_POLICY_LABEL) as AutoBattlePolicy[]
const VEIN_TRAVEL_MS = 150
const HITSTOP_MS = 65
const ACTION_LAYER_MS = VEIN_TRAVEL_MS + HITSTOP_MS

// M34 N2: 戦果欄は報酬を押し下げず、通常の勝鬨一行を地域固有の鎮魂へ差し替える。
// oxlint-disable-next-line react/only-export-components -- 同画面の表示契約を単体検証するため公開する。
export function bossVictoryRequiem(regionId: string): string | null {
  return loreFor(regionId)?.requiem[0] ?? null
}

// M25§4.2 スロット配置 — 1体/2体/3〜4体を別presetにし、単純なtranslateXの連鎖で並べない。
// 列/行そのものはCSS側(.slot-preset-*、断幅で差し替わるgrid-template-columns)に委ね、
// JSXはCSSの`order`とz-indexだけを渡す(inlineでgrid-column/rowを固定すると768px境界の
// メディアクエリで上書きできなくなるため、決定論的な「役割(前列/後列)」のみをJSから渡す)。
type Role = 'front' | 'back'
function slotPresetOf(count: number): '1' | '2' | '34' {
  if (count <= 1) return '1'
  if (count === 2) return '2'
  return '34'
}
// 3〜4体時のみ偶数index=前列/奇数index=後列(決定論的・乱数不使用)。1〜2体は単一列なので常に前列。
function roleOf(index: number, count: number): Role {
  if (count <= 2) return 'front'
  return index % 2 === 0 ? 'front' : 'back'
}

export function BattleScreen() {
  const battle = useGame((s) => s.battle)
  const queue = useGame((s) => s.battleLogQueue)
  const drainBattleLog = useGame((s) => s.drainBattleLog)
  const battleCommand = useGame((s) => s.battleCommand)
  const refreshBattleIntents = useGame((s) => s.refreshBattleIntents)
  const finishBattle = useGame((s) => s.finishBattle)
  const rewardSettlement = useGame((s) => s.battleRewardSettlement)
  const settleBattleVictory = useGame((s) => s.settleBattleVictory)
  const settleBattleDefeat = useGame((s) => s.settleBattleDefeat)
  const continueAfterBattle = useGame((s) => s.continueAfterBattle)
  const dungeonRun = useGame((s) => s.dungeonRun)
  const goldenBattle = useGame((s) => s.goldenBattle)
  const rareEncounter = useGame((s) => s.rareEncounter)
  const battleAutoContext = useGame((s) => s.battleAutoContext)
  const regionId = dungeonRun?.regionId
  const runLoot = dungeonRun?.loot
  // 遠征でオートを一度も触っていなければ、設定の「オート既定」を初期値にする
  const initialAuto = useGame((s) => s.dungeonRun?.autoBattle ?? getAutoBattleDefault())
  const setAutoBattleFlag = useGame((s) => s.setAutoBattle)
  const family = useGame((s) => s.data?.family) ?? []
  const seasonIndex = useGame((s) => s.data?.seasonIndex) ?? 0
  const loreFrags = useGame((s) => s.data?.loreFrags)
  const consumables = useGame((s) => s.data?.consumables) // M28-C: 所持している回復薬など

  const [displayed, setDisplayed] = useState<BattleLogEntry[]>([])
  const [pending, setPending] = useState<BattleLogEntry[]>([])
  const [menu, setMenu] = useState<Menu>({ kind: 'root' })
  const [showFullLog, setShowFullLog] = useState(false)
  const [shakeKey, setShakeKey] = useState(0) // ヒット時のstage-shake発火用
  const shakeTimerRef = useRef<number | null>(null)
  const [auto, setAutoRaw] = useState(initialAuto)
  const [autoSettings, setAutoSettings] = useState(getAutoPolicySettings)
  const [autoStopReason, setAutoStopReason] = useState<string | null>(null)
  const consumedStopsRef = useRef(new Set<string>())
  const autoUsedRef = useRef(false)
  const autoUseCountsRef = useRef(new Map<string, number>())
  const autoPolicyUsedRef = useRef<AutoBattlePolicy>(autoSettings.policy)
  // オート状態は遠征越しに継続 — 変更したら遠征ランへも書き戻す
  const setAuto = useCallback((next: boolean) => {
    setAutoRaw(next)
    setAutoBattleFlag(next)
  }, [setAutoBattleFlag])
  const changeAutoPolicy = (policy: AutoBattlePolicy) => {
    const next = { ...autoSettings, policy }
    setAutoSettings(next)
    setAutoPolicySettings(next)
  }
  const moveAutoPolicy = (event: ReactKeyboardEvent<HTMLButtonElement>, policy: AutoBattlePolicy) => {
    const current = AUTO_POLICIES.indexOf(policy)
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? AUTO_POLICIES.length - 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (current - 1 + AUTO_POLICIES.length) % AUTO_POLICIES.length
          : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (current + 1) % AUTO_POLICIES.length
            : -1
    if (nextIndex < 0) return
    event.preventDefault()
    changeAutoPolicy(AUTO_POLICIES[nextIndex])
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    buttons?.[nextIndex]?.focus()
  }
  const [fx, setFx] = useState<Record<string, FxEvent[]>>({})
  const [bossShown, setBossShown] = useState(false)
  const [bossCutinUrl, setBossCutinUrl] = useState<string | null>(null)
  const [ougiCutinUrl, setOugiCutinUrl] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  // M24: コマンド盤右側「選択中の技」プレビュー(技一覧のhover/focusで更新)
  const [previewSkillId, setPreviewSkillId] = useState<string | null>(null)
  // M24: 灯脈(行動者→対象の足元を結ぶ一時的な線)の表示キュー
  const [veins, setVeins] = useState<VeinEvent[]>([])
  // M25§4.4: 味方行動処理中/敵行動中/勝敗遷移中を空箱にしないための表示ラベル
  const [pendingActionLabel, setPendingActionLabel] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const bodyRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  // AR0: 対象選択→確認→実行のフォーカス経路。対象札と実行釦へ明示的に移し、
  // Escで一段戻った時は選択札、二段戻った時は起点コマンドへ復元する。
  const combatantRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const attackButtonRef = useRef<HTMLButtonElement>(null)
  const skillButtonRef = useRef<HTMLButtonElement>(null)
  const itemButtonRef = useRef<HTMLButtonElement>(null)
  const menuOriginRef = useRef<'attack' | 'skill' | 'item' | null>(null)
  const lastTargetKeyRef = useRef<string | null>(null)

  const stageFamily = (() => {
    if (!regionId) return 'forest'
    const bg = regionById(regionId).bg
    if (bg.includes('zaka')) return 'zaka'
    if (bg.includes('tani')) return 'tani'
    if (bg.includes('miyama')) return 'miyama'
    return 'forest'
  })()

  const bossCombatant = battle?.enemies.find((e) => e.enemyId?.startsWith('boss_'))
  const isBossBattle = !!bossCombatant
  const bossName = bossCombatant?.name
  const isBossVictory = isBossBattle && battle?.phase === 'won'
  const bossMotive = isBossBattle && regionId
    ? bossEmotion(regionById(regionId).name, loreFrags?.[regionId] ?? 0)
    : null
  const bossRequiem = isBossVictory && regionId ? bossVictoryRequiem(regionId) : null
  const stageContract = dungeonRun
    ? resolveRegionStageContract({
        regionId: dungeonRun.regionId,
        floor: dungeonRun.floor,
        visualVersion: dungeonRun.visualVersion ?? 'v1',
        stageContractId: dungeonRun.stageContractId,
      })
    : null
  const ar1Hero = stageContract
    ? isBossBattle
      ? 'boss'
      : goldenBattle && rareEncounter
        ? 'rare'
        : null
    : null

  // M17: 地域別の戦場背景。主戦は専用主背景→地域別背景→従来のtier共有bg、の3層。
  // 手前の層が未生成(404)でも下の層がそのまま見えるので退避は自然に成立する。
  const stageBgLayers = !stageContract && regionId
    ? [
        ...(isBossBattle ? [bossBgImg(regionId)] : []),
        regionBgR(regionId),
        gameImg(regionById(regionId).bg),
      ]
    : []
  const stageBgCss = stageBgLayers.length > 0 ? stageBgLayers.map((u) => `url(${u})`).join(', ') : undefined

  // 灯脈(§3.3/M25§4.3) — 行動者/対象のcombatant-body(=戦絵札)位置から.stage-battlers相対%を求めて
  // 一時表示する。ACTION_LAYER_MS(灯脈の走行150ms+hit-stop65ms)後に消す。reduced-motionは既存の
  // 全体!important規則+battle_m24.cssの明示ルールにより線が静止フレームのまま残るため、情報は保たれる。
  const spawnVein = (actorKey: string | undefined, targetKey: string | undefined, kind: VeinEvent['kind']) => {
    if (!actorKey || !targetKey) return
    const stageEl = stageRef.current
    const aEl = bodyRefs.current.get(actorKey)
    const tEl = bodyRefs.current.get(targetKey)
    if (!stageEl || !aEl || !tEl) return
    const sRect = stageEl.getBoundingClientRect()
    if (sRect.width === 0 || sRect.height === 0) return
    const footPoint = (el: HTMLDivElement) => {
      const r = el.getBoundingClientRect()
      return {
        x: ((r.left + r.width / 2 - sRect.left) / sRect.width) * 100,
        y: ((r.bottom - sRect.top) / sRect.height) * 100,
      }
    }
    const a = footPoint(aEl)
    const t = footPoint(tEl)
    const id = fxSeq++
    const pulse = kind === 'atk' && (battle?.chain ?? 0) > 0
    setVeins((old) => [...old, { id, x1: a.x, y1: a.y, x2: t.x, y2: t.y, kind, pulse, actorKey, targetKey }])
    window.setTimeout(() => setVeins((old) => old.filter((v) => v.id !== id)), ACTION_LAYER_MS)
  }

  // 演出キューへ変換
  const applyFx = (entry: BattleLogEntry) => {
    const events: [string, FxEvent][] = []
    const mk = (kind: FxEvent['kind'], extra?: Partial<FxEvent>): FxEvent => ({ id: fxSeq++, kind, ...extra })
    if (entry.kind === 'dmg') {
      if (entry.actorKey) events.push([entry.actorKey, mk('lunge')])
      if (entry.targetKey)
        events.push([entry.targetKey, mk('hit', { amount: entry.amount, crit: entry.crit, weak: entry.weak, element: entry.element })])
      spawnVein(entry.actorKey, entry.targetKey, 'atk')
      // ヒットで戦場全体を一瞬揺らす(critはより強く)。連続hitでも次のkey変化でリスタート。
      setShakeKey((k) => k + 1)
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current)
      shakeTimerRef.current = window.setTimeout(() => setShakeKey(0), 260)
    } else if (entry.kind === 'heal') {
      if (entry.actorKey) events.push([entry.actorKey, mk('lunge')])
      if (entry.targetKey) events.push([entry.targetKey, mk('heal', { amount: entry.amount, element: entry.element })])
      spawnVein(entry.actorKey, entry.targetKey, 'heal')
    } else if (entry.kind === 'ko' && entry.targetKey) {
      events.push([entry.targetKey, mk('ko')])
    } else if (entry.kind === 'voice' && entry.actorKey) {
      events.push([entry.actorKey, mk('guard', { voice: entry.text })])
    } else if (entry.kind === 'info' && entry.actorKey) {
      events.push([entry.actorKey, mk('guard')])
    }
    if (events.length === 0) return
    setFx((old) => {
      const next = { ...old }
      for (const [key, ev] of events) next[key] = [...(next[key] ?? []), ev]
      return next
    })
    // 自動掃除
    setTimeout(() => {
      setFx((old) => {
        const next: Record<string, FxEvent[]> = {}
        for (const [k, evs] of Object.entries(old)) {
          const keep = evs.filter((e) => !events.some(([, ev]) => ev.id === e.id))
          if (keep.length > 0) next[k] = keep
        }
        return next
      })
    }, 900)
  }

  // 新しいログをリビール待ちへ
  useEffect(() => {
    if (queue.length > 0) {
      const q = drainBattleLog()
      setPending((p) => [...p, ...q])
    }
  }, [queue, drainBattleLog])

  // 1件ずつ表示(戦闘のテンポ)— オート中は倍速
  useEffect(() => {
    if (pending.length === 0) return
    const t = setTimeout(() => {
      const entry = pending[0]
      const seMap: Partial<Record<BattleLogEntry['kind'], Parameters<typeof audio.se>[0]>> = {
        dmg: 'hit', heal: 'heal', ko: 'ko', chain: 'chain', win: 'win', lose: 'death',
      }
      // ダメージは会心/弱点で打撃音を差別化(手応え)
      const se = entry.kind === 'dmg'
        ? (entry.crit ? 'critHit' : entry.weak ? 'weakHit' : 'hit')
        : seMap[entry.kind]
      if (se) audio.se(se)
      applyFx(entry)
      setDisplayed((d) => [...d, entry])
      setPending((p) => p.slice(1))
    }, auto ? 230 : 420)
    return () => clearTimeout(t)
    // applyFxは毎render再生成される表示専用ヘルパー(灯脈/fxの発火)。依存に含めると
    // 1件ずつ出す間合いが壊れるため、pending/autoの変化時のみ再発火する既存設計を維持する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, auto])

  useEffect(() => {
    logRef.current?.scrollTo({ top: 99999, behavior: 'smooth' })
  }, [displayed])

  // M25 §5: 戦闘開始直後の入力番に敵の兆しを先読み設定(以後はbattleCommand側で更新)
  useEffect(() => {
    if (battle?.phase === 'input' && !battle.intents) refreshBattleIntents()
  }, [battle?.phase, battle?.intents, refreshBattleIntents])

  // ボス題字と戦利品スロットの寿命
  useEffect(() => {
    if (isBossBattle) {
      setBossShown(true)
      const t = setTimeout(() => setBossShown(false), 2000)
      return () => clearTimeout(t)
    }
  }, [isBossBattle])

  // M17: ボス登場カットイン — 絵が実在する時だけ静かに差し込む(無ければ何も出さない)
  useEffect(() => {
    if (!isBossBattle) return
    const bossId = bossCombatant?.enemyId
    if (!bossId) return
    const url = cutinImg(bossId)
    const img = new Image()
    let cancelled = false
    img.onload = () => {
      if (cancelled) return
      setBossCutinUrl(url)
      setTimeout(() => setBossCutinUrl(null), 1600)
    }
    img.src = url
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBossBattle])
  // AR0: 数字/Enter/Space/タップは対象の「選択」まで。戦闘コマンドの実行は確認盤の
  // 明示ボタンだけに限定する。Escは 確認→対象選択→起点コマンド の二段戻り。
  useEffect(() => {
    if (!battle) return
    if (menu.kind !== 'target' && menu.kind !== 'confirm' && menu.kind !== 'skill' && menu.kind !== 'item') return
    const pool = menu.kind === 'target'
      ? (menu.side === 'enemy' ? battle.enemies : battle.allies).filter((c) => c.hp > 0)
      : []
    const onKey = (ev: KeyboardEvent) => {
      // オート停止は auto 依存の別effectが担当(M29修正)。
      if (ev.key === 'Escape') {
        ev.preventDefault()
        if (menu.kind === 'confirm') {
          lastTargetKeyRef.current = menu.targetKey
          setMenu(menu.source)
        } else {
          setMenu({ kind: 'root' })
          window.setTimeout(() => {
            const origin = menuOriginRef.current === 'attack'
              ? attackButtonRef.current
              : menuOriginRef.current === 'skill'
                ? skillButtonRef.current
                : menuOriginRef.current === 'item'
                  ? itemButtonRef.current
                  : null
            origin?.focus()
          }, 0)
        }
        return
      }
      if (menu.kind !== 'target') return
      const n = Number(ev.key)
      if (!Number.isInteger(n) || n < 1 || n > pool.length) return
      ev.preventDefault()
      const target = pool[n - 1]
      // 回復対象は既存の高速操作を維持。AR0の誤発火防止対象は敵札から発火する攻撃経路。
      if (menu.side === 'ally') {
        const actionName = menu.itemId
          ? consumableById(menu.itemId)?.name ?? '道具'
          : menu.skillId ? skillById(menu.skillId).name : '支援'
        setPendingActionLabel(actionLabel(battle, actionName, target.key))
        battleCommand(
          menu.itemId
            ? { type: 'item', itemId: menu.itemId, targetKey: target.key }
            : { type: 'skill', skillId: menu.skillId!, targetKey: target.key },
        )
        setMenu({ kind: 'root' })
        return
      }
      lastTargetKeyRef.current = target.key
      setMenu(targetConfirmation(menu, target.key))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // autoはautoRefで読むため依存不要(dep churnを避ける)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle, menu, battleCommand])

  useEffect(() => {
    if (menu.kind === 'confirm') {
      window.requestAnimationFrame(() => confirmButtonRef.current?.focus())
      return
    }
    if (menu.kind !== 'target' || !battle) return
    const pool = (menu.side === 'enemy' ? battle.enemies : battle.allies).filter((c) => c.hp > 0)
    const key = lastTargetKeyRef.current && pool.some((c) => c.key === lastTargetKeyRef.current)
      ? lastTargetKeyRef.current
      : pool[0]?.key
    window.requestAnimationFrame(() => {
      if (key) combatantRefs.current.get(key)?.focus()
    })
  }, [battle, menu])

  const revealing = pending.length > 0
  const actor = battle ? currentActor(battle) : undefined
  const isPlayerTurn = !!battle && battle.phase === 'input' && !!actor?.isAlly && !revealing

  // M25§4.4: 自分の入力番になったら前回の行動ラベルを片付ける(次に空箱化するのは味方行動処理中のみ)
  useEffect(() => {
    if (isPlayerTurn) setPendingActionLabel(null)
  }, [isPlayerTurn])

  // M29修正: オート中はメニュー状態(root含む)に関わらずEscで停止できる。以前は対象/技メニュー中しか
  // keydownを購読しておらず、通常のオート(menu='root')ではEscが効かなかった(auto_stop.spec回帰)。
  useEffect(() => {
    if (!auto) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { ev.preventDefault(); setAuto(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])

  // M40: 停止条件は全てopt-in。同じ戦闘・同じ理由では一度だけ止め、再度ONにした操作を尊重する。
  useEffect(() => {
    if (!auto || !battle || !battleAutoContext) return
    const candidates: [string, boolean, string][] = [
      ['rare', autoSettings.stops.rareEnemy && battleAutoContext.rare, '稀相を前にオートを止めた'],
      ['boss', autoSettings.stops.boss && battleAutoContext.boss, 'この地の主を前にオートを止めた'],
      ['new', autoSettings.stops.newDiscovery && battleAutoContext.firstEncounter, '初めての魔性を前にオートを止めた'],
      ['hp', autoSettings.stops.hpDanger && battle.allies.some((ally) => ally.hp > 0 && ally.hp / ally.maxHp < 0.25), '一族の体力が危険なためオートを止めた'],
    ]
    const hit = candidates.find(([key, active]) => active && !consumedStopsRef.current.has(key))
    if (!hit) return
    consumedStopsRef.current.add(hit[0])
    setAuto(false)
    setAutoStopReason(hit[2])
  }, [auto, autoSettings.stops, battle, battleAutoContext, setAuto])

  // オート戦闘
  useEffect(() => {
    if (!auto || !isPlayerTurn || !battle || !actor) return
    const t = setTimeout(() => {
      const choice = chooseAutoAction({
        battle,
        actor,
        policy: autoSettings.policy,
        consumables: useGame.getState().data?.consumables ?? [],
      })
      const usedName = choice.action.type === 'skill' && choice.action.skillId
        ? skillById(choice.action.skillId).name
        : choice.action.type === 'item' && choice.action.itemId
          ? (consumableById(choice.action.itemId)?.name ?? '道具')
          : choice.action.type === 'guard' ? '防御' : '攻撃'
      autoUsedRef.current = true
      autoPolicyUsedRef.current = autoSettings.policy
      autoUseCountsRef.current.set(usedName, (autoUseCountsRef.current.get(usedName) ?? 0) + 1)
      setPendingActionLabel(choice.reason)
      battleCommand(choice.action)
    }, 260)
    return () => clearTimeout(t)
  }, [auto, autoSettings.policy, isPlayerTurn, battle, actor, battleCommand])

  // 勝利報酬は表示と同じplanを一度だけ確定する。結果を描画してから手動/自動の継続へ進む。
  useEffect(() => {
    if (!battle || battle.phase !== 'won' || pending.length > 0) return
    if (rewardSettlement?.status === 'planned') settleBattleVictory()
  }, [battle, pending.length, rewardSettlement?.status, settleBattleVictory])

  // M47: debug hook等でlostへ直接遷移した場合も、敗北画面を残したまま同期精算する。
  // 通常経路はbattleCommand内で先に精算されるため、この呼出しは冪等な保険である。
  useEffect(() => {
    if (!battle || battle.phase !== 'lost' || pending.length > 0) return
    settleBattleDefeat()
  }, [battle, pending.length, settleBattleDefeat])

  // 全戦闘でオートを維持する。確定した戦果を読める時間を置き、手動CTAなら即座に進める。
  useEffect(() => {
    if (!auto || !battle || pending.length > 0) return
    if (battle.phase !== 'won' && battle.phase !== 'fled') return
    if (battle.phase === 'won' && rewardSettlement?.status !== 'settled') return
    const timeout = window.setTimeout(
      () => battle.phase === 'won' ? continueAfterBattle() : finishBattle(),
      autoUsedRef.current ? 2800 : 1200,
    )
    return () => window.clearTimeout(timeout)
  }, [auto, battle, pending.length, rewardSettlement?.status, continueAfterBattle, finishBattle])

  if (!battle) return null

  const over = battle.phase !== 'input' && battle.phase !== 'anim' && !revealing

  const charOf = (c: Combatant) => family.find((f) => f.id === c.charId)
  const autoParty = family.filter((character) => battle.allies.some((ally) => ally.charId === character.id))
  const autoLegacyCount = autoParty.reduce((count, character) => count + Object.values(character.equipment)
    .filter((item) => !!item && (!!item.legacyOf || item.generation > 0)).length, 0)
  const autoTrainingMarks = autoParty.reduce((count, character) => count + Object.values(character.trainingMarks ?? {})
    .reduce((sum, value) => sum + (value ?? 0), 0), 0)
  const autoReport = autoUsedRef.current ? [
    `方針 — ${AUTO_POLICY_LABEL[autoPolicyUsedRef.current]}`,
    autoUseCountsRef.current.size > 0
      ? `使った手 — ${[...autoUseCountsRef.current.entries()].slice(0, 3).map(([name, count]) => `${name}${count > 1 ? `${count}回` : ''}`).join('・')}`
      : null,
    autoLegacyCount + autoTrainingMarks > 0
      ? `一族の支え — ${[autoLegacyCount > 0 ? `形見${autoLegacyCount}点` : '', autoTrainingMarks > 0 ? `鍛錬${autoTrainingMarks}刻` : ''].filter(Boolean).join('・')}`
      : null,
    battleAutoContext?.rare
      ? `新発見 — 稀相・${battleAutoContext.enemyNames[0] ?? '名もなき魔性'}`
      : battleAutoContext?.firstEncounter
        ? `新発見 — ${battleAutoContext.enemyNames.join('・')}`
        : battleAutoContext?.boss
          ? `対峙 — ${battleAutoContext.enemyNames[0] ?? 'この地の主'}`
          : null,
  ].filter((line): line is string => !!line).slice(0, 4) : []

  // M25§4.4: コマンド発火とラベル表示を1箇所へまとめる(味方行動処理中の空箱を防ぐ)
  const runCommand = (action: BattleAction, label: string) => {
    setPendingActionLabel(label)
    battleCommand(action)
  }

  // M17: 灯座奥義カットイン — tz_{gata2}{vein1}o形式の第4技(奥義)判定。
  // Combatant自体は灯型/星脈を持たないため、行動者のCharacterから安価に引く。
  const OUGI_ID_RE = /^tz_[a-z]{2}o$/
  const tryShowOugiCutin = (skillId: string) => {
    if (!OUGI_ID_RE.test(skillId) || !actor) return
    const ch = charOf(actor)
    if (!ch?.tomoshigata) return
    const url = cutinImg(`toza_${ch.tomoshigata}_${ch.element}`)
    const img = new Image()
    img.onload = () => {
      setOugiCutinUrl(url)
      setTimeout(() => setOugiCutinUrl(null), 1400)
    }
    img.src = url
  }

  const onEnemyClick = (e: Combatant) => {
    if (!isPlayerTurn || e.hp <= 0) return
    const source = menu.kind === 'target'
      ? menu
      : menu.kind === 'confirm'
        ? menu.source
        : null
    if (source?.side === 'enemy') {
      lastTargetKeyRef.current = e.key
      setMenu(targetConfirmation(source, e.key))
    }
  }
  // 「攻撃」は対象選択の開始だけを行う。敵札からの即時攻撃経路は持たない。
  const beginAttack = () => {
    if (!isPlayerTurn) return
    menuOriginRef.current = 'attack'
    lastTargetKeyRef.current = battle.chainTarget ?? null
    setMenu({ kind: 'target', side: 'enemy' })
  }
  const onAllyClick = (a: Combatant) => {
    if (!isPlayerTurn || a.hp <= 0) return
    const source = menu.kind === 'target'
      ? menu
      : menu.kind === 'confirm'
        ? menu.source
        : null
    if (source?.side === 'ally') {
      if (source.itemId) {
        const def = consumableById(source.itemId)
        runCommand({ type: 'item', itemId: source.itemId, targetKey: a.key }, actionLabel(battle, def?.name ?? '道具', a.key))
      } else if (source.skillId) {
        tryShowOugiCutin(source.skillId)
        runCommand(
          { type: 'skill', skillId: source.skillId, targetKey: a.key },
          actionLabel(battle, skillById(source.skillId).name, a.key),
        )
      }
      setMenu({ kind: 'root' })
    }
  }
  const castSkill = (skillId: string) => {
    const sk = skillById(skillId)
    if (sk.target === 'enemy') setMenu({ kind: 'target', skillId, side: 'enemy' })
    else if (sk.target === 'ally') setMenu({ kind: 'target', skillId, side: 'ally' })
    else {
      tryShowOugiCutin(skillId)
      runCommand({ type: 'skill', skillId }, sk.name)
      setMenu({ kind: 'root' })
    }
  }
  // M28-C: 所持している回復薬(count>0)を定義と結合。道具コマンドの一覧に使う。
  const availItems = (consumables ?? [])
    .filter((s) => s.count > 0)
    .map((s) => ({ count: s.count, def: consumableById(s.id) }))
    .filter((x): x is { count: number; def: NonNullable<typeof x.def> } => !!x.def)
  // 道具を選ぶ — 全体回復は即発火、単体回復は対象(味方)選択へ。
  // (関数名は use 接頭辞を避ける: React Hook 誤判定のため)
  const pickItem = (itemId: string) => {
    const def = consumableById(itemId)
    if (!def) return
    if (def.effect.scope === 'party') {
      runCommand({ type: 'item', itemId }, def.name)
      setMenu({ kind: 'root' })
    } else {
      setMenu({ kind: 'target', itemId, side: 'ally' })
    }
  }

  const executeConfirmed = () => {
    if (menu.kind !== 'confirm') return
    if (menu.source.skillId) tryShowOugiCutin(menu.source.skillId)
    runCommand(menu.action, actionLabel(battle, menu.actionName, menu.targetKey))
    lastTargetKeyRef.current = null
    setMenu({ kind: 'root' })
  }

  const returnToRoot = () => {
    lastTargetKeyRef.current = null
    setMenu({ kind: 'root' })
    window.setTimeout(() => {
      const origin = menuOriginRef.current === 'attack'
        ? attackButtonRef.current
        : menuOriginRef.current === 'skill'
          ? skillButtonRef.current
          : menuOriginRef.current === 'item'
            ? itemButtonRef.current
            : null
      origin?.focus()
    }, 0)
  }

  // M24: 対象選択中の番号バッジ(1始まり。0=非表示)用に、選択可能な生存者だけの並びを求める
  const activeTargetMenu = menu.kind === 'target' ? menu : menu.kind === 'confirm' ? menu.source : null
  const targetableEnemies = isPlayerTurn && activeTargetMenu?.side === 'enemy'
    ? battle.enemies.filter((c) => c.hp > 0) : []
  const targetableAllies = isPlayerTurn && activeTargetMenu?.side === 'ally'
    ? battle.allies.filter((c) => c.hp > 0) : []
  // M25§4.2: 主(boss)は--szに依存しない専用slotへ。残りの通常敵で1/2/3〜4体のpresetを決める。
  const nonBossEnemies = battle.enemies.filter((e) => !e.enemyId?.startsWith('boss_'))
  const enemyGridPreset = slotPresetOf(nonBossEnemies.length)
  const allyGridPreset = slotPresetOf(battle.allies.length)
  // M24 §3.4: 対象選択中は狙う技自体の属性で相性を示す(未指定時は行動者の属性のまま=既存挙動)
  const previewElement: Element | undefined =
    activeTargetMenu?.skillId ? (skillById(activeTargetMenu.skillId).element ?? actor?.element) : actor?.element
  const registerBodyRef = (key: string, el: HTMLDivElement | null) => {
    if (el) bodyRefs.current.set(key, el)
    else bodyRefs.current.delete(key)
  }
  const registerCombatantRef = (key: string, el: HTMLDivElement | null) => {
    if (el) combatantRefs.current.set(key, el)
    else combatantRefs.current.delete(key)
  }
  const confirmedTarget = menu.kind === 'confirm'
    ? battle.enemies.find((c) => c.key === menu.targetKey) ?? battle.allies.find((c) => c.key === menu.targetKey)
    : undefined
  const confirmedMatchup = menu.kind === 'confirm' && confirmedTarget && !confirmedTarget.isAlly
    ? matchup(previewElement, confirmedTarget.element)
    : null
  const confirmedMultiplier = menu.kind === 'confirm' && battle.chainTarget === menu.targetKey && battle.chain > 0
    ? chainMultiplier(battle.chain)
    : 1
  // M25§4.3 手順1: 行動者/対象「以外」を暗くする。veinsから導出するだけで追加のDOM計測はしない。
  const focusKeys = new Set(veins.flatMap((v) => [v.actorKey, v.targetKey]))
  const isDimmed = (key: string) => focusKeys.size > 0 && !focusKeys.has(key)
  // M25§4.4: 入力不能時間を空箱にしない — 味方行動処理中/敵行動中/勝敗遷移中の表示ラベル
  const centerStatusLabel = battle.phase === 'won' || battle.phase === 'lost' || battle.phase === 'fled'
    ? '戦果を結ぶ'
    : actor?.isAlly
      ? (pendingActionLabel ?? '……')
      : '敵の手番'

  return (
    <div
      className={`screen battle-screen stage-${stageFamily}${stageContract ? ' battle-visual-v2' : ''}${ar1Hero ? ` battle-hero-${ar1Hero}` : ''}`}
      data-visual-version={stageContract ? 'v2' : 'v1'}
      data-stage-contract-id={stageContract?.id}
      data-region-id={regionId}
      data-hero-treatment={ar1Hero ?? undefined}
      data-rare-mark-id={ar1Hero === 'rare' ? rareEncounter?.markId : undefined}
    >
      {bossShown && bossName && (
        <div className="boss-banner">
          <span className="boss-banner-sub">主(ぬし)、現る</span>
          <span className="boss-banner-name">{bossName}</span>
        </div>
      )}

      {bossCutinUrl && (
        <div className="cutin-ovl cutin-boss">
          <img src={bossCutinUrl} alt="" aria-hidden />
        </div>
      )}
      {ougiCutinUrl && (
        <div className="cutin-ovl cutin-ougi">
          <img src={ougiCutinUrl} alt="" aria-hidden />
        </div>
      )}

      {/* AR0: 上端は行動順・報酬予告・全画面設定釦だけの予約帯。戦場と同じ
          position層へ混ぜないため、敵兆し/敵札が上端UIへ侵入しない。 */}
      <div className="battle-top-rail" data-zone="battle-top">
        <TurnOrderBar battle={battle} />
        {rewardSettlement && <BattleRewardForecast settlement={rewardSettlement} />}
      </div>

      <div
        className={`battle-stage${battle.phase === 'won' ? ' stage-won' : ''}${isBossVictory ? ' stage-won-boss' : ''}`}
        data-shake={shakeKey}
      >
        {stageContract
          ? <Ar1BattleStage contract={stageContract} />
          : <>
              {stageBgCss && <div className="battle-stage-bg" style={{ backgroundImage: stageBgCss }} />}
              <div className="stage-ground" />
            </>}
        {ar1Hero && (
          <div
            className={`ar1-hero-mark ar1-hero-${ar1Hero}`}
            role="status"
            aria-label={ar1Hero === 'rare'
              ? `稀相 ${rareEncounter?.enemyName}。確定遺物 ${rareEncounter?.drop.name}`
              : `この地の主 ${bossName}`}
          >
            <span>{ar1Hero === 'rare' ? '稀相' : 'この地の主'}</span>
            <strong>{ar1Hero === 'rare' ? rareEncounter?.enemyName : bossName}</strong>
            {ar1Hero === 'rare' && <small>遺物予告 ・ {rareEncounter?.drop.name}</small>}
          </div>
        )}

        {/* §3.7: 主専用HPゲージ — 通常敵の枠に混ぜず画面上部へ分離 */}
        {isBossBattle && bossCombatant && <BossHpBar boss={bossCombatant} />}
        {bossMotive && !isBossVictory && (
          <p className="boss-motive-line" role="status">
            <span>主の願い</span>{bossMotive}
          </p>
        )}

        {/* 火脈 — 継足対象・連数・次撃倍率を戦場中央に示す(§5.4。実数値は行動順bar横が正 — §3.3で装飾化) */}
        {battle.chainTarget && battle.chain > 0 && (() => {
          const t = battle.enemies.find((e) => e.key === battle.chainTarget && e.hp > 0)
          if (!t) return null
          const nextMult = chainMultiplier(battle.chain)
          return (
            <div className="chain-vein" key={`${battle.chainTarget}:${battle.chain}`}>
              <span className="chain-vein-mark">継</span>
              <span className="chain-vein-text">火脈 — {t.name}へ{battle.chain + 1}連</span>
              <span className="chain-vein-mult">次撃 ×{nextMult.toFixed(2)}</span>
            </div>
          )
        })()}

        {/* M25§4.2/§4.3: 敵/味方の陣形と灯脈をまとめる「同じtransformコンテナ」。
            HP札・行動順・コマンド盤はこの外にあるため、被弾shakeで揺れない(§4.3手順4)。 */}
        <div ref={stageRef} className={`stage-battlers${shakeKey ? ' stage-shake' : ''}`}>
          <div className={`enemy-side${isBossBattle ? ' has-boss' : ''}`}>
            {isBossBattle && bossCombatant && (
              <div className="enemy-boss-slot">
                <CombatantNode
                  c={bossCombatant}
                  role="front"
                  fx={fx[bossCombatant.key] ?? []}
                  targetable={isPlayerTurn && activeTargetMenu?.side === 'enemy' && bossCombatant.hp > 0}
                  selected={menu.kind === 'confirm' && menu.targetKey === bossCombatant.key}
                  chainBadge={battle.chainTarget === bossCombatant.key && battle.chain > 0 ? battle.chain + 1 : 0}
                  leader={false}
                  isBoss
                  cardTier="lord"
                  spriteKey={bossCombatant.enemyId ? enemyById(bossCombatant.enemyId).sprite : undefined}
                  dimmed={isDimmed(bossCombatant.key)}
                  targetNumber={targetableEnemies.indexOf(bossCombatant) + 1}
                  elementBadge={{ el: bossCombatant.element, adv: isPlayerTurn && actor?.isAlly ? matchup(previewElement, bossCombatant.element) : 'even' }}
                  intent={isPlayerTurn ? battle.intents?.[bossCombatant.key] : undefined}
                  onClick={() => onEnemyClick(bossCombatant)}
                  onBodyRef={registerBodyRef}
                  onCombatantRef={registerCombatantRef}
                >
                  <EnemyVisual2 e={bossCombatant} />
                </CombatantNode>
              </div>
            )}
            <div className={`enemy-grid slot-preset-${enemyGridPreset}`} data-count={nonBossEnemies.length}>
              {nonBossEnemies.map((e, i) => {
                const role = roleOf(i, nonBossEnemies.length)
                const def = e.enemyId ? enemyById(e.enemyId) : null
                return (
                  <CombatantNode
                    key={e.key}
                    c={e}
                    role={role}
                    fx={fx[e.key] ?? []}
                    targetable={isPlayerTurn && activeTargetMenu?.side === 'enemy' && e.hp > 0}
                    selected={menu.kind === 'confirm' && menu.targetKey === e.key}
                    chainBadge={battle.chainTarget === e.key && battle.chain > 0 ? battle.chain + 1 : 0}
                    leader={battle.leaderKey === e.key}
                    isBoss={false}
                    cardTier={def && def.tier >= 3 ? 'nemesis' : 'normal'}
                    spriteKey={def?.sprite}
                    dimmed={isDimmed(e.key)}
                    targetNumber={targetableEnemies.indexOf(e) + 1}
                    elementBadge={{ el: e.element, adv: isPlayerTurn && actor?.isAlly ? matchup(previewElement, e.element) : 'even' }}
                    intent={isPlayerTurn ? battle.intents?.[e.key] : undefined}
                    behaviorCue={isPlayerTurn ? upcomingEnemyBehaviorCue(battle, e) : undefined}
                    onClick={() => onEnemyClick(e)}
                    onBodyRef={registerBodyRef}
                    onCombatantRef={registerCombatantRef}
                  >
                    <EnemyVisual2 e={e} />
                  </CombatantNode>
                )
              })}
            </div>
          </div>

          <div className="ally-side">
            <div className={`ally-grid slot-preset-${allyGridPreset}`} data-count={battle.allies.length}>
              {battle.allies.map((a, i) => {
                const ch = charOf(a)
                const role = roleOf(i, battle.allies.length)
                return (
                  <CombatantNode
                    key={a.key}
                    c={a}
                    role={role}
                    fx={fx[a.key] ?? []}
                    targetable={isPlayerTurn && activeTargetMenu?.side === 'ally' && a.hp > 0}
                    selected={menu.kind === 'confirm' && menu.targetKey === a.key}
                    acting={actor?.key === a.key && battle.phase === 'input'}
                    chainBadge={0}
                    cardTier="normal"
                    spriteKey={ch?.tomoshigata ? `pose_${ch.tomoshigata}_${ch.sex}_adult.png` : undefined}
                    dimmed={isDimmed(a.key)}
                    targetNumber={targetableAllies.indexOf(a) + 1}
                    onClick={() => onAllyClick(a)}
                    onBodyRef={registerBodyRef}
                    onCombatantRef={registerCombatantRef}
                  >
                    <AllyVisual gata={ch?.tomoshigata ?? 'homura'} sex={ch?.sex ?? 'm'} element={a.element} />
                  </CombatantNode>
                )
              })}
            </div>
          </div>

          <VeinLayer veins={veins} />
        </div>

        {/* 戦況ログ — 戦場下端の専用帯(通常フロー・名札/HP/コマンドと矩形が重ならない §4.2)。
            全履歴は「記」で展開(§3.4/§5.4) */}
        <div className="battle-log-strip" data-zone="battle-log">
          <div className="battle-log-strip-text">
            {displayed.slice(-1).map((l, i) => (
              <p key={`${displayed.length}-${i}`} className={`log-${l.kind}`}>{l.text}</p>
            ))}
          </div>
          {displayed.length > 1 && (
            <button className="btn btn-ghost log-expand" onClick={() => setShowFullLog(true)}>記</button>
          )}
        </div>
      </div>


      {showFullLog && (
        <div className="log-full-back" onClick={() => setShowFullLog(false)}>
          <div className="log-full" onClick={(e) => e.stopPropagation()}>
            <div className="log-full-head">
              <span>戦況の記</span>
              <button className="btn btn-ghost" onClick={() => setShowFullLog(false)}>閉じる</button>
            </div>
            <div className="log-full-body" ref={logRef}>
              {displayed.map((l, i) => (
                <p key={i} className={`log-${l.kind}`}>{l.text}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="battle-bottom">
        {over ? (
          <div className="victory-scroll">
            <aside className="victory-log-panel" aria-label="戦闘ログ">
              <div className="victory-log-heading">
                <span>戦況の記</span>
                <small>{displayed.length}行</small>
              </div>
              <div className="victory-log-list">
                {displayed.slice(-8).map((l, i) => (
                  <p key={`${displayed.length}-${i}`} className={`log-${l.kind}`}>{l.text}</p>
                ))}
              </div>
              {displayed.length > 8 && <p className="victory-log-note">直近8行を表示 — 「記」で全履歴</p>}
            </aside>
            <div className="victory-result-main">
              <div className="victory-result-body">
                <p className="victory-line">
                  {battle.phase === 'won'
                    ? bossRequiem
                      ? `鎮魂 — ${bossRequiem}`
                      : '勝鬨を上げよ — 夜藪に、僅かな静けさが戻った。'
                    : battle.phase === 'fled'
                      ? '一族は闇に紛れて退いた'
                      : '一族の灯が、闇に呑まれた……'}
                </p>
                {battle.phase === 'won' && rewardSettlement?.result && (
                  <BattleRewardResultView
                    settlement={rewardSettlement}
                    carriedTotal={runLoot}
                    family={family}
                  />
                )}
                {autoReport.length > 0 && (
                  <div className="auto-battle-report" aria-label="オート戦闘の見立て">
                    {autoReport.map((line) => <p key={line}>{line}</p>)}
                    {auto && (
                      <div className="auto-result-continuation">
                        <span>約3秒後、自動で先へ進む</span>
                        <button className="btn btn-ghost" onClick={() => setAuto(false)}>ここで止める</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="victory-continue">
                <button
                  className="btn btn-main"
                  disabled={battle.phase === 'won' && rewardSettlement?.status !== 'settled'}
                  onClick={battle.phase === 'won' ? continueAfterBattle : finishBattle}
                >
                  {battle.phase === 'won'
                    ? rewardSettlement?.plan.nextPhase === 'shiori_duel' ? '連戦へ'
                      : rewardSettlement?.plan.nextPhase === 'finale' ? '結末へ'
                        : rewardSettlement?.status === 'settled' ? '戦果を携えて進む' : '戦果を確かめている…'
                    : battle.phase === 'fled' ? '先へ' : '帰り火へ'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 左: 現在手番の名/HP/MP/状態。隊全体の灯力(MP)は誰の番でも常時1行維持(§3.4/§3.5) */}
            <div className="turnpanel-actor">
              {actor?.isAlly ? (
                <div className="turnpanel-actor-main">
                  {charOf(actor) && <Portrait char={charOf(actor)!} seasonIndex={seasonIndex} size="sm" />}
                  <div className="turnpanel-actor-vitals">
                    <span className="turnpanel-kicker">いまの手番</span>
                    <div className="turnpanel-actor-name">
                      {actor.name}
                      {actor.guard && <span className="status-chip" title="防御中">防</span>}
                      {!!actor.buffs.atkUp && <span className="status-chip" title="攻撃上昇中">攻↑</span>}
                      {!!actor.buffs.defUp && <span className="status-chip" title="防御上昇中">守↑</span>}
                    </div>
                    <Bar value={actor.hp} max={actor.maxHp} kind="hp" />
                    <Bar value={actor.mp} max={actor.maxMp} kind="mp" />
                  </div>
                </div>
              ) : actor ? (
                // M25§9.2: 敵の手番でも名前を出し、390×844で誰の番かを500ms以内に特定できるようにする
                <div className="turnpanel-actor-name">
                  {actor.name}
                  <span className="status-chip" title="敵の手番">敵</span>
                </div>
              ) : (
                <p className="cmd-hint-line">{centerStatusLabel}</p>
              )}
              <div className="turnpanel-party-mp">
                {battle.allies.map((a) => (
                  <span
                    key={a.key}
                    className={`${actor?.key === a.key ? 'is-now' : ''} ${a.hp <= 0 ? 'is-dead' : ''}`}
                    title={`${a.name}(${a.row === 'back' ? '後衛・被弾軽' : '前衛'}) 灯力${a.mp}/${a.maxMp}`}
                  >
                    <i className="row-mark">{a.row === 'back' ? '後' : '前'}</i>{a.name.slice(0, 1)}{a.mp}/{a.maxMp}
                  </span>
                ))}
              </div>
            </div>

            {/* 中央: 主要4コマンド(2×2+オート)/技一覧/対象選択ヒント(§3.5)。
                M25§4.4: 入力不能時もcmd-gridは常設し、disabled表示+状態ラベルで領域を空箱にしない。 */}
            <div className="turnpanel-center">
              {menu.kind === 'root' && (
                <div className="command-board-heading">
                  <span>戦支度</span>
                  <b>{isPlayerTurn ? `${actor?.name ?? ''}の一手を選ぶ` : centerStatusLabel}</b>
                </div>
              )}
              {/* A(M28→M29+): オート切替を常設(手番・メニュー・演出に関わらず戦闘中いつでも入切可能)。
                  盤の流れ内に置くのでコマンドと重ならない。オート中は「■ 停止」で必ず止められる。 */}
              {!over && (
                <div className="auto-control-stack" data-zone="battle-settings">
                  <button
                    type="button"
                    className={`cmd-auto-persist ${auto ? 'is-on' : ''}`}
                    aria-pressed={auto}
                    // M32修正: 技/道具/対象選択中にオートONにすると、選択が宙に浮いて素攻撃が自動発火し
                    // target-hintがチラつく回帰があった。切替時は必ずメニューをrootへ戻す。
                    onClick={() => { setAuto(!auto); setAutoStopReason(null); setMenu({ kind: 'root' }) }}
                  >
                    {auto ? '■ オート停止(タップ／Esc)' : '▶ オート戦闘にする'}
                  </button>
                  <div className="auto-policy-chips" role="radiogroup" aria-label="オートの方針">
                    {AUTO_POLICIES.map((policy) => (
                      <button
                        key={policy}
                        type="button"
                        className={`auto-policy-chip ${autoSettings.policy === policy ? 'is-on' : ''}`}
                        role="radio"
                        aria-checked={autoSettings.policy === policy}
                        tabIndex={autoSettings.policy === policy ? 0 : -1}
                        onKeyDown={(event) => moveAutoPolicy(event, policy)}
                        onClick={() => changeAutoPolicy(policy)}
                      >{AUTO_POLICY_LABEL[policy]}</button>
                    ))}
                  </div>
                  {autoStopReason && <p className="auto-stop-reason" role="status" aria-live="polite">{autoStopReason}</p>}
                </div>
              )}
              {menu.kind === 'root' && (
                <>
                  {!isPlayerTurn && <p className="cmd-hint-line">{centerStatusLabel}</p>}
                  <div className="cmd-grid">
                    <button
                      ref={attackButtonRef}
                      className="cmd-btn cmd-main"
                      disabled={!isPlayerTurn}
                      data-zone="command"
                      onClick={beginAttack}
                    >
                      <span className="cmd-mark" aria-hidden>斬</span>
                      <span className="cmd-copy"><b>攻撃</b><small>継足を重ねる</small></span>
                    </button>
                    <button
                      ref={skillButtonRef}
                      className="cmd-btn"
                      disabled={!isPlayerTurn}
                      data-zone="command"
                      onClick={() => {
                        menuOriginRef.current = 'skill'
                        setMenu({ kind: 'skill' })
                        setPreviewSkillId(actor?.skills[0] ?? null)
                      }}
                    >
                      <span className="cmd-mark" aria-hidden>技</span>
                      <span className="cmd-copy"><b>技</b><small>灯力を費やす</small></span>
                    </button>
                    <button className="cmd-btn cmd-guard" disabled={!isPlayerTurn} data-zone="command" onClick={() => runCommand({ type: 'guard' }, '防御')}>
                      <span className="cmd-mark" aria-hidden>守</span>
                      <span className="cmd-copy"><b>防御</b><small>次の傷を抑える</small></span>
                    </button>
                    <button className="cmd-btn cmd-flee" disabled={!isPlayerTurn} data-zone="command" onClick={() => runCommand({ type: 'flee' }, '逃げる')}>
                      <span className="cmd-mark" aria-hidden>退</span>
                      <span className="cmd-copy"><b>逃げる</b><small>戦果を捨て退く</small></span>
                    </button>
                    {/* M28-C: 道具(回復薬)。所持が無ければ無効表示で領域は保つ。 */}
                    <button
                      ref={itemButtonRef}
                      className="cmd-btn"
                      disabled={!isPlayerTurn || availItems.length === 0}
                      data-zone="command"
                      onClick={() => { menuOriginRef.current = 'item'; setMenu({ kind: 'item' }) }}
                    >
                      <span className="cmd-mark" aria-hidden>薬</span>
                      <span className="cmd-copy"><b>道具</b><small>{availItems.length > 0 ? '傷と灯を補う' : '郷で補充できる'}</small></span>
                      {availItems.length > 0 && <span className="sk-info">{availItems.reduce((n, x) => n + x.count, 0)}</span>}
                    </button>
                  </div>
                </>
              )}
              {isPlayerTurn && menu.kind === 'skill' && actor && (
                <div className="skill-panel">
                  <div className="skill-list">
                    {actor.skills.map((id) => {
                      const sk = skillById(id)
                      return (
                        <button
                          key={id} className="cmd-btn" disabled={actor.mp < sk.mpCost}
                          onClick={() => castSkill(id)}
                          onMouseEnter={() => setPreviewSkillId(id)}
                          onFocus={() => setPreviewSkillId(id)}
                        >
                          <MaybeImg src={skillIcon(sk.id)} className="sk-ico" />
                          {sk.element && <span className={`el-chip el-${sk.element}`}>{ELEMENT_LABELS[sk.element]}</span>}
                          {sk.name}
                          {(sk.type === 'attack' || sk.type === 'heal') && <span className="sk-info">威{sk.power}</span>}
                          {(sk.target === 'enemies' || sk.target === 'allies') && <span className="sk-info sk-aoe">全</span>}
                          {/* M33: mobileは.turnpanel-detail(散文の威力/灯説明)が隠れるため、消費灯力に灯ラベルを付け裸数字を解消。
                              道具盤の×{count}(mp-cost流用)とは別JSXなので誤爆しない。 */}
                          <span className="mp-cost">灯{sk.mpCost}</span>
                        </button>
                      )
                    })}
                  </div>
                  {/* 戻るはスクロール外に固定(§3.8/§5.4) */}
                  <button className="cmd-btn cmd-ghost skill-back" onClick={returnToRoot}>選ばず戻る</button>
                </div>
              )}
              {/* M28-C: 道具一覧。技盤と同じ骨格を流用(scrollは.skill-list、戻るは外固定) */}
              {isPlayerTurn && menu.kind === 'item' && (
                <div className="skill-panel">
                  <div className="skill-list">
                    {availItems.map(({ def, count }) => (
                      <button key={def.id} className="cmd-btn" onClick={() => pickItem(def.id)} title={def.desc}>
                        <span className="item-ico" aria-hidden>{def.icon}</span>
                        {def.name}
                        <span className="sk-info">{def.effect.scope === 'party' ? '全' : ''}{def.effect.stat === 'hp' ? '傷' : '灯'}{def.effect.amount}</span>
                        <span className="mp-cost">×{count}</span>
                      </button>
                    ))}
                  </div>
                  <button className="cmd-btn cmd-ghost skill-back" onClick={returnToRoot}>選ばず戻る</button>
                </div>
              )}
              {isPlayerTurn && menu.kind === 'target' && (
                <div className="target-hint">
                  <p className="cmd-hint-line">{menu.side === 'enemy' ? '狙う魔性を選べ' : '授ける相手を選べ'}</p>
                  <p className="cmd-hint-line cmd-hint-sub">数字キー・Tabで選択／Escで取消</p>
                  <button className="cmd-btn cmd-ghost" onClick={returnToRoot}>やめる</button>
                </div>
              )}
              {isPlayerTurn && menu.kind === 'confirm' && confirmedTarget && (
                <div
                  className="action-confirm"
                  id="battle-action-confirm"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <p className="action-confirm-kicker">行動予告</p>
                  <p className="action-confirm-title"><b>{menu.actionName}</b><span>→</span>{confirmedTarget.name}</p>
                  <dl className="action-confirm-facts">
                    <div><dt>相性</dt><dd>{confirmedMatchup === 'adv' ? '有利 ▲' : confirmedMatchup === 'dis' ? '不利 ▽' : confirmedMatchup === 'even' ? '互角' : '—'}</dd></div>
                    <div><dt>継足</dt><dd>×{confirmedMultiplier.toFixed(2)}</dd></div>
                    <div><dt>対象体力</dt><dd>{confirmedTarget.hp}/{confirmedTarget.maxHp}</dd></div>
                  </dl>
                  <div className="action-confirm-actions">
                    <button
                      ref={confirmButtonRef}
                      type="button"
                      className="cmd-btn cmd-main"
                      data-zone="action-execute"
                      onClick={executeConfirmed}
                    >この行動を実行</button>
                    <button
                      type="button"
                      className="cmd-btn cmd-ghost"
                      onClick={() => {
                        lastTargetKeyRef.current = menu.targetKey
                        setMenu(menu.source)
                      }}
                    >標的を選び直す</button>
                  </div>
                  <p className="action-confirm-keys">Esc: 標的選択へ戻る</p>
                </div>
              )}
            </div>

            {/* 右: 選択中の技の威力/属性/消費/対象範囲(§3.5)。対象相性は戦場上の相性バッジ側で示す */}
            <div className="turnpanel-detail">
              {activeTargetMenu?.skillId || menu.kind === 'skill'
                ? <SkillDetailPanel skillId={activeTargetMenu?.skillId ?? previewSkillId} />
                : <BattleTacticalBrief battle={battle} itemCount={availItems.reduce((sum, item) => sum + item.count, 0)} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 第N巡と、現在から最大6手の行動順(§5.4「上段行動順」)。§3.3: 次撃倍率をここへ常設する
// UI視覚(2026-07-17): 「今」を発光バッジ化、敵味方を色非依存の1字印(味/魔)でも判別できるようにする。
function TurnOrderBar({ battle }: { battle: NonNullable<ReturnType<typeof useGame.getState>['battle']> }) {
  const byKey = new Map([...battle.allies, ...battle.enemies].map((c) => [c.key, c]))
  const seq = [...battle.order.slice(battle.orderIndex), ...battle.order.slice(0, battle.orderIndex)]
    .map((k) => byKey.get(k))
    .filter((c): c is Combatant => !!c && c.hp > 0)
    .slice(0, 6)
  if (seq.length === 0) return null
  const chainTargetKey = battle.chainTarget
  const chainTargetAlive = chainTargetKey ? (byKey.get(chainTargetKey)?.hp ?? 0) > 0 : false
  const mult = chainTargetAlive && battle.chain > 0 ? chainMultiplier(battle.chain) : null
  return (
    <div className="turn-order" aria-label="行動順" data-zone="turnorder">
      <span className="turn-order-turn">第{battle.turn}巡</span>
      {mult !== null && (
        <span className="turn-chain-mult" title="次撃倍率">
          <i className="turn-chain-mult-ico" aria-hidden>灯</i>次撃×{mult.toFixed(2)}
        </span>
      )}
      {seq.map((c, i) => (
        <span
          key={`${c.key}-${i}`}
          className={`turn-chip ${c.isAlly ? 'is-ally' : 'is-enemy'} ${i === 0 ? 'is-now' : ''}`}
          data-step={i}
          aria-current={i === 0 ? 'step' : undefined}
          title={`${i === 0 ? '現在' : `あと${i}手`}・${c.name}`}
        >
          {i === 0 && <em>今</em>}
          <i className="turn-chip-side">{c.isAlly ? '味' : '魔'}</i>
          {c.name}
        </span>
      ))}
    </div>
  )
}

// action layer(§4.3) — .stage-battlers全体に重ね、%座標のlineで行動者→対象の足元を結ぶ。
// 近接の火花(action-spark)も同じveins座標を再利用し、追加のgetBoundingClientRect呼び出しはしない。
function VeinLayer({ veins }: { veins: VeinEvent[] }) {
  if (veins.length === 0) return null
  return (
    <>
      <svg className="hitvein-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {veins.map((v) => (
          <line
            key={v.id}
            x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}
            className={`hitvein-line ${v.kind === 'heal' ? 'hitvein-heal' : ''} ${v.pulse ? 'hitvein-pulse' : ''}`}
          />
        ))}
      </svg>
      {veins.filter((v) => v.kind === 'atk').map((v) => (
        <span
          key={`spark-${v.id}`}
          className="action-spark"
          aria-hidden
          style={{
            ['--x1' as string]: `${v.x1}%`,
            ['--y1' as string]: `${v.y1}%`,
            ['--x2' as string]: `${v.x2}%`,
            ['--y2' as string]: `${v.y2}%`,
          }}
        />
      ))}
    </>
  )
}

// 主専用HPゲージ(§3.7) — 通常敵の枠に混ぜず画面上部へ分離。目盛りで段階変化を示唆する(専用の演出テキストは持たない)
function BossHpBar({ boss }: { boss: Combatant }) {
  const pct = boss.maxHp > 0 ? Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100)) : 0
  return (
    <div className="boss-hp-bar" role="group" aria-label={`${boss.name} 体力 ${Math.max(0, Math.round(boss.hp))}/${boss.maxHp}`}>
      <span className="boss-hp-name">{boss.name}</span>
      <div className="boss-hp-track">
        <div className="boss-hp-fill" style={{ width: `${pct}%` }} />
        <span className="boss-hp-tick" style={{ left: '25%' }} />
        <span className="boss-hp-tick" style={{ left: '50%' }} />
        <span className="boss-hp-tick" style={{ left: '75%' }} />
      </div>
      <span className="boss-hp-num">{Math.max(0, Math.round(boss.hp))}/{boss.maxHp}</span>
    </div>
  )
}

// コマンド盤右: 選択中の技の威力/属性/消費/対象範囲(§3.5)。対象相性は戦場上のelementBadgeが担う
const SKILL_TARGET_LABEL: Record<SkillTarget, string> = {
  enemy: '敵単体', enemies: '敵全体', ally: '味方単体', allies: '味方全体', self: '自身',
}
function SkillDetailPanel({ skillId }: { skillId: string | null | undefined }) {
  if (!skillId) return <p className="detail-hint">技を選ぶと威力・属性・消費を表示</p>
  const sk = skillById(skillId)
  return (
    <div className="skill-detail">
      <div className="skill-detail-name">
        {sk.element && <span className={`el-chip el-${sk.element}`}>{ELEMENT_LABELS[sk.element]}</span>}
        {sk.name}
      </div>
      {(sk.type === 'attack' || sk.type === 'heal') && <p className="skill-detail-row">威力 <b>{sk.power}</b></p>}
      <p className="skill-detail-row">消費 <b>{sk.mpCost}</b></p>
      <p className="skill-detail-row">{SKILL_TARGET_LABEL[sk.target]}</p>
    </div>
  )
}

// 配置スロット+演出クラスを与える共通ラッパ
// M47 Work2: 敵の「行動候補」。実行を予約しないため、可視文言・ariaとも確定表現にしない。
const INTENT_LABEL: Record<EnemyIntent, string> = { atk: '攻', tech: '術', aoe: '群', flee: '逃' }
const INTENT_TITLE: Record<EnemyIntent, string> = {
  atk: '行動候補: 単体攻撃。確定ではない',
  tech: '行動候補: 術(状態・属性)。確定ではない',
  aoe: '行動候補: 全体・複数攻撃。確定ではない',
  flee: '行動候補: 逃走。長を失った群れは逃げることがある',
}

function BattleTacticalBrief({ battle, itemCount }: { battle: BattleState; itemCount: number }) {
  const livingEnemies = battle.enemies.filter((enemy) => enemy.hp > 0)
  const wideThreats = livingEnemies.filter((enemy) => battle.intents?.[enemy.key] === 'aoe').length
  const fleeCandidates = livingEnemies.filter((enemy) => battle.intents?.[enemy.key] === 'flee').length
  const chainName = battle.chainTarget
    ? livingEnemies.find((enemy) => enemy.key === battle.chainTarget)?.name
    : undefined
  return (
    <div className="battle-tactical-brief" aria-label="戦況の見立て">
      <p className="battle-tactical-kicker">戦況の見立て</p>
      <dl>
        <div><dt>敵勢</dt><dd>{livingEnemies.length}体</dd></div>
        <div><dt>広域候補</dt><dd>{wideThreats > 0 ? `${wideThreats}体` : 'なし'}</dd></div>
        <div><dt>携行薬</dt><dd>{itemCount}個</dd></div>
      </dl>
      <p className="battle-tactical-note">
        {fleeCandidates > 0
          ? `「逃」が${fleeCandidates}体。長を失った群れは逃げることがある。`
          : chainName
          ? `${chainName}へ火脈が通っている。同じ敵を狙えば次撃が伸びる。`
          : itemCount === 0
            ? '薬が尽きている。帰還後、郷の薬種見世で補充できる。'
            : '敵札の「攻・術・群」は次の行動候補。確定ではない兆しから、攻めるか守るかを選べ。'}
      </p>
    </div>
  )
}
const COUNTER_LABEL: Record<EnemyBehaviorCue['counter'], string> = { stop: '止', receive: '受', break: '崩' }
const COUNTER_SHORT: Record<EnemyBehaviorCue['counter'], string> = {
  stop: '強手前に狙う', receive: '身を固める', break: '弱点技を当てる',
}
const TARGET_SHORT: Record<EnemyBehaviorCue['step']['target'], string> = {
  '前列ひとり': '前一', '一族ひとり': '単体', '一族全体': '全体',
}

function CombatantNode({
  c, role, fx, targetable, clickable, selected, acting, chainBadge, leader, isBoss, cardTier, spriteKey, dimmed, targetNumber, elementBadge, intent, behaviorCue, onClick, onBodyRef, onCombatantRef, children,
}: {
  c: Combatant
  // M25§4.2: 前列/後列の役割だけを渡す。列数・行そのものはCSS(.slot-preset-*)側の責務にし、
  // 768px境界のメディアクエリで上書きできるようにする(inlineでgrid-column/rowは固定しない)。
  role: Role
  fx: FxEvent[]
  targetable: boolean
  clickable?: boolean
  selected?: boolean // AR0: 確認盤に載っている現在の標的
  acting?: boolean
  chainBadge: number
  leader?: boolean
  isBoss?: boolean
  cardTier: CardTier // M25§4.1: 通常札/宿敵札/主札の3階層
  spriteKey?: string // BattleArtFrameのバケット解決キー(sprite接頭辞)
  dimmed: boolean // M25§4.3手順1: 行動者/対象以外の暗転
  targetNumber?: number // 対象選択中の1始まり番号(0以下=非表示)
  elementBadge?: { el: Element; adv: Matchup }
  intent?: EnemyIntent // M47: 敵の次行動候補(生存敵・入力番のみ)
  behaviorCue?: EnemyBehaviorCue // M47: 固有手筋の候補と短い対処。行動予約ではない
  onClick: () => void
  onBodyRef?: (key: string, el: HTMLDivElement | null) => void
  onCombatantRef?: (key: string, el: HTMLDivElement | null) => void
  children: React.ReactNode
}) {
  const lunge = fx.some((f) => f.kind === 'lunge')
  const hit = fx.find((f) => f.kind === 'hit')
  const heal = fx.find((f) => f.kind === 'heal')
  const ko = fx.some((f) => f.kind === 'ko')
  const voice = fx.find((f) => f.voice)
  const interactive = targetable || !!clickable
  const zone: 'enemy-card' | 'ally-card' = c.isAlly ? 'ally-card' : 'enemy-card'
  return (
    <div
      className={[
        'combatant',
        c.isAlly ? 'is-ally' : 'is-enemy',
        c.hp <= 0 ? 'dead' : '',
        targetable ? 'targetable' : '',
        selected ? 'is-selected-target' : '',
        acting ? 'acting' : '',
        isBoss ? 'is-boss' : '',
        dimmed ? 'stage-dim' : '',
        lunge ? 'fx-lunge' : '',
        hit ? 'fx-hit' : '',
        ko ? 'fx-ko' : '',
      ].join(' ')}
      ref={(el) => onCombatantRef?.(c.key, el)}
      data-row={role}
      style={{ order: role === 'back' ? 0 : 1, zIndex: role === 'front' ? 12 : 10 }}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-pressed={interactive ? !!selected : undefined}
      aria-describedby={selected ? 'battle-action-confirm' : undefined}
      aria-label={`${targetNumber && targetNumber > 0 ? `${targetNumber}、` : ''}${c.name} 体力${c.hp}/${c.maxHp}${selected ? '、選択中' : ''}`}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() }
      }}
    >
      {!!targetNumber && targetNumber > 0 && <span className="target-num-badge" aria-hidden>{targetNumber}</span>}
      {/* M47: 敵の行動候補 — 名札の上で「候補」と明記し、色だけに頼らない。 */}
      {intent && c.hp > 0 && (
        <span
          className={`enemy-intent intent-${intent}${behaviorCue ? ' has-behavior' : ''}`}
          data-certainty="candidate"
          title={behaviorCue
            ? `行動候補: ${behaviorCue.step.tell}。${behaviorCue.step.target}。${behaviorCue.hint}。確定ではない`
            : INTENT_TITLE[intent]}
          aria-label={behaviorCue
            ? `行動候補、${behaviorCue.step.tell}。確定ではない。危険度${behaviorCue.step.danger === 'danger' ? '高い' : '警戒'}。対象${behaviorCue.step.target}。対処、${behaviorCue.hint}`
            : INTENT_TITLE[intent]}
        >
          <span className="intent-dot" aria-hidden />
          {behaviorCue ? (
            <>
              <span className="intent-tell"><em>候補</em><b>{INTENT_LABEL[intent]}</b> {behaviorCue.step.tell}</span>
              <small className="intent-response">
                {behaviorCue.step.danger === 'danger' ? '危' : '警'}・{TARGET_SHORT[behaviorCue.step.target]}
                <i>{COUNTER_LABEL[behaviorCue.counter]}</i>{COUNTER_SHORT[behaviorCue.counter]}
              </small>
            </>
          ) : <><em>候補</em><b>{INTENT_LABEL[intent]}</b></>}
        </span>
      )}
      {voice && <div className="voice-bubble">{voice.voice}</div>}
      <span className="depth-mark" aria-hidden>{role === 'front' ? '前' : '後'}</span>
      <div className="combatant-art-wrap">
        <span className="combatant-shadow" aria-hidden />
        <BattleArtFrame
          className="combatant-body"
          zone={zone}
          tier={cardTier}
          spriteKey={spriteKey}
          domRef={(el) => onBodyRef?.(c.key, el)}
        >
          {children}
        </BattleArtFrame>
        {hit && (
          <>
            <span
              className={`dmg-pop ${hit.crit ? 'crit' : ''} ${hit.weak ? 'weak' : ''}`}
              style={{ ['--dx' as string]: `${((hit.id % 7) - 3) * 8}px` }} /* 多段ヒットの数字を扇状に散らす */
            >
              {hit.amount}
              {hit.crit ? '!' : ''}
            </span>
            <span className={`burst el-${hit.element ?? 'fire'}`} />
          </>
        )}
        {heal && <span className="dmg-pop heal-pop">+{heal.amount}</span>}
      </div>
      <div className="combatant-plate" data-zone="nameplate">
        <span className="combatant-name">
          {leader && <span className="leader-tag">長</span>}
          {elementBadge && (
            <span className={`el-chip el-${elementBadge.el} adv-${elementBadge.adv}`} title="属性相性">
              {ELEMENT_LABELS[elementBadge.el]}
              {elementBadge.adv === 'adv' ? '▲' : elementBadge.adv === 'dis' ? '▽' : ''}
            </span>
          )}
          {c.name}
        </span>
        <span className="status-icons">
          {c.guard && <span className="status-chip" title="防御中">防</span>}
          {!!c.buffs.atkUp && <span className="status-chip" title="攻撃上昇中">攻↑</span>}
          {!!c.buffs.defUp && <span className="status-chip" title="防御上昇中">守↑</span>}
        </span>
        <Bar value={c.hp} max={c.maxHp} kind="hp" />
      </div>
      {chainBadge > 0 && <span className="chain-badge">継足{chainBadge}連</span>}
    </div>
  )
}

// 味方の立ち姿 — M17: 戦闘立ち姿(pose_*)→歩行スプライトのleft向き(旧来)→灯の炎、の順に退避
function AllyVisual({ gata, sex, element }: { gata: string; sex: string; element: string }) {
  const candidates = [poseImg(gata, sex, 'adult'), spriteImg(`walk_${gata}_${sex}_left_1.png`)]
  const key = `${gata}:${sex}`
  const [idx, setIdx] = useState(0)
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setIdx(0)
  }
  if (idx >= candidates.length) {
    return <span className="ally-flame" data-el={element}>🔥</span>
  }
  const isPose = idx === 0
  return (
    <img
      className={isPose ? 'ally-pose' : 'ally-stand'}
      src={candidates[idx]}
      alt=""
      onError={() => setIdx((i) => i + 1)}
    />
  )
}

// M17: variantsOf()が_w/_o専用絵を付与するため、退避連鎖は「変異絵→基礎種絵→状態説明」の3段。
// 欠落時に別画風の簡易SVG妖怪を差し込まず、誤った外見を見せない。
function baseSpriteOf(sprite: string): string | null {
  return /_[wo]\.png$/.test(sprite) ? sprite.replace(/_[wo]\.png$/, '.png') : null
}

function EnemyVisual2({ e }: { e: Combatant }) {
  const def = e.enemyId ? enemyById(e.enemyId) : null
  const [stage, setStage] = useState<'primary' | 'base' | 'missing'>('primary')
  const key = e.enemyId ?? def?.sprite ?? e.key
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setStage('primary')
  }
  if (def && stage !== 'missing') {
    const baseSprite = baseSpriteOf(def.sprite)
    const src = stage === 'base' && baseSprite ? gameImg(baseSprite) : gameImg(def.sprite)
    const onError = () => {
      if (stage === 'primary' && baseSprite) setStage('base')
      else setStage('missing')
    }
    return (
      <span className="enemy-sprite2">
        <img className="enemy-img" src={src} alt="" onError={onError} />
      </span>
    )
  }
  return (
    <span className="enemy-sprite2 enemy-art-missing" data-el={e.element} role="img" aria-label={`${e.name}の絵姿を読み込めませんでした`}>
      <span aria-hidden>影</span>
      <small>{e.name}</small>
    </span>
  )
}

function BattleRewardForecast({ settlement }: { settlement: BattleRewardSettlement }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const plan = settlement.plan
  const candidateCount = plan.familiarCandidates.length
  const anyFamiliarChance = candidateCount > 0 ? (1 - 0.96 ** candidateCount) * 100 : 0
  const special = [
    plan.carried.rareDrop ? '稀相遺物' : '',
    plan.immediate.memorialKind ? '形見確定' : '',
    plan.immediate.loreCompletionHoto ? '土地の記' : '',
    plan.nextPhase ? '連戦' : '',
    candidateCount > 0 ? '縁あり' : '',
  ].filter(Boolean).join('・')

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div className="battle-reward-forecast" data-zone="reward" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="battle-reward-chip"
        aria-expanded={open}
        aria-controls="battle-reward-details"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="battle-reward-label">戦果見立て</span>
        <span className="battle-reward-values">
          {plan.nextPhase ? '報酬なし・物語が続く' : `奉燈 ${plan.carried.hoto} ／ 血珠 ${plan.carried.ketsu} ／ 経験 ${plan.immediate.partyXp}`}
        </span>
        {special && <span className="battle-reward-special">{special}</span>}
      </button>
      {open && (
        <div id="battle-reward-details" className="battle-reward-popover" role="dialog" aria-label="戦果見立ての詳細">
          <h3>この戦いの戦果見立て</h3>
          {plan.nextPhase ? (
            <p className="battle-reward-popover-note">この勝利は物語の連戦へ続くため、通常の戦果は発生しません。</p>
          ) : (
            <>
              <ul>
                <li>持ち帰る：奉燈 {plan.carried.hoto}、血珠 {plan.carried.ketsu}</li>
                <li>その場で得る：出陣した存命者全員 経験 {plan.immediate.partyXp}</li>
                {plan.immediate.fame !== undefined && <li>武功：{plan.immediate.fame}</li>}
                {plan.carried.rareDrop && <li>稀相遺物：{plan.carried.rareDrop.name}（確定）</li>}
                {plan.immediate.memorialKind === 'nemesis_weapon' && <li>宿敵の形見武具（確定・討伐後に銘を表示）</li>}
                {plan.immediate.loreCompletionHoto !== undefined && <li>土地の記：奉燈 {plan.immediate.loreCompletionHoto}（即時）</li>}
              </ul>
              {plan.modifiers.length > 0 && <><h4>上乗せ</h4><ul>{plan.modifiers.map((modifier) => <li key={modifier.id}>{modifier.label}{modifier.multiplier ? ` ×${modifier.multiplier}` : ''}</li>)}</ul></>}
              {candidateCount > 0 && <><h4>眷属の縁</h4><ul>{plan.familiarCandidates.map((candidate) => <li key={candidate.enemyId}>{candidate.enemyName}：4%</li>)}</ul><p className="battle-reward-popover-note">いずれかが懐く見込み 約{anyFamiliarChance.toFixed(1)}%。候補ごとに一度ずつ縁を結びます。</p></>}
            </>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => { setOpen(false); triggerRef.current?.focus() }}>閉じる</button>
        </div>
      )}
    </div>
  )
}

function BattleRewardResultView({ settlement, carriedTotal, family }: {
  settlement: BattleRewardSettlement
  carriedTotal?: { hoto: number; ketsu: number; items: readonly Item[] }
  family: Character[]
}) {
  const result = settlement.result
  if (!result) return null
  const leveled = result.growth.filter((growth) => growth.afterLevel > growth.beforeLevel)
  return (
    <div className="victory-result-block" role="status" aria-live="polite" aria-label="確定した戦果">
      <section className="victory-result-section">
        <h3>この戦いで得たもの</h3>
        <p className="victory-result-values">奉燈 <b>{result.carried.hoto}</b> ／ 血珠 <b>{result.carried.ketsu}</b> ／ 出陣した存命者全員 経験 <b>{result.immediate.partyXp}</b>{result.carried.items.length > 0 && <> ／ 稀相遺物 <b>{result.carried.items.map((item) => item.name).join('・')}</b></>}</p>
        {carriedTotal && <p className="victory-carry-note">夜行で持ち帰る合計：奉燈 {carriedTotal.hoto} ／ 血珠 {carriedTotal.ketsu} ／ 品 {carriedTotal.items.length}</p>}
      </section>
      {(result.immediate.fame > 0 || result.immediate.memorials.length > 0 || result.immediate.familiars.length > 0 || result.immediate.loreHoto > 0) && (
        <section className="victory-result-section">
          <h3>その場で結ばれたもの</h3>
          <p className="victory-result-values">
            {[result.immediate.fame > 0 ? `武功 ${result.immediate.fame}` : '', result.immediate.loreHoto > 0 ? `土地の記 奉燈 ${result.immediate.loreHoto}` : '', ...result.immediate.memorials.map((item) => `形見 ${item.name}`), ...result.immediate.familiars.map((familiar) => `眷属 ${familiar.name}`)].filter(Boolean).join(' ／ ')}
          </p>
        </section>
      )}
      {leveled.length > 0 && (
        <section className="victory-result-section">
          <h3>灯の成長</h3>
          <div className="victory-growth-grid">
            {leveled.map((growth) => {
              const character = family.find((entry) => entry.id === growth.charId)
              const stats = Object.entries(growth.statDelta)
                .filter((entry): entry is [keyof typeof STAT_LABELS, number] => typeof entry[1] === 'number' && entry[1] > 0)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([key, value]) => `${STAT_LABELS[key]} +${value}`)
                .join('・')
              return <article className="victory-growth-card" key={growth.charId}><strong>{character?.name ?? '一族'}</strong><span className="victory-growth-level">Lv {growth.beforeLevel} → {growth.afterLevel}</span><p className="victory-growth-delta">{[stats, growth.maxHpDelta > 0 ? `体力 +${growth.maxHpDelta}` : '', growth.maxMpDelta > 0 ? `灯力 +${growth.maxMpDelta}` : ''].filter(Boolean).join(' ／ ') || '新たな段階へ至った'}</p></article>
            })}
          </div>
        </section>
      )}
    </div>
  )
}
