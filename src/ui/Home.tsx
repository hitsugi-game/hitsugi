import { useMemo, useState } from 'react'
import { useGame } from '../core/store'
import { seasonLabel, isFestivalMonth, STAT_LABELS, MOTTOS } from '../core/types'
import type { StatKey, MottoId } from '../core/types'
import { isAdult, seasonsLeft } from '../core/inheritance'
import { ITEM_BASES, reforgeCost, REFORGE_MAX } from '../core/data/items'
import { GODS } from '../core/data/gods'
import { VILLAGERS, villagerLine } from '../core/data/villagers'
import { CharCard, NightBackdrop, Panel, TsuzuriLine } from './components'
import { gameImg, HOME_BG } from './img'
import { FamilyTree } from './FamilyTree'

export function HomeScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const departDungeon = useGame((s) => s.departDungeon)
  const doFestival = useGame((s) => s.doFestival)
  const doRest = useGame((s) => s.doRest)
  const [showForge, setShowForge] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showMotto, setShowMotto] = useState(false)
  const [showVillage, setShowVillage] = useState(false)
  const [showTree, setShowTree] = useState(false)

  const alive = data.family.filter((c) => c.alive)
  const adults = alive.filter((c) => isAdult(c, data.seasonIndex))
  const cheapestPact = Math.min(...GODS.map((g) => g.cost))
  const canPact = adults.length > 0 && data.hoto >= cheapestPact
  const hint = useMemo(() => tsuzuriHint(data, adults.length), [data, adults.length])

  return (
    <div className="screen home-screen">
      <NightBackdrop bg={gameImg(HOME_BG)} />

      <header className="home-header">
        <span className="season-label">{seasonLabel(data.seasonIndex)}</span>
        <div className="resource-strip">
          <span className="resource"><span className="res-ico">🏮</span><span className="res-label">奉燈</span><b>{data.hoto}</b></span>
          <span className="resource"><span className="res-ico">💠</span><span className="res-label">血珠</span><b>{data.ketsu}</b></span>
          <span className="resource"><span className="res-ico">🏅</span><span className="res-label">武功</span><b>{data.fame}</b></span>
        </div>
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

      <Panel title="今月の行い — 一つ選べば月が替わる">
        <div className="action-cards">
          <ActionCard
            primary icon="⚔️" title="出立 — 夜藪へ"
            desc="夜藪へ潜り、奉燈と血珠を得る。深いほど実り多い。"
            disabled={adults.length === 0}
            note={adults.length === 0 ? '出立できる大人がいない' : undefined}
            onClick={() => setScreen({ id: 'depart' })}
          />
          <ActionCard
            icon="⭐" title="星契り — 次代を授かる"
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
            icon="🎆" title="祭 — 郷を潤す"
            desc={isFestivalMonth(data.seasonIndex)
              ? '奉燈30を捧げ、一族の傷と心労を癒す。星との縁も深まる。'
              : '祭は季の変わり目(弥生・水無月・長月・師走)だけ開ける。'}
            disabled={data.hoto < 30 || !isFestivalMonth(data.seasonIndex)}
            note={
              !isFestivalMonth(data.seasonIndex) ? '今は祭月でない'
                : data.hoto < 30 ? '奉燈が足りない'
                  : undefined
            }
            onClick={doFestival}
          />
          <ActionCard
            icon="♨️" title="静養 — 傷を癒す"
            desc="隊の傷と心労を癒す。何もない月も、月は替わる。"
            onClick={doRest}
          />
        </div>
        <p className="action-note">月が替わるたび、一族は歳を取る。八季(廿四月)で灯は尽きる — 時を無駄にするな。</p>
      </Panel>

      <div className="home-links">
        <button className="btn btn-ghost" onClick={() => setShowForge(true)}>🔨 鍛冶と蔵</button>
        <button className="btn btn-ghost" onClick={() => setScreen({ id: 'chronicle' })}>📜 家譜を繰る</button>
        <button className="btn btn-ghost" onClick={() => setScreen({ id: 'codex' })}>📚 図鑑</button>
        <button className="btn btn-ghost" onClick={() => setShowTree(true)}>🌳 家系図</button>
        <button className="btn btn-ghost" onClick={() => setShowVillage(true)}>🏘️ 郷を歩く</button>
        <button className="btn btn-ghost" onClick={() => setShowMotto(true)}>
          🏮 家訓{data.motto ? `「${MOTTOS[data.motto].name}」` : 'を定める'}
        </button>
        {!!data.flags.cleared && (
          <button
            className="btn btn-ghost"
            title="千年紀を越えた一族の試練場 — 存命の大人(先頭4名)で挑む"
            onClick={() => {
              const party = data.family.filter((c) => c.alive && isAdult(c, data.seasonIndex)).slice(0, 4)
              if (party.length > 0) departDungeon('tokoyo_tou', party.map((c) => c.id))
            }}
          >
            🗼 常夜百層
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => setShowHelp(true)}>📖 手引き</button>
      </div>

      {showMotto && <MottoModal onClose={() => setShowMotto(false)} />}
      {showForge && <ForgeModal onClose={() => setShowForge(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showVillage && <VillageModal onClose={() => setShowVillage(false)} />}
      {showTree && <FamilyTree onClose={() => setShowTree(false)} />}
    </div>
  )
}

// 郷の行動カード — 図像・見出し・一言でわかりやすく。無効時は理由を添える。
function ActionCard({
  icon, title, desc, note, disabled, primary, onClick,
}: {
  icon: string
  title: string
  desc: string
  note?: string
  disabled?: boolean
  primary?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`action-card ${primary ? 'primary' : ''}`}
      disabled={disabled}
      onClick={onClick}
      title={note ?? ''}
    >
      <span className="action-card-icon">{icon}</span>
      <span className="action-card-text">
        <span className="action-card-title">{title}</span>
        <span className="action-card-desc">{disabled && note ? note : desc}</span>
      </span>
    </button>
  )
}

// 郷を歩く — 普通の寿命を生きる郷人たちと言葉を交わす
function VillageModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const [talk, setTalk] = useState<{ name: string; text: string } | null>(null)
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">燈ノ郷 — 大燈籠のふもと</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
          郷人たちは、ふつうの寿命を生きる。あなたの一族だけが、はやい。
        </p>
        <div className="home-actions">
          {VILLAGERS.map((v) => (
            <button key={v.id} className="btn" onClick={() => setTalk(villagerLine(v.id, data))}>
              {v.emoji} {v.name}({v.role})
            </button>
          ))}
        </div>
        {talk && (
          <div className="tsuzuri" style={{ marginTop: 14 }}>
            <span className="tsuzuri-name" style={{ fontSize: 10 }}>{talk.name.slice(0, 2)}</span>
            <span className="tsuzuri-text">
              <b style={{ color: 'var(--amber)' }}>{talk.name}</b> —「{talk.text}」
            </span>
          </div>
        )}
        <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: 10 }}>
          家に戻る
        </button>
      </div>
    </div>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">綴の手引き — 千年ぶん、要点だけな</h2>
        <div style={{ fontSize: 14, lineHeight: 1.9 }}>
          <p><b style={{ color: 'var(--amber)' }}>命は八季。</b>生まれて八つの季節で、一族は必ず灯が尽きる。名前の下の炎が残り寿命だ。</p>
          <p><b style={{ color: 'var(--amber)' }}>星契りを絶やすな。</b>子は翌月に生まれ、六月(半年)で成人する。親の血潮と星神の血潮を継ぐ — 高い位の星ほど濃い血をくれる。</p>
          <p><b style={{ color: 'var(--amber)' }}>夜藪では灯が命綱。</b>灯が尽きると魔性が狂暴化する。「帰り火」はいつでも焚ける — 欲と命を天秤にかけろ。</p>
          <p><b style={{ color: 'var(--amber)' }}>継足(つぎたし)。</b>戦いで家族が同じ敵を続けて狙うと、連撃の倍率が上がる。血の繋がりは技になる。</p>
          <p><b style={{ color: 'var(--amber)' }}>形見は強くなる。</b>死者の装備は「形見」として蔵に還り、代を継ぐごとに強まる。祖母の簪は、孫の代で名刀に劣らん。</p>
          <p><b style={{ color: 'var(--amber)' }}>敗北は終わりじゃない。</b>主に敗れても、次の世代がいる。血を濃くして、装備を継いで、雪辱しろ。それが灯継ぎだ。</p>
        </div>
        <button className="btn btn-ghost" onClick={onClose}>閉じる</button>
      </div>
    </div>
  )
}

function tsuzuriHint(data: ReturnType<typeof useGame.getState>['data'] & object, adultCount: number): string {
  const alive = data.family.filter((c) => c.alive)
  const head = alive.find((c) => c.isHead)
  if (alive.length === 0) return '……一族は今、腹の中の子ひとりに懸かっとる。祈って待て。'
  if (head && seasonsLeft(head, data.seasonIndex) <= 3) {
    return `${head.name}の灯は、もってあとひと季。……契りを済ませたか? 家譜に次の名を書かせてくれよ。`
  }
  if (adultCount > 0 && data.pendingBirths.length === 0 && alive.length <= 2 && data.hoto >= 80) {
    return '血が細い。星契りを急げ。一族が絶えれば、郷の大燈籠も消える。'
  }
  if (data.fame >= 60 && data.regionsCleared.length === 0) {
    return '武功が上がったな。提灯坂への道が開けとるぞ。あそこの主は……まあ、行けば分かる。'
  }
  const lines = [
    '書くことがないのは良い日だ、と千年書いてきて思う。……さ、今月はどう動く?',
    '夜藪は深いほど実り多い。だが灯が尽きた闇で死ぬなよ。「行方知れず」と書くのは、儂とて辛い。',
    '奉燈は使ってこそ。蔵で錆びさせるな、契りに、装備に、祭に回せ。',
    '同じ的を家族で続けて狙え。「継足」の連撃は、血の繋がりの技よ。',
  ]
  return lines[data.seasonIndex % lines.length]
}

// 家訓(v3.1 M12-8) — 当主が家風を定める。一族全体への小さな加護
function MottoModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const setMotto = useGame((s) => s.setMotto)
  const head = data.family.find((c) => c.alive && c.isHead)
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">家訓 — {head?.name ?? '当主'}が掲げる家風</h2>
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
        <button className="btn btn-ghost" onClick={onClose}>閉じる</button>
      </div>
    </div>
  )
}

function ForgeModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const buyItem = useGame((s) => s.buyItem)
  const equipItem = useGame((s) => s.equipItem)
  const trainStat = useGame((s) => s.trainStat)
  const forgeUpgrade = useGame((s) => s.forgeUpgrade)
  const [charId, setCharId] = useState<string | null>(null)

  const alive = data.family.filter((c) => c.alive)
  const shopTier = data.regionsCleared.length
  const stock = ITEM_BASES.filter((b) => b.shopTier <= shopTier)
  const selChar = alive.find((c) => c.id === charId)

  // 打ち直し対象(v3.1 M12-1): 蔵の品+全員の装備
  const forgeables = [
    ...data.inventory.map((it) => ({ it, where: '蔵' })),
    ...alive.flatMap((c) =>
      (['weapon', 'armor', 'charm'] as const)
        .map((s) => c.equipment[s])
        .filter((x): x is NonNullable<typeof x> => !!x)
        .map((it) => ({ it, where: c.name })),
    ),
  ]

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

        <Panel title="打ち直し — 槌を入れ、代を深める">
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
            持てる血珠: {data.ketsu} — 打つほど強く(1代ごと基礎+12%)。遺品は銘を保ったまま深まる。上限{REFORGE_MAX}代。
          </p>
          {forgeables.length === 0 && <p style={{ fontSize: 13 }}>打てる品がない。</p>}
          {forgeables.map(({ it, where }) => {
            const cost = reforgeCost(it)
            const maxed = it.generation >= REFORGE_MAX
            return (
              <button
                key={it.id}
                className="btn"
                disabled={maxed || data.hoto < cost.hoto || data.ketsu < cost.ketsu}
                onClick={() => forgeUpgrade(it.id)}
                title={it.legacyOf ? `${it.legacyOf}の形見` : undefined}
              >
                {it.name}
                {it.atk ? ` 攻${it.atk}` : ''}
                {it.def ? ` 防${it.def}` : ''}
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}> ({where})</span>
                {maxed ? ' — 打ち止め' : ` — ${cost.hoto}燈+珠${cost.ketsu}`}
              </button>
            )
          })}
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
