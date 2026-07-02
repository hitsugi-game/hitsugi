# 作業ログ(WORKLOG) — 追記式

> 書式: `## YYYY-MM-DD (M番号)` / やったこと / 変更ファイル / 検証 / 次回 / commit
> 全マイルストーンで必ず追記する(GDD_v3 §6)。計画値の変更は必ずGDD_v3.md §0(改訂履歴)にも反映。

## 2026-07-02 (M0)

- **やったこと**: GDD_v3.md(正本)新設 — 星神120柱・オリジナル24家業・3倍ボリュームの決定経緯を§0に全記録。WORKLOG.md(本ファイル)新設。直前のUIリッチ化(立ち絵/常夜背景/行動カード/画像フォールバック機構)も同時にコミット。
- **変更ファイル**: docs/GDD_v3.md(新規)、docs/WORKLOG.md(新規)、src/ui/*(UIリッチ化9ファイル — 別コミット)
- **検証**: ドキュメントのみ(ビルド影響なし)。UIリッチ化分は tsc/lint/build/preview 全確認済み
- **次回**: M1 基盤リファクタ(villagerLine表化・kizunaワイルドカード化・constants.ts・God.unlock・validate_data.mjs・gen_floor.mjs)
- **commit**: (コミット後に追記)

## 2026-07-02 (M1)

- **やったこと**:
  - `villagers.ts`: switch分岐 → データ表(`{head}`/`{gen}`/`{fallen}`プレースホルダ+汎用フォールバック)。台詞全文移植。郷人追加は1エントリ追記だけに
  - `lifeEvents.ts`: 絆ペアRecord(21鍵) → ワイルドカード付きフラット配列(`{a,b,lines}`、完全一致→片側'*'→汎用、同組複数エントリはrng抽選)。話者向きバグ(キーのみソートでキャラ未並べ替え)を修正
  - `constants.ts`新設: `FAME_SEAL_THRESHOLD=520`/`PARTY_SIZE=4`(Pact.tsx・regions.ts・Expedition.tsxの重複リテラル排除)
  - `God.unlock?: {fame?, regionId?, gen?}`一般化+`godUnlocked()`(北辰老は`{fame:520}`に移行。※GDD_v3のbossId表記はregionIdに訂正済み)
  - `scripts/validate_data.mjs`: id重複/参照整合/位階分布の機械検証(--strict-distで最終分布を強制)
  - `scripts/gen_floor.mjs`: シード付きASCII迷路ジェネレータ(26×17、バックトラッカー+ループ緩和+BFSで入口/最深/宝/焚火/祠/主の間を自動配置)
- **変更ファイル**: src/core/constants.ts(新)、src/core/types.ts、src/core/data/gods.ts、src/core/data/regions.ts、src/core/data/villagers.ts、src/core/lifeEvents.ts、src/ui/Pact.tsx、src/ui/Expedition.tsx、scripts/validate_data.mjs(新)、scripts/gen_floor.mjs(新)
- **検証**: (シェル実行環境の一時障害により保留 — 復旧後に tsc/lint/validate/gen_floorスモーク/preview実機を実施してから本エントリを更新しコミットする)
- **次回**: M2 オリジナル24家業
- **commit**: (検証後に追記)

## 2026-07-02 (M2)

- **やったこと**: オリジナル24家業システム(GDD_v3 §2)を実装
  - `data/jobs.ts`新設: 役割6系統(攻/盾/疾/癒/呪/支)×流派4統(火巡/土巡/水巡/風巡)=24家業。**技192本**(24職×8段)は銘・一言を全て手書きし、威力/費MPは役割別曲線CURVESから生成(数値の単一情報源化)。攻=鍛人/石工/庖人/木樵、盾=灯番/壁塗/堰守/垣結、疾=火消/山駆/鵜匠/紙結、癒=湯守/薬狩/産師/香焚、呪=影絵師/面打/墨師/風聞、支=唄比丘/杜氏/船頭/凧師 — 全てオリジナル(俺屍の武器8職と非重複)
  - `types.ts`: `JobClassId`(24id union)+`Character.jobClass?`+Screen `jobrite`
  - `store.ts`: 生業の儀トリガー(月齢12・灯座持ち・無職)、`assignJobClass`、家業技の月齢解放(JOB_SKILL_UNLOCK_AGES=[12,13,15,17,19,21,22,23])
  - `battle.ts`: jobBias加算合成(灯座biasと同列)/`skills.ts`: allJobSkills()マージ
  - `save.ts`: **v4キー移行**(v4→v3→v1連鎖、migrateV3=jobClass正規化+探索畳み)
  - `Scenes.tsx`: JobRiteScene(役割6グループ×24カード、血潮からの推奨★、口上→初伝表示)/`App.tsx`配線
- **変更ファイル**: src/core/data/jobs.ts(新)、types.ts、store.ts、battle.ts、data/skills.ts、save.ts、ui/Scenes.tsx、App.tsx
- **検証**: (シェル障害継続中 — 復旧後に tsc/lint/validate+偽造v3セーブのラウンドトリップ+生業の儀のpreview発火テストを実施)
- **次回**: M1・M2検証→コミット→M3a(神24→60/敵→120/装備→180/事件→60/辞世→300+PactフィルタUI)
- **commit**: (検証後に追記)

## 2026-07-02 (M3a 進行中)

- **やったこと**(シェル障害中のファイル作業):
  - **PactフィルタUI**: 位階タブ(全て/下/中/上/極)×系統チップ(6属性トグル)の2段絞込。CSS `.god-filter`/`.filter-tab`/`.elem-chip` 追加
  - **共有神授技24本**(`gs_{element}{rank}`): skills.tsへ追加。新規の神はこれを授け、固有奥義(g_*)は初期24柱+極のみ(GDD_v3 §3のインフレ制御)
  - **神24→48柱**: `gods_low.ts`新設(下つ星+18: 火打婆/竈童/行灯坊/星屑拾い/夜這星/箱星/露草姫/釣瓶星/空風小僧/風鈴姫/畦道翁/夢枕/どんど爺/小波童女/風穴守/土塊坊/月見草/星編み媼)、`gods_mid.ts`新設(中つ星+6: 旋風太夫/稲叢主/窯変殿/星売り/夜空繕い/潮騒法師)。全柱に弔い文。gods.tsは FOUNDING_GODS+結合エクスポート方式に変更(初期24柱は残置)
- **現在の分布**: **60柱完了 — 下24/中18/上14/極4(M3a神クォータ達成)**
  - 追加分: 中+2(望月搗き/雲曳き)、上+7(gods_high.ts: 弓張月夜/宵待の君/燈台大臣/海原つ司/山並の大人/風伯/銀漢の渡し守)、極+3(gods_apex.ts: 天津日の残照[星骸の谷討伐で解放]/丑三の大御[提灯坂討伐で解放]/天の川母神[第8代の血で解放])
- **完了(M3a追加分)**:
  - **敵120種**: enemies.tsを BASE_ENEMIES(基礎40種=既存18+新規22)+variantsOf(若_w/常/老_o、端tierクランプ)+BOSSES(4) に再構成。新規22種=苔坊主/小豆洗い/風切り羽/団栗貉/夜泣き鈴/雫女(T1)、唐傘浪人/泥達磨/火柱狐/氷柱女/星蝕虫(T2)、青行灯/風喰らい/山姥影/人魂行列/淵鏡(T3)、暗闇童子/星裂き/地鳴り蝦蟇/不知火将/蛟影/神隠し(T4)。変異はsprite共有=画像後追いは基礎種分のみ
  - **装備180点**: items.tsを FOUNDING_ITEMS(既存15点・baseId不変=セーブ互換)+SERIES(11系譜×15段=165点、銘は全て手書き・数値はbase×growth^i式・shopTier=段i)に再構成。系譜=刀/弓/槍/槌(武器)、胴丸/羽織/籠手/兜(防具)、御守/櫛/帯留(飾り)
- **完了(続き)**: **事件60本** — `data/events.ts`新設(+52本: 旅人の墓/蛍の川/忘れ物の傘/小人の市/逆さ滝/呼ぶ声/星の井戸/置き弁当/鏡沼/道草馬/絵本の切れ端/神木倒れ/夜桜/石地蔵/宝の絵図/狐の嫁入り/風鈴の木/ぬりかべ/雛流し/山犬親子/金縛り坂/星神の宴跡/捨て舟/童唄/鬼の忘れ物/雨宿り堂/流し盃/月の欠片/迷い家/古戦場/雪女の子/仙人将棋/赤い鳥居/獣道/米俵/絵馬の中/古狸芝居/白蛇/落ち葉の手/槌の子/雷獣/酒蔵/羽衣の松/いにしえの祠/川獺商人/日陰の花/狸囃子/関の婆/綿の雪/陽炎一座/硯の池/四辻の占い/倒れ仏)。expedition.tsはCORE_EVENTS+結合exportに変更(公開APIは互換)
- **完了(続き2)**: **辞世300首** — epitaph.ts の8性根×3死因の各枠を3首→12〜13首へ増補(+228首、性根の口調を厳守: 勇敢=武人/臆病=健気/慈悲=慈愛/負けず嫌い=記録魔/呑気=関西弁/冷静=観測者/豪快=祭り/寂しがり=甘えん坊)。書き味の混入英語(safe/family/スポット等)は検出次第修正済み
- **M3aテキスト量産は全完了**: 神60柱/敵120種/装備180点/事件60本/辞世300首/PactフィルタUI/共有神授技24本
- **残り(M3a)**: manifest追記(神36+敵基礎22のプロンプト)、模擬戦ゲート+全検証+コミット群(シェル復旧待ち)
- **設計決定(敵の変異システム)**: 360種への道は「基礎種を手書き→変異で系統展開」とする。基礎40種(手書き・M3a)×3変異(若=tier-1弱体/常=基準/古株=tier+1強化・名前接頭辞)=120種(M3a)。M3b/cで基礎を+40ずつ書き360へ。実装は enemies.ts に `variantsOf(base)` を追加し ENEMIES を生成結合(数値式は単一情報源 — GDD_v3 §3と同思想)。pickEnemies のtier抽選は既存のまま機能する見込み(要確認: expedition.ts)
- **検証**: シェル/preview系ツールの障害継続のため未実施(tsc/lint/validate/preview全て保留)。**復旧後は M1/M2/M3a進行分を必ず検証してからコミット**
- **commit**: (検証後に追記)
