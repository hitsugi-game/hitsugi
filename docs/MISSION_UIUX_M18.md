# MISSION: M18 UI/UX再編「命脈の家譜」実装 — STATE

## ① 契約(不変。変更はユーザー承認のみ)
設計正典: docs/UI_UX_REDESIGN_PLAN.md(Codex作・ユーザー承認済)+ docs/UI_UX_ACCEPTANCE_CHECKLIST.md + docs/HANDOFF_UI_UX_CLAUDE.md。
監査区分=**自己監査**(kenshu)+最終独立code-review 1回。push=完了定義外(ユーザーゲート)。
- P0 ベースライン(スクショはpreview_screenshot不能のためDOMスナップショット+数値で代替・明記済み)
- P1 共通殻(ScreenShell/ActionDock/Sheet/WorkspaceTabs/StatusCallout/LiveBadge/EmptyGuide/CompareRow/LifeThread+focus管理)→ **UI_SHELL_API.md確定が委譲ゲート**
- P2 郷ホーム(血脈診断/状況別推奨/月送り確認/郷の帳+LiveBadge)
- P3 作業画面(鍛冶4タブ独立画面/普請/星契りステップ+固定CTA/出立CTA)
- P4 戦闘「火脈の戦場」+探索HUD
- P5 記録画面(家譜4タブ/図鑑/家系図全画面/郷の声)— sonnet並列(ファイル所有)
- P6 仕上げ(モバイル/キーボード/reduced-motion/大量一覧性能/文言)+GAPSレポート
- スコープ外: push・ゲームロジック変更・新規画像アセット・未追跡sprite一括add・設計書の再設計

## ①b devil反映の回帰ガード(P1受入条件に内蔵)
1. **SFX class契約**: クリック音はApp.tsx委譲リスナー(.btn/.node-btn/.god-card/.region-card/.char-card.clickable)+audio.ts(button/.cmd-btn分岐)。新殻は既存classを継承するか、リスナー側を一箇所だけ拡張(個別配線禁止=CLAUDE.md)。
2. **BGM track map**: 新Screen id(forge/facilities/familytree等)はApp.tsxのtrack switchに追加(default='none'=無音事故防止)。
3. **戻る導線**: goBackスタック非存在。独立画面化する各画面に「郷へ戻る」明示配線+実測。
4. **keep/rewrite対応表**: ↓②b

## ②b 直近資産×設計要求 対応表(判断基準: 設計書が上位、ただし直近実装が設計意図を既に満たす場合はkeep+差分補完)
| 直近資産(6b4ab2f..748b2f6) | 設計書の要求 | 判断 |
|---|---|---|
| 出立の絵地図AscentMap+詳細カード | 5.2 地域比較(危険度/深さ/主/推奨武功)+固定CTA | **keep+merge**(詳細カードに推奨武功・未回収を追加、ActionDockでCTA固定) |
| 選択色--sel統一+◆ | 3.1 命火=選択/推奨 | **keep**(同一思想) |
| 日参りバナー/御題カード | 4.5 郷の帳(務め 達成1・受領可) | **keep**+郷の帳のLiveBadgeに「受領可」を反映 |
| nav3群(営み/記録/心得) | 4.5 郷の帳(名前+現在値の帳面) | **rewrite**(3群構造は継承、入口に現在値/LiveBadge付与) |
| 戦闘FX(ダメージ階層/八芒星/キャレット) | 5.4 火脈の戦場(配置再編) | **keep**(FXは配置と直交。レイアウトのみ再編) |
| モーダル群(9 boolean) | 2.3 画面/小窓の再分類 | **rewrite**(鍛冶/普請/家系図=独立画面へ、他はSheet化) |

## ② 完了の定義(機械/実測)
各Phase+最終: npm run build緑 / npm run lint 0 / node scripts/validate_data.mjs 0失敗 / git diff --check 0。
preview実測: 1280×720+390×844で console error 0・意図しない横スクロール0・ESC/フォーカス復帰/trapのactiveElement機械検証。
Jシナリオ主要5本(新規→出立→初戦闘→帰還 / 存命1後継なし→星契り→誕生 / HP1→静養確認→回復 / 鍛冶購入→装備→差分 / 家系図移動)preview完走。
Phase毎に個別コミット(ローカル)。GAPSレポート=独立レンズ1回で受入。

## ③ 完了ビート(証跡=ファイル/実測)
- P0機械ベースライン: build✓/lint0/validate_data 0err(既知warn1)/diff-check✓(実行ログ)。DOM計測は保留(④)。
- P1: src/ui/layout/shell.tsx(9部品+focus管理)+index.css「M18共通殻」節+docs/UI_SHELL_API.md。tsc/lint/build緑。**preview実測は保留**。
- P2: homeInsight.ts(census/推奨6条/次月予告/帳)+Home.tsx再構成(血脈診断/決断+確認Sheet/郷の帳/アンカー)+store.markGossipSeen。tsc/lint/build緑。
- P3: Forge.tsx(4タブ・差分・薦・50件刻み・打ち直し確認)/Facilities.tsx(sonnet)/Pact.tsxステップ+固定CTA(sonnet)/DepartScreen準備バー+固定CTA(sonnet)+types/App配線(BGM track含む)。各エージェント自己検証緑+指揮側tsc/lint/build緑。
- P4: Battle.tsx(行動順6手/火脈印/中央寄せ--n・--sz/ログ帯+全履歴/技戻る固定/キーボード対象)+index.css P4節+Dungeon.tsx確認面Sheet化+帰り火の損失明示+dpad safe-area。tsc緑。
- **コミット: c78547c(P1-P4統合・Phase個別からの逸脱を記録)**

## ④ 保留リスト
- push(公開)=ユーザーゲート。
- **preview系ツールが障害中(claude-opus-4-8[1m]分類器不可)**: P0のDOM計測(git stash/worktreeで6b4ab2f時点を後追い計測可)・P1のfocus/ESC実測・P2-P5の画面実測・Jシナリオ — 全て復旧後にまとめて実施。機械検証(tsc/lint/build/validate)は各段で緑を確認済み。
- P0ピクセルスクショはDOMスナップショット+数値代替(handoffから逸脱・明記)。

## ⑤ 質問キュー
- (なし)

## ⑥ マイルストーン履歴
- Phase0契約: devil-advocate攻撃1回→修正3点(対応表/UI_SHELL_API/境界STATE)を契約化。出立CTA宛先はdepart画面と自己解決。
- P1-P4実装+チェックポイントコミットc78547c。P5=sonnet3体(Chronicle/Codex/FamilyTree)並列稼働中。

## ⑦ 次の一手
P5エージェント回収→統合tsc/lint/build→preview復旧確認→保留の実測一式(P0基準はstashで取得)→P6仕上げ+GAPS+検収。

## ⑧ 最終監査表(自己監査/kenshu — 2026-07-11時点・部分達成)
| 契約項目 | 判定 | 証跡 |
|---|---|---|
| 各Phase機械検証(build/lint/validate/diff-check) | ✅ | 各段+統合で全緑(実行ログ)。P5後は指揮側再実行 |
| P1 共通殻+UI_SHELL_API.md | ✅実装/⚠️focus・ESCのpreview実測未 | shell.tsx(9部品)+API文書。静的レビューでtrap/復帰ロジック監査済(disabled除外は指摘→修正済) |
| P2 郷ホーム(診断/推奨/確認/帳) | ✅実装/⚠️危機データ4種の実測未 | homeInsight.ts+Home.tsx。推奨6条は§4.3と一対一 |
| P3 作業画面4本 | ✅実装/⚠️実画面未 | Forge/Facilities/Pact/Depart+配線三点セット(レビューで完全性確認) |
| P4 戦闘+探索 | ✅実装/⚠️チェックリストE実測未 | Battle/Dungeon/CSS。--nズレはレビュー指摘→修正済。60vhのモバイル横持ちは要実測 |
| P5 記録画面3本 | ✅実装/⚠️チェックリストG実測未 | Chronicle/Codex/FamilyTree(sonnet自己検証+指揮側再検証) |
| チェックリストA-I preview実測 | ❌未(外部障害) | preview系ツールがclaude-opus-4-8[1m]分類器停止で1時間超不可(十数回リトライ) |
| Jシナリオ5本 | ❌未(同上) | 同上 |
| Phase毎個別コミット | ⚠️逸脱 | index.cssが複数Phase跨ぎのため c78547c(P1-P4)/1d8a590(P5)/91405a5(fix)の3コミットに統合。逸脱は記録済 |
| GAPSレポート | ✅ | docs/M18_GAPS.md(A9+B6+C5+推奨順)。独立レンズ=code-reviewer/devil経由の間接確認のみ(専用レンズ未) |
| 最終独立code-review 1回 | ✅ | opus別コンテキスト「出荷可」CRIT0/HIGH0/MED2(1件修正済・1件実測待ち) |
- 監査範囲外の明記: 受入オラクル(チェックリスト自体)の妥当性はPhase0 devil攻撃が担保。preview実測はツール復旧が前提条件。

## ⑨ terminal
- **未完(部分達成で一時終了)— 再開手順**:
  1. preview_start(hitsugi-dev)が通るか確認(分類器復旧待ち)
  2. P0基準: `git stash` 不要 — `git worktree add ../hitsugi-base 6b4ab2f` で旧UIを別ポートで起動し比較計測
  3. 実測バッテリー: チェックリストA-I(1280×720/390×844・console0・横スクロール0・ESC/フォーカスactiveElement検証)+Jシナリオ5本(新規→出立→初戦闘→帰還/星契り→誕生/HP1→静養/鍛冶購入→装備/家系図)
  4. 指摘残: battle-stage 60vhのモバイル横持ちクリップ・sticky top値のヘッダ折返し
  5. 完了後: ⑧を✅化→本ミッション「達成」→pushはユーザー確認
