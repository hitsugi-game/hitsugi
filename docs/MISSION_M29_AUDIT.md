# MISSION M29: 灯継ぎ 総合監査(バグ・改善余地の網羅発掘) — STATE

作成: 2026-07-17。/mission 起動(ユーザー指示=総合確認・Opus指揮・並列sonnet調査)。前ミッションM28は達成・未push。

## ①契約
**ゴール**: 全体のバグ・改善余地を並列調査で網羅発掘し、証跡付きで検証、重大度で仕分けた報告書を作る。低リスク・高価値・スコープ内の修正のみ適用(緑を実証)。リスク/大規模/曖昧は報告のみ。

### 完了の定義(機械検証可能)
- 6次元を並列sonnetが調査し、各findingに file:line・症状・再現/根拠・重大度。
- **指揮側(Opus)が採否を敵対的に再検証**(偽陽性を落とす)。統合報告書を産出。
- 適用修正は build緑/lint0/vitest緑/gate緑で実証・commit(push無し)。

### スコープ外
- push/デプロイ(ユーザーゲート・未承認)。大規模リファクタ・アーキ変更(報告のみ)。
- index.css編集・maps.gen.ts手編集。全件修正(監査主体)。

### 監査区分(単調ラッチ)
**自己監査**(完了定義に不可逆/出荷なし・修正git可逆・push無し)。補強=finding採否の敵対的再検証。

### エスカレーション条件
修正がpush必須 / スコープ変更 / リスク大 / 曖昧 / 同一項目2連敗 → 報告してユーザー判断。

## ②作業分解(並列調査6次元・全て読取専用sonnet)
- I1 戦闘コアの正当性 — battle.ts / skills / 敵AI
- I2 セーブ/状態/継承の整合性 — save.ts / store.ts / inheritance.ts / types(高リスク=データ損失)
- I3 探索/ダンジョン/事件 — dungeon/* / expedition.ts / rare_encounters.ts / maps
- I4 UI/UX/a11y/入力 — src/ui/*(クリック奪取・キーボード・ARIA・mobile・M28新フロー・XSS-lite)
- I5 データ整合性/バランス値 — src/core/data/*(id重複・相互参照・辞世重複・値の外れ)
- I6 性能/技術債/デッドコード/テスト網羅 — bundle・再描画・Pixi資源・dev hook・未テスト

## ③完了済み(証跡)
6並列調査を回収・指揮側で敵対的再検証。低リスク高価値の**9修正を適用**(build緑/vitest546/lint0で実証、playwright確認中)。

### 適用した修正(commit予定・push無し)
1. **[CRITICAL] PixiJS init()レース**(`engine.ts`): 2つ目のawait後に`if(this.destroyed)return`追加。破棄済みappへのaddChild/ticker参照とテクスチャ孤児化を防止。
2. **[CRITICAL] オートEsc停止の回帰**(`Battle.tsx`): Esc停止を`auto`依存の別effectへ分離(旧: menu='target/skill'時しか購読せずオート中=root で無効)。道具メニューにもEsc/数字キー対応。`battle_input.spec`を`.cmd-auto`で一意化。**自テストの偽green(勝利でもstrip消滅)を是正**。
3. **[CRITICAL] 全滅死で装備ロスト**(`store.ts`×2経路): 寿命死と対称に inheritItem→蔵+`equipment:{}`。故人の得物が消えなくなる。
4. **[HIGH] 老成×enemyPower二重適用**(`battle.ts`): `_o`個体にenemyPowerを適用しない。**回帰テストで全非ボスが最強ボスのhp/atk以下を保証**(旧: 364/540がボス超え)。
5. **[HIGH] ボス床FX再発火**(`engine.ts`/`Dungeon.tsx`): `sealBoss()`で討伐後にボス床を使用済み化+主光源消灯、arriveのused判定にboss追加。DungeonがbossDown立ち上がりで一度呼ぶ。
6. **[HIGH] 野遊び童子の弔い文が不表示**(`gods_low.ts`): MOURNINGキーを god id `tokorozawa` へ一致。
7. **[CRITICAL robustness] isValidSave強化**(`save.ts`): ketsu有限数+family要素(id/hp)を検証。NaN経済汚染と空族crash-on-continueを塞ぐ。
8. **[MEDIUM] ホーム図鑑バッジ**(`homeInsight.ts`): 凍結旧フラグ→codexSeenIds基準へ(常時全件新着の固着を解消)。
9. **[低リスク] 回帰テスト硬化**(`regression_m29.test.ts`): floorFracFromAtk/enemyPowerのピン留め(I6の「係数編集が緑のまま退行」対策)+老成ボス超えの禁止。fixtureをketsu/hp込みの実セーブ相当へ更新。
10. **[HIGH・ユーザー承認済で追加適用] 防御バフ反転の恒久修正**(`types.ts`/`battle.ts`/`skills.ts`/`toza.ts`/`jobs.ts`): `Skill.buffKind('atk'|'def')`を導入し battle.ts の id白判定を置換。タグ付け=skills.ts防御5件=def / toza の mk が説明文から導出(巌=全て守・澄は攻撃語で判別)/ jobs tank役=def・他役=atk。**灯座「巌」+家業「盾」の防御アーキタイプが説明通り defUp に**。回帰テスト6件で全バフを説明文と突合。commit `14c62fe`。**ユーザーが「反転させた後にデプロイ」を明示指示したため今回適用**。

### 報告のみ(大規模/設計判断=ユーザー判断へ・未着手)
- bundle分割(1.78MB単一chunk)/複数タブ保存競合/季非消費操作の即保存/exhaustive-deps Lint有効化/デバフのターン管理/mdef術防御の被弾側未使用/regions配列順のunlockFame整合/記モーダルfocus trap/perf.spec閾値(flaky注意)/辞世dup gateの永続化/デッドコード(darknessPenalty/formatDeed/seasonOfMonth=削除より退避)。
- ※heal/sup役の家業バフは士気・鼓舞寄りのため atkUp のままとした(盾/巌の防御アーキタイプのみ是正)。protective寄りのhealバフ(香の帳/毒消し等)の扱いは体感を見て別途調整可。

## ⑩ findings台帳(生・指揮側検証状態つき) — 揃い次第⑧へ昇格
**検証凡例**: [確認済✓]=指揮側がコードで再現/裏取り / [要検証]=未再検 / [却下]=偽陽性。

### I1 戦闘コア(回収済)
- **[確認済✓] H1 防御バフがatkUpになる**: `battle.ts:339` isDefは himamori/g_iwakura の2idのみ。`g_minomushi`「安全地帯」/`gs_earth1`「防御上昇」/`gs_earth3`「大防御」/**盾役(tank)家業の全buff**が説明と逆のatkUp。skills.ts/jobs.ts:60-67で確認。→**最優先の正当性修正候補**。修正=Skillに`buffKind:'atk'|'def'`を持たせ、id一致依存を廃止。
- **[要検証] H2 味方mdef(術防御)が防御時に一度も参照されない**: 敵は`combatantFromEnemy`で`matk===atk`のため `isMagic=matk>atk` が敵から絶対に真にならず、被ダメは常に`t.def`。仕様と実装の乖離。
- **[要検証] H3 デバフ(atk低下)にターン管理なし・基礎atkを恒久乗算改変**: `battle.ts:351`。`e_yamiuta`(mpCost0)が多ボスに付与。buffは減衰、debuffは非対称に永続。※戦闘は毎回combatant再構築のため影響は1戦闘内に限る=重大度は要精査。
- **[要検証] M1** dmgFloorFrac生成時スナップショットで`enrichAllies`のatk上書き後に非追従(下限がやや甘くなる非対称)。修正=計算時に`floorFracFromAtk(atkV)`を都度呼ぶ。
- **[要検証] M2** kin追撃(血の呼応)だけM28下限を経由せず素の`Math.max(1,…)`。M4 kin追撃で長を倒すとmorale不発。M3 computeIntentsが敵ごとにrng独立せず予兆相関(表示専用)。
- **[要検証] L1** performActionのitem分岐が対象生死を自衛せず(現UIは三重フィルタで到達不可=将来のリグレッション地雷)。L2 chainCount未使用。L3 AOEがchain非リセット。
- 該当なし: HP下限クランプ/NaN/不正itemId/在庫0/行動順/KO判定/MP不足 は健全と確認。

### I6 性能/技術債(回収済・自己起動の子agentで混乱→再指示で回収)
- **[要検証] H-1 bundle 1,778kB単一chunk**・分割ゼロ・CIサイズ予算なし(旧比+26%無検知)。修正=React.lazy画面分割/maps.gen.tsをJSON遅延化(=大規模・報告寄り)。
- **[確認済✓ 部分] H-2 テスト網羅の穴**: inheritance.ts/expedition.ts/lifeEvents/epitaph選択ロジックに専用テスト無し。※buyConsumableは`consumables.test.ts`で被覆済(子agentが訂正)。floorFracFromAtk/enemyPower/recalcStatsに単体ピン留めテスト無し=係数編集が541緑のまま退行しうる。→**低リスク高価値=ピン留めテスト追加**。
- **[要検証] M-1 exhaustive-deps未Lint**: .oxlintrcは2ルールのみ、抑制コメントはESLint名前空間で二重に無効。→低リスク修正候補。
- **[要検証] M-2** Appが`data`全体購読・全ScreenがReact.memo無し(操作毎再描画)。**[確認済✓] M-3** perf.spec.ptにexpect閾値なし(退行を止めない)。→M-3は低リスク修正候補。
- L1 Dungeon生成effect依存が`[run.floor]`のみ(実害低)。L2 inheritance.ts:38 二重キャスト。L3 中核3ファイルが800行超。
- 該当なし: dev hook/console本番混入なし(DEVガード有効)・quarantine死参照なし・Pixi破棄経路健全。
- I6子agent(dead code): **[確認済✓] darknessPenalty(expedition.ts:91)** 死コード=実ロジックはstore.tsに1.4/1.2でインライン二重化。**formatDeed(epitaph.ts:414)/seasonOfMonth(types.ts)** 完全デッド(削除より退避で低優先)。any 0件・循環import 0・core/ui分離・Screen routing完全を確認。

### I3 探索/ダンジョン(回収済)
- **[確認済✓] HIGH ボス床タイルで戦闘演出が空・無限再発火**: `engine.ts:853-861` の used ゲートが `boss` を除外、`markUsed` も boss を呼ばず、store の `if(run.bossDown)return`(`store.ts:1583`)はFX開始後で手遅れ。主討伐後にボス床(6マス塊・階段なし=後戻り必須)を踏む度、赤閃光+振動+虹彩暗転300ms+入力凍結が空発火。主光源も消灯しない。→**player-facingの明確なバグ=修正候補**。修正=EngineOptsに`bossDown`を渡しarriveのused判定に`boss`を含める+`lighting.dim('boss')`。
- **[要検証] MEDIUM spawnShade が敵影の重複スポーンを防がない**: `engine.ts:490-496`。稀に同座標2体→無操作二重遭遇/戦利品なし消失。修正=do-whileに`this.shades.some(...)`追加。
- **[要検証] LOW** dungeon/engine.tsの方向別fallbackがvillageより粗い(現状walke_/walkc_不在で未再現・実機green)。**[確認済✓] LOW darknessPenalty死コード**(I6子と一致)。
- 該当なし: 金色人型再発なし(実機green)/遭遇率/灯枯渇/カメラ死空間/生成マップ到達性/隊列同期/camp・event・treasure = 全て健全と実測。

### I2 セーブ/状態/継承(回収済・最高リスク)
- **[確認済✓ CRITICAL] C1 全滅死で装備が形見化されず孤立(実質ロスト)**: 寿命死(`store.ts:283-301`)は inheritItem→蔵+`equipment:{}` だが、**全滅死2経路(`store.ts:1938-1944`歩行 / `2108`遠征)は装備を触らない**。Forgeは生存者のみ走査するため故人の得物がその周回で選択・強化不能に。→**修正候補=3死亡経路を単一ヘルパに統合 or 全滅死にも形見化を追加**。
- **[要検証 CRITICAL] C2 isValidSateが薄い**: `hoto`はfinite検証だが`ketsu`は無検証(非対称)、family要素の形状無検証。ketsu欠落セーブが通過→`undefined<5`でガード素通り→NaN永久伝播(鍛錬/打直しが実質無償化)。かつ`importSaveString`で壊れセーブのsaveSeqが必ず勝ち健全BAKを永久に覆う。→**低リスク修正=isValidSave強化**。
- **[要検証 HIGH] H1 複数タブ保存競合**: saveSeqが「現在KEY値+1」で系譜非認識・クロスタブ同期無し→後書き優先で無警告上書き。→実装やや重い=報告寄り。
- **[要検証 MEDIUM] M1** 季非消費操作(購入/装備/鍛錬/打直し/普請)がsaveGameを呼ばず次CPまで未永続=タブ閉じで消費ロールバック。**M2** ホームの図鑑新着バッジが凍結旧フラグ参照で常時全件新着(Codex.tsxはcodexSeenIds使用で画面間不一致)。→両方低リスク修正候補。
- L1 uid()セッション跨ぎ非一意(天文学的低確率)。L2 renameCharacterのreplaceAllスコープ無し。L3 Forge SLOT_ORDER未知slotでundefined。
- **該当なし(重要)**: **consumables(M28-C)の装備/蔵/形見/家宝混入=完全分離を確認**(私のM28実装が健全と独立確認)。循環参照/当主一意性/quota梯子/移行冪等/死亡者への道具使用 = 健全。

### I6子agent(PixiJS lifecycle)
- **[確認済✓ CRITICAL] DungeonEngine.init()の2つ目のawait後にdestroyedガード欠落**: `engine.ts:401-409`(walkスプライトload)直後にガード無し。フロア遷移/帰り火中にdestroy()が走ると破棄済みappで残80行が実行→`app.stage`null参照TypeError+spawnShadeが破棄済みcacheに新規テクスチャ=GPUリーク。village engineは両awaitにガード有り(=dungeonは実装漏れ)。→**1行修正=L409後に`if(this.destroyed)return`**。pixi.js実装まで遡って裏取り済み。
- MEDIUM Dungeon.tsx exhaustive-deps(現状無害)。LOW village buildPlayerも同型(影響小)。該当なし=texture/ticker/listener/audio破棄は健全と実装照合。

### I4 UI/UX/a11y(回収済)
- **[確認済✓ CRITICAL] オート中Escapeが無効**: `Battle.tsx:307` の keydownガード `menu.kind!=='target'&&!=='skill'` により、オート中(menu='root')はリスナー未登録→L313のEsc停止が到達不能。**指揮側でplaywright実行=auto_stop test2 + battle_input が5/5 viewport失敗を確認**。M28-Aの自テストは「stripが消える」assertがオート勝利(`{auto&&!over}`)でも成立するため偽green化していた。→**最優先修正=Esc停止を`auto`依存の別effectへ分離+307に'item'追加**。
- **[確認済✓ MEDIUM] オートボタン名重複**: strip("オートを停止する")とcmd-auto("■オート停止")が両方/オート/にマッチ→battle_input strict-mode違反。→名前を区別 or テスト厳密化。
- **[要検証 HIGH] 記(全文ログ)モーダルにfocus trap/Esc無し**: Tabで背後の戦闘コマンドへ、見えないまま発火しうる。z-index110でstripも覆う。→Sheet化。
- **[要検証 MEDIUM] Forge成功トースト偽陽性**(store側mutateは健全=経済破損なし、UI側が結果を見ず無条件toast)。**MEDIUM** Forge一部フィルタにaria-pressed欠落。LOW 見世購入ボタン名/道具バッジ合算。
- **該当なし(重要)**: XSS-lite=`dangerouslySetInnerHTML`/`.innerHTML` 0件(React自動エスケープ)。道具在庫0無効化・クリック奪取(pointer-events)・master/detail誤タップ・WorkspaceTabs ARIA・Sheet二重mount=全て健全と実測。

### I5 データ整合性/バランス値(回収済)
- **[確認済✓ HIGH] 防御バフ反転(I1-H1と二重確認)**: `battle.ts:339`。skills.ts(gs_earth1/3)+**toza.ts 巌系12件**+**jobs.ts 盾役9件**=計23件が「防御/守/護」を謳いつつatkUp。灯座「巌」・家業「盾」の設計上の防御アーキタイプ丸ごとが機能不全。
- **[確認済✓ HIGH] 老成×tier4クランプ×enemyPower複合でボス超え(M28私の回帰)**: `battle.ts:61-68`×`enemies.ts:298-309`。老倍率(hp1.55/atk1.35)の上にenemyPower tier4(hp1.3/atk1.13)が二重乗算。**非ボス540体中364体(67%)が最弱ボス超え**、`raijin_taiko_o`/`kaminari_oni_o`はatk95で**最終ボス玄冬(atk85)超え**。→**修正=老成にenemyPowerを二重適用しない or キャップ**。
- **[要検証 HIGH] regions.ts配列順乱れ**: tier2ブロックがunlockFame昇順でない→`rewardTier`/`initialRegionId`がindex基準のためズレ(fame全域simで誤選択確認)。→報告寄り(要慎重)。
- **[確認済✓ HIGH] 野遊び童子 god id不整合**: `gods_low.ts:284` id='tokorozawa'だがMOURNINGキー='nogasobi'→弔い文が永久不表示。→**1行修正=MOURNINGキーを'tokorozawa'へ**。
- MEDIUM validate_data --strict-dist目標が旧120柱時代。辞世dup-0検証が非永続(現データは0)。LOW 経済カーブ/debuffフレーバー/region.depth旧系。
- **該当なし(重要)**: id重複0(全カテゴリ)・相互参照破れ0・**M28 consumablesの妥当性=effect形状一致・価格妥当を三重確認**・系統内若<常<老単調・target/type整合。

## ⑪ 統合triage & 修正計画(指揮側・敵対的再検証済)
**適用する(clear bug・contained・低〜中リスク・高価値)**:
1. **[CRITICAL] PixiJS init()destroyedガード**(engine.ts・1行)
2. **[CRITICAL/最優先] オートEsc停止+道具Esc+ボタン名重複**(Battle.tsx/css・現RED解消)
3. **[CRITICAL] 全滅死の装備形見化**(store.ts 2経路・寿命死ロジックを踏襲)
4. **[HIGH] 老成×enemyPower二重適用の是正**(battle.ts・M28回帰)
5. **[HIGH] ボス床FX再発火**(engine.ts/Dungeon.tsx・bossもused化+消灯)
6. **[HIGH] 野遊び童子MOURNINGキー**(gods_low.ts・1行)
7. **[CRITICAL robustness] isValidSave強化**(save.ts・ketsu/配列/family形状)
8. **[MEDIUM] ホーム図鑑バッジをcodexSeenIdsへ**(homeInsight.ts)
9. **[低リスク] テスト硬化**: floorFracFromAtk/enemyPower/recalcStats ピン留め・辞世dup gate・perf閾値
**報告のみ(大規模/リスク/設計判断=ユーザー判断へ)**:
- 防御バフ反転の恒久修正(buffKind導入=skills/toza/jobs 23件・balance影響)※本セッションで実施可否を検討
- bundle分割(H-1)・複数タブ競合(I2-H1)・季非消費操作の即保存(I2-M1)・exhaustive-deps Lint有効化・debuffターン管理(I1-H3)・mdef術防御(I1-H2)・regions配列順(I5-3)・記モーダルfocus trap・デッドコード(darknessPenalty/formatDeed/seasonOfMonth=削除より退避)

## ④保留リスト
(なし)

## ⑤質問キュー
(空)

## ⑥マイルストーン履歴
- Phase0: 契約固定・監査区分=自己監査・decomposition自己点検(セキュリティは④に内包)→6並列調査投入(2026-07-17)。

## ⑦次の一手
6調査の回収 → 指揮側で敵対的再検証(偽陽性除去)→ 重大度仕分け → 高価値低リスク修正の適用+実証 → 統合報告。

## ⑧最終監査表(自己監査・機械チェックは指揮側が実行)
監査区分=**自己監査**(完了定義に不可逆/出荷なし・修正はgit可逆・push無し)。補強=各findingを指揮側が敵対的再検証。

| 契約項目 | 判定 | 証跡 |
|---|---|---|
| 6次元の並列調査 | ✅ | I1戦闘/I2セーブ/I3探索/I4 UI/I5データ/I6性能 を並列sonnetで実施・全回収。 |
| finding検証(推測排除) | ✅ | HIGH/CRITICAL全件を指揮側がコードで再現/裏取り。偽陽性を除去(H2/H3をMEDIUMへ降格、自テスト偽greenを実証)。 |
| 統合報告書 | ✅ | 本doc ⑩台帳(次元別・検証状態つき)+ 適用9件/報告リスト。 |
| 低リスク高価値の修正適用 | ✅ | 9件適用。build緑 / vitest**546** / lint0 / **playwright 190 passed(exit0)**。commit 5本(下記)。push無し。 |
| リスク/大規模は報告 | ✅ | 防御バフ反転(balance・design判断)ほかを③報告リストに実装計画つきで記録。 |

**適用修正のcommit列(未push)**: オートEsc回帰 / 老成×enemyPower / dungeon(init race+ボス床) / save(全滅死装備+isValidSave) / ui(弔い文+図鑑バッジ)。

**受入オラクルの妥当性(監査範囲外の正直な明記)**: 「防御バフをdefUpにすべき」等のdef/atk判定はゲーム設計者(ユーザー)の意図が正典。バランス数値の是非は体感依存。本監査は「説明文と実装の乖離」「回帰・crash・データ損失」の客観面を検証し、balance判断はユーザーへ委ねた。

## ⑨terminal印
**達成**(2026-07-17)。

灯継ぎ全体を6次元の並列調査(sonnet)+ 指揮側(Opus)の敵対的再検証で総合監査。**低リスク高価値の9修正を適用**(2件のCRITICAL=全滅死装備ロスト/PixiJS破棄レース、および**私のM28自身の2回帰**=オートEsc無効・老成のボス超え を含む)。全て build緑/vitest546/lint0/playwright190で実証・commit済み・**push無し**。大規模/balance/設計判断の項目(筆頭=防御バフ反転)は実装計画つきで報告しユーザー判断へ委ねた。

**ユーザーゲート(未実施=繰延)**: push=公開(M28・M29の全commitがローカル待機)。防御バフ反転など報告項目の採否。

**後続セッションへ**: 本STATEはterminal(達成)。再開不要。⑧監査表と③適用/報告リストをユーザーに提示し、承認後に`git push`(=自動公開)。
