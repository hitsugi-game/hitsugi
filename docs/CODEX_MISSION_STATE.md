# CODEX MISSION STATE — M50 適応型音楽・一族札収まり改善

## ①契約

- Definition of done: 灯継ぎ固有の音楽文法を既存Web Audioへ実装し、画面・戦況で滑らかに変化させ、音楽/効果音/環境音を個別調整可能にする。一族小札は横スライドなしで全員を見られる配置へ直す。権利・性能・既存save・全戦闘オート・回帰を検証し、独立監査とshipcheck後にmainへpushしてGitHub Pages反映まで確認する。
- Out of scope: 第三者/有償音源、外部作曲サービス、敵・地域・装備・物語の追加、戦闘計算や報酬、save schema変更。
- Constraints: 外部音源ファイル0、初回ユーザー操作までAudioContextを強制再生しない、既存マスター音量キー互換、音がなくても情報欠落0、低性能端末で無制限node/timerを残さない。
- Permission boundary: ユーザーが実装・commit・main push・deployを明示承認。費用、外部サービス登録、他repo、破壊操作は不可。
- Escalation: 認証不能、秘密情報、公開gate失敗、既存save破損だけをcritical blockerとして扱う。
- Audit class: independent audit。公開・常時音響・全画面横断・ブラウザ lifecycle を含み、主実装者と別視点の確認が必要なため。
- Subjective acceptance: 音楽ディレクター監査の「世界観固有性・反復疲労・意味ある変化・台詞可聴性」をrubric化し、コード上の構成と実ブラウザ操作を確認する。最終的な聴感効果は実ユーザー試聴を外部gateとして明記する。

## ②作業分解

| Item | Dependency | Execution path | Acceptance check | Status |
|---|---|---|---|---|
| A. 現行監査・専門家設計 | repo/GDD/M45A | main + music/technical reviewers | 行根拠、画面対応、音楽rubric、技術risk | completed |
| B. 音楽基盤 | A | main | bus分離、unlock、crossfade、visibility、timer/node cleanup | completed |
| C. 音楽内容・画面連携 | B | main | 画面曲、戦況tension、家祖motif、無音画面0 | completed |
| D. 設定UI・一族配置 | B | main | 4音量操作、互換、PC/mobile横スライド0 | completed |
| E. 検証・自己修復 | B-D | main | unit/lint/data/build/visual/実ブラウザ | completed |
| F. 独立監査・shipcheck | E | fresh reviewer + main | blocking 0、SHIP系判定 | completed |
| G. 正典・公開 | F | main | GDD/STATUS/WORKLOG、対象限定commit、Actions success、公開実測 | completed |

## ③完了済み

- 2026-07-24T18:32+09:00: ユーザーが音楽の方法検討・専門家参加・実装・deployを承認。
- 2026-07-25T00:00+09:00: 追加依頼としてHome一族小札の横スライド依存解消を同一公開へ統合。
- 2026-07-25T05:30+09:00: 追加依頼として玄の炎画像を人物仮肖像へ直す要件を統合。新規生成でなく既存配信中の顔絵を再利用。
- 現行はWeb Audio平調子6曲、単一master bus、同一16/8拍loop、画面直切替、単一音量、地域ambience4種。codex/finaleはtrack map漏れ、Appとglobal delegateでbutton SEが重複し得る状態を直接確認。
- 2026-07-25T06:02+09:00: 11曲、3bus、crossfade/duck/lifecycle、4音量、血脈音、一族grid、仮肖像を実装。focused Vitest 12/12、Playwright PC/mobile 14/14、lint/build合格。
- 2026-07-25T06:04+09:00: 実ブラウザで設定Sheetの旧440px幅による重なりを発見し、PC820px/mobile一列へ限定修復。PC client/scroll 817/817、mobile 389/389を目視確認。
- 2026-07-25T06:31+09:00: 全Vitest 51 files/765、Playwright PC/mobile 14、lint/data/build/closure69/manifest9、npm audit 0へ合格。環境音tailとvisibility挙動証拠を自己修復。securityはPASS / blocking 0 / non-blocking 0。
- 2026-07-25T06:34+09:00: fresh independent再監査はvisibility 8/8を独立再実行しPASS / blocking 0。件数記録も14/14へ同期。Ship CheckはSHIP-with-notes（実試聴、Safari/物理低性能端末、既存face系譜、main chunk約1.48MB）。

## ④保留リスト

- 実ユーザーによる聴感評価は公開後の外部gate。ローカル完了を妨げないが、魅力度向上の効果主張には使わない。
- `face_*`は既存公開版で配信済みだが、生成モデルまで遡るライセンス系譜は既存未確認。M50は新規画像0・同一ゲーム内再利用に限定し、権利確認済みへ昇格しない。

## ⑤質問キュー

- なし。権利安全のため外部素材を避け、既存の手続き音響を作品固有の構成へ深化する。

## ⑥マイルストーン履歴

- M50-0: Goal、7段階plan、契約、専門家2系統の読み取り監査を開始。
- M50-1: 純粋audio model、適応型音響、設定、一族grid、玄の仮肖像を実装。実画面で設定幅を自己修復。
- M50-2: 全機械/実画面回帰、権利記述、closure追跡、dependency audit、環境音tail、visibility挙動を閉鎖。独立最終再監査待ち。
- M50-3: independent/securityの両監査をblocking 0で閉鎖。正典同期とShip Checkを完了し、対象限定commit/pushへ移行。
- M50-4: 実装`6c8d2a5`をmainへpush。Actions run `30128251561`成功。公開HTML/JS/CSS/人物顔HTTP 200、M50 marker 4件、production test hook 0を確認。

## ⑦次の一手

- 全回帰とデータ/visual台帳を検証し、fresh independent auditとShip Checkへ進む。

## ⑧最終監査表

- **監査種別**: independent audit（予定）。
- ✅ 音楽内容: 11曲、句構成、戦況、血脈音を実装。
- ✅ 音響基盤: 3bus、compressor、crossfade、duck、gesture/visibility/cleanupを実装。
- ✅ 設定/一族UI: 4音量、起伏控えめ、一族grid、灯形未決定人物の仮肖像を実装。
- ✅ 回帰/実ブラウザ: Vitest 765、Playwright PC/mobile 14、設定実画面、visibility復帰まで合格。
- ✅ 独立/安全監査: independent PASS、security PASS、blocking 0。Ship CheckはSHIP-with-notes。
- ✅ ship/deploy: commit `6c8d2a5`、Actions `30128251561`、Pages公開、cache回避実測まで完了。

## ⑨terminal印

完了 — 2026-07-25T06:38+09:00。実装・自己修復・全回帰・独立/security監査・Ship Check・main push・Pages公開実測を完了。残る実試聴/Safari/物理低性能端末/既存face系譜は外部gateとして分離。
