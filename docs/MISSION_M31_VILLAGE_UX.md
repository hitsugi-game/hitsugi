# MISSION M31: 戦闘オート/事件の意図/見世崩れ/郷デザイン — STATE

作成: 2026-07-17。/mission 起動(ユーザー要望4点)。前提: M30(ダンジョン空キャンバス)はキャッシュ起因で解消済み(添付でダンジョン描画確認)。

## ①契約
**ゴール**: (A)戦闘中いつでもオート切替 (B)事件の目的を明示 (C)見世の崩れ是正 (D)郷デザインを分かりやすく魅力的に。
**監査区分**: 自己監査(push無し・修正git可逆)。Dの主観は「gate退行なし+実走」で受入。
**完了の定義**: A=常設トグルが全戦闘状態で機能(playwright) / B=各選択肢の吉凶が可視(gate退行なし) / C=見世が読める札・横スク0(playwright) / D=村/ホームの可読性向上(gate退行なし) / G=build緑・lint0・vitest緑・gate緑・index.css非編集・push無し。

## ③完了済み(証跡・commit)
- **A 常設オート切替** (`14c62fe`後のcommit): コマンド盤最上段に `.cmd-auto-persist` を常設。手番/メニュー(技/道具/対象)/演出中も常に見え入切可能。旧cmd-auto(root時のみ)+浮遊ストリップ(重なり事故)を1コントロールへ統合。auto_stop/battle_input更新・**gate 28 passed**。
- **B 事件の目的明示** (commit): 事件モーダルにフレーム文(実り/災い・どちらでも進める)+選択肢に「賭け—吉凶あり/確かな道」タグ+必要奉燈。表示のみ(挙動不変)。
- **C 見世レイアウト是正** (commit): 見世を装備用 `.item-grid`(多列)→ `.consum-list`(1列縦リスト)へ。縦1文字折返しを解消(M28-Cの回帰修正)。

## ④保留/実行中
- **D 郷デザイン**(村/ホーム/郷普請): sonnet委譲・実行中(agent a7dbafc51dd47a28c)。Home.tsx/Village.tsx/Facilities.tsx+新規CSS後勝ち。village.spec/menu_confirm.spec gate保持が条件。

## ⑦次の一手
D回収→検証(tsc/lint/vitest/village.spec/menu_confirm.spec/gate)→commit→統合verify→最終報告。push判断はユーザーへ。

## ⑨terminal印
(未達 — A/B/C適用済・D実行中・統合verify前)
