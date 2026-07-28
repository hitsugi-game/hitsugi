# M60 release pipeline implementation evidence — 2026-07-28

## Implemented locally

| Area | Evidence | Local status |
|---|---|---|
| PR-safe verification | `.github/workflows/deploy.yml` has `pull_request`, `push main`, and manual triggers; only non-PR `refs/heads/main` can run deploy | implemented |
| Release gates | audit high, lint, data, closure, recovery manifest, full public BOM, Vitest, build, performance ceiling, Chromium/Firefox/WebKit smoke | implemented |
| Browser smoke | `playwright.release.config.ts`, `tests/release/core-routes.spec.ts` | Chromium/Firefox desktop + WebKit mobile gate; five-viewport visual suite remains separate |
| Public verification | `scripts/verify_deployment.mjs` fetches HTML, JS, CSS, deferred JS and expected commit marker | implemented; live execution follows deploy |
| Asset coverage | `docs/qa/public-asset-bom.json`, `scripts/public_asset_bom.mjs` | 2,825/2,825 registered; hash/size exact at generation |
| Rights | visual recovery manifest entries inherit their actual status; all other runtime files remain pending | no bulk clearance |
| Performance | `docs/qa/performance-budget.json`, `scripts/check_build_performance.mjs` | 250 KiB target is visible; conservative regression ceiling blocks growth |
| Supply chain | Node/npm engines, exact official Action SHAs, weekly Dependabot | implemented |

## Direct verification on 2026-07-28

| Check | Result |
|---|---|
| `npm audit --audit-level=high` | PASS, vulnerabilities 0 |
| `npm run lint` | PASS |
| `node scripts/validate_data.mjs` | PASS, errors 0 / warnings 0; rank distribution 68/51/43/18 synchronized |
| `npm run check:visual-closure` | PASS, 23 routes / 40 regions / 6 overlays / 69 entries |
| `npm run check:asset-bom` | PASS, 2,825 registered, hash/size exact, restricted 0 |
| `npm run check:asset-bom:dist` | PASS, 2,825/2,825 built copies hash/size exact |
| `npm run check:visual-manifest` | PASS, 9 unique entries |
| `npm test` | PASS, 59 files / 826 tests |
| `npm run build` | PASS, 890 modules transformed |
| `npm run report:performance` | PASS target-enforced ceilings; initial transfer JS 234,024 bytes / 74,281 gzip bytes and initial CSS 97,376 bytes / 21,115 gzip bytes; 250 KiB JS target met |
| Targeted visual closure | PASS: exploration 5, live music label 1, star tab order 2, target selection 2, intent 3, family 12, heirloom 6 |
| `npm run test:release-smoke` | PASS, production build on Chromium/Firefox desktop + WebKit mobile 15/15 |
| `node scripts/verify_deployment.mjs https://hitsugi-game.github.io/hitsugi/ afc42e688a9c98799b382dbd3ea4416917bf1637` | PASS against the currently deployed baseline, HTML plus 17 JS/CSS/deferred resources HTTP 2xx and commit marker `afc42e6` matched |

The release smoke uses the production build and covers Title → Home → Pact, damaged main/BAK, verified BAK restore, failed lazy chunk root recovery, and storage-denied non-saving play through Home. The deployment row above remains the previous public baseline until the M60 commit is pushed; it will be replaced with the deployed M60 SHA and Actions run after publication.

Fresh independent audit after source freeze: **P0 0 / P1 0 / blocking 0 / SHIP-with-notes**. The only non-blocking note is additional splitting of deferred chunks over 500 kB; initial-transfer budgets already pass.

## Exact Action tag resolution

Resolved directly with `git ls-remote` on 2026-07-28. The workflow records the human-readable major tag in a comment while executing the exact commit.

| Official repository | Tag | Commit |
|---|---|---|
| `actions/checkout` | v4 | `11d5960a326750d5838078e36cf38b85af677262` |
| `actions/setup-node` | v4 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `actions/upload-pages-artifact` | v3 | `56afc609e74202658d3ffba0e8f6dda462b719fa` |
| `actions/deploy-pages` | v4 | `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` |
| `actions/upload-artifact` | v4 | `ea165f8d65b6e75b540449e92b4886f43607fa02` |

## Deliberate external holds

- Organization ruleset, required reviews, direct-push policy, and Environment reviewer were not changed. An Organization administrator must configure and verify these.
- A browser-openable shared preview URL was not provisioned. PRs produce a verified downloadable Pages artifact, not a staging URL.
- 2,816 legacy public files remain `rightsStatus: pending`; the validator must not convert inventory coverage into license clearance.
- Physical low-end PC/mobile telemetry and 3G LCP/INP/CLS remain external evidence requirements.
- No external analytics request is emitted until the project owner approves a configured destination and privacy policy.
