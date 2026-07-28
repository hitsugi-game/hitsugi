// データ整合の機械検証(GDD_v3 §5) — 読み取り専用のトリップワイヤ
// 使い方: node scripts/validate_data.mjs [--strict-dist]
//   --strict-dist: M9拡張後の星神180柱の確定分布(68/51/43/18)と一致しないとエラー
// 検査: id重複 / gods→skills参照 / regions→enemies参照 / 位階分布の報告
// 注意: TSをテキスト解析する簡易検査。型と実行時の厳密性は tsc とゲーム本体が担う。

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'src', 'core', 'data')

const read = (p) => readFileSync(p, 'utf8')
const dataFile = (name) => join(DATA, name)

// gods は将来位階別分割(gods_low/mid/high/apex.ts)になる — 存在するものを全て読む
function godsSources() {
  const names = readdirSync(DATA).filter((f) => /^gods.*\.ts$/.test(f))
  return names.map((f) => ({ name: f, text: read(dataFile(f)) }))
}

const extractAll = (text, re) => [...text.matchAll(re)].map((m) => m[1])

let errors = 0
let warns = 0
const err = (msg) => { errors++; console.error(`  ERROR: ${msg}`) }
const warn = (msg) => { warns++; console.warn(`  warn : ${msg}`) }

function checkDuplicates(label, ids) {
  const seen = new Set()
  for (const id of ids) {
    if (seen.has(id)) err(`${label}: id重複 '${id}'`)
    seen.add(id)
  }
  return seen
}

// ---- 収集 ----
const godsTexts = godsSources()
const godIds = godsTexts.flatMap((s) => extractAll(s.text, /^\s*id: '([^']+)'/gm))
const godRanks = godsTexts.flatMap((s) => extractAll(s.text, /rank: (\d)/g)).map(Number)
const godSkillRefs = godsTexts.flatMap((s) => extractAll(s.text, /skillId: '([^']+)'/g))

const enemiesText = read(dataFile('enemies.ts'))
const enemyIds = extractAll(enemiesText, /\{ id: '([^']+)'/g)

const skillsText = read(dataFile('skills.ts'))
const tozaText = read(dataFile('toza.ts'))
const jobsPath = dataFile('jobs.ts')
const jobsText = existsSync(jobsPath) ? read(jobsPath) : ''
// 技idの供給源: skills.ts(直書き) + toza.ts/jobs.ts(mk()ビルダー第1引数)
const skillIds = new Set([
  ...extractAll(skillsText, /\bid: '([^']+)'/g),
  ...extractAll(tozaText, /mk\(\s*'([^']+)'/g),
  ...extractAll(jobsText, /mk\(\s*'([^']+)'/g),
  ...extractAll(jobsText, /\bid: '([^']+)'/g),
])

const itemsText = read(dataFile('items.ts'))
const itemIds = extractAll(itemsText, /baseId: '([^']+)'/g)

const regionsText = read(dataFile('regions.ts'))
const regionIds = extractAll(regionsText, /id: '([^']+)'/g)
const regionBossRefs = extractAll(regionsText, /bossId: '([^']+)'/g)

const expText = read(join(ROOT, 'src', 'core', 'expedition.ts'))
const eventIds = extractAll(expText, /\bid: '([^']+)'/g)

// ---- 検査 ----
console.log('== validate_data ==')

console.log(`gods: ${godIds.length}柱`)
checkDuplicates('gods', godIds)
for (const ref of godSkillRefs) {
  if (!skillIds.has(ref)) err(`gods: skillId '${ref}' が skills/toza/jobs に見つからない`)
}

console.log(`enemies: ${enemyIds.length}種`)
checkDuplicates('enemies', enemyIds)

console.log(`items: ${itemIds.length}種`)
checkDuplicates('items', itemIds)

console.log(`regions: ${regionIds.length}地域`)
checkDuplicates('regions', regionIds)
for (const ref of regionBossRefs) {
  if (!enemyIds.includes(ref)) err(`regions: bossId '${ref}' が enemies に見つからない`)
}

console.log(`events(expedition): ${eventIds.length}件(≒事件+その他id)`)
console.log(`skills(全供給源): ${skillIds.size}本`)

// ---- 位階分布(GDD_v3 §8.43: M9拡張後の180柱を現行正典として固定) ----
const dist = [1, 2, 3, 4].map((r) => godRanks.filter((x) => x === r).length)
const TARGET = [68, 51, 43, 18]
console.log(`god rank分布: 下${dist[0]}/中${dist[1]}/上${dist[2]}/極${dist[3]} (現行確定 ${TARGET.join('/')})`)
const strict = process.argv.includes('--strict-dist')
if (strict) {
  TARGET.forEach((t, i) => {
    if (dist[i] !== t) err(`rank${i + 1}の柱数 ${dist[i]} ≠ 目標 ${t}`)
  })
} else if (dist.some((d, i) => d !== TARGET[i])) {
  warn('位階分布が現行正典と異なる(データ追加または削除を確認)')
}

// ---- 結果 ----
if (errors > 0) {
  console.error(`\nNG: ${errors} error(s), ${warns} warn(s)`)
  process.exit(1)
}
console.log(`\nOK: 0 errors, ${warns} warn(s)`)
