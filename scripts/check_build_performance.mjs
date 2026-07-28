import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const budgetPath = join(root, 'docs', 'qa', 'performance-budget.json')
const reportPath = join(root, 'docs', 'qa', 'm60-build-performance.json')
const WRITE = process.argv.includes('--write-report')

if (!existsSync(dist)) throw new Error('dist/ is missing; run npm run build first')
const budget = JSON.parse(readFileSync(budgetPath, 'utf8'))
const slash = (value) => value.split(sep).join('/')

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

const html = readFileSync(join(dist, 'index.html'), 'utf8')
const entryMatch = html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/)
if (!entryMatch) throw new Error('module entry was not found in dist/index.html')
const entryPath = entryMatch[1].replace(/^\.\//, '')
const entryAbsolute = join(dist, entryPath)
const files = walk(dist)
const measured = files.map((absolute) => {
  const content = readFileSync(absolute)
  return {
    path: slash(relative(dist, absolute)),
    bytes: content.byteLength,
    gzipBytes: ['.js', '.css', '.html', '.json', '.svg'].includes(extname(absolute)) ? gzipSync(content).byteLength : null,
  }
}).sort((a, b) => a.path.localeCompare(b.path, 'en'))
const entry = measured.find((file) => file.path === entryPath)
if (!entry) throw new Error(`entry ${entryPath} does not exist`)
const preloadPaths = [...html.matchAll(/<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+)["']/g)]
  .map((match) => match[1].replace(/^\.\//, ''))
const initialJs = [...new Set([entryPath, ...preloadPaths])]
  .map((path) => measured.find((file) => file.path === path))
  .filter(Boolean)
const initialJsGzipBytes = initialJs.reduce((sum, file) => sum + (file.gzipBytes ?? 0), 0)
const initialCssPaths = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g)]
  .map((match) => match[1].replace(/^\.\//, ''))
const initialCss = [...new Set(initialCssPaths)]
  .map((path) => measured.find((file) => file.path === path))
  .filter(Boolean)
const initialCssGzipBytes = initialCss.reduce((sum, file) => sum + (file.gzipBytes ?? 0), 0)
const total = measured.reduce((sum, file) => sum + file.bytes, 0)
const report = {
  schemaVersion: 2,
  buildFingerprint: createHash('sha256').update(readFileSync(entryAbsolute)).digest('hex'),
  entry,
  initialTransfer: {
    js: initialJs,
    jsGzipBytes: initialJsGzipBytes,
    css: initialCss,
    cssGzipBytes: initialCssGzipBytes,
  },
  totals: {
    files: measured.length,
    bytes: total,
    jsBytes: measured.filter((file) => file.path.endsWith('.js')).reduce((sum, file) => sum + file.bytes, 0),
    jsGzipBytes: measured.filter((file) => file.path.endsWith('.js')).reduce((sum, file) => sum + (file.gzipBytes ?? 0), 0),
    cssBytes: measured.filter((file) => file.path.endsWith('.css')).reduce((sum, file) => sum + file.bytes, 0),
    cssGzipBytes: measured.filter((file) => file.path.endsWith('.css')).reduce((sum, file) => sum + (file.gzipBytes ?? 0), 0),
  },
  budget: budget.budgets,
  targetStatus: initialJsGzipBytes <= budget.budgets.initialEntryJsGzip.targetBytes ? 'met' : 'not-yet-met',
  files: measured.filter((file) => ['.js', '.css'].includes(extname(file.path))),
}

const failures = []
if (initialJsGzipBytes > budget.budgets.initialEntryJsGzip.hardCeilingBytes) {
  failures.push(`initial JS gzip ${initialJsGzipBytes} > hard ceiling ${budget.budgets.initialEntryJsGzip.hardCeilingBytes}`)
}
if (total > budget.budgets.totalDistBytes.hardCeilingBytes) {
  failures.push(`dist bytes ${total} > hard ceiling ${budget.budgets.totalDistBytes.hardCeilingBytes}`)
}
if (report.totals.cssGzipBytes > budget.budgets.totalCssGzip.hardCeilingBytes) {
  failures.push(`CSS gzip ${report.totals.cssGzipBytes} > hard ceiling ${budget.budgets.totalCssGzip.hardCeilingBytes}`)
}

if (WRITE) writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(`initial JS: ${initialJs.map((file) => file.path).join(', ')} / ${initialJsGzipBytes} gzip bytes`)
console.log(`initial CSS: ${initialCss.map((file) => file.path).join(', ')} / ${initialCssGzipBytes} gzip bytes`)
console.log(`dist: ${report.totals.files} files / ${total} bytes; target ${report.targetStatus}`)
if (failures.length) {
  for (const failure of failures) console.error(`PERFORMANCE REGRESSION: ${failure}`)
  process.exit(1)
}
console.log('performance budgets: OK (initial 250 KiB JS and 64 KiB total CSS targets enforced)')
