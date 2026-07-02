import type { GameData, Character } from '../core/types'
import { seasonLabel } from '../core/types'
import { godById } from '../core/data/gods'

// 家譜を1枚の画像(1200x630)に描いて保存する — 「うちの一族を見てくれ」の共有装置
export async function downloadChronicleCard(data: GameData): Promise<void> {
  const W = 1200
  const H = 630
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  await document.fonts.ready

  // 夜空の背景
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0b0f1e')
  bg.addColorStop(0.6, '#101830')
  bg.addColorStop(1, '#160f24')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 星
  for (let i = 0; i < 90; i++) {
    const x = (i * 137.5) % W
    const y = ((i * 89.3) % (H * 0.55))
    const r = (i % 3) * 0.5 + 0.4
    ctx.fillStyle = `rgba(233, 222, 190, ${0.25 + (i % 5) * 0.12})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // 大燈籠の灯(下部の暖色グロー)
  const glow = ctx.createRadialGradient(W / 2, H + 80, 40, W / 2, H + 80, 420)
  glow.addColorStop(0, 'rgba(232, 163, 61, 0.5)')
  glow.addColorStop(1, 'rgba(232, 163, 61, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // 罫線
  ctx.strokeStyle = 'rgba(201, 168, 106, 0.7)'
  ctx.lineWidth = 2
  ctx.strokeRect(26, 26, W - 52, H - 52)
  ctx.strokeStyle = 'rgba(201, 168, 106, 0.3)'
  ctx.strokeRect(34, 34, W - 68, H - 68)

  const mincho = (size: number, weight = 700) => `${weight} ${size}px "Shippori Mincho", serif`

  // タイトル
  ctx.fillStyle = '#e8a33d'
  ctx.font = mincho(30)
  ctx.fillText('灯継ぎ -HITSUGI-', 64, 92)
  ctx.fillStyle = '#efe6d4'
  ctx.font = mincho(52, 800)
  ctx.fillText('燈守家の家譜', 64, 160)

  // 統計
  const gens = Math.max(...data.family.map((c) => c.gen))
  const fallen = data.family.filter((c) => !c.alive)
  const years = Math.floor(data.seasonIndex / 4) + 1
  ctx.fillStyle = '#c9a86a'
  ctx.font = mincho(24, 600)
  ctx.fillText(
    `${seasonLabel(data.seasonIndex)} ／ 紡いだ世代 ${gens}代 ／ 逝った者 ${fallen.length}人 ／ 歳月 ${years}年 ／ 武功 ${data.fame}`,
    64, 210,
  )

  // 逝きし者(最近3人)の辞世
  const recent = [...fallen].slice(-3).reverse()
  let y = 280
  for (const c of recent) {
    drawObituary(ctx, c, 64, y, mincho)
    y += 100
  }
  if (recent.length === 0) {
    ctx.fillStyle = '#9a917f'
    ctx.font = mincho(26, 600)
    ctx.fillText('まだ誰も欠けていない。……それがどれほど稀有なことか。', 64, 320)
  }

  // フッター
  ctx.fillStyle = '#9a917f'
  ctx.font = mincho(20, 500)
  ctx.fillText('八季の命を、継いでゆけ。 #灯継ぎ', 64, H - 64)

  // ダウンロード
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hitsugi_kafu_${gens}gen.png`
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

function drawObituary(
  ctx: CanvasRenderingContext2D,
  c: Character,
  x: number,
  y: number,
  mincho: (size: number, weight?: number) => string,
): void {
  const god = godById(c.godParentId)
  ctx.fillStyle = '#efe6d4'
  ctx.font = mincho(28)
  ctx.fillText(`${c.name}`, x, y)
  ctx.fillStyle = '#9a917f'
  ctx.font = mincho(19, 500)
  ctx.fillText(`第${c.gen}代 ・ ${god.name}の子 ・ ${c.deathCause ?? ''} ・ 討った魔性${c.kills}`, x + 130, y - 2)
  if (c.epitaph) {
    ctx.fillStyle = '#e8a33d'
    ctx.font = mincho(23, 600)
    ctx.fillText(`「${truncate(c.epitaph, 40)}」`, x + 16, y + 38)
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// 家系図を和風額装の一枚絵に描いて保存する(v3.1 M15-7)。世代ごとの段組+親・神の記載
export async function downloadFamilyTreeCard(data: GameData): Promise<void> {
  const gens = new Map<number, Character[]>()
  for (const c of data.family) {
    gens.set(c.gen, [...(gens.get(c.gen) ?? []), c])
  }
  const genKeys = [...gens.keys()].sort((a, b) => a - b)
  const rowH = 120
  const W = 1200
  const H = Math.max(630, 170 + genKeys.length * rowH)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  await document.fonts.ready

  // 夜色の地+古紙の中央
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0b0f1e')
  bg.addColorStop(1, '#160f24')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(38, 30, 18, 0.55)'
  ctx.fillRect(36, 36, W - 72, H - 72)

  // 額装(金の二重罫+四隅飾り)
  ctx.strokeStyle = '#c9a86a'
  ctx.lineWidth = 3
  ctx.strokeRect(24, 24, W - 48, H - 48)
  ctx.lineWidth = 1
  ctx.strokeRect(34, 34, W - 68, H - 68)
  for (const [cx, cy] of [[24, 24], [W - 24, 24], [24, H - 24], [W - 24, H - 24]] as const) {
    ctx.beginPath()
    ctx.arc(cx, cy, 9, 0, Math.PI * 2)
    ctx.strokeStyle = '#e8a33d'
    ctx.stroke()
  }

  // 題字
  ctx.fillStyle = '#efe6d4'
  ctx.font = '700 40px "Shippori Mincho", serif'
  ctx.textAlign = 'center'
  ctx.fillText('燈守家 家系図', W / 2, 92)
  ctx.font = '16px "Shippori Mincho", serif'
  ctx.fillStyle = '#9a917f'
  ctx.fillText(`${seasonLabel(data.seasonIndex)} — 第${Math.max(...genKeys)}代まで`, W / 2, 120)

  // 世代の段
  let y = 165
  for (const gen of genKeys) {
    const members = gens.get(gen)!
    ctx.textAlign = 'left'
    ctx.fillStyle = '#c9a86a'
    ctx.font = '700 18px "Shippori Mincho", serif'
    ctx.fillText(`第${gen}代`, 60, y + 20)
    let x = 150
    for (const c of members.slice(0, 5)) {
      const boxW = 195
      ctx.fillStyle = c.alive ? 'rgba(16, 23, 46, 0.9)' : 'rgba(10, 10, 14, 0.9)'
      ctx.fillRect(x, y, boxW, rowH - 26)
      ctx.strokeStyle = c.alive ? '#c9a86a' : 'rgba(154, 145, 127, 0.5)'
      ctx.lineWidth = 1.4
      ctx.strokeRect(x, y, boxW, rowH - 26)
      ctx.fillStyle = c.alive ? '#efe6d4' : '#9a917f'
      ctx.font = '700 21px "Shippori Mincho", serif'
      ctx.fillText(truncate(c.name, 6), x + 12, y + 30)
      ctx.font = '12px "Shippori Mincho", serif'
      ctx.fillStyle = '#9b7fc2'
      ctx.fillText(`星神 ${truncate(godById(c.godParentId).name, 8)}`, x + 12, y + 52)
      ctx.fillStyle = '#9a917f'
      const parent = data.family.find((p) => p.id === c.humanParentId)
      if (parent) ctx.fillText(`親 ${truncate(parent.name, 7)}`, x + 12, y + 70)
      ctx.fillText(c.alive ? '存命' : `享年八季・討${c.kills}`, x + 12, y + 88)
      x += boxW + 14
    }
    if (members.length > 5) {
      ctx.fillStyle = '#9a917f'
      ctx.font = '14px "Shippori Mincho", serif'
      ctx.fillText(`ほか${members.length - 5}名`, x + 4, y + 40)
    }
    y += rowH
  }

  canvas.toBlob((blob) => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `hitsugi_kakeizu_gen${Math.max(...genKeys)}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  }, 'image/png')
}

// SNS用の共有文をクリップボードへ
export async function copyShareText(data: GameData): Promise<boolean> {
  const gens = Math.max(...data.family.map((c) => c.gen))
  const fallen = data.family.filter((c) => !c.alive)
  const last = fallen[fallen.length - 1]
  const lines = [
    `【灯継ぎ -HITSUGI-】うちの燈守家、${gens}代目。逝った者${fallen.length}人。`,
    last?.epitaph ? `${last.name}の辞世「${last.epitaph}」` : '',
    '#灯継ぎ #HITSUGI',
  ].filter(Boolean)
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    return true
  } catch {
    return false
  }
}
