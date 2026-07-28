import { useEffect, useMemo, useState } from 'react'
import type { GameData, Item } from '../core/types'
import { FOUNDING_ITEM_BASES, ITEM_SERIES_MANIFEST, type ItemBase } from '../core/data/items'
import { isItemDiscovered, popcount15 } from '../core/collection'
import { GENERATION_VOWS } from '../core/inheritance'
import { MaybeImg } from './components'
import { itemIcon } from './img'
import { Sheet } from './layout/shell'

type Shelf = {
  id: string
  label: string
  items: readonly ItemBase[]
  bits: number
  discovered: number
  founding?: boolean
}

const SLOT_LABEL = { weapon: '武具', armor: '防具', charm: '御守' } as const

function allExistingItems(data: GameData): Item[] {
  return [
    ...data.inventory,
    ...data.family.flatMap((character) => Object.values(character.equipment).filter((item): item is Item => !!item)),
  ]
}

function ShelfDetail({ shelf, data }: { shelf: Shelf; data: GameData }) {
  const existing = allExistingItems(data)
  const owned = new Map<string, Item[]>()
  for (const item of existing) owned.set(item.baseId, [...(owned.get(item.baseId) ?? []), item])
  const highest = [...shelf.items].map((item, index) => ({ item, index }))
    .filter(({ item }) => isItemDiscovered(data.collectionV2, item.baseId)).at(-1)
  const next = shelf.items.find((item) => !isItemDiscovered(data.collectionV2, item.baseId))

  return (
    <div className="collection-detail" data-visual-focus="primary">
      <header className="collection-detail-head">
        <MaybeImg src={itemIcon((highest?.item ?? shelf.items[0]).baseId)} className="collection-detail-icon" />
        <div>
          <span>{shelf.founding ? '家祖から始まった十五の品' : `${SLOT_LABEL[shelf.items[0].slot]}の系譜`}</span>
          <h2>{shelf.label}</h2>
          <p>{shelf.discovered}/{shelf.items.length}段を発見{highest ? ` ・ 最高到達 第${highest.index + 1}段` : ''}</p>
        </div>
      </header>
      <div className="collection-next-hint">
        <span>次の手掛かり</span>
        <b>{next ? `第${shelf.items.indexOf(next) + 1}段 — 剛${next.shopTier}前後の地や見世を探す` : 'この棚の全てを家譜へ刻んだ'}</b>
      </div>
      <ol className="collection-ranks" aria-label={`${shelf.label}の発見段階`}>
        {shelf.items.map((item, index) => {
          const discovered = isItemDiscovered(data.collectionV2, item.baseId)
          const instances = owned.get(item.baseId) ?? []
          const legacy = instances.filter((instance) => !!instance.legacyOf || instance.generation > 0)
          return (
            <li key={item.baseId} className={discovered ? 'is-found' : 'is-unknown'}>
              <span className="collection-rank-mark">{discovered ? '●' : '○'}</span>
              <span className="collection-rank-number">第{index + 1}段</span>
              <b>{discovered ? item.name : '未見の銘'}</b>
              {discovered && <small>{SLOT_LABEL[item.slot]}{instances.length > 0 ? ` ・ 現存${instances.length}` : ' ・ 記録のみ'}{legacy.length > 0 ? ` ・ 形見${legacy.length}` : ''}</small>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function ItemCollection({
  data, isMobile, query = '', onQueryChange, onToggleFrame,
}: {
  data: GameData
  isMobile: boolean
  query?: string
  onQueryChange?: (query: string) => void
  onToggleFrame?: (itemId: string) => boolean
}) {
  const shelves = useMemo<Shelf[]>(() => {
    const foundingBits = FOUNDING_ITEM_BASES.reduce((bits, item, index) => (
      isItemDiscovered(data.collectionV2, item.baseId) ? bits | (1 << index) : bits
    ), 0)
    return [
      {
        id: 'founding', label: '家祖の棚', items: FOUNDING_ITEM_BASES,
        bits: foundingBits, discovered: popcount15(foundingBits), founding: true,
      },
      ...ITEM_SERIES_MANIFEST.map((series) => {
        const bits = data.collectionV2?.itemSeriesBits[series.seriesId] ?? 0
        return { id: series.seriesId, label: series.name, items: series.items, bits, discovered: popcount15(bits) }
      }),
    ]
  }, [data.collectionV2])
  const normalizedQuery = query.trim().toLocaleLowerCase('ja')
  const visibleShelves = useMemo(() => {
    if (!normalizedQuery) return shelves
    return shelves.filter((shelf) => {
      if (shelf.label.toLocaleLowerCase('ja').includes(normalizedQuery)) return true
      return shelf.items.some((item) => (
        isItemDiscovered(data.collectionV2, item.baseId)
        && item.name.toLocaleLowerCase('ja').includes(normalizedQuery)
      ))
    })
  }, [data.collectionV2, normalizedQuery, shelves])
  const firstStarted = visibleShelves.find((shelf) => shelf.discovered > 0)?.id ?? visibleShelves[0]?.id ?? null
  const [selectedId, setSelectedId] = useState<string | null>(isMobile ? null : firstStarted)
  const [heirloomLimit, setHeirloomLimit] = useState(12)
  const selected = visibleShelves.find((shelf) => shelf.id === selectedId)
  const selectedIndex = selected ? visibleShelves.indexOf(selected) : -1
  useEffect(() => {
    if (visibleShelves.some((shelf) => shelf.id === selectedId)) return
    setSelectedId(isMobile ? null : firstStarted)
  }, [firstStarted, isMobile, selectedId, visibleShelves])
  const move = (delta: number) => {
    if (selectedIndex < 0) return
    setSelectedId(visibleShelves[(selectedIndex + delta + visibleShelves.length) % visibleShelves.length].id)
  }
  const foundTotal = shelves.reduce((sum, shelf) => sum + shelf.discovered, 0)
  const completed = shelves.filter((shelf) => shelf.discovered === shelf.items.length).length
  const existingItems = useMemo(() => allExistingItems(data), [data])
  const heirlooms = useMemo(
    () => existingItems
      .filter((item) => !!item.legacyOf || item.generation > 0)
      .sort((a, b) => b.generation - a.generation || a.name.localeCompare(b.name, 'ja')),
    [existingItems],
  )
  const framedIds = new Set(data.framedHeirloomIds ?? [])
  const framed = heirlooms.filter((item) => framedIds.has(item.id))
  const unframedHeirlooms = heirlooms.filter((item) => !framedIds.has(item.id))
  const visibleHeirlooms = unframedHeirlooms.slice(0, heirloomLimit)
  const hiddenHeirloomCount = Math.max(0, unframedHeirlooms.length - visibleHeirlooms.length)
  const vow = data.generationVow ? GENERATION_VOWS[data.generationVow.id] : undefined

  return (
    <section className="item-collection" aria-labelledby="item-collection-title">
      <header className="collection-ledger-head">
        <div>
          <span>燈守家・宝具系譜録</span>
          <h2 id="item-collection-title">拾った物を、誰かが残した痕として綴る</h2>
        </div>
        <div className="collection-ledger-count" aria-label={`宝具発見 ${foundTotal} / 810`}>
          <b>{foundTotal}</b><span>/ 810</span><small>完成棚 {completed}/54</small>
        </div>
      </header>
      <section className="heirloom-gallery" aria-labelledby="heirloom-gallery-title">
        <header>
          <div>
            <span>三つだけ選ぶ、一族の家宝</span>
            <h3 id="heirloom-gallery-title">形見を、数値でなく物語として飾る</h3>
          </div>
          <strong>{framed.length}/3 額装</strong>
        </header>
        {framed.length > 0 ? (
          <div className="heirloom-frames">
            {framed.map((item) => (
              <article key={item.id}>
                <MaybeImg src={itemIcon(item.baseId)} className="heirloom-frame-icon" />
                <div>
                  <p>{item.slot === 'weapon' ? '武具' : item.slot === 'armor' ? '防具' : '御守'}・第{item.generation + 1}代</p>
                  <h4>{item.name}</h4>
                  <span>
                    {item.legacyFirstOwner || item.legacyOf ? `初めの持ち主 — ${item.legacyFirstOwner ?? item.legacyOf}` : '名の残らぬ先人から'}
                  </span>
                  {item.rareOrigin && <span>因縁 — {item.rareOrigin}が遺した品</span>}
                  {vow && <span>今代の約束 — {vow.promise}</span>}
                </div>
                <button className="btn btn-ghost" onClick={() => onToggleFrame?.(item.id)}>額から戻す</button>
              </article>
            ))}
          </div>
        ) : (
          <p className="heirloom-empty">形見を手にしたら、下の候補から最大三品を選べる。戦力や紛失には影響せず、いつでも差し替えられる。</p>
        )}
        {heirlooms.length > 0 && (
          <>
            <div className="heirloom-candidates" aria-label="額装できる形見">
              {visibleHeirlooms.map((item) => (
                <button
                  key={item.id}
                  className="btn"
                  disabled={framed.length >= 3}
                  onClick={() => onToggleFrame?.(item.id)}
                >
                  <span>{item.name}</span>
                  <small>{item.legacyFirstOwner ?? item.legacyOf ?? `${item.generation}代継承`}</small>
                  <b>{framed.length >= 3 ? '三品を額装中' : '家宝として飾る'}</b>
                </button>
              ))}
            </div>
            {hiddenHeirloomCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost heirloom-show-more"
                onClick={() => setHeirloomLimit((limit) => limit + 12)}
              >
                さらに見る（残り{hiddenHeirloomCount}品）
              </button>
            )}
          </>
        )}
      </section>
      <div className="collection-search-row">
        <input
          type="search"
          className="forge-search collection-search"
          aria-label="宝具録を棚名または発見済みの銘で捜す"
          placeholder="棚名・銘・系譜で捜す"
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
        />
        <span aria-live="polite">{normalizedQuery ? `${visibleShelves.length}棚` : '全54棚'}</span>
      </div>
      {visibleShelves.length === 0 && (
        <div className="collection-zero" role="status">
          <p>「{query}」に合う、発見済みの宝具や棚はない。</p>
          <button type="button" className="btn btn-ghost" onClick={() => onQueryChange?.('')}>検索を解除して54棚へ戻る</button>
        </div>
      )}
      <div className={`collection-master-detail ${selected ? 'has-selection' : ''}`}>
        <div className="collection-shelves" aria-label="宝具の棚">
          {visibleShelves.map((shelf) => {
            const representative = [...shelf.items].reverse()
              .find((item) => isItemDiscovered(data.collectionV2, item.baseId)) ?? shelf.items[0]
            return (
              <button
                key={shelf.id}
                className={`btn collection-shelf ${selectedId === shelf.id ? 'is-sel' : ''} ${shelf.discovered === 0 ? 'is-empty' : ''}`}
                aria-pressed={selectedId === shelf.id}
                onClick={() => setSelectedId(shelf.id)}
              >
                <MaybeImg src={itemIcon(representative.baseId)} className="collection-shelf-icon" />
                <span><b>{shelf.label}</b><small>{shelf.discovered}/{shelf.items.length}段</small></span>
                <i aria-hidden>{shelf.discovered === shelf.items.length ? '完' : shelf.discovered > 0 ? '継' : '未'}</i>
              </button>
            )
          })}
        </div>
        {!isMobile && (
          <div className="collection-detail-pane">
            {selected ? <ShelfDetail shelf={selected} data={data} /> : <p>棚を選ぶと、十五段の記録を開く。</p>}
          </div>
        )}
      </div>
      {isMobile && selected && (
        <Sheet title={selected.label} onClose={() => setSelectedId(null)}>
          <ShelfDetail shelf={selected} data={data} />
          <div className="collection-detail-nav" aria-label="前後の棚へ移動">
            <button className="btn btn-ghost" onClick={() => move(-1)}>← 前の棚</button>
            <span>{selectedIndex + 1} / {visibleShelves.length}</span>
            <button className="btn btn-ghost" onClick={() => move(1)}>次の棚 →</button>
          </div>
        </Sheet>
      )}
    </section>
  )
}
