import { useMemo, useState } from 'react'
import { useGame } from '../core/store'
import { seasonLabel, isFestivalMonth, STAT_LABELS, MOTTOS } from '../core/types'
import type { StatKey, MottoId, Element } from '../core/types'
import { isAdult, seasonsLeft } from '../core/inheritance'
import { ITEM_BASES, reforgeCost, REFORGE_MAX } from '../core/data/items'
import { GODS } from '../core/data/gods'
import { FACILITIES, FACILITY_MAX_LV, facilityCost, facilityLevel } from '../core/data/facilities'
import { VILLAGERS, villagerLine } from '../core/data/villagers'
import { GOSSIP } from '../core/data/gossip'
import { FAMILIAR_KINDS } from '../core/data/familiars'
import { CharCard, Ico, MaybeImg, NightBackdrop, Panel, TsuzuriLine } from './components'
import { gameImg, HOME_BG, HOME_BG_SEASONS, itemIcon, villagerImg } from './img'
import { FamilyTree } from './FamilyTree'
import './m17_home.css'

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
  const [showFacilities, setShowFacilities] = useState(false)
  const [showGossip, setShowGossip] = useState(false)
  const [showFamiliars, setShowFamiliars] = useState(false)

  const alive = data.family.filter((c) => c.alive)
  const adults = alive.filter((c) => isAdult(c, data.seasonIndex))
  const cheapestPact = Math.min(...GODS.map((g) => g.cost))
  const canPact = adults.length > 0 && data.hoto >= cheapestPact
  const hint = useMemo(() => tsuzuriHint(data, adults.length), [data, adults.length])

  return (
    <div className="screen home-screen">
      <NightBackdrop bg={gameImg(HOME_BG_SEASONS[Math.floor((data.seasonIndex % 12) / 3)] ?? HOME_BG)} />

      <header className="home-header">
        <span className="season-label">{seasonLabel(data.seasonIndex)}</span>
        <div className="resource-strip">
          <span className="resource"><Ico name="ic_hoto" fb="🏮" size={18} /><span className="res-label">奉燈</span><b>{data.hoto}</b></span>
          <span className="resource"><Ico name="ic_ketsu" fb="💠" size={18} /><span className="res-label">血珠</span><b>{data.ketsu}</b></span>
          <span className="resource"><Ico name="ic_buko" fb="🏅" size={18} /><span className="res-label">武功</span><b>{data.fame}</b></span>
        </div>
      </header>

      <div className="tsuzuri-row">
        <TsuzuriLine text={hint.text} />
        {hint.go && (
          <button className="btn tsuzuri-go" onClick={() => setScreen({ id: hint.go!.id })}>
            → {hint.go.label}
          </button>
        )}
      </div>

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
            primary iconName="ic_expedition" iconFb="⚔️" title="出立 — 夜藪へ"
            desc="夜藪へ潜り、奉燈と血珠を得る。深いほど実り多い。"
            disabled={adults.length === 0}
            note={adults.length === 0 ? '出立できる大人がいない' : undefined}
            onClick={() => setScreen({ id: 'depart' })}
          />
          <ActionCard
            iconName="ic_pact" iconFb="⭐" title="星契り — 次代を授かる"
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
            iconName={`fes_${['haru', 'natsu', 'aki', 'fuyu'][Math.floor((data.seasonIndex % 12) / 3)]}`} iconFb="🎆" title="祭 — 郷を潤す"
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
            iconName="ic_rest" iconFb="♨️" title="静養 — 傷を癒す"
            desc="隊の傷と心労を癒す。何もない月も、月は替わる。"
            onClick={doRest}
          />
        </div>
        <p className="action-note">月が替わるたび、一族は歳を取る。八季(廿四月)で灯は尽きる — 時を無駄にするな。</p>
      </Panel>

      <div className="home-links">
        <button className="btn btn-ghost" onClick={() => setShowForge(true)}><Ico name="ic_forge" fb="🔨" /> 鍛冶と蔵</button>
        <button className="btn btn-ghost" onClick={() => setScreen({ id: 'chronicle' })}><Ico name="ic_chronicle" fb="📜" /> 家譜を繰る</button>
        <button className="btn btn-ghost" onClick={() => setScreen({ id: 'codex' })}><Ico name="ic_codex" fb="📚" /> 図鑑</button>
        <button className="btn btn-ghost" onClick={() => setShowTree(true)}><Ico name="ic_tree" fb="🌳" /> 家系図</button>
        <button className="btn btn-ghost" onClick={() => setShowGossip(true)}>🕯️ 郷の声</button>
        <button className="btn btn-ghost" onClick={() => setShowVillage(true)}><Ico name="ic_village" fb="🏘️" /> 郷を歩く</button>
        <button className="btn btn-ghost" onClick={() => setShowFacilities(true)}><Ico name="ic_facility" fb="🏗️" /> 郷普請</button>
        <button className="btn btn-ghost" onClick={() => setShowFamiliars(true)}>🦊 眷属</button>
        <button className="btn btn-ghost" onClick={() => setShowMotto(true)}>
          <Ico name="ic_motto" fb="🏮" /> 家訓{data.motto ? `「${MOTTOS[data.motto].name}」` : 'を定める'}
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
            <Ico name="ic_tower" fb="🗼" /> 常夜百層
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => setShowHelp(true)}><Ico name="ic_help" fb="📖" /> 手引き</button>
      </div>

      {showMotto && <MottoModal onClose={() => setShowMotto(false)} />}
      {showForge && <ForgeModal onClose={() => setShowForge(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showVillage && <VillageModal onClose={() => setShowVillage(false)} />}
      {showTree && <FamilyTree onClose={() => setShowTree(false)} />}
      {showFacilities && <FacilitiesModal onClose={() => setShowFacilities(false)} />}
      {showGossip && <GossipModal onClose={() => setShowGossip(false)} />}
      {showFamiliars && <FamiliarsModal onClose={() => setShowFamiliars(false)} />}
    </div>
  )
}

// 郷の行動カード — 図像・見出し・一言でわかりやすく。無効時は理由を添える。
function ActionCard({
  iconName, iconFb, title, desc, note, disabled, primary, onClick,
}: {
  iconName: string
  iconFb: string
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
      <span className="action-card-icon"><Ico name={iconName} fb={iconFb} size={32} /></span>
      <span className="action-card-text">
        <span className="action-card-title">{title}</span>
        <span className="action-card-desc">{disabled && note ? note : desc}</span>
      </span>
    </button>
  )
}

// 郷人の帯(0-3)。villagers.ts内部のband()と同じ閾値(0-2年/3-5年/6-9年/10年〜)。
function villagerBand(seasonIndex: number): 0 | 1 | 2 | 3 {
  const years = Math.floor(seasonIndex / 12)
  if (years < 3) return 0
  if (years < 6) return 1
  if (years < 10) return 2
  return 3
}

// 郷を歩く — 普通の寿命を生きる郷人たちと言葉を交わす
function VillageModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const [talk, setTalk] = useState<{ id: string; name: string; text: string } | null>(null)
  const band = villagerBand(data.seasonIndex)
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">燈ノ郷 — 大燈籠のふもと</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
          郷人たちは、ふつうの寿命を生きる。あなたの一族だけが、はやい。
        </p>
        <div className="home-actions">
          {VILLAGERS.map((v) => (
            <button key={v.id} className="btn" onClick={() => setTalk({ id: v.id, ...villagerLine(v.id, data) })}>
              <MaybeImg src={villagerImg(v.id, band)} className="vil-thumb" />
              {v.emoji} {v.name}({v.role})
            </button>
          ))}
        </div>
        {talk && (
          <div className="tsuzuri" style={{ marginTop: 14 }}>
            <MaybeImg src={villagerImg(talk.id, band)} className="vil-portrait" />
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
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">綴の手引き — 千年ぶん、要点だけな</h2>
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
        <button className="btn btn-ghost" onClick={onClose}>閉じる</button>
      </div>
    </div>
  )
}

type HintGo = { id: 'pact' | 'depart'; label: string }
function tsuzuriHint(data: ReturnType<typeof useGame.getState>['data'] & object, adultCount: number): { text: string; go?: HintGo } {
  const alive = data.family.filter((c) => c.alive)
  const head = alive.find((c) => c.isHead)
  if (alive.length === 0) return { text: '……一族は今、腹の中の子ひとりに懸かっとる。祈って待て。' }
  if (head && seasonsLeft(head, data.seasonIndex) <= 3) {
    return { text: `${head.name}の灯は、もってあとひと季。……契りを済ませたか? 家譜に次の名を書かせてくれよ。`, go: { id: 'pact', label: '星契りへ' } }
  }
  if (adultCount > 0 && data.pendingBirths.length === 0 && alive.length <= 2 && data.hoto >= 80) {
    return { text: '血が細い。星契りを急げ。一族が絶えれば、郷の大燈籠も消える。', go: { id: 'pact', label: '星契りへ' } }
  }
  if (data.fame >= 60 && data.regionsCleared.length === 0) {
    return { text: '武功が上がったな。提灯坂への道が開けとるぞ。あそこの主は……まあ、行けば分かる。', go: { id: 'depart', label: '出立へ' } }
  }
  const lines = [
    '書くことがないのは良い日だ、と千年書いてきて思う。……さ、今月はどう動く?',
    '夜藪は深いほど実り多い。だが灯が尽きた闇で死ぬなよ。「行方知れず」と書くのは、儂とて辛い。',
    '奉燈は使ってこそ。蔵で錆びさせるな、契りに、装備に、祭に回せ。',
    '同じ的を家族で続けて狙え。「継足」の連撃は、血の繋がりの技よ。',
  ]
  return { text: lines[data.seasonIndex % lines.length] }
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
  const [invSort, setInvSort] = useState<'slot' | 'atk' | 'def' | 'gen'>('slot')

  const alive = data.family.filter((c) => c.alive)
  const shopTier = data.regionsCleared.length
  const stock = ITEM_BASES.filter((b) => b.shopTier <= shopTier)
  const selChar = alive.find((c) => c.id === charId)

  // 蔵の並べ替え(表示のみ・データ非改変)
  const SLOT_ORDER: Record<string, number> = { weapon: 0, armor: 1, charm: 2 }
  const sortedInv = [...data.inventory].sort((a, b) => {
    if (invSort === 'atk') return (b.atk ?? 0) - (a.atk ?? 0)
    if (invSort === 'def') return (b.def ?? 0) - (a.def ?? 0)
    if (invSort === 'gen') return b.generation - a.generation
    return (SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]) || (b.atk ?? 0) - (a.atk ?? 0)
  })
  const INV_SORTS: [typeof invSort, string][] = [['slot', '種別'], ['atk', '攻'], ['def', '防'], ['gen', '継承']]

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
              <MaybeImg src={itemIcon(b.baseId)} className="it-ico" />
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
              {data.inventory.length > 1 && (
                <div className="inv-sort-row">
                  <span className="inv-sort-lbl">並べ替え</span>
                  {INV_SORTS.map(([key, label]) => (
                    <button key={key} className={`btn btn-ghost inv-sort-btn ${invSort === key ? 'active' : ''}`} onClick={() => setInvSort(key)}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {sortedInv.map((it) => (
                <button key={it.id} className="btn" onClick={() => equipItem(selChar.id, it.id)}>
                  <MaybeImg src={itemIcon(it.baseId)} className="it-ico" />
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
                <MaybeImg src={itemIcon(it.baseId)} className="it-ico" />
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

// 郷の声(v3.1 M16-3) — 解禁済みの会話キューを読み返す。未解禁は「？？？」で伏せる
function GossipModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const unlocked = data.gossipIndex ?? 0

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">🕯️ 郷の声 — 聞こえてきた話</h2>
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
        <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: 10 }}>
          家に戻る
        </button>
      </div>
    </div>
  )
}

// 郷普請(v3.1 M16-6) — 奉燈を注ぎ、代を跨いで効く4つの施設を建てる/普請する
function FacilitiesModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const buildFacility = useGame((s) => s.buildFacility)

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">郷普請 — 奉燈 {data.hoto}</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
          施設は建てるほど郷を潤す。効果は代を跨いで一族全体に及ぶ。各施設Lv{FACILITY_MAX_LV}まで普請できる。
        </p>
        {FACILITIES.map((f) => {
          const lv = facilityLevel(data.facilities, f.id)
          const maxed = lv >= FACILITY_MAX_LV
          const cost = maxed ? 0 : facilityCost(f.id, lv)
          return (
            <Panel key={f.id} title={`${f.name} — Lv${lv}/${FACILITY_MAX_LV}`}>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>{f.desc}</p>
              <ul style={{ fontSize: 12, margin: '0 0 8px', paddingLeft: 18 }}>
                {f.effects.map((e, i) => (
                  <li key={i} style={{ color: i < lv ? 'var(--amber)' : 'var(--text-dim)' }}>
                    Lv{i + 1}: {e}
                  </li>
                ))}
              </ul>
              <button
                className="btn"
                disabled={maxed || data.hoto < cost}
                onClick={() => buildFacility(f.id)}
              >
                {maxed ? '普請済み(最大)' : lv === 0 ? `建てる — ${cost}燈` : `Lv${lv + 1}へ普請 — ${cost}燈`}
              </button>
            </Panel>
          )
        })}
        <button className="btn btn-ghost" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  )
}

// 眷属(式神) v3.1 M16-5 — 討った魔性が稀に懐く。一体だけ随行させ、夜藪で共に働く
function FamiliarsModal({ onClose }: { onClose: () => void }) {
  const data = useGame((s) => s.data)!
  const setActiveFamiliar = useGame((s) => s.setActiveFamiliar)
  const familiars = data.familiars ?? []

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="panel-title">🦊 眷属 — 懐いた魔性たち</h2>
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
        <button className="btn btn-ghost" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  )
}
