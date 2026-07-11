import { useEffect, useRef, useState } from 'react'
import { useGame } from '../core/store'
import type { Character, ItemSlot } from '../core/types'
import { ELEMENT_LABELS, STAT_LABELS } from '../core/types'
import { ageOf, isAdult, seasonsLeft } from '../core/inheritance'
import { jobById } from '../core/data/jobs'
import { PARTY_SIZE } from '../core/constants'
import { Sheet } from './layout/shell'
import { Bar, CharCard, LifeFlames, Portrait } from './components'

// M22 P0-1: 出立専用の隊編成。共通 .exp-party / CharCard は変更せず、
// 「比較面(コンパクト札)」と「詳細面(Sheet)」を分けて摩擦を減らす。
// 契約: docs/POLISH_FIX_INSTRUCTIONS_CLAUDE.md §1

const SLOT_LABELS: Record<ItemSlot, string> = { weapon: '武', armor: '防', charm: '飾' }

// 出立警告 — 朱色だけに頼らず、文と印で伝える(§1.5)
function departWarnings(c: Character, seasonIndex: number): string[] {
  const w: string[] = []
  if (c.maxHp > 0 && c.hp <= c.maxHp * 0.3) w.push('深手 — 体力が乏しい')
  if (seasonsLeft(c, seasonIndex) <= 3) w.push('灯が残りわずか')
  if (c.fatigue >= 60) w.push('心労が重い')
  return w
}

function CandidateCard({
  c, seasonIndex, order, blocked, onToggle, onDetail,
}: {
  c: Character
  seasonIndex: number
  order: number // 0=未選択、1〜4=隊列番号
  blocked: boolean // 上限で加えられなかった直後
  onToggle: () => void
  onDetail: () => void
}) {
  const selected = order > 0
  const age = ageOf(c, seasonIndex)
  const warns = departWarnings(c, seasonIndex)
  // 入れ子の対話要素を作らない(M22最終レビューHIGH反映):
  // 選択トグルは実<button>、詳細ボタンはその兄弟。Enter/Spaceはnative buttonに任せる。
  return (
    <div className={`depart-cand ${selected ? 'selected' : ''}`}>
      {selected && (
        <span className="depart-cand-order" aria-hidden>
          ✓{order}
        </span>
      )}
      <button
        type="button"
        className="depart-cand-toggle"
        aria-pressed={selected}
        aria-label={`${c.name}(${ELEMENT_LABELS[c.element]}・${c.gen}代)${selected ? ` 隊列${order}番 — 押すと外す` : ' — 押すと隊に加える'}`}
        onClick={onToggle}
      >
        <div className="depart-cand-row">
          <Portrait char={c} seasonIndex={seasonIndex} size="sm" />
          <div className="depart-cand-main">
            <div className="depart-cand-head">
              <span className={`element-badge el-${c.element}`}>{ELEMENT_LABELS[c.element]}</span>
              <b className="depart-cand-name">
                {c.isHead && <span className="head-mark">当主</span>}
                {c.name}
              </b>
              <span className="char-gen">{c.gen}代</span>
            </div>
            <div className="depart-cand-sub">
              月齢{age}月 ・ {c.jobClass ? jobById(c.jobClass).name : '家業なし'}
            </div>
            <LifeFlames char={c} seasonIndex={seasonIndex} />
          </div>
        </div>
        <Bar value={c.hp} max={c.maxHp} kind="hp" />
        <Bar value={c.mp} max={c.maxMp} kind="mp" />
        {warns.length > 0 && <span className="depart-cand-warn">⚠ {warns.join(' ・ ')}</span>}
      </button>
      {blocked && (
        <p className="depart-cand-limit" role="status">
          隊は四人まで。誰かを外してから加えよ。
        </p>
      )}
      <button className="btn btn-ghost depart-cand-detail" onClick={onDetail}>
        仔細を見る
      </button>
    </div>
  )
}

export function DepartPartyPicker({
  adults, family, seasonIndex, party, onToggle,
}: {
  adults: Character[]
  family: Character[]
  seasonIndex: number
  party: string[]
  onToggle: (id: string) => void
}) {
  const setScreen = useGame((s) => s.setScreen)
  const [blockedId, setBlockedId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const blockTimer = useRef<number | null>(null)
  useEffect(() => () => { if (blockTimer.current !== null) window.clearTimeout(blockTimer.current) }, [])

  const press = (id: string) => {
    if (!party.includes(id) && party.length >= PARTY_SIZE) {
      setBlockedId(id)
      if (blockTimer.current !== null) window.clearTimeout(blockTimer.current)
      blockTimer.current = window.setTimeout(() => setBlockedId(null), 2400)
      return
    }
    setBlockedId(null)
    onToggle(id)
  }

  const members = party
    .map((id) => adults.find((c) => c.id === id))
    .filter((c): c is Character => !!c)
  const detail = detailId ? family.find((c) => c.id === detailId) : undefined

  // 空状態(§1.5): 成人0人 — 条件と次の行動を案内する
  if (adults.length === 0) {
    const children = family.filter((c) => c.alive && !isAdult(c, seasonIndex))
    return (
      <div className="depart-empty">
        <p>
          <b>出立できる成人がいない。</b>
          月齢6月で成人となり、隊に加えられる。
        </p>
        {children.length > 0 ? (
          <ul className="depart-empty-children">
            {children.map((c) => (
              <li key={c.id}>
                {c.name} — あと{Math.max(0, 6 - ageOf(c, seasonIndex))}月で成人
              </li>
            ))}
          </ul>
        ) : (
          <p>家に子がいない。まずは星契りで子を授かるところからだ。</p>
        )}
        <div className="depart-empty-actions">
          <button className="btn" onClick={() => setScreen({ id: 'pact' })}>星契りへ(子を授かる)</button>
          <button className="btn btn-ghost" onClick={() => setScreen({ id: 'home' })}>郷へ戻る(月を送る)</button>
        </div>
      </div>
    )
  }

  return (
    <div className="depart-party">
      <div className="depart-slots" role="group" aria-label="隊列(四枠)">
        {Array.from({ length: PARTY_SIZE }, (_, i) => {
          const m = members[i]
          return m ? (
            <button
              key={i}
              className="depart-slot is-filled"
              onClick={() => press(m.id)}
              aria-label={`隊列${i + 1} ${m.name} — 押すと外す`}
            >
              <span className="depart-slot-no" aria-hidden>{i + 1}</span>
              <span className="depart-slot-name">{m.name}</span>
            </button>
          ) : (
            <div key={i} className="depart-slot is-empty">
              <span className="depart-slot-no" aria-hidden>{i + 1}</span>
              <span className="depart-slot-name">空き</span>
            </div>
          )
        })}
      </div>

      <p className="depart-cand-title">候補 — 押して隊に加える(もう一度押すと外す)</p>
      <div className="depart-party-grid">
        {adults.map((c) => (
          <CandidateCard
            key={c.id}
            c={c}
            seasonIndex={seasonIndex}
            order={party.indexOf(c.id) + 1}
            blocked={blockedId === c.id}
            onToggle={() => press(c.id)}
            onDetail={() => setDetailId(c.id)}
          />
        ))}
      </div>

      {detail && (
        <Sheet title={`${detail.name} — 仔細`} onClose={() => setDetailId(null)}>
          <CharCard char={detail} seasonIndex={seasonIndex} />
          <div className="depart-detail-equip">
            <h3 className="panel-title">装備</h3>
            {(Object.keys(SLOT_LABELS) as ItemSlot[]).map((s) => {
              const it = detail.equipment[s]
              return (
                <p key={s} className="depart-detail-equip-row">
                  <span className={`slot-mark slot-${s}`}>{SLOT_LABELS[s]}</span>
                  {it ? (
                    <>
                      {it.name}
                      {(it.atk ?? 0) !== 0 && ` 攻${it.atk}`}
                      {(it.def ?? 0) !== 0 && ` 防${it.def}`}
                      {it.statBonus &&
                        Object.entries(it.statBonus)
                          .map(([k, v]) => ` ${STAT_LABELS[k as keyof typeof STAT_LABELS]}+${v}`)
                          .join('')}
                    </>
                  ) : (
                    'なし'
                  )}
                </p>
              )
            })}
          </div>
        </Sheet>
      )}
    </div>
  )
}
