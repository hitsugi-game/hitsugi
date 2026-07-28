const baseUrl = new URL(process.argv[2] ?? process.env.DEPLOY_URL ?? 'https://hitsugi-game.github.io/hitsugi/')
const expectedCommit = process.argv[3] ?? process.env.EXPECTED_COMMIT ?? ''

async function fetchText(url) {
  const response = await fetch(url, { redirect: 'follow', cache: 'no-store' })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return { text: await response.text(), contentType: response.headers.get('content-type') ?? '' }
}

async function verifyOnce(attempt) {
  const htmlUrl = new URL(baseUrl)
  htmlUrl.searchParams.set('release-smoke', `${expectedCommit.slice(0, 7) || 'baseline'}-${attempt}`)
  const htmlResult = await fetchText(htmlUrl)
  if (!htmlResult.contentType.includes('text/html')) throw new Error('deployment root is not HTML')
  const assetRefs = [...htmlResult.text.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map((match) => match[1])
  if (!assetRefs.length) throw new Error('deployment HTML exposes no entry JS/CSS')

  const checked = new Set()
  const queuedScripts = []
  let entryText = ''
  for (const ref of assetRefs) {
    const url = new URL(ref, baseUrl)
    const result = await fetchText(url)
    checked.add(url.href)
    if (url.pathname.endsWith('.js')) {
      entryText += result.text
      queuedScripts.push({ url, text: result.text })
    }
  }

  // Vite's entry lazily imports GameRuntime, which in turn imports screen
  // chunks. Traverse the complete reachable JS/CSS graph instead of stopping
  // after only the entry's first-level references.
  for (let index = 0; index < queuedScripts.length; index += 1) {
    const parent = queuedScripts[index]
    const refs = [...parent.text.matchAll(/["'](\.\/[^"'?#]+\.(?:js|css))["']/g)].map((match) => match[1])
    for (const ref of refs) {
      const url = new URL(ref, parent.url)
      if (checked.has(url.href)) continue
      const result = await fetchText(url)
      checked.add(url.href)
      if (url.pathname.endsWith('.js')) queuedScripts.push({ url, text: result.text })
    }
  }

  if (expectedCommit && !entryText.includes(expectedCommit.slice(0, 7))) {
    throw new Error(`expected commit marker ${expectedCommit.slice(0, 7)} was not found in deployed entry`)
  }
  return checked.size
}

let checkedCount = 0
let lastError
for (let attempt = 1; attempt <= 6; attempt += 1) {
  try {
    checkedCount = await verifyOnce(attempt)
    lastError = undefined
    break
  } catch (error) {
    lastError = error
    if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, 5_000))
  }
}
if (lastError) throw lastError

console.log(`deployment smoke OK: ${baseUrl.href}`)
console.log(`HTML + ${checkedCount} JS/CSS/deferred resources returned 2xx${expectedCommit ? `; commit ${expectedCommit.slice(0, 7)}` : ''}`)
