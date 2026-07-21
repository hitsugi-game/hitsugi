# Codex Mission State — 全景品質・全ゲーム視覚実装

最終更新: 2026-07-21 JST

> `docs/CODEX_MISSION_STATE.md`は完了済みM34、`docs/CODEX_MISSION_STATE_VISUAL_RECOVERY.md`はAR1到達点の正本として保持し、本missionはこの固有pathを正とする。

## ①契約

- Definition of Done: `docs/CODEX_MASTERPLAN_DRAFT.md` §18の全22 route、全40地域、route外overlay、required stateを、必要画像、runtime、closure ledger、テスト、実画面証拠、独立監査までローカル実装する。
- Scope外: commit、push、deploy、課金、外部送信/募集、ユーザー既存dirtyの破棄、セーブ/マップ/collisionの仕様変更。
- 制約: `docs/GDD_v3.md`を正典とし、AR1 `regionVisualV2`既定OFFとAR2 NO-GOを、人間8名と物理低性能端末gateが閉じるまで維持する。生成7素材の公開・商用利用権利gateは2026-07-21に閉鎖した。
- 権限境界: 可逆なlocal code/assets/tests/docsとbuilt-in image generationまで。公開、既存dirtyのcommit、削除、未確認素材のproduction昇格は行わない。
- エスカレーション: 8名実参加、物理端末、model/license権利判断は代替合格させず保留。save/map/collision互換不能、正典変更、既存dirty上書きが必要なら停止する。
- 監査クラス: independent audit。主要画面、Pixi runtime、大量asset、save互換へまたがるため。
- 主観受入: 5幅実画面、同一fixture before/after、世界固有性/一貫性/先を見たい/一族の痕を独立評価する。§18の外部人間6/8 gateは別途未達として残す。

## ②作業分解

| 項目 | 依存 | owner / 実行経路 | 受入確認 | 状態 |
|---|---|---|---|---|
| M0 契約・dirty境界・baseline | なし | root | HEAD/status、既存差分、state、baseline | 完了 |
| VC0 closure基盤 | M0 | closure worker | Screen22/Region40/overlay/state validator、赤/緑test | local完了 |
| AR1R-A 郷完成画角 | M0 | village worker＋root imagegen | 5施設、ground/contact、人、state、5幅 | local機械実装完了 |
| AR1R-B Dungeon/Battle | AR1R-A機械gate | dungeon/battle worker | 蛍火frame、同一stage、rare、5幅 | local機械実装完了 |
| VC2 入口/Home/Pact | M0 | root | title/intro/home/pact required state | local完了 |
| VC3 鍛冶/蔵/出立/遠征 | VC2 | work-surface worker | 4 route surface/task/5幅 | local完了 |
| VC3B 生涯/夢/終端 | M0 | scene worker | 9 route、save/skip/replay、5幅 | local機械実装完了 |
| VC4/6 4 biome・40地域・記録/overlay | AR1R-B/VC3B | region/records workers＋root | 40/40、4-way contract、bundle | local完了 |
| VC5 神/敵/装備presentation | surface固定 | root | contact audit、P0 batch≤12、fallback | local安全策完了 |
| VC7 統合・正典・独立監査 | 全local実装 | root＋fresh auditor | unit/lint/build/visual、監査表 | local完了・Round 2 PASS-with-notes |

## ③完了済み

- 計画Forgeは`docs/CODEX_FORGE_STATE_FULL_GAME_VISUAL_PLAN.md`でRound 2 PASS、A/B/C/D/E=5/5/5/5/5、blocking 0。
- 開始HEAD/origin-mainは`7966fa25daf5b34e5cbb829c9510d3b1f3895b77`。既存M35/AR0/AR1/plan dirtyは保持し、commit/push/deployしない。
- VC0: `docs/qa/visual-closure-ledger.json`にScreen 22、Region 40、route外overlay 6、計68行を列挙。全行を実在するsource/runtime/evidenceとSHA-256へ接続した`code-integrated`として記録し、必須state×5幅証拠のない行は`scene-integrated`へ昇格しない。`scene-ready/released`も0。validatorは過剰昇格を拒否する赤/緑testを持つ。
- AR1R画像: 星祠、豆腐屋、出立門のsource/alpha/runtime PNG+WebPを生成。3 WebP合計90,716 bytes、edge alpha 0、key-like pixel 0。既存4点と合わせてsource/runtime hashを`asset-manifest.json`へ分離記録し、`npm run check:visual-manifest`は7/7 PASS。OpenAI利用条件と所有者の公開・商用利用承認を記録し、7点を`cleared / accepted`へ更新した。
- AR1R-A code: 5施設を同一投影・左上光・二層接地へ統一し、normal/crisisの形状差、接地NPC、近接時だけのportrait/name/prompt、code-native fallbackを実装。Village unit 12/12、5幅 5/5、lint/build PASS。外部初見/物理性能/rightsは未達。
- AR1R-B code: 蛍火0層のwall/water bank/POI/gather/light/player/rare予兆とBattleのmatte/crop/contact、rare/boss単一hero、rare drop帰還traceをdefault-OFF V2へ実装。focused 11/11、5幅＋1600、keyboard/reduced-motion、lint/build PASS。外部初見/物理性能/rightsは未達。
- VC2入口: Titleを右の大燈籠を生かす左綴じ表紙へ再構図し、正常/控え復旧/破損/なしを区別するread-only save診断を追加。Introは過去頁を捨てずscroll可能にし、11頁すべてへ到達可能。unit 4/4、5幅10/10、横overflow 0、44px controls PASS。
- VC3B: 生涯5 routeを命の綴り、夢2 routeを夢の縁、finale/endingを灯の岐路の3 kitへ統合。Vitest 649、VC3B visual 15/15、既存M34/夢guard 40/40、lint/build PASS。
- VC3: 鍛冶は人物・装備3枠・弱点・推薦3件を先行表示し、蔵は目的別4入口、出立は最大4候補＋絵地図/一覧同期＋確認Sheet、遠征は現在節/分岐/隊/帰還を一枚へ統合。5幅＋1600px、Sheet操作、19 testsをPASS。
- VC4/6地域: 40/40地域へ固有の二材質、silhouette、landmark、danger形状、navigation、motion、sound宣言を追加。4 macro biome、12 signature、16 role bundle、texture 0のcode-native layerとしてV2時だけ実描画し、V1既定OFFとmap/collision/saveを維持。関連178 testsとbrowser smokeをPASS。
- VC6記録/overlay: 家譜=綴じ本、図鑑=拓本帳、普請=単一建築図、家系図/設定/共通Sheet/toastを再構成。toastは非modal通知として読上げ、自動/44px手動消去を持つ。5幅50件の入口・星契り・記録/overlay回帰をPASS。
- VC5: 実参照1,749画像をdecoded hash/dHash/比率/輝度/contact sheetで監査。欠落0、exact重複0だが、神MAXは人格・画風連続性が弱いため承認allowlistを空で導入し、未承認MAXは通常像を置換しない。装備は一括再生成せず、slot/rarity/比較surfaceで統一する。
- AR1R追加画像: 星祠、豆腐屋、出立門のsource/alpha/runtimeを生成・透過処理し、既存4点と合わせmanifest 7/7へ統合。新規3 WebPは合計90,716 bytes。権利は未確認のままdefault-OFF経路へ隔離。
- VC7機械gate: Vitest 33 files / 677 tests、oxlint、production build、visual closure 68/68、asset manifest 7/7をPASS。郷5幅30/30、蛍火旅程5幅21合格・4意図的skip、鍛冶/蔵修正後PC/mobile 8合格・2意図的skip。入口/星契り/記録/overlayの既存5幅50件もPASS。Linux/Windows間のtext hashをLF正規化する回帰testを含む。
- 独立監査Round 1はREWORK。過剰な`scene-integrated`宣言、郷mobileの巨大余白と黒楕円/円環、蛍火の旧プロップ二重描画、Playwright集約timeoutをblockingとした。すべてをcode/schema/画面/分割実行で是正し、同じauditorへRound 2を依頼する。
- 独立監査Round 2はローカル`code-integrated`範囲でPASS-with-notes、blocking 0。`scene-integrated/scene-ready/released`は0を維持し、外部8名、4-way blind、物理性能、rights、chunk分割、Forge文字倍率200%をrelease前HOLDとした。監査記録は`docs/qa/full-visual-independent-audit-20260721.md`。

## ④保留リスト

- AR1/VC7の外部人間8名blind test: 外部実参加が必要。local独立agentで代替しない。
- 物理低性能mobile/PC gate: 現在のheadless SwiftShader値で代替しない。
- built-in image generationのmodel識別子はtoolから露出していないため台帳へ明記した。公開・商用利用権利はOpenAI利用条件と2026-07-21の所有者承認により閉鎖済み。具体的な第三者権利の申立てがあれば該当素材を停止して再審査する。

## ⑤質問キュー

- 非緊急: local実装完了後に、外部8名testと物理端末を誰が担当するか。
- 公開判断: commit/push/deployはlocal監査後に別途確認する。

## ⑥マイルストーン履歴

- M0開始: §18 Forge合格版を実装契約へ固定。既存dirtyと公開境界を保持。
- M0/VC0 local完了: 22 route・40地域・6 overlayの閉包台帳と機械gateを追加。
- AR1R asset tranche完了: 残り3 facadeを生成、透過、512×384 runtime化、dark/light checker目視まで実施。
- AR1R-A/B local mechanical completion: default-OFFのまま5施設完成画角と蛍火→戦闘旅程を閉鎖。
- VC2入口 local completion: save破損復旧表示とIntro全文到達を5幅で閉鎖。
- VC3B local mechanical completion: 3 surface kitと全5幅・既存進行回帰を閉鎖。

## ⑦次の一手

default-OFF公開はHEAD `91d54ca78f554a866c3b0ef09adbed3cfb557eea`、Actions run `29802506479`で完了。次は外部8名blindと物理低性能端末を実施し、結果が基準を満たす場合だけ`regionVisualV2`のproduction cohort有効化とAR1 Phase Exitを別途判断する。

## ⑧最終監査表

監査種別: independent audit（Round 1 REWORK、Round 2 PASS-with-notes）

| 契約項目 | 判定 | 証拠 |
|---|---|---|
| M0/VC0 | ✅ local | closure ledger 68行を`code-integrated`、validator 7 tests、manifest 7/7。scene-integrated偽昇格0 |
| AR1R-A/B | ⚠️ | local機械実装と5幅はPASS。外部・物理性能・rights gateは未達 |
| VC2/3/3B | ✅ local | 全route固有surface、5幅、save/skip/replay互換を直接確認 |
| VC4/5/6 | ✅ local / ⚠️外部 | 40/40 runtime、記録/overlay、1,749画像監査。人間評価とrightsは未達 |
| 機械/実画面 | ✅ local | 676 unit、lint/build、closure68、manifest7、分割Playwrightを直接完走 |
| 外部3gate | ⚠️ | 保留 |
| push/deploy境界 | ✅ | scope外 |
| 独立監査 | ✅ local / ⚠️外部HOLD | Round 2 blocking 0。release前対策は監査記録へ固定 |

## ⑨terminal印

ローカルterminal — 2026-07-21。独立監査Round 2 PASS-with-notes。公開・外部gateは未完のためHOLD。
