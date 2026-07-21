# 全景品質default-OFF公開 Ship Check

実施日: 2026-07-21 JST

最終判定: **SHIP-with-notes / blocking 0**

## 公開対象

- 実装commit: `08dde9a2e9bb504e4e302dd78bd66fc76d8dc265`
- CI修正・公開HEAD: `91d54ca78f554a866c3b0ef09adbed3cfb557eea`
- 公開URL: https://hitsugi-game.github.io/hitsugi/
- 成功run: https://github.com/hitsugi-game/hitsugi/actions/runs/29802506479
- `regionVisualV2`: production既定OFF。今回の配信はV2のproduction cohort有効化、`scene-ready`、`released`昇格ではない。
- 対象外: ローカル`tmp/`、外部8名評価、物理低性能端末試験、AR2開始。

## Gate結果

| Gate | 結果 | 証拠 |
|---|---|---|
| lint | PASS | Actions `npm run lint` |
| data | PASS-with-note | errors 0 / rank分布warn 1 |
| unit | PASS | 33 files / 677 tests、Linux Actionsでも成功 |
| build | PASS-with-note | production build成功、main chunk 1,409.06kB warning |
| visual closure | PASS | 22 routes / 40 regions / 6 overlays / 68 entries |
| visual manifest | PASS | 7 entries / 7 unique IDs、全点`cleared / accepted` |
| security | PASS | secrets 0、危険API・新規外部通信0、dependency vulnerability 0、画像metadata 0 |
| scope | PASS | `tmp/`、`dist/`、`node_modules/`をcommit対象外 |
| file size | PASS | GitHub単一ファイル上限超過0 |
| independent review | PASS-with-notes | rights blocking閉鎖後、default-OFF配信blocking 0 |

## CI自己修復

初回run `29802309755`はVitestで停止し、deploy jobは未実行。closure ledgerのtext hashがWindows CRLF bytesへ依存していたため、Linux LF checkoutで129件のhash不一致になった。

対策としてvalidatorとpromotion scriptをtext artifactのLF正規化後SHA-256へ統一し、CRLF fixtureの回帰testを追加。ローカル677 testsとLinux Actionsの全test、build、Pages deployが成功した。

## 公開後検証

- HTML: HTTP 200
- 公開bundle: `./assets/index-HjaRAptd.js`
- ローカルbuild bundle: `./assets/index-HjaRAptd.js`
- bundle取得: HTTP 200 / 1,409,069 bytes
- 生成素材 `great-lantern-hvr1-v1.webp`: HTTP 200 / 29,812 bytes
- 結論: 公開HTMLと検証したローカルproduction buildのprovenance一致

## Non-blocking notes

- 外部8名blind評価、4-way macro-biome比較、物理低性能端末30/24/55fps、Forge mobile文字倍率200%は未完。V2有効化、AR1 Phase Exit、AR2開始のgateとして維持する。
- main chunk warningは公開後の低性能実機計測とcode split候補として残す。
- rollbackは問題commitの`git revert`をmainへpushし、同じworkflowと公開bundle照合を再実行する。履歴破壊を伴うreset/force pushは使わない。
