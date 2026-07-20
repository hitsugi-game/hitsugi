# 物語・画像統合 baseline — 2026-07-20

この記録は`docs/NARRATIVE_VISUAL_INTEGRATION_PLAN.md`の実装前状態と、改善後に比較する直接証拠を固定する。ゲームコードへ変更を加えた記録ではない。

## 基準

- 対象commit: `478be96241124aa5c530acac2b768c8e1d9a7824`
- 正典URL: `https://hitsugi-game.github.io/hitsugi/`
- 監査対象: `story.ts`、`dreams.ts`、`gossip.ts`、`lore.ts`、`store.ts`、`Scenes.tsx`、既存CG
- 新規候補画像: `docs/visuals/story-v2/`の7点。現時点では配信未使用

## 実装前証拠

| ID | 証拠 | before | after gate |
|---|---|---|---|
| `NAR-P0-01` | `DreamEpScene` | 夢渡り弐〜終が全て`cg_kiro.jpg` | 7篇が固有画像。missing時だけ共通fallback |
| `NAR-P0-02` | 初回夢 / `nextDreamEpisode()` | 初回夢は星骸の谷依存、連作弐は死者1。さらに先行篇未解禁でも後篇のgen条件でskip可能 | 最初の看取り/星骸の谷の早い方で初回夢→次月以降に2→8。全境界fixtureで逆転0 |
| `NAR-P0-03` | `pendingScenes` | 月送りでlife/chapter/dream等が複数queueされ、後で読む状態がない | 同一月の強制全画面scene最大1、残りはdeferred、未読消失0 |
| `NAR-P0-04` | Intro / 初回夢 / 家業・技・神・形見・lore / ch4 / gsp12 | ch4前に到達できる複数surfaceで`汐里`を明示した後、ch4/gsp12の名の発見を再演する | 全早期surfaceは匿名、ch4最終開示beat/skip transactionだけでflag、gsp12は後続。M34 sentinel、legacy一度導出＋recap |
| `NAR-P0-05` | `FINALE_CHOICES.cut` / `ENDINGS.cut` / 夢8 | 表示は「斬る/刃で終わらせる」だが、結果は刃を納め名を読んで看取る | 内部ID`cut`維持、表示は`送る`。夢8/選択/結果/epilogueの動詞一致 |
| `NAR-P0-06` | 夢CG / `.scene-bg-img` | 横長1672×941を縦長390×844へcoverすると約26%幅しか残らず、複数焦点を保持不能 | 360/390/768pxは前面16:9 contain、台詞/controls分離、篇別全焦点が同時可視 |
| `NAR-P1-01` | `tryUnlockGossip()` / `GossipModal` | 郷の声はchronicleと一覧に追加されるが、郷の実NPCがその場で話さない | 最新1件を対応NPCが一度発話、一覧でも再読可能 |
| `NAR-P1-02` | Finale | 3択前に実save由来の家族史が返らない | 固有名/形見/地域の最大3件を表示、空data fallbackあり |
| `NAR-P1-03` | 主要旅程 | 長文scene外の本編導線が地域lore/一部gossipへ偏る | 主要6系統以上に3〜20秒の残響/発見 |

## 既存物語の数量と役割

- 本編章: 5。
- 夢: 初回1＋連作7。
- 郷の声: 18。
- 地域縁起: `intro/stir/core/requiem`＋任意`bossPrelude`。
- 結末: cut/save/inheritの3。

数量を増やすことを改善gateにしない。重複、順序、見せる場所、家族史への接続を検証する。

## 新規画像の客観検査

- [Story v2 manifest](../visuals/story-v2/README.md)にID、対応篇、寸法、bytes、SHA-256、prompt要約、目視採否がある。
- 7点すべて1672×941 JPEG、各500KB未満。
- 人物同一性の基準は`boss_shiori.jpg`と`boss_gentou.jpg`。画風の基準は`title_key.jpg`。
- 画像内文字、UI、logo、watermarkを物語情報として使用しない。

## 改善後に保存する証拠

1. 夢順序の全境界unit test。初回夢未読＋死者1、星骸未討伐＋死者1、先行篇未解禁＋後篇gen成立、同一月連続を含む。
2. `seen/queued/completed/deferred`のreload round-trip。
3. 360/390/768/1280pxの夢2〜8 screenshot。360/390/768pxは前面16:9 `contain`のcomputed style、natural ratio、篇別全焦点の同時可視、scene controlsとの矩形交差0を記録する。
4. 画像404/画像OFF/低速networkのfallback capture。
5. `Home → 出立 → 石碑 → 主戦 → 帰還 → 郷人`の旅程動画またはstep log。
6. 初見5人の理解task。玄冬の欲求、汐里の選択、最終問い、主の戦う理由を回答させる。
7. Finaleの空save相当/1世代/10世代/形見なし/死者なしfixture。
8. 三結末のbutton順、サイズ、focus、選択可否が同格であるDOM測定。
9. Title/HomeのLCP baseline/after。12画像（UI5＋夢7）を初期preloadしていないnetwork log。
10. Intro/家業/技/星契り/鍛冶/蔵/初回夢/夢2〜3/gossip 11/灯ノ御山core/ch4最終頁直前のE2Eで、DOM/accessible name/alt/chronicleの`汐里`0件。legacyは`ch4 only / gossipIndex 11・12 / shioriPhase / endingType 0・1・2 / cleared / 全偽`をv1/v3/v4で検査し、post-M34 v4は`sentinel=1 / ch4 queued / incomplete / reload`で実名/recap 0・未完了再開を検査する。
11. 夢8、選択label/desc、結末beats、epilogueを3branchで照合し、`送る/救う/継ぐ`の表示動詞と実行/結果の一致を検査する。

## 停止条件

- 夢が逆順、重複、skip後消失のいずれかを起こす。
- 画像追加でscene操作、字幕、主CTAが隠れる。
- 物語を読まないと攻略情報や結末選択を失う。
- 過去行動によって結末がlockまたは視覚的に推薦される。
- 1sessionに強制長文sceneが連続し、後回しにできない。
- 新画像を初期bundleへ一括preloadし、Title/HomeのLCPを悪化させる。
- ch4より前に汐里の実名がuser-visible本文へ出る、またはgsp12がch4より先に出る。
- `cut`分岐の画面表示が「斬る」のまま、または選択動詞と実際の結果が一致しない。
- 360/390/768pxでCGを`cover`正本として使い、篇別の人物/物体が一つでも画面外へ欠ける。
