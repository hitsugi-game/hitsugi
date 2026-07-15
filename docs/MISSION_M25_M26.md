# MISSION M25+M26: 実描画検収基盤と戦闘/ダンジョン/共通安全性 — STATE

## ①契約
**ゴール**: `docs/BATTLE_DUNGEON_M25_VISUAL_QA_AND_REFINEMENT.md`(M25)を完遂 + `docs/MENU_UI_UX_AUDIT_M26.md` Phase 0(共通安全性) + ユーザー報告バグ(郷NPCが金縁の立ち絵札)。

**スコープ確定の経緯**: ユーザー選択(2026-07-15)= 「M25完遂 + M26 Phase0 + 報告バグ」。devil-advocate攻撃(REWORK/12条)を全て契約へ反映。

### 完了の定義(機械検証可能)
- **M0 受入基盤**: `@vitest/browser` + `playwright` 導入、`npm run test:visual` 新設。検証viewport 5種(1440×900 / 1280×720 / **768×1024** / 390×844 / **360×800**)。M26 §18 の fixture を `window.__game` 経由で投入。**暗部率・札重なり率・矩形交差・ヒット領域(44/48px)は全て実ブラウザ headless 実測で判定する。純粋関数テストはこれらの代替にならない。** 導入失敗時は当該数値受入を受入条件から削除し「未検証」と明記する(「純粋関数で機械保証した」とは書かない)。GitHub Actionsのデプロイ経路には入れない。
- **M1 camera**: `computeZoom(viewW, viewH, tile, mapW, mapH)` へシグネチャ変更。`zoom = clamp(max(横タイル目標, viewH/(mapH*tile), viewW/(mapW*tile)), 0.85, 1.6)`。MAX_ZOOMでも覆えない場合は backdrop 被覆を必須とする。安全領域(PC上56px / 390px:上96px・下118px)+ 境界clamp(**look-ahead後に適用**)。既存 `tests/camera.test.ts` と全呼出元を更新。テスト行列に 768×1024 / 360×800 / 1440×900 を含む。
- **M2 モバイルHUD**: 上端2段(44-48px / 34-38px)。暦・今回の実り・帰り火は小休止sheetへ(帰り火は2操作以内)。`env(safe-area-inset-*)` は一度だけ適用。D-pad 48px以上・端から12px以上・隊員札と8px以上。**矩形交差0 を実ブラウザ実測**。
- **M3 戦闘**: `BattleArtFrame` + `art_profiles`(**sprite prefix によるクラス定義**: en_/boss_/god_/god_*_max の3-4バケット。例外のみ上書きテーブル。「全combatantにprofile個別登録」を完了条件にしない)。人数別 slot preset(1/2/3-4)。action layer(元札は隊列位置を保つ・灯脈端点は行動開始時1回だけ計測・毎frame `getBoundingClientRect()` 禁止・impactは対象札のみ・HUD/コマンド盤は揺らさない・hit-stop 55-75ms)。入力不能時に下段を空箱にしない。**平常時の生存札の相互重なり ≤12%、名札/HP/ログ/コマンドの矩形交差0 を実ブラウザ実測**。
- **★進行ゲート(正典 M25 §11 — 迂回禁止)**: 4画面(1280×720 / 390×844 × 宵の森B1開始地点 / 味方1対敵2)を実測。**暗部率(PC ≤15% / モバイル ≤20%)・札の重なり・名札/ログ/コマンドの矩形交差が合格するまで、M25 Phase 3以降(M4/M5/M6)へ進まない。**
- **M4 タイル反復低減**: 同一プロップを3個以上等間隔で並べない / 4×4タイル以内で同じ床矩形の色を完全反復させない / 初期視界に「次の開口・署名物の気配・敵の兆し」のうち最低1つ。純黒と未踏シルエットを区別する。
- **M5 敵の兆し**: カテゴリは **攻 / 術 / 群 の3種のみ**。**守・弱狙・溜は実装しない** — 現行 `enemyAction`(`src/core/battle.ts:363-375`)に対応する挙動が存在せず(HP割合参照0行・溜め状態なし)、追加は AI/対象選択の変更=バランス変更にあたるため**別ミッション「敵AI拡張」へ切出**(受入条件に前後1万戦シミュレーションの勝率差を持つこと)。**【設計の改良 — 2026-07-15】** devilは「カテゴリを専用Rngで事前確定、対象は手番時に共有rngで」と提案したが、それでは `enemyAction` の返り値が変わり、**契約が要求するゴールデンテスト(返り値完全一致)自体が成立しない**。より良い解がある:
- **`enemyAction` を1文字も変えない**(バイト同一に保つ)。変えるのは「**いつ呼ぶか**」だけ。
- 巡の開始時に各敵について `enemyAction` を呼び、結果を **表示専用フィールド**として `BattleState` へキャッシュする(`BattleState` は永続化されない — `GameStore` 側の transient state)。
- 兆しはキャッシュした行動から導出する: `attack`→攻 / `skill`(複数対象)→群 / `skill`(単体)→術。
- 手番到来時、キャッシュした対象が既に倒れていれば `enemyAction` で再抽選する(正典 §5「対象条件が変わって再抽選した時は同じtickで更新する」が明示的に許可)。
- これにより **`enemyAction` の入出力は完全に不変**となり、固定Rng 1000シードの**ゴールデンテスト(返り値完全一致)がそのまま成立する**。rngの消費順序は変わるが、battle RNG は `Date.now() ^ Math.random()` 由来でリプレイ契約が無く観測不能(devil実証)。
- **AI不変の受入オラクル = `enemyAction` の固定Rng 1000シードのゴールデンテスト(前後で返り値完全一致)。差分レビューは不変性の証明にならない。**
- **M6 room archetype**: 最低6種(門前/広間/回廊/中庭/橋・狭路/段丘・分岐)。`scripts/gen_floor.mjs` / `scripts/gen_all_maps.mjs` を改修し `maps.gen.ts` を再生成(**手編集禁止**)。**生成ゲートは到達可能性だけでなく個数の不変条件を含む**:
  - **各floorで宣言した個数**(`gen_all_maps.mjs` の monuments/chests/camps/shrines)**が実際に配置されていること**。`placeAlcove` は失敗しても黙って飛ばすため、宣言と実配置の一致を assert する。
  - 地域ごとに **石碑(M) ≥ 1**。
  - **【devil指摘の訂正 — 2026-07-15 実コード検証】** devilは「地域ごとに石碑3個必要」としたが、これは `used`(使用済み特殊床)が永続する前提での誤り。`DungeonRun` は**永続化されず**、遠征ごとに `used` がリセットされるため、**石碑1個でも遠征を繰り返せば `loreFrags` 3 に到達できる**。3個へ増やすのは取得ペースの変更=**スコープ外の設計変更**。したがって不変条件は「宣言個数どおり配置され、地域に最低1個あり、到達可能」とする。危険の本体(archetype書き換えで配置が黙って失敗し、`烏の里`(floors:2 → 非ボス階1つ)の石碑が0個になって収集100%が恒久到達不能になる)は変わらず成立する。
  - C / F / S / > / B / < は各floorで期待個数以上、**かつ**入口からBFS到達可能。
  - 到達可能性のassertは対象0個のとき**空虚に真**になるため単独では不可。**本ゲートは `maps.gen.ts` を読む vitest として実装**(生成スクリプト内assertのみでは、コミットされた成果物を保証しない)。
  - 根拠: `GameData.loreFrags` は永続化され(`src/core/types.ts:315`)、石碑接触でのみ増加(`src/core/store.ts:1457-1483`)。石碑0個 → 縁起・図鑑・称号100%が**恒久的に到達不能**。
  - 他: 全通常フロアへ2種以上 / 記憶に残る一室 / 空の行き止まり0 / 同形3連続0 / 長直線12タイル上限 / 最初の判断地点までの歩数。
- **M7 M26 Phase 0(共通安全性)**: WorkspaceTabs を WAI-ARIA tabs 完全準拠(id/aria-controls/tabpanel/roving tabIndex/Left-Right-Home-End) / clickable div を全 button 化(家系図ノード・ホーム日参り・場面送り選択カード) / 星契り・郷普請・血潮鍛錬に確認Sheet(血潮鍛錬は回数ステッパー+総費用の一括確定、連打消費を廃止) / 図鑑は**個別既読**(mountで全既読化しない) / 場面送りの誤タップ防止(250msデバウンス・本文/選択/入力/CTA/固定帯は進行対象外・Escapeは進行に使わない)。
  - **図鑑個別既読はセーブスキーマ変更**(現行は `flags.codexSeenEn` / `codexSeenGods` の**件数の高水位マーク** — `src/core/store.ts:644-655`、`flags` の型は `Record<string, boolean|number>` で `string[]` 不可)。**移行方針: 旧セーブの移行時に「既知の全項目を既読として初期化」する**(偽の新着爆発を避ける)。optional フィールドとして追加し `isValidSave` を壊さない。**旧v4セーブの往復テストを受入に含める**。
  - テスト: doPact が confirm 前に呼ばれない / 血珠が confirm 前に減らない / 図鑑 mount だけで新着が消えない / facility 推薦が「最安」を誤って「おすすめ」と呼ばない。
- **M8 報告バグ + 郷カメラ(M26-P0-08)**: 村NPCが**金縁の立ち絵札**(`roundRect 30×40 + stroke 0xc9a86a` — `src/village/engine.ts:465`)として描かれている件を是正。追従カメラ(PC 横13-16タイル / 390px 横8-10タイル)+「見渡す」で全景fit。
  - **不変条件は「world外を露出しない」ではない**。郷world(22×11・V_TILE=46・アスペクト2:1)は 390×844(アスペクト0.46:1)を §6.2 の横8-10タイル要件下で**原理的に覆えない**(必要scale 1.668 → 表示幅5.1タイル)。→ 不変条件を「**camera target が world 境界へ clamp される**」かつ「**world外領域は backdrop が完全被覆し、純黒を出さない**」へ置換する。
  - 主人公の見た目高さ 56-88px。D-pad に aria-label。会話は role=status 内に操作buttonを置かない。
- **M9 統合**: `npm run build` 緑 / `npm run lint` 0 / 全 vitest 緑(現211 → 増) / **`npm run test:visual` 緑** / `node scripts/validate_data.mjs` 0エラー / `git diff --check` クリーン / **`src/index.css` は行数非増加(追加行 ≤ 削除行)・新規の画面固有ルール追加禁止・`!important` の新規追加禁止**(※ゼロ差分ではない。M26 §21 は「index.css へ集約し**続ける**な」であり、画面固有ルールの**削除・移設は推奨**)。reduced-motion で対象/結果/兆しを失わない。

### スコープ外(やらないこと)
- **M26 Phase 1-5**(ホーム / 鍛冶 / 普請 / 星契り / 出立 / 家譜 / 図鑑詳細 / 家系図 / 設定)→ 後続ミッション。
- **M26 Phase 3 の施設Lv反映**(fac_* 18枚の画像に依存)、**施設画像18枚の生成**そのもの。
- **M25 Phase 5**(環境反応 / P2・任意 — 正典が「Phase 1〜4の受入後」と規定)。
- **M26 §3.3(P2)**(装備図鑑 / 鍛冶の保護印 / 家譜の人物検索 ほか)。
- **敵AI拡張(守・弱狙・溜)** — バランス変更のため別ミッション。
- **push(公開)** — ユーザーゲート。
- 戦闘計算 / 威力 / 報酬 / 灯消費 / **対象選択** の変更(敵の兆し以外)。
- `maps.gen.ts` 手編集。

### エスカレーション条件
push / 契約・スコープの変更 / バランス変更が必要と判明 / **playwright導入が失敗**(→ 数値受入を「未検証」へ降格し正直に報告)/ 進行ゲート(★)不合格が2連続。

### 監査区分(単調ラッチ)
**自己監査** — 完了の定義に不可逆な成果物(削除・公開・課金・法定記録)も出荷も含まない(push はスコープ外・全変更は git 可逆)。
補強: **devil-advocate 攻撃1回(実施済 2026-07-15 → REWORK → 12条を全て契約へ反映)** + レーン別**独立 code-review**(Mode O規律: マージ直前コードの独立第二パス)。

### 主観項目の受入方法(契約時固定)
数値(暗部率 / 札の重なり% / 矩形交差 / px / タイル数 / ヒット領域)は**すべて実ブラウザ headless 実測**で判定する。
画風の統一感・「記憶に残る一室」など機械化できない項目のみ、コードレビュー + ユーザー実走で判定し ⚠️ を許容する。

## ②作業分解
- **M0 受入基盤** — 本体Opus(難所: テスト基盤設計)。最初のcommit。
- **M1 camera** — 本体Opus(数学・テスト先行)。M0に依存。
- **M2 モバイルHUD** / **M3 戦闘** — sonnet並列(ファイル所有分割: M2=Dungeon.tsx+dungeon_m25.css / M3=Battle.tsx+battle/*+battle_m25.css)。M1に依存(M2)。
- **★進行ゲート** — 本体(実測)。M1/M2/M3 の後。**不合格なら M4以降へ進まない**。
- **M4 タイル反復** — sonnet(render/ground.ts, props.ts)。
- **M5 敵の兆し** — 本体Opus(難所: Rng分離・ゴールデンテスト)。
- **M6 room archetype** — 本体Opus(難所: 生成器 + 個数不変条件)。石碑バグ修正を含む。
- **M7 M26 Phase0** — sonnet並列(所有: shell.tsx / Pact.tsx / Facilities.tsx / Forge.tsx / Codex.tsx / Scenes.tsx / FamilyTree.tsx / Home.tsx)+ **セーブ移行は本体Opus**(難所)。
- **M8 報告バグ+郷カメラ** — 本体Opus(camera数学) + sonnet(描画)。
- **M9 統合 + 独立レビュー** — 本体。
- 依存: M0 → M1 → (M2 ∥ M3) → ★ゲート → (M4 ∥ M5 ∥ M6 ∥ M7 ∥ M8) → M9。

## ③完了済み(証跡)
- **M0 受入基盤** ✅ commit `d622bbb`
  - `@playwright/test` 導入、`npm run test:visual`、5 viewport、`src/dev/testhooks.ts`(dev限定 `window.__game`。本番バンドルに漏れないことを `grep dist` で確認済み)、`tests/visual/helpers.ts`(暗部率/矩形交差/重なり率/ヒット領域の実測)。
  - **実測基盤が端から端まで稼働**(devサーバ自動起動→状態注入→描画→実ピクセル計測)。
  - **オラクル較正**: 「説明のない暗部」を**領域**単位で定義(暗く平坦なブロックのうち近傍8ブロックの75%以上も暗く平坦=形態学的収縮)。閾値操作ではないことの対照実験: 同一定義で**未修正の郷マップは48.1%のまま高く**、修正済みダンジョンだけ14.0%へ落ちる。
- **M1 camera 境界クランプ** ✅ commit `257fd77`
  - `computeZoom(viewW, viewH, tile, mapW, mapH)`(高さ項)/ `safeArea`/`safeRect` / `clampCamera`(look-ahead後に適用)/ `offMapRatio` / 揺れは clamp 後 最大4px。
  - テスト **211 → 464**。5 viewport × 四辺四隅中央9箇所 × look-ahead五方向 で「安全領域のマップ外露出=0」を機械保証。クランプ後も「erase穴中央=主人公の実スクリーン位置」「タップ往復整合」成立。
  - 実測: 暗部 41.2% → 28.4%(PC)。
- **M4 タイル反復 + 奥壁シルエット** ✅ commit `f267850`
  - 根因: `ground.ts` の設計「壁セルには何も塗らない(地色のまま)」— 奥壁(歩行域に非隣接)が**何も描かれていない**状態だった。
  - 奥壁へ森のシルエット(樹冠+幹)。明度は上げない(lift +5〜+17)。`bakeFloorColors` で4×4窓の床色完全反復を排除(旧: 明度のみjitter delta=7 → 15通り → 16セルで鳩の巣原理により反復不可避)。
  - テスト **464 → 468**。
  - **実測: 暗部 PC 41.2% → 14.0%(受入≤15% ✅) / モバイル 39.6% → 11.3%(受入≤20% ✅)**。→ **M25 §9.1 のダンジョン暗部受入を達成**。
- **受入ゲート判定** ✅ `tests/visual/gate.spec.ts`(正典 §11 の4画面 + 味方4対敵4)。M2/M3 着地までREDが正常。

- **M2 モバイルHUD** ✅ commit `9310aa4`(2段化/D-pad48px/小休止sheet集約。実測 全5viewport緑)
- **M3 戦闘 戦絵札正規化** ✅ commit `8f92275`(BattleArtFrame+art_profiles/人数別slot/action layer/非空箱。実測 25/25緑・core非編集)
- **M4 プロップ+奥壁細粒** ✅ commit `f43ae50`(等間隔解消/細粒樹冠。ベタ塗り失敗→細粒へ修正の経緯を記録)
- **★進行ゲート(正典§11)** ✅ **45/45緑**(4画面×5viewport。暗部 PC14.0%/1440<15%/tablet<18%/mobile11-19%、戦闘の重なり≤12%・矩形交差0)。→ **M25 Phase1+2 完了。Phase3以降へ進める。**
- **M8 郷の追従カメラ・報告バグ是正** ✅ commit `d84600f`(ユーザー当初報告「4体の金色人型」)。根因: layout()の全マップfit(主人公20px)+ buildNpcsの金色肖像札。修正: 追従カメラ(主人公56-88pxクランプ)+見渡すボタン+NPC接地(影+台、金縁0.7→0.3)+D-pad aria-label。実測 全5viewport 15/15緑(主人公 PC85px/モバイル56px)。`village_m26.css`新規・index.css非編集・core非編集。`src/village/*`はCodex非対象で衝突なし。

## ④保留リスト(再開手順)
- **【Codex衝突・保留】M5(敵の兆し)/M6(room archetype)/M7の図鑑個別既読(セーブ移行)** — ユーザー判断(2026-07-15)により、Codexミッション(地域固有ダンジオン・稀少魔性)が共通インフラ(`store.ts`/`types.ts`/`maps.gen.ts`/`gen_all_maps.mjs`/`engine.ts`)を編集中のため保留。**Codexのインフラがコミットされてから着手**する。M5設計(enemyActionを不変に保ちキャッシュ)・M6設計(個数不変条件)は本STATEに確定済み。
- **【安全・続行可】M8(報告バグ: 郷NPCの金色札→追従カメラ)** — `src/village/engine.ts`/`src/ui/Village.tsx` はCodex非対象で衝突なし。ユーザー当初報告のバグであり最優先で続行する。
- **【安全・続行可】M26 Phase0の非衝突部** — WorkspaceTabs ARIA(`shell.tsx`)/clickable div→button(`FamilyTree.tsx`/`Home.tsx`/`Scenes.tsx`)/場面送り誤タップ防止(`Scenes.tsx`)/確認Sheet(Pact/Facilities/Forgeのcomponent内・store非変更で可能な範囲)。
- **fps受入(⚠️恒久)**: headlessの軟GPU(SwiftShader)ではダンジオンが2-6fpsとなりアプリのfpsを反映しない(切り分け済: M1時点groundでも3fps、戦闘は45-60fps、ユーザー実機§1.1で異常なし)。**headlessではfps検証不能**。実機での確認はユーザー実走に委ねる。
- **並列(Codex)稼働中は `git add -A` を絶対に使わない** — 明示パスでのみadd。私の6コミットはCodexファイル混入0を検証済み。

## ⑤質問キュー
(空 — スコープ2件はユーザー回答済み: 範囲=「M25完遂+M26 Phase0+報告バグ」/ playwright=「導入する」)

## ⑥マイルストーン履歴
- Phase0: 正典2文書読了 → 報告バグ根因特定(`village/engine.ts:465` 金縁立ち絵札) → 契約草案 → **devil-advocate 攻撃(REWORK / 12条)** → ユーザーへスコープ2択提示 → 確定(2026-07-15)。

## ⑦次の一手
M8完了。次は **M26 Phase0の非衝突部**: WorkspaceTabs ARIA(`shell.tsx`)/ clickable div→button(`FamilyTree.tsx`/`Home.tsx`/`Scenes.tsx`)/ 場面送り誤タップ防止(`Scenes.tsx`)/ 確認Sheet(Pact/Facilities/Forgeのcomponent内・store非変更で可能な範囲)。いずれもCodex非対象を都度確認してから着手。**M5/M6/M7-図鑑既読移行はCodexのインフラ(store/types/maps)コミット後**まで保留。

## ⑧最終監査表
(未実施)

## ⑨terminal印
(未達 — 実行中)

---

## 付録A: devil-advocate 攻撃の要点(2026-07-15 / 判定 REWORK)
実証で否定された私の前提:
1. **「実ブラウザ検証は不可能」は誤り** — preview MCP障害はエージェント側のツールが落ちているだけで、プロジェクトが playwright(Nodeプロセス・MCP非依存)で検証することを妨げない。`boundingBox()` で矩形交差・重なり率・ヒット領域、`screenshot()` の輝度ヒストグラムで暗部率を**数値assert**できる。エージェントが画像を「見る」必要はない。
2. **「純粋関数+単体テストで機械保証」は M24 を壊した検証手法そのもの** — 本リポジトリに jsdom / testing-library / @vitest/browser は無く(テスト6ファイル)、UI/DOMテストは0本。M24は211本の緑テストと共に出荷され、M25 §1.2-1.5 が列挙する全欠陥を生んだ。同じオラクルは同じ結果を生む。
3. **`maps.gen.ts` 再生成が保存済み座標/踏破/used を壊す、という私の懸念は誤り** — `DungeonRun` は永続化されない(`store.ts:63` のストア状態で `GameData` に含まれない)。**真のリスクは `loreFrags`(石碑)**(上記 M6 参照)。
4. **乱数消費順の変化によるバランス崩壊も起きない** — battle RNG は `Date.now() ^ Math.random()` 由来でリプレイ契約がない。危険なのは乱数順ではなく**陳腐化状態と存在しないカテゴリ**。
5. **`index.css` ゼロ差分は「誤ったゲート」** — `!important` は12箇所のみで後勝ち上書きは技術的に可能。問題は、M26 §21 が「style を外へ出せ」と指示しているのにゼロ差分がそれを**禁止**してしまうこと、および「差分が空」は正しさを何も証明せず `!important` を足せば通せる**ゲーム可能な代理指標**であること。
