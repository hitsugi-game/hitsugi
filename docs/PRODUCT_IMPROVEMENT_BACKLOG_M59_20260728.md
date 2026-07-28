# HITSUGI 残改善余地の多角監査 M59

作成日: 2026-07-28
対象: `origin/main` / 公開版 / M57・M58を含むローカル作業版
目的: 実装済み項目を重ねて作り直さず、残る改善余地をユーザー影響・直接証拠・完了条件・依存関係で並べる。

## 1. 結論

次に必要なのは、敵・神・装備・画像の追加量産ではない。現時点で神180柱、敵579体、装備810点、事件282件、地域40、配信画像2,825点を持つ。残る大きな課題は次の五つである。

1. **直近の閉じ込め修正を独立して公開版へ届ける** — M58はローカル検証済みだが未公開で、成人・生業の儀から戻れない公開版の問題が残る。経済変更を含むM57とは同梱しない。
2. **核心判断を小さな文字や長い縦積みに埋めない** — mobile戦闘の対処文が8px、一族欄も人数増加時の高さが未閉鎖である。
3. **機械試験で代替できない体験を測る** — 初見8名、一世代5名、低性能物理端末、200%文字倍率が未実施で、魅力・理解・快適性を完了扱いにできない。
4. **壊れた時と遅い時の信頼性を上げる** — root Error Boundary、release preview、browser smoke、初期配信削減、意味のあるloadingが不足する。
5. **設計済みのM55・M56・M45を小さなpilotで実装する** — 探索、星籤、主戦、継承物語は一括投入せず、先行gateを通った型だけ拡張する。

推奨順は `M58単独公開可能化 → save import/storage復旧 → M57 UI閉鎖 → M57 MP経済gate → 外部baseline/公開基盤 → M55 Phase A → M56 protocol/Phase A → 主戦・三星択一pilot → 継承物語pilot` とする。

## 2. 現況と証拠境界

| 区分 | 2026-07-28の直接確認 |
|---|---|
| Git | `HEAD = origin/main = afc42e688a9c98799b382dbd3ea4416917bf1637` |
| 公開 | `https://hitsugi-game.github.io/hitsugi/` HTTP 200。entryは`index-B8ol1AVx.js` |
| CI | Actions run `30311447155`、head `afc42e6`、`success` |
| 公開bundle | M47「薬種見世」、M48「戦果を携えて進む」、M49`monthly-decisions`を確認。M57「灯芯手入れ」とM58帰郷導線は未検出 |
| ローカル | M57・M58とその正典・testを含む既存dirty差分を保持。M59は実装・commit・push・deployを行わない |
| 配信量 | `public/` 2,825 files / 241.68 MiB、直近`dist/` 2,847 files / 244.01 MiB |
| bundle | 直近local buildのmain JS 1,458.8 KiB、CSS 221.5 KiB。Village/Dungeonだけlazy、他主要画面はentryへ静的import |
| security | `npm audit`はprod/devとも脆弱性0。これはUX、権利、公開事故、実機性能の安全を代替しない |
| visual closure | 69/69が`code-integrated`。69件すべてrights/human/independent/state coverageがpendingで、`scene-integrated`は0 |

### 既に解決済みで再実装しないもの

- M43: 初回導線、唯一成人の初期編成、後継指定、今代の約束、序盤12敵の戦闘文法、全戦闘オート、save-local milestone、現行星籤保証。
- M46: 資質連動Lv8〜12、能力別成長、戦果見立て、二重報酬防止。
- M47B/C: 遠征checkpoint、敗北の同期精算、戦闘予告の「行動候補」契約、中盤連戦の実経路計測。
- M50: 適応型BGM、音量bus、幼子の人物仮肖像、一族grid。
- M51: 出立ごとの決定論的な地図・宝箱・事件・加護変奏と旧checkpoint互換。
- M52〜54: Sheet中央化、探索map-native化、戦闘背景との役割分離。
- M47〜49は`STATUS.md`の表記に反して現行main・公開bundleへ含まれる。コードを重複実装せず文書だけ同期する。

## 3. 優先順位の定義

- **P0**: 現在の公開利用者が閉じ込められる、核心判断が読めない、または次の投資判断を誤らせる項目。
- **P1**: 次の公開や主要pilotより前に閉じるべき、信頼性・性能・探索/星籤の土台。
- **P2**: P0/P1の証拠が揃った後に、一つずつ効果を測る魅力・継続施策。
- **P3**: 保守、状態同期、将来候補。今は量産・一括展開しない。

## 4. P0 — 先に閉じる

### M59-P0-01 M58帰郷導線を独立した公開単位にする

- **状態/影響**: M58の成人/生業の儀からの帰郷はローカルのみ。公開版では選択を確定するまで戻れない場面が残る。M57は決断UI、一族layout、MP経済を含むため同じrelease単位にしない。
- **根拠**: `docs/STATUS.md:7-9`、`docs/GDD_v3.md` §8.41、公開bundleでM58 markerなし。
- **完了条件**:
  - M58のscene帰郷/再開だけを抽出し、M57と他dirty差分を混ぜず対象ファイル・test・正典を列挙する。
  - 全Vitest、lint、data、visual closure、manifest、production build、scene 5幅回帰を再実行する。
  - PC1280/mobile390/360で、選択前・確認前→帰郷→灯の余白→同人物再開を確認する。
  - 未確定、月/成長/灯型/家業不変、deferred複製0を固定し、明示的な公開承認後だけcommit/pushする。
  - Actions成功と公開bundle markerを確認し、問題時にM58だけをrevertできる。
- **依存/gate**: pushは本番公開。M59監査では実行しない。

### M59-P0-02 mobileの戦闘判断と一族一覧を可読域へ戻す

- **状態/影響**: `battle_m43.css`はmobileの固有対処文を8px、兆しを9pxにする。M57 mobile一族欄は選択人物の詳細と同人物を含む小札を一列へ積み、人数増加時に「今月の決断」が遠い。
- **根拠**: `src/ui/battle_m43.css:67-73`、`src/ui/Home.tsx:431-470`、`src/ui/m17_home.css:120-182`。
- **完了条件**:
  - 戦闘の兆し/対処は12px以上、2行まで。省略時もclick/keyboard/touchの一操作で全文を読む。
  - 200%表示で兆し・敵札・味方札・ログの交差0。色を消しても「止・受・崩」と危険度が分かる。
  - 一族は390pxで選択中以外を二列要約または一定高一覧へし、重要文字12px以上。1/2/4/8人で横overflow 0、重複詳細0。
  - 初見6/8が敵の危険と対処を説明し、4人時の一族選択を一画面前後で完了する。
- **依存/gate**: M57の決断UI・家譜layoutだけを別commit候補とし、灯芯手入れはM59-P1-06合格まで公開対象へ入れない。

### M59-P0-03 現行体験の外部baselineを取得する

- **状態/影響**: local testは多数あるが、初回30分、初継承、再訪、探索理解、魅力、物理端末性能は未測定。追加制作の優先順位を推測で決めている。
- **根拠**: `docs/STATUS.md:106-118`、`docs/PRODUCT_ENGAGEMENT_ADDITIONS_M45_20260723.md:148-181`。
- **完了条件**:
  - 初見8名: 10分以内の契り→誕生6/8、30分以内の初帰還または安全中断6/8。
  - 一世代5名: 初継承中央値45分以内、継承後に3/5が自発的に次月を始める。
  - 低性能物理端末: 10分runでPC55/mobile30fps、1% low 24fps、操作不能jank 0。
  - 介助、戻る、誤操作、離脱理由を分母付きで保存する。自由文・人物名・端末IDをゲームsaveや外部へ送らない。
- **依存/gate**: 参加者同意、端末、観察者が必要。外部analytics導入は別承認とし、最初はQA export＋観察票で行う。

### M59-P0-04 全画面障害時の復旧と解析placeholderを安全化する

- **状態/影響**: root Error Boundaryがなく、render/chunk load失敗で画面全体とsave救出導線を失う。解析は未設定と説明しつつ、`index.html`が第三者`gc.zgo.at/count.js`を常時取得する。
- **根拠**: `src/App.tsx:1-23,171-234`、`src/main.tsx`、`index.html:27-35`。`count.js`は監査時HTTP 200/9,213 bytes。
- **完了条件**:
  - root復旧画面へ「再読込」「検証済みsaveを書出す」「診断IDコピー」を置く。
  - 強制render throw、lazy chunk 404、main破損＋正常BAKをPC/mobile E2Eで再現する。
  - GoatCounterを採用・説明・opt-outまで決めない間は外部scriptをHTMLから除く。有効化時はplaceholder 0、送信OFFで挙動不変、二重送信0を確認する。
- **依存/gate**: provider/プライバシー判断と外部送信はユーザー承認が必要。

### M59-P0-05 save importの成功表示を実書込みと一致させる

- **状態/影響**: `saveGame()`はread-only、全quota失敗、非quota例外でも成功/失敗を返さない一方、`importSaveString()`は呼出し後に無条件で`true`を返す。UIが「セーブを読み込んだ」と表示しても、再読込後に反映されない可能性がある。
- **根拠**: `src/core/save.ts:314-346,612`、`src/ui/Title.tsx:23`。
- **完了条件**:
  - `saveGame()`を明示的な`SaveResult`へし、importは書込み後の`saveSeq`またはfingerprint再読込一致でだけ成功する。
  - 成功確定まで既存main/BAKを破棄しない。失敗時は原因と旧save保持を通知する。
  - read-only、全quota、非quota例外、書込み後改変、import→reload完全一致を自動testする。
  - `localStorage.getItem/setItem/removeItem`の`SecurityError`は共通safe adapterで処理し、Titleと設定、正常な非保存プレイを表示する。
- **依存/gate**: 容量逼迫、storage拒否、Safari private相当を実ブラウザ/実機でも確認する。

## 5. P1 — 次の公開と主要pilotの土台

### M59-P1-01 本番pushだけに依存しないrelease経路

- **状態/影響**: workflowは`push main`/手動だけで、PR、preview、Playwright、visual closure、asset manifest、公開後smokeがない。`main push = 本番`で、回帰発見が公開後になりうる。
- **根拠**: `.github/workflows/deploy.yml:3-43`、`docs/DEPLOY.md:13-15`。
- **完了条件**:
  - PRでlint/data/Vitest/build＋核心route browser smokeを実行する。
  - preview URLを本番と分離し、M57/M58、Home、Pact、Dungeon、Battle、save復旧を確認する。
  - main保護を実在確認し、必須check・レビュー・直接push方針を記録する。
  - deploy後にHTML/entry/CSS/deferred chunk/commit markerをHTTP検証し、失敗時は公開成功扱いにしない。

監査時のGitHub APIではmain branch protection/rulesetがなく、Actions SHA pinning強制もなかった。Organization管理者によるrulesetとEnvironment reviewerの設定を外部gateとする。

### M59-P1-02 初期配信・画面遷移・実機性能を予算化する

- **状態/影響**: 配信物241.68MiB、main JS約1.49MiB。Village/Dungeonだけlazyで、低速時のfallbackは意味の薄い待機表示になりうる。
- **根拠**: `public/`/`dist/`実測、`src/App.tsx:1-23,224-230`、`docs/qa/ar1-performance-telemetry-20260721.md:5-41`。
- **完了条件**:
  - route/data単位で分割し、Title/Homeまでの初期gzip JSを250KiB以下の目標で計測する。
  - 未訪問の画像/data/Pixi chunkを取得しないallowlist testを持つ。
  - loadingに画面名、進行、失敗時retryを示す。prefetchはユーザーの次行動候補だけに限定する。
  - 3G相当と物理端末でLCP/INP/CLS、FPS、1% low、memory、10分jankを保存する。

### M59-P1-03 M55探索強化はPhase Aだけから始める

- **状態/影響**: M51で内容は変わるが、歩行方向、短期目的、暗部、HUD、発見の段階表現はM55設計のみ。40地域へ一括展開すると性能と可読性を同時に崩す。
- **根拠**: `docs/STATUS.md:37`、`docs/DUNGEON_EXPLORATION_APPEAL_FORGE_20260728.md:343-373,420-438`。
- **完了条件**:
  - Phase Aは暗部率、地図占有率、主経路、短期目的、tap反応、HUD交差だけを変更する。
  - PC/mobileで初期3秒後に進行方向と目的を7/8が説明。横overflow/HUD交差0。
  - M54の探索画像network request 0、collision、地形、報酬率、全戦闘オートを維持する。
  - 合格後のみPhase B歩行反応、Phase C`discoveryV1`、Phase D四地域pilotへ進む。

### M59-P1-04 M56の4 blockingを閉じ、確率表示だけ先行する

- **状態/影響**: 三星択一/主戦計画はForge停滞中。measurement oracle、stop threshold、claim原子性、rescue validatorを曖昧なままruntime化すると複製・報酬欠落・誤計測が起こりうる。
- **根拠**: `docs/CODEX_FORGE_STATE.md:30-51`、`docs/GACHA_BALANCE_PRECISION_PLAN_20260728.md:281-290,347`。
- **完了条件**:
  - `M56_PROTOCOL_ORACLE_APPENDIX_20260728.md`へ4 IDだけを固定し、fresh独立監査blocking 0。
  - Phase Aでは`nextStarLotteryOdds()`を単一情報源にし、基礎率と「次の一籤」を分離表示する。確率・保証値・save schema・三択・戦闘へ触れない。
  - 10/20/50直前、未所持0、全所持、縁上限で表示と実抽選一致。PC/mobile/keyboardで保証を6/8が説明する。

### M59-P1-05 visual identity・権利・状態証拠を分離して閉じる

- **状態/影響**: closure 69 greenは実画面完成を意味せず、全件`code-integrated`止まり。神normal/MAXの同一性、既存`face_*`のモデル系譜、画風混在も残る。
- **根拠**: `docs/qa/visual-closure-ledger.json`、`scripts/validate_visual_closure.mjs:182-231`、`docs/qa/vc5/asset-presentation-audit.md:23-41`、`docs/STATUS.md:23,62`。
- **完了条件**:
  - 重要12経路から正常/空/disabled/error/reduced-motion×5幅の実captureを紐付ける。
  - 生成7点とM38の承認済み素材を「外部魅力未検証」と混同せず、既存顔・神MAXの未確認系譜だけをpendingにする。
  - 配信対象2,825点のpath/hash/source/generator/model-license/owner approval/replacementを持つBOMを作る。現行の強いmanifest 9点だけを全素材clearedの根拠にしない。
  - `public/`/`dist/`とBOMを照合し、未登録0、hash不一致0、restricted runtime参照0にする。
  - 神normal/MAXを12柱単位で匿名対比較し、同一神6/8、画風まとまり6/8を満たす高リスク分だけ交換する。
  - human/independent/performanceを通った行だけ`scene-ready`へ昇格し、一括昇格しない。

### M59-P1-06 M57灯芯手入れを資源経済pilotとして検証する

- **状態/影響**: 奉燈15で月を送らず最大MP30%を回復する灯芯手入れは、単なるUI修正でなく探索継続、静養、奉燈支出へ影響する新しい経済行動である。単体条件testは合格しているが、資源循環と難易度の非劣化は未測定。
- **根拠**: `src/core/store.ts:1649-1656`、`docs/GDD_v3.md` §8.40、`docs/STATUS.md:11`。
- **完了条件**:
  - 現行baselineと灯芯手入れ有りを同seedで比較し、奉燈p10/p50/p90、月あたり使用回数、静養選択率、帰還/全滅/断絶、初継承月を記録する。
  - 100 seed campaignで進行不能0、奉燈枯渇による初回導線悪化0、静養が死に選択になる利用率低下なし。閾値は計測前に固定する。
  - 価格15・30%を同時に動かさず、必要なら一変数だけ調整して再測定する。
  - mobile一族layoutのM59-P0-02を先に閉じ、UI不良と経済効果を混同しない。
- **依存/gate**: 合格後だけM57灯芯手入れを独立commit/公開候補にする。決断応答/家譜layoutは別release単位を維持する。

## 6. P2 — 土台合格後の魅力・継続pilot

### M59-P2-01 三星択一と主戦3体pilot

- **依存**: M59-P1-04合格後。
- **三星択一**: open時に同位階三候補をsave-first保存し、claim一回で確定。reload同候補、二重click/旧save/BAK復旧の複製0、保証違反0、1,000 seed×50籤の新規札中央値48以上。
- **主戦**: 骸星=止、夢幻=受、翡翠=崩だけを先行。公開兆しだけで手動/全オートが同じ対処を行い、正対処勝率95%以上、無視との差を400 seedで示す。三体合格前に11体へ広げない。

### M59-P2-02 今代の約束と一組の記憶

- **依存**: 外部baselineとM57/M58公開後。A2約束pilotとA3家族pilotは同時投入しない。
- **内容**: 今代の約束を一代に最大1〜2回だけ響かせ、継承時に決算する。家祖と最初の子一組は新規強制sceneでなく既存sceneの置換で関係を残す。
- **完了条件**: 約束と結果を4/5、家族関係を6/8が説明。deferred queue純増0、初継承中央値45分以内。
- **根拠**: `docs/PRODUCT_ENGAGEMENT_ADDITIONS_M45_20260723.md:188-198`。

### M59-P2-03 コレクションを率から三つの物語へする

- **内容**: 810点の一覧をさらに増やさず、三品だけ家宝として額装。初所有者、代数、討伐、約束、宿敵を既存記録から表示する。戦力補正・固定損失なし、差替え可。favorite/保護/保管はundo可能にする。
- **完了条件**: 一世代プレイヤー3/5が自発的に額装し、由来を説明。最強装備固定を3/5以上が選ぶなら採用しない。
- **根拠**: `docs/PRODUCT_ENGAGEMENT_ADDITIONS_M45_20260723.md:134-146`。

### M59-P2-04 神縁12柱・四地域怪異・宿敵を別pilotで測る

- **神縁**: 12柱だけに初所持/初契り/次代再会を一度ずつ記録。詳細閲覧5/8、人物像想起5/8未満なら180柱へ展開しない。
- **四地域怪異**: 痕跡→選択→主戦で意味を返し、対処を6/8が説明。初見殺し2/8以上なら撤回する。
- **宿敵**: 遭遇/逃走/最終遭遇月と討滅済み因縁を残す。翌日想起6/8、「しつこい」2/8超なら頻度を下げる。
- **根拠**: `docs/PRODUCT_ENGAGEMENT_ADDITIONS_M45_20260723.md:78-122`。

### M59-P2-05 navigation・zoom・assistive technologyの全route契約

- **状態/影響**: 全画面遷移は先頭scroll/h1 focusへ統一されるが、戻る時の起点復帰、200/400% reflow、読み上げ、全主要操作44pxの証拠は部分的。
- **完了条件**:
  - forwardは先頭+h1、back/Sheet/再読は起点scroll±20pxとfocusを復元する。
  - 全主要操作44px、補助操作24px、本文contrast 4.5:1、色なし状態識別。
  - 200/400%、360/390、NVDA/VoiceOver各1巡で操作不能0。
  - viewport変更したDesktop Chromeだけでなく、PlaywrightのMobile Chrome/Pixel、WebKit/Mobile Safari、FirefoxでTitle→開始→Home→出立→戦闘→save reloadの最小smokeを通す。

## 7. P3 — 保守・保留

### 今すぐ直す小さな整合

- `STATUS.md:25-27`のM47〜M49を現行main/公開bundleへ同期する。今後は`design / local / committed / deployed / verified`を一行で区別する。
- `STATUS.md:117`の「Dungeon checkpointの公開反映」を、M47B公開済みの記録へ同期する。
- Playwrightで観測された`BirthScene`のlist key警告を、該当配列の安定IDで解消する。見た目が同じでもconsole warning 0をrelease smokeへ加える。
- Actionsのmajor tagはSHA pinまたは更新bot方針を決め、Node runtime非推奨警告を放置しない。
- `validate_data.mjs`の恒常rank warningは、意図した上限ならvalidator/正典を更新し、異常ならdataを直す。「常に出る警告」にしない。

### 外部結果まで保留するもの

- 180柱すべての長編、残り36地域へのM55一括展開、神/敵/装備/事件/画像の追加量産。
- 全敵一律強化、level曲線の再調整、新通貨、課金石、日課、連続ログイン、期間限定、FOMO。
- 全戦闘オートの制限、オート報酬差、手動専用drop。
- 完全新規迷路生成。M51の変奏とM55 Phase Aを実利用してなお「毎回同じ」が残る場合だけ別mission化する。

## 8. 実行ロードマップ

| Wave | 対象 | 終了条件 | 次へ進めない条件 |
|---|---|---|---|
| 0A | M58だけを公開可能化 | scene 5幅、未確定/再開/複製0、scope限定、明示公開承認 | M57または他dirty混入、同人物再開不能 |
| 0B | P0-05 save import/storage、root復旧、解析script停止 | false-success 0、旧main/BAK保持、reload一致、storage拒否実ブラウザ、第三者request 0 | save復旧不能、SecurityErrorでblank、旧save破棄 |
| 0C | M57決断UI/家譜layoutとmobile戦闘可読性 | 8px解消、1/2/4/8人、200%表示、経済変更0 | 灯芯手入れ混入、8px/縦長/重複詳細残存 |
| 1 | M57灯芯手入れ経済pilot、release preview/CI、性能予算、外部baseline | 100 seed非劣化、初見8/一世代5/実機、公開smoke、性能artifact | 閾値後付け、静養死に選択、重大摩擦、実機未測定 |
| 2A | M55 Phase A | 3秒理解7/8、HUD交差0、M54契約維持 | 未達ならPhase B/地域追加を止める |
| 2B | M56 4 blocking＋Phase A | fresh監査blocking 0、次回実確率一致 | appendix不合格なら三星択一/主戦へ進まない |
| 3 | 三星択一、主戦3体、約束または一組の記憶のうち一つ | save安全、400 seed、人数閾値、baseline比 | 二施策同時投入、因果不明、初継承悪化 |
| 4 | 合格した神縁/地域怪異/宿敵/家宝だけ拡張 | 各pilotの想起・説明・再訪gate | 未達の型を物量で補わない |

## 9. 次の実装missionの推奨範囲

次は三つの別missionに分ける。第一にM58帰郷導線だけを抽出・検証・公開候補化する。第二にP0-05のsave import false-successとstorage拒否/root復旧を閉じ、以後のrelease blockerへする。第三にM57の決断UI/家譜layoutとmobile戦闘可読性を経済変更なしで閉じる。灯芯手入れはその後M59-P1-06で資源経済を測り、合格時だけ独立公開する。CI再設計やM55/M56をこれらのcommitへ混ぜない。

## 10. 監査上の留保

- この文書は残改善余地の監査であり、M55/M56/M45のruntime実装完了を示さない。
- headless Chromium、Vitest件数、closure件数、素材数を「ユーザーが魅力を感じた」証拠にしない。
- 生成7点とM38追加2点の所有者承認は既存記録を尊重するが、既存`face_*`・神MAXのモデル系譜まで一括clearedにはしない。
- M59中はcommit、push、deploy、外部送信、参加者募集を行っていない。
