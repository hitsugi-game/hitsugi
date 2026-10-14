# 灯継ぎ -HITSUGI-

**八季の命を、継いでゆけ。**

**▶ いますぐ遊ぶ: https://hitsugi-game.github.io/hitsugi/** (無料・インストール不要・スマホ対応)

二年(八季)で燃え尽きる呪われた血族を率い、星神と契って子を授かり、世代を重ねて常夜の山の頂を目指す — 世代交代ダークファンタジーRPG。ブラウザでそのまま遊べます。

『俺の屍を越えてゆけ』の「短命・世代交代・血脈」というゲームデザインに着想を得て、独自の世界観と物語を構成しています。夜藪を歩く探索、子の血潮の予測、途中で中断できるセーブ機能を備えています。

## 遊び方

```bash
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開く。スマホ表示にも対応。

## 特徴

- **八季の命** — 仲間は必ず2年で死ぬ。残り寿命は「炎の点」でいつも見えている
- **星契り** — 星神180柱と契って子を授かる。子の血潮は予測レンジで確かめられる
- **灯システム** — 探索は「灯」が尽きる前に帰るか、深部の宝を狙うかの賭け
- **継足** — 家族で同じ敵を連続で狙うと連携倍率が上がる、血の絆バトル
- **家譜** — 全キャラの生涯・辞世が自動記録される、あなただけの千年紀
- **辞世の句** — 性根と死に様から自動生成される、その人だけの最期の言葉
- **和風プロシージャルBGM** — Web Audioで箏・太鼓・鈴の音を合成。家祖にまつわる旋律が物語をつなぐ

## 技術

React 19 + TypeScript + Vite + PixiJS + Zustand。画像はゲームに同梱し、音楽は実行時に合成します。セーブはlocalStorageを使い、保存ファイルの書き出し・読込みにも対応しています。

## How OpenAI Codex & GPT-5.6 were used

This project was built with two AI coding agents working the same repository as independent contractors — OpenAI **Codex CLI** (running on **GPT-5.6**) alongside Claude Code — not as a single autocomplete tool.

- **Division of labor**: major systems (e.g. the 40-region dungeon overhaul, the rare-encounter/rare-drop system in `src/core/rare_encounters.ts`) were scoped as self-contained "missions" for Codex: a written contract (definition of done, out-of-scope items, protected files), task breakdown, implementation, and a required independent audit before merge. See [`docs/CODEX_MISSION_STATE.md`](docs/CODEX_MISSION_STATE.md) for a live example of this protocol.
- **Shared source of truth**: both agents read from the same design doc ([`docs/GDD_v3.md`](docs/GDD_v3.md)) and decision log ([`docs/WORKLOG.md`](docs/WORKLOG.md)) instead of relying on chat history, so work stayed consistent across sessions and across agents.
- **Verification, not trust**: every Codex mission ends in machine checks (`tsc`, `oxlint`, `vitest`, `scripts/validate_data.mjs` for zero ID/text duplication) plus an independent audit pass before being considered done.

No OpenAI API calls happen at runtime. The game uses bundled artwork, procedural audio, and localStorage saves; no external AI service is required to play. GPT-5.6/Codex was used as part of the **build process**.

## ドキュメント

- [ゲームデザインドキュメント（現行正典）](docs/GDD_v3.md)

## License

MIT (code). ゲームテキスト・世界観・キャラクター設定 © 2026 燈守家プロジェクト
