# デプロイ・運用ガイド

## 公開先と権限境界

- 公開URL: https://hitsugi-game.github.io/hitsugi/
- リポジトリ: https://github.com/hitsugi-game/hitsugi
- workflow: `.github/workflows/deploy.yml`
- **`main`へのpushまたは`main`上の手動実行だけが本番公開を行う。** PRは検証とPages候補artifact作成までで、公開しない。
- Organization ruleset、必須review、Environment reviewerの設定はGitHub管理者の外部gateである。ローカル実装やworkflow変更を、その設定済み証拠として扱わない。

## Release candidateの検証

PR、`main` push、手動実行は、同じ`verify` jobで次を順番に通す。

1. Node 22 + `npm@11.12.1` + lockfileによる`npm ci`
2. `npm audit --audit-level=high`
3. lint / ゲームデータ / visual closure / visual recovery manifest
4. 公開素材BOMの全path・SHA-256・byte size照合とrestricted 0
5. Vitest
6. TypeScript + Vite production build
7. BOM登録済み2,825点と`dist/`内コピーのSHA-256・byte size照合
8. 初期entry、CSS、dist総量の段階的な性能上限
9. Chromium 1280×720、Firefox 1280×720、WebKit/iPhone 13でTitle、Home、Pact、Dungeon、Battle、破損save、Storage拒否の代表smoke

失敗時のPlaywright trace/screenshotは7日保持artifactへ出す。検証済み`dist/`はPages artifactへ梱包するが、PRからはdeployしない。

ローカルで同じ主要gateを再現する例:

```powershell
npm ci
npm audit --audit-level=high
npm run lint
node scripts/validate_data.mjs
npm run check:visual-closure
npm run check:visual-manifest
npm run check:asset-bom
npm test
npm run build
npm run check:asset-bom:dist
npm run check:performance
npx playwright install chromium firefox webkit
npm run test:release-smoke
```

## 本番デプロイと公開後smoke

`verify`成功後、`main`だけがGitHub Pagesへdeployされる。deploy jobは公開URLからHTML、entry JS、CSS、entryが参照するdeferred JS、7桁commit markerを再取得する。どれかがHTTP 2xxでない、またはcommit markerが一致しない場合、workflowは公開成功扱いにしない。

手動再検証:

```powershell
npm run verify:deploy -- https://hitsugi-game.github.io/hitsugi/ <expected-commit-sha>
```

## ステージングの現在地

PRごとに本番と同じ検証とダウンロード可能なPages候補artifactは得られる。一方、第三者がブラウザで直接開ける共有preview URLはまだない。GitHub Pagesの本番Environmentは`github-pages`だけである。

共有previewを追加する場合は、本番URLと保存領域を分離した別Pages projectまたはCloudflare Pages等を用意し、URL・権限・保持期間を管理者が承認してから接続する。PR artifactを共有staging URLの代わりと誤記しない。

## 公開素材BOMと権利gate

- 正本: `docs/qa/public-asset-bom.json`
- 更新: `npm run update:asset-bom`
- 検証: `npm run check:asset-bom`
- CI blocker: 未登録、欠落、SHA-256不一致、byte size不一致、`restricted`のruntime配置
- 外部hold: `pending`。pendingは公開・商用利用の権利確認済みを意味しない。

現在のBOMは配信対象を一件ずつ登録する。既存のvisual recovery manifestで`accepted + cleared`の9点だけ来歴を継承し、それ以外を一括clearedへ昇格しない。生成元、generator/model license、owner approvalが判明した行だけ個別に更新する。

## 性能予算

`docs/qa/performance-budget.json`は、初期transfer JS 250KiB gzip以下と全CSS 64KiB gzip以下をrelease blockerにする。配信素材を含む`dist/`総量は初期転送量ではないため、現行baselineからの回帰上限だけをblockする。物理端末のLCP/INP/CLS、FPS、1% low、memory、10分jankは別の外部実測gateである。

## Supply chain

- Nodeは22、リポジトリのengineは`>=22 <25`、package managerは`npm@11.12.1`を正本とする。
- GitHub公式Actionsはmajor tag文字列ではなく、確認したcommit SHAへ固定する。
- DependabotはnpmとGitHub Actionsを週次確認する。更新PRも通常のrelease candidate gateを全て通す。

## 解析とプライバシー

第三者アクセス解析は既定で送信しない。アカウント、送信先、収集項目、privacy表示、同意・拒否方針が明示承認されるまでanalytics scriptを追加しない。ゲームの内部検証用指標は外部送信せず、端末内またはテストartifactで扱う。
