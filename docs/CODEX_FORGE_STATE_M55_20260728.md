# Codex Forge State — M55 探索体験強化「灯跡の夜藪」設計正本（完了記録）

## ①対象

- 成果物: `docs/DUNGEON_EXPLORATION_APPEAL_FORGE_20260728.md`
- 目的: M54のmap-native探索を、実装可能・測定可能で本作固有の魅力設計へ収束させる

## ②固定合格ライン

- 客観条件: 必須節を全て持ち、参照pathが実在し、GDD v3 §8.37、M51、M47Cと矛盾しない。
- 主観5軸は各4/5以上: A 世界観固有性、B 探索動機、C 操作明瞭性、D 地域展開性、E 実装可能性。
- blocking: 大型探索画像再導入、未踏/報酬漏洩、決定論・進行・既存数値破壊、音/色だけの必須情報、pilot前の40地域量産、検証不能。最大3round。

## ③ラウンド履歴

| Round | 判定 | 得点 A/B/C/D/E | Blocking | 要約 |
|---:|---|---|---:|---|
| 1 | FAIL | 4/5/5/5/3 | 4 | 報酬tier side-channel、発見状態の所有、性能計測環境、観察oracleが未定義 |
| 2 | PASS | 4/5/5/5/4 | 0 | 別の独立評価者が4 IDを全てCLOSEDと認定。runtime実装完了ではなく設計正本の合格 |

## ④blocking台帳

| ID | State | Consecutive unresolved | Closure evidence | Certifier |
|---|---|---:|---|---|
| confirmed-reward-tier-side-channel | closed | 1 | §9.1で未開封cueをtier非依存化し、reward情報を持たない純関数とtier差同一testを固定 | Round 2 independent |
| discovery-state-ownership-missing | closed | 1 | §4.1で`discoveryV1`を正本化し、delta、safe checkpoint、rollback、migration、BAK testを固定 | Round 2 independent |
| benchmark-environment-undefined | closed | 1 | §15でbrowser/profile/10秒scenario/反復/fps・p95/M54同job比較を固定 | Round 2 independent |
| observation-oracle-undefined | closed | 1 | Phase Eで対象13名、5課題、分母、合否値、重大摩擦、未達差戻しを固定 | Round 2 independent |

## ⑤settled list

- M54の探索ラスター0枚、M53の戦闘一枚背景、M51のrunSeed/checkpoint、全戦闘オートは固定前提であり、Forge中に再審議しない。
- 血脈・世代差の探索中作用、canvasのscreen reader同等経路、帰還記録3件の優先・重複規則はnon-blockingとして実装phaseへ送る。
- reward cue相関、safe checkpoint event matrix、性能baseline失効、観察採点規則は実装時のrequired mitigationとする。

## ⑥次の一手

- ユーザーが実装を依頼した場合のみ、正本§21どおりPhase A「読める構図」を単独missionとして開始する。

## ⑦次ゴール候補

- M55 Phase A: camera clamp、地図占有率、未踏輪郭、暗部率、HUD交差を3幅・map四隅・灯3状態で実装検証する。

## ⑧terminal印

合格 — 2026-07-28T02:11:50+09:00 — Round 2 independent closure、A/B/C/D/E=4/5/5/5/4、blocking 0
