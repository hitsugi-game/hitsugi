import { useMemo, useRef, useState } from 'react'
import { GODS, godById } from '../core/data/gods'
import { useGame } from '../core/store'
import { ELEMENT_LABELS, GOD_RANK_LABELS, STAT_LABELS } from '../core/types'
import type { GodRank, StatKey } from '../core/types'
import {
  earnedStarLotteryDraws,
  isStarLotteryUnlocked,
  migrateStarLottery,
  nextStarLotteryOdds,
  remainingStarLotteryDraws,
  STAR_LOTTERY_RATES,
} from '../core/star_lottery'
import { gameImg } from './img'
import './star_lottery.css'

const RANKS: GodRank[] = [1, 2, 3, 4]

function percent(value: number): string {
  return value === 0 ? '0%' : `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`
}

function strengths(godId: string): string {
  const god = godById(godId)
  return (Object.entries(god.statBias) as [StatKey, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => STAT_LABELS[key])
    .join('・')
}

export function StarLotteryScreen() {
  const data = useGame((state) => state.data)!
  const setScreen = useGame((state) => state.setScreen)
  const open = useGame((state) => state.openStarLottery)
  const claim = useGame((state) => state.claimStarLottery)
  const [confirmingOpen, setConfirmingOpen] = useState(false)
  const [requestId, setRequestId] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [confirmingClaim, setConfirmingClaim] = useState(false)
  const [message, setMessage] = useState('')
  const [rankFilter, setRankFilter] = useState<GodRank | 0>(0)
  const drawing = useRef(false)
  const lottery = migrateStarLottery(data)
  const unlocked = isStarLotteryUnlocked(data)
  const remaining = remainingStarLotteryDraws(data)
  const pending = lottery.pendingV2
  const latest = lottery.history[0]
  const owned = useMemo(() => new Set(lottery.cards), [lottery.cards])
  const nextDraw = lottery.drawsUsed + (pending ? 0 : 1)
  const nextOdds = nextStarLotteryOdds(nextDraw)
  const complete = lottery.cards.length >= GODS.length
  const rankCounts = useMemo(() => RANKS.map((rank) => ({
    rank,
    total: GODS.filter((god) => god.rank === rank).length,
    owned: GODS.filter((god) => god.rank === rank && owned.has(god.id)).length,
  })), [owned])
  const visibleGods = rankFilter === 0 ? GODS : GODS.filter((god) => god.rank === rankFilter)

  const prepare = () => {
    if (!unlocked || remaining <= 0 || pending) return
    setRequestId(`star:${data.seasonIndex}:${lottery.drawsUsed + 1}:${Date.now().toString(36)}`)
    setConfirmingOpen(true)
    setMessage('')
  }

  const confirmOpen = () => {
    if (drawing.current || !requestId) return
    drawing.current = true
    const outcome = open(requestId, lottery.drawsUsed + 1)
    drawing.current = false
    if (!outcome.pending) {
      setMessage(outcome.reason?.startsWith('persist_')
        ? '保存を確認できなかったため、籤は消費していません。保存環境を確かめてください。'
        : '今は籤をひらけない。')
    } else {
      setMessage('三つの星が現れた。比べて、一柱を選んでください。')
    }
    setConfirmingOpen(false)
    setRequestId('')
  }

  const confirmClaim = () => {
    if (drawing.current || !pending || !selectedId) return
    drawing.current = true
    const outcome = claim(pending.requestId, pending.drawNumber, selectedId)
    drawing.current = false
    if (!outcome.receipt || !outcome.result) {
      setMessage(outcome.reason?.startsWith('persist_')
        ? '保存を確認できなかったため、選択は確定していません。もう一度お試しください。'
        : '星を確定できませんでした。')
      return
    }
    const rescue = outcome.receipt.rescue && outcome.receipt.grantedGodIds.length > 1
    setMessage(outcome.result.newGodIds.length
      ? `新しい星札${rescue ? 'と救済の添え札' : ''}が家譜へ加わった。`
      : `重なった縁が+${outcome.result.affinityGained}深まった。`)
    setSelectedId('')
    setConfirmingClaim(false)
  }

  return (
    <main className="screen star-lottery-screen">
      <header className="star-lottery-hero">
        <div>
          <p className="star-lottery-kicker">武功が招く、課金なき星の縁</p>
          <h1>星籤</h1>
          <p>一籤で同じ位階の三柱を見比べ、一柱を選ぶ。武功は消費しない。</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>郷へ戻る</button>
      </header>

      <section className="star-lottery-status" aria-label="星籤の状況">
        <div><span>星札</span><strong>{lottery.cards.length}<small> / {GODS.length}</small></strong></div>
        <div><span>残り籤</span><strong>{remaining}<small> / 累計{earnedStarLotteryDraws(data)}</small></strong></div>
        <div>
          <span>未所持保証</span>
          <strong>{complete ? '星札帖 完集' : `あと${10 - lottery.drawsUsed % 10}籤`}</strong>
        </div>
        <div><span>極ツ星保証</span><strong>あと{50 - lottery.drawsUsed % 50}籤</strong></div>
      </section>

      <section className="star-lottery-rank-progress" aria-label="位階別の収集状況">
        {rankCounts.map(({ rank, owned: count, total }) => (
          <button key={rank} type="button" data-active={rankFilter === rank} onClick={() => setRankFilter(rankFilter === rank ? 0 : rank)}>
            <span>{GOD_RANK_LABELS[rank]}</span><strong>{count}/{total}</strong>
          </button>
        ))}
      </section>

      {!unlocked ? (
        <section className="star-lottery-locked">
          <h2>星籤は、最初の帰還を待っている</h2>
          <p>一度、夜藪から郷へ帰ると星々があなたの武功を見つける。</p>
        </section>
      ) : pending ? (
        <section className="star-lottery-pending" aria-labelledby="star-choice-title">
          <div className="star-lottery-choice-heading">
            <div>
              <p className="star-lottery-kicker">第{pending.drawNumber}籤・{GOD_RANK_LABELS[pending.rank]}</p>
              <h2 id="star-choice-title">三星のうち、一柱と縁を結ぶ</h2>
              <p>候補は開籤時に保存済みです。画面を閉じても同じ三柱から再開できます。</p>
            </div>
            {pending.rescue && <p className="star-lottery-rescue">
              {pending.rescue.kind === 'guaranteed-new' ? '未所持保証' : '星返り'}が作動中。
              選択後も新しい星が少なくとも一柱加わります。
            </p>}
          </div>
          <div className="star-lottery-candidates">
            {pending.candidateRewards.map((reward) => {
              const god = godById(reward.godId)
              const selected = selectedId === god.id
              const affinity = data.godAffinity?.[god.id] ?? 0
              const rescueCandidate = pending.rescue?.godId === god.id
              return (
                <article key={god.id} data-rank={god.rank} data-selected={selected}>
                  <button
                    type="button"
                    className="star-lottery-candidate-select"
                    aria-pressed={selected}
                    onClick={() => {
                      setSelectedId(god.id)
                      setConfirmingClaim(false)
                    }}
                  >
                    <img src={gameImg(god.portrait)} alt="" />
                    <span className={`element-badge el-${god.element}`}>{ELEMENT_LABELS[god.element]}</span>
                    <strong>{god.name}</strong>
                    <small>{GOD_RANK_LABELS[god.rank]}・得意 {strengths(god.id)}</small>
                    <em>
                      {reward.mainReward === 'new-card'
                        ? rescueCandidate ? '未所持・保証の星' : '未所持・新しい星札'
                        : affinity >= 5 ? '所持済み・縁極' : `所持済み・縁${affinity}→${affinity + 1}`}
                    </em>
                  </button>
                  {selected && (
                    <div className="star-lottery-candidate-confirm">
                      {!confirmingClaim ? (
                        <button className="btn btn-main" onClick={() => setConfirmingClaim(true)}>この星を選ぶ</button>
                      ) : (
                        <>
                          <p>{god.name}で確定します。選び直しはできません。</p>
                          <button className="btn btn-main" onClick={confirmClaim}>縁を結ぶ</button>
                          <button className="btn btn-ghost" onClick={() => setConfirmingClaim(false)}>比べ直す</button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="star-lottery-draw" aria-labelledby="star-draw-title">
          <div>
            <p className="star-lottery-kicker">次は第{lottery.drawsUsed + 1}籤</p>
            <h2 id="star-draw-title">三つの星の文をひらく</h2>
            <p>
              {(lottery.drawsUsed + 1) % 50 === 0
                ? '極ツ星保証が作動します。'
                : (lottery.drawsUsed + 1) % 20 === 0
                  ? '上つ星以上の保証が作動します。'
                  : !complete && (lottery.drawsUsed + 1) % 10 === 0
                    ? '未所持保証が作動します。'
                    : '三候補は同じ位階から現れます。'}
            </p>
          </div>
          {!confirmingOpen ? (
            <button className="btn btn-main" disabled={remaining <= 0} onClick={prepare}>
              {remaining > 0 ? '三星をひらく' : '次の武功50を待つ'}
            </button>
          ) : (
            <div className="star-lottery-confirm" role="group" aria-label="開籤の確認">
              <p>籤を一回使い、候補三柱を保存します。</p>
              <button className="btn btn-main" onClick={confirmOpen}>この籤をひらく</button>
              <button className="btn btn-ghost" onClick={() => { setConfirmingOpen(false); setRequestId('') }}>戻す</button>
            </div>
          )}
        </section>
      )}

      {message && <p className="star-lottery-message" role="status">{message}</p>}

      {latest && !pending && (
        <section className="star-lottery-result" aria-label="直近の結果">
          <p className="star-lottery-kicker">直近・第{latest.drawNumber}籤</p>
          <div className="star-lottery-result-cards">
            {latest.godIds.map((id) => {
              const god = godById(id)
              const isNew = latest.newGodIds.includes(id)
              const selected = latest.selectedGodId === id || (!latest.selectedGodId && latest.godIds[0] === id)
              return (
                <article key={id} data-rank={god.rank}>
                  <img src={gameImg(god.portrait)} alt="" />
                  <div>
                    <span>{selected ? '選んだ星' : latest.rescue?.kind === 'star-return' ? '星返り' : '添え札'}</span>
                    <h3>{god.name}</h3><p>{isNew ? '新たな星札' : '重なり — 縁+1'}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <section className="star-lottery-rates" aria-labelledby="star-rate-title">
        <div className="star-lottery-rates-head">
          <div><p className="star-lottery-kicker">基礎率</p><h2 id="star-rate-title">星の現れやすさ</h2></div>
          <div><p className="star-lottery-kicker">第{nextDraw}籤の実確率</p><strong>{RANKS.map((rank) => `${GOD_RANK_LABELS[rank]} ${percent(nextOdds[rank])}`).join(' / ')}</strong></div>
        </div>
        <div>{RANKS.map((rank) => <p key={rank}><span>{GOD_RANK_LABELS[rank]}</span><strong>{STAR_LOTTERY_RATES[rank]}%</strong></p>)}</div>
        <small>位階を一度抽選し、その位階から異なる三柱を同率で提示します。限定札・有償籤・日次更新はありません。</small>
      </section>

      <section className="star-lottery-collection" aria-labelledby="star-owned-title">
        <div className="star-lottery-collection-head">
          <div><p className="star-lottery-kicker">収集と縁</p><h2 id="star-owned-title">星札帖</h2></div>
          {rankFilter !== 0 && <button className="btn btn-ghost" onClick={() => setRankFilter(0)}>全位階を表示</button>}
        </div>
        <div className="star-lottery-grid">
          {visibleGods.map((god) => owned.has(god.id) ? (
            <button
              key={god.id}
              type="button"
              className="star-lottery-card owned"
              aria-label={`${god.name}、縁${data.godAffinity?.[god.id] ?? 0}。神々の記を開く`}
              onClick={() => setScreen({ id: 'codex' })}
            >
              <img src={gameImg(god.portrait)} alt="" /><span>{god.name}</span>
            </button>
          ) : (
            <span
              key={god.id}
              className="star-lottery-card unknown"
              role="img"
              aria-label={`まだ見ぬ${GOD_RANK_LABELS[god.rank]}の星`}
            >
              <span aria-hidden="true">?</span>
            </span>
          ))}
        </div>
      </section>
    </main>
  )
}
