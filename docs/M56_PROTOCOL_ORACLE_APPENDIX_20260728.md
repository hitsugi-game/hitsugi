# M56 Protocol / Oracle Appendix

> 適用先: `GACHA_BALANCE_PRECISION_PLAN_20260728.md`
> 状態: runtime実装前のblocking 4件を閉じる単一情報源
> 固定日: 2026-07-28

## 1. 400 seed計測oracle

同じ主、同じparty、同じ装備、同じseed集合`0..399`を、次の4 policyへ一対一で再利用する。

1. `attack_only_ignore`: 生存する最初の敵へ通常攻撃だけを行う。
2. `tactical_ignore`: 現行の回復、buff、最大単体技を使うが、`BossCueView`を参照しない。
3. `manual_counter`: `tactical_ignore`へ公開`BossCueView`だけを加える。
4. `auto_counter`: productionの各オート方針（堅実・温存・全力）を同一seedで個別に走らせる。

`auto_counter`は三方針それぞれ400 runとし、合否は三方針の最悪値で判定する。主戦pilot三体は合計`3主 × (3非auto policy + 3 auto policy) × 400 seed = 7,200 run`。主ごとの対処成功率は、予告開始時に主と一人以上の一族が生存していた強手機会を分母とし、run間では強手機会数を合算してから一度だけ割る。runごとの率の平均は禁止する。

危険手軽減率は、seedと「そのrunの第k強手」をpairing keyにし、双方に同じ強手機会が存在するpairだけを比較する。各pairの`max(0, ignoreDamage - counterDamage) / max(ignoreDamage, 1)`を求め、その中央値を主単位の値とする。片方が強手前に撃破された場合は「対処成功・被害0」としてpairへ含め、全滅で到達しなかった場合は分母外だが安全gateへ含める。

## 2. 単一stop threshold

pilotの「止」は、予告開始後から強手解決直前までに与えた実HP damage累計が`ceil(bossMaxHp × stopRatio)`以上で成立する。`stopRatio`は主設定の唯一の値とし、骸星の大熊は`0.12`。UI、実行、手動、オート、simulationは`BossCueView.requiredDamage`を共用し、別の定数を持たない。overkill、shield吸収前の仮damage、状態異常の予定damageは数えない。

## 3. claimのsave-firstとrollback

`claimStarLottery`は純関数で次GameDataとreceiptを作るだけにし、runtime反映より先に永続化する。

1. pending、requestId、drawNumber、候補、candidate reward、rescueを検証する。
2. 現在GameDataのcloneへ報酬、history、receipt、pending削除を一度だけ反映する。
3. 次GameDataをmainへ保存し、再読込した`saveSeq`とfingerprintが一致した時だけ成功とする。
4. 成功後にだけZustandへ反映する。失敗時は旧Zustand、旧main、BAK、pending、RNGを全て維持し、`persist_failed`を返す。

同じclaim再送は、requestIdとdrawNumberが`lastReceipt`と一致した場合だけ同receiptを返す。pendingなしで`drawNumber <= drawsUsed`だがreceipt不一致なら`already_settled`。異なるrequestId、異なる候補、古いdrawNumberから報酬を再構成しない。

## 4. rescue validatorの許容・拒否集合

許容:

- `guaranteed-new`が三候補の一柱と同じIDである。選択時、選ばれたなら主札だけ、選ばれなければ添え札として一度だけ付与する。
- `guaranteed-new`が候補外である。主札位階を全所持の場合に限り、選択にかかわらず添え札として一度だけ付与する。
- `star-return`が候補外である。三候補が全て所持済みかつ縁5以上、未所持が残る場合に限る。
- rescueなし。10回保証非該当か、180柱完集時。

拒否:

- candidate IDの相互重複、candidate rewardのID/rank不一致、未知ID。
- `guaranteed-new`と`star-return`の同時存在。
- rescue対象がopen時点で所持済み、またはrescue IDが付与対象配列に二度以上現れる。
- 10回保証対象で未所持が残るのにrescueなし。
- 10回保証対象外の`guaranteed-new`、または三候補が縁極でない`star-return`。
- pendingの`drawNumber !== drawsUsed`、`version !== 2`、`candidateRewards.length !== 3`。

「救済ID重複」は、候補への包含そのものではなく、同じIDを主札と添え札の両方として二重付与する状態を指す。候補内保証IDは正常な一候補であり、validatorは拒否しない。

## 5. 合格条件

- §1の集計をtest codeとproduction codeが同じ`BossCueView`で実行する。
- §2の閾値が設定、UI、simulationで一意。
- open/claimの保存失敗、二重click、reload、BAK復旧で籤、札、縁の複製0。
- §4の許容fixtureが全て通り、拒否fixtureが全てmain saveを拒否する。
- fresh独立監査でblocking 0。
