# Codex Handoff

## 2026-07-21 — M34物語・画像統合の実装完了と公開準備

Claude Codeは次の順に読む。

1. `AGENTS.md`
2. `docs/GDD_v3.md`
3. `docs/STATUS.md`
4. 本ファイル
5. `docs/CODEX_MASTERPLAN_DRAFT.md`
6. `docs/qa/ui-audit-baseline-20260720.md`
7. `docs/visuals/ui-v2/README.md`
8. `docs/NARRATIVE_VISUAL_INTEGRATION_PLAN.md`
9. `docs/visuals/story-v2/README.md`
10. `docs/qa/narrative-visual-baseline-20260720.md`
11. `docs/CODEX_FORGE_STATE.md`

### 1. 今回やったこと

- ユーザーが外部公開用GitHub Organization `hitsugi-game`を作成した。
- ユーザーがpublic repositoryを`UmiNe2025/hitsugi`から`hitsugi-game/hitsugi`へ移管した。
- 2026-07-20 JSTに`git ls-remote https://github.com/hitsugi-game/hitsugi.git HEAD`を実行し、`478be96241124aa5c530acac2b768c8e1d9a7824`を確認した。ローカルHEADと一致する。
- `https://hitsugi-game.github.io/hitsugi/`はHTTP 200を確認した。旧`https://umine2025.github.io/hitsugi/`はHTTP 404を確認した。
- ローカルrepositoryの`origin`を`https://github.com/hitsugi-game/hitsugi.git`へ変更し、`git fetch --dry-run origin`成功を確認した。
- 外部利用者はまだ0人で、公開案内も未実施であることをユーザーが確認した。このため旧originの一般利用者向けセーブ救出は今回の移管条件から外した。開発用ブラウザセーブが必要なら手動export/importする。
- 現状監査、UI/UX再設計、Organization移管後のURL方針を`docs/CODEX_MASTERPLAN_DRAFT.md`へ記録した。P0のbefore証拠は`docs/qa/`にある。
- Home、戦闘、Dungeon、郷、鍛冶の実装基準画像5点を`docs/visuals/ui-v2/`へ追加した。生成prompt、寸法、SHA-256、目視採否、統合順は同folderの`README.md`が正本。
- Home画像は全面背景ではなく上段/右側hero候補。戦闘/鍛冶は背景候補。Dungeon/郷は一枚を床へ貼らず、navigation、境界、光、POI、前景へ分解する。
- UI v2 packは独立Forge評価で初回PASS（5軸4/4/4/5/4、blocking 0）。実装時の非blocking注意は、Home/Battleの二焦点対策、Villageのasset/旅程gate分離、Battle対象方式/crop固定、第2地域の固有5軸値固定。
- 物語を全画面朗読だけでなくHome、出立、探索、主戦、帰還、郷、鍛冶、家系図へ分散するM34計画を`docs/NARRATIVE_VISUAL_INTEGRATION_PLAN.md`へ追加した。
- 夢渡り弐〜終の固有CG7点を`public/img/cg_dream_02.jpg`〜`08.jpg`へ組み込み、16:9 `contain`、alt、fallback、次篇1枚preloadを実装した。
- `nextDreamEpisode()`の順序抜け、同一月scene過密、ch4名開示、legacy/post-M34 save、途中reloadをN0で修正し、Home「灯の余白」の後で読む/再読/7日一度通知まで実装した。
- M34 packは独立Forge Round 4でPASS（家族5/謎5/世代5/快適4/画像4、blocking 0）。ch4最終頁だけの汐里名開示、M34/legacy save判別sentinel、`cut`表示`送る`、mobile 16:9全景が実装必須。詳細台帳は`docs/CODEX_FORGE_STATE.md`。
- M34のゲームコード、テスト、固有CG、正典同期をローカル実装し、独立監査PASS（blocking 0）。現役導線のhardcoded URLも`hitsugi-game`へ修正した。2026-07-21にユーザーがデプロイを明示承認し、Ship Check後のcommit/pushを進行中。

### 2. 未完了と次アクション

最初にM34をcommit/pushし、GitHub Actionsと公開URLを検証する。その後、`docs/CODEX_MASTERPLAN_DRAFT.md`のUI Phase 0へ進む。

1. Ship Checkの全gateを通し、`tmp/`を除くM34/設計/URL同期の対象pathだけをstageする。
2. `main`へpushし、`.github/workflows/deploy.yml`のbuild/deploy成功と新URLのHTTP/画面/OGPを実測する。
3. 成功後にSTATUS/WORKLOG/MISSION/HANDOFFを公開済みへ閉じる。
4. UI Phase 0として、Homeのモバイル横overflow、戦闘上端競合、郷のD-pad/「話す」競合を修正する。
5. `docs/qa/ui-audit-baseline-20260720.md`と同一fixture/viewportでafter証拠を保存し、P0 smokeをblocking CIへ追加する。
6. Phase 0のexit gateが全てPASSした後だけPhase 1へ進む。
7. 画像は`docs/visuals/ui-v2/`から採用対象だけを配信用pathへcopyし、画面別lazy load、solid fallback、mobile crop、文字コントラスト、LCPを検証する。5枚を初期preloadしない。
8. Home/戦闘/鍛冶は1画面ずつ統合する。Dungeon/郷は画像の直貼りではなく固有layerの設計参照として実装する。
9. 物語laneは`N0順序/queue/開示/migration → N1夢CG → N2主要旅程の残響 → N3家譜/Finale`の順。N0で`m34_narrative_schema`、ch4最終頁の原子的開示、legacy一度導出、post-M34未完読reloadまで通し、合格前に画像だけを組み込まない。
10. commit/pushは対象pathを明示する。`main`へのpushは公開デプロイなので、必ずユーザーの明示承認を得る。

### 3. 重要な判断と理由

- 社内用toolを所有する`UmiNe2025`アカウント名は変更しない。
- 外部公開物だけを`hitsugi-game` Organizationへ分離する。個人アカウントを増やさず、権限と所有namespaceを分けられるため。
- repository名は`hitsugi`を維持する。新しい正規URLは`https://hitsugi-game.github.io/hitsugi/`。
- 独自ドメインは現時点では取得しない。Organization URLで公開準備を進め、必要になった時だけ追加する。
- 一般利用者がいないことを根拠に、旧origin救出repositoryの事前公開は行わない。ただし今後公開案内後にoriginを変える場合は、マスタープラン§9の全保存梯子移行gateを復活させる。
- UI刷新とURL修正は別commitにする。障害時の原因とrollback範囲を限定するため。

### 4. 地雷と衝突可能性

- 旧Pages URLは現在404であり、案内先として使えない。
- `index.html`のOGP系URL、README、DEPLOY、MARKETINGの現役導線は新URLへ修正済み。監査・履歴文書内の旧URLは歴史証拠として残す。
- `vite.config.ts`は`base:'./'`なのでpath移管耐性はあるが、hardcoded absolute URLは別問題である。
- 他のcloneやClaude Code環境の`origin`は自動では更新されない。各cloneで`git remote set-url origin https://github.com/hitsugi-game/hitsugi.git`を行う。
- GitHub repositoryの旧URLredirectに依存せず、新remoteを使う。
- 作業前から未追跡`tmp/`がある。削除・stageしない。
- 本監査由来の`docs/CODEX_MASTERPLAN_DRAFT.md`と`docs/qa/`も未追跡である。`git add -A`を使わず、ユーザー変更と対象pathを分離する。
- `docs/CODEX_MISSION_STATE.md`は完了済みM34 stateであり、独立監査PASSと直接検証を記録している。
- `docs/CODEX_FORGE_STATE.md`はM34計画packの完了済みForge証跡で、terminalは合格。再開せず、N0実装時の受入台帳として参照する。

### 5. 再開直後の検証コマンド

```powershell
git branch --show-current
git rev-parse HEAD
git remote -v
git fetch --dry-run origin
git status --short
rg -n -i "umine2025|github\.io" README.md index.html docs src .github
npm run lint
npm test -- --run
npm run build
npx playwright test --list
```

基準値:

- branch: `main`
- HEAD / new origin HEAD: `478be96241124aa5c530acac2b768c8e1d9a7824`
- 直近確認済み品質: lint、データ検証、Vitest全件、build、M34全5幅E2E、独立監査が成功。正確な最終件数とActions runは`docs/WORKLOG.md`へ記録する。
