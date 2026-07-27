# Codex Forge State — M56 星籤「三星択一」・主戦精密化 設計正本

## ①対象

- 成果物: `docs/GACHA_BALANCE_PRECISION_PLAN_20260728.md`
- 目的: 無課金収集の選択価値、確率説明、主戦対処差、保存安全性を実装者によらず同じ結果になる正本へ収束させる

## ②固定合格ライン

- 客観条件: 必須14節、既存参照path実在、数値・確率・保存契約の内部矛盾0。
- 主観5軸は各4/5以上: A 選びたくなる収集体験、B 確率・保証・救済の信頼性、C 主戦の対処差と公平性、D 実装・計測可能性、E 保存整合・引き直し/二重反映耐性。
- blocking: 客観失敗、3点以下、または実装結果を変える曖昧さ。最大5round。途中で基準を緩めない。

## ③ラウンド履歴

| Round | 判定 | 得点 A/B/C/D/E | Blocking | 要約 |
|---:|---|---|---:|---|
| 1 | FAIL | 4/4/4/3/3 | 6 | 新規path表記、主数、救済snapshot、冪等ledger、主parameter、計測oracleが未確定 |
| 2 | FAIL | 5/4/3/3/3 | 4 | 元6 ID中5件CLOSED。計測oracleが2ラウンド連続未解消で停滞条件に到達し、数値・claim原子性・validatorに新規3件 |

## ④blocking台帳

| ID | State | Consecutive unresolved | Closure evidence | Certifier |
|---|---|---:|---|---|
| `§11 実装候補の3テストパス / missing-reference-paths` | closed | 1 | [既存]13件は全実在、未作成3件は[新規作成]へ区分 | Round 2 independent |
| `§2.2・§8.2・§9.2 tier3主数 / boss-count-mismatch` | closed | 1 | §2.2を11体中10体へ明確化し、regionsと一致する11 enemyIdを列挙 | Round 2 independent |
| `§4.3・§4.4・§5 pending報酬 / rescue-snapshot-undefined` | closed | 1 | 一籤一救済、10回保証優先、candidate reward/rescueのopen snapshotを固定 | Round 2 independent |
| `§5 open/claim冪等契約 / idempotency-ledger-undefined` | closed | 1 | expected draw、単調drawNumber、lastReceiptでhistory件数非依存の再送拒否を固定 | Round 2 independent |
| `§8.2 tier3主設定 / boss-parameters-undefined` | closed | 1 | 11主のID、周期、予告、強手、対処値と確定兆しstateを固定。ただし共通閾値との新規矛盾は別ID | Round 2 independent |
| `§9.2 400-seed gate / measurement-oracle-undefined` | unresolved | 2 | 4 policyと式は追加したが、auto三方針の適用単位と危険手のrun間集約が未定義 | Round 2 independent |
| `§8.1・§8.2・§10 / stop-threshold-conflict` | unresolved | 1 | §8.1/§10の共通12%と§8.2の主別10/11/12%が競合 | Round 2 independent |
| `§5 claim / claim-commit-atomicity-undefined` | unresolved | 1 | openはsave-firstだがclaimの同順序・失敗時rollbackが明文化されていない | Round 2 independent |
| `§4.3・§5 validation / rescue-id-overlap-contradiction` | unresolved | 1 | candidate内guaranteed IDは正常だが「救済ID重複」の拒否対象が未定義 | Round 2 independent |

## ⑤settled list

- 位階率60/28/10/2、獲得頻度、10/20/50保証、全戦闘オート、有償なし、限定なし、星札非必須は固定前提で再審議しない。
- `nextStarLotteryOdds()`丸め、星札の短期価値、meterのa11yはRound 1 non-blocking。blocking修正へ混ぜず、該当実装phaseの受入候補として残す。
- runtime実装、画像生成、commit、push、deployは今回の単一成果物Forgeの対象外。

## ⑥次の一手

- 同じ`measurement-oracle-undefined`が2ラウンド連続未解消のため、このForge runでは修正を続けない。代替はM56の「protocol・数値・oracle appendix」だけを別成果物にし、auto三方針×400 seedの行列、危険手集約式、stop threshold単一情報源、claim save-first、validatorの許容/拒否集合を先に固定してから正本へ統合する。

## ⑦次ゴール候補

- M56 Forge再開前の限定ゴール: `docs/M56_PROTOCOL_ORACLE_APPENDIX_20260728.md`へ残る4 IDだけを収束させる。合格後にM56正本へ統合し、その後Phase Aへ進む。

## ⑧terminal印

停滞 — 2026-07-28T03:24:00+09:00 — `measurement-oracle-undefined`が2ラウンド連続未解消。元6 ID中5件は閉鎖したが、新規blocking 3件を含む計4件が残存
