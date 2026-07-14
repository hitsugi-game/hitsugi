// M25/M26: 実ブラウザ受入テスト(playwright)の状態投入口 — MENU_UI_UX_AUDIT_M26.md §18。
//
// 【なぜ必要か】
// M24は211本の緑テストと共に出荷され、M25 §1.2-1.5 が列挙する全ての構図崩れを生んだ。
// 原因は「純粋関数で幾何モデルを検証する」オラクルが、実際に描画されたDOMの寸法・CSS・
// フォントメトリクス・safe-area を一切見ないことにある。暗部率・札の重なり・矩形交差は
// 実ブラウザでしか測れない。本ファイルはそのテストへ「どの画面のどの状態か」を投入する口。
//
// 【安全性】
// import.meta.env.DEV でガードし、本番ビルドでは bundler が丸ごと落とす(window.__game は生えない)。
// ゲームロジックには一切触れない — store の setState で表示状態を組み立てるだけ。
import { useGame } from '../core/store'
import { combatantFromChar, combatantFromEnemy, startBattle } from '../core/battle'
import { ENEMIES } from '../core/data/enemies'
import type { Character } from '../core/types'

const isBoss = (id: string) => id.startsWith('boss_')
const NORMAL_ENEMIES = () => ENEMIES.filter((e) => !isBoss(e.id))
const BOSSES = () => ENEMIES.filter((e) => isBoss(e.id))

/** 新規ゲーム + 演出キューを空にする(場面送り/加護の三択が測定を邪魔しないように) */
function reset(narrative = false): void {
  useGame.getState().newGame(narrative)
  useGame.setState({ pendingScenes: [], pendingEvent: null, boonDraft: null })
}

/** 人数ケース(味方4など)を作るため、足りない分だけ家族を複製して data.family へ足す(表示専用) */
function ensureFamily(n: number): Character[] {
  const d = useGame.getState().data!
  const alive = d.family.filter((c) => c.alive)
  if (alive.length >= n) return alive.slice(0, n)
  const add: Character[] = []
  let i = 0
  while (alive.length + add.length < n) {
    const src = alive[i % alive.length]
    add.push({ ...src, id: `${src.id}__fx${i}`, name: `${src.name}の影`, isHead: false })
    i++
  }
  const next = { ...d, family: [...d.family, ...add] }
  useGame.setState({ data: next })
  return next.family.filter((c) => c.alive).slice(0, n)
}

export interface TestHooks {
  store: typeof useGame
  reset: (narrative?: boolean) => void
  /** ダンジョン画面へ。x/y=-1 は「未配置」= engine が入口へ置く。introSeen で第一幕を飛ばす。 */
  dungeon: (opts?: { regionId?: string; floor?: number; party?: number }) => void
  /** 戦闘画面へ。味方N対敵M。boss=true で主1体。 */
  battle: (opts?: { allies?: number; enemies?: number; boss?: boolean }) => void
  /** 郷の歩行マップへ。 */
  village: () => void
  screen: (id: string) => void
}

export function installTestHooks(): void {
  if (!import.meta.env.DEV) return
  const hooks: TestHooks = {
    store: useGame,
    reset,
    dungeon: ({ regionId = 'yoi_forest', floor = 0, party = 1 } = {}) => {
      reset()
      const members = ensureFamily(party)
      useGame.setState({
        dungeonRun: {
          regionId,
          floor,
          x: -1,
          y: -1,
          light: 100,
          loot: { hoto: 0, ketsu: 0, items: [] },
          partyIds: members.map((c) => c.id),
          log: [],
          used: [],
          bossDown: false,
          introSeen: true,
        },
        screen: { id: 'dungeon' },
        boonDraft: null,
      })
    },
    battle: ({ allies = 1, enemies = 2, boss = false } = {}) => {
      reset()
      const members = ensureFamily(allies)
      const party = members.map((c, i) => combatantFromChar(c, i < 2 ? 'front' : 'back'))
      const defs = boss ? BOSSES().slice(0, 1) : NORMAL_ENEMIES().slice(0, enemies)
      const foes = defs.map((e, i) => combatantFromEnemy(e, i))
      useGame.setState({
        battle: startBattle(party, foes),
        battleSource: boss ? 'dungeonBoss' : 'dungeon',
        screen: { id: 'battle' },
      })
    },
    village: () => {
      reset()
      useGame.setState({ screen: { id: 'village' } })
    },
    screen: (id: string) => {
      useGame.setState({ screen: { id } as never })
    },
  }
  ;(window as unknown as { __game: TestHooks }).__game = hooks
}
