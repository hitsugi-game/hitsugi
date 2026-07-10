# Claude/Fable 5向け UI/UX刷新引継ぎ

## 目的

物量を増やすのではなく、既存の物量・画像・文章を「いま何を選ぶか」「次に何が楽しみか」へ変換する。

必ず先に読む:

1. `AGENTS.md`
2. `docs/GDD_v3.md` §8.5
3. `docs/UI_UX_REDESIGN_PLAN.md`
4. `docs/UI_UX_ACCEPTANCE_CHECKLIST.md`
5. `docs/DESIGNSPEC.md`
6. `docs/STATUS.md`
7. `docs/WORKLOG.md` 末尾

## 現状判断

- コンテンツ不足ではない。入口と判断情報の構造が弱い。
- 添付ホームのような「当主1人、後継なし、HP1/142」でも、出立が固定で主行動になり、瀕死と断絶危機が小さな情報へ埋もれる。
- ホーム内に9個のモーダル状態があり、鍛冶のような複合作業も家訓のような短い選択も同じmodal契約。
- 家譜/図鑑/家系図/鍛冶/普請は情報量的に独立作業画面が適切。
- 戦闘は素材より配置が問題。中央が空き、敵味方が小さく、ログ/隊員札が広い。

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
