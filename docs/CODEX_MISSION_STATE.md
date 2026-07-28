# CODEX MISSION STATE — M60 全改善・音楽強化・本番公開

## ①契約

- Definition of done: M59台帳のうちコード・設定・自動検証で実現可能なP0〜P2、M57/M58、適応型音楽強化を段階実装し、全機械gate、代表実ブラウザ、性能/保存回帰、fresh独立監査、Ship Check、main push、Pages公開bundle確認まで完了する。
- Out of scope: 実在する初見8名・一世代5名の代行、物理端末の代行、未確認素材の権利承認、課金/FOMO/P3量産凍結項目、外部analytics送信。
- Constraints: 既存M57/M58/M59 dirty差分を保護する。M58、M57 UI、灯芯手入れ経済を別gateで扱う。全戦闘オート、既存報酬、M54 map-native、M53 battle-firstを維持する。
- Permission boundary: ユーザーは本missionのcommit、main push、本番デプロイを明示承認済み。外部analytics、参加者募集、権利承認、課金は未承認。
- Escalation: 人間、物理端末、権利者が必要なgateは保留へ残し、headless/seed testで代替したと主張しない。blockingが残る機能はdefault-offまたは非公開とする。
- Audit class: independent audit。公開・save migration・報酬/戦闘・音響・CIを含むため、最終成果をfresh reviewerとShip Checkで監査する。
- Subjective acceptance: 魅力/音楽は反復変奏数、10分scheduler、場面/地域/世代差、情報の視覚併記、初見課題、実ブラウザ音響stateへ変換する。

## ②作業分解

| Item | Dependency | Owner / execution path | Acceptance check | Status |
|---|---|---|---|---|
| A. 境界・baseline固定 | AGENTS/GDD/STATUS/M59/git/live | root | dirty hash、公開HEAD、権限、外部gateを記録 | completed |
| B. Wave 0A/0B | A | root + save_resilience | M58分離、SaveResult、safe storage、root復旧、第三者request 0 | completed |
| C. Wave 0C/1 | A | ux_mobile + root | 8px解消、1/2/4/8人、200%表示、灯芯100 seed非劣化 | completed |
| D. M55探索 | B,C | root | Phase Aの自動検証可能範囲、checkpoint決定論、M54不変、PC/mobile | completed（人間観察は外部hold） |
| E. M56星籤/主戦 | B | root | 4 blocker閉鎖、実確率、save-first三択、主3体400 seed | completed |
| F. M45継承/収集 | B,C | root | 約束/記憶/家宝pilot、強制queue純増0、非FOMO | completed（神縁・地域拡張は外部hold） |
| G. 音楽強化 | A | audio_enhance | 10分変奏、世代/地域/場面差、timer leak 0、PC/mobile | completed |
| H. Release/性能/rights | B〜G | root | PR gate、browser smoke、bundle予算、BOM、未確認rights分離 | completed（管理者・物理計測は外部hold） |
| I. 統合検証・自己修復 | B〜H | root | lint/data/closure/manifest/Vitest/build/Playwright/性能 | completed |
| J. 独立監査・Ship Check | I | fresh reviewer + root | blocking 0、SHIP以上 | completed |
| K. 公開 | J | root | scoped commit、main push、Actions success、公開marker/HTTP 200 | in_progress |

## ③完了済み

- 2026-07-28T21:00+09:00: `$mission`契約、Goal、7段階planを開始。公開権限とanalytics非承認を分離した。
- 2026-07-28T21:00+09:00: `HEAD=origin/main=afc42e6`、既存dirty 17 tracked + M59新規文書1を確認。M57/M58/M59以外の既知scope混入なし。
- 2026-07-28T21:00+09:00: save/storage、mobile UI、音楽を重複しない所有範囲で3 workerへ委譲した。
- 2026-07-28T23:00+09:00: SaveResult/fingerprint、検証済みmain/BAK、storage拒否を吸収するsafe adapterと非保存のin-memory play、root recovery、Title先行＋全route lazy、PR/main共通release gate、性能予算、公開asset BOMを統合した。
- 2026-07-28T23:00+09:00: M57/M58、mobile戦闘、一族1/2/4/8人grid、灯芯100+100 seed、三星択一、主戦三体×方針×400 seed、三品の家宝額を統合した。
- 2026-07-28T23:00+09:00: 既存ブラウザ合成音楽を23画面・地域・季節・世代・物語・戦況の長周期変奏へ拡張し、三段階の重なりと現在曲／変奏名を可視化した。
- 2026-07-28T23:15+09:00: fresh UX監査の6 P1を限定修正。Dungeon地域ラスター0、変奏名live購読、未所持星札Tab停止0、敵札／兆し操作分離、46px操作面、家宝候補続きを閉じた。正典のM56旧状態矛盾も同期した。
- 2026-07-28T23:40+09:00: 全Vitest 59 files/826 tests、audit 0、lint、data 0/0、closure 69、manifest 9、BOM public/dist 2,825、build 890 modules、初期JS 74,281 gzip bytes、CSS 21,115 gzip bytes、重点5幅E2Eへ合格。
- 2026-07-28T23:40+09:00: fresh技術監査はP0 0/P1 0/blocking 0、`SHIP-with-notes`。noteは初期予算外の500kB超後続chunk分割のみで、本releaseの阻害ではない。

## ④保留リスト

- 初見8名、一世代5名、低性能PC/Android/iPhone、NVDA/VoiceOver実利用は外部gate。自動testとPlaywrightで実行可能部分を先行する。
- `face_*`と神MAXの生成モデル系譜は所有者/法務gate。BOMへpendingとして登録し、clearedへ偽昇格しない。
- GitHub Organizationのbranch ruleset/Environment reviewerは管理者設定gate。workflow側のPR checkとsmokeは実装可能。
- 共有staging URLは未構築。PRでは同一gateとPages artifactを生成するが、本番と別の閲覧URLは管理者判断を待つ。
- M55 Phase B/C、四地域の人間観察、神縁12柱、地域怪異、宿敵拡張は外部baseline合格後の別pilotとし、本releaseへ偽装同梱しない。

## ⑤質問キュー

- 非クリティカル: 外部初見テストと物理端末テストの実施日程は公開後に所有者と決める。

## ⑥マイルストーン履歴

- M60-0: 契約・Goal・plan・三系統実装を開始。
- M60-1: 保存／起動／mobile／M57／M58／M56／収集／音楽／release基盤を統合。
- M60-2: fresh技術・UX監査の保存救出、WebKit音響、兆し計測、探索画像、操作構造、収集末尾の欠陥を限定修正。
- M60-3: source freeze後の全機械gate、重点E2E、fresh独立監査を閉鎖。公開工程へ移行。

## ⑦次の一手

- scoped commitを作成しmainへpushする。GitHub Actionsのverify/deploy成功後、公開HTMLと再帰的JS/CSS chunk、commit markerを直接検証する。

## ⑧最終監査表

- **監査種別**: independent audit + Ship Check。
- ✅ M59実装可能項目: 実装完了。外部・権利・管理者gateは保留へ分離。
- ✅ 音楽強化: 23画面・長周期変奏・live表示・timer清掃を実装。
- ✅ 全機械/ブラウザ/性能gate: source freeze後に合格。
- ✅ 独立監査blocking 0: P0 0/P1 0、SHIP-with-notes。
- ⚠️ main公開とproduction確認: 未実施。
- ✅ 権限境界: deploy承認あり、analytics/権利/外部参加者は未承認として分離。

## ⑨terminal印

稼働中 — 2026-07-28T23:40+09:00。全gateと独立監査を閉鎖し、main公開とproduction確認を実行中。
