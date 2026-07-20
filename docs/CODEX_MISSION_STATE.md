# Codex Mission State — M34 物語・画像統合実装

最終更新: 2026-07-20 JST

## ①契約

- Definition of Done: `docs/NARRATIVE_VISUAL_INTEGRATION_PLAN.md`のN0〜N4を実装し、夢順序・scene queue・汐里名開示/migration・固有CG7点・主要旅程の残響・家族史Finale・A11y/性能をunit/visual/build/実画面で合格させる。
- Scope外: `CODEX_MASTERPLAN_DRAFT.md`の物語lane以外のUI Phase、既存7夢の全面改稿、全180神/全270事件/全40地域への長文本編追加、commit、push、公開。
- 制約: `docs/GDD_v3.md`を正典とし、開始時dirtyのdocs/visualsと未追跡`tmp/`を保持する。既存save v1/v3/v4と内部ending ID `cut/save/inherit`を壊さない。
- 権限境界: ローカルのコード、テスト、配信画像copy、文書更新まで。commit/push/公開、既存dirtyの破棄はユーザー承認が必要。
- エスカレーション: セーブ互換または三結末互換を維持できない、もしくは正典変更が必要な場合だけ停止して相談する。
- 監査クラス: independent audit。ゲーム進行、セーブ、Finale、主要画面へまたがる重要変更のため。
- 主観項目の受入: 360/390/768/1280pxの主要scene、物語を読む/読まない旅程、画像焦点、家族史Finaleを実画面/DOM証拠と独立評価で判定する。

## ②作業分解

| 項目 | 依存 | 実行経路 | 受入確認 | 状態 |
|---|---|---|---|---|
| M0 契約・baseline | なし | 指揮側 | git境界、変更前lint/test/build | 完了 |
| N0 順序・queue・開示・migration | M0 | store/data/scene + unit | 境界fixture、reload、legacy/post-M34 save | 完了 |
| N1 夢CG7点 | N0 | assets/data/scene/CSS + visual | 7固有画像、fallback、16:9 contain、A11y | 完了 |
| N2 主要旅程の残響 | N0 | Home/出立/Dungeon/Battle/Return/Village | 主要6系統以上、強制scene増加0 | 完了 |
| N3 家譜/Finale | N0 | store/Forge/FamilyTree/Finale + unit | 固有名/形見/地域、3branch因果・同格 | 完了 |
| N4 統合検証 | N0-N3 | lint/test/build/Playwright/実画面 | 全gate緑、性能/A11y/skip旅程 | 完了 |
| M5 正典同期・独立監査 | N4 | docs + 新規監査agent | 契約全項✅、blocking 0 | 完了 |

## ③完了済み

- M34計画pack自体は`docs/CODEX_FORGE_STATE.md`でRound 4 PASS（5/5/5/4/4、blocking 0）。実装は本missionで行う。
- 開始HEAD `478be96241124aa5c530acac2b768c8e1d9a7824`、branch `main`。開始時にruntime sourceのdirtyは0。
- 変更前baseline: `npm run lint`成功、`npm test` 19 files / 565 tests成功、`npm run build`成功。既知の非blocking警告は500kB超chunkのみ。
- N0実装: `NarrativeProgress`へactive/deferred/completedを永続化し、強制sceneを優先度最大1件へ制限。初回夢→連作の厳密順、ch4最終頁/skipだけの実名開示、gsp12 gate、旧save sentinel migration、途中reload回収、Home「灯の余白」を追加。
- N0直接検証: focused Vitest 4 files / 56 tests成功、全体Vitestは追加前時点で20 files / 589 tests成功、production build成功。
- N1実装: 夢2〜8へ固有CG7点、60〜90字alt、16:9 contain、欠損fallback、次篇1枚だけのidle preloadを接続。夢3の左端疑似文字は限定編集で除去し、配信/正典JPEGを1672×941・SHA-256一致へ更新。
- N2実装: Home「今月の物語」「灯の余白」、出立の問い、Dungeon入場、主の願い、勝利鎮魂、帰還三痕、郷の実NPC会話を接続。追加の操作停止sceneは0。
- N3実装: 一代の問い、形見の最初の持ち主/戦果/辞世、家系図、Finaleの実save由来最大3件・非誘導resonance・同格三択・結末固有1文を接続。
- N4実装: scene開封/完読/skip/後回し/時間、未読最大数、月送り/中断を外部送信なしでsaveへ匿名集計。旧saveは0初期値で移行する。
- 最終直接検証: Vitest 23 files / 616 tests、lint、production build、diff-check成功。M34直接Playwrightは全5幅40/40、最終補完の影響範囲15/15。全20 visual specはPC 1280px/390px代表幅で91合格・1意図的skip。
- 全230 visual testの一括実行は実行上限内に終わらなかったため、M34必須3specを全5幅、全20specを代表2幅へ分割して完走した。

## ④保留リスト

- なし。push/公開は契約外として実施しない。

## ⑤質問キュー

- 非緊急: 実装完了後にcommit/pushするかは、最終結果を提示してから確認する。

## ⑥マイルストーン履歴

- M0完了: 契約、正典、開始dirty境界を固定。変更前lint/test/buildは全て成功。
- N0完了: queue時既読化を廃止し、完読/skip transaction、legacy/post-M34 save、夢の飛越し防止をunitで固定。
- N1完了: 固有CG7点をruntimeへ採用し、全5幅の全景/操作非交差/fallback/preloadをPlaywrightで固定。
- N2完了: Homeから郷まで短文の問い/願い/鎮魂/三痕を接続し、代表幅の既存操作回帰を通過。
- N3完了: 家族史をFinale前後へ返し、三択の同順・同class・全enabledを全5幅で固定。
- N4完了: 匿名集計、A11y/keyboard、画像負荷、既存画面回帰をunit/Playwright/buildで確認。
- M5完了: fresh独立監査の初回PASS-with-notes後、再読/7日通知を補完。再監査で日常lifeによるarchive圧迫を1件検出し、章・夢限定＋初期6件/残件展開へ限定修正。最終PASS、blocking 0。

## ⑦次の一手

ユーザーがcommit/pushを明示するまで、検証済みのローカル状態を保持する。pushは公開デプロイなので自動実施しない。

## ⑧最終監査表

監査種別: independent audit（実装完了後に実施）

| 契約項目 | 判定 | 証拠 |
|---|---|---|
| N0 順序/queue/開示/migration | ✅ | focused 4 files / 56 tests、全体589 tests、build成功。E2EはN4で再確認 |
| N1 固有CG/mobile/fallback | ✅ | JPEG 7点/hash一致、M34 Playwright全5幅35件の一部で全景/fallback/1枚preload合格 |
| N2 主要旅程の残響 | ✅ | `narrative_journey_m34.test.ts`、代表幅全visual spec回帰91合格・1意図的skip |
| N3 家族史/三結末 | ✅ | unit branch契約、Finale Playwright全5幅で同格三択/固有名/scroll到達合格 |
| N4 A11y/性能/回帰 | ✅ | Vitest 616、lint/build/diff-check、M34全5幅40＋最終影響範囲15、全spec代表2幅91+1skip |
| 独立監査 | ✅ | fresh agent最終PASS。再読archiveの限定修正後、focused 55/55、mobile-360 E2E、diff-checkを独立再確認。blocking 0 |

## ⑨terminal印

完了
