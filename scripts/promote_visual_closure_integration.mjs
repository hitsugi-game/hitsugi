import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ledgerPath = path.join(root, 'docs', 'qa', 'visual-closure-ledger.json')
const TEXT_HASH_EXTENSIONS = new Set([
  '.css', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.ts', '.tsx', '.txt', '.yaml', '.yml',
])

const routeBundles = {
  title: ['src/ui/Title.tsx', 'src/ui/vc2_entry.css', 'tests/visual/title_vc2.spec.ts', 'A single book-cover title field, restrained crest, and one dominant lantern establish the first promise.'],
  intro: ['src/ui/Title.tsx', 'src/ui/vc2_entry.css', 'tests/visual/title_vc2.spec.ts', 'The prologue keeps the current beat dominant while the complete eleven-beat record remains reachable.'],
  home: ['src/ui/Home.tsx', 'src/ui/m17_home.css', 'tests/visual/ar0_home_pact.spec.ts', 'The family card and bloodline diagnosis form the monthly-life focal pair.'],
  village: ['src/ui/Village.tsx', 'src/ui/village.css', 'tests/visual/village.spec.ts', 'Five grounded facilities, nearby residents, and crisis variants turn the village into a readable place.'],
  pact: ['src/ui/Pact.tsx', 'src/ui/pact_m35.css', 'tests/visual/pact.spec.ts', 'The selected deity remains the sole visual hero; unreviewed MAX art cannot replace its identity.'],
  starLottery: ['src/ui/StarLottery.tsx', 'src/ui/star_lottery.css', 'tests/m43_star_lottery.test.ts', 'One revealed deity portrait and the permanently visible odds make each free star lot legible without monetized urgency.'],
  birth: ['src/ui/Scenes.tsx', 'src/ui/scenes_vc3b.css', 'tests/visual/scenes_vc3b.spec.ts', 'Birth is staged as a page in the family chronicle with character identity held in the foreground.'],
  ceremony: ['src/ui/Scenes.tsx', 'src/ui/scenes_vc3b.css', 'tests/visual/scenes_vc3b.spec.ts', 'The coming-of-age rite uses the chronicle frame and a single ceremonial decision.'],
  jobrite: ['src/ui/Scenes.tsx', 'src/ui/scenes_vc3b.css', 'tests/visual/scenes_vc3b.spec.ts', 'The vocation rite keeps the heir and the life-changing selection in one visual field.'],
  life: ['src/ui/Scenes.tsx', 'src/ui/scenes_vc3b.css', 'tests/visual/scenes_vc3b.spec.ts', 'Life events read as authored chronicle leaves rather than generic modal cards.'],
  death: ['src/ui/Scenes.tsx', 'src/ui/scenes_vc3b.css', 'tests/visual/scenes_vc3b.spec.ts', 'Death closes a life as an elegiac chronicle page with the inherited consequence visible.'],
  dream: ['src/ui/Scenes.tsx', 'src/ui/scenes_vc3b.css', 'tests/visual/dream_visuals.spec.ts', 'Dream scenes use their own liminal edge treatment and preserve Shiori narrative continuity.'],
  dreamEp: ['src/ui/Scenes.tsx', 'src/ui/scenes_vc3b.css', 'tests/visual/narrative_m34.spec.ts', 'Archived dream episodes keep the liminal visual grammar and replay affordance.'],
  depart: ['src/ui/Expedition.tsx', 'src/ui/depart_m18.css', 'tests/visual/vc3_work_surfaces.spec.ts', 'Destination art, route list, and up to four party candidates remain synchronized before confirmation.'],
  expedition: ['src/ui/Expedition.tsx', 'src/ui/expedition_vc3.css', 'tests/visual/vc3_work_surfaces.spec.ts', 'Region, current segment, branch, party, and return decision fit one expedition workspace.'],
  dungeon: ['src/ui/Dungeon.tsx', 'src/dungeon/render/region_experience_layer.ts', 'tests/visual/ar1_dungeon_battle.spec.ts', 'The walking field combines authored region materials, landmarks, route glyphs, and danger telegraphs.'],
  battle: ['src/ui/Battle.tsx', 'src/ui/battle_ar1.css', 'tests/visual/ar1_dungeon_battle.spec.ts', 'Shared contact mattes and one rare-or-boss hero clarify combatants, threat, action, and reward provenance.'],
  chronicle: ['src/ui/Chronicle.tsx', 'src/ui/chronicle_m18.css', 'tests/visual/vc6_records_overlays.spec.ts', 'The family record is presented as a bound book with selected life detail.'],
  codex: ['src/ui/Codex.tsx', 'src/ui/codex_m18.css', 'tests/visual/vc6_records_overlays.spec.ts', 'The rubbing-inspired codex makes collection, filter, selection, and mobile detail order explicit.'],
  forge: ['src/ui/Forge.tsx', 'src/ui/forge_vc3.css', 'tests/visual/vc3_work_surfaces.spec.ts', 'Person, three equipment slots, weakness, and three recommendations precede the full inventory.'],
  facilities: ['src/ui/Facilities.tsx', 'src/ui/facilities.css', 'tests/visual/vc6_records_overlays.spec.ts', 'One active construction plan keeps cost, effect, affordability, and confirmation together.'],
  finale: ['src/ui/Scenes.tsx', 'src/ui/scenes_vc3b.css', 'tests/visual/scenes_vc3b.spec.ts', 'The final divergence is staged as a deliberate fork with a second confirmation.'],
  ending: ['src/ui/Scenes.tsx', 'src/ui/scenes_vc3b.css', 'tests/visual/scenes_vc3b.spec.ts', 'The ending sequence exposes closure, inheritance, new cycle, and return without collapsing them into one button.'],
}

const overlayBundles = {
  'family-tree': ['src/ui/FamilyTree.tsx', 'src/ui/familytree_m18.css', 'tests/visual/vc6_records_overlays.spec.ts'],
  'storehouse-tab': ['src/ui/Forge.tsx', 'src/ui/forge_vc3.css', 'tests/visual/vc3_work_surfaces.spec.ts'],
  'settings-help': ['src/ui/Settings.tsx', 'src/ui/settings_vc6.css', ['tests/visual/vc6_records_overlays.spec.ts', 'tests/visual/m50_audio.spec.ts']],
  'save-import-export': ['src/ui/Settings.tsx', 'src/ui/settings_vc6.css', 'tests/visual/title_vc2.spec.ts'],
  'sheet-modal': ['src/ui/layout/dialogs.ts', 'src/ui/layout/dialogs.ts', 'tests/visual/vc6_records_overlays.spec.ts'],
  toast: ['src/App.tsx', 'src/index.css', 'tests/visual/vc6_records_overlays.spec.ts'],
}

function sha256(relativePath) {
  const absolutePath = path.join(root, relativePath)
  if (!fs.existsSync(absolutePath)) throw new Error(`closure file missing: ${relativePath}`)
  const content = fs.readFileSync(absolutePath)
  const hashable = TEXT_HASH_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())
    ? content.toString('utf8').replace(/\r\n?/g, '\n')
    : content
  return crypto.createHash('sha256').update(hashable).digest('hex')
}

function integrate(entry, sourcePath, runtimePath, evidence, owner) {
  const evidencePaths = Array.isArray(evidence) ? evidence : [evidence]
  entry.runtimeBundle = { path: runtimePath, sha256: sha256(runtimePath) }
  entry.provenance = {
    sourcePath,
    sourceSha256: sha256(sourcePath),
    runtimePath,
    runtimeSha256: sha256(runtimePath),
    rightsStatus: 'pending',
    reviewer: 'Codex local integration; human art direction and rights clearance remain external gates.',
  }
  entry.status = 'code-integrated'
  entry.owner = owner
  entry.evidence = [...new Set([sourcePath, runtimePath, ...evidencePaths])]
  entry.nAReason = null
  entry.verification = {
    rights: 'pending',
    humanReview: 'pending',
    independentReview: 'pending',
    stateCoverage: 'pending-per-state-capture',
    performance: 'headless-and-telemetry-only',
  }
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))
if (!ledger.entries.some((entry) => entry.kind === 'route' && entry.sceneId === 'starLottery')) {
  ledger.entries.push({
    kind: 'route',
    sceneId: 'starLottery',
    parentSurface: 'home',
    stateId: ['locked', 'available', 'confirm', 'new-card', 'duplicate', 'no-draw', 'reduced-motion'],
    viewport: ['1280x720', '390x844'],
    hero: 'pending integration',
    support: 'pending integration',
    groundContact: 'pending integration',
    depth: 'pending integration',
    people: 'pending integration',
    ui: 'pending integration',
    motionSound: 'pending integration',
    runtimeBundle: 'N/A',
    provenance: 'N/A',
    status: 'planned',
    owner: 'visual-recovery/starLottery',
    evidence: ['src/ui/StarLottery.tsx'],
    nAReason: 'Added before integration metadata is derived.',
  })
}
for (const entry of ledger.entries) {
  if (entry.kind === 'route') {
    const bundle = routeBundles[entry.sceneId]
    if (!bundle) throw new Error(`route bundle missing: ${entry.sceneId}`)
    const [sourcePath, runtimePath, evidence, hero] = bundle
    integrate(entry, sourcePath, runtimePath, evidence, `visual-recovery/${entry.sceneId}`)
    entry.hero = hero
    entry.support = 'Supporting frames use the shared indigo, soot, vermilion, warm-gold, and paper-material family without competing with the hero.'
    entry.groundContact = 'Characters, facilities, combatants, or document planes use explicit borders, feet, shadows, or contact mattes appropriate to this surface.'
    entry.depth = 'Background atmosphere, the decision-bearing middle layer, and a restrained foreground are separated without covering controls.'
    entry.people = 'When people are present, identity, direction, state, scale, and grounding are kept together; otherwise the authored object or document remains the scale anchor.'
    entry.ui = 'The primary next action is visually dominant, persistent information is grouped, 360-1600px layouts remain operable, and close/back targets meet the interaction contract.'
    entry.motionSound = 'Ambient motion stays subordinate to decisions, respects reduced motion, and uses the existing world/audio hooks without adding per-button sound.'
  } else if (entry.kind === 'region') {
    const sourcePath = 'src/core/data/region_experience.ts'
    const runtimePath = 'src/dungeon/render/region_experience_layer.ts'
    integrate(entry, sourcePath, runtimePath, 'tests/region_experience.test.ts', `visual-recovery/region/${entry.sceneId}`)
    entry.hero = `${entry.sceneId} has an authored region profile with a unique landmark, silhouette, danger shape, and navigation rule.`
    entry.support = 'The profile combines exactly two tactile ground materials with a macro-biome value family and bounded ambient population.'
    entry.groundContact = 'The code-native layer paints material marks beneath route glyphs, entrance landmark, gather points, player, and danger telegraphs.'
    entry.depth = 'Macro-biome floor, unique silhouette/landmark, route marks, actors, and restrained ambient particles form separate readable planes.'
    entry.people = 'The party marker remains above ground contact and below route-critical overlays; no decorative portrait or nameplate is added to the walking field.'
    entry.ui = 'Visited, selected, locked, rare, and boss meaning remains encoded by state and shape, not palette alone; navigation mechanics are unchanged.'
    entry.motionSound = 'Each profile declares bounded ambient motion plus a world-sound family; reduced-motion and no-safe-one-shot fallbacks avoid misleading UI audio.'
  } else if (entry.kind === 'overlay') {
    const bundle = overlayBundles[entry.sceneId]
    if (!bundle) throw new Error(`overlay bundle missing: ${entry.sceneId}`)
    const [sourcePath, runtimePath, evidence] = bundle
    integrate(entry, sourcePath, runtimePath, evidence, `visual-recovery/overlay/${entry.sceneId}`)
    if (entry.sceneId === 'toast') entry.stateId = ['open', 'close', 'auto-dismiss', 'manual-dismiss', 'empty', 'error']
    entry.hero = `${entry.sceneId} keeps one task, message, or decision as the overlay focal point.`
    entry.support = 'Supporting copy and secondary controls are grouped inside the same material frame without becoming another full page.'
    entry.groundContact = 'The overlay edge, shadow, and scrim or fixed toast stack separate it from the world while preserving context.'
    entry.depth = 'World context remains behind the interaction plane; focusable controls and alerts stay on the top readable layer.'
    entry.people = 'Portraits appear only when they are part of the task; decorative people are not inserted into utility overlays.'
    entry.ui = entry.sceneId === 'toast'
      ? 'Non-modal notices announce status, auto-dismiss, and expose a 44px manual close target without stealing focus.'
      : 'Open, close, outside click, Escape, focus return, empty, and error states follow the shared dialog or sheet contract.'
    entry.motionSound = 'Entry motion is restrained and removed under reduced-motion; global button sound remains centrally attached.'
  }
}

ledger.promotion = {
  date: '2026-07-22',
  target: 'code-integrated',
  note: 'Local source/runtime integration only. No row becomes scene-integrated until every required state, all five canonical viewports, and mechanical checks have repository evidence.',
}
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8')
console.log(`promoted ${ledger.entries.length} closure rows to honest code-integrated state`)
