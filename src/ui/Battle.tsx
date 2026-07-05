// 戦闘画面(品質刷新v3.1 M8) — 俺屍様式の側面視ステージ
// 敵は左に雁行、味方は右に雁行(歩行スプライト流用)。演出はBattleLogEntryのメタデータ駆動:
// 踏み込み→被弾フラッシュ→ダメージ数字ポップ→KO溶暗。属性別バースト、行動者の題字タグ、
// 戦利品スロット(M12-5)、台詞チャネル(M15-1土台: kind:'voice')を備える。
import { useEffect, useRef, useState } from 'react'
import { useGame } from '../core/store'
import type { BattleLogEntry, Combatant, Element } from '../core/types'
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

let fxSeq = 1

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

  const stageFamily = (() => {
    if (!regionId) return 'forest'
    const bg = regionById(regionId).bg
    if (bg.includes('zaka')) return 'zaka'
    if (bg.includes('tani')) return 'tani'
    if (bg.includes('miyama')) return 'miyama'
    return 'forest'
  })()

  const isBossBattle = !!battle?.enemies.some((e) => e.enemyId?.startsWith('boss_'))
  const bossName = battle?.enemies.find((e) => e.enemyId?.startsWith('boss_'))?.name

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

  // 演出キューへ変換
  const applyFx = (entry: BattleLogEntry) => {
    const events: [string, FxEvent][] = []
    const mk = (kind: FxEvent['kind'], extra?: Partial<FxEvent>): FxEvent => ({ id: fxSeq++, kind, ...extra })
    if (entry.kind === 'dmg') {
      if (entry.actorKey) events.push([entry.actorKey, mk('lunge')])
      if (entry.targetKey)
        events.push([entry.targetKey, mk('hit', { amount: entry.amount, crit: entry.crit, weak: entry.weak, element: entry.element })])
      // ヒットで戦場全体を一瞬揺らす(critはより強く)。連続hitでも次のkey変化でリスタート。
      setShakeKey((k) => k + 1)
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current)
      shakeTimerRef.current = window.setTimeout(() => setShakeKey(0), 260)
    } else if (entry.kind === 'heal') {
      if (entry.actorKey) events.push([entry.actorKey, mk('lunge')])
      if (entry.targetKey) events.push([entry.targetKey, mk('heal', { amount: entry.amount, element: entry.element })])
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
    const bossId = battle?.enemies.find((e) => e.enemyId?.startsWith('boss_'))?.enemyId
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

      <div className={`battle-stage${shakeKey ? ' stage-shake' : ''}${battle.phase === 'won' ? ' stage-won' : ''}`} data-shake={shakeKey}>
        {stageBgCss && <div className="battle-stage-bg" style={{ backgroundImage: stageBgCss }} />}
        <div className="stage-ground" />

        {isPlayerTurn && actor && (
          <div className="turn-banner" key={actor.key}>
            {actor.name}
          </div>
        )}

        <div className="enemy-side">
          {battle.enemies.map((e, i) => (
            <CombatantNode
              key={e.key}
              c={e}
              index={i}
              fx={fx[e.key] ?? []}
              targetable={isPlayerTurn && menu.kind === 'target' && menu.side === 'enemy' && e.hp > 0}
              chainBadge={battle.chainTarget === e.key && battle.chain > 0 ? battle.chain + 1 : 0}
              leader={battle.leaderKey === e.key}
              elementBadge={{ el: e.element, adv: isPlayerTurn && actor?.isAlly ? matchup(actor.element, e.element) : 'even' }}
              onClick={() => onEnemyClick(e)}
            >
              <EnemyVisual2 e={e} />
            </CombatantNode>
          ))}
        </div>

        <div className="ally-side">
          {battle.allies.map((a, i) => {
            const ch = charOf(a)
            return (
              <CombatantNode
                key={a.key}
                c={a}
                index={i}
                fx={fx[a.key] ?? []}
                targetable={isPlayerTurn && menu.kind === 'target' && menu.side === 'ally' && a.hp > 0}
                acting={actor?.key === a.key && battle.phase === 'input'}
                chainBadge={0}
                onClick={() => onAllyClick(a)}
              >
                <AllyVisual gata={ch?.tomoshigata ?? 'homura'} sex={ch?.sex ?? 'm'} element={a.element} />
              </CombatantNode>
            )
          })}
        </div>
      </div>

      <div className="battle-log" ref={logRef}>
        {displayed.slice(-24).map((l, i) => (
          <p key={i} className={`log-${l.kind}`}>{l.text}</p>
        ))}
      </div>

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
            <div className="cmd-panel">
              {isPlayerTurn && menu.kind === 'root' && (
                <>
                  <button className="cmd-btn cmd-main" onClick={doQuickAttack}>攻撃</button>
                  <button className="cmd-btn" onClick={() => setMenu({ kind: 'skill' })}>技</button>
                  <button className="cmd-btn" onClick={() => battleCommand({ type: 'guard' })}>防御</button>
                  <button className="cmd-btn" onClick={() => battleCommand({ type: 'flee' })}>逃げる</button>
                  <button className={`cmd-btn cmd-ghost ${auto ? 'cmd-on' : ''}`} onClick={() => setAuto(!auto)}>
                    {auto ? 'オート中' : 'オート'}
                  </button>
                </>
              )}
              {isPlayerTurn && menu.kind === 'skill' && actor && (
                <div className="skill-list">
                  {actor.skills.map((id) => {
                    const sk = skillById(id)
                    return (
                      <button key={id} className="cmd-btn" disabled={actor.mp < sk.mpCost} onClick={() => castSkill(id)}>
                        <MaybeImg src={skillIcon(sk.id)} className="sk-ico" />
                        {sk.name} <span className="mp-cost">{sk.mpCost}</span>
                      </button>
                    )
                  })}
                  <button className="cmd-btn cmd-ghost" onClick={() => setMenu({ kind: 'root' })}>戻る</button>
                </div>
              )}
              {isPlayerTurn && menu.kind === 'target' && (
                <>
                  <p className="cmd-hint-line">的を選べ</p>
                  <button className="cmd-btn cmd-ghost" onClick={() => setMenu({ kind: 'root' })}>やめる</button>
                </>
              )}
              {isPlayerTurn && menu.kind === 'root' && (
                <p className="cmd-hint-line" style={{ opacity: 0.6, fontSize: 11 }}>攻撃=chain継続 / 敵をタップして狙う</p>
              )}
              {!isPlayerTurn && <p className="cmd-hint-line">{revealing ? '' : '……'}</p>}
            </div>

            <div className="member-cards">
              {battle.allies.map((a) => (
                <div
                  key={a.key}
                  className={`member-card ${a.hp <= 0 ? 'dead' : ''} ${actor?.key === a.key && battle.phase === 'input' ? 'acting' : ''}`}
                  onClick={() => onAllyClick(a)}
                >
                  <div className="member-name">
                    {a.name}
                    <span className="row-tag">{a.row === 'front' ? '前' : '後'}</span>
                    {a.guard && <span className="row-tag">防</span>}
                  </div>
                  <div className="member-stat">
                    <span className="stat-key">体</span>
                    <span className="stat-num">{a.hp}</span>
                    <Bar value={a.hp} max={a.maxHp} kind="hp" />
                  </div>
                  <div className="member-stat">
                    <span className="stat-key">技</span>
                    <span className="stat-num">{a.mp}</span>
                    <Bar value={a.mp} max={a.maxMp} kind="mp" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 配置スロット+演出クラスを与える共通ラッパ
function CombatantNode({
  c, index, fx, targetable, acting, chainBadge, leader, elementBadge, onClick, children,
}: {
  c: Combatant
  index: number
  fx: FxEvent[]
  targetable: boolean
  acting?: boolean
  chainBadge: number
  leader?: boolean
  elementBadge?: { el: Element; adv: Matchup }
  onClick: () => void
  children: React.ReactNode
}) {
  const lunge = fx.some((f) => f.kind === 'lunge')
  const hit = fx.find((f) => f.kind === 'hit')
  const heal = fx.find((f) => f.kind === 'heal')
  const ko = fx.some((f) => f.kind === 'ko')
  const voice = fx.find((f) => f.voice)
  const depth = index % 2 // 雁行の前後
  return (
    <div
      className={[
        'combatant',
        c.isAlly ? 'is-ally' : 'is-enemy',
        c.hp <= 0 ? 'dead' : '',
        targetable ? 'targetable' : '',
        acting ? 'acting' : '',
        lunge ? 'fx-lunge' : '',
        hit ? 'fx-hit' : '',
        ko ? 'fx-ko' : '',
      ].join(' ')}
      style={{ ['--slot' as string]: index, ['--depth' as string]: depth }}
      onClick={onClick}
    >
      {voice && <div className="voice-bubble">{voice.voice}</div>}
      <div className="combatant-body">{children}</div>
      {hit && (
        <>
          <span className={`dmg-pop ${hit.crit ? 'crit' : ''} ${hit.weak ? 'weak' : ''}`}>
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

// 戦利品スロット(俺屍PSP準拠の開幕演出 — 表示は雰囲気、実報酬は勝利時に確定)
const SLOT_POOL = ['奉燈', '血珠', '武具', '霊薬', '宝珠', '古銭', '巻物', '香木']

function LootSlot() {
  return (
    <div className="loot-slot">
      <span className="slot-label">戦利品</span>
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
