# 灯継ぎ -HITSUGI- 体験再設計・URL移行マスタープラン

> 2026-07-20更新: ユーザーは外部公開用Organization `hitsugi-game`を作成し、repositoryを`hitsugi-game/hitsugi`へ移管した。新Pages `https://hitsugi-game.github.io/hitsugi/`はHTTP 200、旧Pagesは404。公開案内前で外部利用者0人のため、今回の移管では一般利用者向け旧origin救出を省略した。今後公開後にoriginを再変更する場合は§9の移行gateを再適用する。詳細は`docs/CODEX_HANDOFF.md`。

- 状態: 実装前ドラフト（Claude / Fable 5への実装指示に変換可能）
- 作成日: 2026-07-20
- 基準commit: `478be96241124aa5c530acac2b768c8e1d9a7824`
- 正典: `docs/GDD_v3.md`
- 対象: UI/UX、遊びの復帰性、主要画面の魅力、モバイル快適性、公開URL
- 非対象: この文書でのpush、DNS変更、GitHubアカウント名変更、課金導入

## 0. 結論

本作は「素材や機能が足りない」段階を越え、**豊富な内容を一つの感情的な流れへ編集する段階**に入っている。

主経路は次の一文に集約する。

> **郷で家族の危機を知る → 今月の一手を決める → 夜藪で代償を払う → 帰還後に人・景色・家譜が変わる → 次代を見たくて再開する。**

したがって、追加機能を先に増やすのではなく、次の順で進める。

1. モバイルの横崩れ・操作衝突・画面遷移後のスクロール残留を除去する。
2. Homeの複数推薦を「今月の要」一面へ統合する。
3. 帰還後と再開時に「何が変わったか／次に何をしたかったか」を見せる。
4. 鍛冶・図鑑・出立を、全件閲覧中心から人物・目的中心へ変える。
5. 実ユーザー計測で初回継承までの詰まりを特定してから、大きな追加制作を行う。
6. 現在のOrganization URLを正典化し、独自ドメインは公開後の利用実績を見て別案件で判断する。

URLについては、当初**GitHubアカウント名やリポジトリ名を変えず、独自ドメインをGitHub Pagesへ設定すること**を推奨した。その後、ユーザーは社内用accountを保護しつつ外部公開物を分離するため`hitsugi-game` Organizationへrepositoryを移管した。外部利用者0人・公開案内前だったため今回のorigin変更では一般利用者向け救出を省略した。今後、利用者発生後にURLを再変更する場合は、`localStorage`移行と旧origin救出を必須へ戻す。

## 1. ミッション契約

### 1.1 表明されたテーマ

- [事実] 現在の状況を確認し、楽しさと快適さを両立する画面設計を作る。
- [事実] `https://umine2025.github.io/hitsugi/`の`umine2025`部分を変更できるか判断する。

### 1.2 本当に解く仕事

- [推定] プレイヤーは「機能一覧」を消化したいのではなく、短命な家族に愛着を持ち、迷いながら一手を選び、その痕跡が世界に残る体験を求める。
- [推定] 現在の主な欠損はコンテンツ量ではなく、優先順位、因果の見せ方、再開時の記憶補助である。
- [推定] URLの目的は匿名化ではなく、ゲーム名で覚えられる公開住所とブランドの独立性である。完全な匿名化が目的なら、公開リポジトリやDNS参照先からGitHub名を追跡できるため別設計が必要になる。

### 1.3 成功条件

#### 画面・操作

- 360 / 390 / 768 / 1280 / 1440pxでページ全体の横スクロールが0。
- 主要タッチ目標は44×44px以上、戦闘の主要コマンドは48pxを推奨。
- どの主要画面でも5秒以内に「現在地」「危機」「次の主行動」「戻り方」を説明できる。
- Homeでは主推薦が一つだけ表示され、綴・血脈診断・行動札で結論が矛盾しない。
- 画面遷移時は新画面の先頭へ移り、戻る場合だけ必要な内部位置を復元する。
- 購入、鍛錬、月送り、セーブ削除など不可逆操作は結果と費用を確認してから実行する。

#### 楽しさ・復帰

- [仮説] North Starは「7日コアループ継承完了率」とする。
- 新規セーブが7日以内に、星契り→子の命名→初回帰還→初回当主継承まで到達したかを測る。
- 再開後10秒以内の意味ある操作率、Homeから月行動確定までの時間、帰還後60秒以内の次行動率を測る。
- 起動・日参り受領・静養連打だけを成功行動に数えない。

#### URL移行

- 現在の正典URLを`https://hitsugi-game.github.io/hitsugi/`、正典repositoryを`https://github.com/hitsugi-game/hitsugi`に統一する。
- README、DEPLOY、MARKETING、OGP、status文書に旧owner URLを「現行」として残さない。
- 次回origin変更時だけ、旧セーブfixtureを書き出し、新URLへ読み込み後に一族・装備・通貨・家譜・flagsが一致する救出gateを再適用する。
- UI刷新と将来のorigin切替を同じ公開単位へ混ぜない。

### 1.4 前提と権限境界

- [事実] `main`へのpushは公開デプロイと同義で、ユーザー確認が必要。
- [事実] ドメイン購入、DNS、GitHub Pages Settingsは外部状態を変えるため、この計画では実施しない。
- [仮説] PCとスマートフォンを同格の対象にする。
- [事実] Organization移管時点は公開案内前で外部利用者0人だったため、今回のowner変更では一般向けセーブ救出を省略した。
- [仮説] 公開後の次回origin変更では既存セーブ保有者がいるものとして移行を設計する。
- [仮説] 実装担当はClaude / Fable 5、Codexは計画・検収基準を渡す。
- [事実] 作業前から未追跡`tmp/`がある。本監査で`docs/CODEX_MASTERPLAN_DRAFT.md`と`docs/qa/`を追加した。実装時も`git add -A`を使わず、各commitの所有pathだけstageする。

## 2. 現状証拠

### 2.1 リポジトリと品質ゲート

- [事実] 基準codeは`HEAD == origin/main == 478be96`でtracked treeはclean。本稿作成後の未追跡は、既存`tmp/`と、本監査成果`docs/CODEX_MASTERPLAN_DRAFT.md`、`docs/qa/`である。
- [事実] 2026-07-20に`npm run lint`成功、Vitest 19ファイル・565件成功、`npm run build`成功を再確認した。
- [事実] Playwrightは5 viewport、18 spec、205件を列挙する。ただしGitHub Pagesのdeploy workflowではPlaywrightを実行しない。
- [事実] 監査時は`docs/STATUS.md`にM27未pushの古い記述があった。2026-07-20のOrganization移管記録時に公開済みへ同期した。
- [事実] VillageとDungeonは遅延読込済みだが、main JSはビルド時1,348.27kB、gzip 408.40kBで、500kB chunk警告が残る。

### 2.2 公開版の実測

#### 良い点

- [推定] 2026-07-20の公開版目視では、タイトル画面が灯籠・常夜・一族のトーンを最も短時間で伝えていた。
- [事実] Homeは寿命、後継、一族、今月の4行動、11の帳メニューを意味のある見出しで構造化している。
- [事実] 鍛冶は検索、部位フィルタ、推薦、比較差分、確認購入、モバイルSheetを備える。
- [事実] Sheet共通部品は背景タップ、Escape、フォーカス復帰、スクロールロックを持つ。
- [事実] 戦闘とDungeonには矩形交差、暗部率、44px、1対2/4対4、地域差、稀相の自動検証がある。

#### P0: 先に直す実害

1. **Homeのモバイル横崩れ**
   - [事実] 2026-07-20、公開URLをChromeの390px相当でHomeへ進め、`document.documentElement.clientWidth`と`document.body.scrollWidth`を測ると`375 / 1049px`。
   - [事実] `.family-main`、当主の`.char-card`、`.family-smalls`、`.blood-diag`が約1020pxへ拡張され、ページ全体に横スクロールが生じる。
   - [推定] `@media(max-width:640px){.family-board{grid-template-columns:1fr}}`の`1fr`がmin-contentに負け、子へ`min-width:0`がないことが直接原因。
   - 受入: `.family-board { grid-template-columns:minmax(0,1fr) }`相当と子の`min-width:0`を入れ、Home全体の`scrollWidth <= clientWidth`を5幅で固定する。

2. **戦闘モバイルの上端競合**
   - [事実] 永続化した`docs/qa/baselines/20260720-battle-1v2-mobile-360-before.png`では、行動順・敵の兆し・敵名札が同じ上端に重なり、敵札の情報を隠す。
   - 受入: 1対2/4対4とも、行動順、兆し、名札の矩形交差0。行動順が複数行になる場合は領域高も追随する。

3. **郷モバイルの操作衝突**
   - [事実] 永続化した`docs/qa/baselines/20260720-village-mobile-360-before.png`では、D-padと近接人物の「話す」ボタンが下端で重なる。
   - 受入: 移動帯と近接行動帯を別領域にし、相互交差0、端から12px以上、全方向48px以上。

#### P1: 楽しさ・信頼を削る問題

- [事実] Homeには危機札、綴の助言、血脈診断、行動札の「薦」があり、最大4箇所で次行動を示す。
- [事実] 綴と主推薦は異なる判定経路を持ち、複合状態で結論が食い違う可能性がある。
- [事実] Homeを途中までスクロールして鍛冶へ移動すると、鍛冶が`scrollY=235`から開始した。`App.tsx`にscreen変更時のscroll resetはない。
- [事実] 鍛冶の購入一覧は333品。初回50品を表示しても、一覧そのものが主役になり、右の詳細面は未選択時に大きく空く。
- [事実] 鍛冶の「薦」は画面上で明示・変更できない`selChar`を比較対象にする。
- [事実] 出立の地域選択は40地域を一枚の縦長SVGで探し、隊員は毎回空から選び直す。
- [事実] Dungeonのモバイルでは安全行動「帰り火」が小休止の中へ隠れる。
- [事実] Dungeonのミニマップ拡大tap-zoneは透明で、タップ移動と外見上区別できない。
- [事実] 敵札タップと「攻撃」ボタンで対象決定の暗黙規則が異なる。
- [事実] 敵の兆し「攻・術・群」の説明はhover/title中心で、タッチでは意味を得にくい。
- [事実] 図鑑モバイルでは選択詳細が最大50件の一覧末尾に置かれ、押しても反応しないように感じやすい。
- [事実] 家系図の閉じると全画面設定が右上で競合する。
- [事実] `index.html`のfaviconは`/favicon.svg`で、project Pagesではowner直下を参照する。OGP 3箇所は旧URLを直書きしている。
- [事実] `hasSave()`はv1/v3/v4/backupを見るが、現行`downloadSave()`はv4 mainだけを読む。backupまたは旧版だけ残る利用者は「セーブあり」でも書き出せない。

#### 証拠の再現方法

- Home横幅: 公開版で続きから→Home、390px相当。consoleで`[document.documentElement.clientWidth, document.body.scrollWidth]`を評価し、`[...document.querySelectorAll('.family-main,.family-smalls,.blood-diag,.char-card')].map(x => x.getBoundingClientRect())`で原因を確認する。
- 画面scroll残留: Homeを200px以上scroll→鍛冶と蔵。遷移後`window.scrollY`を評価する。2026-07-20の公開版では235。`src/App.tsx:103-220`にはscreen変更時scroll resetがない。
- 戦闘/郷: `docs/qa/ui-audit-baseline-20260720.md`と永続化したbefore画像、`tests/visual/gate.spec.ts`、`tests/visual/village.spec.ts`を同時に確認する。gitignore対象の`.shots/`だけを荷重支持証拠にしない。
- URL: `index.html:5,12-15`、`src/core/save.ts:3-6,212-240,269-299`、`.github/workflows/deploy.yml`を一次証拠とする。

### 2.3 計測の空白

- [事実] GoatCounterは`your-code` placeholderのままで、現実の利用者数、離脱地点、既存セーブ数は不明。
- [事実] unit/visual testsは破綻しない配置をよく検証するが、「初回開始→命名→帰還→継承→翌日再開」の旅程テストはない。
- [事実] スクリーンショットは保存されるがpixel比較・人間の採否記録が自動ゲートではない。
- [推定] 「テスト数が増えた」ことを「魅力が増えた」ことの代替指標にすると、M24と同じ失敗を繰り返す。

## 3. 類似事例から借りる原理

### 3.1 Hades: 難しさを削るのでなく、物語へ戻す補助

- [事実] Supergiant GamesはHadesのGod Modeを常時選択可能にし、死亡のたびに耐久を少し増やす。[Hades公式FAQ](https://www.supergiantgames.com/blog/hades-faq/)
- [推定] 成功点は「簡単モード」を別ゲームとして隔離せず、失敗と物語進行の輪を保ったまま摩擦だけを下げたこと。
- HITSUGIへの適用: オートや推奨はゲームを代行する入口ではなく、同じ継承・探索・因果へ戻す補助に置く。オートを最上段CTAにせず、操作負担設定として扱う。

### 3.2 Xbox Accessibility Guidelines: 地図と一覧を競合させず併設

- [事実] Microsoftは、UIの一貫した位置・順序、keyboard/digital input、二方向スクロールを避けるreflow、全submenuから戻れる導線を推奨している。[XAG 112: UI navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112)
- [事実] 同ガイドはHalo Infiniteの地図に、地点を探さなくても選べるテキスト一覧を併設する例を挙げる。
- [推定] 地図の魅力を守る方法は一覧を消すことではなく、「候補を一覧で選ぶ→地図がその場所を見せる」という役割分担である。
- HITSUGIへの適用: 出立は「最前線／未討伐／前回地域」の短い候補一覧を先に置き、選択時に絵巻を中央へ寄せる。

### 3.3 Sea of Thieves / The Outer Worlds: 一貫した戻り方とreflow

- [事実] MicrosoftはSea of Thievesの選択・戻る・tab操作が複数画面で同じ位置と規則を保つ例、The Outer Worldsの最大文字サイズでも二方向スクロールを要求しない例を挙げる。[XAG 112](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112)
- HITSUGIへの適用: 「戻る」「閉じる」「詳細Sheet」「確認」を共通Shellへ寄せ、Homeだけでなく全主要画面の横overflowをCIで検査する。

### 3.4 内部の反例: M24→M25

- [事実] M24はVitest/build成功で公開したが実描画を十分に見ず、翌M25で暗部と390px戦闘重複を修正した。
- 教訓: 機械チェック、人間の5秒理解テスト、同一セーブbefore/afterの3つを揃えて初めて「魅力改善完了」とする。

## 4. 9つのレンズで見た非自明な洞察

### L1. コアファンタジー

- [推定] 本作の固有価値は戦利品の多さではなく、「この子を次代へ残すために今月何を犠牲にするか」である。
- 帰結: Home、出立、帰還、家系図を一本の因果として最優先し、独立した便利メニューの磨き込みは二段目に置く。

### L2. 注意と情報設計

- [推定] 333品、40地域、11メニューは量として魅力だが、初手で全件を並べると「何を選ぶべきか」を隠す。
- 帰結: 初期表示は全件ではなく、人物・目的・未達成に基づく3〜7候補。全件は明示的な「すべて見る」へ送る。

### L3. 推薦の信頼

- [推定] 推薦の重複は単なる情報過多ではない。異なる結論が出た瞬間に、プレイヤーはゲームの助言全体を信用しなくなる。
- 帰結: `recommendAction()`を唯一の決定源にし、各場所は同じ結果を別の語り口で表現するだけにする。

### L4. 因果と報酬

- [推定] 戦闘報酬のtoastだけでは「世界が動いた」と感じにくい。
- 帰結: 帰還後に最大3件だけ、人物・因縁・発見の順で差分を見せ、関連画面へ直行できるようにする。

### L5. 再開性

- [事実] 現在は前回の意図を保存・提示する「前回の灯」がない。
- [推定] 最大の離脱点はプレイ中より、数日後に「何をしていたか分からない」こと。
- 帰結: 続きからの直後に、未完の危機・最後の地域・次月確定事項から純粋導出した再開札を一度だけ出す。

### L6. 利便性とゲーム性の競合

- [推定] 郷の即移動は歩行と偶発会話を、最上段のオートは継足判断を迂回する。便利さが署名体験を食べている。
- 帰結: 初回訪問は歩行を促し、訪問済み施設は短縮可能にする。オートは副操作へ置き、いつでも停止可能に保つ。

### L7. 日次報酬の競合ループ

- [事実] 24時間離席、日参り、御題の合計報酬は序盤の星契り費用を遊ばず賄える場合がある。
- [仮説] 「家族の続きを見たい」より「日付が変わったから回収する」が強くなり得る。
- 帰結: いきなり削除せず計測し、受領だけで終了する率が高ければ、物語近況と再開支援へ置換する。

### L8. 自動検証の盲点

- [事実] 戦闘・Dungeonに強いvisual gateがある一方、Home、出立、鍛冶、図鑑、設定の390px旅程が薄い。
- 帰結: `body.scrollWidth`、主CTA可視、戻る導線、詳細表示、フォーカス復帰を全主要画面の共通contract testにする。

### L9. URLは保存設計

- [事実] 現行セーブは`hitsugi_save_v4`とbackupを`localStorage`へ保存する。
- [事実] Web Storageはorigin単位で、新しい独自ドメインから旧originの保存内容を直接読めない。[MDN Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- 帰結: URL移行はブランド設定ではなく、セーブ移行・旧リンク・OGP・DNS・TLSを含むリリースとして扱う。

## 4A. 引力の設計 — 「強さ」より「この家の次」を見たくさせる

本作の約束は、最強編成を完成させることではない。**短命な一族の誰に、残り少ない今月を使わせるか。その選択が人、郷、家譜へ残ること**である。全画面は次の感情曲線のどこを担当するか明示し、単なる機能入口を増やさない。

| 時点 | プレイヤーの問い | 画面が返すもの | 記憶に残す像 |
|---|---|---|---|
| 最初の30秒 | 私は誰で、何が危ない？ | 当主、寿命、今月の危機を一面で提示 | 消えかけの一灯と空いた座布団 |
| 3分 | 今月は何を選べばいい？ | 推奨1件、理由1文、他の選択肢 | 家族を前にした一度きりの決断 |
| 10分 | 自分の判断は戦いで通じた？ | 敵意図、対象、継足、負傷の因果 | 筆致で繋がる一撃と崩れる灯 |
| 帰還 | 何を持ち帰り、何を失った？ | 人物優先の差分を最大3件 | 郷の灯り・会話・家譜が変わる |
| セッション終端 | 次に何を確かめたい？ | 未解決の危機か次代の予告を一つ | 家系図の「次代が灯る」空節点 |

### 4A.1 五つの署名瞬間

1. **月初の一灯** — Home背景の大灯籠と一族の席が、危機の人物にだけ淡く反応する。
2. **地域入場の一枚絵** — 各地域の地形、光源、主の影を2秒以内で読ませ、同じ迷路の色替えにしない。
3. **稀相の三段予兆** — 環境の異常→固有の遭遇札→産地つき遺物の記録を一続きにする。
4. **継足の筆致** — 技名を増やすより、前の一撃から「なぜ繋がったか」が線と短文で分かる。
5. **帰還の三痕** — 数十個の取得物ではなく、人・因縁・発見から最大3件だけ世界へ刻む。

### 4A.2 健全な継続動機

- 主軸は`好奇心（次の地域/主）×習熟（兆し/継足）×愛着（一族）×収集（遺物/家譜）`。
- 「あと1回」は未解決の問いで作り、期限付き取り逃し、連続ログイン罰、購入連動の可変報酬で作らない。
- 稀相は低確率だけで釣らない。予兆で気づける、地域ごとに母集団が違う、初討伐後に家譜へ残る、重複品にも用途があることを保証する。
- 長時間プレイを強要せず、Home到着時と帰還後に安全な終了点を置く。再開時は「前回の灯」で目的を復元する。

### 4A.3 画面横断の視覚文法

- 深い藍は未知と夜、煤墨は境界、古金は選択可能、灯橙は「今すぐ注目」、朱は損失/危険だけに使う。
- 金枠を全要素へ配らない。主CTA、選択中、初発見のうち同時に最大2用途まで。
- 背景は物語を語るが、文字の背後では局所的に静かにする。画像へ文字・ボタン・人物を焼き込まず、UIと状態差分を実装層で重ねる。
- 希少度、属性、敵意図は必ず`色 + 形/glyph + 明記テキスト`の3系統中2系統以上で伝える。
- 動きは常時漂う環境層、選択への反応層、決着の一回演出に分離し、演出軽減で前二者を停止できる。

## 4B. 物語を「読む場面」からプレイ全体へ戻す

詳細正本は[物語・画像統合計画](NARRATIVE_VISUAL_INTEGRATION_PLAN.md)とする。既存5章、夢渡り、郷の声、非塔39地域縁起、3結末を増量する前に、次を行う。

- 固定神話を「汐里と玄冬の千年の二重奏」、可変主人公をプレイヤーの燈守家とする。
- 主題を`継ぐとは同じ犠牲を繰り返すことか、それとも孤独を分けることか`へ統一する。
- Home、出立、Dungeon、戦闘、帰還、郷、鍛冶、星契り、家系図へ3〜20秒の残響/発見を置き、全画面朗読だけへ集中させない。
- 夢渡り弐〜終の順序抜けをP0として直し、同一月の強制全画面sceneを最大1件にする。
- Intro、初回夢、家業/技、早期神台詞、形見名、灯ノ御山coreを匿名化し、ch4最終の開示beat/skip transactionだけで`汐里`を初開示する。M34 new gameは`m34_narrative_schema=1`を初期化。sentinel欠落legacyだけ`ch4 / gossipIndex>=12 / shioriPhase / endingType / cleared`から一度導出し、判別不能なch4 queue済みsaveへ非modal recapを一度出す。
- 一代の問いと実save由来の固有名/形見/地域をFinaleへ返す。ただし過去行動で3結末をロックせず、推薦もしない。
- 内部ID`cut`はsave互換のため維持し、表示は既存結果と一致する`送る`へ変える。夢8、選択、結果、epilogueの動詞をbranch testで固定する。
- 夢渡り7篇の固有画像は[Story v2 Visual Pack](visuals/story-v2/README.md)を実装候補とする。
- 360/390/768pxの夢CGは16:9 `contain`全景と台詞panelを分け、横長CGの意味を`cover` cropや任意の全景操作へ依存させない。

## 5. 目標画面設計

### 5.0 生成ビジュアルパックと使い方

実装の基準像として、文字・UI・人物を焼き込まない5点を`docs/visuals/ui-v2/`へ追加した。生成条件、寸法、SHA-256、統合規則は[visual manifest](visuals/ui-v2/README.md)を正本とする。

| ID | 対象 | プレビュー | 実装上の役割 |
|---|---|---|---|
| VIS-HOME-01 | Home | [今月の決断台](visuals/ui-v2/home-decision-stage.jpg) | 一族の席、大灯籠、郷を一枚で結ぶ上段hero。主情報は画像上へ直置きしない |
| VIS-BATTLE-01 | 戦闘 | [蛍火の社・戦場](visuals/ui-v2/battle-firefly-shrine.jpg) | 敵味方の空間を光温度で分け、中央を攻防の焦点にする |
| VIS-DUNGEON-01 | Dungeon | [蛍火の窪地・地図](visuals/ui-v2/dungeon-firefly-hollow-map.jpg) | 地域固有の床文法、ランドマーク、帰路を設計する基準像 |
| VIS-VILLAGE-01 | 郷 | [大灯籠の郷](visuals/ui-v2/village-lantern-hub-map.jpg) | 施設の形と位置で方向を覚えられる歩行空間の基準像 |
| VIS-FORGE-01 | 鍛冶と蔵 | [継承工房](visuals/ui-v2/forge-heirloom-workshop.jpg) | 製作と継承品を暖色/寒色で分け、中央を比較面の静域にする |

これらは完成画面のスクリーンショットではなく、**画面が何を感じさせるかを固定するアート・レイアウト契約**である。Dungeonと郷は一枚画像を床へ貼らず、歩行可能層、遮蔽物、光源、POI、前景へ分解する。Home/戦闘/鍛冶も画像採用前に実機cropと文字コントラストを検証し、5枚一括preloadはしない。

物語sceneには別packとして`STORY-DREAM-02`〜`08`の7点を追加した。これは夢渡り弐〜終を同一`cg_kiro.jpg`で見せる現状の反復を解消する候補であり、人物同一性、物語対応、寸法、hash、crop規則は[story visual manifest](visuals/story-v2/README.md)を正本とする。UI画面用5点と夢CG7点を同時preloadしない。

### 5.1 共通Shell

#### PC

- 最大コンテンツ幅は1080〜1200px。ただし1920pxでは本文を単純に拡大せず、重要画面だけ左右ペインを活用する。
- 上段: 画面名、戻る、主要資源、設定。位置と順序を固定する。
- 主面: 一画面一つの主CTA。補助行動は同じ視覚強度にしない。
- 詳細: desktopはsticky右ペイン、未選択時には空白でなく「何を選べばよいか」かおすすめを表示。

#### モバイル

- ページ全体は縦一方向だけスクロール。横スクロールは、人物レールなど意味が明示された局所コンテナだけ許可する。
- 固定下端を使う画面は一つの`ActionDock`だけが所有し、safe-area込みで本文の逃げを確保する。
- 詳細・絞り込み・確認・ログは共通`Sheet`。背景タップ、Escape、明示閉じる、フォーカス復帰を同じ規則にする。
- 画面遷移時に`window.scrollTo(0,0)`。同一画面内tab/filterの位置は保持してよい。

#### 共通受入

- 全操作可能要素に可視focus、明示accessible name、44px以上。
- toastは`role=status` / `aria-live=polite`、重大な保存異常は`role=alert`。
- 設定ボタンに`aria-label="設定"`。全画面へ無条件後載せせず、Shellの予約領域に置く。
- `prefers-reduced-motion`と演出軽減で、花弁、shake、flash、parallaxを止められる。

### 5.2 Title / 続きから

目的: 世界観を約束し、初回と復帰を迷わせない。

- 新規: 「はじめから」を主CTA、「どんなゲームか」を3行で説明。
- 復帰: 「つづきから」の下に、`2年目・弥生 / 当主 燈吾 / 次の危機: 寿命1月`のようなセーブ要約。
- 7日以上ぶり: 「前回の灯」札をHome到着後に一度だけ表示。
- 次回origin移行前: セーブ保有者へ「新しいURLへ移る前に控えを作る」導線を常設。
- セーブ管理: 現在の書き出し・読み込み機能を残し、最終バックアップ日時を表示する。

### 5.3 Home: 「今月の決断台」

目的: 一族全体を理解するのでなく、今月の一手を自信を持って選ぶ。

基準像: [VIS-HOME-01](visuals/ui-v2/home-decision-stage.jpg)。大灯籠は世界の焦点、一族の空いた座は失われる命の予告、遠景の郷は選択の帰結先を示す。PCでは上段heroまたは右側の情景として使い、主情報を中央の灯へ直置きしない。モバイルでは高さ160〜220pxのheroへcropし、今月の要は独立した不透明panelに置く。

#### 情報順

1. 年月・資源
2. **今月の要**: 危機1件、推奨1件、理由1文、主CTA1個
3. 一族: 当主1枚＋他の成人/幼子レール。詳細はタップSheet
4. 4つの月行動: 推奨は強調するが、他の選択肢を隠さない
5. 郷の帳: 営み / 記録 / 心得の3群。初期は要約、展開して全11入口

#### 配置と状態

- PCは`今月の要 7 : 一族 5`の2列。下段の月行動は4枚を同格に並べず、推奨1枚を2列幅、残り3枚を補助幅にする。
- 390px以下は`年月/資源 → 今月の要 → 主CTA → 一族レール → 他の月行動 → 郷の帳`。主CTAまでを初期viewport内へ置く。
- 通常、危機、帰還直後、継承者不在の4状態をfixture化する。危機では人物札と大灯籠の灯色だけが連動し、枠や警告を増殖させない。
- 帰還直後は「帰還の三痕」を今月の要より先に一度だけ出し、閉じた後は履歴から再閲覧できる。

#### ルール

- 綴、血脈診断、推薦札は同一`recommendAction()`結果を共有する。
- 「危機」と「おすすめ」を混同しない。危機は事実、おすすめは解釈。
- 当主以外の詳細statsは初期表示を畳み、寿命・負傷・役割だけを見せる。
- Homeのページ全体overflow testを追加する。
- 5秒テストで初見4/5人が`危機の人物 / 推奨行動 / 他も選べること`を答えられなければ不合格。

### 5.4 出立・隊編成

目的: 行き先と連れていく理由を30秒以内に決める。

- 上段に「最前線」「未討伐」「前回地域」の最大3候補を表示。
- 候補選択で絵巻の該当地点へ自動スクロールし、地図の場所・景観・主・推奨武功を同期表示。
- 全40地域は「すべての地を見る」から閲覧。
- 隊編成は4スロット固定の横一列/2×2。1人カードが横幅一杯にならない。
- 「前回の隊」「おすすめ編成」「全員外す」を用意。幼子・負傷・寿命を明示。
- 地域ノードの実ヒット領域44px、role/button、keyboard activationを保証。

### 5.5 Dungeon

目的: 現在地、目標、危険、戻る判断を視線移動なしで把握する。

- 地域ごとの色、床文法、目印、環境音は維持し、床/壁/未探索の明度差を強める。
- 上端HUDは「灯」「主目的」「階層」だけ。副情報は展開面へ。
- 「帰り火」は全幅で常設。押下後に確認Sheetを出し、隠すことで誤操作を防がない。
- ミニマップ拡大は可視ボタン一つ。透明tap-zoneを廃止。
- 地図の代替として、発見済みPOIの短い一覧を提供し、選択で地図をハイライト。
- 稀相は遭遇前に微かな環境差、遭遇時に固有名・確定遺物、勝利時に産地・初討伐を一続きで演出する。

#### 地域固有文法

各Dungeonは最低でも次の5軸のうち4軸を固有化する。単純な色替えは地域差として数えない。

| 軸 | 蛍火の窪地の基準 | 実装層 |
|---|---|---|
| 歩行面 | 湿った飛石と浅瀬 | tile / navigation |
| 境界 | 水没石垣、葦、深水 | collision / silhouette |
| 光源 | 蛍群と中央の灯籠 | light / particles |
| 道標 | 鳥居、刻石、帰り火 | POI / minimap |
| 環境反応 | 足元の波紋、蛍が進路を避ける | ambient / reduced-motion |

- [VIS-DUNGEON-01](visuals/ui-v2/dungeon-firefly-hollow-map.jpg)を空間文法の基準像とし、歩行可能層、境界、光、POI、前景へ分解する。
- 稀相予兆は`環境音/粒子の変調 → 足跡または影 → 固有遭遇札`の3段。低確率抽選に外れた時も最初の予兆を偽装表示しない。
- 通常敵、稀相、地域主はsilhouetteと接触前markerを分ける。レア度を敵名の色だけで伝えない。
- 探索中の床/壁は色覚差を問わず輪郭差が読め、50%縮小captureでも主経路と未探索境界を判別できること。

### 5.6 戦闘

目的: 敵の意図を読み、誰へ何をするかを迷わず選び、継足の手応えを感じる。

- 画面上端は行動順専用帯。敵名札と重ねない。
- 敵の兆しは`単体攻撃 / 術 / 全体攻撃`と省略せず、icon+text+aria-labelで示す。
- 通常攻撃は「攻撃 → 対象選択」に統一するか、即時なら`攻撃 → 魍魎子A`と対象名をボタンに出す。敵札タップと規則を揃える。
- オートは主CTAの上から外し、補助切替へ。ON中も「次の入力で停止」が理解できる。
- 継足は倍率だけでなく、直前の一撃から何が繋がったかを短く表示。
- 全ログは共通Sheetへ移し、dialog、focus trap、Escape、復帰を得る。
- 戦闘終了は報酬だけで閉じず、人物の負傷・因縁・図鑑・遺物の変化へ接続する。

#### 焦点と手応え

- [VIS-BATTLE-01](visuals/ui-v2/battle-firefly-shrine.jpg)を蛍火地域の戦場基準にする。味方側は灯橙、敵側は月青、中央の水面を攻防の焦点とし、敵札背後は暗く保つ。
- 視線優先度を`敵の兆し → 対象 → 今選べるコマンド → 継足理由 → 全ログ`に固定する。全ログは初期面に置かない。
- PCは上端に行動順、中央に戦場、下端に選択中人物と4コマンド。モバイルは上端行動順を1行、戦場を可変高、下端を唯一の`ActionDock`とする。
- 命中時は`接触0ms → hit-stop 40〜70ms → 筆線/数値120ms → 因果文300ms以内`を基準にし、長いcut-inは主/初見技だけに限定する。演出軽減時はhit-stopと画面shakeを外して情報順は保つ。
- `1対2 / 4対4 / 主戦 / 稀相 / 味方戦闘不能 / オートON`をfixture化し、兆し・名札・行動順・ActionDockの矩形交差0を検証する。
- 初見4/5人が「次に攻撃する敵」「攻撃対象」「なぜ継足になったか」を10秒以内に答えられなければ不合格。

### 5.7 郷を歩く

目的: メニュー背景ではなく、家族と郷人が暮らす場所として記憶させる。

- モバイル下端は左=移動、上/中央=近接行動のように予約領域を分離する。
- 近接時は対象名と行動を一つの大ボタンで表示。D-padの上に被せない。
- 初回訪問の施設は歩いて発見し、訪問後は「すぐ行く」を解禁する案を検証する。
- 郷人の位置、会話、灯り、天候を月/事件で少し変え、Homeの決断結果が景色へ返るようにする。
- 即移動を使っても、到着時の短い一言や環境変化は見逃さない。

#### 空間の記憶と生活感

- [VIS-VILLAGE-01](visuals/ui-v2/village-lantern-hub-map.jpg)を基準像に、中央の大灯籠を常時orientation anchorにする。鍛冶は煙突と暖色、豆腐屋は白暖簾、水場は反射、出立門は鳥居のsilhouetteで識別する。
- 施設名の常設ラベルへ依存しない。初回は近づくと名称、発見後は地図にglyph、即移動後も到着の1〜2秒で場所の特徴を見せる。
- Homeの結果を`灯り / 郷人の位置と一言 / 小道具`の最低1系統へ翌月反映する。全NPCを毎月総入替しない。
- 歩行可能層、建物collision、前景roof、光/天候、NPC、interact hotspotへ分解し、前景が人物を隠す時は透過する。
- 施設3か所を順に訪れるtaskで、初見4/5人が迷子状態30秒未満、D-pad/話すの誤操作0で完了すること。

### 5.8 鍛冶と蔵

目的: 全333品を読むのでなく、「この人を今どう強くするか」を決める。

基準像: [VIS-FORGE-01](visuals/ui-v2/forge-heirloom-workshop.jpg)。左の炉は新造、右の棚と冷光は継承品、中央の作業台は人物と候補の比較に使う。室内画を全面へ強く出さず、品目名の背後は不透明度を確保する。

#### 初期順

1. 人物を選ぶ（現在対象を常に表示）
2. `おすすめ3品 / 装備中 / 所持品`を表示
3. 必要なら検索・絞り込みで全件へ

- desktop右詳細の未選択状態に、対象人物とおすすめ3品を置く。
- モバイルの部位・希少度・並べ替えは「絞り込み」Sheetへ集約し、適用中条件数だけ常設。
- レアリティは色だけに頼らず、名前とglyphを併記。
- 購入後に「誰へ装備する」「蔵へ置く」を選べるが、連続購入を強制しない。
- sticky位置を固定pxで積まず、共通Shellの実高またはCSS custom propertyから計算する。
- 推薦理由は`攻撃+12`だけでなく、`燈吾 / 火属性 / 現在武器比 / 次の主に有効`のうち該当する最大2点を短文化する。
- 詳細には`入手地 / 前の持ち主 / 主な戦果`を表示し、強さが同等でも家の記憶で選べる継承品を作る。
- PCは人物rail、候補一覧、比較詳細の3領域。390px以下は人物1行、推薦3枚、詳細Sheet、下端購入/装備Dockとし、長い全件一覧から開始しない。
- `購入可能 / 資金不足 / 装備不能 / 同部位所持 / 継承品 / 初入手`をfixture化する。背景タップ、Escape、閉じるの全経路で同じ選択元へfocusを戻す。

### 5.9 図鑑・家譜・家系図

目的: 発見数ではなく、一族の歴史が育つ長期報酬を見せる。

- 図鑑モバイル詳細は選択直後のSheet。全一覧末尾へ置かない。
- 図鑑新着は開いただけで全既読にせず、見た項目だけ既読とする現行方針を維持。
- 初代の家系図には「次代がここへ灯る」薄い節点、継承条件、家の短い予告を置き、空白を未来の約束へ変える。
- 「存命のみ」は実際に故人を除外する。薄くするだけなら「故人を薄く」と改名。
- 家系図の閉じると設定の予約領域を分ける。

### 5.10 帰還差分と「前回の灯」

#### 帰還差分

- 最大3件。優先順位は`人物 > 因縁/世代 > 発見/資源`。
- 例: `燈吾が重傷になった`、`灯織が成人まであと1月`、`蛍火の窪地の稀相遺物を家譜へ記した`。
- 各件から一族、家譜、鍛冶、図鑑へ直行できる。
- 数字の羅列や全loot一覧は「詳細」へ畳む。

#### 前回の灯

- 保存するのは自由文ではなく、最後に選んだ地域、未完の危機、次月確定事項、最後の意味ある操作種別。
- 復帰時に一度だけ表示し、`続ける / 別のことをする`を同じ面に置く。
- 反証条件: 操作時間が短くならない、または戻る/目的変更が5pt以上増える。

### 5.11 主要ビジュアルの実装・検収契約

| Gate ID | 対象 | 合格条件 |
|---|---|---|
| VIS-GATE-01 | Home | 390/1280pxで大灯籠と一族席が残り、今月の要/CTAの文字コントラストがWCAG AA。背景OFFでも情報順不変 |
| VIS-GATE-02 | 戦闘 | 1対2/4対4で戦場の焦点が中央に残り、敵名・兆し・対象ringが背景へ沈まない。画面shake OFFでもhit因果を理解可能 |
| VIS-GATE-03 | Dungeon | 概念画を5層以上へ分解し、collisionと見た目が一致。50%縮小でも歩行面/境界/未探索/帰り火を判別可能 |
| VIS-GATE-04 | 郷 | 大灯籠と施設3種をsilhouetteで判別。前景透過、移動/近接の矩形交差0、即移動後も到着地点を説明可能 |
| VIS-GATE-05 | 鍛冶 | 推薦3品・比較差分・購入CTAを背景より先に読める。希少度がgrayscaleでも名前/glyphで識別可能 |
| VIS-GATE-06 | 配信 | 画面別lazy load、未使用画像を初期preloadしない、solid fallbackあり。production profileで採用前baselineよりLCP p75を悪化させない |
| VIS-GATE-07 | 権利/追跡 | `docs/visuals/ui-v2/README.md`のID、prompt、寸法、SHA-256と配信先asset対応を記録 |

画像を採用したこと自体を合格としない。可読性、操作、性能、世界固有性のいずれかを悪化させた場合は、その画面だけ画像を外してlayoutを先に合格させる。

## 6. IAと操作の共通規約

```text
Title
 ├─ Continue → Home「前回の灯」
 └─ New Game → Intro → Home

Home「今月の要」
 ├─ 月行動: 出立 / 星契り / 祭 / 静養
 │   └─ 結果 → 帰還差分/場面 → Home
 ├─ 営み: 鍛冶 / 郷普請 / 郷歩行 / 眷属
 ├─ 記録: 家譜 / 図鑑 / 家系図 / 郷の声
 └─ 心得: 務め / 家訓 / 手引き
```

- 主行動は常に一つ。補助行動は視覚階層を一段下げる。
- 一覧→詳細はdesktopで右ペイン、mobileでSheetという同じmental modelに統一。
- map→地点は「候補一覧で選ぶ→地図が寄る」。地図を読むことだけを必須にしない。
- 戻る、閉じる、確認、キャンセルの語と位置を統一。
- 背景タップ閉じは情報/選択Sheetだけ。不可逆確認は背景タップで実行せず、閉じる場合も入力状態を失う時は警告する。

## 7. 計測と実験

### 7.1 North Starと補助指標

| 指標 | 定義 | 現在値 | 初期目標 |
|---|---|---:|---:|
| 7日コアループ継承完了率 | 新規→命名→初回帰還→初回継承 | 未計測 | まず基準値取得 |
| 初回Home→月行動確定 | 秒数と画面往復数 | 未計測 | 再設計で30%短縮を仮説 |
| 再開10秒以内の意味ある操作率 | 報酬受領だけを除外 | 未計測 | +15ptを仮説 |
| 帰還後60秒以内の次行動率 | 関連画面または次月行動 | 未計測 | +10ptを仮説 |
| 装備改善タスク成功率 | 指定人物を強化できる | 未計測 | 5人中4人以上 |
| モバイル横overflow | 主要画面の超過px | Home 674px超過 | 0px |

母数がない段階で絶対的な継続率目標を置かない。最初の2週間は基準値取得、次に相対改善を判定する。

- [仮説] 7日は最初の観測窓であり、ゲーム内の平均初回継承時間をまだ表さない。2週間のbaselineで、初回継承到達者の80%が7日を超えるなら14日または「初回3session」へ変更する。
- [仮説] PMF調査の40回答は統計的な証明ではなく、少数回答の極端な振れを避ける運用上の最低線。2〜4週で40人に届かなければ、割合判定を中止して定性面接5〜8人へpivotする。
- 30%、15pt、10ptは優先順位づけの仮説値であり、baseline取得後に検出可能差と期間を再計算する。

### 7.2 匿名イベント

- `new_game_started`
- `intro_completed {skipped, elapsed_sec}`
- `child_named {elapsed_sec}`
- `home_viewed {generation, crisis_type}`
- `monthly_action_confirmed {action}`
- `depart_started {region_tier, party_size, used_previous_party}`
- `battle_completed {result, auto_ratio, max_chain}`
- `dungeon_returned {reason, floors, boss_down, loot_band}`
- `return_summary_viewed {item_count}`
- `succession_completed {generation}`
- `resume_card_shown/clicked {intent_type, dormant_days}`
- `forge_recommendation_used {slot, delta_band}`
- `family_tree_opened/shared {generation}`
- `daily_reward_received`
- `odai_claimed`

個人名、辞世本文、セーブJSON、装備の自由記述は送らない。

#### 計測開始gateと代替経路

ネットワーク送信はevent名を実装しただけでは開始しない。次の5点をユーザーが承認し、`GDD_v3.md`と`WORKLOG.md`に送信開始日を記録した日を`M0`とする。

1. providerと保存地域/保存期間を確定する。GoatCounterは候補であり、自動採用しない。
2. 実際のpayload一覧をレビューし、個人名・本文・セーブ内容が送られないcontract testを通す。
3. タイトル/設定から読めるプライバシー説明と、初期状態を含むopt-out方針を確定する。
4. production送信を明示的な設定値で有効化し、test eventがprovider側で受信されることを確認する。
5. ユーザー承認、開始日、停止手順、データ削除窓口を記録する。

定量経路では`M0`から14日間をbaseline期間とし、期間完了まで改善効果を断定しない。計測を導入しない、または承認が得られない場合は、後続Phaseを止めず、同一fixtureを使った初見5〜8人のtask test、再訪インタビュー、画面録画の定性経路へpivotする。その場合、割合やpt改善を成果として掲げず、成功4/5以上、誤操作0、理由説明4/5以上をgateにする。

### 7.3 最初の実験

1. **Home推薦一面化**
   - 仮説: 月行動確定まで30%短縮。
   - 反証: 非推奨行動の自発選択が10pt以上落ちる。
2. **前回の灯**
   - 仮説: 再開10秒以内の意味ある操作率+15pt。
   - 反証: 目的変更/戻るが5pt以上増える。
3. **帰還差分3件**
   - 仮説: 帰還後60秒以内の次行動率+10pt。
   - 反証: summary skipと離脱が増える。
4. **日付報酬の物語置換**
   - 前3実験と基準計測の後に行う。
   - 受領だけで終了する率が高い場合にだけ、報酬量を下げて家族近況へ寄せる。

## 8. 実装ロードマップ

### 8.0 責任・入口・期限

| Phase | 入口条件 | 実装owner / file ownership | 検証owner | 期限上限 |
|---|---|---|---|---:|
| 0 | 基準commit、未追跡差分、before証拠を記録 | Claude/Fable 5: Home CSS、battle/village CSS、対応test、`docs/STATUS.md`、`docs/qa/`、`.github/workflows/deploy.yml` | Codexまたは別担当 | T0+3日 |
| 1 | Phase 0のCI/P0 gate合格 | Claude/Fable 5: App/Home/store補助、Home visual、旅程test、event schema（送信OFF） | Codex+初見5人 | T0+8日 |
| 2 | Phase 1 gate合格。定量は計測開始gate承認、非導入なら定性baseline完了 | Claude/Fable 5: Expedition/Forge/Codex/FamilyTree、Forge visual | Codex+初見5〜8人 | T0+15日 |
| 3A | Phase 2のtask成功4/5 | Claude/Fable 5: Dungeon/Battle/Villageの操作不整合、地域visual layer | Codex | T0+23日 |
| 3B | 下記「体験方針gate」をユーザー承認 | Claude/Fable 5: auto階層、初回歩行、日次報酬実験 | ユーザー+Codex | 実験ごと14日 |
| 4 | Phase 0〜3Aの機能凍結 | Claude/Fable 5: CI/性能/旅程test | 独立監査 | T0+27日 |
| 5（将来任意） | 独自ドメイン採用を別途承認、canonical hostname確定、救出repo承認、UI release安定 | Claude/Fable 5: repo内移行UI。ユーザー: domain/DNS/Settings | Codex+ユーザー | 切替窓+24時間監視 |

`T0`はPhase 0の実装開始日。期限超過時は未完項目を次Phaseへ黙って持ち越さず、範囲縮小か再見積りを判断する。

### 体験方針gate（ユーザー判断が必要）

次は快適性修正ではなく、ゲームの遊び方を変えるため自動実装しない。

- オートを現在位置から副次操作へ降格するか。
- 郷の「すぐ行く」を初回訪問後にだけ解禁するか。
- 日参り/御題の報酬量を下げ、物語近況へ置換するか。

各案は現行baseline→小規模実験→ユーザー採否の順で進める。

### Phase 0 — 安全と測定可能性（1〜3日）

#### 実装

- Home横overflow修正と全主要画面overflow contract test。
- 戦闘上端、郷D-pad/話すの衝突修正。
- `docs/STATUS.md`を実際の公開状態へ同期。
- P0 smoke（Home overflow、戦闘上端、郷操作帯）をGitHub Actionsのblocking jobへ追加。ActionsでChromiumをinstallし、PC/390/360の対象specだけを実行して失敗画像をartifact化する。
- `docs/qa/ui-audit-baseline-20260720.md`のbeforeと同一条件でafterを保存し、commit/viewport/日時/測定値/人間採否を追記する。

#### Exit gate

- 5幅で横overflow 0。
- P0の3欠陥（Home overflow、戦闘上端競合、郷操作競合）が0。
- lint / 565 unit / build / 対象Playwright緑。
- 同一セーブのPC/390px before/afterを追跡可能な`docs/qa/`へ置き、人間が採否記録。
- `.github/workflows/deploy.yml`上でP0 smokeが必須成功し、`docs/qa/ui-acceptance-YYYYMMDD.md`が対象commitを記録する。
- Phase 0 commitでは`tmp/`を除外し、Home/battle/village、対象test、workflow、STATUS、`docs/qa/`だけをpath指定stageする。

### Phase 1 — Homeと復帰（3〜5日）

#### 実装

- screen変更時scroll reset。内部スクロールは画面固有に管理。
- `recommendAction()`単一化と「今月の要」。
- 一族欄の要約/詳細Sheet。
- 「前回の灯」。
- 帰還差分最大3件。
- VIS-HOME-01を候補に、主情報のコントラストとmobile cropを先に検証してからHomeへ統合。未表示時のsolid fallbackを残す。
- 匿名event schemaと送信OFFのadapter。providerへのproduction送信は§7.2の計測開始gate後に別commitで有効化する。

#### Exit gate

- 複合fixtureで全推薦が一致。
- 初見5人のうち4人が5秒以内に主CTAと理由を説明。
- 新規→命名→初回帰還→再開の旅程testが緑。
- 定量経路か定性経路かを決め、provider/privacy/opt-out/開始日、または定性task台本とbaseline結果を正典へ記録する。

### Phase 2 — 選択支援（4〜7日）

#### 実装

- 家系図閉じる/設定の衝突、設定button accessible name、toast live region、戦闘ログ共通Sheet。
- 出立3候補＋地図同期、前回の隊、おすすめ編成。
- 鍛冶の人物先行、おすすめ3品、filter Sheet。
- VIS-FORGE-01を候補に、人物/候補/詳細の可読域を確認してから鍛冶へ統合。
- 図鑑detail Sheet、家系図の未来節点とfilter修正。

#### Exit gate

- 初見5人中4人が30秒以内に目的地と隊を決定。
- 指定人物の装備改善を5人中4人が誤購入なく完了。
- 一覧→詳細→戻るのfocus/scrollが全画面で一貫。

### Phase 3 — Dungeon / 戦闘 / 郷の署名体験（5〜8日）

#### 実装

- Dungeonの帰り火常設、可視map拡大、POI一覧。
- 戦闘の対象決定統一、兆し全文、行動順専用帯。
- 郷の操作帯分離と決断結果の反映。
- 決断結果を郷の会話・灯り・人物位置へ返す最小3パターン。
- VIS-BATTLE-01は戦場背景候補、VIS-DUNGEON-01とVIS-VILLAGE-01はレイヤー分解の基準像として採用する。5画像の一括preloadは禁止。

Phase 3Bはユーザー承認後に、オート副次化、初回歩行/訪問済み短縮、日次報酬の物語置換を一項目ずつ実験する。

#### Exit gate

- 360pxで「灯10%から3秒以内に帰還」「近接人物と会話」「敵の次行動を回答」を5回連続成功。
- 手動戦闘の継足理解と、オート停止の理解を初見4/5人が達成。
- 2地域を5秒見て、場所の違いを言語化できる。
- 主要画像を無効化しても操作不能にならず、有効時もLCP/payload budgetを超えない。具体値はPhase 0のproduction profileを基準に、LCP p75を悪化させない値へ固定する。

### Phase 4 — 検証と性能（2〜4日）

- 新規開始から初回継承、翌日再開までの旅程test。
- Home/出立/鍛冶/図鑑/設定の5幅visual contract。
- 主要スクリーンの人間採否ログ。
- main chunkをprofileし、効果が確認できる単位だけ追加分割。
- 最低40人のPMF対象が集まるまでは「PMF確認済み」と言わない。

### Narrative lane N0〜N4 — 千年の二重奏（UI Phase 0合格後）

- 詳細は`docs/NARRATIVE_VISUAL_INTEGRATION_PLAN.md`を正本とする。
- N0で夢渡りの順序抜け、既読/queue/完読/後回し、同一月の強制scene最大1件を先に修正する。
- N1で夢渡り弐〜終へ固有CG7点とfallback/lazy load/mobile cropを追加する。
- N2でHome、出立、探索、主戦、帰還、郷へ3〜20秒の残響を接続する。
- N3で一代の問い、固有名/形見/地域のFinale回収、三つの灯の響きを追加する。結末はlock/推薦しない。
- N4で物語を読む/読まない両旅程、A11y、scene時間、LCP、初見理解を検証する。
- N0の直接証拠が合格するまで、画像だけを`public/img/`へ投入しない。

### Phase 5 — 独自ドメイン（将来任意・UIとは別リリース）

- 現在は`hitsugi-game.github.io/hitsugi/`を正典とし、実行しない。独自ドメイン採用をユーザーが別途決めた場合だけ、§9のセーブ救出、DNS、GitHub Pages、OGP、HTTPS、旧URL検証を順番どおり実施する。

## 9. URL変更の判断と手順

### 9.1 選択肢

Organization移管は2026-07-20に完了済みである。現在と将来案を混ぜず、次のように扱う。

| 案 | 表示URL | セーブ | 現在の判定 |
|---|---|---|---|
| **Organization URLを維持** | `https://hitsugi-game.github.io/hitsugi/` | 現originを維持 | **採用中。UI改善の正典** |
| 独自ドメイン | `https://<game-domain>/` | origin変更、公開後は救出必須 | 将来任意。別案件で判断 |
| GitHub username変更 | `https://<new-user>.github.io/hitsugi/` | origin変更 | 社内toolへ波及するため非推奨 |
| repository名変更 | owner部分は変わらない | path変更の可能性 | 目的不一致 |

移管前URL`https://umine2025.github.io/hitsugi/`は歴史記録であり、現行導線として表示しない。公開案内前・外部利用者0人の時点で移管し、新PagesのHTTP 200と旧Pagesの404を確認済みのため、今回に限って旧origin救出を省略した。

- [事実] project Pagesの既定URLは`<owner>.github.io/<repositoryname>`。[GitHub Pages概要](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [事実] repo rename時、repository URLは通常redirectされるが、project Pages URLは例外。GitHubもPages利用repoではcustom domainを推奨する。[Renaming a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)
- [事実] username変更は旧profile URLが404になるなど、Pages以外にも影響する。[GitHub username changes](https://docs.github.com/en/account-and-profile/concepts/username-changes)

### 9.2 推奨構成

- owner: Organization `hitsugi-game`。
- repository: `hitsugi`を維持。
- canonical URL: `https://hitsugi-game.github.io/hitsugi/`。
- remote: `https://github.com/hitsugi-game/hitsugi.git`。
- 直近作業はhard-coded URLとOGP/README/DEPLOY/MARKETING/STATUSの正典化、次回公開後のasset/route/Actions確認であり、DNS作業ではない。
- **将来のPhase 5入口gate**: 独自ドメインを採用する場合だけ、canonical hostnameを`www`、`play`等のsubdomain、またはapexから一つ確定する。未確定のままDNS手順へ入らない。
- 将来subdomainを使う場合のCNAME参照先は、その時点のGitHub Pages owner hostで、`/hitsugi`を付けない。値は切替直前にGitHub公式手順で再確認する。
- [事実] 現行はcustom GitHub Actions workflow。リポジトリへ`CNAME`を置くだけでは設定手段にならず、Pages Settings/API側の設定が必要。[GitHub custom domain troubleshooting](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)
- [事実] `vite.config.ts`は`base:'./'`で、配信先pathへの依存は比較的小さい。

### 9.3 次回origin変更時はセーブ救出を先に公開する

以下は今回のOrganization移管へ後付け実装する項目ではない。**外部利用者が発生した後にoriginを再変更する場合のtemplate**である。現行にはすでにタイトルの「セーブを書き出す」「セーブを読み込む」があるため、これを移行の中核に使う。

1. `hitsugi_save_v4`、`hitsugi_save_v4_bak`、`hitsugi_save_v3`、`hitsugi_save_v1`の全保存梯子を解決するpure resolverを作る。
2. 正常main、破損main+正常backup、backupの`saveSeq`が新しい、v3のみ、v1のみのfixtureを現行v4へ正規化して書き出すE2Eを追加する。
3. 設定も移す場合は、`hitsugi_reduce_motion`、`hitsugi_auto_default`、`hitsugi_audio`、`hitsugi_audio_vol`、`hitsugi_last_region_v1`をversion付きexport packageへ含める。未対応なら「設定は引き継がれない」と明示する。
4. 旧URLで書き出し→読み込みを実走し、正規化後の意味的不変条件を検査する。
5. 切替前の旧originタイトルにURL移行予告と「今すぐ控えを作る」を表示。
6. ユーザー承認を得て、旧originのowner host上に期限を切らない救出用project repository/pageを別pathで公開する。
7. 救出pageは全保存梯子を検証・正規化し、version付きJSON downloadだけを行う。ゲーム進行や自動転送はしない。
8. 新originのタイトルには、移行期間中「続きから」が無い時に常設する**「旧URLで遊んでいた方へ」救出card**を用意する。固定救出URLは切替時に確定し、3手順（救出pageを開く→JSONをdownload→この画面で読み込む）、データが消えたのではなくoriginが変わった説明を表示する。
9. 新URLでJSON importし、§9.3.1の不変条件を検査。
10. custom domain設定後にも別ブラウザで旧origin救出pageが旧localStorageを読めることを確認する。
11. `旧ゲームURL→新canonical→救出card→固定救出page→download→新canonicalへ戻る→import→続きから`を、空の新originと全保存梯子fixtureでE2E化する。旧ゲームURLがredirectされても救出pageへ到達できなければ不合格。
12. この救出経路が公開されてからcustom domainを切り替える。

HTTP redirectや`postMessage`だけで旧localStorageが自動移動すると仮定しない。

救出repository/pageのownerはユーザー、実装はClaude/Fable 5、検収はCodexまたは独立担当とする。固定URL、監視方法、旧owner hostを維持する期間を`docs/DEPLOY.md`へ記録する。救出保証期間中は旧owner host自体のoriginを変えるuser-site custom domain設定を行わない。

#### 9.3.1 import前後の意味的不変条件

必須一致:

- 暦、全Character（親子、寿命、能力、HP/MP、装備、灯型、家業、故人情報）。
- 奉燈、血珠、武功、inventory、consumables。
- 神縁、pending births、chronicle、flags、motto、seed、narrative mode。
- 討伐/地域進度、visited/cleared、lore fragments、codex、個別既読。
- nemeses、rare/地域由来記録、facilities、familiars、active familiar、gossip progress、NG+関連flag。
- export package対象にした音量、mute、演出軽減、auto既定、前回地域。

許容差分:

- `saveSeq`はimport時の`saveGame()`で単調増加してよい。
- `lastPlayedAt`はimport時刻へ更新してよい。
- v1の季→月換算、v3の`jobClass`補完、旧codex既読のID移行は現行migration関数の期待値と一致すればよい。
- 進行中`expedition`は現行migration仕様で畳まれる場合がある。その事実をexport前に表示し、fixtureで期待値を固定する。

保留中event/sceneがGameData外の一時stateなら移行対象外を明示し、安全なHome再開へ正規化する。raw JSONの完全一致ではなく、この表を機械比較する。

### 9.4 ドメイン切替runbook

1. 希望ドメインを取得。registrarに2FA、自動更新、失効通知を設定。
2. canonical hostnameとapex/subdomain方式を確定し、DNS値をreviewする。
3. GitHubアカウントでdomainをTXT verifyし、wildcard DNSを使わない。[Verifying a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
4. **DNSを変える前に**Repository Settings → Pagesへcustom domainを追加する。
5. その後DNSを設定。subdomain CNAMEは切替時点のGitHub Pages owner hostへ向け、pathを含めない。
6. DNS check成功と証明書発行を待つ。公式はDNS反映に最大24時間を見込む。[Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
7. Enforce HTTPSを有効化。
8. `index.html`の`og:url`、`og:image`、Twitter image、faviconを新URL/相対pathへ更新。self-canonicalと新sitemapを追加。
9. README、DEPLOY、MARKETING、STATUS、公開案内を更新。
10. Search Consoleへ旧URL-prefix/new propertyを登録し、利用可能な場合はChange of Addressを送る。旧→新の永久redirectは最低1年間維持する。[Google Site Moves](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
11. 新URL、asset、OGP、404、救出page、旧URLのHTTP status/Location/final pathを実測。
12. 旧セーブimport後の続きから→Home→出立→Dungeon→戦闘→帰還→reloadを実走。
13. 切替後24時間、証明書、404、import失敗、続きから欠落を監視する。

### 9.5 URL公開停止条件

- 救出pageが旧originのセーブfixtureをdownloadできない。
- 空の新originで救出cardが出ない、固定救出URLへ到達できない、またはimport後に「続きから」が出ない。
- 新originへimport後、主要stateが一致しない。
- 旧ゲームURL→canonicalが1hopの301/308にならない、redirect loop、余計な`/hitsugi/`、最終404のいずれかがある。
- HTTPS証明書未発行、Enforce HTTPS未有効。
- OGP、favicon、main JS/CSSのいずれかが404。
- UI刷新とURL変更が同一commit/同一公開に混在している。

切替後に障害が起きても、最初にDNS/custom domainを外して旧originへ戻してはならない。新originで作られたセーブが今度は見えなくなる。原則は同じ新originでコードを修復する。DNS rollbackは、新origin側の全保存梯子を救出でき、旧originへ戻した後のimportを実走した場合にだけユーザーが承認する。

## 10. クリティカルパスと資源

```text
P0 mobile/layout
  → 共通visual contract
  → Home visual + 今月の要
  → Home推薦単一化
  → 帰還差分・前回の灯
  → 実ユーザー基準値
  → 出立/鍛冶visual/図鑑の選択支援
  → Dungeon/戦闘/郷の固有文法と署名体験
  → 人間受入
  → 現Organization URLで安定公開

将来任意: 独自ドメイン承認 → セーブ救出先行 → custom domain公開
```

必要資源:

- 実装者1名+AI支援。
- 5人の初見usability test、可能なら復帰者5人。
- PMF方向判定は最低40回答、望ましくは100。集まるまでは仮説扱い。
- 将来独自ドメインを採用する場合だけ、年間費用と更新責任者。
- 同一セーブのbefore/after capture置き場と採否記録。

## 11. リスク台帳

| Risk | 兆候 | 予防 | 対応 |
|---|---|---|---|
| 追加装飾で情報過多 | 金枠/札だけ増え、5秒説明不可 | 主CTA1、最大3差分 | 情報を畳む |
| 推薦が自由を奪う | 非推奨行動率が10pt以上低下 | 理由を示し全4行動維持 | 強調を弱める |
| 即移動が郷歩行を殺す | 初回も全員即移動 | 初回発見後解禁を実験 | 条件を緩める |
| オートが戦闘を代行 | manual chain率低下 | 副操作へ移動 | 初期OFF/説明改善 |
| visual test過信 | 緑だが人が迷う | 5秒テスト+旅程test | gateを追加 |
| 生成背景がUIを飲む | 文字コントラスト低下/LCP悪化 | 静域mask、画面別lazy load、solid fallback | 画像を外しlayoutを先に合格 |
| 地図画像を床へ直貼り | collisionと見た目がずれる | navigation/境界/光/POI/前景へ分解 | 基準像へ戻しtile grammarを修正 |
| 計測が物語を収集 | name/本文がeventへ混入 | 匿名状態区分だけ | event停止/削除 |
| URLでセーブ消失 | 新URLに続きから無し | 救出page+JSON import | 切替停止 |
| Organization移管後の旧URL残存 | OGP/READMEから404へ誘導 | canonical scanをCI/公開前に実行 | 現URLへ正典化 |
| STATUSの陳腐化 | 未push表記とHEAD不一致 | Phase 0で同期 | WORKLOG/HEADを再確認 |
| 所有外差分混入 | `tmp/`がstage | path指定stage | commit停止 |

## 12. 仮説台帳とpivot条件

| 仮説 | 最安検証 | 継続条件 | Pivot |
|---|---|---|---|
| Home推薦一面化で迷い減 | 5人+時間計測 | 30%短縮、自由選択維持 | 推薦強度を下げる |
| 前回の灯で復帰改善 | 復帰session比較 | +15pt方向 | Home常設でなくTitle要約へ |
| 帰還差分で因果強化 | 60秒次行動率 | +10pt方向 | 強制面をやめ任意展開 |
| 初回歩行後の即移動解禁 | 5人の歩行/会話率 | 会話発見増、時間悪化小 | すぐ行くを常設し近況だけ表示 |
| 日次報酬が競合 | 受領のみ終了率 | 探索/契り率改善 | 報酬維持、物語だけ追加 |
| 将来独自ドメインがブランド向上 | direct/referralと想起調査 | 流入/想起改善 | Organization URLを維持 |

## 13. 最初の72時間

この72時間は**Phase 0だけ**を扱う。Phase 0が早く合格しても、Phase 1の実装は次の承認単位に分け、以下へ混在させない。

### 0〜24時間

- Home overflowを再現するPlaywright fixtureを先に追加。
- `.family-board/.family-main/.family-smalls/.blood-diag`のmin-width契約を修正。
- 戦闘上端、郷操作帯の衝突をfixtureで固定して修正。
- P0 smokeをdeploy CIのblocking jobへ追加。
- `docs/STATUS.md`を現行HEAD/公開状態に同期。

### 24〜48時間

- P0 3欠陥の同一fixture before/afterを`docs/qa/`へ保存し、矩形とoverflowの測定値を記録。
- PC/390/360の対象Playwrightをblocking jobとして`.github/workflows/deploy.yml`へ組み込む。
- 失敗時artifact、再実行方法、対象commitを`docs/qa/ui-acceptance-YYYYMMDD.md`へ記録。
- `tmp/`を除くpath指定stage一覧を作り、正本`STATUS.md`と実装状態を照合。

### 48〜72時間

- lint、全unit、build、P0 smokeをfreshな状態で再実行。
- 独立担当がHome overflow、戦闘上端、郷操作帯を実機相当で再測定し、人間採否を記録。
- Phase 0のexit gateを一項目ずつPASS/FAIL判定。FAILがあれば欠陥限定で修正し、Phase 1へ進まない。
- 全項目PASSの場合だけPhase 0完了を正典へ記録し、次の作業単位としてPhase 1の開始承認を得る。Phase 1のcode変更はこの72時間計画に含めない。

## 14. Claude / Fable 5への実装順指示

実装は一括で始めず、次の独立commit群に分ける。

1. `fix(home): モバイル横overflowを修正`
2. `fix(ui): 戦闘上端と郷操作帯のモバイル衝突を解消`
3. `ci(ui): P0 visual smokeを公開blocking gateへ追加`
4. `fix(shell): 画面scroll・家系図右上・通知・戦闘logを共通化`
5. `refactor(home): 今月の推薦を単一判定源へ統合`
6. `feat(home): 今月の要と帰還差分を追加`
7. `feat(resume): 前回の灯を追加`
8. `feat(depart): 地域3候補と前回編成を追加`
9. `feat(forge): 人物先行の推薦とmobile filter Sheetを追加`
10. `fix(codex): mobile詳細をSheetへ統一`
11. `feat(dungeon): 帰り火・可視map操作・POI一覧を再設計`
12. `feat(battle): 対象決定・兆し・行動順を統一`
13. `feat(village): 操作帯分離と決断結果の反映を追加`
14. `feat(visual): Home/戦闘/鍛冶の背景を画面別に統合`
15. `feat(world): Dungeon/郷を地域固有layerへ分解`
16. `docs(url): Organization URLを全正典へ同期`
17. `docs: STATUS/GDD_v3/WORKLOGへ判断と検証証拠を記録`

将来originを再変更するとユーザーが別途承認した場合だけ、`feat(save): 全保存梯子のURL救出導線とfixtureを追加`をUI刷新と別releaseで実施する。

オート階層、初回歩行条件、日次報酬は上記commit群に混ぜず、体験方針gate承認後の別commitにする。

各commitで`npm run lint`、対象test、`npm run build`を通す。公開前に全565+追加unit、5幅Playwright、同一セーブbefore/after、人間採否を実行する。pushは必ずユーザー確認後。

## 15. 独立監査の反映

### Round 1: UX / Growth / Devil

- UX判定: **要改善**。Mapping不一致、モバイル安全操作、推薦対象の不可視、詳細表示の不統一を指摘。
- Growth判定: **PMF未確認**。コアループは強いが計測0で、最有力bottleneckは復帰性と推定。
- Devil判定: **REWORK**。テスト数を魅力の根拠にしないこと、UIとURLを分離すること、セーブ救出を先行することを要求。

本稿は次を取り込んだ。

- Home overflowをPhase 0のP0へ追加。
- 人間の5秒理解、旅程test、同一セーブbefore/afterをexit gateへ追加。
- UI刷新とURL移行を別releaseに分離。
- username/repo renameを主経路から除外。
- 旧origin救出page、OGP/404/HTTPS/redirect実測をURL gateへ追加。

### Round 2: URL / scope再監査

- 判定: **REWORK**。
- 指摘: Pages登録とDNSの順序、verifyリンク、URL影響度、全保存梯子、意味的不変条件、救出repoの権限、永久redirect、canonical hostname、CI blocking、証拠参照、Phaseの広さ。
- 反映: §2、§7、§8、§9、§13、§14を修正。特にDNS前のPages登録、v1/v3/v4/backup正規化、新origin維持修復、Phase 3Bのユーザー判断gateを追加した。

### Round 3: 実行可能性の最終監査

- 判定: **REWORK（最終round）**。
- 指摘: 72時間とPhase gateの矛盾、worktree/ownership記載、gitignoreされた視覚証拠、切替後の救出主導線、計測開始条件の不足。
- 反映: 最初の72時間をPhase 0だけへ限定し、`deploy.yml`の所有を追加。before画像とhashを`docs/qa/`へ永続化し、新originの救出card/E2E、provider/privacy/opt-out/送信開始日と定性pivotを明文化した。追加roundは行わず、実装時は各exit gateの直接証拠で判定する。

### Round 4: UI v2 Forge独立評価

- 判定: **PASS（初回、blocking 0）**。
- 固定5軸: 初期フック4/5、世界固有性4/5、快適な判断4/5、報酬と物語の因果5/5、実装具体性4/5。全軸の合格線4/5以上を満たした。
- 客観gate: 主要5画面仕様、画像5点の実在/寸法/SHA-256、実リンク、人間task/DOM/性能の受入条件、現Organization URL、現行指示の矛盾0を確認。
- 非blocking注意: Home/Battleの日食と灯の二焦点は指定済みcrop/暗幕/独立panelを省かない。Villageの5施設識別はasset採用gate、3施設taskは旅程gateとして扱う。Battleの対象決定方式と`object-position`、第2地域の5軸値は各実装Phase開始時に固定する。
- Forgeは初回で合格したため、Round 2用の`docs/CODEX_FORGE_STATE.md`は作成していない。

### Round 5: M34 物語・画像統合Forge

- Round 1: **REWORK**。汐里名の開示順、内部`cut`の表示動詞と結果、縦長mobileでの横長CG cropをblocking 3件とした。
- Round 2: **REWORK**。`送る→看取る/夜明け`とmobile 16:9 `contain`は閉鎖。Intro、家業/技などch4前の実名露出とlegacy判定を継続。
- Round 3: **REWORK**。早期surfaceは網羅したが、ch4冒頭表示と完了条件、新旧v4を判別するsentinelを要求。
- Round 4: **PASS**。固定5軸は家族5/5、謎5/5、世代5/5、快適4/5、画像4/5。全客観条件PASS、blocking 0。
- 最終仕様: ch4最終頁/skipのtransactionだけで汐里名を開示。M34 new gameは`m34_narrative_schema=1`を持ち、sentinel欠落legacyだけ保守導出/recapを一度行う。`cut`は内部IDのまま表示`送る`。360/390/768pxの夢CGは前面16:9 `contain`全景。
- 証跡とblocking台帳は`docs/CODEX_FORGE_STATE.md`。terminalは`合格 — 2026-07-20T18:48:06+09:00`。

## 16. 完了定義

このマスタープランは、次を満たした時に実装完了へ移行できる。

- Phase 0〜3Aの各exit gateが直接証拠で合格。Phase 3Bはユーザーが採用した実験だけを対象にする。
- 定量経路なら計測開始gate後の7日コアループbaselineが取得される。計測非導入なら、同一taskの初見5〜8人による定性baseline/再検証が記録される。
- 5人の初見task testで主要3課題を4/5以上が成功。
- 現Organization URL、repository、OGP/文書のcanonicalが一致。将来originを再変更する場合だけ、セーブ救出を先に公開して新旧originの実走を合格させる。
- 正典`GDD_v3.md`、状態`STATUS.md`、履歴`WORKLOG.md`が実装と一致。
- push前にユーザーが公開を承認する。

この文書から実行へ移す際は、まずPhase 0だけをClaude / Fable 5へ渡し、合格後にPhase 1へ進む。全Phaseの同時実装は禁止する。
