// 素材工場: manifest.json 全量自動生成
// 使い方: node scripts/asset_factory/gen_manifest.mjs
// - extract_entry.ts をesbuildでバンドルしてゲームデータを読み、全カテゴリの
//   画像プロンプトをテンプレートで機械生成する(手書きプロンプト=既存manifestを優先継承)
// - public/img に生成済みのものは除外。file重複は除去。優先度順に整列。
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const ROOT = path.resolve(HERE, '..', '..')
const IMG = path.join(ROOT, 'public', 'img')
const ORIG = path.join(ROOT, 'assets_src', 'orig')
const MANIFEST = path.join(HERE, 'manifest.json')

// ---- 1. データ抽出(rolldownバンドル→import。rolldownはvite8同梱) ----
const bundle = path.join(HERE, '.extract_bundle.mjs')
execSync(
  `npx --no-install rolldown "${path.join(HERE, 'extract_entry.ts')}" --format esm --platform node --file "${bundle}"`,
  { cwd: ROOT, stdio: 'inherit' },
)
const { DUMP } = await import(pathToFileURL(bundle).href)

// ---- 2. 生成済み判定 ----
const haveJpg = new Set(fs.readdirSync(IMG).filter((f) => f.endsWith('.jpg')))
const haveOrig = new Set(fs.existsSync(ORIG) ? fs.readdirSync(ORIG) : [])
function alreadyGenerated(file) {
  return haveJpg.has(file.replace(/\.png$/, '.jpg')) || haveOrig.has(file)
}

// ---- 3. 既存manifest(手書きプロンプト)をfileキーで継承 ----
const old = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const curated = new Map() // file -> entry(最初の定義を採用=重複21件はここで消える)
for (const e of old) if (!curated.has(e.file)) curated.set(e.file, e)

// ---- 4. テンプレ生成 ----
const out = new Map() // file -> {entry, prio}
function add(prio, id, file, w, h, prompt) {
  if (out.has(file) || alreadyGenerated(file)) return
  const cur = curated.get(file)
  out.set(file, { prio, entry: cur ? { ...cur } : { id, file, w, h, prompt } })
}
const EN_ELEM = { fire: 'fire', water: 'water', wind: 'wind', earth: 'earth', moon: 'moon', star: 'star' }
const clean = (s, n = 140) => (s ?? '').replace(/\s+/g, ' ').slice(0, n)

// P0: 郷背景(既存キュー)
add(0, 'bg_sato', 'bg_sato.png', 1600, 900, 'wide night scene of a japanese mountain village under eternal night, giant amber paper lantern at center, thatched rooftops, starry indigo sky')

// P1: ボス27 / P2: 基礎敵120
const bosses = DUMP.enemies.filter((e) => e.id.startsWith('boss_'))
const baseEnemies = DUMP.enemies.filter((e) => !e.id.startsWith('boss_') && !e.id.endsWith('_w') && !e.id.endsWith('_o'))
for (const b of bosses) {
  add(1, b.id, b.sprite, 1024, 1024, `boss illustration: ${b.name} — japanese yokai lord, ${clean(b.desc)}, menacing presence, ${EN_ELEM[b.element]} aura`)
}
for (const e of baseEnemies) {
  add(2, e.id, e.sprite, 768, 768, `japanese yokai creature, centered, plain dark background: ${e.name} — ${clean(e.desc)}, ${EN_ELEM[e.element]} element`)
}

// P3: 星神立ち絵120
for (const g of DUMP.gods) {
  add(3, g.id, g.portrait, 768, 1024, `standing portrait of a japanese star deity: ${g.name}(${g.kana}) — ${clean(g.desc)}, ${clean(g.personality, 40)}, ${EN_ELEM[g.element]} motif`)
}

// P4: 地域個別背景27+主の間27(常夜百層の疑似地域は塔絵1枚に集約)
for (const r of DUMP.regions) {
  if (r.id === 'tokoyo_tou') {
    add(4, 'bg_r_tokoyo_tou', 'bg_r_tokoyo_tou.png', 1600, 900, 'wide view of an endless spiral tower interior under eternal night, one hundred floors of amber lanterns fading upward into darkness')
    continue
  }
  add(4, `bg_r_${r.id}`, `bg_r_${r.id}.png`, 1600, 900, `wide dungeon landscape, japanese eternal-night: ${r.name} — ${clean(r.desc, 120)}`)
  add(4, `bossbg_${r.id}`, `bossbg_${r.id}.png`, 1600, 900, `wide ominous boss lair, japanese eternal-night: the master's chamber of ${r.name}, looming dread, scattered amber embers`)
}

// P5: 物語CG13+儀式CG9+宿敵紋8
for (const c of DUMP.chapters) add(5, `cg_${c.id}`, `cg_${c.id}.png`, 1600, 900, `story chapter key visual, cinematic, no text: 「${c.title}」 — generational family saga under eternal night, mountain shrine village, colossal lantern`)
for (const e of DUMP.endings) {
  add(5, `cg_end_${e.id}_a`, `cg_end_${e.id}_a.png`, 1600, 900, `ending key visual, cinematic: 「${e.title}」 — ${clean(e.beats[0], 100)}`)
  add(5, `cg_end_${e.id}_b`, `cg_end_${e.id}_b.png`, 1600, 900, `ending epilogue visual, serene aftermath: 「${e.title}」 — ${clean(e.beats[e.beats.length - 1], 100)}`)
}
add(5, 'cg_kiro', 'cg_kiro.png', 1600, 900, 'pivotal choice scene: a lone warrior stands before a weary thousand-year musician woman with a biwa on a mountain summit, black moon above, first hint of dawn at the horizon')
add(5, 'cg_prologue', 'cg_prologue.png', 1600, 900, 'prologue visual: a dying village elder passes a small lantern flame to a young successor, family watching in silence, snow falling in eternal night')
const RITUALS = [
  ['cg2_birth', 'a newborn baby held up before a giant amber lantern, family in ceremonial dress, warm light on tiny hands'],
  ['cg2_seijin', 'coming-of-age rite: a youth kneels as flame is transferred to a hand-held lantern, elders chanting'],
  ['cg2_nariwai', 'trade-initiation rite: a youth receives the tools of a family craft on a folded cloth, workshop lit by lanterns'],
  ['cg2_pact', 'star-pact ceremony: a human bows under a torii gate as a constellation descends as threads of light'],
  ['cg2_departure', 'expedition departure: family members walk through a wooden village gate into the dark thicket, villagers seeing them off with lanterns'],
  ['cg2_succession', 'headship succession: an heir receives the family ledger and lantern from a dying head, generational portraits behind'],
  ['cg2_mitori', 'deathbed farewell: family gathered around a futon, one small lantern burning low, tears and soft smiles'],
  ['cg2_okuribi', 'funeral send-off: paper lanterns floating down a dark river, family silhouettes on the bank'],
  ['cg2_kanreki', 'quiet celebration: a rare long-lived family member surrounded by grandchildren under a persimmon tree at night'],
]
for (const [id, p] of RITUALS) add(5, id, `${id}.png`, 1600, 900, `family rite illustration, no text: ${p}`)
const NEMESIS = [
  ['chisusuri', '血啜り'], ['yoigari', '宵狩り'], ['honekami', '骨咬み'], ['hikurai', '灯喰らい'],
  ['kagematoi', '影纏い'], ['tsumenaga', '爪長'], ['kagitogi', '牙研ぎ'], ['yonaki', '夜哭き'],
]
for (const [ro, jp] of NEMESIS) add(5, `nem_${ro}`, `nem_${ro}.png`, 512, 512, `sinister crest emblem, japanese mon style, blood-red on black: nemesis epithet 「${jp}」, claw and fang motif`)

// P6: UIアイコン+加護+家業+灯座紋+季節/祭+場面絵
const UI_ICONS = [
  ['ic_hoto', 'glowing amber votive lantern flame, resource icon'],
  ['ic_ketsu', 'deep crimson blood-orb gem, resource icon'],
  ['ic_buko', 'gold war-merit medal with tassel, resource icon'],
  ['ic_expedition', 'crossed katana and walking lantern, action icon'],
  ['ic_pact', 'shooting star descending into an open palm, action icon'],
  ['ic_festival', 'festival fireworks over a lantern, action icon'],
  ['ic_rest', 'steaming hot spring with wooden pail, action icon'],
  ['ic_forge', 'blacksmith hammer striking sparks on anvil, action icon'],
  ['ic_chronicle', 'old unrolled family scroll with brush, nav icon'],
  ['ic_codex', 'stacked old books with pressed flower, nav icon'],
  ['ic_tree', 'stylized family tree with lantern fruits, nav icon'],
  ['ic_village', 'thatched village houses with warm windows, nav icon'],
  ['ic_motto', 'framed calligraphy tablet with family precept, nav icon'],
  ['ic_tower', 'tall pagoda tower fading into night sky, nav icon'],
  ['ic_help', 'folded paper guidebook with lantern bookmark, nav icon'],
  ['ic_sound_on', 'ringing bell with sound ripples, ui icon'],
  ['ic_sound_off', 'muted bell with a cross stroke, ui icon'],
  ['ic_birth', 'swaddled newborn with tiny flame above chest, event icon'],
  ['ic_boon', 'three-fold blessing card fan, event icon'],
  ['ic_nemesis', 'red-eyed beast shadow with scar, warning icon'],
  ['node_battle', 'crossed blades over small flame, map node icon'],
  ['node_elite', 'horned oni mask, map node icon'],
  ['node_treasure', 'ornate wooden chest with amber glow, map node icon'],
  ['node_camp', 'small campfire with kettle, map node icon'],
  ['node_event', 'unrolled scroll with question glyph, map node icon'],
  ['node_boss', 'skull with lantern eyes, map node icon'],
  ['node_start', 'torii gate with hanging lantern, map node icon'],
  ['slot_weapon', 'single elegant katana on stand, slot icon'],
  ['slot_armor', 'folded dou armor on rack, slot icon'],
  ['slot_charm', 'small omamori amulet with cord, slot icon'],
]
for (const [id, p] of UI_ICONS) add(6, id, `${id}.png`, 512, 512, `game ui icon, centered, generous margin, plain dark background: ${p}`)
for (const b of DUMP.boons) add(6, `boon_${b.id}`, `boon_${b.id}.png`, 512, 512, `blessing card icon, amber flame frame, centered: ${b.name} — ${clean(b.desc, 80)}`)
for (const j of DUMP.jobs) add(6, `job_${j.id}`, `job_${j.id}.png`, 512, 512, `craft emblem icon of a japanese folk profession: ${j.name}(${j.roleLabel}・${j.schoolLabel}) — ${clean(j.desc, 80)}, tools of the trade, circular composition`)
for (const t of DUMP.toza) add(6, `emb_${t.gata}_${t.vein}`, `emb_${t.gata}_${t.vein}.png`, 512, 512, `circular family crest, japanese kamon style, single color on dark: 灯座「${t.label}」 epithet ${t.title}, ${EN_ELEM[t.vein]} motif`)
const SEASONS = [['haru', 'cherry petals drifting'], ['natsu', 'fireflies over rice paddies'], ['aki', 'red maple leaves and moon'], ['fuyu', 'snow on thatched roofs']]
for (const [s, p] of SEASONS) {
  add(6, `bg_sato_${s}`, `bg_sato_${s}.png`, 1600, 900, `wide night scene of a japanese mountain village, giant amber lantern at center, ${p}, eternal night sky`)
  add(6, `fes_${s}`, `fes_${s}.png`, 1600, 900, `village festival scene at night, ${p}, food stalls, paper lanterns, dancing villagers`)
}
const SCENES = [
  ['sc_forge', 'blacksmith workshop interior, glowing forge, hanging tools, sparks'],
  ['sc_shop', 'old general store interior, shelves of wares, shopkeeper lantern'],
  ['sc_shrine', 'small mountain shrine interior, offerings, sacred rope, candles'],
  ['sc_bath', 'open-air hot spring at night, steam, stone lanterns'],
  ['sc_gate', 'village wooden gate at night, watchman stool, single lantern'],
]
for (const [id, p] of SCENES) add(6, id, `${id}.png`, 1600, 900, `background scene, no people focus: ${p}, japanese eternal-night village`)

// P7: 顔64+幼老シート16+戦闘立ち姿24
const GATA_FLAVOR = { homura: 'fierce warrior bearing', iwao: 'sturdy guardian bearing', nagi: 'swift scout bearing', sumi: 'gentle healer bearing' }
for (const g of DUMP.tomoshigata) {
  for (const sex of ['m', 'f']) {
    const sexWord = sex === 'm' ? 'young man' : 'young woman'
    for (const p of DUMP.personalities) {
      add(7, `face_${g.id}_${sex}_${p.id}`, `face_${g.id}_${sex}_${p.id}.png`, 512, 512, `bust portrait, japanese ink-wash style, dark background: ${sexWord} of the lantern clan, ${GATA_FLAVOR[g.id]}, personality ${p.name} — ${clean(p.desc, 60)}`)
    }
    add(7, `sprite_walk_${g.id}_${sex}_child`, `sprite_walk_${g.id}_${sex}_child.png`, 768, 1024, `sprite sheet, 3 columns x 4 rows grid, a small CHILD (age ~8) as BLACK PAPERCUT SILHOUETTE with AMBER rim light, ${GATA_FLAVOR[g.id]}, walk cycle rows: down/up/left/right, flat dark background, clean grid cells`)
    add(7, `sprite_walk_${g.id}_${sex}_elder`, `sprite_walk_${g.id}_${sex}_elder.png`, 768, 1024, `sprite sheet, 3x4 grid, an ELDERLY ${sex === 'm' ? 'man' : 'woman'} slightly bent with a cane as BLACK PAPERCUT SILHOUETTE with AMBER rim light, ${GATA_FLAVOR[g.id]}, walk cycle rows: down/up/left/right, flat dark background`)
    for (const [stage, sw] of [['child', 'small child'], ['adult', 'adult'], ['elder', 'elderly']]) {
      add(7, `pose_${g.id}_${sex}_${stage}`, `pose_${g.id}_${sex}_${stage}.png`, 768, 1024, `full-body battle stance facing left, ${sw} ${sex === 'm' ? 'male' : 'female'} fighter, ${GATA_FLAVOR[g.id]}, BLACK PAPERCUT SILHOUETTE with AMBER rim light, flat dark background`)
    }
  }
}

// P8: 敵変異(若/老)240
for (const e of baseEnemies) {
  const stem = e.sprite.replace(/\.png$/, '')
  add(8, `${stem}_w`, `${stem}_w.png`, 768, 768, `japanese yokai creature, YOUNG immature variant, smaller slimmer silhouette, lighter tones: 若き${e.name} — ${clean(e.desc, 100)}`)
  add(8, `${stem}_o`, `${stem}_o.png`, 768, 768, `japanese yokai creature, ANCIENT elder variant, larger heavier, battle-scarred, ornate growths, dim glowing eyes: 老いたる${e.name} — ${clean(e.desc, 100)}`)
}

// P9: 装備540
const NOUN = {
  w_kodachi: 'kodachi short sword', w_katana: 'katana', w_hoshiyumi: 'ornate star bow', w_naginata: 'naginata', w_hoshikiri: 'legendary star-cutting blade',
  a_nunoko: 'padded cloth garment', a_kawado: 'leather cuirass', a_kusari: 'chainmail shirt', a_ooyoroi: 'great samurai armor', a_hoshigoromo: 'star-woven robe',
  c_omamori: 'omamori amulet', c_kanzashi: 'ornamental hairpin', c_obidome: 'sash clip', c_suzu: 'small bell', c_hoshinoo: 'star-cord talisman',
  sw_katana: 'katana', sw_yumi: 'japanese bow', sw_yari: 'yari spear', sw_tsuchi: 'war hammer', sw_kama: 'sickle', sw_kusarigama: 'chain-sickle', sw_jutte: 'jutte baton', sw_tantou: 'tanto dagger', sw_shakujo: 'monk ring-staff', sw_tessen: 'iron war fan', sw_fundou: 'weighted chain', sw_kunai: 'kunai blade',
  sa_doumaru: 'dou torso armor', sa_haori: 'haori jacket', sa_kote: 'armored gauntlets', sa_kabuto: 'kabuto helmet', sa_shitagi: 'under-robe', sa_suneate: 'shin guards', sa_men: 'face guard mask', sa_tate: 'wooden shield', sa_kataate: 'shoulder guard', sa_zukin: 'protective hood', sa_haidate: 'thigh guards', sa_jinbaori: 'battle surcoat',
  sc_omamori: 'omamori amulet', sc_kushi: 'ornamental comb', sc_obidome: 'sash clip', sc_netsuke: 'netsuke figurine', sc_kinchaku: 'drawstring pouch', sc_juzu: 'prayer beads', sc_udewa: 'bracelet', sc_nioibukuro: 'scent pouch', sc_sensyafuda: 'votive slip card', sc_mimikazari: 'earring', sc_yubiwa: 'ring',
}
const SLOT_FALLBACK = { weapon: 'traditional japanese weapon', armor: 'traditional japanese armor piece', charm: 'small japanese charm accessory' }
function tierFlavor(t) {
  if (t <= 4) return 'humble worn everyday craftsmanship'
  if (t <= 9) return 'finely crafted, subtle amber inlay'
  if (t <= 13) return 'masterwork, star-metal ornament, faint glow'
  return 'legendary family heirloom, radiant, ceremonial'
}
for (const it of DUMP.items) {
  const prefix = it.baseId.replace(/\d+$/, '')
  const noun = NOUN[prefix] ?? NOUN[it.baseId] ?? SLOT_FALLBACK[it.slot]
  add(9, `it_${it.baseId}`, `it_${it.baseId}.png`, 512, 512, `game item illustration, single ${noun}, centered, plain dark background: 「${it.name}」 — ${tierFlavor(it.shopTier)}`)
}

// P10: 技アイコン353+カットイン(灯座24+開祖神24+ボス27)
for (const s of DUMP.skills) {
  const el = EN_ELEM[s.element] ? `${EN_ELEM[s.element]} energy, ` : ''
  add(10, `sk_${s.id}`, `sk_${s.id}.png`, 512, 512, `game skill icon, ${el}dynamic brush-stroke symbol, centered on dark: ${s.name} — ${clean(s.desc, 80)}`)
}
for (const t of DUMP.toza) add(10, `cutin_toza_${t.gata}_${t.vein}`, `cutin_toza_${t.gata}_${t.vein}.png`, 1280, 512, `wide dramatic ultimate-art cut-in, speed lines: silhouetted warrior of 灯座「${t.label}」 unleashing 「${t.title}」, ${EN_ELEM[t.vein]} energy streaks`)
for (const g of DUMP.gods.slice(0, 24)) add(10, `cutin_god_${g.id}`, `cutin_god_${g.id}.png`, 1280, 512, `wide dramatic divine-blessing cut-in: ${g.name} manifesting, ${clean(g.desc, 90)}, radiant ${EN_ELEM[g.element]} light`)
for (const b of bosses) add(10, `cutin_${b.id}`, `cutin_${b.id}.png`, 1280, 512, `wide dramatic boss-entrance cut-in, dread and majesty: ${b.name} — ${clean(b.desc, 90)}`)

// P11: 夜藪の出来事175+日常20
for (const e of DUMP.events) add(11, `ev_${e.id}`, `ev_${e.id}.png`, 1024, 640, `story vignette illustration, no text, japanese eternal-night: ${clean(e.text, 130)}`)
const DAILY = [
  'family watching first snow from the veranda', 'children chasing fireflies by the river', 'moon-viewing sake on the porch, two cups',
  'burning fallen maple leaves, roasting sweet potatoes', 'family cooking around a sunken hearth', 'repairing the thatched roof together',
  'children stargazing on a hill, pointing at constellations', 'sewing by lantern light, mother and child', 'steam rising from a shared bath house',
  'pounding rice cakes with wooden mallets', 'flying a kite on a windy night hill', 'night fishing with a lantern boat',
  'combing a daughter’s long hair by the mirror', 'singing a lullaby to a baby by a small flame', 'family visit to the small shrine, ringing the bell',
  'watching rain from the doorway, sharing a straw cloak', 'quiet tea for two elders under a persimmon tree', 'a child practicing calligraphy, ink on the nose',
  'a father giving a shoulder ride under lantern rows', 'waving farewell at the village gate at dawn-less morning',
]
DAILY.forEach((p, i) => add(11, `life_daily_${String(i).padStart(2, '0')}`, `life_daily_${String(i).padStart(2, '0')}.png`, 1024, 640, `warm family-life vignette, japanese eternal-night village, no text: ${p}`))

// P12: 星神・縁MAX第二立ち絵120
for (const g of DUMP.gods) {
  add(12, `${g.id}_max`, g.portrait.replace(/\.png$/, '_max.png'), 768, 1024, `standing portrait, maximum-bond variant, warmer intimate expression, richer garments, amber embrace of light: ${g.name}(${g.kana}) — ${clean(g.desc, 100)}`)
}

// P13: 郷人16
for (const v of DUMP.villagers) {
  v.names.forEach((nm, band) => {
    add(13, `vil_${v.id}_${band}`, `vil_${v.id}_${band}.png`, 512, 512, `bust portrait, japanese village ${v.role}, age stage ${band + 1} of 4 (older each stage): ${nm}, warm lantern light, ink-wash style`)
  })
}

// ---- 5. 出力 ----
const entries = [...out.values()].sort((a, b) => a.prio - b.prio).map((x) => x.entry)
fs.copyFileSync(MANIFEST, path.join(HERE, 'manifest.backup.json'))
fs.writeFileSync(MANIFEST, JSON.stringify(entries, null, 2))
fs.rmSync(bundle, { force: true })

const byPrio = {}
for (const x of out.values()) byPrio[x.prio] = (byPrio[x.prio] ?? 0) + 1
console.log('=== manifest generated ===')
console.log('total entries (to generate):', entries.length)
console.log('by priority:', JSON.stringify(byPrio))
console.log('curated prompts inherited:', [...out.values()].filter((x) => curated.has(x.entry.file)).length)
console.log('already-generated skipped:', [...curated.keys()].filter((f) => alreadyGenerated(f)).length)
