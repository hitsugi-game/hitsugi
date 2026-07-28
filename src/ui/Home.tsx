import { useEffect, useMemo, useRef, useState } from 'react'
import { LANTERN_TENDING_COST, LANTERN_TENDING_RATIO, useGame } from '../core/store'
import { seasonLabel, isFestivalMonth, MOTTOS } from '../core/types'
import type { MottoId, Element, GenerationVowId } from '../core/types'
import { GENERATION_VOWS, isAdult, seasonsLeft } from '../core/inheritance'
import { isStarLotteryUnlocked, remainingStarLotteryDraws } from '../core/star_lottery'
import { GODS } from '../core/data/gods'
import { ENEMIES } from '../core/data/enemies'
import { REGIONS } from '../core/data/regions'
import { GOSSIP } from '../core/data/gossip'
import { FAMILIAR_KINDS } from '../core/data/familiars'
import { todaysOdai } from '../core/data/dailyOdai'
import type { GameData } from '../core/types'
import type { NarrativeScene } from '../core/types'
import { generationQuestion, narrativeSceneId, returnTraces } from '../core/narrative'
import { census, recommendAction, nextMonthNotes, ledgerStats, type ActionKind } from './homeInsight'
import { Sheet, StatusCallout, LiveBadge, LifeThread } from './layout/shell'
import { CharCard, Ico, NightBackdrop, Panel } from './components'
import { gameImg, HOME_BG, HOME_BG_SEASONS } from './img'
import { FamilyTree } from './FamilyTree'
import './m17_home.css'
import './home_m26.css'
import './home_polish_m29.css' // M29+: 郷ホームの視覚改善(情報階層・カードの奥行き。後勝ち)
import './m46_progression.css'

function sceneLabel(scene: NarrativeScene): string {
  switch (scene.kind) {
    case 'birth': return '誕生 — 名を家譜へ'
    case 'death': return '看取り — 八季の生涯'
    case 'ceremony': return '成人の儀 — 灯座を選ぶ'
    case 'jobrite': return '生業の儀 — 家業を選ぶ'
    case 'dream': return '夢渡り — 名のない楽士'
    case 'dreamEp': return '夢渡り — 千年前の記憶'
    case 'life': return scene.title
  }
}

function sceneHint(scene: NarrativeScene): string {
  if (scene.kind === 'death') return '最期の言葉を、いつでも記せる。'
  if (scene.kind === 'birth' || scene.kind === 'ceremony' || scene.kind === 'jobrite') return '一族の節目。選択は失われない。'
  if (scene.kind === 'dream' || scene.kind === 'dreamEp') return '夢は逃げない。今読むか、また後で。'
  return '家譜へ綴じる前の一場面。'
}

export function HomeScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const departDungeon = useGame((s) => s.departDungeon)
  const doFestival = useGame((s) => s.doFestival)
  const doRest = useGame((s) => s.doRest)
  const tendLantern = useGame((s) => s.tendLantern)
  const markGossipSeen = useGame((s) => s.markGossipSeen)
  const dailyVisit = useGame((s) => s.dailyVisit)
  const consumeLegacyShioriRecap = useGame((s) => s.consumeLegacyShioriRecap)
  const consumeDeferredReminder = useGame((s) => s.consumeDeferredReminder)
  const openDeferredScene = useGame((s) => s.openDeferredScene)
  const replayNarrativeScene = useGame((s) => s.replayNarrativeScene)
  const designateHeir = useGame((s) => s.designateHeir)
  const setGenerationVow = useGame((s) => s.setGenerationVow)
  const [visitGift, setVisitGift] = useState<{ text: string; hoto: number; ketsu: number } | null>(null)
  const [legacyRecap, setLegacyRecap] = useState<string | null>(null)
  const [deferredReminder, setDeferredReminder] = useState<NarrativeScene | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showMotto, setShowMotto] = useState(false)
  const [showTree, setShowTree] = useState(false)
  const [showGossip, setShowGossip] = useState(false)
  const [showFamiliars, setShowFamiliars] = useState(false)
  const [showObjectives, setShowObjectives] = useState(false)
  const [showStoryMargin, setShowStoryMargin] = useState(false)
  const [showAllArchive, setShowAllArchive] = useState(false)
  const [showSuccessionPlan, setShowSuccessionPlan] = useState(false)
  const [decisionAttention, setDecisionAttention] = useState(false)

  const alive = data.family.filter((c) => c.alive)
  const adults = alive.filter((c) => isAdult(c, data.seasonIndex))
  const cheapestPact = Math.min(...GODS.map((g) => g.cost))
  const canPact = adults.length > 0 && data.hoto >= cheapestPact
  // M18 P2: 血脈診断・状況別推奨・月送り確認・郷の帳
  const cen = useMemo(() => census(data), [data])
  const rec = useMemo(() => recommendAction(data), [data])
  // M43: 複数の助言器を競合させず、身体危機を血脈拡張より優先する。
  const priorityRec = cen.dying.length > 0
    ? { action: 'rest' as const, reason: `瀕死の${cen.dying.map((c) => c.name).join('・')}を先に癒す。命を立て直してから次代と夜藪を考える。` }
    : rec
  const nextCandidate = priorityRec.action === 'rest'
    ? (!cen.hasHeir && canPact ? '傷が癒えたら星契り' : '傷が癒えたら出立')
    : priorityRec.action === 'pact' ? '子を授けたら出立' : !cen.hasHeir && canPact ? '実りを得たら星契り' : '帰還後に一族を見直す'
  const [confirm, setConfirm] = useState<'festival' | 'rest' | null>(null)
  const famRef = useRef<HTMLDivElement>(null)
  const actRef = useRef<HTMLDivElement>(null)
  const ledRef = useRef<HTMLDivElement>(null)
  const decisionAttentionTimer = useRef<number | null>(null)
  const jumpToDecisions = () => {
    const target = actRef.current
    if (!target) return
    if (decisionAttentionTimer.current !== null) window.clearTimeout(decisionAttentionTimer.current)
    setDecisionAttention(true)
    // 「決断を見る」は装飾的な移動ではなく操作の結果なので、長いtablet画面でも
    // 中間位置に止まったように見せない。金縁の応答を残し、移動とfocusは即時確定する。
    target.scrollIntoView({ behavior: 'auto', block: 'start' })
    window.setTimeout(() => {
      target.querySelector<HTMLButtonElement>('.action-cards button:not(:disabled)')?.focus({ preventScroll: true })
    }, 0)
    decisionAttentionTimer.current = window.setTimeout(() => setDecisionAttention(false), 1600)
  }
  useEffect(() => () => {
    if (decisionAttentionTimer.current !== null) window.clearTimeout(decisionAttentionTimer.current)
  }, [])
  const crisis = !cen.hasHeir || cen.dying.length > 0
  const crisisTitle = [
    cen.alive.length <= 1 && !cen.hasHeir ? '後継なし' : '',
    cen.dying.length > 0 ? `${cen.dying.map((c) => c.name).join('・')} 瀕死` : '',
  ].filter(Boolean).join(' / ')
  // 日参り — 郷に戻った初回(実日付が変わっていれば)綴が控えめに迎える。streakなし・煽らない。
  // StrictModeの二重effectで2回目がnullを返しバナーを打ち消すのを、ref一度きりガードで防ぐ。
  const visitCheckedRef = useRef(false)
  const legacyCheckedRef = useRef(false)
  const reminderCheckedRef = useRef(false)
  const hasReturned = Boolean(data.narrative?.lastReturn)
    || data.family.some((character) => character.expeditions > 0)
    || data.regionsCleared.length > 0
  useEffect(() => {
    // 新しい家の第一声を報酬にしない。最初の帰還を果たした家だけ日参りを受け取る。
    if (visitCheckedRef.current || !hasReturned) return
    visitCheckedRef.current = true
    setVisitGift(dailyVisit())
  }, [dailyVisit, hasReturned])
  useEffect(() => {
    if (legacyCheckedRef.current) return
    legacyCheckedRef.current = true
    setLegacyRecap(consumeLegacyShioriRecap())
  }, [consumeLegacyShioriRecap])
  useEffect(() => {
    if (reminderCheckedRef.current) return
    reminderCheckedRef.current = true
    setDeferredReminder(consumeDeferredReminder())
  }, [consumeDeferredReminder])

  const deferredStories = data.narrative?.deferred ?? []
  const archivedStories = data.narrative?.archive ?? []
  const currentQuestion = data.narrative?.generationQuestion ?? generationQuestion(data)
  const latestReturnTraces = returnTraces(data)

  return (
    <div className="screen home-screen">
      <NightBackdrop bg={gameImg(HOME_BG_SEASONS[Math.floor((data.seasonIndex % 12) / 3)] ?? HOME_BG)} />

      <header className="home-header">
        <span className="season-label">{seasonLabel(data.seasonIndex)}</span>
        <div className="resource-strip">
          <span className="resource"><Ico name="ic_hoto" fb="燈" size={18} /><span className="res-label">奉燈</span><b>{data.hoto}</b></span>
          <span className="resource"><Ico name="ic_ketsu" fb="珠" size={18} /><span className="res-label">血珠</span><b>{data.ketsu}</b></span>
          <span className="resource"><Ico name="ic_buko" fb="功" size={18} /><span className="res-label">武功</span><b>{data.fame}</b></span>
        </div>
      </header>

      {visitGift && (
        <div className="daily-visit">
          <span className="daily-visit-mark">参</span>
          <span className="daily-visit-body">
            <b>綴</b>「{visitGift.text}」
            <span className="daily-visit-reward">
              日参りの授かり — 奉燈 {visitGift.hoto}{visitGift.ketsu ? ` ・ 血珠 ${visitGift.ketsu}` : ''}
            </span>
          </span>
          <button
            type="button"
            className="daily-visit-close"
            onClick={() => setVisitGift(null)}
            data-testid="nippari-close"
          >
            閉じる
          </button>
        </div>
      )}

      {legacyRecap && (
        <div className="daily-visit narrative-recap" role="status">
          <span className="daily-visit-mark">記</span>
          <span className="daily-visit-body"><b>家譜の補記</b><span className="daily-visit-reward">{legacyRecap}</span></span>
          <button type="button" className="daily-visit-close" onClick={() => setLegacyRecap(null)}>閉じる</button>
        </div>
      )}

      {deferredReminder && (
        <div className="daily-visit narrative-recap" role="status" data-testid="narrative-overdue-reminder">
          <span className="daily-visit-mark">灯</span>
          <span className="daily-visit-body"><b>灯の余白</b><span className="daily-visit-reward">「{sceneLabel(deferredReminder)}」は、急がずここから続きを読める。</span></span>
          <button type="button" className="daily-visit-close" onClick={() => setDeferredReminder(null)}>閉じる</button>
        </div>
      )}

      <StatusCallout
        kind={crisis ? 'crisis' : 'info'}
        title={crisis ? `今月の最優先 — ${crisisTitle}` : `今月の最優先 — ${ACTION_LABEL[priorityRec.action]}`}
        action={<button type="button" className="btn" data-testid="decision-jump" aria-controls="monthly-decisions" onClick={jumpToDecisions}>決断を見る</button>}
      >
        {priorityRec.reason}　次月候補: {nextCandidate}
      </StatusCallout>

      <section className="narrative-now" aria-labelledby="narrative-now-title">
        <div>
          <span className="narrative-kicker">今月の物語</span>
          <h2 id="narrative-now-title">{deferredStories.length > 0 ? sceneLabel(deferredStories[0]) : latestReturnTraces[0]?.text ?? '灯は、歩いた先で物語になる'}</h2>
          <p>{deferredStories.length > 0 ? `${deferredStories.length}件を後で読める。` : currentQuestion}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowStoryMargin(true)}>
          灯の余白{deferredStories.length > 0 ? ` (${deferredStories.length})` : ''}
        </button>
      </section>

      <div className="home-core-grid">
      <div ref={famRef} className="home-core-family">
        <Panel title="燈守家の一族">
          <FamilyBoard data={data} onTendLantern={tendLantern} />
        </Panel>
      </div>

      <div
        ref={actRef}
        id="monthly-decisions"
        className={`home-core-actions ${decisionAttention ? 'is-jump-target' : ''}`}
        aria-label="今月の決断"
      >
      <Panel title="今月の決断 — 一つ選べば月が替わる">
        <p className="rec-reason"><span className="rec-mark">薦</span>綴の見立て — {priorityRec.reason}</p>
        <div className="action-cards">
          <ActionCard
            primary={priorityRec.action === 'depart'} rec={priorityRec.action === 'depart'}
            iconName="ic_expedition" iconFb="出" title="出立 — 夜藪へ"
            desc="夜藪へ潜り、奉燈と血珠を得る。深いほど実り多い。"
            disabled={adults.length === 0}
            note={adults.length === 0 ? '出立できる大人がいない' : undefined}
            onClick={() => setScreen({ id: 'depart' })}
          />
          <ActionCard
            rec={priorityRec.action === 'pact'}
            iconName="ic_pact" iconFb="契" title="星契り — 次代を授かる"
            desc="星神と契り、翌月に子を授かる。血を絶やすな。"
            disabled={!canPact}
            note={
              adults.length === 0 ? '契れる大人がいない'
                : data.hoto < cheapestPact ? `奉燈があと${cheapestPact - data.hoto}要る`
                  : undefined
            }
            onClick={() => setScreen({ id: 'pact' })}
          />
          <ActionCard
            rec={priorityRec.action === 'festival'}
            iconName={`fes_${['haru', 'natsu', 'aki', 'fuyu'][Math.floor((data.seasonIndex % 12) / 3)]}`} iconFb="祭" title="祭 — 郷を潤す"
            desc={isFestivalMonth(data.seasonIndex)
              ? '奉燈30を捧げ、一族の傷と心労を癒す。星との縁も深まる。'
              : '祭は季の変わり目(弥生・水無月・長月・師走)だけ開ける。'}
            disabled={data.hoto < 30 || !isFestivalMonth(data.seasonIndex)}
            note={
              !isFestivalMonth(data.seasonIndex) ? '今は祭月でない'
                : data.hoto < 30 ? '奉燈が足りない'
                  : undefined
            }
            onClick={() => setConfirm('festival')}
          />
          <ActionCard
            rec={priorityRec.action === 'rest'}
            iconName="ic_rest" iconFb="憩" title="静養 — 傷を癒す"
            desc="隊の傷と心労を癒す。何もない月も、月は替わる。"
            onClick={() => setConfirm('rest')}
          />
        </div>
        <p className="action-note">月が替わるたび、一族は歳を取る。八季(廿四月)で灯は尽きる — 時を無駄にするな。</p>
      </Panel>
      </div>
      </div>

      {confirm && (
        <MonthConfirmSheet kind={confirm} data={data} onClose={() => setConfirm(null)}
          onDo={() => { const k = confirm; setConfirm(null); if (k === 'festival') doFestival(); else doRest() }} />
      )}


      {showStoryMargin && (
        <Sheet title="灯の余白 — 物語の記録" onClose={() => setShowStoryMargin(false)}>
          <p className="story-question"><span>今代の問い</span>{currentQuestion}</p>
          {latestReturnTraces.length > 0 && (
            <div className="return-traces" aria-label="前回の帰還に残った三つの痕">
              {latestReturnTraces.map((trace) => <p key={trace.kind}><span>{trace.kind === 'human' ? '人' : trace.kind === 'land' ? '土地' : '千年'}</span>{trace.text}</p>)}
            </div>
          )}
          {deferredStories.length === 0 ? (
            <p style={{ color: 'var(--text-dim)' }}>未読の場面はない。読み終えた記は、下からいつでも読み返せる。</p>
          ) : (
            <div className="story-margin-list">
              {deferredStories.slice(0, 5).map((scene) => (
                <button
                  key={narrativeSceneId(scene)}
                  className="btn story-margin-item"
                  onClick={() => { setShowStoryMargin(false); openDeferredScene(narrativeSceneId(scene)) }}
                >
                  <b>{sceneLabel(scene)}</b>
                  <span>{sceneHint(scene)}</span>
                </button>
              ))}
              {deferredStories.length > 5 && <p className="story-margin-more">ほか {deferredStories.length - 5}件。読み終えると次の記が現れる。</p>}
            </div>
          )}
          {archivedStories.length > 0 && (
            <section className="story-archive" aria-labelledby="story-archive-title">
              <h3 id="story-archive-title">家譜に綴じた物語</h3>
              <p>選択や進行を変えず、章と夢を読み返す。</p>
              <div className="story-margin-list">
                {archivedStories.slice(0, showAllArchive ? archivedStories.length : 6).map((scene) => (
                  <button
                    key={`archive-${narrativeSceneId(scene)}`}
                    className="btn story-margin-item"
                    onClick={() => { setShowStoryMargin(false); replayNarrativeScene(narrativeSceneId(scene)) }}
                  >
                    <b>{sceneLabel(scene)}</b>
                    <span>家譜から読み返す</span>
                  </button>
                ))}
              </div>
              {archivedStories.length > 6 && (
                <button type="button" className="btn btn-ghost story-archive-more" onClick={() => setShowAllArchive((shown) => !shown)}>
                  {showAllArchive ? '最初の6件に戻す' : `残り${archivedStories.length - 6}件を表示`}
                </button>
              )}
            </section>
          )}
        </Sheet>
      )}

      <div ref={ledRef}>
        <Panel title="郷の帳">
          <HomeLedger
            data={data}
            onOpen={(key) => {
              if (key === 'forge') setScreen({ id: 'forge' })
              else if (key === 'facilities') setScreen({ id: 'facilities' })
              else if (key === 'village') setScreen({ id: 'village' })
              else if (key === 'familiars') setShowFamiliars(true)
              else if (key === 'chronicle') setScreen({ id: 'chronicle' })
              else if (key === 'codex') setScreen({ id: 'codex' })
              else if (key === 'tree') setShowTree(true)
              else if (key === 'gossip') { markGossipSeen(); setShowGossip(true) }
              else if (key === 'objectives') setShowObjectives(true)
              else if (key === 'succession') setShowSuccessionPlan(true)
              else if (key === 'starLottery') setScreen({ id: 'starLottery' })
              else if (key === 'motto') setShowMotto(true)
              else if (key === 'help') setShowHelp(true)
              else if (key === 'tower') {
                const party = data.family.filter((c) => c.alive && isAdult(c, data.seasonIndex)).slice(0, 4)
                if (party.length > 0) departDungeon('tokoyo_tou', party.map((c) => c.id))
              }
            }}
          />
        </Panel>
      </div>

      <nav className="home-anchors" aria-label="ホーム内の節へ移動">
        <button className="btn btn-ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>郷</button>
        <button className="btn btn-ghost" onClick={() => famRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>一族</button>
        <button className="btn btn-ghost" onClick={() => actRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>今月</button>
        <button className="btn btn-ghost" onClick={() => ledRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>帳</button>
      </nav>

      {showMotto && <MottoModal onClose={() => setShowMotto(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showTree && <FamilyTree onClose={() => setShowTree(false)} />}
      {showGossip && <GossipModal onClose={() => setShowGossip(false)} />}
      {showFamiliars && <FamiliarsModal onClose={() => setShowFamiliars(false)} />}
      {showObjectives && <ObjectivesModal onClose={() => setShowObjectives(false)} />}
      {showSuccessionPlan && (
        <SuccessionPlanSheet
          data={data}
          onDesignate={designateHeir}
          onSetVow={setGenerationVow}
          onClose={() => setShowSuccessionPlan(false)}
        />
      )}
    </div>
  )
}

const ACTION_LABEL: Record<ActionKind, string> = { depart: '出立', pact: '星契り', festival: '祭', rest: '静養' }

// 郷の行動カード — 図像・見出し・一言でわかりやすく。無効時は理由を添える。rec=綴の推奨(命火の縁+「薦」印)。
function ActionCard({
  iconName, iconFb, title, desc, note, disabled, primary, rec, onClick,
}: {
  iconName: string
  iconFb: string
  title: string
  desc: string
  note?: string
  disabled?: boolean
  primary?: boolean
  rec?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`action-card ${primary ? 'primary' : ''} ${rec ? 'rec' : ''}`}
      disabled={disabled}
      onClick={onClick}
      title={note ?? ''}
    >
      {rec && <span className="rec-tag">薦</span>}
      <span className="action-card-icon"><Ico name={iconName} fb={iconFb} size={32} /></span>
      <span className="action-card-text">
        <span className="action-card-title">{title}</span>
        <span className={`action-card-desc ${disabled && note ? 'is-note' : ''}`}>{disabled && note ? note : desc}</span>
      </span>
    </button>
  )
}

// ---- M18 P2: 一族欄の二面化 — 大札(選択人物)+小札+血脈診断 ----
function FamilyBoard({ data, onTendLantern }: { data: GameData; onTendLantern: (charId: string) => void }) {
  const [selId, setSelId] = useState<string | null>(null)
  const c = census(data)
  if (c.alive.length === 0) {
    return <p>いま生きている者はいない。{c.pregnant > 0 ? '腹の子の誕生を待つ……' : '一族の灯は、ここで潰えた。'}</p>
  }
  const head = c.alive.find((x) => x.isHead) ?? c.alive[0]
  const sel = c.alive.find((x) => x.id === selId) ?? head
  const missingMp = sel.maxMp - sel.mp
  const tendingAmount = Math.min(missingMp, Math.max(1, Math.ceil(sel.maxMp * LANTERN_TENDING_RATIO)))
  const canTend = missingMp > 0 && data.hoto >= LANTERN_TENDING_COST
  // 小札は詳細表示の選択後も同じDOMを残す。選択した札を配列から外すと、
  // キーボードフォーカスが失われ「次の人物」へ続けて移れなくなるため。
  const smalls = c.alive
  return (
    <div className="family-board">
      <div className="family-detail">
        <div className="family-folio-heading"><span>当代の記</span><small>選んだ一人の資質と現在</small></div>
        <CharCard char={sel} seasonIndex={data.seasonIndex} progressionMode="detail" />
        <div className="family-mp-care" data-ready={canTend ? 'true' : 'false'}>
          <div>
            <span>月を送らない手当て</span>
            <b>灯芯手入れ — {sel.name}の灯力を{tendingAmount > 0 ? `${tendingAmount}回復` : '満ちたまま保つ'}</b>
            <small>奉燈{LANTERN_TENDING_COST}。静養せず、選択中の一人だけを整える。</small>
          </div>
          <button
            type="button"
            className="btn family-mp-care-action"
            disabled={!canTend}
            onClick={() => onTendLantern(sel.id)}
          >
            {missingMp <= 0 ? '灯力は満ちている' : data.hoto < LANTERN_TENDING_COST ? `奉燈があと${LANTERN_TENDING_COST - data.hoto}` : `手入れする −${LANTERN_TENDING_COST}`}
          </button>
        </div>
      </div>
      <div className="family-register">
        {smalls.length > 1 && (
          <>
          <div className="family-folio-heading"><span>家譜札</span><small>札を選ぶと左の記が替わる</small></div>
          <div className="family-smalls" data-family-count={smalls.length}>
            {smalls.map((ch) => (
              <CharCard
                key={ch.id}
                char={ch}
                seasonIndex={data.seasonIndex}
                compact
                progressionMode="summary"
                selected={sel.id === ch.id}
                onClick={() => setSelId(ch.id)}
              >
                <span className="family-selected-status" aria-hidden={sel.id !== ch.id}>
                  <b>{ch.name}</b>
                  <span>当代の記に表示中</span>
                </span>
              </CharCard>
            ))}
          </div>
          </>
        )}
        <BloodlineDiagnosis data={data} />
      </div>
    </div>
  )
}

// 血脈診断 — 1人でも空疎に見えない「状態を説明できる空白」(設計 §3.3/§4.2)
function BloodlineDiagnosis({ data }: { data: GameData }) {
  const c = census(data)
  const lifeCrisis = c.minLife && c.minLife.months <= 3
  return (
    <div className="blood-diag">
      <div className="blood-diag-title">血脈診断</div>
      {/* 命脈 — 存命を灯る節、懐妊をまだ点らぬ節として一本の火の線で結ぶ(A案署名要素) */}
      <div className="blood-diag-thread" title={`存命${c.alive.length}・懐妊${c.pregnant}`}>
        <LifeThread
          nodes={[
            ...c.alive.map(() => ({ lit: true })),
            ...Array.from({ length: c.pregnant }, () => ({ lit: false })),
          ]}
          dim={c.alive.length === 0}
        />
      </div>
      <div className="blood-diag-counts">
        存命<b>{c.alive.length}</b> ／ 成人<b>{c.adults.length}</b> ／ 幼子<b>{c.children.length}</b>
        {c.pregnant > 0 && <> ／ 懐妊<b>{c.pregnant}</b></>}
      </div>
      <ul className="blood-diag-list">
        <li className={c.hasHeir ? '' : 'is-bad'}>後継 — {c.hasHeir ? 'あり' : 'なし'}</li>
        {c.minLife && (
          <li className={lifeCrisis ? 'is-bad' : ''}>
            最短の灯 — {c.minLife.ch.name} あと{c.minLife.months}月
          </li>
        )}
        {c.dying.length > 0 && (
          <li className="is-bad">瀕死 — {c.dying.map((x) => `${x.name}(${x.hp}/${x.maxHp})`).join('・')}</li>
        )}
        {c.mpDry.length > 0 && <li>技力枯渇 — {c.mpDry.map((x) => x.name).join('・')}</li>}
        {c.adults.length === 0 && c.monthsToAdult !== null && (
          <li>成人待ち — あと{c.monthsToAdult}月</li>
        )}
      </ul>
      <div className="blood-diag-next">
        <span className="blood-diag-next-label">次の一手</span>
        <span>今月の決断に一つだけ示す</span>
      </div>
    </div>
  )
}

// 郷の帳 — 名前+現在値+新着badgeの帳面(設計 §4.5)
function HomeLedger({ data, onOpen }: { data: GameData; onOpen: (key: string) => void }) {
  const now = new Date()
  const odaiKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const odaiClaimable = data.flags.odaiClaimedDay !== odaiKey && todaysOdai(odaiKey).check(data)
  const { work, record, mind } = ledgerStats(data, odaiClaimable)
  const living = data.family.filter((character) => character.alive)
  const designated = living.find((character) => character.id === data.designatedHeirId)
  const currentVow = data.generationVow ? GENERATION_VOWS[data.generationVow.id] : undefined
  mind.unshift({
    key: 'succession',
    label: '次代の約束',
    value: designated ? `後継 ${designated.name}` : currentVow?.name ?? 'まだ定めない',
  })
  if (isStarLotteryUnlocked(data)) {
    const remaining = remainingStarLotteryDraws(data)
    record.push({ key: 'starLottery', label: '星籤', value: remaining > 0 ? `引ける籤 ${remaining}` : `星札 ${data.starLottery?.cards.length ?? 0}`, badge: remaining })
  }
  if (data.flags.cleared) work.push({ key: 'tower', label: '常夜百層', value: `深さ${typeof data.flags.towerBest === 'number' ? data.flags.towerBest : 0}` })
  const books: [string, typeof work][] = [['営み', work], ['記録', record], ['心得', mind]]
  return (
    <div className="ledger">
      {books.map(([name, entries]) => (
        <div key={name} className="ledger-book">
          <div className="ledger-book-title">{name}</div>
          {entries.map((e) => (
            <button key={e.key} className="btn ledger-entry" onClick={() => onOpen(e.key)}>
              <span className="ledger-label">{e.label}</span>
              <span className="ledger-value">{e.value}<LiveBadge count={e.badge} /></span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

const VOW_IDS = Object.keys(GENERATION_VOWS) as GenerationVowId[]

function SuccessionPlanSheet({ data, onDesignate, onSetVow, onClose }: {
  data: GameData
  onDesignate: (charId: string | null) => void
  onSetVow: (vowId: GenerationVowId) => void
  onClose: () => void
}) {
  const head = data.family.find((character) => character.alive && character.isHead)
  const candidates = data.family.filter((character) => character.alive && !character.isHead)
  const generationVow = data.generationVow
  const selectedVow = generationVow && generationVow.madeById === head?.id ? generationVow.id : undefined
  return (
    <Sheet title="次代の約束" onClose={onClose} closeLabel="郷へ戻る">
      <p className="confirm-lead">戦力を増やす仕組みではない。誰へ灯を渡し、何を残すかを、生きているうちに定める。</p>
      <section className="succession-plan-section" aria-labelledby="heir-plan-title">
        <h3 id="heir-plan-title">後継を指名する</h3>
        {candidates.length > 0 ? (
          <div className="succession-plan-options">
            <button type="button" className={`btn ${!data.designatedHeirId ? 'selected' : ''}`} aria-pressed={!data.designatedHeirId} onClick={() => onDesignate(null)}>
              定めない <small>その時の最年長へ</small>
            </button>
            {candidates.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                className={`btn ${data.designatedHeirId === candidate.id ? 'selected' : ''}`}
                aria-pressed={data.designatedHeirId === candidate.id}
                onClick={() => onDesignate(candidate.id)}
              >
                {candidate.name} <small>第{candidate.gen}代・残り{seasonsLeft(candidate, data.seasonIndex)}月</small>
              </button>
            ))}
          </div>
        ) : <p className="confirm-list-empty">いまは候補がいない。無指定でも家は止まらず、存命者が増えればここで選べる。</p>}
      </section>
      <section className="succession-plan-section" aria-labelledby="vow-plan-title">
        <h3 id="vow-plan-title">今代に残す約束</h3>
        <div className="succession-plan-options">
          {VOW_IDS.map((id) => {
            const vow = GENERATION_VOWS[id]
            const selected = selectedVow === id
            return (
              <button type="button" key={id} className={`btn succession-vow ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => onSetVow(id)}>
                <strong>{vow.name}</strong><span>{vow.promise}</span>
              </button>
            )
          })}
        </div>
      </section>
      <p className="confirm-age">指名も約束も月を消費せず、次の継承場面で先代の生涯の事実とともに返される。</p>
    </Sheet>
  )
}

// 月送り確認 — 祭/静養は効果と次月を見てから実行(設計 §4.4)
function MonthConfirmSheet({ kind, data, onClose, onDo }: {
  kind: 'festival' | 'rest'
  data: GameData
  onClose: () => void
  onDo: () => void
}) {
  const alive = data.family.filter((c) => c.alive)
  const notes = nextMonthNotes(data)
  const healed = alive.filter((c) => c.hp < c.maxHp || c.mp < c.maxMp)
  return (
    <Sheet title={kind === 'festival' ? '祭を開く' : '静養する'} onClose={onClose} closeLabel="やめる">
      <p className="confirm-lead">
        {kind === 'festival'
          ? '奉燈30を捧げて郷に祭を開き、月を一つ進める。一族の傷と心労が癒え、星との縁が深まる。'
          : '家で傷と心労を癒し、月を一つ進める。'}
      </p>
      {healed.length > 0 ? (
        <ul className="confirm-list">
          {healed.slice(0, 6).map((c) => (
            <li key={c.id}>{c.name} — 体 {c.hp}/{c.maxHp} → {c.maxHp}/{c.maxHp}</li>
          ))}
          {healed.length > 6 && <li>ほか{healed.length - 6}名も癒える</li>}
        </ul>
      ) : (
        <p className="confirm-list-empty">いま傷んでいる者はいない。</p>
      )}
      <p className="confirm-age">月が替わり、一族は皆ひと月ぶん歳を取る。</p>
      {notes.length > 0 && (
        <div className="confirm-notes">
          {notes.map((n, i) => <p key={i}>◆ {n}</p>)}
        </div>
      )}
      <div className="confirm-actions">
        <button className="btn btn-ghost" onClick={onClose}>やめる</button>
        <button className="btn btn-main" onClick={onDo}>
          {kind === 'festival' ? '祭を開いて月を進める' : '静養して月を進める'}
        </button>
      </div>
    </Sheet>
  )
}

const HELP_TABS = [
  {
    key: 'basic', label: '基本',
    items: [
      ['命は八季。', '生まれて八つの季節で、一族は必ず灯が尽きる。名前の下の炎が残り寿命だ。'],
      ['星契りを絶やすな。', '子は翌月に生まれ、六月(半年)で成人する。親の血潮と星神の血潮を継ぐ — 高い位の星ほど濃い血をくれる。'],
      ['今月の行い。', '出立・星契り・祭のいずれか一つを選べば、月が一つ進む。行いを選ぶたび、誰かの寿命が削れてゆく。'],
      ['敗北は終わりじゃない。', '主に敗れても、次の世代がいる。血を濃くして、装備を継いで、雪辱しろ。それが灯継ぎだ。'],
    ],
  },
  {
    key: 'grow', label: '育つ',
    items: [
      ['灯座(とうざ)。', '成人の儀で「灯型×星脈」から灯座が決まる。灯座は星から継いだ〈術〉で、その子の戦い方の芯になる。'],
      ['家業(なりわい)。', '生業の儀で郷の家業を選ぶ。灯座が星の術なら、家業は郷で修める〈技〉。年季とともに八段の奥伝へ深まる。'],
      ['形見は強くなる。', '死者の装備は「形見」として蔵に還り、代を継ぐごとに強まる。祖母の簪は、孫の代で名刀に劣らん。'],
      ['普請(ふしん)。', '奉燈で郷の施設を建て、育てられる。産屋・鍛冶場・道場など、代を跨いで一族全体を底上げする。'],
    ],
  },
  {
    key: 'explore', label: '夜藪',
    items: [
      ['灯が命綱。', '夜藪では灯が尽きると魔性が狂暴化する。「帰り火」はいつでも焚ける — 欲と命を天秤にかけろ。灯が15%を切ると警告が出る。'],
      ['継足(つぎたし)。', '戦いで家族が同じ敵を続けて狙うと、連撃の倍率が上がる。血の繋がりは技になる。'],
      ['眷属(けんぞく)。', '倒した魔性が稀に懐き、随行する式神になる。属性ごとに固有の恩恵(月=夜目で敵影が見える等)を授ける。'],
      ['加護(かご)。', '遠征中に「灯の加護」を授かることがある。その遠征の間だけ効く一時の力。最大三つまで。'],
      ['石碑と土地の記。', 'ダンジョンの石碑(ミニマップでダイヤ印)で縁起の欠片を拾い、主を鎮めると、その地の物語が図鑑に綴られる。'],
    ],
  },
  {
    key: 'star', label: '星と記録',
    items: [
      ['交神(星契り)。', '星神と縁を重ねるほど、授かる子の血が濃くなり、契りの奉燈も安くなる。縁がMAXに至ると、神は第二の姿を見せる。'],
      ['宿敵。', '一族の誰かを殺した魔性は「名」を得て成長し、再来する。仇を討てば、その骸から特別な実りを得る。'],
      ['図鑑と記録。', '遭った魔性・契った星神・鎮めた地は図鑑に残る。家譜画面の「一族の記録」で総合収集率や討伐数を振り返れる。'],
      ['NG+(継承周回)。', '物語を見届けたあと、血と記録を継いで新たな千年紀を始められる。'],
    ],
  },
] as const

function HelpModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<string>('basic')
  const active = HELP_TABS.find((t) => t.key === tab) ?? HELP_TABS[0]
  return (
    <Sheet title="綴の手引き — 千年ぶん、要点だけな" onClose={onClose}>
      <div className="god-filter-row" style={{ marginBottom: 12 }}>
        {HELP_TABS.map((t) => (
          <button key={t.key} className={`btn btn-ghost filter-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.9, minHeight: 220 }}>
        {active.items.map(([head, body], i) => (
          <p key={i}><b style={{ color: 'var(--amber)' }}>{head}</b>{body}</p>
        ))}
      </div>
    </Sheet>
  )
}

// ---- 務め(目標階層) — 研究の density of goals / 短期・中期・長期の重ね合わせ ----
// 全て現在の state から純粋導出(store非改変)。新規〜中盤の「次に何を目指すか」を常に明示する。
type Obj = { text: string; go?: 'pact' | 'depart' | 'chronicle' | 'codex'; goLabel?: string; progress?: [number, number]; done?: boolean }
function computeObjectives(data: ReturnType<typeof useGame.getState>['data'] & object, adultCount: number): { short: Obj[]; mid: Obj[]; long: Obj[] } {
  const alive = data.family.filter((c) => c.alive)
  const head = alive.find((c) => c.isHead)
  const gens = data.family.length > 0 ? Math.max(...data.family.map((c) => c.gen)) : 0
  const baseEnemies = ENEMIES.filter((e) => !/_[wo]$/.test(e.id))
  const enemySeen = new Set((data.codex?.enemies ?? []).map((id) => id.replace(/_[wo]$/, ''))).size
  const bossRegions = REGIONS.filter((r) => r.bossId && r.id !== 'tokoyo_tou')
  const clearedSet = new Set(data.regionsCleared)

  // 短期(今すぐ〜この代)
  const short: Obj[] = []
  if (head && seasonsLeft(head, data.seasonIndex) <= 3 && data.pendingBirths.length === 0) {
    short.push({ text: `当主 ${head.name} の灯が細い。次代を残す`, go: 'pact', goLabel: '星契りへ' })
  }
  if (alive.length <= 2 && data.pendingBirths.length === 0 && adultCount > 0) {
    short.push({ text: '血が細い。星と契り、子を授かる', go: 'pact', goLabel: '星契りへ' })
  }
  if (adultCount > 0) short.push({ text: '夜藪へ出立し、奉燈と血珠を持ち帰る', go: 'depart', goLabel: '出立へ' })
  if (short.length === 0) short.push({ text: '子が育つのを待ち、次の一手を練る' })

  // 中期(この周回)
  const mid: Obj[] = []
  const nextLocked = REGIONS.filter((r) => r.unlockFame > data.fame && r.id !== 'tokoyo_tou').sort((a, b) => a.unlockFame - b.unlockFame)[0]
  if (nextLocked) mid.push({ text: `「${nextLocked.name}」への道を開く`, progress: [data.fame, nextLocked.unlockFame], go: 'depart', goLabel: '出立へ' })
  const nextBoss = bossRegions.filter((r) => r.unlockFame <= data.fame && !clearedSet.has(r.id)).sort((a, b) => a.tier - b.tier)[0]
  if (nextBoss) mid.push({ text: `「${nextBoss.name}」の主を鎮める`, go: 'depart', goLabel: '出立へ' })
  mid.push({ text: '血を継ぎ、代を重ねる', progress: [gens, 10] })
  mid.push({ text: '魔性を見聞し、図鑑を埋める', progress: [enemySeen, baseEnemies.length], go: 'codex', goLabel: '図鑑へ' })

  // 長期(千年紀)
  const long: Obj[] = []
  long.push({ text: '玄冬を討ち、常夜に朝を還す', done: !!data.flags.cleared })
  long.push({ text: '全ての地の主を鎮める', progress: [data.regionsCleared.filter((id) => bossRegions.some((r) => r.id === id)).length, bossRegions.length] })
  if (data.flags.cleared) {
    const tower = typeof data.flags.towerBest === 'number' ? data.flags.towerBest : 0
    long.push({ text: '常夜百層を、深く制す', progress: [tower, 100] })
  }
  return { short, mid, long }
}

function ObjectivesModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const claimOdai = useGame((s) => s.claimOdai)
  const [odaiDone, setOdaiDone] = useState(false)
  const adults = data.family.filter((c) => c.alive && isAdult(c, data.seasonIndex)).length
  const { short, mid, long } = computeObjectives(data, adults)

  // 今日の御題 — 実日付でローテ。達成済みかつ本日未受領なら褒賞を受けられる(務めの一枠)。
  const now = new Date()
  const odaiKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const odai = todaysOdai(odaiKey)
  const odaiMet = odai.check(data)
  const odaiClaimed = data.flags.odaiClaimedDay === odaiKey || odaiDone
  const odaiReward = [odai.reward.hoto ? `奉燈${odai.reward.hoto}` : '', odai.reward.ketsu ? `血珠${odai.reward.ketsu}` : ''].filter(Boolean).join('・')
  const tiers: [string, string, Obj[]][] = [
    ['今', '今すぐの務め', short],
    ['代', 'この代の務め', mid],
    ['紀', '千年紀の務め', long],
  ]
  const go = (id: Obj['go']) => { if (id) { onClose(); setScreen({ id }) } }
  return (
    <Sheet title="務め — 一族の目標" onClose={onClose}>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
          今すぐ・この代・千年紀 — 三つの時の尺で、進むべき道を映す。
        </p>

        <div className={`odai-card ${odaiMet ? 'met' : ''} ${odaiClaimed ? 'claimed' : ''}`}>
          <div className="odai-head"><span className="odai-mark">題</span>今日の御題</div>
          <div className="odai-text">{odai.text}</div>
          <div className="odai-foot">
            <span className="odai-state">
              {odaiClaimed ? '受領済み — また明日' : odaiMet ? `達成 — 褒賞 ${odaiReward}` : `未達 — ${odai.hint}`}
            </span>
            {odaiMet && !odaiClaimed && (
              <button className="btn btn-main odai-claim" onClick={() => { if (claimOdai()) setOdaiDone(true) }}>
                褒賞を受ける
              </button>
            )}
          </div>
        </div>
        {tiers.map(([icon, label, objs]) => (
          <div key={label} className="obj-tier">
            <div className="obj-tier-head">{icon} {label}</div>
            {objs.map((o, i) => (
              <div key={i} className={`obj-row ${o.done ? 'done' : ''}`}>
                <span className="obj-mark">{o.done ? '✔' : '◇'}</span>
                <span className="obj-text">{o.text}</span>
                {o.progress && (
                  <span className="obj-prog">
                    <span className="obj-bar"><span className="obj-bar-fill" style={{ width: `${Math.min(100, Math.round((o.progress[0] / Math.max(1, o.progress[1])) * 100))}%` }} /></span>
                    {o.progress[0]}/{o.progress[1]}
                  </span>
                )}
                {o.go && !o.done && <button className="btn btn-ghost obj-go" onClick={() => go(o.go)}>→ {o.goLabel}</button>}
              </div>
            ))}
          </div>
        ))}
    </Sheet>
  )
}

// 家訓(v3.1 M12-8) — 当主が家風を定める。一族全体への小さな加護
function MottoModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const setMotto = useGame((s) => s.setMotto)
  const head = data.family.find((c) => c.alive && c.isHead)
  return (
    <Sheet title={`家訓 — ${head?.name ?? '当主'}が掲げる家風`} onClose={onClose} closeLabel="やめる">
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
        家訓は一族の生き方を定め、静かな加護をもたらす。掲げ直すのも当主の器量。
      </p>
      {(Object.keys(MOTTOS) as MottoId[]).map((id) => (
        <button
          key={id}
          className={`btn ${data.motto === id ? 'btn-main' : ''}`}
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }}
          onClick={() => {
            setMotto(id)
            onClose()
          }}
        >
          <b>{MOTTOS[id].name}</b>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 8 }}>{MOTTOS[id].desc}</span>
        </button>
      ))}
    </Sheet>
  )
}

// 郷の声(v3.1 M16-3) — 解禁済みの会話キューを読み返す。未解禁は「？？？」で伏せる
function GossipModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const unlocked = data.flags.reveal_shiori_name
    ? (data.gossipIndex ?? 0)
    : Math.min(data.gossipIndex ?? 0, 11)

  return (
    <Sheet title="郷の声 — 聞こえてきた話" onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
        死や代替わり、夜藪からの帰還のたび、郷の誰かの一言がひとつずつ届く。
      </p>
      <div className="chronicle-scroll">
        {GOSSIP.map((g, i) => (
          <div key={g.id} className="chron-entry">
            {i < unlocked ? (
              <>
                <b style={{ color: 'var(--amber)' }}>{g.speaker}</b>
                <span className="chron-era" style={{ fontWeight: 400, marginLeft: 6 }}>「{g.text}」</span>
              </>
            ) : (
              <span style={{ color: 'var(--text-dim)' }}>？？？</span>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  )
}

// 眷属(式神) v3.1 M16-5 — 討った魔性が稀に懐く。一体だけ随行させ、夜藪で共に働く
function FamiliarsModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const setActiveFamiliar = useGame((s) => s.setActiveFamiliar)
  const familiars = data.familiars ?? []

  return (
    <Sheet title="眷属 — 懐いた魔性たち" onClose={onClose}>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
          討った魔性は、ごく稀に懐いて眷属となる。一体だけを随行させられる — 夜藪で小さな助けになる。
        </p>
        {familiars.length === 0 ? (
          <p style={{ fontSize: 13 }}>
            まだ懐いた者はいない。夜藪で魔性を討ち続ければ、いつか気まぐれに懐くだろう。
          </p>
        ) : (
          familiars.map((f) => {
            const kind = FAMILIAR_KINDS[f.element as Element]
            const active = data.activeFamiliar === f.enemyId
            return (
              <button
                key={f.enemyId}
                className={`btn ${active ? 'btn-main' : ''}`}
                style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }}
                onClick={() => setActiveFamiliar(f.enemyId)}
              >
                <b>{f.name}</b>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>
                  {kind?.label ?? f.element}
                </span>
                {active && <span style={{ fontSize: 11, color: 'var(--amber)', marginLeft: 8 }}>随行中</span>}
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)' }}>
                  {kind?.perk ?? ''}
                </span>
              </button>
            )
          })
        )}
    </Sheet>
  )
}
