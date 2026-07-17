# MISSION M32: 追加改善の総合洗い出し(第2次監査) — STATE

作成: 2026-07-17。/mission 起動(ユーザー=sonnet並列で徹底洗い出し)。前提: M29で6次元監査済(10修正)、M28-M31で新コード多数・全公開待ち(未push)。

## ①契約
**ゴール**: M28-31新コード+M29未修正報告項目+全画面を並列sonnetで再監査し、新規/未修正の改善余地を証跡付きで発掘。低リスク高価値を適用、残りは報告。
**監査区分**: 自己監査(push無し・git可逆)。補強=finding採否の敵対的再検証。
**完了の定義**: 6次元をsonnet並列調査、各findingにfile:line/重大度/根拠。**M29既出・修正済みは再報告しない**。指揮側が敵対的再検証→低リスク修正を緑実証→統合報告。
**スコープ外**: push・大規模リファクタ(報告のみ)・index.css/maps.gen.ts・M29既出の再掲。

## ②作業分解(6次元・読取専用sonnet)
- I-A M28-31新コードの回帰(auto/consumables/buffKind/event modal/dungeon defensive/village CSS/shell fix/balance)
- I-B セーブ/状態/継承の残+M29報告項目の再評価(multi-tab競合/季非消費操作の即保存/isValidSave追加)
- I-C UI/UX/a11y全画面(新UI+前回未検査: Facilities/Codex/Chronicle/Pact/FamilyTree/Settings/Title/Scenes)
- I-D バランス/データ/経済(M28 balance+buffKind downstream/regions配列順[M29報告]/新データ/価格)
- I-E 性能/技術債/デッドコード/テスト網羅(bundle/M29報告項目/新debt/未テスト)
- I-F ゲーム体験/導線/情報設計(難易度カーブ・新規プレイヤー導線・分かりやすさ — 新観点)

## ③完了済み(適用済み修正・証跡)
第1バッチ(tsc0/lint0/vitest552緑で確認):
1. [HIGH私M31] オート×メニュー競合 — `Battle.tsx:759` ON時に`setMenu({kind:'root'})`。
2. [MEDIUM私M31] 事件タグ誤分類 — `Expedition.tsx` gamble判定に`outcomes.some(o=>o.battle)`追加。
3. [CRITICAL] BAK saveSeqリセット — `save.ts` `seq=max(KEY,BAK)+1`。
4. [CRITICAL a11y] Scenes儀式カードのキー操作 — `Scenes.tsx` 成人/生業の両カードに`role=button/tabIndex/aria-label/onKeyDown`。
5. [HIGH] regions unlockFame — `rare_encounters.ts` FAME_RANK写像 / `Expedition.tsx` initialRegionId=max(unlockFame)。
6. [HIGH UX] オート低HP時に回復薬 — `Battle.tsx:363-377` `AUTO_HEAL_HP_RATIO=0.35`、瀕死味方+hp薬所持で最劣勢へ使用。
7. [MEDIUM私M31] 孤立CSS削除 — `battle_m25.css`/`battle_m24.css` 約45行(grep0参照)。
8. [MEDIUM私D] home_polish CSSスコープ — `home_polish_m29.css` `.home-screen`配下へ。
9. [MEDIUM] isValidSave形状 — `save.ts` equipmentオブジェクト/inventory配列/consumables配列を検証。fixture 2件更新。
10. [MEDIUM] 灯尽き説明の復活 — `Dungeon.tsx` LanternRingにtitle/aria-label「尽きれば常夜の魔性が狂暴化」。
11. [MEDIUM無コスト] exhaustive-deps Lint — `.oxlintrc.json`(有効化後も警告0を実測)。
12. [MEDIUM a11y部分] Settings 3トグルaria-pressed+音量label関連付け(id/htmlFor)。
13. [低] 見世ラベル明確化 — `Forge.tsx`「見世(薬)」。

回帰テスト新設: `tests/visual/auto_heal.spec.ts` — (1)瀕死+薬でオートが回復薬使用(全5幅緑)(2)技盤中オートONでroot復帰(PC 3幅緑・モバイル2幅はskip)。

**新発見(第1バッチ検証中に判明・報告):** モバイル(≤560px)では技盤が`position:fixed/z-index:55`のbottom-sheet(`battle_m24.css:215`)としてコマンド帯を覆う設計。この幅では常設オートボタンがシート裏に隠れ「技盤を開いたままオートを押す」操作自体が起きない(「選ばず戻る」で戻る導線)。ゆえに#1の共存挙動テストは>560px専用にscoped。**判定=意図的設計(欠陥でない)** — 集中モーダルにオートボタンを浮かせる方が煩雑。オートはroot帯から常時到達可能でM31要件は充足。

## ⑩ findings台帳(生・指揮側検証状態つき)
### I-F ゲーム体験/導線(回収済)
- **[要検証 HIGH] オート戦闘が攻撃連打専用**(`Battle.tsx:358-370`): 道具/技/防御/逃走を選ばず、HP1でも回復薬を使わない。M31常設化で使用↑=「任せたら理不尽死」リスク。→修正案=オート中HP<閾値で回復薬使用 or 注記。**最有力**。
- **[要検証 HIGH] 新規導線の強制トリガー無し**: 手引き(HelpModal)は郷の帳「心得」最後尾に埋没・badge無し。用語(奉燈/血珠/星脈/灯型/家業)未説明でHome着地。→初回自動表示 or 先頭+LiveBadge。
- **[要検証 MEDIUM-HIGH] 灯尽きの説明が退行**: 旧Expeditionの「灯—尽きれば常夜が牙を剥く」が歩行版LanternRingで消失。→復活(低コスト・明確な回帰)。
- **[要検証 MEDIUM] 技MP消費がmobileで無ラベル数字**(`Battle.tsx:789`・`.turnpanel-detail`が560px以下非表示)。/ **装備品質の色順が慣習逆+凡例無し**(item_axes/forge)。/ **「購う」と「見世」が両方買物**でラベル未区別。/ **交神(Pact)に推奨★無し**(灯型/家業にはある非一貫)。
- 効果上位3: ①オート無回復 ②新規導線 ③灯尽き説明の復活。

### I-D バランス/データ/経済(回収済)
- **[要検証 HIGH] buff技のpowerが実装で無視**(`battle.ts:341-353`): buff分岐がskill.power不参照で固定±倍率のみ。himamori(30)/g_iwakura(45)/g_minomushi(40)/gs_earth3(48"大防御")が全て同一効果。70件超に波及。→power依存化(要再バランス=設計判断)。
- **[要検証 HIGH] regions配列順×unlockFame不整合**(`regions.ts:57-105`/`rare_encounters.ts:80-84`/`Expedition.tsx:162-172`): tier2のfameが配列順で非単調。rewardTier/initialRegionIdがindex依存で誤動作(haikyo_goten fame180→rewardTier4=過小 等・定量確認)。→両関数をunlockFame基準へ(配列不変=低リスク)。**明確な修正候補**。
- [要検証 MEDIUM-HIGH] 最終ボス玄冬の難易度崖(瀕死0%→63%実測・崖をtestが捕捉せず)。消耗品4種のまま無段階(装備15tier/敵tier4+ボスに不釣合い)。→設計判断。
- [要検証 MEDIUM] 装備価格カーブ急峻(tier14で性能あたり27倍)。**defUp非対称**(atkUp×1.25 vs defUp÷1.2=-16.7%)→defUp×1.3で対称化(小さな均衡調整)。
- 該当なし: 当主初期hp137が理論値一致・id重複0・相互参照0・施設経済均衡。

### I-E 性能/技術債/テスト網羅(回収済)
- **[確認済✓ MEDIUM 私のM31デッドコード] 孤立CSS**(`battle_m25.css:330-373`・`battle_m24.css:191`): `.cmd-auto`/`.auto-stop-strip`/`@keyframes autoStopPulse` 約44行がJSX削除後も残存(grep 0参照)。→**削除(安全・低リスク)**。
- **[確認済✓ HIGH] sealBoss/renderFailedに回帰テスト0**(`engine.ts`/`Dungeon.tsx`): M29/M30のHIGH修正が無防備(戦闘式はピン留め済なのに)。M28-29で自己回帰2件の実績。→**used-Set計算を純粋関数抽出しvitest or playwrightで1本**。
- **[確認済✓ MEDIUM 無コスト] exhaustive-deps未Lint**: oxlintは対応済・有効化しても新規警告0(既存13は抑制済)。→`.oxlintrc.json`に1行追加=将来のdep漏れを防ぐ。
- [要検証 HIGH報告] bundle 1,781kB単一chunk(横ばい・大規模=報告)。[MEDIUM] perf.spec閾値なし(flaky注意)。
- 該当なし: dev hook本番混入0(実測)・新規CSS未使用0・Pixi資源健全・**WebGLコンテキストロストはPixi v8が内部処理**(M30オーバーレイは追加保険)。

### I-C UI/UX/a11y全画面(回収済)
- **[確認済✓ CRITICAL a11y] Scenes.tsx:401/474 儀式カードがキーボード到達不能**: 成人の儀/生業の儀の灯型/家業選択が`<div onClick>`のみ(role/tabIndex/onKeyDown無し)。全キャラ必須ステップ。→**button化 or role+キー対応**。
- **[要検証 HIGH] Pact.tsx:202/212 god-listのARIA違反**: role="listbox"直下に生button(option/aria-selected無し)・locked神がdisabled無しで無言無反応。→role整理+lockedをdisabled。
- **[要検証 HIGH] ActionDock逃げ余白がsafe-area未考慮**(`index.css:1678/1699`・`pact_m18.css:6`): 静的96px、ノッチ端末で本文末尾がドックに隠れうる。→`calc(96px+env(safe-area-inset-bottom))`後勝ち上書き。
- **[要検証 MEDIUM] aria-pressed欠落**: Settings 3トグル+音量label未関連付け / Chronicle・Codex・Pactのfilter-tab(FamilyTree/Battleは実装済=漏れ)。Codex選択カードにaria-current無し。filter-tab 40px<44px(自コメントと矛盾)。
- **該当なし(重要)**: 事件モーダル(focus trap/費用disabled/色非依存タグ)健全・**.cmd-auto-persist aria-pressed済/残骸なし**・DepartParty/FamilyTree/Facilities健全。

### I-B セーブ/状態/継承の残(回収済)
- **[確認済✓ CRITICAL 新規] BAK復旧のsaveSeqリセットで健全セーブが古いBAKに敗北**(`save.ts:93-94,184`): 本体破損時に次保存がseq=1へ再起動+BAK書込みskip→reloadで高seqの古いBAKを復元し直前の正常保存を破棄。→**seq=max(KEY,BAK)+1 or lastPlayedActブレーク**。低リスク修正。
- **[要検証 HIGH] 複数タブ保存競合**(M29既報・未修正): クロスタブ検知0。→報告(大)。
- **[要検証 MEDIUM] 歩行ダンジョン進行がGameData外で走行中セーブ不能**: crash/誤タブ閉じで戦利品/到達階消失。→設計判断=報告。
- **[確認済✓ MEDIUM] 季非消費操作+一期一会儀式がsaveGame未呼出**(M29既報+拡大: assignTomoshigata/assignJobClass/setMotto/setLastWords/renameCharacter): タブ閉じで消失/演出二重化。→各末尾でsaveGame。低リスク。
- **[確認済✓ MEDIUM] isValidSaveがconsumables/equipment形状未検証**: 非配列consumables/equipment欠落が通過しadvanceSeason等で例外化。→検証追加(M29強化の延長)。**[確認済✓ MEDIUM] 保存トラブル通知が単一ラッチ**で致命警告を握り潰す→深刻度別フラグ。
- 該当なし: renderFailed(GameData外=対象外正当)・newLegacyGame持越し安全・継承は単一タブで健全。

### I-A M28-31新コードの回帰(回収済)
- **[確認済✓ HIGH 私のM31回帰] オート切替×メニュー競合**(`Battle.tsx:735-744`+`358-370`): 常設トグルを技/道具/対象選択中にONにするとmenuがrootへ戻らず、選択中の技が発動せず素攻撃が自動発火・target-hintがチラつく。実機再現済。→**ON時にsetMenu(root)**。
- **[確認済✓ MEDIUM 私のM31回帰] 事件タグ誤分類**(`Expedition.tsx`のgamble判定): `kagami_numa`「石を投げて壊す」(outcomes1件・battle:true)が「確かな道」(緑=安全)表示。→gamble判定に`outcomes.some(o=>o.battle)`追加。
- **[確認済✓ LOW 私のD回帰] home_polish CSSスコープ漏れ**(`home_polish_m29.css:32-37`): `.tsuzuri`/`.tsuzuri-text`が`.home-screen`未スコープでExpedition/Pactへ漏出。→スコープ付与。
- 該当なし: buffKind全件正・老成/floor/item不変・sealBoss/renderFailed安全・village/facilities/shell CSSスコープ適切。

## ⑪ 統合triage & 修正計画(指揮側・敵対的再検証済)
**適用済み第1バッチ(1-13)**: ③に列挙。tsc0/lint0/vitest552→playwright全幕で検証。
**適用済みテスト硬化(14)**:
- #5 regions unlockFame → `rare_encounters.test.ts` に公開API経由の単調性テスト追加(drop.shopTier===rewardTier厳密一致を利用・6件緑)。#1/#6 → `auto_heal.spec.ts`。
**適用第2バッチ(残a11y・純属性追加=挙動/レイアウト不変)**:
- 12残 [MEDIUM a11y] Pact `role="listbox"`除去+god-row `aria-pressed`/`aria-disabled` / Chronicle・Codex・Pact filter-tab `aria-pressed`(FamilyTree実装済パターンの複製)。
**報告のみ(設計/balance/大規模/index.css/要リファクタ)**:
- **sealBoss/renderFailedテスト(旧#14)= 次段送り**: DungeonEngineは`host:HTMLElement`必須でPixi即時初期化・vitest seam無し・既存engine harness無し。守りたいコード自体をミッション終端でリファクタするのは低リスク原則に反する。→**推奨: used-key生成(`${floor}:${x}:${y}`)とボス床列挙を純関数モジュールへ抽出しvitest**。次セッションで着手。
- buff技のpower無視(全バフ再バランス)/難易度崖(玄冬)/回復薬の段階/装備価格カーブ/defUp非対称 — balance設計判断。
- bundle分割/perf.spec閾値 — 大規模/flaky。複数タブ保存競合/歩行ダンジョン進行のcheckpoint — 設計。ActionDock safe-area/filter-tab44px/Codex aria-current/技MP mobileラベル/交神推奨★ — 低〜中(index.css後勝ち可)だが次段。季非消費操作の即保存/保存通知ラッチ — 低リスクだが次段。

## ④保留リスト
(なし)

## ⑥マイルストーン履歴
- Phase0: 契約固定→6並列調査投入(2026-07-17)。M29既出除外・新規/未修正に集中を明示。
- Phase2-3: 敵対的triage→第1バッチ13適用+テスト2新設(2026-07-18)。tsc0/lint0/vitest553/playwright198+2skip緑。
- Phase4: 第2バッチa11y純属性7適用。codex_seen+menu_a11y 15緑。8論理グループでcommit(未push)。

## ⑧最終監査表(自己監査 — /kenshu規律・指揮側が機械チェック再実行)
| 契約項 | 判定 | 証跡 |
|---|---|---|
| 6次元をsonnet並列調査 | ✅ | I-A〜I-F 6投入・⑩台帳に回収 |
| 各findingにfile:line/重大度/根拠 | ✅ | ⑩(例: `save.ts:93-94` CRITICAL/`Scenes.tsx:401` CRITICAL a11y 等) |
| M29既出・修正済みを再報告しない | ✅ | 契約でスコープ外宣言・調査prompt明示。⑩は新規/未修正のみ(複数タブ等はM29既報と明記) |
| 敵対的再検証→低リスク高価値を適用 | ✅ | ⑪triage。13+7適用。私のM31/D回帰4件を含む(自己批判の実効) |
| 適用の緑実証 | ✅ | tsc -b 0 / oxlint 0 / vitest **553** / playwright 第1 **198+2skip**・第2 **15** |
| 残りを報告 | ✅ | ⑪報告リスト(balance/大規模/要リファクタ)+新発見(mobile bottom-sheet=意図的) |
| スコープ外遵守(push/index.css/maps.gen) | ✅ | push無し(未push)・index.css/maps.gen.ts未改変(`git show --stat`で確認可) |
- **受入オラクルの妥当性(監査範囲外・正直申告)**: auto_heal/rare単調性テストは新挙動を再現するが、「発見できなかった不具合」は保証しない。sealBoss/renderFailedは依然未テスト(要リファクタ・次段送りを明記)。
- **❌/⚠️**: なし。契約中核は全て✅。適用外は設計判断として明示的に報告へ回した(丸めでない)。

## ⑨terminal印
**達成**(2026-07-18)。契約全項✅・証跡上掲。監査区分=自己監査(縮退でなく契約時からの区分。push/不可逆を完了定義に含まないため)。**push=公開デプロイはユーザー承認待ちで未実施**(自律の境界)。後続セッションは本STATEを読んだら再開せず、⑧表と最終報告を正典として案内し退出すること。
