import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DREAM_EPISODES } from '../src/core/data/dreams'
import { DREAM_VISUAL_FALLBACK, dreamImg } from '../src/ui/img'

const EXPECTED = [
  ['yume_tabibito', 'STORY-DREAM-02', 'cg_dream_02.jpg', 'dream-02-traveler.jpg', '1363219AD7B066CDCB791DD348A9F7339C54F1B7FCFFF66077833BD8B6CA6D74'],
  ['yume_sora_no_ko', 'STORY-DREAM-03', 'cg_dream_03.jpg', 'dream-03-star-child.jpg', '9E879EB77618229A8185EEF9C53A7A1892799021A400535733B43F5B899791A3'],
  ['yume_futari', 'STORY-DREAM-04', 'cg_dream_04.jpg', 'dream-04-duet.jpg', 'A0BB54622EE66B96F10C63CADA476B8B0A7053F07E5848CC91481DEEC2CB0526'],
  ['yume_ue', 'STORY-DREAM-05', 'cg_dream_05.jpg', 'dream-05-hunger.jpg', 'D3611FC8D20B8F16446B8411E4B83427B2E3B915258CE327EC2BABCB55BF8131'],
  ['yume_taiyou', 'STORY-DREAM-06', 'cg_dream_06.jpg', 'dream-06-sunfall.jpg', 'BDCDCF2F914F69A9915CB16266C9A8524AC0845B304637643D692737E5D1BA23'],
  ['yume_maki', 'STORY-DREAM-07', 'cg_dream_07.jpg', 'dream-07-fire-vow.jpg', 'DC5A2857E5641E38FCD8EBBA213C8FA67875AE9F7C2C7FFFFA97E5ACD1571FB1'],
  ['yume_itadaki', 'STORY-DREAM-08', 'cg_dream_08.jpg', 'dream-08-invitation.jpg', 'FB62DD527E100B9043A8D8D19B8634FF7B98E7DE67C6864B0024C6E9CAAC017F'],
] as const

function jpegDimensions(bytes: Buffer): { width: number; height: number } {
  let offset = 2
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = bytes[offset + 1]
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) }
    }
    const segmentLength = bytes.readUInt16BE(offset + 2)
    offset += 2 + segmentLength
  }
  throw new Error('JPEGの寸法markerが見つかりません')
}

describe('M34 N1 夢渡りの固有CG契約', () => {
  it('7篇へ重複しないvisual ID・背景・60〜90字の情景説明を持つ', () => {
    expect(DREAM_EPISODES).toHaveLength(EXPECTED.length)

    EXPECTED.forEach(([id, visualId, bg], index) => {
      const episode = DREAM_EPISODES[index]
      expect(episode.id).toBe(id)
      expect(episode.visualId).toBe(visualId)
      expect(episode.bg).toBe(bg)
      expect(episode.visualDescription?.length).toBeGreaterThanOrEqual(60)
      expect(episode.visualDescription?.length).toBeLessThanOrEqual(90)
    })

    expect(new Set(DREAM_EPISODES.map((episode) => episode.visualId)).size).toBe(7)
    expect(new Set(DREAM_EPISODES.map((episode) => episode.bg)).size).toBe(7)
  })

  it('採用JPEGは正典ファイルと同一で、16:9の全景を保つ', () => {
    for (const [, , publicName, canonicalName, expectedHash] of EXPECTED) {
      const publicBytes = readFileSync(resolve('public/img', publicName))
      const canonicalBytes = readFileSync(resolve('docs/visuals/story-v2', canonicalName))
      const publicHash = createHash('sha256').update(publicBytes).digest('hex').toUpperCase()
      const canonicalHash = createHash('sha256').update(canonicalBytes).digest('hex').toUpperCase()
      expect(publicBytes.byteLength).toBe(canonicalBytes.byteLength)
      expect(publicHash).toBe(canonicalHash)
      expect(publicHash).toBe(expectedHash)

      expect(jpegDimensions(publicBytes)).toEqual({ width: 1672, height: 941 })
    }
  })

  it('背景指定がない旧データは初回夢CGへ退避する', () => {
    expect(DREAM_VISUAL_FALLBACK).toBe('cg_kiro.jpg')
    expect(dreamImg()).toMatch(/\/img\/cg_kiro\.jpg$/)
  })

  it('夢渡り・肆は玄冬の姿が時間経過による成長だと本文でも示す', () => {
    const duet = DREAM_EPISODES.find((episode) => episode.id === 'yume_futari')
    expect(duet?.beats.some((beat) => beat.includes('一夜で姿を変えたのではなく') && beat.includes('少しずつ成長'))).toBe(true)
  })
})
