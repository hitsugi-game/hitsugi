// M29 総合監査で発見・修正した項目の回帰テスト。
// (1) M28バランス式(floorFracFromAtk/enemyPower)のピン留め — I6監査「係数編集が541緑のまま退行しうる」対策。
// (2) 老成×enemyPower二重適用の是正 — 非ボスがボスの打点を超えないこと(I5監査HIGH#2)。
import { describe, expect, it } from 'vitest'
import { combatantFromEnemy, enemyPower, floorFracFromAtk } from '../src/core/battle'
import { ENEMIES } from '../src/core/data/enemies'
import { SKILLS, skillById } from '../src/core/data/skills'
import { allTozaSkills } from '../src/core/data/toza'
import { allJobSkills } from '../src/core/data/jobs'

describe('M29回帰: M28バランス式のピン留め', () => {
  it('floorFracFromAtk は FLOOR_TARGET(13)/atk を [0.08, 0.55] にクランプ', () => {
    expect(floorFracFromAtk(13)).toBeCloseTo(0.55) // 13/13=1 → 上限0.55
    expect(floorFracFromAtk(30)).toBeCloseTo(0.4333) // 13/30
    expect(floorFracFromAtk(100)).toBeCloseTo(0.13) // 13/100
    expect(floorFracFromAtk(300)).toBeCloseTo(0.08) // 13/300=0.043 → 下限0.08
    expect(floorFracFromAtk(0)).toBeCloseTo(0.55) // ゼロ除算回避(max(1,atk))→13/1→上限0.55
  })

  it('enemyPower はtier別に固定値(tier5ボスは素通し)', () => {
    expect(enemyPower(1)).toEqual({ hp: 2.5, atk: 1.6 })
    expect(enemyPower(2)).toEqual({ hp: 2.1, atk: 1.45 })
    expect(enemyPower(3)).toEqual({ hp: 1.65, atk: 1.28 })
    expect(enemyPower(4)).toEqual({ hp: 1.3, atk: 1.13 })
    expect(enemyPower(5)).toEqual({ hp: 1, atk: 1 }) // ボスは強化しない
  })
})

describe('M29回帰: 老成(_o)がenemyPowerで二重強化されずボスを超えない', () => {
  const isBoss = (id: string) => id.startsWith('boss_')
  const bossAtks = ENEMIES.filter((e) => isBoss(e.id)).map((e) => combatantFromEnemy(e, 0).atk)
  const maxBossAtk = Math.max(...bossAtks)
  const maxBossHp = Math.max(...ENEMIES.filter((e) => isBoss(e.id)).map((e) => combatantFromEnemy(e, 0).hp))

  it('全ての非ボス個体の最終atkが最強ボスのatk以下', () => {
    for (const e of ENEMIES) {
      if (isBoss(e.id)) continue
      const c = combatantFromEnemy(e, 0)
      expect(c.atk, `${e.id} のatk(${c.atk})が最強ボス(${maxBossAtk})を超えている`).toBeLessThanOrEqual(maxBossAtk)
    }
  })

  it('全ての非ボス個体の最終hpが最強ボスのhp以下', () => {
    for (const e of ENEMIES) {
      if (isBoss(e.id)) continue
      const c = combatantFromEnemy(e, 0)
      expect(c.hp, `${e.id} のhp(${c.hp})が最強ボス(${maxBossHp})を超えている`).toBeLessThanOrEqual(maxBossHp)
    }
  })

  it('老成個体はenemyPowerを受けない(atkが素の老倍率のまま)', () => {
    const elder = ENEMIES.find((e) => e.id.endsWith('_o'))
    expect(elder, '_o個体が存在する').toBeDefined()
    const c = combatantFromEnemy(elder!, 0)
    // enemyPowerを適用していれば e.atk より大きくなるはず。適用しない=素のe.atkと一致。
    expect(c.atk).toBe(elder!.atk)
  })
})

describe('M29回帰: 防御バフがdefUp・攻撃バフがatkUp(buffKind)', () => {
  const allBuffs = [...SKILLS, ...allTozaSkills(), ...allJobSkills()].filter((s) => s.type === 'buff')
  const kindOf = (s: { buffKind?: 'atk' | 'def' }) => s.buffKind ?? 'atk'

  it('バフが1件以上あり、buffKindはatk/defのみ', () => {
    expect(allBuffs.length).toBeGreaterThan(20)
    for (const s of allBuffs) expect(['atk', 'def']).toContain(kindOf(s))
  })

  it('説明文に「防御/大防御」を含むバフは必ず defUp', () => {
    for (const s of allBuffs) {
      if (/防御|大防御/.test(s.desc)) expect(kindOf(s), `${s.id}「${s.name}」${s.desc}`).toBe('def')
    }
  })

  it('説明文に「攻撃」を含み守勢語(防御/守/護)を含まないバフは atkUp のまま', () => {
    for (const s of allBuffs) {
      if (/攻撃/.test(s.desc) && !/防御|守|護/.test(s.desc)) {
        expect(kindOf(s), `${s.id}「${s.name}」${s.desc}`).toBe('atk')
      }
    }
  })

  it('灯座「巌(いわお)」の全バフは防御バフ(tz_i*)', () => {
    const iwao = allTozaSkills().filter((s) => s.type === 'buff' && /^tz_i/.test(s.id))
    expect(iwao.length).toBeGreaterThan(10)
    for (const s of iwao) expect(kindOf(s), s.id).toBe('def')
  })

  it('家業「盾(tank)」の全バフは防御バフ', () => {
    const tankIds = ['touban', 'kabenuri', 'sekimori', 'kakiyui']
    const tankBuffs = allJobSkills().filter((s) => s.type === 'buff' && tankIds.some((t) => s.id.startsWith(`sk_${t}`)))
    expect(tankBuffs.length).toBeGreaterThan(10)
    for (const s of tankBuffs) expect(kindOf(s), s.id).toBe('def')
  })

  it('代表: 神授の防御/攻撃バフが正しく分かれる', () => {
    expect(skillById('himamori').buffKind).toBe('def')
    expect(skillById('g_iwakura').buffKind).toBe('def')
    expect(skillById('g_minomushi').buffKind).toBe('def')
    expect(kindOf(skillById('kien'))).toBe('atk')
    expect(kindOf(skillById('g_noroshi'))).toBe('atk')
    expect(kindOf(skillById('gs_star2'))).toBe('atk')
  })
})
