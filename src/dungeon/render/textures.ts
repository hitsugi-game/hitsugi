// テクスチャ生成基盤(品質刷新v3.1 M7a)
// - 放射光/ビネットはcanvas由来 → コンテキスト消失に強く、モジュールキャッシュ可
// - プロップ等のGPU生成テクスチャは per-engine の TextureRegistry で寿命管理
//   (フロアごとにエンジンを作り直す設計のため、destroy() で必ず解放する)
import { Graphics, Texture } from 'pixi.js'
import type { Renderer } from 'pixi.js'

let lightTex: Texture | null = null
let vignetteTex: Texture | null = null

// 放射状の光の減衰(白→透明)。erase穴あけ・加算グローの両方で使う。
export function lightTexture(): Texture {
  if (lightTex) return lightTex
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.92)')
  g.addColorStop(0.78, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  lightTex = Texture.from(canvas)
  return lightTex
}

// 画面四隅を落とすビネット(透明中心→黒縁)
export function vignetteTexture(): Texture {
  if (vignetteTex) return vignetteTex
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  // 全灯モードに合わせ端の翳りを弱める(透明域を広げ、最外周も 0.55→0.28)。額縁程度に留める。
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.45, size / 2, size / 2, size * 0.75)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.28)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  vignetteTex = Texture.from(canvas)
  return vignetteTex
}

// GPU生成テクスチャの台帳 — エンジン破棄時に必ず destroyAll()
export class TextureRegistry {
  private renderer: Renderer
  private cache = new Map<string, Texture>()

  constructor(renderer: Renderer) {
    this.renderer = renderer
  }

  // key単位でキャッシュ。draw()が一時Graphicsに描き、resolution2で焼く。
  make(key: string, draw: (g: Graphics) => void): Texture {
    const hit = this.cache.get(key)
    if (hit) return hit
    const g = new Graphics()
    draw(g)
    const tex = this.renderer.generateTexture({ target: g, resolution: 2, antialias: true })
    g.destroy()
    this.cache.set(key, tex)
    return tex
  }

  destroyAll(): void {
    for (const tex of this.cache.values()) tex.destroy(true)
    this.cache.clear()
  }

  get count(): number {
    return this.cache.size
  }
}
