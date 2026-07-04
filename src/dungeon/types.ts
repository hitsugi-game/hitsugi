import type { Item } from '../core/types'

// タイル記号: # 壁 / . 床 / , 下草 / > 階段(下) / < 入口(帰還口) / C 宝箱
// F 焚火 / S 祠(事件) / B 主(ボス) / ~ 水(通行不可) / M 石碑(縁起の欠片 — v3.1)
export type TileKind =
  | 'wall' | 'floor' | 'grass' | 'stairs' | 'entrance'
  | 'chest' | 'camp' | 'shrine' | 'boss' | 'water' | 'monument'

export const TILE_CHARS: Record<string, TileKind> = {
  '#': 'wall', '.': 'floor', ',': 'grass', '>': 'stairs', '<': 'entrance',
  'C': 'chest', 'F': 'camp', 'S': 'shrine', 'B': 'boss', '~': 'water', 'M': 'monument',
}

export function isWalkable(kind: TileKind): boolean {
  return kind !== 'wall' && kind !== 'water'
}

export interface FloorDef {
  ascii: string[]
  shades: number // 徘徊する敵影の数
  seed?: number // プロップ散布/トーン揺らぎの決定論用(v3.1 — gen_all_maps.mjsが埋める)
}

export interface DungeonDef {
  regionId: string
  name: string
  floors: FloorDef[]
}

// 進行中のダンジョン行(storeに保持)
export interface DungeonRun {
  regionId: string
  floor: number
  x: number
  y: number
  light: number
  loot: { hoto: number; ketsu: number; items: Item[] }
  partyIds: string[]
  log: string[]
  used: string[] // 開封済み宝箱・使用済み焚火等 "floor:x:y"
  bossDown: boolean
  frantic?: number // v3.1 M12-6: 熱狂の赤い火の残り歩数(>0で発動中)
  boons?: string[] // v3.1 M16-4: この遠征で授かった灯の加護(最大3)
  autoBattle?: boolean // オート戦闘を戦闘越しに継続(遠征単位)
}
