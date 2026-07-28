import type { BattleState, Combatant, EnemyIntent } from './types'
import { bossCounterWindow, bossCueView } from './boss_mechanics'

/**
 * M43: 序盤の代表種だけに与える、小さな戦闘文法。
 *
 * 基礎180体を一括で複雑化せず、プレイヤーが最初に覚える12種へ
 * 「止める / 受ける / 崩す」の三つの読みを4種ずつ割り当てる。
 * 若・老個体は同じ種の文法を共有する。
 */
export type EnemyCounter = 'stop' | 'receive' | 'break'
export type EnemyDanger = 'watch' | 'danger'

export interface EnemyBehaviorStep {
  action: 'attack' | 'skill'
  skillId?: 'e_kurayami' | 'e_hisui' | 'e_hoshikui' | 'e_yamiuta'
  intent: EnemyIntent
  tell: string
  target: '前列ひとり' | '一族ひとり' | '一族全体'
  danger: EnemyDanger
}

export interface EnemyBehavior {
  enemyId: string
  counter: EnemyCounter
  hint: string
  steps: readonly EnemyBehaviorStep[]
}

const attack = (tell: string, target: EnemyBehaviorStep['target'] = '前列ひとり'): EnemyBehaviorStep => ({
  action: 'attack', intent: 'atk', tell, target, danger: 'watch',
})
const single = (tell: string, danger: EnemyDanger = 'danger'): EnemyBehaviorStep => ({
  action: 'skill', skillId: 'e_hisui', intent: 'tech', tell, target: '一族ひとり', danger,
})
const all = (tell: string): EnemyBehaviorStep => ({
  action: 'skill', skillId: 'e_hoshikui', intent: 'aoe', tell, target: '一族全体', danger: 'danger',
})
const BEHAVIORS: readonly EnemyBehavior[] = [
  // 止: 二手目の強手までに狙いを集めて倒す。
  { enemyId: 'chochin_kui', counter: 'stop', hint: '次の強手までに狙いを集める', steps: [attack('腹の灯を呑む'), single('腹灯が弾ける')] },
  { enemyId: 'onibi', counter: 'stop', hint: '火が集まり切る前に倒す', steps: [attack('火の粉が寄る'), all('火群が膨れ上がる')] },
  { enemyId: 'hone_dourou', counter: 'stop', hint: '骨火を溜める前に倒す', steps: [attack('骨火を集める'), all('死火が溢れ出す')] },
  { enemyId: 'kubinashi_andon', counter: 'stop', hint: '吸い切る前に狙いを集める', steps: [attack('行灯が灯を探す'), single('行灯が満ち切る')] },

  // 受: 強手の巡だけ身を固め、次の巡に攻め直す。
  { enemyId: 'kage_nezumi', counter: 'receive', hint: 'この巡は身を固める', steps: [attack('影が足元を巡る'), all('影の群れが跳ぶ'), attack('影が散り直す')] },
  { enemyId: 'yosuzume', counter: 'receive', hint: 'この巡は身を固める', steps: [attack('羽音が近づく'), all('夜羽が一斉に降る'), attack('高みへ戻る')] },
  { enemyId: 'nureginu', counter: 'receive', hint: '冷気の巡だけ身を固める', steps: [attack('裾から水が滴る'), all('冷雨が包み込む'), attack('水気を取り戻す')] },
  { enemyId: 'yogumo', counter: 'receive', hint: '糸が張る巡は身を固める', steps: [attack('細糸を張り巡らす'), all('夜糸が一斉に絞る'), attack('切れた糸を繕う')] },

  // 崩: 強手の構えへ弱点属性の技を当てると、その威力を二巡弱める。
  { enemyId: 'naki_ishi', counter: 'break', hint: '弱点属性の技で構えを崩す', steps: [attack('涙が地を濡らす'), single('泣声が岩を震わす'), attack('ひびを閉じ直す')] },
  { enemyId: 'warabe_kage', counter: 'break', hint: '弱点属性の技で影を崩す', steps: [attack('影が背後へ回る'), single('影遊びに誘い込む'), attack('次の鬼を探す')] },
  { enemyId: 'ochiba_zamurai', counter: 'break', hint: '弱点属性の技で型を崩す', steps: [attack('落葉を上段に構える'), single('葉刃を振り下ろす'), attack('散った葉を集める')] },
  { enemyId: 'hone_karasu', counter: 'break', hint: '弱点属性の技で群れを崩す', steps: [attack('骨翼が輪を描く'), all('骨羽が一斉に降る'), attack('群れが輪を戻す')] },
] as const

const BY_ID = new Map(BEHAVIORS.map((behavior) => [behavior.enemyId, behavior]))

export const ENEMY_BEHAVIORS: readonly EnemyBehavior[] = BEHAVIORS

export function baseBehaviorEnemyId(enemyId: string): string {
  return enemyId.replace(/_[wo]$/, '')
}

export function enemyBehaviorFor(enemyId?: string): EnemyBehavior | undefined {
  return enemyId ? BY_ID.get(baseBehaviorEnemyId(enemyId)) : undefined
}

export function enemyBehaviorStep(enemyId: string | undefined, turn: number): EnemyBehaviorStep | undefined {
  const behavior = enemyBehaviorFor(enemyId)
  if (!behavior) return undefined
  return behavior.steps[(Math.max(1, turn) - 1) % behavior.steps.length]
}

export interface EnemyBehaviorCue {
  counter: EnemyCounter
  hint: string
  step: EnemyBehaviorStep
  certainty?: 'candidate' | 'committed'
  turnsUntilStrong?: number
  remainingDamage?: number
}

export function enemyBehaviorCue(enemy: Combatant, turn: number): EnemyBehaviorCue | undefined {
  const behavior = enemyBehaviorFor(enemy.enemyId)
  const step = enemyBehaviorStep(enemy.enemyId, turn)
  return behavior && step ? { counter: behavior.counter, hint: behavior.hint, step } : undefined
}

/**
 * 入力番から見た「その敵の次の巡」。素早い敵が今巡すでに動いた後なら次巡を示す。
 * st.turnだけで予告すると、行動済みの敵について同じ手をもう一度予告するため、orderIndexも見る。
 */
export function upcomingEnemyBehaviorCue(battle: BattleState, enemy: Combatant): EnemyBehaviorCue | undefined {
  const bossCue = bossCueView(battle, enemy)
  if (bossCue) {
    return {
      counter: bossCue.counter,
      hint: bossCue.hint,
      certainty: 'committed',
      turnsUntilStrong: bossCue.turnsUntilStrong,
      remainingDamage: bossCue.remainingDamage,
      step: {
        action: 'skill',
        intent: bossCue.intent,
        tell: bossCue.tell,
        target: bossCue.target,
        danger: bossCounterWindow(bossCue) ? 'danger' : 'watch',
      },
    }
  }
  // 長を失った群れは、固有手筋より先に逃走判定を行う。固有手を確定的に見せない。
  if (battle.morale) return undefined
  const enemyOrder = battle.order.indexOf(enemy.key)
  const upcomingTurn = enemyOrder >= 0 && enemyOrder <= battle.orderIndex ? battle.turn + 1 : battle.turn
  return enemyBehaviorCue(enemy, upcomingTurn)
}

/** 現在の入力番で、優先して対処すべき生存敵を返す。乱数・状態変更なし。 */
export function priorityBehaviorEnemy(battle: BattleState, counter: EnemyCounter): Combatant | undefined {
  return battle.enemies.find((enemy) => {
    if (enemy.hp <= 0) return false
    const cue = upcomingEnemyBehaviorCue(battle, enemy)
    return cue?.counter === counter && cue.step.danger === 'danger'
  })
}
