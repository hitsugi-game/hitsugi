# CODEX MISSION STATE — M40 collection / growth / auto / design

## ①契約

- Definition of done: M40の実装可能部分を本番へ届け、全戦闘オートを後退させず、53系譜コレクション、人物中心の鍛錬、オート方針と戦果説明、煤墨の継承工房意匠をPC/mobileで成立させる。test、lint、build、実画面、独立監査、shipcheck、main push、公開確認を完了する。
- Out of scope: 新規AI画像量産、課金・日次依存、実在16名の外部調査、M40 Phase 7の市場判断自体。
- Constraints: 既存save互換、手動/オートの報酬・drop・発見・称号・血珠・経験同一、GDD_v3正典、`tmp/`保護、既存dirty文書の損失禁止。
- Permission boundary: ユーザーの明示依頼により今回のcommit、main push、GitHub Pages公開は承認済み。課金、外部投稿、破壊的変更は未承認。
- Audit class: independent audit。公開デプロイとsave migrationを含むため。
- Subjective acceptance: PC/390pxの実画面で、一画面一主役、一覧の抑制、選択詳細の明瞭さ、直接操作、focus復帰、AI寄せ集め感の低減を目視する。

## ②作業分解

| Item | Dependency | Execution path | Acceptance check | Status |
|---|---|---|---|---|
| A. 現行/save/UI監査 | repo正典・code | main agent + read-only explorers | 変更点、移行境界、testが特定済み | completed |
| B. 53系譜コレクション | A | types/store/Chronicle/Codex/UI | 810点の重複欠落0、bitset冪等、PC/mobile操作 | completed |
| C. 鍛錬の見立て | A | Forge UI/helpers/tests | 人物・戦型・節目・継承、推薦最大3、全6能力 | completed |
| D. 全戦闘オート強化 | A | settings/store/Battle/tests | 全戦闘常時、3方針、任意停止、報酬差0、戦果最大4行 | completed |
| E. 煤墨意匠統合 | B-D | scoped CSS/components | 一画面一主役、PC/390、keyboard/reduced-motion | completed |
| F. 統合検証・監査 | B-E | test/lint/build/Playwright/independent review | blocking 0、SHIP以上 | completed |
| G. 公開 | F | selective commit/push/Actions/public HTTP | Actions success、公開HTML/bundle HTTP 200 | completed |

## ③完了済み

- 2026-07-21 22:xx +09:00: Mission契約、公開権限、独立監査区分を固定。Goalと作業planを開始。
- 既存M36 terminal stateを`docs/CODEX_MISSION_STATE_M36_ARCHIVE_20260721.md`へ履歴保全。
- 810点を家祖15点＋53系譜×15段として正規manifest化し、`collectionV2`の疎bitset、旧save移行、NG+継承、入手時発見を実装。
- 家譜に土地・魔性・星神・宝具の4入口、鍛冶に54棚の宝具録を追加。PCはmaster/detail、mobileは2列棚＋Sheet、前後移動・Escape・focus復帰を実装。
- 鍛錬を人物、戦型、次の節目、次代への影響、理由付き推薦3件へ再編集し、全6能力の自由選択と不足時の詳細閲覧を維持。
- 全戦闘オートへ堅実・温存・全力の3方針、既定OFFの任意停止4条件、勝利後最大4行の方針・使用手・一族の支え・新発見報告を追加。報酬計算経路は分岐させない。
- `煤墨の継承工房`CSSで一覧を抑制し、選択詳細だけを色の主役にした。新規画像生成0。
- ローカルgate: Vitest 38 files / 701 tests、oxlint、production build、data validation 0 errors / 既存warn 1、visual closure 68/68、manifest 9/9。重点Playwright PC/mobile 21 passed / 1 intended skip、M40 PC/mobile 8/8 passed。
- 独立監査Round 1で帰還時収集反映、legacy初遭遇、疎bit代表画像、戦闘コマンド見切れを検出し全件修正。結果説明のlive通知/停止導線とradioキーボード操作も補完した。Round 2はPASS、blocking 0。

## ④保留リスト

- 外部16名評価は実装・公開後の市場検証であり、今回のコード完了を阻害しない。

## ⑤質問キュー

- なし。既存正典と計画の範囲で進行する。

## ⑥マイルストーン履歴

- M40-0: 稼働開始。main/origin一致`74d4fb9`、既存M40文書dirtyと未追跡`tmp/`を保護対象として確認。
- M40-1: collection/save/training/auto/UI/CSS実装と自己修復を完了。実画面証拠を`tests/visual/.shots/m40-*`へ取得。
- M40-2: ローカル機械gateとPC 1280/mobile 390の操作・目視gateを通過。独立監査とShip Checkへ移行。
- M40-3: 独立監査Round 2 PASS / blocking 0。Ship CheckはSHIP-with-notes。既知noteはmain chunk 1.42MBと既存神位階分布warn 1件のみ。
- M40-4: 実装commit `2e86a9d`をmainへpush。Actions run `29840283003`のbuild/deployが成功し、公開HTML、JS、CSSはHTTP 200。公開bundle名はローカルbuildと一致し、新機能文字列も配信bundle内で確認。

## ⑦次の一手

- Mission完了。次工程は公開後の実利用観察と、M40計画Phase 0-3の初回30分改善。

## ⑧最終監査表

- independent audit Round 2 PASS / blocking 0。Ship CheckはSHIP-with-notes。機械gateは全て合格、依存脆弱性・秘密情報・100MB超ファイルは0。既知noteはmain chunk 1.42MBと既存神位階分布warn 1件。

## ⑨terminal印

完了 — 2026-07-21T23:43:00+09:00。実装`2e86a9d` / Actions `29840283003` / 公開確認済み。
