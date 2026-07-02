import { useMemo, useState } from 'react'
import { useGame } from '../core/store'
import type { StatKey, GodRank, Element } from '../core/types'
import { GOD_RANK_LABELS, STAT_LABELS, ELEMENT_LABELS } from '../core/types'
import { GODS, godUnlocked } from '../core/data/gods'
import { isAdult, predictChild } from '../core/inheritance'
import { CharCard, NightBackdrop, Panel, TsuzuriLine } from './components'
import { gameImg, HOME_BG } from './img'

// 封印中の神の解放条件を一言で(unlock条件から自動生成)
function sealHint(g: (typeof GODS)[number]): string {
  const u = g.unlock
  if (!u) return ''
  const parts: string[] = []
  if (u.fame !== undefined) parts.push(`武功${u.fame}`)
  if (u.regionId !== undefined) parts.push('とある地の主の討伐')
  if (u.gen !== undefined) parts.push(`第${u.gen}代の血`)
  return `${parts.join('と')}で道が開く`
}

const GOD_EMOJI: Record<string, string> = {
  ishiusu: '🗿', tsubame: '🐦', shimihime: '📖', chidori: '🌊', kagaribi: '🔥',
  yoigumo: '🕸️', yukiango: '☃️', tsukiura: '🐇', orihime: '🧵', ookuma: '🐻',
  narukami: '🥁', hokushin: '🌟',
}

export function PactScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const doPact = useGame((s) => s.doPact)
  const [parentId, setParentId] = useState<string | null>(null)
  const [godId, setGodId] = useState<string | null>(null)
  // 星の数が増えても迷わないための絞り込み(位階タブ×系統チップ) — GDD_v3 §1
  const [rankTab, setRankTab] = useState<GodRank | 0>(0) // 0=全て
  const [elemChip, setElemChip] = useState<Element | null>(null)

  const adults = data.family.filter((c) => c.alive && isAdult(c, data.seasonIndex))
  const parent = adults.find((c) => c.id === parentId) ?? null
  const god = GODS.find((g) => g.id === godId) ?? null

  const shownGods = GODS.filter(
    (g) => (rankTab === 0 || g.rank === rankTab) && (elemChip === null || g.element === elemChip),
  )

  const prediction = useMemo(
    () => (parent && god ? predictChild(parent, god) : null),
    [parent, god],
  )

  return (
    <div className="screen">
      <NightBackdrop bg={gameImg(HOME_BG)} />
      <h1 className="season-label" style={{ marginBottom: 14 }}>星契りの儀</h1>
      <TsuzuriLine text="星神と契れば、翌季に子が生まれる。血潮は親と神から流れ込む — 誰の血を、どの星に継がせる?" />

      <Panel title="契る者を選ぶ">
        <div className="exp-party">
          {adults.map((c) => (
            <CharCard
              key={c.id}
              char={c}
              seasonIndex={data.seasonIndex}
              compact
              selected={parentId === c.id}
              onClick={() => setParentId(c.id)}
            />
          ))}
        </div>
      </Panel>

      <Panel title={`星神を選ぶ — 奉燈 ${data.hoto}`}>
        <div className="god-filter">
          <div className="god-filter-row">
            {([0, 1, 2, 3, 4] as const).map((r) => (
              <button
                key={r}
                className={`btn btn-ghost filter-tab ${rankTab === r ? 'active' : ''}`}
                onClick={() => setRankTab(r)}
              >
                {r === 0 ? '全て' : GOD_RANK_LABELS[r]}
              </button>
            ))}
          </div>
          <div className="god-filter-row">
            {(Object.keys(ELEMENT_LABELS) as Element[]).map((el) => (
              <button
                key={el}
                className={`element-badge el-${el} elem-chip ${elemChip === el ? 'active' : ''}`}
                title={`${ELEMENT_LABELS[el]}の星だけ見る`}
                onClick={() => setElemChip(elemChip === el ? null : el)}
              >
                {ELEMENT_LABELS[el]}
              </button>
            ))}
          </div>
        </div>
        {shownGods.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: 12 }}>
            その条件の星は、今夜は見えない。
          </p>
        )}
        <div className="god-grid">
          {shownGods.map((g) => {
            // 封印された星は条件(unlock)を満たすまで姿を見せない
            const sealed = !godUnlocked(g, data)
            const affordable = data.hoto >= g.cost && !sealed
            const affinity = Math.floor(data.godAffinity[g.id] ?? 0)
            return (
              <div
                key={g.id}
                className={`god-card ${godId === g.id ? 'selected' : ''} ${!affordable ? 'locked' : ''}`}
                onClick={() => affordable && setGodId(g.id)}
              >
                {!sealed && (
                  <img
                    className="god-portrait"
                    src={gameImg(g.portrait)}
                    alt=""
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="god-rank">{GOD_RANK_LABELS[g.rank]} / {ELEMENT_LABELS[g.element]}の星</div>
                <div className="god-name">
                  <span style={{ marginRight: 6 }}>{sealed ? '🌫️' : GOD_EMOJI[g.id] ?? '⭐'}</span>
                  {sealed ? '???' : g.name}
                </div>
                <div className="god-kana">{sealed ? '北天に、まだ遠い星がある' : g.kana}</div>
                <div className="god-cost">{sealed ? sealHint(g) : `奉燈 ${g.cost}${affinity > 0 ? ` ・縁 ${affinity}` : ''}`}</div>
                <div className="god-person">{sealed ? '' : g.personality}</div>
                {godId === g.id && !sealed && <div className="god-desc">{g.desc}</div>}
              </div>
            )
          })}
        </div>
      </Panel>

      {parent && god && prediction && (
        <Panel title={`${parent.name} × ${god.name} — 子の血潮(見立て)`}>
          {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => {
            const [lo, hi] = prediction[k]
            return (
              <div key={k} className="predict-row">
                <span className="predict-label">{STAT_LABELS[k]}</span>
                <span className="predict-track">
                  <span
                    className="predict-range"
                    style={{ left: `${(lo / 120) * 100}%`, width: `${((hi - lo) / 120) * 100}%` }}
                  />
                </span>
                <span className="predict-num">{lo}〜 {hi}</span>
              </div>
            )
          })}
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8 }}>
            子の星脈(灯座の血の軸): {ELEMENT_LABELS[god.element]}の脈(七割)/{ELEMENT_LABELS[parent.element]}の脈(三割) —
            成人の儀で授ける灯型と掛け合わさり、この子の灯座が決まる。
          </p>
          <div className="pact-quote">
            「{god.pactLines[Math.min(Math.floor(data.godAffinity[god.id] ?? 0), god.pactLines.length - 1)]}」
          </div>
          <button className="btn btn-main" onClick={() => doPact(parent.id, god.id)}>
            契りを結ぶ(奉燈{god.cost}・今月を使う)
          </button>
        </Panel>
      )}

      <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>
        郷へ戻る
      </button>
    </div>
  )
}
