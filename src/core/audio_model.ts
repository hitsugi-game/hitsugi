import type { Screen } from './types'

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

// M45A O-05正本: 家祖idの文字コード総和を平調子の三音へ写像する。
export function lineageMotifDegrees(founderId: string): [number, number, number] {
  const seed = Array.from(founderId).reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0)
  return [seed % 5, (seed >> 2) % 5, (seed >> 4) % 5]
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
