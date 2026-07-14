# Claude/Fable 5向け UI/UX刷新引継ぎ

## 目的

物量を増やすのではなく、既存の物量・画像・文章を「いま何を選ぶか」「次に何が楽しみか」へ変換する。

必ず先に読む:

1. `AGENTS.md`
2. `docs/POLISH_FIX_INSTRUCTIONS_CLAUDE.md`
3. `docs/GDD_v3.md` §8.5〜§8.9
4. `docs/UI_UX_REDESIGN_PLAN.md`
5. `docs/UI_UX_ACCEPTANCE_CHECKLIST.md`
6. `docs/DESIGNSPEC.md`
7. `docs/STATUS.md`
8. `docs/WORKLOG.md` 末尾
9. `docs/ENGAGEMENT_COMFORT_ASSET_PLAN.md`
10. `docs/GOD_ART_AUDIT_2026-07-11.md`
11. `assets_src/GOD_ART_STYLE_GUIDE.md`
12. `docs/VISUAL_ASSET_AUDIT_2026-07-11.md`
13. `docs/VISUAL_RECOVERY_DUNGEON_PLAN.md`
14. `assets_src/VISUAL_RECOVERY_BATCH.md`
15. `docs/BATTLE_DUNGEON_OVERHAUL_M24.md`

## 現状判断

- コンテンツ不足ではない。入口と判断情報の構造が弱い。
- 添付ホームのような「当主1人、後継なし、HP1/142」でも、出立が固定で主行動になり、瀕死と断絶危機が小さな情報へ埋もれる。
- ホーム内に9個のモーダル状態があり、鍛冶のような複合作業も家訓のような短い選択も同じmodal契約。
- 家譜/図鑑/家系図/鍛冶/普請は情報量的に独立作業画面が適切。
- 戦闘は素材より配置が問題。中央が空き、敵味方が小さく、ログ/隊員札が広い。
- 神データ180柱に対して通常絵120、縁MAX絵120。新規60柱は両方とも未配置。
- 神カットイン24枚は生成仕様が先頭24柱限定であり、156件の単純な生成漏れではない。
- 継続動機は日課化ではなく「前回の灯」「家の火種」「神縁の三幕」「宿敵の傷跡」で作る。

## M18後の次工程

M18の各Phaseを検収した後、`docs/ENGAGEMENT_COMFORT_ASSET_PLAN.md` のPhase Aから着手する。

1. 前回の灯、家の火種、次月の兆し、月送り差分まとめ。
2. 帰還の「今回変わったこと」と神縁の三幕。
3. 宿敵の傷跡と世代の問い。
4. 神絵はrank 1不足20柱＋rank 4不足10柱をP0とする。

連続ログイン損失、期間限定、時限報酬、行動力待ちは導入しない。

## ビジュアル復旧を先行する場合

ユーザーレビューで出立画面・地域・ボス・ダンジョンの魅力不足が再指摘されたため、M18検収と並行可能な独立レーンとする。

1. `docs/VISUAL_ASSET_AUDIT_2026-07-11.md` の348件を現環境で再監査する。
2. 出立画面を開いた時点で最前線を自動選択し、空の右ペインをなくす。
3. 新12地域の背景/ボスの間/ボス/カットインを最優先で投入する。
4. `docs/VISUAL_RECOVERY_DUNGEON_PLAN.md` の `RegionVisualProfile` と四幕の道行きを実装する。
5. 神MAX・敵若老は承認済み基礎絵を参照するimg2imgへ切り替える。

既存画像627枚に画素完全一致はなく、参照重複も0。共通代替表示を「画像の使い回し」と誤認させているため、参照の付け替えで済ませず欠落ファイルを埋める。

## 実装順

### 0. ベースラインを残す

- PC 1280×720とモバイル390×844で、郷/契り/出立/探索/戦闘/鍛冶/普請/家譜/図鑑/家系図を撮る。
- 新規開始→初戦闘→帰還の操作数とconsoleを記録。
- この時点では見た目を変更しない。

### 1. 共通コンポーネント

候補ファイル:

- `src/ui/components.tsx`
- `src/App.tsx`
- `src/index.css`
- 必要なら `src/ui/layout/` を新設

先に実装:

- `ScreenShell`
- `ActionDock`
- `Sheet`
- `WorkspaceTabs`
- `StatusCallout`
- `LiveBadge`
- フォーカス復帰/ESC/フォーカストラップ/body scroll lock

このPhaseで個別画面の装飾へ入らない。

### 2. 郷ホーム

主対象:

- `src/ui/Home.tsx`
- `src/ui/components.tsx`
- `src/ui/m17_home.css`
- `src/index.css`

実装:

- 1〜2人時の人物札＋血脈診断
- 3人以上の大札＋小札
- 状況別推奨（GDD §8.5/設計書 §4.3）
- 月送り確認
- 郷の帳とlive badge
- モバイルのホーム内アンカー

最重要テストデータ:

- 存命1、後継なし、HP1
- 成人0、幼子1
- 存命4、負傷2
- 祭月、奉燈不足

### 3. 作業画面

- `ForgeModal` を独立画面化。購う/装備/打ち直し/鍛錬の4タブ。
- `FacilitiesModal` を独立画面化。
- `Pact.tsx` にステップと固定CTA。
- `Expedition.tsx` に準備状況と固定CTA。

大量一覧を一度にDOMへ描画しない。先に絞り込み/ページング方針を決める。

### 4. 戦闘/探索

主対象:

- `src/ui/Battle.tsx`
- `src/ui/m17_battle.css`
- `src/index.css`
- `src/ui/Dungeon.tsx`

戦闘:

- 上段行動順
- 中央「火脈」
- 敵味方を中央へ、大きさは人数連動
- ログを戦場下端へ
- 指令盤＋幅制限した隊員札
- 技一覧の固定戻る
- 対象選択文

注意: `.battle-stage` に `overflow: hidden` を付けると、フォーカスされた敵の撃破後に内部scrollTopが動く場合がある。クリップが必要なら `overflow: clip` を優先し、実機で `scrollTop === 0` を確認する。

探索:

- HUD安全領域
- 帰り火確認
- 特殊床の下部sheet
- モバイルD-pad重なり確認

### 5. 記録画面

- 家譜を4タブ
- 図鑑の新着/詳細/大量表示対策
- 家系図を全画面化し、検索・当主へ戻る・存命絞り込み
- 郷の声へ新着と既読

### 6. 検証

必須:

```powershell
npm run build
npm run lint
node scripts/validate_data.mjs
git diff --check
```

加えて `docs/UI_UX_ACCEPTANCE_CHECKLIST.md` のJシナリオをPC/モバイルで実施する。

## 守ること

- UI効果音は `main.tsx` の `attachUiClickSfx()` に任せ、個別buttonへ重複配線しない。
- pushは公開デプロイ。ユーザー確認なしでpushしない。
- 正典は `docs/GDD_v3.md`。旧GDDは参照しない。
- ゲームロジック変更をUI Phaseへ混ぜない。
- 既存の未追跡sprite画像を削除・移動・一括追加しない。
- 通常神絵とMAX神絵を別々のtext-to-imageで作らず、承認済み通常絵をMAX差分の参照にする。
- `factory_state.json` のdoneだけで画像実在を判断せず、`public/img` とデータ参照を突合する。
- 金は見出し/当主/確定、命火は選択/推奨、朱文字は危機。
- 色だけで状態を伝えない。
- モバイルで説明や比較材料を削らない。

## Phaseごとの完了記録

各Phase終了時にWORKLOGへ以下を残す。

- 変更した画面と判断理由
- 変更ファイル
- PC/モバイルのスクリーンショット確認
- 操作回数の前後
- キーボード/ESC/フォーカス結果
- build/lint/data検証結果
- 次Phaseへ残した項目

## M18/M19後のブラッシュアップ追加指示（2026-07-11）

添付画面で確認された「隊を組む」の単独カード横幅過大、装備区分/レアリティ/比較不足、神絵欠落フォールバック、modal操作、郷の歩行化、出立/ダンジョン予告の修正は次を正本とする。

- `docs/POLISH_FIX_INSTRUCTIONS_CLAUDE.md`

特に隊編成は共通 `.exp-party` を直接変更しない。`Expedition.tsx` の編成候補だけへ専用gridを導入し、PCは4列、モバイルは1列コンパクト、常時4つの隊列枠を表示する。1人でも横一杯へ伸ばさないことをP0受入条件とする。

## M24 戦闘/ダンジョン全面改善（2026-07-12）

戦闘人物の小ささ、攻撃者と対象の断絶、ダンジョンの過広角表示、暗色面の識別不足、HUD分散は次を実装正本とする。

- `docs/BATTLE_DUNGEON_OVERHAUL_M24.md`

実装順は、ダンジョンzoomと床/壁コントラスト、戦闘三段gridと人物拡大、灯路/灯脈、HUD統合、地域/主戦差分の順。敵の兆しや地形生成変更は視覚Phaseと別commitにする。
