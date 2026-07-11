// 戦闘画面(品質刷新v3.1 M8) — 俺屍様式の側面視ステージ
// 敵は左に雁行、味方は右に雁行(歩行スプライト流用)。演出はBattleLogEntryのメタデータ駆動:
// 踏み込み→被弾フラッシュ→ダメージ数字ポップ→KO溶暗。属性別バースト、行動者の題字タグ、
// 戦利品スロット(M12-5)、台詞チャネル(M15-1土台: kind:'voice')を備える。
import { useEffect, useRef, useState } from 'react'
import { useGame } from '../core/store'
import type { BattleLogEntry, Combatant, Element, SkillTarget } from '../core/types'
import { ELEMENT_LABELS, ELEMENT_ADVANTAGE } from '../core/types'
import { currentActor } from '../core/battle'

// 相性: 攻がADVANTAGEで防を突けば有利、逆なら不利
type Matchup = 'adv' | 'dis' | 'even'
function matchup(atk: Element | undefined, def: Element): Matchup {
  if (!atk) return 'even'
  if (ELEMENT_ADVANTAGE[atk] === def) return 'adv'
  if (ELEMENT_ADVANTAGE[def] === atk) return 'dis'
  return 'even'
}
import { audio } from '../core/audio'
import { getAutoBattleDefault } from '../core/settings'
import { skillById } from '../core/data/skills'
import { enemyById } from '../core/data/enemies'
import { regionById } from '../core/data/regions'
import { Bar, MaybeImg } from './components'
import { gameImg, spriteImg, poseImg, skillIcon, cutinImg, regionBgR, bossBgImg } from './img'
import './m17_battle.css'
import './battle_m24.css'

type Menu = { kind: 'root' } | { kind: 'skill' } | { kind: 'target'; skillId?: string; side: 'enemy' | 'ally' }

interface FxEvent {
  id: number
  kind: 'lunge' | 'hit' | 'heal' | 'ko' | 'guard'
  amount?: number
  crit?: boolean
  weak?: boolean
  element?: string
  voice?: string
}

// 灯脈(§3.3) — 行動者→対象の足元を結ぶ一時的な線。座標は.battle-stageに対する%(0-100)
interface VeinEvent {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  kind: 'atk' | 'heal'
  pulse: boolean // 連撃中は脈動(devil S7: 接触点アニメ自体は既存lungeを維持し、灯脈のみ新規)
}

let fxSeq = 1

// 継足の次撃倍率。行動順bar横の常設表示と中央chain-veinの両方から参照する共通式
function chainMultiplier(chain: number): number {
  return 1 + Math.min(chain + 1, 4) * 0.15
}

export function BattleScreen() {
  const battle = useGame((s) => s.battle)
  const queue = useGame((s) => s.battleLogQueue)
  const drainBattleLog = useGame((s) => s.drainBattleLog)
  const battleCommand = useGame((s) => s.battleCommand)
  const finishBattle = useGame((s) => s.finishBattle)
  const regionId = useGame((s) => s.dungeonRun?.regionId)
  const runLoot = useGame((s) => s.dungeonRun?.loot)
  // 遠征でオートを一度も触っていなければ、設定の「オート既定」を初期値にする
  const initialAuto = useGame((s) => s.dungeonRun?.autoBattle ?? getAutoBattleDefault())
  const setAutoBattleFlag = useGame((s) => s.setAutoBattle)
  const family = useGame((s) => s.data?.family) ?? []

  const [displayed, setDisplayed] = useState<BattleLogEntry[]>([])
  const [pending, setPending] = useState<BattleLogEntry[]>([])
  const [menu, setMenu] = useState<Menu>({ kind: 'root' })
  const [showFullLog, setShowFullLog] = useState(false)
  const [shakeKey, setShakeKey] = useState(0) // ヒット時のstage-shake発火用
  const shakeTimerRef = useRef<number | null>(null)
  const [auto, setAutoRaw] = useState(initialAuto)
  // オート状態は遠征越しに継続 — 変更したら遠征ランへも書き戻す
  const setAuto = (next: boolean) => { setAutoRaw(next); setAutoBattleFlag(next) }
  const [fx, setFx] = useState<Record<string, FxEvent[]>>({})
  const [bossShown, setBossShown] = useState(false)
  const [slotPhase, setSlotPhase] = useState<'spin' | 'done'>('spin')
  const [bossCutinUrl, setBossCutinUrl] = useState<string | null>(null)
  const [ougiCutinUrl, setOugiCutinUrl] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  // M24: コマンド盤右側「選択中の技」プレビュー(技一覧のhover/focusで更新)
  const [previewSkillId, setPreviewSkillId] = useState<string | null>(null)
  // M24: 灯脈(行動者→対象の足元を結ぶ一時的な線)の表示キュー
  const [veins, setVeins] = useState<VeinEvent[]>([])
  const stageRef = useRef<HTMLDivElement>(null)
  const bodyRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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

  // M17: 地域別の戦場背景。主戦は専用主背景→地域別背景→従来のtier共有bg、の3層。
  // 手前の層が未生成(404)でも下の層がそのまま見えるので退避は自然に成立する。
  const stageBgLayers = regionId
    ? [
        ...(isBossBattle ? [bossBgImg(regionId)] : []),
        regionBgR(regionId),
        gameImg(regionById(regionId).bg),
      ]
    : []
  const stageBgCss = stageBgLayers.length > 0 ? stageBgLayers.map((u) => `url(${u})`).join(', ') : undefined

  // 灯脈(§3.3) — 行動者/対象のcombatant-body位置から.battle-stage相対%を求めて一時表示する。
  // 命中後300ms以内に消す。reduced-motionは既存の全体!important規則+battle_m24.cssの明示ルールにより
  // 線が静止フレームのまま残るため、この300ms自体は変えない(情報は保たれる)。
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
    setVeins((old) => [...old, { id, x1: a.x, y1: a.y, x2: t.x, y2: t.y, kind, pulse }])
    window.setTimeout(() => setVeins((old) => old.filter((v) => v.id !== id)), 300)
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
  useEffect(() => {
    const t = setTimeout(() => setSlotPhase('done'), 1500)
    return () => clearTimeout(t)
  }, [])

  // M24 §3.5/§7.1: 対象選択中は数字キー(1〜)でも選べ、Escapeで取消せる(Tab/Enter/Spaceは
  // CombatantNode側のtabIndex/onKeyDownで既に対応済み)
  useEffect(() => {
    if (!battle) return
    if (menu.kind !== 'target' && menu.kind !== 'skill') return
    const pool = menu.kind === 'target'
      ? (menu.side === 'enemy' ? battle.enemies : battle.allies).filter((c) => c.hp > 0)
      : []
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { ev.preventDefault(); setMenu({ kind: 'root' }); return }
      if (menu.kind !== 'target') return
      const n = Number(ev.key)
      if (!Number.isInteger(n) || n < 1 || n > pool.length) return
      ev.preventDefault()
      const target = pool[n - 1]
      battleCommand(
        menu.skillId
          ? { type: 'skill', skillId: menu.skillId, targetKey: target.key }
          : { type: 'attack', targetKey: target.key },
      )
      setMenu({ kind: 'root' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [battle, menu, battleCommand])

  const revealing = pending.length > 0
  const actor = battle ? currentActor(battle) : undefined
  const isPlayerTurn = !!battle && battle.phase === 'input' && !!actor?.isAlly && !revealing

  // オート戦闘
  useEffect(() => {
    if (!auto || !isPlayerTurn || !battle || !actor) return
    const t = setTimeout(() => {
      const foes = battle.enemies.filter((e) => e.hp > 0)
      if (foes.length === 0) return
      const target = battle.chainTarget && foes.some((f) => f.key === battle.chainTarget)
        ? battle.chainTarget
        : foes[0].key
      battleCommand({ type: 'attack', targetKey: target })
    }, 260)
    return () => clearTimeout(t)
  }, [auto, isPlayerTurn, battle, actor, battleCommand])

  // オート中の戦果自動遷移 — 勝利/逃走で、ログを流し切ってから finishBattle
  useEffect(() => {
    if (!auto || !battle || pending.length > 0) return
    if (battle.phase !== 'won' && battle.phase !== 'fled') return
    const t = setTimeout(() => finishBattle(), 1200)
    return () => clearTimeout(t)
  }, [auto, battle, pending.length, finishBattle])

  if (!battle) return null

  const over = battle.phase !== 'input' && battle.phase !== 'anim' && !revealing

  const charOf = (c: Combatant) => family.find((f) => f.id === c.charId)

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
    // 技のターゲット選択中はそれを消化
    if (menu.kind === 'target' && menu.side === 'enemy') {
      if (menu.skillId) tryShowOugiCutin(menu.skillId)
      battleCommand(menu.skillId ? { type: 'skill', skillId: menu.skillId, targetKey: e.key } : { type: 'attack', targetKey: e.key })
      setMenu({ kind: 'root' })
      return
    }
    // それ以外は敵タップ=即通常攻撃(ワンタップ攻撃)
    if (menu.kind === 'root') {
      battleCommand({ type: 'attack', targetKey: e.key })
    }
  }
  // 「攻撃」ボタン=chainTarget/先頭生存敵に即発火(ワンタップ攻撃)
  const doQuickAttack = () => {
    if (!battle || !isPlayerTurn) return
    const foes = battle.enemies.filter((e) => e.hp > 0)
    if (foes.length === 0) return
    const target = battle.chainTarget && foes.some((f) => f.key === battle.chainTarget)
      ? battle.chainTarget
      : foes[0].key
    battleCommand({ type: 'attack', targetKey: target })
  }
  const onAllyClick = (a: Combatant) => {
    if (!isPlayerTurn || a.hp <= 0) return
    if (menu.kind === 'target' && menu.side === 'ally' && menu.skillId) {
      tryShowOugiCutin(menu.skillId)
      battleCommand({ type: 'skill', skillId: menu.skillId, targetKey: a.key })
      setMenu({ kind: 'root' })
    }
  }
  const castSkill = (skillId: string) => {
    const sk = skillById(skillId)
    if (sk.target === 'enemy') setMenu({ kind: 'target', skillId, side: 'enemy' })
    else if (sk.target === 'ally') setMenu({ kind: 'target', skillId, side: 'ally' })
    else {
      tryShowOugiCutin(skillId)
      battleCommand({ type: 'skill', skillId })
      setMenu({ kind: 'root' })
    }
  }

  // M24: 対象選択中の番号バッジ(1始まり。0=非表示)用に、選択可能な生存者だけの並びを求める
  const targetableEnemies = isPlayerTurn && menu.kind === 'target' && menu.side === 'enemy'
    ? battle.enemies.filter((c) => c.hp > 0) : []
  const targetableAllies = isPlayerTurn && menu.kind === 'target' && menu.side === 'ally'
    ? battle.allies.filter((c) => c.hp > 0) : []
  // M24 §3.2: 生存数で--sz/--nを決め、仲間が斃れるほど残存側が大きく・中央寄りになるようにする
  const aliveEnemyCount = battle.enemies.filter((c) => c.hp > 0).length || battle.enemies.length || 1
  const aliveAllyCount = battle.allies.filter((c) => c.hp > 0).length || battle.allies.length || 1
  // M24 §3.4: 対象選択中は狙う技自体の属性で相性を示す(未指定時は行動者の属性のまま=既存挙動)
  const previewElement: Element | undefined =
    menu.kind === 'target' && menu.skillId ? (skillById(menu.skillId).element ?? actor?.element) : actor?.element
  const registerBodyRef = (key: string, el: HTMLDivElement | null) => {
    if (el) bodyRefs.current.set(key, el)
    else bodyRefs.current.delete(key)
  }

  return (
    <div className={`screen battle-screen stage-${stageFamily}`}>
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

      {slotPhase === 'spin' && <LootSlot />}

      <TurnOrderBar battle={battle} />

      <div
        ref={stageRef}
        className={`battle-stage${shakeKey ? ' stage-shake' : ''}${battle.phase === 'won' ? ' stage-won' : ''}${isBossVictory ? ' stage-won-boss' : ''}`}
        data-shake={shakeKey}
      >
        {stageBgCss && <div className="battle-stage-bg" style={{ backgroundImage: stageBgCss }} />}
        <div className="stage-ground" />

        {/* §3.7: 主専用HPゲージ — 通常敵の枠に混ぜず画面上部へ分離 */}
        {isBossBattle && bossCombatant && <BossHpBar boss={bossCombatant} />}

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

        <div className="enemy-side" style={{ ['--n' as string]: aliveEnemyCount }}>
          {battle.enemies.map((e, i) => (
            <CombatantNode
              key={e.key}
              c={e}
              index={i}
              count={aliveEnemyCount}
              fx={fx[e.key] ?? []}
              targetable={isPlayerTurn && menu.kind === 'target' && menu.side === 'enemy' && e.hp > 0}
              clickable={isPlayerTurn && menu.kind === 'root' && e.hp > 0}
              chainBadge={battle.chainTarget === e.key && battle.chain > 0 ? battle.chain + 1 : 0}
              leader={battle.leaderKey === e.key}
              isBoss={!!e.enemyId?.startsWith('boss_')}
              targetNumber={targetableEnemies.indexOf(e) + 1}
              elementBadge={{ el: e.element, adv: isPlayerTurn && actor?.isAlly ? matchup(previewElement, e.element) : 'even' }}
              onClick={() => onEnemyClick(e)}
              onBodyRef={registerBodyRef}
            >
              <EnemyVisual2 e={e} />
            </CombatantNode>
          ))}
        </div>

        <div className="ally-side" style={{ ['--n' as string]: aliveAllyCount }}>
          {battle.allies.map((a, i) => {
            const ch = charOf(a)
            return (
              <CombatantNode
                key={a.key}
                c={a}
                index={i}
                count={aliveAllyCount}
                fx={fx[a.key] ?? []}
                targetable={isPlayerTurn && menu.kind === 'target' && menu.side === 'ally' && a.hp > 0}
                acting={actor?.key === a.key && battle.phase === 'input'}
                chainBadge={0}
                targetNumber={targetableAllies.indexOf(a) + 1}
                onClick={() => onAllyClick(a)}
                onBodyRef={registerBodyRef}
              >
                <AllyVisual gata={ch?.tomoshigata ?? 'homura'} sex={ch?.sex ?? 'm'} element={a.element} />
              </CombatantNode>
            )
          })}
        </div>

        <VeinLayer veins={veins} />

        {/* 戦況ログ — 直近一行を戦場下端に重ね、全履歴は「記」で展開(§3.4/§5.4) */}
        <div className="battle-log-strip">
          {displayed.slice(-1).map((l, i) => (
            <p key={`${displayed.length}-${i}`} className={`log-${l.kind}`}>{l.text}</p>
          ))}
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
            <p className="victory-line">
              {battle.phase === 'won' ? '勝鬨を上げよ — 夜藪に僅かな静けさが戻った' : battle.phase === 'fled' ? '一族は闇に紛れて退いた' : '一族の灯が、闇に呑まれた……'}
            </p>
            {battle.phase === 'won' && runLoot && (runLoot.hoto > 0 || runLoot.ketsu > 0 || runLoot.items.length > 0) && (
              <p className="victory-loot">
                この夜の実り — 奉燈 <b>{runLoot.hoto}</b> ／ 血珠 <b>{runLoot.ketsu}</b>
                {runLoot.items.length > 0 && <> ／ 遺物 <b>{runLoot.items.length}</b></>}
              </p>
            )}
            <button className="btn btn-main" onClick={finishBattle}>
              {battle.phase === 'won' ? '戦果を得る' : battle.phase === 'fled' ? '先へ' : '……'}
            </button>
          </div>
        ) : (
          <>
            {/* 左: 現在手番の名/HP/MP/状態。隊全体の灯力(MP)は誰の番でも常時1行維持(§3.4/§3.5) */}
            <div className="turnpanel-actor">
              {actor?.isAlly ? (
                <>
                  <div className="turnpanel-actor-name">
                    {actor.name}
                    {actor.guard && <span className="status-chip" title="防御中">防</span>}
                    {!!actor.buffs.atkUp && <span className="status-chip" title="攻撃上昇中">攻↑</span>}
                    {!!actor.buffs.defUp && <span className="status-chip" title="防御上昇中">守↑</span>}
                  </div>
                  <Bar value={actor.hp} max={actor.maxHp} kind="hp" />
                  <Bar value={actor.mp} max={actor.maxMp} kind="mp" />
                </>
              ) : (
                <p className="cmd-hint-line">{revealing ? '' : '……'}</p>
              )}
              <div className="turnpanel-party-mp">
                {battle.allies.map((a) => (
                  <span key={a.key} className={`${actor?.key === a.key ? 'is-now' : ''} ${a.hp <= 0 ? 'is-dead' : ''}`}>
                    {a.name.slice(0, 1)}{a.mp}/{a.maxMp}
                  </span>
                ))}
              </div>
            </div>

            {/* 中央: 主要4コマンド(2×2+オート)/技一覧/対象選択ヒント(§3.5) */}
            <div className="turnpanel-center">
              {isPlayerTurn && menu.kind === 'root' && (
                <div className="cmd-grid">
                  <button className="cmd-btn cmd-main" onClick={doQuickAttack}>攻撃</button>
                  <button
                    className="cmd-btn"
                    onClick={() => { setMenu({ kind: 'skill' }); setPreviewSkillId(actor?.skills[0] ?? null) }}
                  >
                    技
                  </button>
                  <button className="cmd-btn" onClick={() => battleCommand({ type: 'guard' })}>防御</button>
                  <button className="cmd-btn" onClick={() => battleCommand({ type: 'flee' })}>逃げる</button>
                  <button className={`cmd-btn cmd-ghost cmd-auto ${auto ? 'cmd-on' : ''}`} onClick={() => setAuto(!auto)}>
                    {auto ? 'オート中' : 'オート'}
                  </button>
                </div>
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
                          <span className="mp-cost">{sk.mpCost}</span>
                        </button>
                      )
                    })}
                  </div>
                  {/* 戻るはスクロール外に固定(§3.8/§5.4) */}
                  <button className="cmd-btn cmd-ghost skill-back" onClick={() => setMenu({ kind: 'root' })}>選ばず戻る</button>
                </div>
              )}
              {isPlayerTurn && menu.kind === 'target' && (
                <div className="target-hint">
                  <p className="cmd-hint-line">{menu.side === 'enemy' ? '狙う魔性を選べ' : '授ける相手を選べ'}</p>
                  <p className="cmd-hint-line cmd-hint-sub">数字キー・Tabで選択/Escで取消</p>
                  <button className="cmd-btn cmd-ghost" onClick={() => setMenu({ kind: 'root' })}>やめる</button>
                </div>
              )}
              {!isPlayerTurn && <p className="cmd-hint-line">{revealing ? '' : '……'}</p>}
            </div>

            {/* 右: 選択中の技の威力/属性/消費/対象範囲(§3.5)。対象相性は戦場上の相性バッジ側で示す */}
            <div className="turnpanel-detail">
              <SkillDetailPanel skillId={menu.kind === 'target' ? menu.skillId : menu.kind === 'skill' ? previewSkillId : null} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 第N巡と、現在から最大6手の行動順(§5.4「上段行動順」)。§3.3: 次撃倍率をここへ常設する
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
    <div className="turn-order" aria-label="行動順">
      <span className="turn-order-turn">第{battle.turn}巡</span>
      {mult !== null && <span className="turn-chain-mult" title="次撃倍率">次撃×{mult.toFixed(2)}</span>}
      {seq.map((c, i) => (
        <span key={`${c.key}-${i}`} className={`turn-chip ${c.isAlly ? 'is-ally' : 'is-enemy'} ${i === 0 ? 'is-now' : ''}`}>
          {i === 0 && <em>今</em>}{c.name}
        </span>
      ))}
    </div>
  )
}

// 灯脈オーバーレイ — .battle-stage全体に重ね、%座標のlineで行動者→対象の足元を結ぶ(§3.3)
function VeinLayer({ veins }: { veins: VeinEvent[] }) {
  if (veins.length === 0) return null
  return (
    <svg className="hitvein-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {veins.map((v) => (
        <line
          key={v.id}
          x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}
          className={`hitvein-line ${v.kind === 'heal' ? 'hitvein-heal' : ''} ${v.pulse ? 'hitvein-pulse' : ''}`}
        />
      ))}
    </svg>
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
function CombatantNode({
  c, index, count, fx, targetable, clickable, acting, chainBadge, leader, isBoss, targetNumber, elementBadge, onClick, onBodyRef, children,
}: {
  c: Combatant
  index: number
  count: number // 同陣営の総数(中央寄せ+人数連動サイズ用)
  fx: FxEvent[]
  targetable: boolean
  clickable?: boolean
  acting?: boolean
  chainBadge: number
  leader?: boolean
  isBoss?: boolean
  targetNumber?: number // 対象選択中の1始まり番号(0以下=非表示)
  elementBadge?: { el: Element; adv: Matchup }
  onClick: () => void
  onBodyRef?: (key: string, el: HTMLDivElement | null) => void
  children: React.ReactNode
}) {
  const lunge = fx.some((f) => f.kind === 'lunge')
  const hit = fx.find((f) => f.kind === 'hit')
  const heal = fx.find((f) => f.kind === 'heal')
  const ko = fx.some((f) => f.kind === 'ko')
  const voice = fx.find((f) => f.voice)
  const depth = index % 2 // 雁行の前後
  const interactive = targetable || !!clickable
  return (
    <div
      className={[
        'combatant',
        c.isAlly ? 'is-ally' : 'is-enemy',
        c.hp <= 0 ? 'dead' : '',
        targetable ? 'targetable' : '',
        acting ? 'acting' : '',
        isBoss ? 'is-boss' : '',
        lunge ? 'fx-lunge' : '',
        hit ? 'fx-hit' : '',
        ko ? 'fx-ko' : '',
      ].join(' ')}
      style={{
        ['--slot' as string]: index,
        ['--depth' as string]: depth,
        ['--sz' as string]: 1 + Math.max(0, 4 - count) * 0.12, // 人数が少ないほど大きく
      }}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={`${c.name} 体力${c.hp}/${c.maxHp}`}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() }
      }}
    >
      {!!targetNumber && targetNumber > 0 && <span className="target-num-badge" aria-hidden>{targetNumber}</span>}
      {voice && <div className="voice-bubble">{voice.voice}</div>}
      <span className="combatant-shadow" aria-hidden />
      <div className="combatant-body" ref={(el) => onBodyRef?.(c.key, el)}>{children}</div>
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
      <div className="combatant-plate">
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

// 敵の見た目v2 — 実画像→無ければSVGシルエット妖怪(属性オーラ+眼+呼吸)
const SPECIES_BY_ELEMENT: Record<string, 'beast' | 'wisp' | 'oni' | 'float'> = {
  fire: 'wisp', moon: 'float', star: 'float', water: 'float', wind: 'beast', earth: 'oni',
}

// M17: variantsOf()が_w/_o専用絵を付与するため、退避連鎖は「変異絵→基礎種絵→SVG」の3段
function baseSpriteOf(sprite: string): string | null {
  return /_[wo]\.png$/.test(sprite) ? sprite.replace(/_[wo]\.png$/, '.png') : null
}

function EnemyVisual2({ e }: { e: Combatant }) {
  const def = e.enemyId ? enemyById(e.enemyId) : null
  const [stage, setStage] = useState<'primary' | 'base' | 'svg'>('primary')
  const key = e.enemyId ?? def?.sprite ?? e.key
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setStage('primary')
  }
  if (def && stage !== 'svg') {
    const baseSprite = baseSpriteOf(def.sprite)
    const src = stage === 'base' && baseSprite ? gameImg(baseSprite) : gameImg(def.sprite)
    const onError = () => {
      if (stage === 'primary' && baseSprite) setStage('base')
      else setStage('svg')
    }
    return (
      <span className="enemy-sprite2">
        <img className="enemy-img" src={src} alt="" onError={onError} />
      </span>
    )
  }
  const tier = def?.tier ?? 1
  const species = SPECIES_BY_ELEMENT[e.element] ?? 'beast'
  const scale = 0.9 + tier * 0.14
  return (
    <span className={`enemy-sprite2 silhouette sp-${species}`} data-el={e.element} style={{ ['--sc' as string]: scale }}>
      <svg viewBox="-30 -56 60 60" width={76 * scale} height={76 * scale}>
        <ellipse cx="0" cy="-18" rx="26" ry="22" className="aura" />
        {species === 'beast' && (
          <g className="body">
            <ellipse cx="0" cy="-10" rx="15" ry="11" />
            <ellipse cx="-11" cy="-17" rx="5.5" ry="6.5" />
            <path d="M-16,-21 L-13,-30 L-9,-22 Z" />
            <path d="M-9,-23 L-6,-29 L-3,-22 Z" />
            <path d="M14,-12 Q24,-19 20,-5 Q16,-9 13,-8 Z" />
          </g>
        )}
        {species === 'wisp' && (
          <g className="body">
            <path d="M0,-34 Q12,-24 9,-10 Q7,-1 0,0 Q-7,-1 -9,-10 Q-12,-24 0,-34 Z" />
            <path d="M8,-26 Q15,-31 12,-19 Z" />
            <path d="M-8,-28 Q-14,-33 -11,-20 Z" />
          </g>
        )}
        {species === 'oni' && (
          <g className="body">
            <ellipse cx="0" cy="-12" rx="14" ry="13" />
            <rect x="-10" y="-5" width="20" height="5" />
            <path d="M-8,-22 L-5,-30 L-2,-22 Z" />
            <path d="M2,-22 L5,-30 L8,-22 Z" />
          </g>
        )}
        {species === 'float' && (
          <g className="body">
            <circle cx="0" cy="-18" r="12" />
            <path d="M9,-13 Q19,-8 14,-1 Q10,-6 6,-8 Z" />
            <path d="M-9,-14 Q-17,-7 -12,-2 Q-9,-6 -5,-9 Z" />
          </g>
        )}
        <circle cx="-4.5" cy="-18" r="2.4" className="eye" />
        <circle cx="4.5" cy="-18" r="2.4" className="eye" />
        {tier >= 3 && <circle cx="0" cy="-24" r="2" className="eye" />}
      </svg>
    </span>
  )
}

// 報酬予告スロット(俺屍PSP準拠の開幕演出 — 表示は雰囲気、実報酬は勝利時に確定。
// §3.4: 戦況判断を遮らないよう右上へ小さく置く(位置/縮小はbattle_m24.css側)
const SLOT_POOL = ['奉燈', '血珠', '武具', '霊薬', '宝珠', '古銭', '巻物', '香木']

function LootSlot() {
  return (
    <div className="loot-slot">
      <span className="slot-label">報酬予告</span>
      {[0, 1, 2].map((i) => (
        <span key={i} className="slot-reel" style={{ animationDelay: `${i * 0.12}s` }}>
          <span className="slot-strip">
            {[...SLOT_POOL, ...SLOT_POOL].map((s, j) => (
              <span key={j} className="slot-item">{s}</span>
            ))}
          </span>
        </span>
      ))}
    </div>
  )
}
