// M28-C: 消耗品(回復薬)。装備(Item/ItemSlot)とは完全に別系統 — セーブ上は
// GameData.consumables(ConsumableStack[])に積む。装備一覧/鍛冶/打ち直し/形見/家宝/継承の
// どのコードパスにも入らない(devil指摘のセーブ破損地雷を構造的に回避)。
// 効果は戦闘の performAction('item') が適用し、在庫の増減は store が行う(battle.tsは純粋に保つ)。

export type ConsumableEffect =
  | { stat: 'hp'; amount: number; scope: 'one' | 'party' } // 傷を癒す(体力)
  | { stat: 'mp'; amount: number; scope: 'one' | 'party' } // 灯力(ともしび)を注ぐ

export interface ConsumableDef {
  id: string
  name: string
  desc: string
  price: number // 奉燈(hoto)
  effect: ConsumableEffect
  icon: string // 表示用の字(絵文字1字。素材追加まではこれで足りる)
}

// 序盤から手が届く価格帯。party回復は割高(乱用を抑える)。
export const CONSUMABLES: ConsumableDef[] = [
  {
    id: 'araigusa',
    name: '洗い草',
    desc: '郷はずれに生える素朴な傷薬。誰か一人の傷を癒す。',
    price: 22,
    effect: { stat: 'hp', amount: 60, scope: 'one' },
    icon: '🌿',
  },
  {
    id: 'neri_kou',
    name: '練り膏',
    desc: '薬狩りが幾種もの草を練り上げた上等の傷薬。深手にも効く。',
    price: 58,
    effect: { stat: 'hp', amount: 165, scope: 'one' },
    icon: '🧴',
  },
  {
    id: 'tomoshi_abura',
    name: '灯明油',
    desc: '尽きかけた灯力(ともしび)を注ぎ足す澄んだ油。',
    price: 30,
    effect: { stat: 'mp', amount: 45, scope: 'one' },
    icon: '🪔',
  },
  {
    id: 'hoshi_shizuku',
    name: '星の雫',
    desc: '星神の慈悲を宿した秘薬。一族みなの傷を癒す。惜しみて使え。',
    price: 145,
    effect: { stat: 'hp', amount: 75, scope: 'party' },
    icon: '💧',
  },
]

const BY_ID: Record<string, ConsumableDef> = Object.fromEntries(CONSUMABLES.map((c) => [c.id, c]))

export function consumableById(id: string): ConsumableDef | undefined {
  return BY_ID[id]
}
