// 素材工場: ゲームデータ→JSON抽出エントリ(esbuildでバンドルしてgen_manifest.mjsが読む)
// 副作用のないdataモジュールのみをimportすること(store/pixi系は不可)
import { GODS } from '../../src/core/data/gods'
import { ENEMIES } from '../../src/core/data/enemies'
import { ITEM_BASES } from '../../src/core/data/items'
import { SKILLS } from '../../src/core/data/skills'
import { TOZA, TOMOSHIGATA, allTozaSkills } from '../../src/core/data/toza'
import { JOB_CLASSES, JOB_ROLE_LABELS, JOB_SCHOOL_LABELS, allJobSkills } from '../../src/core/data/jobs'
import { EXTRA_EVENTS } from '../../src/core/data/events'
import { EXTRA_EVENTS_2 } from '../../src/core/data/events2'
import { EXTRA_EVENTS_3 } from '../../src/core/data/events3'
import { EXTRA_EVENTS_4 } from '../../src/core/data/events4'
import { REGIONS } from '../../src/core/data/regions'
import { CHAPTERS, ENDINGS } from '../../src/core/data/story'
import { BOONS } from '../../src/core/data/boons'
import { PERSONALITIES } from '../../src/core/data/personalities'
import { VILLAGERS } from '../../src/core/data/villagers'
import { ELEMENT_LABELS } from '../../src/core/types'

export const DUMP = {
  gods: GODS.map((g) => ({
    id: g.id, name: g.name, kana: g.kana, rank: g.rank, element: g.element,
    desc: g.desc, personality: g.personality, portrait: g.portrait,
  })),
  enemies: ENEMIES.map((e) => ({
    id: e.id, name: e.name, element: e.element, tier: e.tier, sprite: e.sprite, desc: e.desc,
  })),
  items: ITEM_BASES.map((it) => ({
    baseId: it.baseId, name: it.name, slot: it.slot, shopTier: it.shopTier,
  })),
  skills: [
    ...SKILLS.map((s) => ({ id: s.id, name: s.name, desc: s.desc ?? '', element: (s as { element?: string }).element ?? '' })),
    ...allTozaSkills().map((s) => ({ id: s.id, name: s.name, desc: s.desc ?? '', element: (s as { element?: string }).element ?? '' })),
    ...allJobSkills().map((s) => ({ id: s.id, name: s.name, desc: s.desc ?? '', element: (s as { element?: string }).element ?? '' })),
  ],
  toza: TOZA.map((t) => ({ gata: t.gata, vein: t.vein, label: t.label, title: t.title })),
  tomoshigata: TOMOSHIGATA.map((t) => ({ id: t.id, label: t.label, kana: t.kana, desc: t.desc })),
  jobs: JOB_CLASSES.map((j) => ({
    id: j.id, name: j.name, role: j.role, school: j.school,
    roleLabel: JOB_ROLE_LABELS[j.role], schoolLabel: JOB_SCHOOL_LABELS[j.school],
    desc: (j as { desc?: string }).desc ?? '',
  })),
  events: [...EXTRA_EVENTS, ...EXTRA_EVENTS_2, ...EXTRA_EVENTS_3, ...EXTRA_EVENTS_4].map((e) => ({
    id: e.id, text: e.text,
  })),
  regions: REGIONS.map((r) => ({
    id: r.id, name: r.name, tier: (r as { tier?: number }).tier ?? 0, bg: r.bg,
    desc: (r as { desc?: string }).desc ?? '', bossId: (r as { bossId?: string }).bossId ?? '',
  })),
  chapters: CHAPTERS.map((c) => ({ id: c.id, title: c.title })),
  endings: Object.entries(ENDINGS).map(([k, v]) => ({ id: k, title: v.title, beats: v.beats })),
  boons: BOONS.map((b) => ({ id: b.id, name: b.name, desc: b.desc })),
  personalities: PERSONALITIES.map((p) => ({ id: p.id, name: p.name, desc: (p as { desc?: string }).desc ?? '' })),
  villagers: VILLAGERS.map((v) => ({ id: v.id, name: v.name, role: v.role, names: v.names })),
  elementLabels: ELEMENT_LABELS as Record<string, string>,
}
