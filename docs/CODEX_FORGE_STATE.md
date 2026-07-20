# Codex Forge State — M34 物語・画像統合

## ①対象

- `docs/NARRATIVE_VISUAL_INTEGRATION_PLAN.md`
- `docs/visuals/story-v2/README.md`と夢渡りCG候補7点
- `docs/qa/narrative-visual-baseline-20260720.md`
- `docs/CODEX_MASTERPLAN_DRAFT.md`、`docs/GDD_v3.md`、`docs/CODEX_HANDOFF.md`、`docs/STATUS.md`、`docs/WORKLOG.md`のM34関連記録
- 目的: Claude Code / Fable 5が正典を壊さず、物語をプレイ全体へ統合し、固有CGを快適に実装できる計画packへ収束させる

## ②固定合格ライン

客観条件:

1. 既存正典と矛盾0。
2. 主要プレイヤー動線の随所に物語を置く画面、状態、短文、分岐、testが実装可能な具体度。
3. 7画像が実在し、各夢への対応、寸法、hash、表示方式、fallback、preload方針を追跡可能。
4. 夢順序、scene過密、選択と家族史の接続に明示受入条件。
5. blocking defect 0。

主観条件は各4/5以上: A プレイヤー固有の家族への愛着、B 謎の牽引力と伏線回収、C 世代交代の必然性、D 随所で見せる快適性、E 画像のHITSUGI固有性と物語対応。

blockingは、正典矛盾、実プレイ未接続、主要画像不足/反復、選択と結果の断絶、Claude Codeが判断できない抽象指示とする。最大5round。

## ③ラウンド履歴

| Round | 判定 | 得点 A/B/C/D/E | Blocking | 要約 |
|---:|---|---|---:|---|
| 1 | REWORK | 5/3/5/4/4 | 3 | 汐里名の開示順、`cut`表示動詞と結果、縦長mobileの画像fitを限定修正する |
| 2 | REWORK | 5/3/5/4/4 | 1 | 結末動詞とmobile fitは閉鎖。Intro/家業/神/装備/技/loreの実名露出とlegacy導出を限定修正する |
| 3 | REWORK | 5/3/5/4/4 | 1 | 全露出面は網羅。ch4冒頭/完読条件の矛盾と新旧v4判別sentinelだけを限定修正する |
| 4 | PASS | 5/5/5/4/4 | 0 | ch4最終頁の原子的開示、M34 sentinel、legacy一度導出、post-M34未完読reloadまで閉鎖 |

## ④blocking台帳

| ID | State | Consecutive unresolved | Closure evidence | Certifier |
|---|---|---:|---|---|
| `narrative/reveal-shiori-name` | closed | 0 | Round 4: 匿名早期surface、ch4最終頁/skipの原子的開示、sentinel、legacy一度導出/recap、全fixtureを確認 | independent Round 4 |
| `finale/cut-verb-result` | closed | 0 | Round 2: §7とN3で内部`cut`/表示`送る`/夢8/選択/結果/branch testが一意 | independent Round 2 |
| `story-visual/mobile-fit` | closed | 0 | Round 2: 360/390/768px前面16:9 contain、台詞分離、全焦点/矩形/人間採否を計画・manifestで確認 | independent Round 2 |

## ⑤settled list

- `trigger-union`: non-blocking。N2着手前に固定する実装詳細で、今回roundの修正対象外。
- `resonance-edge-cases`: non-blocking。N3着手前に固定する実装詳細で、今回roundの修正対象外。
- `dream4-metaphor-and-descriptions`: non-blocking。asset採用前に確定するcopy詳細で、今回roundの修正対象外。
- `dream03-textlike-mark`: non-blocking。左端石碑の文字様模様はruntime採用前の人間採否/retouch候補であり、現計画と7篇対応を阻害しない。

## ⑥次の一手

Forgeは合格。Claude Code / Fable 5へ`docs/NARRATIVE_VISUAL_INTEGRATION_PLAN.md`のPhase N0だけを渡し、N0の直接証拠が緑になるまでN1画像統合へ進まない。

## ⑦次ゴール候補

- Phase N0: 夢順序/queue/完読/後回し、汐里名の開示、結末動詞、legacy/post-M34 migration fixtureを実装・検収する。
- Phase N1: N0合格後だけ固有CG7点をruntimeへ採否し、mobile全景/性能/画像404を実機検証する。

## ⑧terminal印

合格 — 2026-07-20T18:48:06+09:00。Round 4独立評価で全客観条件PASS、5軸5/5/5/4/4、blocking 0、台帳3件closed。
