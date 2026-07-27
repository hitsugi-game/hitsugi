# M56 星籤「三星択一」・主戦精密化 設計正本

- 作成日: 2026-07-28
- 状態: 設計完了・runtime未実装
- 対象: 無課金収集「星籤」と、序盤〜最終戦までの難易度曲線
非対象: 有償通貨、限定札、日課、期間限定、敵全体の一律強化、新規画像量産

## 1. 結論

星籤は、確率を上げるのでなく、**一籤で同位階の三柱を見て一柱を選ぶ**「三星択一」へ改める。位階抽選率と10/20/50保証は維持し、次回の実確率、候補生成、重複の実効価値を画面へ正確に出す。opening後は候補をsaveし、reloadで引き直せない。

戦闘は敵HP/攻撃の一律上昇を行わない。無圧力なtier3主11体へ、既存の「止・受・崩」を主戦用に精密化した固有手筋を割り当てる。強手と対処が見え、手動と全戦闘オートが同じ情報から対処する状態を400 seedで測定してから、個別の周期・技だけを調整する。

狙いは「ランダム報酬で興奮させる」ことと「負けやすくする」ことではない。**選べる偶然、説明できる保証、対処すると差が出る戦闘**を作る。

## 2. 現行の直接実測

### 2.1 星籤

現行実装は`src/core/star_lottery.ts`、UIは`src/ui/StarLottery.tsx`を正とする。

- 位階数: 下68 / 中51 / 上43 / 極18、計180柱。
- 基礎率: 下60% / 中28% / 上10% / 極2%。
- 10籤ごとに未所持、20籤ごとに上以上、50籤ごとに極を保証。
- 初帰還1籤、累計武功50ごとに1籤。武功は消費しない。
- 重複は縁+1。縁の実効主要効果は概ね5で上限に達する。

現行production関数を1,000 seedで連続抽選した結果:

| 使用籤 | 星札数 p10/中央値/p90 | 重複中央値 | 実効上限後重複中央値 | 極主札中央値 |
|---:|---:|---:|---:|---:|
| 20 | 18 / 19 / 20 | 1 | 0 | 0 |
| 50 | 41 / 43 / 46 | 7 | 0 | 2 |
| 100 | 71 / 76 / 80 | 24 | 0 | 4 |
| 200 | 114 / 119 / 124 | 81 | 0 | 9 |
| 500 | 172 / 177 / 180 | 327 | 14 | 23 |

問題は序盤の渋さより、次の三点にある。

1. 20/50保証の回でも、画面の確率は基礎率のままで次回実確率を示さない。
2. 一回確認して一枚が即確定し、プレイヤーの家や育成方針が介入しない。
3. 長期では縁の実効上限後に、意味のない重複が発生する。

### 2.2 中盤主

`tests/balance_sim.test.ts`の人物3代目・Lv6・三代形見・4人、各200 seedによる現行値:

| 地域主 | 素手 被HP / 瀕死 | 戦術 被HP / 瀕死 | 勝率 |
|---|---:|---:|---:|
| 骸星の大熊 | 31.2% / 19% | 21.1% / 1% | 両方100% |
| 翡翠主 | 5.2% / 0% | 4.4% / 0% | 両方100% |
| 影法師長 | 4.1% / 0% | 2.6% / 0% | 両方100% |
| 鍛地神王 | 12.0% / 3% | 7.0% / 0% | 両方100% |
| 泣男 | 4.7% / 1% | 2.1% / 0% | 両方100% |
| 骨董の主 | 6.6% / 0% | 4.3% / 0% | 両方100% |
| 錆刀の武者 | 6.4% / 0% | 3.6% / 0% | 両方100% |
| 百鬼夜行の先達 | 6.5% / 0% | 5.0% / 0% | 両方100% |
| 夢幻の主 | 8.5% / 3% | 3.7% / 0% | 両方100% |
| 白骨大将 | 4.5% / 0% | 2.6% / 0% | 両方100% |
| 常闇の番人 | 7.1% / 1% | 3.1% / 0% | 両方100% |

通常連戦はM47Cの帰還線で素手瀕死70.5%・全滅5.5%、戦術完遂100%・瀕死44%となり、帰還判断は成立している。問題は全体の敵数値ではなく、**tier3主11体のうち骸星を除く10体が戦術被HP2.1〜7.0%に留まり、11体全体に固有の対処差がないこと**である。

## 3. 固定原則

1. 星籤は現金、有償通貨、広告、日課、streak、限定、期間終了を持たない。
2. 星札を持っていない神も、現行の星契り解禁条件を満たせば契れる。ガチャ必須戦力を作らない。
3. 位階率60/28/10/2、獲得頻度、10/20/50保証を初期実装では変えない。
4. 三星択一は同じ位階内の選択であり、位階期待値を上げない。
5. 全戦闘オートは全戦闘で使えるままにする。
6. narrative modeは宿命modeより難しくしない。
7. 中盤通常連戦、月コスト、灯消費、報酬率、敵数、地形を変えない。
8. 新規画像を前提にせず、既存の神像、主絵、UI音、code-native演出を使う。

## 4. 星籤の新しい一回

### 4.1 体験順

1. **予告**: 「第N籤」「次回実確率」「作動する保証」「残り籤」を一画面に出す。
2. **開籤**: 籤を一枚消費し、同じ位階の候補三柱を生成して即saveする。
3. **選択**: 三柱の神像、位階、属性、得意二能力、未所持/現在の縁/次の縁効果を比較する。
4. **決定**: 一柱を選び、星札または縁を得る。未所持保証の添え札がある場合は同時に家譜へ加える。
5. **余韻**: 結果を「新しい星」「深まった縁」「縁極から導かれた星」に分けて一文で説明する。

三候補は一度に見せる。横carouselにせずPCは3列、mobileは縦3枚または1枚ずつのscroll-snapとし、決定CTAは画面下に固定しない。選択中の札内へ置く。

### 4.2 位階抽選

主札の位階は現在と同じ一回の抽選で決め、その位階から異なる三柱を一様・非復元抽出する。

- 通常籤: 下60 / 中28 / 上10 / 極2。
- 20の倍数: 上`10/(10+2)=83.33%` / 極`2/(10+2)=16.67%`。
- 50の倍数: 極100%。50と20が重なる100籤目も極100%。
- 10の倍数: 位階率は変えず、claim完了後に未所持が少なくとも一柱増える。

次回実確率は`nextStarLotteryOdds(drawNumber)`の純関数を単一情報源にし、UI文字とtestが同じ値を使う。「基礎率」と「次の一籤」を別見出しにする。

### 4.3 未所持保証

10の倍数では、次の順で最低一柱の新規を保証する。救済札は一籤につき最大一柱とし、10回保証が星返りより常に優先する。

1. 主札位階に未所持があるなら、一柱を`guaranteedNewGodId`として開籤時に決定し、三候補へ必ず入れる。
2. プレイヤーが`guaranteedNewGodId`を選べば、その一柱が主札となり添え札は付かない。別候補を選べば、同IDを「添え札」として自動追加する。
3. 主札位階を全所持なら、全位階の未所持から一柱を`guaranteedNewGodId`として候補外に保存し、選択にかかわらず添え札にする。
4. 180柱全所持なら未所持保証表示を「星札帖 完集」へ置換し、偽の残り回数を出さない。

20/50保証は主札へ適用する。添え札の位階を上/極保証の達成には数えない。

### 4.4 重複価値

- 縁0〜4の重複: 従来どおり対象神の縁+1。
- 縁5以上の候補: 「縁極」と明記し、能力がさらに上がるように見せない。
- 10回保証が作動しない籤で、三候補の全てが開籤時に所持済みかつ縁5以上で、未所持札が残る場合: 未所持一柱を`starReturnGodId`として開籤時に保存し、選択した主札に加えて「星返り」として加える。
- `guaranteedNewGodId`と`starReturnGodId`は相互排他とし、一籤から救済札が二柱出る経路を作らない。
- 全180柱所持かつ候補三柱も縁極: 家譜へ重なり回数だけを記録する。新通貨や無限能力補正は作らない。

縁を5で強制clampして既存saveの数値を失わせない。効果説明側が、割引と遺伝下振れ緩和の上限を正確に示す。

## 5. 保存と引き直し防止

optionalな`StarLotteryPendingV2`と直近確定receiptを追加する。報酬種別と救済IDは開籤時に確定し、claim時に所持・縁から再抽選しない。

```ts
interface StarLotteryCandidateRewardV2 {
  godId: string
  ownedAtOpen: boolean
  affinityAtOpen: number
  mainReward: 'new-card' | 'affinity-plus-one'
}

interface StarLotteryPendingV2 {
  version: 2
  requestId: string
  drawNumber: number
  rank: GodRank
  candidateGodIds: [string, string, string]
  candidateRewards: [StarLotteryCandidateRewardV2, StarLotteryCandidateRewardV2, StarLotteryCandidateRewardV2]
  rescue?: { kind: 'guaranteed-new' | 'star-return'; godId: string }
  openedAtSeason: number
}

interface StarLotteryReceiptV2 {
  requestId: string
  drawNumber: number
  selectedGodId: string
  grantedGodIds: string[]
  affinityDelta: Record<string, number>
  rescue?: { kind: 'guaranteed-new' | 'star-return'; godId: string }
}
```

- UIは`expectedDrawNumber = drawsUsed + 1`とrequestIdを一度だけ発行し、`openStarLottery(requestId, expectedDrawNumber)`へ渡す。requestIdだけで新しいdraw番号を推測しない。
- `openStarLottery`は現在RNGのcloneで候補、candidate reward、救済、次RNG stateを計算する。pending、`drawsUsed = expectedDrawNumber`、次RNG stateを一つのGameDataとして保存・再読込検証した後にだけZustandとruntime RNGへ反映する。保存失敗時はmemory、RNG、drawsUsedを全て旧値へ保つ。
- pendingがある間、同じrequestId・drawNumberのopenは同じpendingを返す。異なるrequestは`pending_exists`、`expectedDrawNumber !== drawsUsed + 1`は`stale_request`として状態を変えない。
- `claimStarLottery(requestId, drawNumber, godId)`はcandidate参照を検証し、開籤時の`candidateRewards`と`rescue`だけから星札/縁/history/receiptを一度反映してpendingを消す。affinity rewardはclaim時の現在値へ固定`+1`し、開籤後の月送り等があっても減算・再抽選しない。
- 同じclaimの再送は`lastReceipt`を返す。さらに古い`drawNumber <= drawsUsed`は`already_settled`として無変更で終了する。よって履歴50件からrequestIdが脱落しても、単調増加drawNumberが再消費を防ぎ、冪等性をhistory保持件数へ依存させない。
- 旧saveはpendingなしのV1としてそのまま動く。現行historyは保持する。
- candidate重複、rewardとcandidate IDの不一致、存在しない神、drawNumber不一致、不正rank、同時に二救済、救済ID重複はmain saveを拒否して既存BAK復旧へ回す。

## 6. 星籤画面

### 6.1 上段

- 星札 `43/180`ではなく、総数と位階別`下20/68・中14/51・上7/43・極2/18`を切替表示。
- 残り籤、次の獲得までの武功、次回保証を一つの進行帯へ統合。
- 「未所持保証あと10」を全所持後も表示する現行挙動を廃止。

### 6.2 開籤面

- 三札は同じ大きさ。推薦札だけ巨大化しない。
- 各札に「未所持」「縁2→3」「縁極」「当主の強みと一致」を一つずつ表示。
- 推薦は決定を代行せず、既存Pactと同じ能力相性だけから純粋導出する。
- 選択後に確認を一度挟む。誤タップでclaimしない。
- 通常演出は800〜1,200ms。skip可能。reduced motionでは即時表示。点滅、偽のnear miss、長押し、連打待ちは使わない。

### 6.3 確率・履歴

- 基礎率、次回実確率、保証条件、候補三柱が同位階であることを常時読める。
- 履歴は直近10回を「第N籤 / 主札位階 / 選択 / 添え札 / 新規または縁」で表示。
- 「極が出そう」「熱い」など、確率にない期待を煽る文言は禁止。

## 7. 星籤のバランスgate

1,000 seed以上で次を測る。

| 観点 | Gate |
|---|---|
| 位階 | 1,000 save seed×50籤について、各draw位置の`nextStarLotteryOdds(n)`から`μ=1000Σp(n)`、`σ²=1000Σp(n)(1-p(n))`を位階別に求め、観測数が`μ±2.576σ`の99%区間内。20/50保証違反0 |
| 新規 | new-first選択policyで50籤の星札中央値48以上、p10 45以上 |
| 選択 | favorite-first policyでも10籤ごとの未所持増加100% |
| 重複 | 未所持が残る状態で「三候補全て縁極・救済なし」0 |
| 冪等 | open二重、claim二重、reload、旧save、破損pendingで籤/縁/札の複製0 |
| 戦力 | 星籤未使用saveでも全地域・最終戦へ到達可能。星札所持を解禁条件に使う参照0 |

三星択一により個別神の候補出現率は変わるため、「各位階内で一柱を即確定する確率」とは表現しない。同位階N柱から通常時に候補へ入る確率は`min(3,N)/N`であり、保証補正時は別表示する。

## 8. 主戦の精密化

### 8.0 確定兆しと状態所有

M56のtier3主だけは、一般敵の「行動候補」と別に`BossMechanicV1`を`BattleState`へ持つ。`cycleIndex`、`phase`、`turnsUntilStrong`、`accumulatedDamage`、`brokenUntilTurn`を単一情報源とし、予告後の強手は乱数行動に上書きされない。UIは`data-certainty="committed"`と「あとN巡」を表示する。主の撃破、戦闘終了、止の成立、崩による弱化は予告どおりの解決結果であり不一致に数えない。M47の一般敵候補表示は変更しない。

主の通常巡と強手巡は`bossPatternFor(enemyId)`から純粋導出し、実行、UI、オート、simulationが同じ`BossCueView`を読む。オートへ渡してよいのは画面にも出るcounter、残巡、必要damage、弱点、対象だけで、`accumulatedDamage`等の非公開内部値を直接読ませない。

### 8.1 主戦専用の三文法

通常敵のM43文法をそのままコピーせず、単体主でも成立するようにする。

#### 止 — 溜めを断つ

- 主は強手の二巡前から固有meterを見せる。
- 警告中に累計で主最大HPの12%へ相当する単体damageを与えると強手を通常攻撃へ弱化する。
- meterはdamage値から純粋導出し、連撃や奥義も実damage分だけ数える。
- オートは強手までの残巡と必要damageを見て単体攻撃を優先する。

#### 受 — 一巡を凌ぐ

- 次巡に全体強手を候補表示する。
- 防御した人物は既存防御率で軽減し、予告時の生存者数に対して`min(2, livingAllies)`人が防御できた場合は「凌いだ」と記録する。一人だけ生存する戦闘でも達成不能にしない。
- オートは危険巡だけ生存者全員へ防御を選ぶ。MPを消費しない。

#### 崩 — 弱点で構えを砕く

- 既存M43と同様、危険な構えへ弱点属性の技を当てると二巡の攻撃低下を付ける。
- 弱点技を持たない隊には戦支度盤で事前警告し、通常攻撃でも勝てる安全幅を残す。
- オートは保有する弱点技だけを使い、存在しなければ防御へfallbackする。

### 8.2 tier3主の割当

初期値は次表を正とし、強手は既存skill powerと実boss statで計算する。`周期`は強手を含むboss巡数、`予告`は強手前に必ず残す一族入力巡数。止の閾値は予告開始後の実damage累計、崩は弱点技命中で強手を含む2 boss巡のatkを70%へする。

| 文法 | enemyId / 主 | 周期 | 予告 | 強手 | 対処値 | 固有の予告語 |
|---|---|---:|---:|---|---|---|
| 止 | `boss_hoshimukuro` / 骸星の大熊 | 4 | 2 | `e_hoshikui` | 最大HP12% | 喰われた星を胸へ集める |
| 止 | `boss_kajishinnou` / 鍛地神王 | 3 | 2 | `e_hisui` | 最大HP10% | 炉心を白く鍛え上げる |
| 止 | `boss_hyakkiyakousendatsu` / 百鬼夜行の先達 | 4 | 2 | `e_hoshikui` | 最大HP11% | 行列の足並みを揃える |
| 止 | `boss_hakkotsu` / 白骨大将 | 3 | 2 | `e_hisui` | 最大HP10% | 骨兵へ号令を重ねる |
| 受 | `boss_kageboushiosa` / 影法師長 | 3 | 1 | `e_hoshikui` | `min(2,生存者)`防御 | 丘の影が一斉に立つ |
| 受 | `boss_nakiotoko` / 泣男 | 4 | 1 | `e_hoshikui` | `min(2,生存者)`防御 | 慟哭を胸奥へ吸い込む |
| 受 | `boss_yumemaboroshi` / 夢幻の主 | 3 | 1 | `e_hoshikui` | `min(2,生存者)`防御 | 館の全ての戸が開く |
| 受 | `boss_tokoyaminobannin` / 常闇の番人 | 4 | 1 | `e_hoshikui` | `min(2,生存者)`防御 | 闇の大盾を振りかぶる |
| 崩 | `boss_hisuinushi` / 翡翠主 | 3 | 1 | `e_hisui` | 弱点命中・atk70%×2巡 | 翡翠の水衣を固める |
| 崩 | `boss_kottounonushi` / 骨董の主 | 4 | 1 | `e_hoshikui` | 弱点命中・atk70%×2巡 | 百の器が一つへ噛み合う |
| 崩 | `boss_sabigatananomononofu` / 錆刀の武者 | 3 | 1 | `e_hisui` | 弱点命中・atk70%×2巡 | 錆刀を上段へ据える |

全て2〜4巡の短いpatternとし、固有語は重複させない。画像は追加せず、既存主絵、意図札、meter、接地光、SEで示す。

## 9. 難易度curveとgate

### 9.1 固定する既存gate

- 序盤tier1宿命3体: 勝率100%、被HP5%以上、1〜2撃で終了しない。
- 中盤帰還線: 素手瀕死60%以上、戦術完遂95%以上、戦術は素手より瀕死率とHP p10が悪化しない。
- 玄冬: 素手勝率40〜85%、現実policyで詰ませない。
- 語り部: 対応する宿命条件より完遂率を下げない。

### 9.2 tier3主の新gate

各主は同じ400 seedを次の4 policyで再利用し、RNG差を対処差へ混ぜない。

1. `attack_only_ignore`: M47中盤fixture・装備を保ち、常に通常攻撃してM56兆しを無視する（現行表の「素手」）。
2. `tactical_ignore`: 現行`smartAllyAction`の回復・buff・最大単体技を使うが、M56兆し専用分岐を持たない（対処なしbaseline）。
3. `manual_counter`: `tactical_ignore`へ公開`BossCueView`だけを足す。止は予告中に実damage最大の行動を主へ集中、受は必要人数が防御、崩は使用可能な弱点技を優先し、無ければ防御する。
4. `auto_counter`: productionの`chooseAutoAction`を使い、`manual_counter`と同じ公開viewだけから対処する。非公開`BossMechanicV1`参照を型とspyで0件にする。

対処成功率の分母は「生存中に予告開始へ到達した強手回数」。止は閾値到達、受は`min(2,予告時生存者)`防御、崩は使用可能な弱点技を持つ隊での弱点命中を成功とする。弱点技なしrunは崩の成功率分母から除き、fallback防御後の勝率・全滅率だけを安全gateへ含める。被HP相対差は`(ignore中央値 - counter中央値) / max(ignore中央値, 1)`、危険手軽減は強手一回ごとの同式で計算する。行動数は敵味方を含む`performAction`呼出回数、percentileは昇順配列の`floor((n - 1) * p)`を採用する。

| 指標 | Gate |
|---|---|
| 安全 | `manual_counter`と`auto_counter`の勝率95%以上、全滅5%以下を双方11/11。弱点技なし崩runも含む |
| 手応え | `tactical_ignore`の被HP中央値10〜35%を8/11以上。5%未満は2/11以下 |
| 対処差 | `tactical_ignore`対`manual_counter`で被HPが相対20%以上減る、または危険手の被害を35%以上減らす主を8/11以上 |
| 文法成立 | 止/受/崩それぞれで正対処成功率70%以上、UI予告と実発動の不一致0 |
| 時間 | 正対処の行動数中央値8〜24、40行動超run 1%未満 |
| オート | 堅実/温存/全力が画面に出た同じ兆しだけで対処し、非公開state参照0。`auto_counter`成功率は`manual_counter`より5ポイント超悪化せず、勝率差2ポイント以内 |

全主を同じ被HPへ揃えない。骸星の大熊は高圧、翡翠主は低圧でもよい。ただし「予告を読み対処した差」は全三文法で必要とする。

## 10. 調整順

### Phase A: 星籤の信頼性

- 次回実確率、保証表示、全所持表示、縁効果説明を先に修正。
- Gate: 現行一枚抽選のまま表示と純関数testを閉じる。

### Phase B: 三星択一

- pending V2、open/claim分離、三候補UI、10回添え札、縁極救済を実装。
- Gate: 1,000 seed、冪等、save/BAK、PC/mobile、keyboard/reduced motion。

### Phase C: 主戦pilot

- 骸星の大熊（止）、夢幻の主（受）、翡翠主（崩）の三体だけ実装。
- Gate: 三文法の対処成功、400 seed、戦術説明、全オート、実画面。

### Phase D: tier3 11主

- pilotと同じschemaで残り8体を設定追加。
- Gate: §9.2を11/11で測る。未達主だけ周期・技・12% thresholdを個別修正する。

### Phase E: 曲線回帰

- 序盤、通常中盤、tier3主、終盤三主、玄冬を同じreportへ出す。
- Gate: §9.1を全て維持し、星籤未使用fixtureでも到達可能。

## 11. 実装候補

- [既存] `src/core/star_lottery.ts`: odds、open/claim、candidate、保証、星返り
- [既存] `src/core/types.ts`: pending V2、history V2 optional fields
- [既存] `src/core/save.ts`: pending参照・件数・rank validation
- [既存] `src/core/store.ts`: atomic open/claim/save
- [既存] `src/ui/StarLottery.tsx`: 次回確率、三候補、効果説明、履歴
- [既存] `src/ui/star_lottery.css`: PC3列、mobile可読一列、overflow 0
- [既存] `src/core/enemy_behaviors.ts`: boss behavior schemaと11設定
- [既存] `src/core/battle.ts`: 止meter、受/崩の実発動
- [既存] `src/core/auto_battle.ts`: 公開兆しだけによる三文法対処
- [既存] `src/ui/Battle.tsx`: 残巡、必要damage、対象、対処、結果
- [既存] `tests/m43_star_lottery.test.ts`: V1互換を保持
- [新規作成] `tests/m56_star_lottery.test.ts`: odds、pending、三択、保証、救済、冪等
- [既存] `tests/enemy_behaviors_m43.test.ts`: 序盤12種回帰
- [新規作成] `tests/m56_boss_behaviors.test.ts`: tier3主11設定と発動一致
- [既存] `tests/balance_sim.test.ts`: 4 policy×11主×400 seedと全curve
- [新規作成] `tests/visual/m56_star_boss.spec.ts`: PC1280/mobile390、keyboard、reduced motion

## 12. 見送る案

- 有償石、十連販売、広告視聴、daily無料、連続login、期間限定pickup。
- すり抜け、確率上昇を演出だけで示すnear miss、結果確定までの長い待機。
- 星札が無いと星契りできない、極ツ星がいないと主を倒せない設計。
- 重複を新しい無限強化通貨へ変える。
- 全敵HP/攻撃+20%、プレイヤー回復半減などの一律難化。
- 11主を検証前に全て同時実装する。

## 13. 完了条件

- 次の一籤で何が保証され、どの確率で、何を選ぶかを開籤前に説明できる。
- reloadしても同じ三候補へ戻り、籤・星札・縁が複製されない。
- 50籤時点で収集が現行より進み、極主札の期待値は変わらない。
- 縁極後の重複に偽の戦力上昇を表示しない。
- tier3各主で固有の危険と正しい対処を一文で説明できる。
- 正対処は生存差を作るが、未対処でも一律即死させない。
- 全戦闘オート、語り部、既存通常連戦、最終戦のgateを壊さない。
- 全Vitest、lint、data、closure、manifest、production build、PC/mobile E2Eがgreen。

## 14. 実装担当への最初の指示

Phase Aだけを先に行う。確率や保証値そのものは変更せず、`nextStarLotteryOdds()`と表示を単一情報源化する。Phase Aの差分で戦闘、save schema、三択UIへ触れない。Phase A合格後にPhase B、さらに合格後に三体pilotへ進む。
