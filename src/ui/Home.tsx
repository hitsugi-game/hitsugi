import { useMemo, useState } from 'react'
import { useGame } from '../core/store'
import { seasonLabel, STAT_LABELS } from '../core/types'
import type { StatKey } from '../core/types'
import { isAdult, seasonsLeft } from '../core/inheritance'
import { ITEM_BASES } from '../core/data/items'
import { GODS } from '../core/data/gods'
import { CharCard, Panel, TsuzuriLine } from './components'

export function HomeScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const doFestival = useGame((s) => s.doFestival)
  const doRest = useGame((s) => s.doRest)
  const [showForge, setShowForge] = useState(false)

  const alive = data.family.filter((c) => c.alive)
  const adults = alive.filter((c) => isAdult(c, data.seasonIndex))
  const cheapestPact = Math.min(...GODS.map((g) => g.cost))
  const canPact = adults.length > 0 && data.hoto >= cheapestPact
  const hint = useMemo(() => tsuzuriHint(data, adults.length), [data, adults.length])

  return (
    <div className="screen">
      <header className="home-header">
        <span className="season-label">{seasonLabel(data.seasonIndex)}</span>
        <span className="resource">奉燈<b>{data.hoto}</b></span>
        <span className="resource">血珠<b>{data.ketsu}</b></span>
        <span className="resource">武功<b>{data.fame}</b></span>
      </header>

      <TsuzuriLine text={hint} />

      <Panel title="燈守家の一族">
        <div className="family-grid">
          {alive.map((c) => (
            <CharCard key={c.id} char={c} seasonIndex={data.seasonIndex} />
          ))}
          {alive.length === 0 && <p>いま生きている者はいない。次の子の誕生を待つ……</p>}
        </div>
      </Panel>

      <Panel title="今季の行い(一つ選べば季節が移ろう)">
        <div className="home-actions">
          <button className="btn btn-main" disabled={adults.length === 0} onClick={() => setScreen({ id: 'depart' })}>
            出立 — 夜藪へ
          </button>
          <button className="btn" disabled={!canPact} onClick={() => setScreen({ id: 'pact' })}>
            星契り — 次代を授かる
          </button>
          <button className="btn" disabled={data.hoto < 30} onClick={doFestival}>
            祭 — 奉燈30(全快・星神との縁)
          </button>
          <button className="btn" onClick={doRest}>
            静養 — 傷と心労を癒す
          </button>
        </div>
        <p className="action-note">季節が移ろうたび、一族は歳を取る。八季で灯は尽きる — 時を無駄にするな。</p>
      </Panel>

      <div className="home-actions">
        <button className="btn btn-ghost" onClick={() => setShowForge(true)}>
          鍛冶と蔵(装備)
        </button>
        <button className="btn btn-ghost" onClick={() => setScreen({ id: 'chronicle' })}>
          家譜を繰る
        </button>
      </div>

      {showForge && <ForgeModal onClose={() => setShowForge(false)} />}
    </div>
  )
}

function tsuzuriHint(data: ReturnType<typeof useGame.getState>['data'] & object, adultCount: number): string {
  const alive = data.family.filter((c) => c.alive)
  const head = alive.find((c) => c.isHead)
  if (alive.length === 0) return '……一族は今、腹の中の子ひとりに懸かっとる。祈って待て。'
  if (head && seasonsLeft(head, data.seasonIndex) <= 1) {
    return `${head.name}の灯は、もってあと一季。……契りを済ませたか? 家譜に次の名を書かせてくれよ。`
  }
  if (adultCount > 0 && data.pendingBirths.length === 0 && alive.length <= 2 && data.hoto >= 80) {
    return '血が細い。星契りを急げ。一族が絶えれば、郷の大燈籠も消える。'
  }
  if (data.fame >= 60 && data.regionsCleared.length === 0) {
    return '武功が上がったな。提灯坂への道が開けとるぞ。あそこの主は……まあ、行けば分かる。'
  }
  const lines = [
    '書くことがないのは良い日だ、と千年書いてきて思う。……さ、今季はどう動く?',
    '夜藪は深いほど実り多い。だが灯が尽きた闇で死ぬなよ。「行方知れず」と書くのは、儂とて辛い。',
    '奉燈は使ってこそ。蔵で錆びさせるな、契りに、装備に、祭に回せ。',
    '同じ的を家族で続けて狙え。「継足」の連撃は、血の繋がりの技よ。',
  ]
  return lines[data.seasonIndex % lines.length]
}

function ForgeModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const buyItem = useGame((s) => s.buyItem)
  const equipItem = useGame((s) => s.equipItem)
  const trainStat = useGame((s) => s.trainStat)
  const [charId, setCharId] = useState<string | null>(null)

  const alive = data.family.filter((c) => c.alive)
  const shopTier = data.regionsCleared.length
  const stock = ITEM_BASES.filter((b) => b.shopTier <= shopTier)
  const selChar = alive.find((c) => c.id === charId)

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">鍛冶と蔵 — 奉燈 {data.hoto}</h2>

        <Panel title="購う(あがなう)">
          {stock.map((b) => (
            <button
              key={b.baseId}
              className="btn"
              disabled={data.hoto < b.price}
              onClick={() => buyItem(b.baseId)}
            >
              {b.name}
              {b.atk ? ` 攻${b.atk}` : ''}
              {b.def ? ` 防${b.def}` : ''} — {b.price}燈
            </button>
          ))}
        </Panel>

        <Panel title="装備を授ける">
          <p style={{ fontSize: 13, marginBottom: 8 }}>まず人を選び、次に蔵の品を選ぶ。</p>
          <div className="exp-party">
            {alive.map((c) => (
              <CharCard
                key={c.id}
                char={c}
                seasonIndex={data.seasonIndex}
                compact
                selected={charId === c.id}
                onClick={() => setCharId(c.id)}
              >
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  {(['weapon', 'armor', 'charm'] as const)
                    .map((s) => c.equipment[s]?.name)
                    .filter(Boolean)
                    .join(' / ') || '装備なし'}
                </div>
              </CharCard>
            ))}
          </div>
          {selChar && (
            <div style={{ marginTop: 10 }}>
              {data.inventory.length === 0 && <p style={{ fontSize: 13 }}>蔵は空だ。</p>}
              {data.inventory.map((it) => (
                <button key={it.id} className="btn" onClick={() => equipItem(selChar.id, it.id)}>
                  {it.name}
                  {it.atk ? ` 攻${it.atk}` : ''}
                  {it.def ? ` 防${it.def}` : ''}
                  {it.legacyOf ? ` — ${it.legacyOf}の形見` : ''}
                </button>
              ))}
            </div>
          )}
        </Panel>

        {selChar && (
          <Panel title={`修練 — ${selChar.name}の血潮を磨く(血珠5で+3)`}>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
              持てる血珠: {data.ketsu} — 磨いた血潮は子へも受け継がれる。
            </p>
            {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
              <button
                key={k}
                className="btn"
                disabled={data.ketsu < 5 || selChar.potential[k] >= 120}
                onClick={() => trainStat(selChar.id, k)}
              >
                {STAT_LABELS[k]} {selChar.potential[k]}→{Math.min(120, selChar.potential[k] + 3)}
              </button>
            ))}
          </Panel>
        )}
        <button className="btn btn-ghost" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  )
}
