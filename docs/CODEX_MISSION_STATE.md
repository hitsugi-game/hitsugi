# CODEX MISSION STATE — M43 core appeal implementation

## ①契約

- Definition of done: M42 P0の1〜4、即時修正6件、非課金の世界観統合ガチャを既存save互換で実装し、PC1280/mobile390の直接操作、unit/E2E/build、独立監査でblocking 0にする。
- Out of scope: 新規画像量産、現金課金・決済、外部ユーザー募集、commit、push、deploy。
- Constraints: 全戦闘オート、手動同報酬、自由選択、追加物量凍結を維持。既存baseline PNG 9点と`tmp/`、M42 docs差分を保護する。
- Gacha boundary: 既存ゲーム内進行だけで解放し、確率明示、天井、重複救済、期間限定/FOMOなし、ガチャ限定の必須戦闘性能なし。
- Permission boundary: ローカル実装と検証のみ。公開・外部送信・課金・既存dirty上書きは未承認。
- Escalation: 実ユーザー8名、物理低性能端末、analytics provider、課金判断は外部gateとして分離する。
- Audit class: independent audit。save、継承、ランダム報酬、主要旅程を変更するため。
- Subjective acceptance: 初回30分、継承因果、序盤敵の対処差、ガチャの納得感をPC1280/mobile390の実画面と明示rubricで判定する。

## ②作業分解

| Item | Dependency | Execution path | Acceptance check | Status |
|---|---|---|---|---|
| A. 契約・状態・差分固定 | 正典/git | main | state/Goal/plan一致、dirty保護 | completed |
| B. 即時修正＋初回30分UI | A | UI lane | 検索、scroll/focus、keyboard、推薦、事前選択 | completed |
| C. 序盤12敵＋戦闘判断 | A | battle lane | 3行動型、兆し、sim | completed |
| D. 継承因果＋milestone＋ガチャ | A | state lane | migration、天井、救済、継承scene | completed |
| E. save export＋年数/version | D | state lane/main | recovery fixture、全表示一致 | completed |
| F. 統合回帰 | B-E | main | unit/lint/build/E2E green | completed |
| G. PC/mobile直接旅程 | F | main/browser | 初回・戦闘・継承・ガチャ証拠 | completed |
| H. 正典同期 | F-G | main | GDD/STATUS/WORKLOG更新 | completed |
| I. 独立最終監査 | H | fresh reviewer | PASS、blocking 0 | completed |

## ③完了済み

- 2026-07-22: M42 terminal stateを`docs/CODEX_MISSION_STATE_M42_ARCHIVE_20260722.md`へ保全。
- HEAD `001dfda`。M42 docs差分、baseline PNG 9点、`tmp/`を保護対象として固定。
- ガチャは現金購入なし、確率明示、天井、重複救済、期間限定なしの安全境界を採用。
- UI、battle、stateの3 laneへ排他ownershipを割り当て、docs/baseline/tmp非接触を明示して並行開始。
- 初回導線、即時修正6件、後継指名/約束/継承返歌、序盤12敵、local metrics、星籤を統合。星籤をHomeと23番目のrouteへ接続。
- Vitest 43 files / 721 tests、oxlint、production build、visual closure 23/40/6/69、manifest 9/9、diff-checkに合格。
- PlaywrightはM43旅程をPC1280/mobile390で14/14、戦闘兆しを2/2合格。
- 初回独立監査で、100 seed harnessが`bossDown`/戦利品を代入し、16月で止まり、通貨分位・敗北復帰月・seed再現性を持たないblocking 1件を検出。
- 疑似結果代入を撤去した修復初版は、3地点だけを武功解禁なしで飛び越したためRound 2もblocking。再修復で100 seed全てを序盤雑兵→全39主の`unlockFame`順へ変更し、各出立前の武功、最終地の第四章/汐里名開示、正規解禁後の敗北→回復→再挑戦を強制検査。全主踏破率/部分進捗、寿命死・初継承、通貨p10/p50/p90、敗北復帰月、同一seed完全一致を実結果から集計する。
- 最新差分でVitest 43 files / 721 tests、oxlint、production build、visual closure 23/40/6/69、manifest 9/9、diff-checkに合格。M34の動的import hookは重いcampaignとの並列時にも耐えるよう既知10秒を30秒へ現実化した。
- 独立Round 3はfocused 2/2とdiff-checkを再実行しPASS / blocking 0。M43全契約を完了した。
- GDD_v3 §8.26、STATUS、WORKLOGへ設計・検証・公開境界を同期。

## ④保留リスト

- 外部初見8名・一世代5名・物理低性能端末は、ローカル合格後の外部gate。
- commit/push/deployはユーザーの明示依頼待ち。ローカル完成とは分離する。
- 現金課金は本mission外。将来検討時は法務、platform、年齢配慮、返金、確率開示を別設計する。

## ⑤質問キュー

- なし。ガチャは上記安全境界で実装し、課金判断を推測しない。

## ⑥マイルストーン履歴

- M43-0: 契約、Goal、9項目planを固定。独立実装laneを開始。

## ⑦次の一手

- commit/push/deployは別の明示依頼で行う。外部初見8名、一世代5名、物理低性能端末を次gateとする。

## ⑧最終監査表

- Round 1: FAIL / blocking 1。campaign simの疑似結果代入、終盤未到達、分位/復帰月/再現性不足。
- Round 2: FAIL / blocking 1。疑似代入は解消したが、3地点だけを地域解禁なしで飛び越し、全主完遂率が構造上0。
- Self-repair 2: 全39主を武功解禁順に実戦闘し、物語前提と最終敗北→回復→再挑戦を通すcampaignへ変更。
- Round 3: **PASS / blocking 0**。100 seed全ての合法進行、結果直接代入0、全主踏破/部分進捗、通貨分位、復帰月、継承、seed 37完全一致を独立確認。実ユーザー/低性能実機は代替しないnon-blocking noteとして外部gateへ残す。

## ⑨terminal印

公開完了 — 2026-07-22T07:52:00+09:00。実装`dbe2968`、closure hash修正`6ef7d4a`、Actions run `29875134003`成功。公開JS/CSSを直接確認済み。
