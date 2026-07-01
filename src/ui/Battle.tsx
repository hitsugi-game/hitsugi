import { useEffect, useRef, useState } from 'react'
import { useGame } from '../core/store'
import type { BattleLogEntry, Combatant } from '../core/types'
import { ELEMENT_LABELS } from '../core/types'
import { currentActor } from '../core/battle'
import { skillById } from '../core/data/skills'
import { enemyById } from '../core/data/enemies'
import { Bar } from './components'

const REVEAL_MS = 420

type Menu = { kind: 'root' } | { kind: 'skill' } | { kind: 'target'; skillId?: string; side: 'enemy' | 'ally' }

export function BattleScreen() {
  const battle = useGame((s) => s.battle)
  const queue = useGame((s) => s.battleLogQueue)
  const drainBattleLog = useGame((s) => s.drainBattleLog)
  const battleCommand = useGame((s) => s.battleCommand)
  const finishBattle = useGame((s) => s.finishBattle)

  const [displayed, setDisplayed] = useState<BattleLogEntry[]>([])
  const [pending, setPending] = useState<BattleLogEntry[]>([])
  const [menu, setMenu] = useState<Menu>({ kind: 'root' })
  const [auto, setAuto] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  // 新しいログをリビール待ちへ
  useEffect(() => {
    if (queue.length > 0) {
      const q = drainBattleLog()
      setPending((p) => [...p, ...q])
    }
  }, [queue, drainBattleLog])

  // 1件ずつ表示(戦闘のテンポ)
  useEffect(() => {
    if (pending.length === 0) return
    const t = setTimeout(() => {
      setDisplayed((d) => [...d, pending[0]])
      setPending((p) => p.slice(1))
    }, REVEAL_MS)
    return () => clearTimeout(t)
  }, [pending])

  useEffect(() => {
    logRef.current?.scrollTo({ top: 99999, behavior: 'smooth' })
  }, [displayed])

  const revealing = pending.length > 0
  const actor = battle ? currentActor(battle) : undefined
  const isPlayerTurn = !!battle && battle.phase === 'input' && !!actor?.isAlly && !revealing

  // オート戦闘
  useEffect(() => {
    if (!auto || !isPlayerTurn || !battle || !actor) return
    const t = setTimeout(() => {
      const foes = battle.enemies.filter((e) => e.hp > 0)
      if (foes.length === 0) return
      const target = battle.chainTarget && foes.some((f) => f.key === battle.chainTarget)
        ? battle.chainTarget
        : foes[0].key
      battleCommand({ type: 'attack', targetKey: target })
    }, 300)
    return () => clearTimeout(t)
  }, [auto, isPlayerTurn, battle, actor, battleCommand])

  if (!battle) return null

  const over = battle.phase !== 'input' && battle.phase !== 'anim' && !revealing

  const onEnemyClick = (e: Combatant) => {
    if (!isPlayerTurn || e.hp <= 0) return
    if (menu.kind === 'target' && menu.side === 'enemy') {
      battleCommand(menu.skillId ? { type: 'skill', skillId: menu.skillId, targetKey: e.key } : { type: 'attack', targetKey: e.key })
      setMenu({ kind: 'root' })
    }
  }
  const onAllyClick = (a: Combatant) => {
    if (!isPlayerTurn || a.hp <= 0) return
    if (menu.kind === 'target' && menu.side === 'ally' && menu.skillId) {
      battleCommand({ type: 'skill', skillId: menu.skillId, targetKey: a.key })
      setMenu({ kind: 'root' })
    }
  }
  const castSkill = (skillId: string) => {
    const sk = skillById(skillId)
    if (sk.target === 'enemy') setMenu({ kind: 'target', skillId, side: 'enemy' })
    else if (sk.target === 'ally') setMenu({ kind: 'target', skillId, side: 'ally' })
    else {
      battleCommand({ type: 'skill', skillId })
      setMenu({ kind: 'root' })
    }
  }

  return (
    <div className="screen battle-screen">
      <div className="battle-field">
        <div className="enemy-row">
          {battle.enemies.map((e) => (
            <div
              key={e.key}
              className={`enemy-card ${e.hp <= 0 ? 'dead' : ''} ${isPlayerTurn && menu.kind === 'target' && menu.side === 'enemy' ? 'targetable' : ''} ${battle.chainTarget === e.key && battle.chain > 0 ? 'acting' : ''}`}
              onClick={() => onEnemyClick(e)}
            >
              <span className="enemy-sprite">{enemySprite(e)}</span>
              <div className="enemy-name">{e.name}</div>
              <Bar value={e.hp} max={e.maxHp} kind="hp" />
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{ELEMENT_LABELS[e.element]}の魔性</div>
              {battle.chainTarget === e.key && battle.chain > 0 && (
                <span className="chain-badge">継足{battle.chain + 1}連</span>
              )}
            </div>
          ))}
        </div>

        <div className="battle-log" ref={logRef}>
          {displayed.slice(-30).map((l, i) => (
            <p key={i} className={`log-${l.kind}`}>{l.text}</p>
          ))}
        </div>

        <div className="cmd-hint">
          {over
            ? battle.phase === 'won'
              ? '勝利!'
              : battle.phase === 'fled'
                ? '離脱した'
                : '……'
            : isPlayerTurn
              ? menu.kind === 'target'
                ? `${actor?.name} — 的を選べ`
                : `${actor?.name}の番`
              : revealing
                ? ''
                : '……'}
        </div>

        {over ? (
          <div className="cmd-row">
            <button className="btn btn-main" onClick={finishBattle}>
              {battle.phase === 'won' ? '戦果を得る' : battle.phase === 'fled' ? '先へ' : '……'}
            </button>
          </div>
        ) : (
          <>
            {isPlayerTurn && menu.kind === 'root' && (
              <div className="cmd-row">
                <button className="btn btn-main" onClick={() => setMenu({ kind: 'target', side: 'enemy' })}>
                  攻撃
                </button>
                <button className="btn" onClick={() => setMenu({ kind: 'skill' })}>
                  技
                </button>
                <button className="btn" onClick={() => battleCommand({ type: 'guard' })}>
                  防御
                </button>
                <button className="btn" onClick={() => battleCommand({ type: 'flee' })}>
                  逃げる
                </button>
                <button className={`btn btn-ghost ${auto ? 'btn-main' : ''}`} onClick={() => setAuto(!auto)}>
                  {auto ? 'オート中' : 'オート'}
                </button>
              </div>
            )}
            {isPlayerTurn && menu.kind === 'skill' && actor && (
              <div className="cmd-row">
                {actor.skills.map((id) => {
                  const sk = skillById(id)
                  return (
                    <button key={id} className="btn" disabled={actor.mp < sk.mpCost} onClick={() => castSkill(id)}>
                      {sk.name}({sk.mpCost})
                    </button>
                  )
                })}
                <button className="btn btn-ghost" onClick={() => setMenu({ kind: 'root' })}>
                  戻る
                </button>
              </div>
            )}
            {isPlayerTurn && menu.kind === 'target' && (
              <div className="cmd-row">
                <button className="btn btn-ghost" onClick={() => setMenu({ kind: 'root' })}>
                  やめる
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="ally-row" style={{ marginTop: 12 }}>
        {battle.allies.map((a) => (
          <div
            key={a.key}
            className={`ally-cell ${a.hp <= 0 ? 'dead' : ''} ${actor?.key === a.key && battle.phase === 'input' ? 'acting' : ''} ${isPlayerTurn && menu.kind === 'target' && menu.side === 'ally' ? 'targetable' : ''}`}
            onClick={() => onAllyClick(a)}
          >
            <div className="ally-name">
              {a.name}
              <span className="row-tag">{a.row === 'front' ? '前衛' : '後衛'}</span>
              {a.guard && <span className="row-tag">防</span>}
            </div>
            <Bar value={a.hp} max={a.maxHp} kind="hp" />
            <Bar value={a.mp} max={a.maxMp} kind="mp" />
          </div>
        ))}
      </div>
    </div>
  )
}

function enemySprite(e: Combatant): string {
  if (!e.enemyId) return '👾'
  const def = enemyById(e.enemyId)
  const map: Record<number, string> = { 1: '👺', 2: '👹', 3: '🌑', 4: '⚔️', 5: '💀' }
  return map[def.tier] ?? '👾'
}
