// M18 P3: 鍛冶と蔵 — 独立作業画面(UI_UX_REDESIGN_PLAN §5.5)
// 購う/装備/打ち直し/鍛錬の4タブ。選択人物は画面上部に固定し、タブを跨いで保持する(§6.3)。
// M26 §7.3: 購う/装備タブはmaster/detail。一覧札は選択のみ、購入・装備は詳細ペイン(769px以上=右sticky)
// またはSheet(768px以下)のCTAからのみ行う。打ち直し/鍛錬タブは既存のSheet確認パターンを維持(変更なし)。
// 契約: docs/UI_SHELL_API.md(SFX=.btn系クラス/文言/12.5px下限/大量一覧は50件刻み)。
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useGame } from '../core/store'
import type { Character, GameData, Item, ItemSlot, StatKey, Stats } from '../core/types'
import { STAT_LABELS } from '../core/types'
import { ITEM_BASES, previewReforge, reforgeCost, REFORGE_MAX } from '../core/data/items'
import {
  diffItems, qualityOf, rarityOf, sourceLabelOf,
  RARITY_LABELS, SLOT_MARKS, SOURCE_LABELS, type ItemDiff, type RarityKey,
} from '../core/item_axes'
import { isAdult } from '../core/inheritance'
import { MaybeImg, NightBackdrop, Panel } from './components'
import { itemIcon } from './img'
import { ScreenShell, WorkspaceTabs, Sheet, CompareRow, EmptyGuide } from './layout/shell'
import { emitToast } from './toast'
import './forge_m18.css'
import './forge_m26.css' // M26 §7.3/§7.4: master/detail・血潮鍛錬の回数ステッパー(forge_m18.cssより後 — 後勝ち)

type Tab = 'buy' | 'equip' | 'reforge' | 'train'
type SlotFilter = 'all' | 'weapon' | 'armor' | 'charm'
const SLOT_LABEL: Record<string, string> = { weapon: '武具', armor: '防具', charm: '御守' }
const SLOT_ORDER: Record<string, number> = { weapon: 0, armor: 1, charm: 2 }
const PAGE = 50 // 大量一覧は50件刻み(§7契約)
const BUY_CONFIRM_RATIO = 0.25 // M26 §7.4: 残奉燈のこの割合以上を使う購入だけ追加確認Sheetを挟む
const MOBILE_BREAKPOINT = 768 // M26 §4.3: 768px以下は詳細をSheetで、769px以上は右sticky詳細ペインで見せる

// 装備差分(M22): 同スロットの現装備と比べ、攻/防+六能力を軸別に返す(core/item_axes)
function diffAgainst(
  ch: { equipment: Partial<Record<ItemSlot, Item>> } | undefined,
  it: { slot: ItemSlot; atk?: number; def?: number; statBonus?: Partial<Stats> },
) {
  return diffItems(ch?.equipment[it.slot], it)
}

// M26 §4.3: 769px境界の判定。resize/回転で追従する(SSRなしのVite SPAなのでmount時のwindow参照は安全)
function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

// 品質(基礎の格)+希少度(来歴)のチップ — 色+枠+文字で示す(M22 §2.2)。詳細面でのみ使う(§7.3)。
function AxisChips({ baseId, it }: { baseId: string; it?: Pick<Item, 'source' | 'generation' | 'legacyOf'> }) {
  const q = qualityOf(baseId)
  const r = it ? rarityOf(it) : null
  return (
    <span className="item-axes">
      {q && <span className={`q-chip ${q.key}`}>{q.name}</span>}
      {r && r.key !== 'common' && <span className={`r-chip r-${r.key}`}>◆{r.name}</span>}
    </span>
  )
}

// 希少度チップのみ — 一覧札用(§7.3「一覧に残す情報」)。品質チップは詳細面(AxisChips)のみに残す。
function RarityChip({ it }: { it?: Pick<Item, 'source' | 'generation' | 'legacyOf'> }) {
  const r = it ? rarityOf(it) : null
  if (!r || r.key === 'common') return null
  return <span className={`r-chip r-${r.key}`}>◆{r.name}</span>
}

// 基礎の能力表記(攻/防+六能力) — 詳細面の全軸表示に使う
function baseStatText(b: { atk?: number; def?: number; statBonus?: Partial<Stats> }): string {
  const parts: string[] = []
  if (b.atk) parts.push(`攻${b.atk}`)
  if (b.def) parts.push(`防${b.def}`)
  if (b.statBonus) {
    for (const [k, v] of Object.entries(b.statBonus) as [StatKey, number][]) parts.push(`${STAT_LABELS[k]}+${v}`)
  }
  return parts.join(' ')
}

// 一覧札の主値 — 攻/防のどちらか一つ。飾り等それ以外は主たる血潮ボーナス一つ(§7.3の一般化)
function primaryStatText(b: { atk?: number; def?: number; statBonus?: Partial<Stats> }): string {
  if (b.atk) return `攻${b.atk}`
  if (b.def) return `防${b.def}`
  const first = b.statBonus ? (Object.entries(b.statBonus) as [StatKey, number][])[0] : undefined
  return first ? `${STAT_LABELS[first[0]]}+${first[1]}` : ''
}

// 比較対象に対する主な差分一つ — 全軸中、絶対値最大のものだけを一覧札に示す(§7.3)
function primaryDiff(d: ItemDiff): { text: string; up: boolean } | null {
  const axes: [string, number][] = [
    ['攻', d.dAtk],
    ['防', d.dDef],
    ...(Object.entries(d.dStats) as [StatKey, number][]).map(([k, v]) => [STAT_LABELS[k], v] as [string, number]),
  ]
  const top = axes.filter(([, v]) => v !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]
  return top ? { text: `${top[0]}${top[1] > 0 ? '+' : ''}${top[1]}`, up: top[1] > 0 } : null
}

export function ForgeScreen() {
  const data = useGame((s) => s.data)!
  const setScreen = useGame((s) => s.setScreen)
  const buyItem = useGame((s) => s.buyItem)
  const equipItem = useGame((s) => s.equipItem)
  const trainStat = useGame((s) => s.trainStat)
  const forgeUpgrade = useGame((s) => s.forgeUpgrade)

  const [tab, setTab] = useState<Tab>('buy')
  const [charId, setCharId] = useState<string | null>(null)
  const [slotF, setSlotF] = useState<SlotFilter>('all')
  const [invSort, setInvSort] = useState<'slot' | 'atk' | 'def' | 'gen'>('slot')
  const [shown, setShown] = useState(PAGE)
  const [search, setSearch] = useState('') // 名前検索(M22 §2.2)
  const [rarF, setRarF] = useState<'all' | RarityKey>('all') // 希少度絞り込み(装備タブ)
  const [affordOnly, setAffordOnly] = useState(false) // 今買える物のみ(購うタブ)
  const [reforgeTarget, setReforgeTarget] = useState<{ it: Item; where: string } | null>(null)
  const [trainTarget, setTrainTarget] = useState<StatKey | null>(null) // M26 §7.4: 鍛錬の確認対象(即消費を廃止)
  // M26 §7.3: master/detail の選択状態。カードは選択のみ、実行は詳細ペイン/Sheetから(タブ跨ぎで保持)
  const [buySel, setBuySel] = useState<string | null>(null) // 選択中のbaseId(購う)
  const [buyConfirmArmed, setBuyConfirmArmed] = useState(false) // §7.4: 残奉燈25%以上の購入は追加確認
  const [equipSel, setEquipSel] = useState<string | null>(null) // 選択中のitem.id(蔵)
  const isMobile = useIsMobileViewport()

  // 購うタブを離れたら未確定の高額確認は破棄する(戻った時に古い確認へ即着地させない)
  useEffect(() => { if (tab !== 'buy') setBuyConfirmArmed(false) }, [tab])

  const alive = data.family.filter((c) => c.alive)
  const selChar = alive.find((c) => c.id === charId) ?? alive.find((c) => c.isHead) ?? alive[0]

  const shopTier = data.regionsCleared.length
  const stock = useMemo(() => {
    let list = ITEM_BASES.filter((b) => b.shopTier <= shopTier && (slotF === 'all' || b.slot === slotF))
    if (search) list = list.filter((b) => b.name.includes(search))
    if (affordOnly) list = list.filter((b) => b.price <= data.hoto)
    // 初期状態(全て)はカテゴリ別に並べる(M22 §2.2)
    if (slotF === 'all') list = [...list].sort((a, b) => (SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]) || a.shopTier - b.shopTier)
    return list
  }, [shopTier, slotF, search, affordOnly, data.hoto])

  const inv = useMemo(() => {
    let filtered = data.inventory.filter((it) => slotF === 'all' || it.slot === slotF)
    if (search) filtered = filtered.filter((it) => it.name.includes(search))
    if (rarF !== 'all') filtered = filtered.filter((it) => rarityOf(it).key === rarF)
    return [...filtered].sort((a, b) => {
      if (invSort === 'atk') return (b.atk ?? 0) - (a.atk ?? 0)
      if (invSort === 'def') return (b.def ?? 0) - (a.def ?? 0)
      if (invSort === 'gen') return b.generation - a.generation
      return (SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]) || (b.atk ?? 0) - (a.atk ?? 0)
    })
  }, [data.inventory, invSort, slotF, search, rarF])

  // 打ち直し対象: 蔵の品+全員の装備
  const forgeables = useMemo(() => {
    const all = [
      ...data.inventory.map((it) => ({ it, where: '蔵' })),
      ...alive.flatMap((c) =>
        (['weapon', 'armor', 'charm'] as const)
          .map((s) => c.equipment[s])
          .filter((x): x is NonNullable<typeof x> => !!x)
          .map((it) => ({ it, where: c.name })),
      ),
    ]
    return search ? all.filter((f) => f.it.name.includes(search)) : all
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.inventory, data.family, search])

  // M26 §7.3: 一覧札の「装備中/所持数」用の集計。baseIdごとに一度だけ数える(カードごとの再計算を避ける)
  const ownedByBase = useMemo(() => {
    const m = new Map<string, number>()
    for (const it of data.inventory) m.set(it.baseId, (m.get(it.baseId) ?? 0) + 1)
    return m
  }, [data.inventory])
  const equippedByBase = useMemo(() => {
    const m = new Map<string, Character[]>()
    for (const c of data.family) {
      if (!c.alive) continue
      for (const s of ['weapon', 'armor', 'charm'] as const) {
        const eq = c.equipment[s]
        if (!eq) continue
        const arr = m.get(eq.baseId)
        if (arr) arr.push(c)
        else m.set(eq.baseId, [c])
      }
    }
    return m
  }, [data.family])

  // 選択中の実体は「全件」から引く — 絞り込みで一覧から外れても詳細は開いたままにする(§15.4 状態保持)
  const selectedBuyBase = buySel != null ? (ITEM_BASES.find((b) => b.baseId === buySel) ?? null) : null
  const selectedInvItem = equipSel != null ? (data.inventory.find((it) => it.id === equipSel) ?? null) : null

  const TABS: { key: Tab; label: string }[] = [
    { key: 'buy', label: '購う' },
    { key: 'equip', label: '装備' },
    { key: 'reforge', label: '打ち直し' },
    { key: 'train', label: '鍛錬' },
  ]
  const changeTab = (t: Tab) => { setTab(t); setShown(PAGE) }

  const doBuy = (baseId: string) => {
    const base = ITEM_BASES.find((b) => b.baseId === baseId)
    if (!base || data.hoto < base.price) return
    buyItem(baseId)
    emitToast(`${base.name}を購うた — 残り奉燈${data.hoto - base.price}`, 'info')
  }

  const doEquip = (it: Item) => {
    if (!selChar) return
    equipItem(selChar.id, it.id)
    emitToast(`${selChar.name}に${it.name}を授けた`, 'info')
  }

  // M26 §7.3/§7.4: 一覧札は選択のみ。購入・装備は下記ハンドラ経由で詳細ペイン/SheetのCTAからのみ発火する。
  const selectBuy = (baseId: string | null) => { setBuySel(baseId); setBuyConfirmArmed(false) }
  const handleBuyPrimary = (b: { baseId: string; price: number }) => {
    if (data.hoto < b.price) return
    if (b.price >= data.hoto * BUY_CONFIRM_RATIO) setBuyConfirmArmed(true)
    else doBuy(b.baseId)
  }
  const confirmBuy = (baseId: string) => { doBuy(baseId); setBuyConfirmArmed(false) }
  const cancelBuyConfirm = () => setBuyConfirmArmed(false)
  const confirmEquip = (it: Item) => { doEquip(it); setEquipSel(null) } // 装備後は蔵から消えるため選択を閉じる

  const buyDetailNode = selectedBuyBase && (
    <BuyDetail
      b={selectedBuyBase}
      selChar={selChar}
      data={data}
      ownedCount={ownedByBase.get(selectedBuyBase.baseId) ?? 0}
      equippedBy={equippedByBase.get(selectedBuyBase.baseId) ?? []}
      armed={buyConfirmArmed}
      onPrimary={() => handleBuyPrimary(selectedBuyBase)}
      onCancel={cancelBuyConfirm}
      onConfirm={() => confirmBuy(selectedBuyBase.baseId)}
    />
  )
  const equipDetailNode = selectedInvItem && selChar && (
    <EquipDetail
      it={selectedInvItem}
      selChar={selChar}
      ownedCount={ownedByBase.get(selectedInvItem.baseId) ?? 0}
      equippedBy={equippedByBase.get(selectedInvItem.baseId) ?? []}
      onEquip={() => confirmEquip(selectedInvItem)}
    />
  )

  const needsChar = tab === 'equip' || tab === 'train'

  return (
    <ScreenShell
      title="鍛冶と蔵"
      onBack={() => setScreen({ id: 'home' })}
      resources={<>奉燈 <b>{data.hoto}</b> ／ 血珠 <b>{data.ketsu}</b></>}
      tabs={<WorkspaceTabs tabs={TABS} active={tab} onChange={changeTab} />}
      activeTab={tab}
    >
      <NightBackdrop />

      {/* 選択人物の固定表示(装備/鍛錬タブ) */}
      {needsChar && (
        <div className="forge-char-rail">
          {alive.length === 0 ? (
            <EmptyGuide text="いま生きている者はいない。" actionLabel="郷へ戻る" onAction={() => setScreen({ id: 'home' })} />
          ) : (
            alive.map((c) => (
              <button
                key={c.id}
                className={`btn forge-char ${selChar?.id === c.id ? 'is-sel' : ''}`}
                onClick={() => setCharId(c.id)}
              >
                {c.isHead && <span className="forge-char-head">当主</span>}
                {c.name}
                {!isAdult(c, data.seasonIndex) && <span className="forge-char-note">幼子</span>}
              </button>
            ))
          )}
        </div>
      )}

      {/* 絞り込み(購う/装備/打ち直し): 検索+部位+希少度+買える物のみ(M22 §2.2) */}
      {tab !== 'train' && (
        <div className="forge-filter-row">
          <input
            className="forge-search"
            type="search"
            placeholder="名で捜す"
            aria-label="装備を名前で捜す"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShown(PAGE) }}
          />
          {(tab === 'buy' || tab === 'equip') &&
            (['all', 'weapon', 'armor', 'charm'] as SlotFilter[]).map((s) => (
              <button key={s} className={`btn btn-ghost filter-tab ${slotF === s ? 'active' : ''}`} onClick={() => { setSlotF(s); setShown(PAGE) }}>
                {s === 'all' ? '全て' : SLOT_LABEL[s]}
              </button>
            ))}
          {tab === 'buy' && (
            <button
              className={`btn btn-ghost filter-tab ${affordOnly ? 'active' : ''}`}
              aria-pressed={affordOnly}
              onClick={() => { setAffordOnly((v) => !v); setShown(PAGE) }}
            >
              買える物のみ
            </button>
          )}
          {tab === 'equip' && (
            <>
              <span className="forge-sort-lbl">希少</span>
              {(['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'] as const).map((r) => (
                <button
                  key={r}
                  className={`btn btn-ghost filter-tab ${rarF === r ? 'active' : ''}`}
                  onClick={() => { setRarF(r); setShown(PAGE) }}
                >
                  {r === 'all' ? '全' : RARITY_LABELS[r]}
                </button>
              ))}
              <span className="forge-sort-lbl">並べ替え</span>
              {([['slot', '種別'], ['atk', '攻'], ['def', '防'], ['gen', '継承']] as const).map(([key, label]) => (
                <button key={key} className={`btn btn-ghost inv-sort-btn ${invSort === key ? 'active' : ''}`} onClick={() => setInvSort(key)}>
                  {label}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* M26 §7.3: 購う — 一覧(代表2〜3軸)+詳細(769px以上=sticky右ペイン)。768px以下は選択でSheet。 */}
      {tab === 'buy' && (
        <div className="forge-md">
          <Panel title={`購う(あがなう) — ${stock.length}品`} className="forge-md-list">
            {stock.length === 0 && <EmptyGuide text="この見世にはまだ何も並んでいない。地の主を鎮めるほど品が増える。" actionLabel="出立へ" onAction={() => setScreen({ id: 'depart' })} />}
            <div className="item-grid">
              {stock.slice(0, shown).map((b, i, arr) => {
                const d = selChar ? diffAgainst(selChar, b) : null
                const dm = d ? primaryDiff(d) : null
                const owned = ownedByBase.get(b.baseId) ?? 0
                const wearers = equippedByBase.get(b.baseId) ?? []
                return (
                  <Fragment key={b.baseId}>
                    {slotF === 'all' && (i === 0 || arr[i - 1].slot !== b.slot) && (
                      <h3 className="item-group-head">{SLOT_LABEL[b.slot]}</h3>
                    )}
                    <button
                      className={`btn item-cell forge-list-card ${buySel === b.baseId ? 'is-sel' : ''}`}
                      data-testid="forge-list-card"
                      onClick={() => selectBuy(b.baseId)}
                    >
                      <MaybeImg src={itemIcon(b.baseId)} className="it-ico" />
                      <span className="item-name">
                        <span className={`slot-mark slot-${b.slot}`}>{SLOT_MARKS[b.slot]}</span>
                        {b.name}
                        {d?.strictlyBetter && <span className="item-reco">薦</span>}
                      </span>
                      <span className="item-stat">{primaryStatText(b)}</span>
                      {owned > 0 && <span className="item-owned">所持{owned}</span>}
                      {wearers.length > 0 && (
                        <span className="item-equipped-badge">{wearers[0].name}装備中{wearers.length > 1 ? '他' : ''}</span>
                      )}
                      {dm && <span className={`item-maindiff ${dm.up ? 'up' : 'down'}`}>{dm.text}</span>}
                    </button>
                  </Fragment>
                )
              })}
            </div>
            {stock.length > shown && (
              <button className="btn btn-ghost forge-more" onClick={() => setShown(shown + PAGE)}>
                さらに表示({stock.length - shown}品)
              </button>
            )}
          </Panel>
          {!isMobile && (
            <div className="panel forge-md-detail">
              {buyDetailNode ?? <p className="forge-detail-empty">札を選ぶと、ここに詳しく見える。</p>}
            </div>
          )}
        </div>
      )}

      {/* M26 §7.3: 蔵と装い — 現在の装いは要約帯、一覧選択→詳細で交換前後(CompareRow)→装備CTA。 */}
      {tab === 'equip' && selChar && (
        <>
          <Panel title={`${selChar.name}の装い`} className="equip-summary">
            {(['weapon', 'armor', 'charm'] as const).map((s) => {
              const cur = selChar.equipment[s]
              return (
                <div key={s} className="equip-slot-row">
                  <span className="equip-slot-name">
                    <span className={`slot-mark slot-${s}`}>{SLOT_MARKS[s]}</span>
                    {SLOT_LABEL[s]}
                  </span>
                  <span className="equip-slot-item">
                    {cur ? (
                      <>
                        {cur.name} {baseStatText(cur)}
                        <AxisChips baseId={cur.baseId} it={cur} />
                      </>
                    ) : (
                      '— なし'
                    )}
                  </span>
                </div>
              )
            })}
          </Panel>
          <div className="forge-md">
            <Panel title={`蔵の品 — ${inv.length}品`} className="forge-md-list">
              {inv.length === 0 && <EmptyGuide text="蔵は空だ。見世で購うか、夜藪から持ち帰れ。" actionLabel="購うへ" onAction={() => changeTab('buy')} />}
              <div className="item-grid">
                {inv.slice(0, shown).map((it, i, arr) => {
                  const d = diffAgainst(selChar, it)
                  const dm = primaryDiff(d)
                  const owned = ownedByBase.get(it.baseId) ?? 0
                  const wearers = equippedByBase.get(it.baseId) ?? []
                  return (
                    <Fragment key={it.id}>
                      {slotF === 'all' && invSort === 'slot' && (i === 0 || arr[i - 1].slot !== it.slot) && (
                        <h3 className="item-group-head">{SLOT_LABEL[it.slot]}</h3>
                      )}
                      <button
                        className={`btn item-cell forge-list-card ${equipSel === it.id ? 'is-sel' : ''}`}
                        data-testid="forge-list-card"
                        onClick={() => setEquipSel(it.id)}
                      >
                        <MaybeImg src={itemIcon(it.baseId)} className="it-ico" />
                        <span className="item-name">
                          <span className={`slot-mark slot-${it.slot}`}>{SLOT_MARKS[it.slot]}</span>
                          {it.name}
                          {d.strictlyBetter && <span className="item-reco">薦</span>}
                        </span>
                        <RarityChip it={it} />
                        <span className="item-stat">{primaryStatText(it)}</span>
                        {owned > 1 && <span className="item-owned">×{owned}</span>}
                        {wearers.length > 0 && (
                          <span className="item-equipped-badge">{wearers[0].name}装備中{wearers.length > 1 ? '他' : ''}</span>
                        )}
                        {it.legacyOf && <span className="item-legacy-badge">形見</span>}
                        {dm && <span className={`item-maindiff ${dm.up ? 'up' : 'down'}`}>{dm.text}</span>}
                      </button>
                    </Fragment>
                  )
                })}
              </div>
              {inv.length > shown && (
                <button className="btn btn-ghost forge-more" onClick={() => setShown(shown + PAGE)}>
                  さらに表示({inv.length - shown}品)
                </button>
              )}
            </Panel>
            {!isMobile && (
              <div className="panel forge-md-detail">
                {equipDetailNode ?? <p className="forge-detail-empty">札を選ぶと、ここに詳しく見える。</p>}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'reforge' && (
        <Panel title="打ち直し — 槌を入れ、代を深める">
          <p className="forge-note">
            打つほど強く(1代ごと基礎+12%)。遺品は銘を保ったまま深まる。上限{REFORGE_MAX}代。
          </p>
          {forgeables.length === 0 && <EmptyGuide text="打てる品がない。" actionLabel="購うへ" onAction={() => changeTab('buy')} />}
          <div className="item-grid">
            {forgeables.slice(0, shown).map(({ it, where }) => {
              const cost = reforgeCost(it)
              const maxed = it.generation >= REFORGE_MAX
              return (
                <button
                  key={it.id}
                  className="btn item-cell"
                  disabled={maxed || data.hoto < cost.hoto || data.ketsu < cost.ketsu}
                  onClick={() => setReforgeTarget({ it, where })}
                >
                  <MaybeImg src={itemIcon(it.baseId)} className="it-ico" />
                  <span className="item-name">
                    <span className={`slot-mark slot-${it.slot}`}>{SLOT_MARKS[it.slot]}</span>
                    {it.name}<span className="item-where">({where})</span>
                  </span>
                  <AxisChips baseId={it.baseId} it={it} />
                  <span className="item-stat">{baseStatText(it)} 第{it.generation}代</span>
                  <span className="item-price">{maxed ? '打ち止め' : `${cost.hoto}燈+珠${cost.ketsu}`}</span>
                </button>
              )
            })}
          </div>
          {forgeables.length > shown && (
            <button className="btn btn-ghost forge-more" onClick={() => setShown(shown + PAGE)}>
              さらに表示({forgeables.length - shown}品)
            </button>
          )}
        </Panel>
      )}

      {tab === 'train' && selChar && (
        <Panel title={`鍛錬 — ${selChar.name}の血潮を磨く`}>
          <p className="forge-note">血珠5で望む血潮を+3。磨いた血潮は子へも受け継がれる。持てる血珠: {data.ketsu}</p>
          <div className="train-grid">
            {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
              <button
                key={k}
                className="btn train-cell"
                disabled={data.ketsu < 5 || selChar.potential[k] >= 120}
                onClick={() => setTrainTarget(k)}
              >
                <span className="train-stat">{STAT_LABELS[k]}</span>
                <span className="train-val">{selChar.potential[k]} → {Math.min(120, selChar.potential[k] + 3)}</span>
                <span className="item-price">{selChar.potential[k] >= 120 ? '極み' : '珠5'}</span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {/* M26 §7.3/§4.3: 768px以下は選択中の品をSheetで見せる(769px以上は上のsticky詳細ペインを使う) */}
      {isMobile && tab === 'buy' && selectedBuyBase && (
        <Sheet title={`購う — ${selectedBuyBase.name}`} onClose={() => selectBuy(null)} closeLabel="やめる">
          {buyDetailNode}
        </Sheet>
      )}
      {isMobile && tab === 'equip' && selectedInvItem && selChar && (
        <Sheet title={`装備 — ${selectedInvItem.name}`} onClose={() => setEquipSel(null)} closeLabel="やめる">
          {equipDetailNode}
        </Sheet>
      )}

      {/* 打ち直し確認 — 高額操作は差分と費用を見てから(§2.4) */}
      {reforgeTarget && (
        <ReforgeConfirm
          target={reforgeTarget}
          data={data}
          onClose={() => setReforgeTarget(null)}
          onDo={() => {
            forgeUpgrade(reforgeTarget.it.id)
            emitToast(`${reforgeTarget.it.name}を打ち直した — 第${reforgeTarget.it.generation + 1}代`, 'info')
            setReforgeTarget(null)
          }}
        />
      )}

      {/* 血潮鍛錬確認 — 回数ステッパーで一括確定(§7.4「連打消費を廃止」)。閲覧だけで血珠は減らない */}
      {trainTarget && selChar && (
        <TrainConfirm
          char={selChar}
          statKey={trainTarget}
          data={data}
          onClose={() => setTrainTarget(null)}
          onDo={(n) => {
            const before = selChar.potential[trainTarget]
            for (let i = 0; i < n; i++) trainStat(selChar.id, trainTarget)
            emitToast(`${selChar.name}の${STAT_LABELS[trainTarget]}を鍛えた(${before}→${Math.min(120, before + n * 3)})`, 'info')
            setTrainTarget(null)
          }}
        />
      )}
    </ScreenShell>
  )
}

// M26 §7.3: 詳細面の共通中身(大きい絵/名称/品質・希少度/入手由来/全軸の値/比較/所持・装備中)。
// 購う・装備の両詳細(BuyDetail/EquipDetail)から使う — CTAは呼び出し側がこの下に足す。
function ItemDetailCore({
  baseId, name, slot, statSource, rarityIt, sourceText, curEquip, compareTarget, ownedCount, equippedBy, legacyOf,
}: {
  baseId: string
  name: string
  slot: ItemSlot
  statSource: { atk?: number; def?: number; statBonus?: Partial<Stats> }
  rarityIt?: Pick<Item, 'source' | 'generation' | 'legacyOf'>
  sourceText: string
  curEquip?: { atk?: number; def?: number; statBonus?: Partial<Stats> }
  compareTarget?: string // 比較対象の人物名。未定なら比較行は出さない(§7.3「誰への薦か」)
  ownedCount: number
  equippedBy: Character[]
  legacyOf?: string
}) {
  return (
    <div className="forge-detail">
      <MaybeImg src={itemIcon(baseId)} className="forge-detail-img" />
      <h3 className="forge-detail-name">
        <span className={`slot-mark slot-${slot}`}>{SLOT_MARKS[slot]}</span>{name}
      </h3>
      <AxisChips baseId={baseId} it={rarityIt} />
      <p className="forge-detail-source">{sourceText}{legacyOf && ` ・ ${legacyOf}の形見`}</p>
      <p className="forge-detail-stats">{baseStatText(statSource) || '(付与なし)'}</p>
      {compareTarget && (
        <>
          <p className="forge-detail-target">比べる相手: <b>{compareTarget}</b></p>
          <CompareAxes cur={curEquip} next={statSource} />
        </>
      )}
      {ownedCount > 0 && <p className="forge-detail-owned">蔵にある数: {ownedCount}</p>}
      {equippedBy.length > 0 && (
        <p className="forge-detail-equipped">装備中: {equippedBy.map((c) => c.name).join('・')}</p>
      )}
    </div>
  )
}

// 現装備→候補の軸別比較(攻/防/六能力)。ReforgeConfirm等と同じCompareRowを使う(§7.3「CompareRow」)
function CompareAxes({ cur, next }: {
  cur?: { atk?: number; def?: number; statBonus?: Partial<Stats> }
  next: { atk?: number; def?: number; statBonus?: Partial<Stats> }
}) {
  const rows: { key: string; label: string; before: number; after: number }[] = []
  if (next.atk || cur?.atk) rows.push({ key: 'atk', label: '攻', before: cur?.atk ?? 0, after: next.atk ?? 0 })
  if (next.def || cur?.def) rows.push({ key: 'def', label: '防', before: cur?.def ?? 0, after: next.def ?? 0 })
  const statKeys = new Set<StatKey>([
    ...(Object.keys(next.statBonus ?? {}) as StatKey[]),
    ...(Object.keys(cur?.statBonus ?? {}) as StatKey[]),
  ])
  for (const k of statKeys) {
    rows.push({ key: k, label: STAT_LABELS[k], before: cur?.statBonus?.[k] ?? 0, after: next.statBonus?.[k] ?? 0 })
  }
  if (rows.length === 0) return null
  return (
    <div className="forge-detail-compare">
      {rows.map((r) => <CompareRow key={r.key} label={r.label} before={r.before} after={r.after} />)}
    </div>
  )
}

// M26 §7.3/§7.4: 見世(購う)の詳細面。安価なら一押しで確定、残奉燈の25%以上を使うなら追加確認を挟む。
function BuyDetail({
  b, selChar, data, ownedCount, equippedBy, armed, onPrimary, onCancel, onConfirm,
}: {
  b: { baseId: string; name: string; slot: ItemSlot; atk?: number; def?: number; statBonus?: Partial<Stats>; price: number }
  selChar?: Character
  data: GameData
  ownedCount: number
  equippedBy: Character[]
  armed: boolean
  onPrimary: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  const lack = data.hoto < b.price
  return (
    <>
      <ItemDetailCore
        baseId={b.baseId} name={b.name} slot={b.slot} statSource={b}
        rarityIt={{ source: 'shop', generation: 0 }}
        sourceText={SOURCE_LABELS.shop}
        curEquip={selChar?.equipment[b.slot]}
        compareTarget={selChar?.name}
        ownedCount={ownedCount}
        equippedBy={equippedBy}
      />
      {armed ? (
        <>
          <p className="confirm-lead">残る奉燈の四分の一を超える買い物だ。確かめてから購う。</p>
          <CompareRow label="奉燈" before={data.hoto} after={data.hoto - b.price} />
          <div className="confirm-actions">
            <button className="btn btn-ghost" onClick={onCancel}>やめる</button>
            <button className="btn btn-main" data-testid="forge-buy-confirm" onClick={onConfirm}>購う</button>
          </div>
        </>
      ) : (
        <>
          <p className="forge-detail-price">
            価格 <b>{b.price}</b>燈
            {lack ? `(奉燈が${b.price - data.hoto}足りない)` : ` ／ 購入後 ${data.hoto - b.price}燈`}
          </p>
          <div className="confirm-actions">
            <button className="btn btn-main" data-testid="forge-buy-confirm" disabled={lack} onClick={onPrimary}>
              {lack ? '奉燈不足' : `${b.price}燈で購う`}
            </button>
          </div>
        </>
      )}
    </>
  )
}

// M26 §7.3: 蔵(装備)の詳細面。交換前後をCompareRowで見せ、装備CTAは一押しで確定(奉燈/血珠を使わないため)。
function EquipDetail({
  it, selChar, ownedCount, equippedBy, onEquip,
}: {
  it: Item
  selChar: Character
  ownedCount: number
  equippedBy: Character[]
  onEquip: () => void
}) {
  return (
    <>
      <ItemDetailCore
        baseId={it.baseId} name={it.name} slot={it.slot} statSource={it}
        rarityIt={it}
        sourceText={`${sourceLabelOf(it)}${it.generation > 0 ? ` ・ 継${it.generation}代` : ''}`}
        curEquip={selChar.equipment[it.slot]}
        compareTarget={selChar.name}
        ownedCount={ownedCount}
        equippedBy={equippedBy}
        legacyOf={it.legacyOf}
      />
      <div className="confirm-actions">
        <button className="btn btn-main" data-testid="forge-equip-confirm" onClick={onEquip}>
          {selChar.name}に授ける
        </button>
      </div>
    </>
  )
}

// M26 §7.4: 血潮鍛錬の確認Sheet。回数(1〜上限)を選び総血珠を見てから一括確定する。
// 上限 = min(買える回数 floor(血珠/5), 極みまでの回数 ceil((120-現在)/3))。
function TrainConfirm({ char, statKey, data, onClose, onDo }: {
  char: GameData['family'][number]
  statKey: StatKey
  data: GameData
  onClose: () => void
  onDo: (n: number) => void
}) {
  const start = char.potential[statKey]
  const maxN = Math.max(1, Math.min(Math.floor(data.ketsu / 5), Math.ceil((120 - start) / 3)))
  const [n, setN] = useState(1)
  const nn = Math.max(1, Math.min(maxN, n))
  const end = Math.min(120, start + nn * 3)
  const cost = nn * 5
  return (
    <Sheet title={`血潮鍛錬 — ${char.name}の${STAT_LABELS[statKey]}`} onClose={onClose} closeLabel="やめる">
      <p className="confirm-lead">
        血珠5で{STAT_LABELS[statKey]}を+3。回数を選んで一括で鍛える。磨いた血潮は子へも受け継がれる。
      </p>
      <div className="train-stepper" role="group" aria-label="鍛錬回数">
        <button className="btn btn-ghost" aria-label="回数を減らす" disabled={nn <= 1} onClick={() => setN(nn - 1)}>−</button>
        <span className="train-count"><b>{nn}</b> 回</span>
        <button className="btn btn-ghost" aria-label="回数を増やす" disabled={nn >= maxN} onClick={() => setN(nn + 1)}>＋</button>
        <button className="btn btn-ghost" disabled={nn >= maxN} onClick={() => setN(maxN)}>最大({maxN})</button>
      </div>
      <CompareRow label={STAT_LABELS[statKey]} before={start} after={end} />
      <CompareRow label="血珠" before={data.ketsu} after={data.ketsu - cost} />
      <div className="confirm-actions">
        <button className="btn btn-ghost" onClick={onClose}>やめる</button>
        <button className="btn btn-main" onClick={() => onDo(nn)}>珠{cost}で鍛える</button>
      </div>
    </Sheet>
  )
}

function ReforgeConfirm({ target, data, onClose, onDo }: {
  target: { it: Item; where: string }
  data: GameData
  onClose: () => void
  onDo: () => void
}) {
  const { it, where } = target
  const cost = reforgeCost(it)
  // 見込み値は実処理(applyGeneration)と同じ式から引く — 確認画面と結果をズレさせない
  const next = previewReforge(it)
  return (
    <Sheet title={`打ち直し — ${it.name}`} onClose={onClose} closeLabel="やめる">
      <p className="confirm-lead">{where}にある{it.name}(第{it.generation}代)へ槌を入れ、第{it.generation + 1}代へ深める。</p>
      {it.atk ? <CompareRow label="攻" before={it.atk} after={next.atk ?? it.atk} /> : null}
      {it.def ? <CompareRow label="防" before={it.def} after={next.def ?? it.def} /> : null}
      {it.statBonus &&
        (Object.entries(it.statBonus) as [StatKey, number][]).map(([k, v]) => (
          <CompareRow key={k} label={STAT_LABELS[k]} before={v} after={next.statBonus?.[k] ?? v} />
        ))}
      <CompareRow label="奉燈" before={data.hoto} after={data.hoto - cost.hoto} />
      <CompareRow label="血珠" before={data.ketsu} after={data.ketsu - cost.ketsu} />
      <div className="confirm-actions">
        <button className="btn btn-ghost" onClick={onClose}>やめる</button>
        <button className="btn btn-main" onClick={onDo}>打ち直す</button>
      </div>
    </Sheet>
  )
}
