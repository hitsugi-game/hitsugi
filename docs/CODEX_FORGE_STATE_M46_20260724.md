# Codex Forge State — M46 資質成長と戦果見立て（archive）

この記録は、M51 Forge開始時に固定状態ファイルを引き継ぐため退避したM46の完了状態である。

## ①対象

- `docs/CHARACTER_GROWTH_REWARD_FORGE_20260724.md`
- 目的: Fable5が旧saveと全戦闘オートを壊さず、資質連動levelと理解可能な戦果表示を実装できる設計へ収束させる

## ②固定合格ライン

客観条件: 現行型・計算・保存・戦闘報酬との参照整合、必須節・数式・移行・受入条件の欠落0、formula property checkと`git diff --check` green。

主観条件は各4/5以上: A 24か月世代交代との整合、B 育成判断と摩擦回避、C 戦果理解、D save/RNG/auto破綻耐性、E 実装・検証可能性。

blockingは旧save弱体化、予告と付与の不一致、手動/オート格差、成長選択性不足、検証不能な曖昧仕様。最大3round。

## ③ラウンド履歴

| Round | 判定 | 得点 A/B/C/D/E | Blocking | 要約 |
|---:|---|---|---:|---|
| 1 | REWORK | 5/4/3/3/3 | 2 | 成長本体は合格。報酬精算の一回性と眷属候補ごとの4%抽選規則が未定義 |
| 2 | PASS | 5/4/5/5/5 | 0 | plan/result/settlementの一回精算と、候補敵種ごとの4%眷属抽選を閉鎖 |

## ④blocking台帳

| ID | State | Consecutive unresolved | Closure evidence | Certifier |
|---|---|---:|---|---|
| `§8・§10・§15 / REWARD_SETTLEMENT_LIFECYCLE` | closed | 0 | `BattleRewardPlan/Result/Settlement`、planned→settled→continued、二action、Zustand同期guard、二重精算testを§8/§14へ固定 | independent Round 2 |
| `§8 chances / FAMILIAR_ROLL_CARDINALITY` | closed | 0 | 未所持一意敵種ごと4%、安定候補順、一候補一RNG、複数成功、`1-0.96^N`表示、候補数別testを固定 | independent Round 2 |

## ⑤settled list

- `plan-result-type-separation`: Round 1 non-blocking。Round 2でcarried/immediate/chanceとresultを型上も分離した。
- `auto-manual-side-effects`: Round 1 non-blocking。図鑑、称号、武功、事績、土地の記、眷属結果まで同値testへ追加した。

## ⑥次の一手

Forge合格。`$mission` 実装時は100-seed基準線→progression→save→reward settlement→UIの順を崩さない。

## ⑦次ゴール候補

- 合格後に `$mission` でprogression純粋関数、save migration、reward settlement、UI、100-seedの順に実装する。
- 実装後は `$kenshu` またはshipcheckで公開前監査を行う。

## ⑧terminal印

合格 — 2026-07-24T09:04:03+09:00。Round 2独立閉鎖確認で5軸5/4/5/5/5、2 blocking closed、軽量回帰11 tests、formula/property、diff-check合格。runtime実装・save変更・公開は未実施。
