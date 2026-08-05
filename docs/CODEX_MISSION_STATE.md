# CODEX MISSION STATE — M61 戦闘舞台「灯脈劇場」実装

## ①契約

- **Definition of done**: 2026-08-04生成の最上位戦闘画面案が示す「左右対峙・一枚の地域舞台・全身戦絵・敵兆し・下部軍議盤」を、既存Battle runtime上の操作可能UIとして実装する。PC 1280/1440、tablet 768、mobile 390/360で入力、標的選択、技、道具、オート、結果遷移と横overflow 0を実ブラウザ検証し、型/lint/Vitest/build、fresh独立監査へ合格する。
- **Out of scope**: 戦闘計算、敵AI、報酬率、セーブ形式、敵・人物・地域の新規量産、生成コンセプト画像そのものの配信組込み、公開デプロイ。
- **Constraints**: 全戦闘オート、同一報酬、M53 `battle-first`、スマホ同格、墨金の家譜、44px以上の操作面、対象選択→予告→明示実行を維持する。既存dirtyの加護カード修正4ファイルを上書きしない。
- **Permission boundary**: ローカルの可逆なコード・CSS・test・正典更新だけを行う。commit、push、deploy、外部送信、未確認素材の権利昇格は行わない。
- **Escalation**: 既存素材だけで全身cutoutを成立させられない場合は、札を破壊的に消さず同一舞台へ馴染ませる。戦闘契約や素材権利の変更が必要なら停止して確認する。
- **Audit class**: independent audit。主要操作画面の全面再構成であり、PC/mobile、アクセシビリティ、戦闘契約への回帰リスクが高いため。
- **Subjective acceptance**: 生成案と現行実画面を、舞台占有、左右対峙、人物焦点、兆し→標的→操作の視線順、画材統一、余白、低いAIテンプレ感の7軸で比較する。自動testだけを魅力の証明とは扱わない。

## ②作業分解

| Item | Dependency | Owner / execution path | Acceptance check | Status |
|---|---|---|---|---|
| A. baseline・境界固定 | AGENTS/GDD/STATUS/git/現行画面 | root | dirty保護、現行PC画像、権限、契約、既存selectorを記録 | completed |
| B. Battle構造・素材・test監査 | A | explorer 3系統 + root | DOM/CSS、既存素材、影響testの証拠を回収 | completed |
| C. PC灯脈劇場 | B | root | 一枚舞台、左右対峙、人物拡大、兆し、標的、軍議盤を1280/1440実測 | completed |
| D. mobile/tablet同格化 | C | root | 768/390/360で名前/HP/兆し/主要操作、overflow 0、44px | completed |
| E. 統合検証・限定修正 | C,D | root | focused/full Vitest、lint、build、重点Playwright、生成案比較 | completed |
| F. fresh独立監査・正典同期 | E | fresh reviewer + root | blocking 0、GDD/STATUS/WORKLOG/state一致 | completed |

## ③完了済み

- 2026-08-04: `git status --short`で既存dirtyを `docs/WORKLOG.md`、`src/ui/Dungeon.tsx`、`src/ui/dungeon_m25.css`、`tests/visual/boon_draft_layout.spec.ts` の4件に固定。Battle系の既存dirty 0。
- 2026-08-04: `AGENTS.md`、`docs/GDD_v3.md`、`docs/STATUS.md`、旧M60 terminal stateを確認。全戦闘オート、M53 battle-first、スマホ同格、同一報酬を本契約へ継承。
- 2026-08-04: 現行PC 1280×720の味方3/敵2実画面を `C:/Users/junna/AppData/Local/Temp/hitsugi-battle-sample-pc.png` へ取得。生成案は配信素材にせず構図参照へ限定。
- 2026-08-04: `Battle.tsx`と最後尾`battle_m61.css`で、顔札つき行動順、一枚舞台、敵左／味方右、敵兆し、年齢別味方戦絵、下段五行動の軍議盤を実装。tablet/mobileは縦の対峙と二列操作へ再構成。
- 2026-08-04: mobile兆し余白、360px行動順、4対4名札幅、オート報告`aria-live`、AR1 focus selector、visual closure SHAを限定修正。
- 2026-08-04: 初回独立監査のP1「mobile縮約時の全行動順欠落」を全順序aria-label＋44px「順+n」展開で閉鎖。P2の成人姿fallbackと901〜1099px軍議盤も修正し、1024px境界testを追加。
- 2026-08-04: 全Vitest 59 files/826 tests、lint、build 891 modules、visual closure 69、manifest 9、diff-checkに合格。PlaywrightはM61 11 passed/4 intended skips、兆し＋標的確認15/15、全戦闘オート5/5、4対4 5/5。
- 2026-08-04: fresh再監査はP0 0/P1 0/blocking 0、SHIP-with-notes。物理端末とNVDA/VoiceOverは外部gateのまま。

## ④保留リスト

- 新規生成戦闘背景・人物cutoutの公開利用は権利/所有者承認を伴うため本mission外。既存配信素材とCSSで先行する。
- 外部初見者、物理端末、NVDA/VoiceOver実利用は自動ブラウザで代替完了と主張しない。

## ⑤質問キュー

- 解決済み: 2026-08-05にユーザーからdeployの明示依頼を受け、限定stage・commit・main push・公開確認まで実施した。

## ⑥マイルストーン履歴

- M61-0: mission契約、Goal、5段階plan、3系統read-only探索、現行baselineを開始。
- M61-1: PC/tablet/mobile灯脈劇場、年齢別戦絵、顔札行動順、五手軍議盤、専用5幅testを実装。
- M61-2: source freeze gate合格。初回独立監査P1 1/P2 2を限定修正し、再監査blocking 0へ到達。
- M61-3: `e8afbff`をmainへpush。Actions run `31008582327`のverify/deployと、公開HTML＋55 JS/CSS/deferred resourcesの2xx・commit marker一致を確認。

## ⑦次の一手

- runtime公開は完了。残る外部初見者、物理端末、NVDA/VoiceOverの実利用確認は自動検証済みと扱わず、次回の外部品質gateとして維持する。

## ⑧最終監査表

- **監査種別**: independent audit（実装freeze後に実施）。
- ✅ PC灯脈劇場: 1280/1440で一枚舞台、左右対峙、人物焦点、兆し、軍議盤を確認。
- ✅ mobile/tablet同格: 768/390/360で縦対峙、名前/HP/兆し/主要操作、overflow 0、44pxを確認。
- ✅ 戦闘操作・オート・報酬契約: 標的明示実行15/15、全戦闘オート5/5、4対4 5/5。戦闘計算と報酬データは未変更。
- ✅ 機械gate・実ブラウザ: Vitest 826/826、lint、build、closure/manifest/diff-check、M61 11 passed/4 intended skips（5幅10件＋1024px境界1件）。
- ✅ 権限境界・既存dirty保護: 現時点で逸脱なし。
- ✅ fresh独立監査: 初回P1 1/P2 2を閉鎖し、再監査P0 0/P1 0/blocking 0、SHIP-with-notes。

## ⑨terminal印

公開完遂 — 2026-08-05。M61実装`e8afbff`をmainへpushし、GitHub Actions run `31008582327`のverify/deploy成功と公開commit marker一致を確認。外部初見者、物理端末、NVDA/VoiceOverは未検証の外部gateとして残す。
