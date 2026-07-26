# CODEX MISSION STATE — M47C 戦闘予告信頼性と中盤難易度計測

## ①契約

- Definition of done: 実行を予約しない戦闘兆しを明示的な「行動候補」にして虚偽の確定表示をなくし、灯警告を実機構と一致させた後、中盤PTと実floor由来のHP/MP・灯持越し連戦で中盤難易度を実測する。必要と証明された場合だけ最小調整し、全検証・独立監査・Ship Check・main push・GitHub Pages公開確認まで完了する。
- Out of scope: 新規敵/地域/画像/通貨/FOMO、全戦闘オートの制限、月コスト変更、作業4以降の操作圧縮・ボス反応AI・隊列操作・敵影同期。
- Constraints: 作業順はWork2→Work3。固定seed 200件とDOM検査で、非拘束兆しが候補表示され確定を装わないことを固定する。中盤計測前に敵数値を触らない。一律強化や死亡率引上げでなく非致死的圧力を優先する。公開セーブを開かない。
- Permission boundary: ユーザーは実装・commit・main push・deployを明示承認。既存dirty 3ファイル、費用、外部サービス、破壊操作、別repoは対象外。
- Escalation: 認証不能、公開gate失敗、既存save破損、または計測が戦闘式全面改変を要求する場合だけ停止する。
- Audit class: independent audit。戦闘の表示契約・バランス・公開を含むため、主実装者と別コンテキストでblocking 0を確認する。
- Subjective acceptance: 「楽しい」は未証明とし、予告表示契約、勝率、瀕死率、HP/MP消費、灯枯れ、撤退余地を機械実測する。実プレイヤー30分pilotは公開後の外部gateとして分離する。

## ②作業分解

| Item | Dependency | Execution path | Acceptance check | Status |
|---|---|---|---|---|
| A. 現状・契約監査 | brief/GDD/code | main + explorers | 不一致経路、現行sim欠落、dirty境界をfile:lineで確定 | completed |
| B. Work2 予告修復 | A | main | 固定seed 200件で全兆しを非拘束候補として固定、群れ逃走反映、灯文言と機構一致 | completed |
| C. Work3 計測器 | B | main | 中盤PT、HP/MP持越し連戦、灯枯れ/主代わり/語り部を測定 | completed |
| D. 計測後調整 | C | main | 測定証拠が必要性を示す場合だけ限定変更、既存回帰維持 | completed |
| E. 正典・全検証 | B-D | main | GDD/STATUS/WORKLOG、tsc/lint/data/Vitest/build/Playwright | completed |
| F. 独立監査・Ship Check | E | fresh reviewer + main | 契約全項目blocking 0、SHIP系判定 | completed |
| G. 公開 | F | main | 対象限定commit、main push、Actions success、公開HTTP/marker確認 | completed |

## ③完了済み

- 2026-07-26T12:00+09:00: ユーザーがA（Work2→Work3）と実装・デプロイを明示承認。
- 2026-07-26T12:20+09:00: 前段M47B遠征checkpointはローカルcommit、全Vitest 769、M47B Playwright PC/mobile 4/4まで完了。公開前の履歴整理を前提に本missionを開始。
- dirty worktreeは`src/ui/layout/shell.tsx`、`src/ui/layout/shell_fix_m29.css`、`tests/visual/narrative_m34.spec.ts`の3件。所有外として保持し、stage/commitしない。

## ④保留リスト

- 実プレイヤー30分pilot、初見8名、一世代5名、低性能物理端末は外部gate。機械計測によるローカル/公開完了を妨げないが、魅力度向上の効果主張には使わない。

## ⑤質問キュー

- なし。作業順とdeploy権限はユーザー回答済み。

## ⑥マイルストーン履歴

- M47C-0: Mission契約、Goal、6段階plan、Work2/3の並行読み取り監査を開始。
- M47C-1: 予告と実行が別RNG列になる4経路、士気逃走上書き、灯15%がUI専用で実機構は40%/0%境界であることをfile:lineで確定。
- M47C-2: 全兆しを非拘束候補へ変更し、逃走候補・灯40%/0%を単一情報源化。focused Vitest 20、Battle/Dungeon各5幅に合格。
- M47C-3: 中盤実Character fixtureと持越しsimを追加。初回監査で固定5戦と深度6を合成した非実在fixtureを撤回し、実マップの敵影数5/6/7/8/2をengine/simで共通化。400 seedの実帰還線floor 3で素手瀕死70.5%、戦術完遂100%を観測し、計測後X=60%を採用。敵数値変更なしでgate合格。
- M47C-4: 初回全gateはVitest 53 files/782、build、lint、data 0 errors、closure 69、manifest 9、Playwright戦闘15/15、灯5/5、M47B/AR1 13 pass/1 intended skip。初回独立監査のNO-SHIPを受け、実floor計測とcheckpoint参照検証を自己修復。修復後focused 4 files/47 testsは合格し、全gate再実行中。
- M47C-5: 修復後の型検査、lint、data 0 errors/既存warn 1、closure 69、manifest 9、全Vitest 53 files/783、production buildに合格。Playwrightは戦闘15/15、灯5/5、checkpoint 4/4、AR1 PC/mobile 9 pass/1 intended skip。
- M47C-6: 独立2系統がSHIP-with-notes/blocking 0。ローカル絶対パス入り未push履歴をautosquashし、指定dirty 3件をdiff hash一致で復元。M47B `10c5b35`、M47C `c6e06f6`をmainへpushし、Actions run `30188332927`のbuild/deployが成功。公開HTML/JS/CSSはHTTP 200、bundle `index-B_r6ojIm.js`で「行動候補」「確定ではない」「敵影が速まり」を確認した。

## ⑦次の一手

- 公開後の外部gateとして、初見8名・一世代5名・30分pilotを別途実施する。今回の実装・公開missionは完了。

## ⑧最終監査表

- **監査種別**: independent audit。初回NO-SHIPの3件を自己修復し、最終はSHIP-with-notes / blocking 0。
- ✅ Work2: 固定seed 200、候補DOM、灯境界、5幅に合格。
- ✅ Work3: 実floor由来の中盤連戦400 seed、tier3全11主、旧elite分離、主代わり4条件を測定。
- ✅ 調整判断: X=60%、戦術完遂100%。現行敵数値で合格したため一律調整を見送り。
- ✅ 回帰/実ブラウザ: 修復後53 files/783と影響範囲33 pass/1 intended skip。
- ✅ 独立監査/Ship Check: fresh 2系統でblocking 0。npm audit 0、公開差分/履歴の絶対パス・秘密・PII候補0。
- ✅ commit/push/deploy: M47B `10c5b35`、M47C `c6e06f6`、Actions `30188332927`、公開HTML/JS/CSSと3 markerを確認。

## ⑨terminal印

完了 — 2026-07-26T13:50+09:00。実装・検証・独立監査・main公開・HTTP確認済み。
