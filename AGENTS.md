# 灯継ぎ -HITSUGI- 開発ガイド

世代交代ダークファンタジーRPG(公開中)。React 19 + Vite 8 + TypeScript + PixiJS 8 + Zustand。

## コマンド
- `npm run dev` — 開発サーバ(http://localhost:5173)
- `npm run build` — tsc -b + vite build(出荷前に必ず緑を確認)
- `npm run lint` — oxlint
- デプロイ: `main` へ push で GitHub Actions が自動ビルド・公開。手動作業不要(詳細: docs/DEPLOY.md)

## 正典宣言
- 仕様の正典: **docs/GDD_v3.md**(GDD.md / GDD_v2.md は歴史文書 — 参照しない)
- 現在の状態: docs/STATUS.md / 作業履歴: docs/WORKLOG.md
- 計画値・設計判断は GDD_v3.md と WORKLOG.md に記録する — チャットログに依存しない(GDD_v3 冒頭の規定)

## 構成(固定事実のみ)
- `src/core/` — ゲームロジック・データ(神/敵/装備/辞世/事件は `src/core/data/` 配下)
- `src/dungeon/` — 探索エンジン
- `src/ui/` — React UI
- `assets_src/` — 素材の生成元 / `public/` — 配信素材
- UI効果音は main.tsx の `attachUiClickSfx()` が全 button に自動付与(個別実装しない)

## 規約・落とし穴
- conventional commits(feat / fix / docs / refactor / chore …)
- **push = 公開デプロイと同義**。push はユーザー確認を取ってから(未pushのローカル進行状態が意図的に存在する)
- データ追加は既存の機械検証(辞世の重複0チェック等)を通してから完了とする

## 書かないこと
- コードから読めること・流動する状態(→STATUS/WORKLOG)。本ファイル上限200行(公式基準)
