# M40 Release Ship Check — 2026-07-21

## 判定

**SHIP-with-notes**。M40のコレクション、育成、全戦闘オート、煤墨意匠をmainへ公開できる。blocking defectは0。

## 対象

- 810装備の家祖15点＋53系譜×15段と疎bit発見記録
- 旧save/NG+移行、全取得・帰還経路の即時発見反映
- 家譜4入口、鍛冶54棚、PC master/detail、mobile Sheet
- 人物中心の鍛錬見立てと六能力の自由選択
- 全戦闘で使える堅実/温存/全力オート、初期OFF停止条件、戦果説明
- PC/mobileの煤墨・紙・真鍮・朱印UI

## 独立監査

Round 1は帰還lootの即時収集、legacy初遭遇の一度限り登録、疎bitの代表画像、PC戦闘コマンド見切れを阻害欠陥として検出した。全件を修正し、結果説明の`role=status`/停止導線とradioの矢印/Home/End操作も補完した。

Round 2は **PASS / blocking 0**。オートと手動は同じ`battleCommand`/`finishBattle`経路を使い、報酬・drop・発見を分岐させていない。

## 直接検証

| Gate | Result |
|---|---|
| Vitest | 38 files / 701 tests passed |
| oxlint | PASS |
| production build | PASS |
| data validation | 0 errors / existing rank warning 1 |
| visual closure | 22 routes / 40 regions / 6 overlays / 68 entries |
| visual manifest | 9/9 |
| M40 Playwright | PC 1280 + mobile 390 = 8/8 |
| focused battle regression | 21 passed / 1 intended mobile skip |
| `git diff --check` | PASS |
| `npm audit --omit=dev` | 0 vulnerabilities |
| secret scan | 0 hits |
| files over 100MB | 0 |

## Notes

- production main chunkは約1.42MB。既存の性能改善課題であり、M40の機能阻害や新規回帰ではない。
- 神位階分布は最終目標超過の既存warn 1件。data errorは0。
- `tmp/`とテスト実行で更新されたM38/VC3 baseline PNGは公開payloadから除外する。

## Rollback

公開後に重大回帰が確認された場合は、M40実装commitを通常の`git revert <commit>`で打ち消してmainへpushする。saveはoptionalな`collectionV2`と`trainingMarks`を採用し、旧saveの読み込みを維持する。

## Deployment evidence

- Implementation commit: `2e86a9d2cbebb5c6f94c4b90e86293eed044d2d8`
- GitHub Actions: `29840283003` — build/deploy success
- Public URL: `https://hitsugi-game.github.io/hitsugi/` — HTTP 200
- Public bundles: `assets/index-B_V4tnw1.js`, `assets/index-mEc4m8Cz.css` — HTTP 200 and local build names match
- Runtime markers in public JS: `宝具系譜録`, `ここで止める`
