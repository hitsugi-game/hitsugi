import type { Character, Tomoshigata } from '../core/types'

// 生成画像のURL解決 — 原本png名をweb配信用jpgへ読み替える
export function gameImg(file: string): string {
  return `${import.meta.env.BASE_URL}img/${file.replace(/\.png$/, '.jpg')}`
}

export const DREAM_VISUAL_FALLBACK = 'cg_kiro.jpg'

export function dreamImg(file?: string): string {
  return gameImg(file ?? DREAM_VISUAL_FALLBACK)
}

// 現在の夢を読み終える間に次篇1枚だけをidle読込する。呼出側のeffect cleanupで
// 予約を解除できるようにし、Title/Homeから7枚をまとめて取得しない。
export function prefetchGameImg(file: string): () => void {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return () => undefined

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void) => number
    cancelIdleCallback?: (handle: number) => void
  }
  let idleId: number | undefined
  let timerId: number | undefined
  let prefetched: HTMLImageElement | undefined
  const load = () => {
    prefetched = new Image()
    prefetched.decoding = 'async'
    prefetched.src = gameImg(file)
  }

  if (idleWindow.requestIdleCallback) idleId = idleWindow.requestIdleCallback(load)
  else timerId = window.setTimeout(load, 250)

  return () => {
    if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId)
    if (timerId !== undefined) window.clearTimeout(timerId)
    prefetched = undefined
  }
}

// ---- 年齢段階(M17: 画像の描き分け単位) ----
// 幼子(<6月齢)/全盛(6-17)/灯細り(18-23)。閾値はinheritance.tsのAGE_CURVEと同期
export type AgeStage = 'child' | 'adult' | 'elder'
export function stageOf(ageMonths: number): AgeStage {
  if (ageMonths < 6) return 'child'
  if (ageMonths >= 18) return 'elder'
  return 'adult'
}
// 段階別歩行フレームの接頭辞(child=walkc/elder=walke。シートはslice-walk-sheets.ps1が分割)
export function stagePrefix(stage: AgeStage): 'walk' | 'walkc' | 'walke' {
  return stage === 'child' ? 'walkc' : stage === 'elder' ? 'walke' : 'walk'
}

// 歩行スプライトの正面立ちフレーム(down_1=中立の立ち姿)を立ち絵として転用する。
// 灯型(tomoshigata)×性別で決まり、成人前の幼子はまだ型を成さぬため null を返す。
// stage指定時は老いの姿(walke_*)を優先し、描画側でonError連鎖により成人姿へ退避する。
export function charSprite(char: Pick<Character, 'tomoshigata' | 'sex'>, stage: AgeStage = 'adult'): string | null {
  if (!char.tomoshigata) return null
  return spriteUrl(char.tomoshigata, char.sex, stage)
}

export function spriteUrl(gata: Tomoshigata, sex: 'm' | 'f', stage: AgeStage = 'adult'): string {
  return `${walkBasePath(gata, sex, stage)}_down_1.png`
}

// 歩行フレームの共通接頭辞(方向・コマ番号を除く) — village/engineが3方向×3コマを組み立てる(M23)
export function walkBasePath(gata: Tomoshigata, sex: 'm' | 'f', stage: AgeStage = 'adult'): string {
  return `${import.meta.env.BASE_URL}img/sprites/${stagePrefix(stage)}_${gata}_${sex}`
}

// 任意の歩行スプライトファイル名を解決(v3.1 M8: 戦闘の立ち姿などに使用)
export function spriteImg(file: string): string {
  return `${import.meta.env.BASE_URL}img/sprites/${file}`
}

// ---- M17: カテゴリ別の画像URL(全て未生成なら描画側で優雅に退避する前提) ----
// 顔絵 — 灯型×性別×性根で個人が見分けられる
export function faceImg(char: Pick<Character, 'tomoshigata' | 'sex' | 'personalityId'>): string | null {
  if (!char.tomoshigata) return null
  return gameImg(`face_${char.tomoshigata}_${char.sex}_${char.personalityId}.png`)
}
// 灯型を授かる前も人物を炎記号へ縮退させない。星脈に沿う稽古着の顔絵を仮姿として使い、
// 成人の儀の後は選んだ灯型の顔絵へ移る。既存64顔だけを再利用するため権利台帳も増えない。
export function provisionalFaceImg(char: Pick<Character, 'element' | 'sex' | 'personalityId'>): string {
  const trainingGata: Record<Character['element'], Tomoshigata> = {
    fire: 'homura', water: 'nagi', wind: 'nagi', earth: 'iwao', moon: 'sumi', star: 'sumi',
  }
  return gameImg(`face_${trainingGata[char.element]}_${char.sex}_${char.personalityId}.png`)
}
// 戦闘立ち姿(横向き) — pose_{gata}_{sex}_{stage}
export function poseImg(gata: Tomoshigata | string, sex: 'm' | 'f' | string, stage: AgeStage = 'adult'): string {
  return gameImg(`pose_${gata}_${sex}_${stage}.png`)
}
export const itemIcon = (baseId: string) => gameImg(`it_${baseId}.png`)
export const skillIcon = (skillId: string) => gameImg(`sk_${skillId}.png`)
// UIアイコン(ic_*/node_*/slot_*/boon_*/job_*/emb_*/nem_* をそのまま渡す)
export const uiIcon = (name: string) => gameImg(`${name}.png`)
// 地域個別背景と主の間背景(無ければ従来のtier共有bgへ退避)
export const regionBgR = (regionId: string) => gameImg(`bg_r_${regionId}.png`)
export const bossBgImg = (regionId: string) => gameImg(`bossbg_${regionId}.png`)
// カットイン(cutin_toza_* / cutin_god_* / cutin_boss_*)
export const cutinImg = (name: string) => gameImg(`cutin_${name}.png`)
// 星神・縁MAXの第二立ち絵
export const godMaxImg = (portrait: string) => gameImg(portrait.replace(/\.png$/, '_max.png'))

// VC5: MAX候補は全180点揃っているが、通常像との同一性・疑似文字・画風を独立確認するまで
// 自動採用しない。承認済みportraitだけを明示的に足し、それ以外は通常像＋runtimeの縁極frameで
// identityを守る。画像が存在することとscene-readyであることを分離するための境界。
const REVIEWED_GOD_MAX_PORTRAITS = new Set<string>()
export function isGodMaxArtReviewed(portrait: string): boolean {
  return REVIEWED_GOD_MAX_PORTRAITS.has(portrait)
}
export function godPresentationImg(portrait: string, preferMax: boolean): string {
  return preferMax && isGodMaxArtReviewed(portrait) ? godMaxImg(portrait) : gameImg(portrait)
}
export const eventImg = (eventId: string) => gameImg(`ev_${eventId}.png`)
export const dailyImg = (index: number) => gameImg(`life_daily_${String(index % 20).padStart(2, '0')}.png`)
export const villagerImg = (id: string, band: number) => gameImg(`vil_${id}_${band}.png`)

// 郷(ホーム)の背景。まだ生成されていなければ描画側でCSS/SVGへフォールバックする。
export const HOME_BG = 'bg_sato.png'
// 季節替えの郷背景(生成後はNightBackdropが季節で差し替え)
export const HOME_BG_SEASONS = ['bg_sato_haru.png', 'bg_sato_natsu.png', 'bg_sato_aki.png', 'bg_sato_fuyu.png']
