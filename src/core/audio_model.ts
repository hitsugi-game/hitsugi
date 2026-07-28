import type { NarrativeStage, Screen } from './types'

export type TrackName =
  | 'title'
  | 'home'
  | 'pact'
  | 'forge'
  | 'expedition'
  | 'battle'
  | 'rare'
  | 'boss'
  | 'archive'
  | 'scene'
  | 'finale'
  | 'none'

export type AmbienceKind = 'forest' | 'zaka' | 'tani' | 'miyama' | 'none'
export type AudioBusName = 'master' | 'music' | 'effects' | 'ambience'
export type MusicRichness = 'spare' | 'balanced' | 'full'

export const DEFAULT_MUSIC_RICHNESS: MusicRichness = 'balanced'

export const MUSIC_RICHNESS_LABELS: Record<MusicRichness, string> = {
  spare: '余白多め',
  balanced: '標準',
  full: '響き豊か',
}

export interface MusicSceneContext {
  screenId?: Screen['id']
  regionId?: string
  seasonIndex?: number
  generation?: number
  narrativeStage?: NarrativeStage
}

export const DEFAULT_MUSIC_CONTEXT: Required<Pick<MusicSceneContext, 'seasonIndex' | 'generation'>> = {
  seasonIndex: 0,
  generation: 1,
}

export interface AudioMix {
  master: number
  music: number
  effects: number
  ambience: number
}

export const DEFAULT_AUDIO_MIX: AudioMix = {
  master: 0.5,
  music: 0.72,
  effects: 0.9,
  ambience: 0.58,
}

export const TRACK_LABELS: Record<TrackName, string> = {
  title: '遠灯 — 汐里の子守唄',
  home: '家の座 — 継ぐ火',
  pact: '星契り — 天の逆歌',
  forge: '鍛冶と蔵 — 鉄の八拍',
  expedition: '夜藪行 — 道なき灯',
  battle: '抗い — 灯刃',
  rare: '白金の脈動 — 稀相',
  boss: '地の主 — 常夜の底',
  archive: '家譜 — 名残の墨',
  scene: '命の間 — 子守唄の欠片',
  finale: '千年の岐路 — 灯継ぎ',
  none: '静寂',
}

const SCREEN_TRACKS: Record<Exclude<Screen['id'], 'battle'>, Exclude<TrackName, 'battle' | 'rare' | 'boss' | 'none'>> = {
  title: 'title',
  intro: 'scene',
  home: 'home',
  pact: 'pact',
  starLottery: 'pact',
  birth: 'scene',
  ceremony: 'scene',
  jobrite: 'scene',
  life: 'scene',
  village: 'home',
  depart: 'expedition',
  expedition: 'expedition',
  dungeon: 'expedition',
  chronicle: 'archive',
  codex: 'archive',
  forge: 'forge',
  facilities: 'forge',
  finale: 'finale',
  death: 'scene',
  dream: 'scene',
  dreamEp: 'scene',
  ending: 'finale',
}

export function resolveTrack(screenId: Screen['id'], battle?: { boss?: boolean; rare?: boolean }): TrackName {
  if (screenId !== 'battle') return SCREEN_TRACKS[screenId]
  if (battle?.boss) return 'boss'
  if (battle?.rare) return 'rare'
  return 'battle'
}

export interface BattleTensionInput {
  partyHpRatio: number
  enemyHpRatio: number
  boss?: boolean
  rare?: boolean
  phase?: 'input' | 'anim' | 'won' | 'lost' | 'fled'
}

export function clampUnit(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(1, value))
}

export function computeBattleTension(input: BattleTensionInput): number {
  if (input.phase === 'won' || input.phase === 'lost' || input.phase === 'fled') return 0.08
  const partyDanger = 1 - clampUnit(input.partyHpRatio, 1)
  const enemyProgress = 1 - clampUnit(input.enemyHpRatio, 1)
  const encounterBase = input.boss ? 0.5 : input.rare ? 0.36 : 0.16
  // 危機だけで単調に音数を増やさず、敵を追い詰めた高揚も別項で加える。
  return clampUnit(encounterBase + partyDanger * 0.38 + enemyProgress * 0.16)
}

export type PhraseShape = 'opening' | 'theme' | 'answer' | 'breath' | 'lineage' | 'surge'

const FORMS: Record<Exclude<TrackName, 'none'>, readonly PhraseShape[]> = {
  title: ['opening', 'theme', 'breath', 'answer', 'lineage', 'breath'],
  home: ['opening', 'theme', 'answer', 'breath', 'lineage', 'answer'],
  pact: ['opening', 'answer', 'breath', 'theme', 'lineage', 'breath'],
  forge: ['opening', 'theme', 'surge', 'answer', 'breath', 'lineage'],
  expedition: ['opening', 'theme', 'breath', 'answer', 'surge', 'lineage'],
  battle: ['opening', 'theme', 'surge', 'answer', 'lineage'],
  rare: ['breath', 'answer', 'surge', 'lineage'],
  boss: ['opening', 'surge', 'theme', 'answer', 'surge', 'lineage'],
  archive: ['opening', 'breath', 'theme', 'answer', 'lineage', 'breath'],
  scene: ['opening', 'breath', 'answer', 'lineage', 'theme', 'breath'],
  finale: ['opening', 'theme', 'answer', 'lineage', 'surge', 'theme'],
}

export interface ArrangementStep {
  shape: PhraseShape
  melodyDensity: number
  percussionGain: number
  lineageMotif: boolean
}

export type PhraseVariation = 'root' | 'echo' | 'turn' | 'lift' | 'shadow' | 'memory'

export interface PhrasePlan extends ArrangementStep {
  variation: PhraseVariation
  transpose: number
  rhythmShift: number
  reverseMelody: boolean
  counterline: boolean
  octaveEcho: boolean
  noteGate: number
  humanizePhase: number
  panRotation: number
  accentOffset: number
  variantLabel: string
  signature: string
}

export function arrangementAt(track: Exclude<TrackName, 'none'>, phraseIndex: number, tension = 0): ArrangementStep {
  const form = FORMS[track]
  const shape = form[((phraseIndex % form.length) + form.length) % form.length]
  const t = clampUnit(tension)
  const densityByShape: Record<PhraseShape, number> = {
    opening: 0.48,
    theme: 1,
    answer: 0.78,
    breath: 0.18,
    lineage: 0.62,
    surge: 1,
  }
  const percussionByShape: Record<PhraseShape, number> = {
    opening: 0.35,
    theme: 0.72,
    answer: 0.55,
    breath: 0,
    lineage: 0.25,
    surge: 1,
  }
  return {
    shape,
    melodyDensity: clampUnit(densityByShape[shape] + t * 0.16),
    percussionGain: clampUnit(percussionByShape[shape] + t * 0.22),
    lineageMotif: shape === 'lineage',
  }
}

const VARIATIONS: Record<MusicRichness, readonly PhraseVariation[]> = {
  spare: ['root', 'echo', 'memory'],
  balanced: ['root', 'echo', 'turn', 'shadow', 'memory'],
  full: ['root', 'echo', 'turn', 'lift', 'shadow', 'memory'],
}

const VARIATION_LABELS: Record<PhraseVariation, string> = {
  root: '灯の主題',
  echo: '返し',
  turn: 'めぐり',
  lift: '高み',
  shadow: '影法師',
  memory: '継ぎ音',
}

const NARRATIVE_LABELS: Record<NarrativeStage, string> = {
  one_light: '一つ灯',
  name: '名の記憶',
  duet_hunger: '二声の飢え',
  fire_vow: '火の誓い',
  summit: '尾根の答え',
}

const SEASON_LABELS = ['春芽', '夏灯', '秋影', '冬澄'] as const

function stableHash(value: string): number {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function safeInt(value: number | undefined, fallback: number, max = 1_000_000): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(max, Math.floor(value!)))
}

export function sanitizeMusicRichness(value: unknown): MusicRichness {
  return value === 'spare' || value === 'balanced' || value === 'full' ? value : DEFAULT_MUSIC_RICHNESS
}

export function normalizeMusicContext(context: MusicSceneContext = {}): MusicSceneContext {
  return {
    screenId: context.screenId,
    regionId: context.regionId || undefined,
    seasonIndex: safeInt(context.seasonIndex, DEFAULT_MUSIC_CONTEXT.seasonIndex),
    generation: Math.max(1, safeInt(context.generation, DEFAULT_MUSIC_CONTEXT.generation, 999)),
    narrativeStage: context.narrativeStage,
  }
}

function contextSeed(track: Exclude<TrackName, 'none'>, context: MusicSceneContext): number {
  const normalized = normalizeMusicContext(context)
  return stableHash([
    track,
    normalized.screenId ?? '',
    normalized.regionId ?? '',
    normalized.seasonIndex,
    normalized.generation,
    normalized.narrativeStage ?? '',
  ].join('|'))
}

/**
 * M60: 6句の文法の上に、相互に素な長さの巡回を重ねる決定論的変奏。
 * 同じsave・同じ場面なら同じ計画に戻り、乱数やタイマー数を増やさず10分以上の反復感を散らす。
 */
export function phrasePlanAt(
  track: Exclude<TrackName, 'none'>,
  phraseIndex: number,
  context: MusicSceneContext = {},
  richness: MusicRichness = DEFAULT_MUSIC_RICHNESS,
  tension = 0,
): PhrasePlan {
  const phrase = safeInt(phraseIndex, 0, Number.MAX_SAFE_INTEGER)
  const normalized = normalizeMusicContext(context)
  const safeRichness = sanitizeMusicRichness(richness)
  const arrangement = arrangementAt(track, phrase, tension)
  const seed = contextSeed(track, normalized)
  const formLength = FORMS[track].length
  const stanza = Math.floor(phrase / formLength)
  // 5/7/11の巡回を重ね、短いformの丸ごと反復を避ける。
  const weave = (seed + phrase * 7 + stanza * 11 + (phrase % 5) * (stanza % 7 + 1)) >>> 0
  const pool = VARIATIONS[safeRichness]
  const variation = pool[weave % pool.length]
  const season = Math.floor(((normalized.seasonIndex ?? 0) % 12) / 3)
  const regionColor = normalized.regionId ? (stableHash(normalized.regionId) % 3) - 1 : 0
  const seasonColor = [0, 1, 0, -1][season]
  const variationColor: Record<PhraseVariation, number> = { root: 0, echo: 0, turn: 1, lift: 2, shadow: -1, memory: 0 }
  const transpose = regionColor + seasonColor + variationColor[variation]
  const richnessDensity = safeRichness === 'spare' ? -0.2 : safeRichness === 'full' ? 0.1 : 0
  const tensionValue = clampUnit(tension)
  const melodyDensity = clampUnit(arrangement.melodyDensity + richnessDensity)
  const percussionGain = clampUnit(arrangement.percussionGain + (safeRichness === 'full' ? 0.08 : safeRichness === 'spare' ? -0.18 : 0))
  const generation = normalized.generation ?? 1
  const contextLabel = normalized.narrativeStage
    ? NARRATIVE_LABELS[normalized.narrativeStage]
    : normalized.regionId
      ? ['木立', '石道', '谷影', '深山'][stableHash(normalized.regionId) % 4]
      : SEASON_LABELS[season]
  const variantLabel = `${contextLabel}・第${generation}代・${VARIATION_LABELS[variation]}`
  const noteGate = (weave >>> 7) % 97
  const humanizePhase = (weave >>> 13) % 17
  const panRotation = (weave >>> 19) % 5
  const accentOffset = (weave >>> 23) % 4
  return {
    ...arrangement,
    melodyDensity,
    percussionGain,
    variation,
    transpose,
    rhythmShift: (((weave >>> 5) % 7) - 3) * 0.025,
    reverseMelody: variation === 'turn' && arrangement.shape === 'answer',
    counterline: safeRichness === 'full' && arrangement.shape !== 'breath' && (weave >>> 3) % 3 === 0,
    octaveEcho: safeRichness !== 'spare' && (variation === 'echo' || (variation === 'memory' && generation >= 3)),
    noteGate,
    humanizePhase,
    panRotation,
    accentOffset,
    variantLabel,
    signature: [arrangement.shape, variation, transpose, noteGate, humanizePhase, panRotation, accentOffset, tensionValue.toFixed(2)].join(':'),
  }
}

// M45A O-05正本: 家祖idの文字コード総和を平調子の三音へ写像する。
export function lineageMotifDegrees(founderId: string): [number, number, number] {
  const seed = Array.from(founderId).reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0)
  return [seed % 5, (seed >> 2) % 5, (seed >> 4) % 5]
}

export interface LineageMotifPlan {
  degrees: number[]
  beatOffsets: number[]
  label: string
}

export function evolvedLineageMotif(founderId: string, generation: number): LineageMotifPlan {
  const base = lineageMotifDegrees(founderId)
  const gen = Math.max(1, safeInt(generation, 1, 999))
  const layer = Math.min(3, Math.floor((gen - 1) / 2))
  const degrees = [...base]
  if (layer >= 1) degrees.push(base[0] + 5)
  if (layer >= 2) degrees.splice(2, 0, base[1] + 5)
  if (layer >= 3) degrees.push(base[2] - 5, base[0])
  const spacing = layer >= 2 ? 0.9 : 1.25
  const generationPulse = ((gen - 1) % 11) * 0.035
  return {
    degrees,
    beatOffsets: degrees.map((_, index) => 2 + index * spacing + ((generationPulse + index * 0.02) % 0.18)),
    label: layer === 0 ? '三つ灯' : layer === 1 ? '帰灯' : layer === 2 ? '重ね灯' : '継承灯',
  }
}

export function sanitizeMix(value: Partial<AudioMix>): AudioMix {
  return {
    master: clampUnit(value.master ?? DEFAULT_AUDIO_MIX.master, DEFAULT_AUDIO_MIX.master),
    music: clampUnit(value.music ?? DEFAULT_AUDIO_MIX.music, DEFAULT_AUDIO_MIX.music),
    effects: clampUnit(value.effects ?? DEFAULT_AUDIO_MIX.effects, DEFAULT_AUDIO_MIX.effects),
    ambience: clampUnit(value.ambience ?? DEFAULT_AUDIO_MIX.ambience, DEFAULT_AUDIO_MIX.ambience),
  }
}

export function transitionSeconds(from: TrackName, to: TrackName): number {
  if (from === 'none' || to === 'none') return 0.45
  if (to === 'battle' || to === 'rare' || to === 'boss') return 0.28
  if (from === 'battle' || from === 'rare' || from === 'boss') return 0.7
  return 1.15
}
