# 開発ステータス(2026-07-28 更新)

**2026-07-22 runtime実測**: 神180柱・敵579体（通常基礎180＋若/老変異＋主39）・装備810・辞世1370・事件282・地域40・配信画像2825点。**次の制約は物量でなく、初回30分・戦闘の対処差・初代継承・実利用計測・公開前検証**。M42監査の正本は`docs/PRODUCT_IMPROVEMENT_AUDIT_M42_20260722.md`。

## 直近の公開修正

- **M60 統合改善（release candidate・公開待ち）**: 保存を検証付き結果へ変更し、storage拒否／破損save／root例外から復旧できる入口を追加。タイトル先行＋全route遅延読込で初期JSを74,281 gzip bytesへ削減。戦闘mobile可読性、一族1/2/4/8人grid、M57/M58、三星択一、主戦「止・受・崩」三体、三品の家宝額を統合した。音楽は23画面・地域・季節・世代・物語・戦況を10分超の決定論的変奏へ反映し、三段階の豊かさとlive変奏名を追加。探索はM54の地域ラスター取得0へ戻した。全戦闘オート、M53 battle-first、既存報酬、非FOMOを維持する。全Vitest 59 files/826、機械gate、重点5幅、production Chromium/Firefox/WebKit release smoke 15/15へ合格。独立監査P0/P1 0、blocking 0、SHIP-with-notes。main公開と公開bundle確認後に公開済みへ更新する。

- **M59 残改善余地の多角監査（達成・ローカル文書・runtime未変更）**: 正典・実装・test・公開bundle・CI・配信量・既存監査をgameplay/UX/technicalの3系統で照合。P0をM58単独公開可能化、mobile核心情報、外部baseline、root/storage/save import信頼へ限定。M57はUI/layoutと灯芯手入れ経済を分け、後者を100 seed非劣化gate付きP1とした。release/性能/M55 Phase A/M56 blocking・Phase A/visual rightsも段階化した。M47〜M49とM47Bの古い未公開表記は公開実態へ同期。独立Round 1の3 blockingを限定修正し、最終closure blocking 0。正本は`docs/PRODUCT_IMPROVEMENT_BACKLOG_M59_20260728.md`。実装、commit、push、deploy、外部送信なし。

- **M58 成人・生業の儀の帰郷導線（ローカル実装・未公開）**: 成人の儀と生業の儀の選択前／確認前に「← 郷へ戻る」を常設し、未決定の儀を既存の「灯の余白」へ保存して同じ人物から再開できるようにした。選択確定、月送り、人物成長は発生しない。全Vitest 54 files/793 tests、Playwright共有scene 5幅20/20、lint、data、closure69、manifest9、production buildに合格。commit/push/deployなし。

- **M57 決断導線・灯芯手入れ・家譜見開き（ローカル実装・未公開）**: 「決断を見る」を上端位置＋有効カードfocus＋1.6秒の金縁応答へ修正。選択中の一人へ奉燈15で最大MP30%を戻す、月を送らない「灯芯手入れ」を追加した。一族欄はPCで当代の記／家譜札＋血脈診断の見開き、モバイルで縦組みへ再編。focused Vitest 17、Playwrightの決断PC 1/1、一族PC1280/mobile390 4/4、lint、buildに合格。commit/push/deployなし。

- **M54 探索地図のmap-native化（公開済み）**: M53の探索側を再修正し、右上の水没施設画と根のラスター前景を表示だけでなく読込経路から撤去。元のTileKind地図を主役に戻し、地形内だけへ決定論的な濡れた轍、泥溜まり、水紋、小さな岸葦を追加した。探索ラスター要求0、`map-native`、texture budget 0を回帰固定。戦闘の地域背景1枚構成は維持。添付相当1782×695、PC1280/mobile390でAR1 10 pass/2 intended skip、全Vitest 789、lint/data/closure69/manifest9/buildに合格。M52は`a30b794`、M53〜M54は`b23eda0`としてmainへ公開し、Actions run `30291730297`と公開bundleのHTTP 200・`map-native`/`battle-first` markerを確認済み。

- **M53 探索地図・戦闘舞台の視覚役割分離（公開済み・探索側はM54へ更新）**: 戦闘では探索用の根、祠cutout、CSS地形を重ねず、地域背景1枚＋暗幕＋戦闘札だけへ整理した。M53時点の探索用ラスター端景は実画面検収で撤回し、公開版ではM54の`map-native`へ更新済み。`battle-first`、地域背景1枚、旧collage要素0、横overflow 0をPC/mobile回帰で固定した。実装`b23eda0`、Actions run `30291730297`でPages公開成功。

- **M52 勤め・出立Sheetの表示位置（公開済み）**: 共通Sheetを呼び出し元`.screen`のtransform/scroll座標系から`document.body`へ分離し、PCでは実表示領域`100dvh`の中央へ固定。長い「務め」は上下余白を残して本文だけをスクロールし、短い「出立の確かめ」も同じ視線位置に揃えた。添付相当996×904で2/2、低画面562×375で1/1、既存出立PC/mobileで2/2、全Vitest 789、lint/data/buildに合格。実装`a30b794`、Actions run `30291730297`でPages公開成功し、公開CSSの`100dvh`を確認済み。

- **M51 出立seedによる夜藪変奏（公開済み）**: 出立ごとに地図の向き、宝箱の位置と個数、祠・焚火・石碑の位置、敵影/地表prop、宝箱報酬、祠事件、事件結果、焚火加護候補が変わる。runSeedを遠征checkpointへ保存するため、同じ遠征の中断再開では内容が変わらず引き直せない。通常171層＋常夜百層の全271層で到達性を検査し、専用stageは背景ずれ防止のため地形固定・内容のみ変奏。Forge Round 1のseedなし旧checkpoint引き直しを安定内容seedで閉鎖し、Round 2独立評価A/B/C/D/E=`4/4/5/5/4`、blocking 0。全Vitest 54 files/789、型/lint/data/closure69/manifest9/build、PC1280/mobile390 2/2に合格。旧地形、報酬率、敵数値、月コスト、全戦闘オートは不変。実装`545cf79`、Actions `30204635730`でPages公開成功し、公開bundleの4 markerとHTTP 200を確認済み。

- **M47C 戦闘予告信頼性・中盤難易度計測（公開済み）**: 実行を予約しない全兆しを「行動候補」へ統一し、士気崩壊中の逃走候補を追加。灯警告を実機構の40%/0%境界へ揃えた。中盤fixtureを実Character変換で固定し、実マップ敵影数（星骸の谷5/6/7/8/2）から入口/帰還線/灯枯れのHP/MP・灯持越し連戦を各400 seed、tier3全11主を各200 seed計測。計測後`X=60%`とし、実帰還線floor 3は素手瀕死70.5%・全滅5.5%、戦術完遂100%・全滅0%で合格したため敵数値は変更していない。checkpointのregion/floor/座標/隊/item参照検証も追加。型/lint/data/closure69/manifest9、全Vitest 53 files/783、build、Playwright 33 pass/1 intended skip、独立監査blocking 0。実装`c6e06f6`、Actions `30188332927`でPages公開成功。公開HTML/JS/CSSと3 markerをHTTP 200で確認。正本は`docs/qa/m47c-battle-trust-midgame-baseline-20260726.md`。

- **M47B 遠征・暦・保存契約（公開済み）**: 遠征をoptional checkpointとして保存し、出立・加護/事件/特殊地点・階層移動・戦闘解決の安全地点から同じ状態で再開できるようにした。帰還時はcheckpointを消して従来どおり一度だけ戦利品反映＋1ヶ月送り。ダンジョン敗北は結果画面のCTAを待たず、永久死・形見・戦利品半減・月送りを同期保存するため、画面を閉じても死亡を取り消せない。M33の非永続判断はM46で判明した永久死回避を理由に撤回。M47Cでcheckpoint参照整合も追加検証。実装`10c5b35`、M47Cと同じActions `30188332927`でPages公開済み。

- **M50 適応型音楽・一族人物表示（公開済み）**: 全23画面を11曲へ割り当て、通常/稀相/主戦、戦況tension、家祖ID由来の血脈三音、句構成、crossfade、重要SE duckを実装。music/effects/ambience bus、4音量、消音、起伏控えめ、gesture unlock、非表示停止/復帰を追加し、旧地域環境音は0.38秒fade後に切断する。一族小札は横送り不要のgridへ変更し、玄を含む灯形未決定の幼子は既存人物顔を仮肖像として表示する。新規音源/画像0、save/戦闘計算/報酬/全戦闘オート不変。focused Vitest 12、Playwright PC/mobile 14、全Vitest 765、lint/data/build/closure69/manifest9、npm audit 0、独立/security監査blocking 0。実装`6c8d2a5`、Actions run `30128251561`でPages公開成功。公開HTML/JS/CSSと人物顔をHTTP 200で確認。`face_*`の生成モデル系譜は既存未確認gateを継承し、権利確認済みとは扱わない。

- **M47 郷の薬種見世・戦支度盤（公開済み・M59文書同期）**: 郷の「すぐ行く」と豆腐屋から、既存回復薬を月消費なしで直接購入できる薬種見世を追加。所持・効果・価格・武功解禁・不足を一画面に集約し、共通Sheetの外側click/Escape/focus復帰を維持。PC戦闘盤は最大1180pxで中央寄せし、手番者の顔、各行動の目的、敵勢/広域兆し/携行薬、薬切れ補充案内を追加した。実装`27c4e91`は現行`origin/main`の祖先で、公開bundleの「薬種見世」を2026-07-28に再確認した。
- **M48 戦果後の戦況ログと固定継続CTA（公開済み・M59文書同期）**: 勝敗画面の左側に既存戦闘ログの直近8行を残し、右側を結果本文のスクロール領域と独立CTAへ分離。`夜藪に、僅かな静けさが戻った。`を含む戦況の記憶を結果確認中も保持し、`戦果を携えて進む`は本文をスクロールせず押せる構造にした。実装`11cf246`は現行`origin/main`の祖先で、公開bundleの継続CTAを2026-07-28に再確認した。
- **M49 今月の決断ジャンプ（公開済み・M59文書同期）**: Home上部の「決断を見る」に移動先`monthly-decisions`を付与し、スクロール後に最初の有効な決断カードへフォーカスを渡す。実装`6c4b6b5`は現行`origin/main`の祖先で、公開bundleのmarkerを2026-07-28に再確認した。M57の追加応答はローカル未公開のまま分離する。

- **M46 資質連動level・戦果見立て（公開済み）**: Lv1現行互換の加算熟達、資質score上限8〜12、旧save冪等移行、全戦闘オート同報酬をruntime/save/UIへ実装。架空slotを同じreward plan由来の確定戦果・候補敵種ごと4%・携行/即時表示へ置換し、`planned → settled → continued`で二重付与を防止。XP tier係数は3→5の単一調整後、開幕/生涯level分布も合格。Vitest 746、PC/mobile M46 4/4＋既存戦闘/稀相4/4、独立監査PASS / blocking 0。実装`d9f9ac8`、Actions run `30058466579`でPages公開成功。公開bundle `index-CEUkgKbm.js`のM46 markerとHTTP 200を確認。

- **M44 タイトル見出しの異形focus枠**: 画面進入時の読み上げ用`h1` focusにブラウザ標準outlineが付き、`灯継ぎ`の複数spanを段差状に囲んでいた。読み上げfocusは維持し、Tab対象でない`.game-title`だけoutlineを無効化。PC1440/mobile360のTitle/Intro 4/4、lint、build、closure 23/40/6/69に合格。実装commit `7ff1997`、Actions run `29876069814`でPages公開成功。公開CSS `assets/index-DXXd6C6Z.css`への反映とHTTP 200を確認済み。

## ローカル計画・未実装

- **M56 星籤「三星択一」・主戦精密化（設計Forgeの履歴・runtimeはM60で実装）**: 一籤一救済、10回保証優先、open時reward snapshot、単調drawNumber冪等性、確定主兆し、tier3主11体のID/周期/強手/対処値、4 policy測定式まで正本を強化した。当時は計測oracle、auto三方針、stop閾値、claim save-first、rescue validatorを閉じられずruntime未変更で停止したが、M60で4 IDを独立appendixへ分離して閉鎖し、三星択一と主戦三体pilotをruntime/save/UIへ実装した。元設計の公開commitは`32c1389`、実装状態は本書M60行と`docs/CODEX_MISSION_STATE.md`を正とする。

- **M55 探索体験強化「灯跡の夜藪」（設計公開・runtime未実装）**: M54の画像0枚・map-nativeを維持し、地図5状態、時間尺度別loop、歩行反応、距離別POI、宝/稀相/主の非漏洩兆し、4地域pilot、発見checkpoint、固定性能profile、13名の観察oracleを正本化。Round 1の4 blockingを限定修正し、別評価者のRound 2でA/B/C/D/E=`4/5/5/5/4`、4 ID CLOSED、blocking 0。正本`docs/DUNGEON_EXPLORATION_APPEAL_FORGE_20260728.md`は`842faf0`で公開済みだが、runtime・素材・saveは未変更。実装開始時はPhase Aだけを先行する。

- **M45 没入・継続コンテンツ追加監査**: M43後の次候補を8件へ整理。追加量産ではなく、今代の約束の決算、一組の記憶の糸、冒頭の意思表示、神縁12柱、四地域怪異三幕、宿敵の狩り札、前回の灯、家宝三品へ限定した。Phase 0は現行外部baseline、local計測、Dungeon中断安全性。既存scene/地域進行との重複を除き、測定表と見送り条件を付与。独立再監査PASS / blocking 0。正本は`docs/PRODUCT_ENGAGEMENT_ADDITIONS_M45_20260723.md`。runtime、素材、公開版は未変更。

## 履歴（M38/M37は後続リリースへ統合済み）

- **M38 郷ラスター環境画・出立国絵図**: 郷V2の地面・家・灯籠・井戸・池・植栽を一枚の高品質ラスター環境画へ統一し、簡易図形propを通常経路から撤去。collision/BFS/focusは既存`MAP`が所有し、画像取得失敗時は従来V2へ縮退する。郷人も既存歩行スプライトへ置換。出立は40地域サムネイル札の列から、燈ノ郷→4風土→玄冬の座を一筆で結ぶ縦長国絵図＋DOM道標へ変更。追加2素材は2026-07-21に公開・商用利用承認済みで、後続releaseへ統合済み。
- **M37 画材境界の統一**: 世界絵をラスター、SVG/Pixi Graphicsを情報層へ限定。Title/NightBackdrop/出立地図/神・敵・地域fallbackから簡易風景・シルエットSVGを撤去。出立は40地域の実景道標へ変更し、Dungeonは地域画を常設。新規画像0・ゲームロジック変更0。後続releaseへ統合済み。

## 🎉 リリース済み・稼働中

- **M43 初回体験・継承・戦闘文法・星籤（公開済み）**: M42 P0 4件と即時修正を実装。Home最優先1件、初帰還後の日参り、星契り推奨3柱、唯一成人の初期編成、画面scroll/focus、mobile周辺5地点、宝具録検索、郷keyboard、recoverable export、年月/versionを整えた。後継指名＋3つの約束、序盤12敵の止/受/崩、全オート兆し対応、save-local 9 milestone、全39地域100 seed campaignを追加。星籤は初帰還1回＋武功50ごと、武功非消費、下60/中28/上10/極2、10/20/50回保証、重複は縁+1、現金・日課・期間限定・限定必須戦力なし。721 tests、lint/build、closure 23/40/6/69、独立Round 3 PASS / blocking 0。実装`dbe2968`、closure hash修正`6ef7d4a`、Actions run `29875134003`でPages公開成功。公開JS `index-9Rbl6Hir.js`とCSS `index-Bg1TF1DE.css`をHTTP 200で確認した。

- **M41 郷・一族小札レイアウト修正（公開済み）**: 小札の168px幅と氏名への`overflow-wrap:anywhere`が重なった縦割れを修正。286px基準（最小248px）の横送り家譜札へ変更し、PCは2札、mobileは1札を可読表示、3人以上はscroll-snap付き横送りとした。5幅回帰34 passed / 6 intended skip、Vitest 701、lint/build、closure 68/68合格。commit `ac903fa`、Actions run `29862456965`成功。公開`index-CxttKBp1.css` / `index-B0HgjgmB.js`はHTTP 200でローカルbuildと一致。

- **M40 コレクション・育成・全戦闘オート（公開済み）**: 810装備を家祖15＋53系譜×15段の永続発見記録へ実装し、家譜4入口と鍛冶54棚を接続。鍛錬は人物・戦型・次の節目・次代影響・推薦3件を先に読み、六能力の自由選択を維持。オートは全戦闘のまま堅実/温存/全力、初期OFFの任意停止4条件、勝利後最大4行の説明を追加し、報酬経路は分岐なし。煤墨・紙・真鍮・朱印へ意匠を統一し、新規画像生成0。701 tests、M40 PC/mobile 8/8、独立監査PASS / blocking 0。実装`2e86a9d`、Actions run `29840283003`成功。公開HTMLと`index-B_V4tnw1.js` / `index-mEc4m8Cz.css`はHTTP 200でローカルbuildと一致。正本はGDD_v3 §8.24。

- **公開URL**: https://hitsugi-game.github.io/hitsugi/ (2026-07-21 M34配信をHTTP 200・実bundle・OGP・夢CGで確認)
- **リポジトリ**: https://github.com/hitsugi-game/hitsugi (public、`UmiNe2025`からOrganizationへ移管済み)
- **v0.1.0 タグ**: https://github.com/hitsugi-game/hitsugi/releases/tag/v0.1.0
- **M34公開実装HEAD**: `f144505c5a70e784fb2e8a7980b3469e0fb2dd77`（実装`0bd19ec`＋設計/導線`f144505`）。GitHub Actions run `29777998428`成功。旧Pages URLは404。
- **全景品質default-OFF公開HEAD**: `91d54ca78f554a866c3b0ef09adbed3cfb557eea`（実装`08dde9a`＋cross-platform CI修正`91d54ca`）。GitHub Actions run `29802506479`成功。公開HTML HTTP 200、実bundle `index-HjaRAptd.js`とローカルbuild一致、生成素材WebP HTTP 200を確認。
- **M36 郷・ダンジョン素材充実（公開済み）**: 既存素材の棚卸しで、郷facade 5/5、郷状態cue 10/10、地域背景40/40、ボス背景/立ち絵39/39、地域kit 40/40を確認。`regionVisualV2`を既定ONへ変更し、5施設facadeと全40地域code-native kitが通常プレイへ出るようにした。旧表示は`VITE_REGION_VISUAL_V2=0`またはDEV queryで再現可能。PC作業画面はShell最大1160px/本文最大1040px/カード最大280pxへ抑制。commit `87c8307` をmainへpushし、GitHub Actions run `29816722591`でbuild/deploy成功。公開HTML/bundle HTTP 200確認済み。
- **全景品質mission（default-OFF公開済み・独立監査PASS-with-notes・外部gate待ち）**: 全22 route、全40地域、route外overlay 6件を台帳68行へ`code-integrated`として接続。required state×5幅証拠のない行は`scene-integrated`へ昇格しない。Title/Intro/Home/星契り、郷5施設、蛍火Dungeon/Battle、鍛冶/蔵/出立/遠征、生涯/夢/終端、家譜/図鑑/普請/家系図/設定/通知を画面固有surfaceへ再構成した。Vitest 677、lint、build、closure 68/68、manifest 7/7に加え、郷5幅30/30、蛍火旅程5幅21合格・4意図的skip、鍛冶/蔵PC・mobile証拠8合格・2意図的skip。Round 2 blocking 0。公開済みHEADはV2既定OFF、scene-integrated/ready/released 0を維持。M36ローカルでは通常プレイ改善のため既定ONへ変更済みだが、未push/未公開。
- **地域拡張の安全境界**: 4 macro biome・全40地域の固有二材質/silhouette/landmark/danger/navigation/motion/soundをcode-native runtimeへ実装済み。公開済みHEADでは`regionVisualV2`既定OFFだったが、M36ローカルでは既存権利クリア素材とcode-native kitの通常導線接続として既定ONへ変更した。生成7素材は2026-07-21に公開・商用利用承認を取得済み。外部4-way blindと物理低性能端末gateはscene-ready/released昇格の条件として残す。
- **生成素材・神画像方針**: 郷の星祠・豆腐屋・出立門3点を追加生成・透過処理し、既存4点と合わせmanifest 7件へ統合。実参照1,749画像は欠落0/exact重複0だが、神MAXの人格・画風連続性が不足するため承認allowlistは空。未承認MAXは通常立ち絵を置換せず、コード演出だけを重ねる。
- **全体gate/概算**: 全22 routeをprimary phaseへ割り当て、全40地域・overlay・required stateをclosure ledgerで追う。完了時`placeholder/mismatch/未分類/未確認=0`、4 biomeは4-way blindで各群6/8。base 53〜94 person-day＋神/敵P0差替え予備0〜12、合計53〜106。量産VC6は34 person-day上限とし、超過予測時はbespoke assetを止める。
- **全景計画Forge**: Round 1で未割当route/工数を検出し、VC3Bを追加して全22 routeを閉鎖。Round 2のfresh評価はA/B/C/D/E=5/5/5/5/5、blocking 0でPASS。現在はローカル実装と機械gateまで完了し、公開・外部魅力評価・権利判断を分離している。
- **UI v2基準画像（実装前）**: `docs/visuals/ui-v2/`にHome・戦闘・Dungeon・郷・鍛冶の5点とmanifestを追加。Phase 0のlayout合格後、画面別に採用・分解・性能検証する。配信コードへの組込みは未実施。
- **M34物語・画像統合（公開済み）**: 夢順序/永続scene queue/汐里名開示migration、Home「灯の余白」と章・夢の進行不変再読/7日一度通知、出立〜郷の短い残響、形見/家系図/Finale個人化、匿名体験集計、夢固有CG7点を実装。夢3は疑似文字を除去。Vitest 618、M34 E2E全5幅40＋最終影響範囲15、全既存spec PC/390px代表回帰91合格・1意図的skip。Ship Checkはblocking 0、run `29777998428`で公開済み。
- **AR0操作安全・視覚契約（ローカル・独立監査PASS）**: Home/Pactのsemantic操作、Battleの標的選択→予告→実行、郷の操作帯分離、Dungeonの可視地図/帰り火/DOM案内、HVR-1.0 style bible、manifestを実装。5画面×5幅overflowとkeyboard/focusを30/30、Vitest 621、lint/build/diff-check、AR0単独reverse/M35保全で検証。目視で郷/DungeonのcheckerboardとBattleの平坦暗部はAR1課題として残る。commit/push/deploy未実施。
- **AR1コアループvisual slice（機械実装・生成素材権利確認完了／人間・実機gate待ち）**: `regionVisualV2`既定OFFで、郷の連続地面・5施設facade・通常/危機/帰還痕、蛍火0層の水没社/前景/濡土/浅水/天候、同じcontractを継ぐBattle、Home帰還三痕を実装。採用7画像は220,318 bytes、visual QC合格、OpenAI利用条件と所有者承認を記録して`cleared / accepted`。外部8名と物理端末gateが残るためPhase Exit HOLD / AR2 NO-GO、V2既定OFFを維持する。

## 直近のマイルストーン(v3.1 M13以降)

- **M27 地域固有ダンジョン・稀相遺物(実装・公開済み)**:
  - 非塔39地域を全て歩行化し、静的マップ **171層**。常夜百層は別枠100層。
  - 全40地域へ固有の地相文・プロップ4軸を追加。既存の配色/材質/粒子/ランドマークと合成。
  - 特殊影18%を金影13%/稀相5%へ分割。稀相勝利時のみ産地付き「秘」装備を遠征戦利品へ確定追加。
  - floor seed決定論化と接触済みキーで、戦闘往復による特殊影再抽選を防止。

- **M13 物量1.5倍(2026-07-04達成)**:
  - 装備 **540→810**(53系譜×15+初期15、`seriesItems`式駆動)
  - 辞世 **914→1370**(8性根×3死因、`epitaph_extra1〜5`、機械検証で完全重複0)
  - 事件 **183→270**(`data/events1〜5`、地域固有27=regionsタグでpickEvent優先)
- **M10 和風UI音(2026-07-04〜05)**: page/confirm/cancel/error/tab の5種を Web Audio和風合成で追加。**第二版でクリックデリゲーション実装**(main.tsxで `attachUiClickSfx()` を1度呼び、全button classから自動SEを鳴らす)。
- **UX改善6件(2026-07-04)**: 攻撃ワンタップ・オート永続・戦果自動遷移・敵影数削減・マップ/戦闘の待機bob。
- **可視化強化(2026-07-05)**: minimap 石碑ダイヤ・自機facing三角矢印・フロア踏査%・灯ゲージ<15%で危険パルス+SE警告・敵影テレグラフを1マス早期化。

## 完了(累積)

- **ゲーム本体**: 世代交代・星契り(遺伝予測)・夜藪探索(灯システム)・継足バトル・家譜・辞世自動生成・形見継承・全滅時一人生還・事件270・ボス27+汐里・NG+(継承新周回)・眷属6属性全実効き(moon夜目含む)。
- **音楽**: Web Audio和風適応型BGM11曲+SE20種。平調子の句構成、汐里の子守唄、家祖ID由来の血脈三音、通常/稀相/主戦、戦況tension、3bus、crossfade/duckを実装。UI音5種は単一デリゲーションで自動配線。
- **バランス**: ブラウザ内自動プレイテスト(最適botで7〜8世代/5〜9年クリア、ボス敗北0〜3回)で調整済み。
- **UX**: 手引き・操作音(第二版)・モバイル対応・オートセーブ・家譜画像共有・OGP画像。
- **M39 郷ホームPC読み幅（公開対応）**: 背景は全画面のまま、960px以上の家の座を中央寄せ・最大1320pxへ制限。1280/1440/1920pxで左右余白を確保し、一族欄と今月の決断が画面端まで伸びない構図へ調整。2026-07-21の明示依頼でmain公開対象。
- **マーケ**: `docs/MARKETING.md`(ポジショニング、X/itch.io/ポータル施策、告知文面、KPI)。

## アート — 現在2825点 / 以下は2026-07-05時点の歴史snapshot

- 現在の配信画像は2026-07-22実測で2825点・241.68MB。新規量産はM42方針で凍結する。以下は2026-07-05時点のカテゴリ別snapshot:
  - `it_*`(装備) 540 / `en_*`(敵) 360 / `sk_*`(技) 353 / `god_*`(神) 240 / `ev_*`(事件) 175
  - `cutin_*`(奥義) 75 / `face_*`(顔) 64 / `bg_r_*` 37 / `bossbg_*` 27 / `boss_*` 27
  - `pose_*` 24 / `job_*` 24 / `emb_*` 24 / `life_daily_*` 20 / `ic_*` 20
  - `vil_*` 16 / `cg_*` 16 / `boon_*` 12 / `cg2_*` 9 / `nem_*` 8 / `node_*` 7
  - 歩行スプライト `public/img/sprites/walk_*.png` 216枚(gata×性別×方向×コマ)
- **画像生成の下地**: gen_manifestの `NOUN` 辞書に **M13新18系譜を追記済み**(2026-07-05)。今後の再稼働で装備アイコンの命名品質が向上する。
- 表示連鎖は `MaybeImg`/`Portrait`/`Ico` で堅牢化済み(未生成時は絵文字/従来表示へ優雅に退避)。

## ユーザー承認が必要な残作業

1. **AI感解消AR1の人間/実機検収** — 機械実装と生成7素材の公開・商用利用承認は完了。blind 8人と低性能物理端末gateは未実施。
2. **X告知**: `docs/MARKETING.md` の文面をコピペ投稿。
3. **itch.io登録**: 英語ストア文面も同ファイルに用意済み。
4. **フリーゲームポータル登録**(ふりーむ!等)。
5. アクセス解析の導入判断(GoatCounter等)。

## 既知の残タスク(次期候補)

- **M43外部gate**: 初見8名、一世代5名、低性能物理端末で初回30分・初継承・魅力を検証する。local milestoneの外部送信は未実装。
- **公開品質**: Dungeon checkpointはM47Bとして公開済み。残りはroot Error Boundary、storage拒否fallback、save import実書込み確認、PR preview/main保護/browser smoke、実機performance gate。
- **量産境界**: promptEn・画像工場・神/敵/地域追加は完了履歴として保持し、M42の実ユーザーgateを閉じるまで再開しない。

## 開発メモ

- dev起動: `npm run dev`(previewサーバ設定は `.claude/launch.json`、port 5199)
- 自動プレイテスト: dev時 `window.__game` にストア公開、`window.__dungeon` にエンジン公開。preview_evalでシミュレーション可能。
- デプロイ: main へ push するだけ(GitHub Actions)。
- 詳細な進捗ログは `docs/WORKLOG.md`、正本設計は `docs/GDD_v3.md` §8。
