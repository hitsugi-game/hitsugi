import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicRoot = join(root, 'public')
const bomPath = join(root, 'docs', 'qa', 'public-asset-bom.json')
const recoveryManifestPath = join(root, 'assets_src', 'visual_recovery', 'asset-manifest.json')
const WRITE = process.argv.includes('--write')
const CHECK_DIST = process.argv.includes('--dist')

const slash = (value) => value.split(sep).join('/')

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = join(directory, entry.name)
      return entry.isDirectory() ? walk(absolute) : [absolute]
    })
    .sort((a, b) => a.localeCompare(b, 'en'))
}

function sha256(absolutePath) {
  return createHash('sha256').update(readFileSync(absolutePath)).digest('hex')
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf8'))
}

const existing = loadJson(bomPath, { assets: [] })
const existingByPath = new Map(existing.assets.map((asset) => [asset.path, asset]))
const recovery = loadJson(recoveryManifestPath, [])
const recoveryByPath = new Map(
  recovery
    .filter((entry) => entry.runtimePath)
    .map((entry) => [entry.runtimePath.replace(/^public\//, ''), entry]),
)

function defaultSourceCategory(path) {
  if (path.startsWith('img/visual-recovery/')) return 'visual-recovery-manifest'
  if (path === 'favicon.svg' || path === 'icons.svg') return 'repository-authored-vector'
  if (path === 'ogp.jpg') return 'repository-authored-promo'
  if (path.startsWith('img/')) return 'legacy-runtime-asset'
  return 'uncategorized-runtime-asset'
}

function makeAsset(absolutePath) {
  const path = slash(relative(publicRoot, absolutePath))
  const known = recoveryByPath.get(path)
  const previous = existingByPath.get(path)
  const cleared = known?.rightsStatus === 'cleared' && known?.reviewStatus === 'accepted'
  return {
    path,
    sha256: sha256(absolutePath),
    bytes: statSync(absolutePath).size,
    sourceCategory: known ? 'visual-recovery-manifest' : (previous?.sourceCategory ?? defaultSourceCategory(path)),
    sourcePath: known?.source ?? previous?.sourcePath ?? null,
    generator: known?.generator ?? previous?.generator ?? null,
    modelLicense: known?.modelLicenseChain ?? previous?.modelLicense ?? null,
    ownerApproval: cleared ? known.reviewer : (previous?.ownerApproval ?? null),
    rightsStatus: known?.rightsStatus ?? previous?.rightsStatus ?? 'pending',
    replacement: cleared ? 'not-required' : (previous?.replacement ?? 'review-required'),
  }
}

const assets = walk(publicRoot).map(makeAsset)
const rights = assets.reduce((counts, asset) => {
  counts[asset.rightsStatus] = (counts[asset.rightsStatus] ?? 0) + 1
  return counts
}, {})
const bom = {
  schemaVersion: 1,
  runtimeRoot: 'public/',
  policy: {
    failOn: ['unregistered-path', 'missing-path', 'sha256-mismatch', 'byte-size-mismatch', 'restricted-runtime-asset'],
    allowWithVisibleHold: ['pending-rights'],
    note: 'pending is not clearance. It remains an external rights gate and must not be bulk-promoted.',
  },
  summary: {
    assetCount: assets.length,
    bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
    rights,
  },
  assets,
}

function validateShape(candidate) {
  const errors = []
  const paths = new Set()
  for (const [index, asset] of candidate.assets.entries()) {
    const at = `assets[${index}]`
    if (paths.has(asset.path)) errors.push(`${at}: duplicate path ${asset.path}`)
    paths.add(asset.path)
    if (!/^[a-f0-9]{64}$/.test(asset.sha256 ?? '')) errors.push(`${at}: invalid sha256`)
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes < 0) errors.push(`${at}: invalid bytes`)
    if (!['pending', 'cleared', 'restricted'].includes(asset.rightsStatus)) errors.push(`${at}: invalid rightsStatus`)
    if (asset.rightsStatus === 'restricted') errors.push(`${at}: restricted runtime asset ${asset.path}`)
    if (asset.rightsStatus === 'cleared' && (!asset.ownerApproval || !asset.modelLicense)) {
      errors.push(`${at}: cleared asset lacks ownerApproval/modelLicense`)
    }
  }
  return errors
}

if (WRITE) {
  const errors = validateShape(bom)
  if (errors.length) throw new Error(errors.join('\n'))
  writeFileSync(bomPath, `${JSON.stringify(bom, null, 2)}\n`)
  console.log(`public asset BOM written: ${assets.length} files, ${bom.summary.bytes} bytes`)
  console.log(`rights: ${JSON.stringify(rights)}`)
  process.exit(0)
}

if (!existsSync(bomPath)) {
  console.error('public asset BOM is missing; run npm run update:asset-bom')
  process.exit(1)
}

const errors = validateShape(existing)
const actualByPath = new Map(assets.map((asset) => [asset.path, asset]))
const recordedByPath = new Map(existing.assets.map((asset) => [asset.path, asset]))
for (const actual of assets) {
  const recorded = recordedByPath.get(actual.path)
  if (!recorded) {
    errors.push(`unregistered-path: ${actual.path}`)
    continue
  }
  if (actual.sha256 !== recorded.sha256) errors.push(`sha256-mismatch: ${actual.path}`)
  if (actual.bytes !== recorded.bytes) errors.push(`byte-size-mismatch: ${actual.path}`)
}
for (const recorded of existing.assets) {
  if (!actualByPath.has(recorded.path)) errors.push(`missing-path: ${recorded.path}`)
}
if (CHECK_DIST) {
  const distRoot = join(root, 'dist')
  if (!existsSync(join(distRoot, 'index.html'))) errors.push('dist/index.html is missing; run npm run build first')
  for (const recorded of existing.assets) {
    const deployedCopy = join(distRoot, recorded.path)
    if (!existsSync(deployedCopy)) {
      errors.push(`dist-missing-path: ${recorded.path}`)
      continue
    }
    if (sha256(deployedCopy) !== recorded.sha256) errors.push(`dist-sha256-mismatch: ${recorded.path}`)
    if (statSync(deployedCopy).size !== recorded.bytes) errors.push(`dist-byte-size-mismatch: ${recorded.path}`)
  }
}
if (existing.summary?.assetCount !== existing.assets.length) errors.push('summary.assetCount mismatch')
if (existing.summary?.bytes !== existing.assets.reduce((sum, asset) => sum + asset.bytes, 0)) errors.push('summary.bytes mismatch')

if (errors.length) {
  console.error(`public asset BOM FAILED (${errors.length})`)
  for (const error of errors.slice(0, 50)) console.error(`- ${error}`)
  if (errors.length > 50) console.error(`- ... ${errors.length - 50} more`)
  process.exit(1)
}

const pending = existing.assets.filter((asset) => asset.rightsStatus === 'pending').length
console.log(`public asset BOM OK: ${existing.assets.length} registered, hash/size exact, restricted 0`)
if (CHECK_DIST) console.log(`dist asset copy OK: ${existing.assets.length}/${existing.assets.length} exact`)
console.log(`rights hold (non-clearance): pending ${pending}, cleared ${existing.assets.length - pending}`)
