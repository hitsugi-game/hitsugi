# MISSION M22: UI/UX検収ブラッシュアップ(POLISH_FIX 1〜5) — STATE

## ①契約
**ゴール**: `docs/POLISH_FIX_INSTRUCTIONS_CLAUDE.md`(M22)の実装順**1〜5**を完遂する。
**完了の定義**: M1隊編成グリッド / M2装備5軸+statBonus軸別比較 / M3神絵フォールバック / M4 modal-Sheet統一 / M5出立初期選択+予告+頭金 / M6統合(機械バッテリー+preview実測+独立レビュー+項目別コミット)。詳細な受入条件はWORKLOG 2026-07-11のM22項と各コミットメッセージに焼き込み済み。
**スコープ外**: 指示6(郷歩行マップ)・指示7本体(RegionVisualProfile/四幕/痕跡3段階)・push・ComfyUI新規画像生成・ゲームバランス変更・未追跡画像資産のコミット。
**エスカレーション**: push/セーブ非互換/契約変更 → ユーザー。
**監査区分**: 自己監査(根拠: 不可逆成果物なし・push対象外・全変更git可逆)+独立code-review2回(M2後・最終)。
**devil攻撃反映**: 神名焼き込み/品質・希少度は描画時導出/単一Sheetガード/Village除外/5-7分割明示+頭金/旧セーブ耐性テスト 他10件(初版STATE参照、要点はWORKLOGへ転記済み)。

## ②作業分解
M1〜M6(依存: M1→M5、M4はM1後、M2/M3独立)。全項目に受入チェック内蔵 — WORKLOG参照。

## ③完了済み(証跡=コミット)
- M1 `feat(ui): M22 P0-1 隊編成の専用グリッド`(+最終レビュー修正で実button化)
- M2 `feat(ui): M22 P0-2 装備の5軸分離` + `fix(ui): M2レビュー反映`(独立レビュー出荷可 C0/H0)
- M3 `feat(ui): M22 P0-3 神絵欠落フォールバック`(素材7枚の実在×参照突合済み)
- M4 `feat(ui): M22 P1-4 modal/Sheet統一` + `refactor(ui): dialogフック分離`
- M5 `feat(ui): M22 P1-5 出立の初期選択+地域/ボス予告+灯写し`
- M6 `fix(ui): M22最終レビュー反映`(H2/M1/L2全件)+機械バッテリーALL_GREEN×2

## ④保留リスト(再開手順)
- **preview実測(唯一の⚠️)**: preview系ツールが分類器障害で6回失敗(2026-07-11 16:32〜17:3x)。**再開手順**: (1)`preview_start {name:'hitsugi-dev'}`(port 5199、.claude/launch.json定義済み) (2)出立画面: 成人1人で`document.querySelector('.depart-cand').getBoundingClientRect().width <= 280`(1280×720) (3)`window.__game`でテスト状態注入(成人0/1/4/6人・HP1・寿命残3月・心労60+) (4)Tab→Enter/Space→4人選択→1人解除→再選択→出立の実走+5人目押下で「隊は四人まで」表示 (5)Pact: 絵のない神2柱以上を並べ同一見え0件+素材7枚(hotarubi通常/MAX・tsukiyomikami・boss蛍火姫・カットイン・bg_r/bossbg蛍火)表示 (6)Sheet6画面+家系図: ESC/外側クリック/フォーカス復帰/背景スクロール停止、事件中にShift+Tabで背後へ届かないこと (7)鍛冶: charm比較が「同等」にならない・検索/絞り込み/品質チップ (8)出立: 開いた時点で右ペイン非空・灯写し1回再生・404地域でシルエット+「遠見が利かぬ」・未討伐ボス黒輪郭 (9)390×844: 文字切れ/横はみ出し/CTA重なりなし (10)スクリーンショットをWORKLOGへ。
- **指示6(郷歩行マップ)・指示7本体**: 次期ミッション。正本=`docs/VISUAL_RECOVERY_DUNGEON_PLAN.md` Phase V2/V3。頭金=`src/core/data/region_visuals.ts`(新12地域の署名/粒子/痕跡)を拡張して始める。
- **未追跡資産**: public/img jpg7枚+walkc sprites+assets_src候補PNG+asset factory変更(ASSET_NEEDS.md/gen_manifest.mjs/manifest*.json)はコミットせず残置(HANDOFF規律+工場レーンとの整合)。push時にユーザーが一括判断。
- **push**: ユーザーゲート。未push: 本ミッション9コミット+docsコミット+M18/M19系。

## ⑤質問キュー(境界放出)
1. 先行素材7枚(public/img)と生成元PNGをリポジトリへコミットするか(push=公開デプロイに乗る)。
2. 指示6/7本体を次期ミッションとして起動するか。

## ⑥マイルストーン履歴
Phase0 devil攻撃→契約修正→発進 / M1〜M5 各ゲート緑+項目別コミット / M2独立レビュー出荷可(M2件即修正) / M6機械バッテリーALL_GREEN / 最終独立レビュー要修正(H2)→全件修正→再検証緑。

## ⑦次の一手
(terminal — なし。再開する場合は④のpreview実測のみ)

## ⑧最終監査表
**監査区分: 自己監査**(+独立code-review2回で補強。機械チェックは本体とレビュアーが各々再実行)
| 契約項目 | 判定 | 証跡 |
|---|---|---|
| M1 隊編成グリッド | ✅(実測のみ⚠️) | 専用grid+4枠常時+選択順=隊列番号+native button化+aria-pressed+上限近接警告+空状態案内。`.exp-party`無変更はレビュアーがgit diffで機械確認。コミット2件 |
| M2 装備5軸+比較 | ✅ | item_axes.ts(描画時導出・source optionalのみ格納)+diffItems軸別+vitest13本(独立性/旧セーブ耐性/パレート薦)。独立レビュー出荷可(C0/H0)・M2件修正済 |
| M3 神絵フォールバック | ✅(目視のみ⚠️) | GodArtFallback(属性シルエット+神名焼き込み+絵姿準備中)をPact大立ち絵/図鑑詳細/図鑑一覧へ配線。素材7枚の実在×データ参照一致をls+grepで確認 |
| M4 modal/Sheet統一 | ✅ | 6画面Sheet化+家系図trap+事件=ForcedDialog(Tabトラップ+storeガードの二重防御)+単一Sheetガード。最終レビューH2件を反映済み |
| M5 出立初期選択+予告 | ✅(実測のみ⚠️) | 最前線自動選択+前回選択優先+404シルエット+ボス黒輪郭+報酬常時+灯写し(reduce-motion対応)+新12地域署名(REGION_SIGNS 12idの実id一致はレビュアーが機械照合) |
| M6 統合検証 | 機械✅ / preview⚠️ | build成功/oxlint警告0/vitest40/40/validate_data errors0(既知warn1)/git diff --checkクリーン — 本体+レビュアーの二重実行。**preview実測は分類器障害6連続で未実施**(契約フォールバック適用・④に再開手順) |
- 監査範囲外の明記: 受入オラクル自体の妥当性はPhase0のdevil-advocate攻撃が担保。実ブラウザ挙動(フォーカス実走/モバイル実寸/灯写しの見え方)は⚠️のため未保証。
- 再監査履歴: 最終レビュー(要修正H2)→修正コミット→tsc/lint/test/build/validate_data再実行緑(1回で解消)。

## ⑨terminal印
**部分達成(terminal)** — 2026-07-11 17:4x JST。実装契約6項のうちコード+機械検証+独立レビューは全✅、ブラウザ実測のみ外部ツール障害で⚠️。後続セッションはミッションを再開せず、④のpreview実測のみ実施してよい。最終報告はWORKLOG 2026-07-11 M22項+本表。
