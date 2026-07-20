import type {
  Character, GameData, NarrativeProgress, NarrativeScene, NarrativeStage,
} from './types'
import { CHAPTERS } from './data/story'
import { DREAM_EPISODES } from './data/dreams'
import { REGIONS } from './data/regions'

export type NarrativeChannel = 'ambient' | 'discovery' | 'scene'
export type NarrativeTrigger =
  | { kind: 'home' }
  | { kind: 'depart'; regionId: string }
  | { kind: 'dungeonEnter'; regionId: string; firstVisit: boolean }
  | { kind: 'monument'; regionId: string; fragment: number }
  | { kind: 'boss'; regionId: string; phase: 'before' | 'victory' }
  | { kind: 'return'; regionId: string; bossDown: boolean }
  | { kind: 'villageTalk'; villagerId: string }
  | { kind: 'inherit'; generation: number }

export interface NarrativeBeat {
  id: string
  stage: NarrativeStage
  channel: NarrativeChannel
  trigger: NarrativeTrigger
  text: string
  speaker?: string
  once?: boolean
  priority: number
  requires?: string[]
  blocks?: string[]
  recap?: string
}

const EMPTY_RESONANCE = { cut: 0, save: 0, inherit: 0 }
const EMPTY_METRICS = {
  scenesOpened: 0,
  scenesCompleted: 0,
  scenesSkipped: 0,
  scenesDeferred: 0,
  totalSceneMs: 0,
  maxDeferred: 0,
  monthsAdvanced: 0,
  interruptedAfterMonth: 0,
}

export function narrativeSceneId(scene: NarrativeScene): string {
  switch (scene.kind) {
    case 'birth': return `birth:${scene.charId}`
    case 'death': return `death:${scene.charId}`
    case 'ceremony': return `ceremony:${scene.charId}`
    case 'jobrite': return `jobrite:${scene.charId}`
    case 'dream': return 'dream:intro'
    case 'dreamEp': return `dream:${scene.epId}`
    case 'life': return scene.narrativeId ?? `life:${scene.title}`
  }
}

export function narrativeScenePriority(scene: NarrativeScene): number {
  if (scene.kind === 'death') return 0
  if (scene.kind === 'birth' || scene.kind === 'ceremony' || scene.kind === 'jobrite') return 1
  if (scene.kind === 'life' && scene.narrativeId?.startsWith('ch')) return 2
  if (scene.kind === 'dream' || scene.kind === 'dreamEp') return 3
  return 4
}

export function narrativeStageOf(data: Pick<GameData, 'flags'>): NarrativeStage {
  const f = data.flags
  if (f.ch5_completed || f.dreamEp_yume_itadaki) return 'summit'
  if (f.ch4_completed || f.dreamEp_yume_maki) return 'fire_vow'
  if (f.ch3_completed || f.dreamEp_yume_futari || f.dreamEp_yume_ue || f.dreamEp_yume_taiyou) return 'duet_hunger'
  if (f.ch2_completed || f.dreamEp_yume_tabibito || f.dreamEp_yume_sora_no_ko) return 'name'
  return 'one_light'
}

function completedFromFlags(data: GameData, legacy: boolean): string[] {
  const ids: string[] = []
  for (const chapter of CHAPTERS) {
    if (data.flags[`${chapter.id}_completed`] || (legacy && data.flags[chapter.id])) ids.push(chapter.id)
  }
  if (data.flags.dreamSeen) ids.push('dream:intro')
  for (const ep of DREAM_EPISODES) {
    if (data.flags[`dreamEp_${ep.id}`]) ids.push(`dream:${ep.id}`)
  }
  return ids
}

function replayableSceneForId(id: string): NarrativeScene | undefined {
  if (id === 'dream:intro') return { kind: 'dream' }
  if (id.startsWith('dream:')) {
    const epId = id.slice('dream:'.length)
    return DREAM_EPISODES.some((episode) => episode.id === epId) ? { kind: 'dreamEp', epId } : undefined
  }
  const chapter = CHAPTERS.find((candidate) => candidate.id === id)
  return chapter
    ? { kind: 'life', narrativeId: chapter.id, title: chapter.title, lines: chapter.lines }
    : undefined
}

export function isReplayableNarrativeScene(scene: NarrativeScene): boolean {
  return scene.kind === 'dream' || scene.kind === 'dreamEp' || (scene.kind === 'life' && !!scene.narrativeId?.startsWith('ch'))
}

/**
 * M34 save migration. Sentinelが無い旧saveだけ実名開示を保守的に導出する。
 * 現行saveへlegacy ORを再適用しないことが、ch4途中reloadの必須条件。
 */
export function migrateM34Narrative(data: GameData): GameData {
  const legacy = data.flags?.m34_narrative_schema !== 1
  const flags = { ...(data.flags ?? {}) }
  if (legacy) {
    const legacyReveal = Boolean(
      flags.ch4 ||
      (data.gossipIndex ?? 0) >= 12 ||
      flags.shioriPhase ||
      flags.endingType !== undefined ||
      flags.cleared,
    )
    flags.m34_narrative_schema = 1
    flags.reveal_shiori_name = legacyReveal
    flags.legacy_shiori_recap_pending = legacyReveal
    if (legacyReveal) flags.ch4_completed = true
  }

  const completed = [...new Set([
    ...(data.narrative?.completed ?? []),
    ...completedFromFlags({ ...data, flags }, legacy),
  ])]
  const seen = [...new Set([...(data.narrative?.seen ?? []), ...completed])]
  const archive = uniqueScenes([
    ...(data.narrative?.archive ?? []),
    ...completed.map(replayableSceneForId).filter((scene): scene is NarrativeScene => !!scene),
  ]).filter(isReplayableNarrativeScene)
  const deferred = [...(data.narrative?.deferred ?? [])]
  const fallbackDeferredAt = data.lastPlayedAt ?? Date.now()
  const deferredSince = Object.fromEntries(deferred.map((scene) => {
    const id = narrativeSceneId(scene)
    return [id, data.narrative?.deferredSince?.[id] ?? fallbackDeferredAt]
  }))
  const narrative: NarrativeProgress = {
    stage: narrativeStageOf({ flags }),
    seen,
    queued: [...new Set(data.narrative?.queued ?? [])],
    completed,
    deferred,
    archive,
    deferredSince,
    deferredReminderShown: [...new Set(data.narrative?.deferredReminderShown ?? [])],
    active: data.narrative?.active,
    activeOpenedAt: data.narrative?.activeOpenedAt,
    activeReplay: data.narrative?.activeReplay,
    monthTransitionPending: data.narrative?.monthTransitionPending,
    resonance: { ...EMPTY_RESONANCE, ...(data.narrative?.resonance ?? {}) },
    metrics: { ...EMPTY_METRICS, ...(data.narrative?.metrics ?? {}) },
    generationQuestion: data.narrative?.generationQuestion,
    lastReturn: data.narrative?.lastReturn,
  }
  return { ...data, flags, narrative }
}

/** crash/閉じるで表示中だった場面は読了にせず「灯の余白」へ戻す。 */
export function recoverNarrativeOnLoad(data: GameData): GameData {
  const migrated = migrateM34Narrative(data)
  const n = migrated.narrative!
  const deferred = [...n.deferred]
  if (n.active && !n.activeReplay) deferred.unshift(n.active)
  const interrupted = !!n.monthTransitionPending

  // post-M34のch4 queue済みsaveを、legacy扱いせず匿名のまま再開可能にする。
  const ch4Pending = migrated.flags.ch4 && !migrated.flags.ch4_completed
  if (ch4Pending && !deferred.some((s) => narrativeSceneId(s) === 'ch4')) {
    const ch4 = CHAPTERS.find((c) => c.id === 'ch4')
    if (ch4) deferred.unshift({ kind: 'life', narrativeId: ch4.id, title: ch4.title, lines: ch4.lines })
  }
  const recoveredAt = Date.now()
  const deferredSince = Object.fromEntries(uniqueScenes(deferred).map((scene) => {
    const id = narrativeSceneId(scene)
    return [id, n.deferredSince[id] ?? (n.active && narrativeSceneId(n.active) === id ? n.activeOpenedAt : undefined) ?? recoveredAt]
  }))
  return {
    ...migrated,
    narrative: {
      ...n,
      active: undefined,
      activeOpenedAt: undefined,
      activeReplay: undefined,
      monthTransitionPending: false,
      deferred: uniqueScenes(deferred),
      deferredSince,
      metrics: {
        ...n.metrics,
        interruptedAfterMonth: n.metrics.interruptedAfterMonth + (interrupted ? 1 : 0),
        maxDeferred: Math.max(n.metrics.maxDeferred, deferred.length),
      },
    },
  }
}

export function narrativeMetricSummary(data: GameData): {
  averageSceneMs: number
  skipRate: number
  maxDeferred: number
  interruptedAfterMonth: number
} {
  const metrics = migrateM34Narrative(data).narrative!.metrics
  const closed = metrics.scenesCompleted + metrics.scenesSkipped + metrics.scenesDeferred
  const resolved = metrics.scenesCompleted + metrics.scenesSkipped
  return {
    averageSceneMs: closed > 0 ? Math.round(metrics.totalSceneMs / closed) : 0,
    skipRate: resolved > 0 ? metrics.scenesSkipped / resolved : 0,
    maxDeferred: metrics.maxDeferred,
    interruptedAfterMonth: metrics.interruptedAfterMonth,
  }
}

export function uniqueScenes(scenes: NarrativeScene[]): NarrativeScene[] {
  const ids = new Set<string>()
  return scenes.filter((scene) => {
    const id = narrativeSceneId(scene)
    if (ids.has(id)) return false
    ids.add(id)
    return true
  })
}

export function partitionNarrativeScenes(
  progress: NarrativeProgress,
  candidates: NarrativeScene[],
): { primary: NarrativeScene | null; deferred: NarrativeScene[]; queued: string[] } {
  const existing = new Set([
    ...progress.completed,
    ...progress.deferred.map(narrativeSceneId),
    ...(progress.active ? [narrativeSceneId(progress.active)] : []),
  ])
  const fresh = uniqueScenes(candidates)
    .filter((scene) => !existing.has(narrativeSceneId(scene)))
    .sort((a, b) => narrativeScenePriority(a) - narrativeScenePriority(b))
  return {
    primary: fresh[0] ?? null,
    deferred: uniqueScenes([...progress.deferred, ...fresh.slice(1)]),
    queued: [...new Set([...progress.queued, ...fresh.map(narrativeSceneId)])],
  }
}

export function chapterIdByTitle(title: string): string | undefined {
  return CHAPTERS.find((chapter) => chapter.title === title)?.id
}

export function generationQuestion(data: GameData): string {
  const items = [
    ...data.inventory,
    ...data.family.flatMap((c) => Object.values(c.equipment).filter((x): x is NonNullable<typeof x> => !!x)),
  ]
  const inherited = items.some((item) => item.generation >= 2)
  const completedLore = Object.values(data.loreFrags ?? {}).filter((n) => n >= 3).length
  const pacts = Object.values(data.godAffinity).filter((n) => n > 0).length
  const bossDeeds = data.family.flatMap((c) => c.deeds).filter((x) => x.includes('討った')).length
  if (inherited) return '受け継ぐことは、持ち主の役目まで背負うことか。'
  if (completedLore >= 3) return '事情を知った刃は、知らぬ刃より優しいか。'
  if (bossDeeds >= 2) return '終わらせることで救えるものは、本当にあるか。'
  if (pacts >= 3) return '血を繋ぐことは、誰の願いなのか。'
  return '短い命を誰かと分けるとき、何を次代へ残したいか。'
}

export function addResonance(
  data: GameData,
  kind: keyof NarrativeProgress['resonance'],
  amount = 1,
): GameData {
  const migrated = migrateM34Narrative(data)
  const n = migrated.narrative!
  return {
    ...migrated,
    narrative: {
      ...n,
      resonance: { ...n.resonance, [kind]: n.resonance[kind] + Math.max(0, amount) },
    },
  }
}

export function resonanceLine(data: GameData): string {
  const r = migrateM34Narrative(data).narrative!.resonance
  const max = Math.max(r.cut, r.save, r.inherit)
  if (max <= 0) return 'この家は、答えを決めつけず、ここまで灯を運んできた。'
  const leaders = (['cut', 'save', 'inherit'] as const).filter((key) => r[key] === max)
  if (leaders.length !== 1) return 'この家は、終えることも、分けることも、継ぐことも重ねてきた。'
  if (r.cut === max) return 'この家は、終われぬ主へ何度も幕を引いてきた。'
  if (r.save === max) return 'この家は、傷ついた者を置いて行かない夜を重ねてきた。'
  return 'この家は、名と道具と役目を、形を変えて渡してきた。'
}

export interface FamilyEcho {
  label: string
  text: string
}

export function familyFinaleEchoes(data: GameData): FamilyEcho[] {
  const out: FamilyEcho[] = []
  const firstDead = data.family
    .filter((c) => !c.alive)
    .sort((a, b) => (a.deathSeason ?? Number.MAX_SAFE_INTEGER) - (b.deathSeason ?? Number.MAX_SAFE_INTEGER))[0]
  if (firstDead) {
    out.push({ label: '最初に見送った灯', text: `${firstDead.name}${firstDead.lastWords ? `「${firstDead.lastWords.slice(0, 24)}」` : ` — ${firstDead.epitaph}`}` })
  }

  const ownership = new Map<string, { item: GameData['inventory'][number]; owner?: Character }>()
  for (const item of data.inventory) ownership.set(item.id, { item })
  for (const char of data.family) {
    for (const item of Object.values(char.equipment)) if (item) ownership.set(item.id, { item, owner: char })
  }
  const heirloom = [...ownership.values()].sort((a, b) => b.item.generation - a.item.generation)[0]
  if (heirloom && heirloom.item.generation > 0) {
    out.push({
      label: '最も長く継いだ形見',
      text: `${heirloom.item.name} — ${heirloom.item.legacyFirstOwner ? `${heirloom.item.legacyFirstOwner}から` : ''}${heirloom.item.generation}代${heirloom.owner ? `、${heirloom.owner.name}の手にある` : ''}`,
    })
  }

  const completedLore = Object.entries(data.loreFrags ?? {}).filter(([, n]) => n >= 3)
  const nemesis = [...(data.nemeses ?? [])].sort((a, b) => b.level - a.level)[0]
  if (nemesis) out.push({ label: '因縁を結んだ名', text: `${nemesis.name} — ${nemesis.victim}の仇` })
  else if (completedLore[0]) out.push({ label: '真相まで読んだ土地', text: `${completedLore.length}つの土地の縁起を、最後まで記した` })

  if (out.length === 0) {
    const head = data.family.find((c) => c.alive && c.isHead) ?? data.family[0]
    out.push({ label: 'ここへ運んだ灯', text: `${head?.name ?? '名もなき当主'}が、家の最初の答えを選ぶ` })
  }
  return out.slice(0, 3)
}

export function personalizedEndingBeat(data: GameData, ending: 'cut' | 'save' | 'inherit'): string {
  const names = familyFinaleEchoes(data).map((echo) => echo.text.split(/[「—]/)[0].trim()).filter(Boolean)
  const anchor = names.slice(0, 2).join('と') || (data.family[0]?.name ?? '名もなき一族')
  if (ending === 'cut') return `${anchor}から続く名を読み上げ、二人を独りにしないまま、千年の夜を送った。`
  if (ending === 'save') return `${anchor}が運んだ灯も封印へ重なった。今度の錠前は、誰か一人の犠牲ではない。`
  return `${anchor}が継いだ名と役目は、頂と郷を往き来する新しい家譜になった。`
}

export function regionQuestion(regionName: string, loreFragments: number, cleared: boolean): string {
  if (cleared) return `${regionName}で終われた想いを、次の夜へどう渡す。`
  if (loreFragments >= 3) return `事情を知った今、${regionName}の主へどんな終わりを渡す。`
  if (loreFragments > 0) return `${regionName}に残る声は、何を守り続けている。`
  return `${regionName}の闇で、終われずにいるのは誰だ。`
}

export function bossEmotion(regionName: string, loreFragments: number): string {
  if (loreFragments >= 3) return `${regionName}の主は、忘れまいとして立ちはだかる。`
  if (loreFragments > 0) return `${regionName}の主は、待ち焦がれるようにこちらを見る。`
  return `${regionName}の主は、名もない願いを守り抜こうとしている。`
}

export interface ReturnTrace {
  kind: 'human' | 'land' | 'myth'
  text: string
}

export function returnTraces(data: GameData): ReturnTrace[] {
  const last = data.narrative?.lastReturn
  if (!last) return []
  const region = REGIONS.find((candidate) => candidate.id === last.regionId)
  const party = last.partyIds
    .map((id) => data.family.find((character) => character.id === id)?.name)
    .filter((name): name is string => !!name)
  const injured = last.injuredIds
    .map((id) => data.family.find((character) => character.id === id)?.name)
    .filter((name): name is string => !!name)
  return [
    {
      kind: 'human',
      text: injured.length > 0
        ? `${injured.join('、')}は傷を負ったが、全員で家へ戻った。`
        : `${party.join('、') || '一族'}は灯を携え、家へ戻った。`,
    },
    { kind: 'land', text: `${region?.name ?? last.regionId}の土と夜の匂いが、装束に残っている。` },
    {
      kind: 'myth',
      text: last.bossDown
        ? '終われなかった主へ幕を渡した。その静けさが、家譜に一行増えた。'
        : 'まだ終われない声を背にした。次に会う時、何を知っているだろう。',
    },
  ]
}

export function legacyShioriRecap(data: GameData): string | null {
  return data.flags.legacy_shiori_recap_pending
    ? '家譜の初代の名は、汐里。千年前に御山へ登った楽士である。'
    : null
}
