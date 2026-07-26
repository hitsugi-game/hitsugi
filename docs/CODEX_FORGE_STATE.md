# Codex Forge State — M51 出立seedによる夜藪変奏

## ①対象

- M51のダンジョン変奏runtime、save、UI、test、GDD
- 目的: 繰り返し遠征で内容が変わり、同じ遠征の再開では変わらない、安全で体感可能なダンジョンへ収束させる

## ②固定合格ライン

- 客観条件: 型、全271層到達性、同seed決定性、別seed差、save guard、全Vitest、lint、data、closure、manifest、production build、PC1280/mobile390実動がgreen。
- 主観条件は各4/5以上: A 地図差の体感、B 報酬/内容差と理解、C 決定論/引き直し防止/save、D 世界観/専用stage整合、E 操作快適性/進行安全。
- blocking: 進行不能、再読込引き直し、報酬/進行破壊、専用背景ずれ、反復しても実質固定。最大5round。

## ③ラウンド履歴

| Round | 判定 | 得点 A/B/C/D/E | Blocking | 要約 |
|---:|---|---|---:|---|
| 1 | FAIL | 4/4/3/5/4 | 1 | 新規seed遠征は合格圏。seed欠損を許すlegacy checkpointだけ内容RNGが再開時刻へ戻り、引き直せる |
| 2 | PASS | 4/4/5/5/4 | 0 | legacy固定地形を維持したまま安定内容seedへ接続し、異なるglobal RNGで4種の内容一致を独立確認 |

## ④blocking台帳

| ID | State | Consecutive unresolved | Closure evidence | Certifier |
|---|---|---:|---|---|
| `src/dungeon/run_variation.ts#dungeonTileRng/legacy-seedless-reload-reroll` | closed | 0 | 同じlegacy checkpointを異なるglobal RNGでcontinueし、宝箱・祠・確率事件・焚火候補が一致。focused 38件 | independent Round 2 |

## ⑤settled list

- `topology-four-reflections`: A=4のnon-blocking。128 seed×全271層の独立sweepで各階120以上のASCII差があり、POI/敵影差を含め合格圏。blocking閉鎖中は拡張しない。
- `single-seed-test-depth`: committed testは各階1seedだが、独立128seed sweep計34,688件で寸法・必須tile・全POI到達・宝箱1〜3の失敗0。回帰fixture追加はblockingのreload経路へ集中する。

## ⑥次の一手

- Forge合格。ローカル差分の公開は、ユーザーが明示的にデプロイを依頼した場合だけ行う。

## ⑦次ゴール候補

- Forge合格後、実プレイヤー比較で地形変化が弱い場合のみ、接続検証付き枝道生成を別ゴールとして検討する。

## ⑧terminal印

合格 — 2026-07-26T22:36:16+09:00。Round 2独立閉鎖でA/B/C/D/E=`4/4/5/5/4`、blocking 0。全54 files/789 tests、型、lint、data、closure 69、manifest 9、build、PC1280/mobile390 2/2に合格。
