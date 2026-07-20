# デプロイ・運用ガイド

## デプロイ(GitHub Pages自動)

`main` へ push すれば GitHub Actions が自動でビルド・デプロイする。手動作業は不要。

- 公開URL: https://hitsugi-game.github.io/hitsugi/
- リポジトリ: https://github.com/hitsugi-game/hitsugi
- ワークフロー: `.github/workflows/deploy.yml`(既存)

## アクセス解析(GoatCounter)

**GoatCounter** を採用。理由:
- **無料**(月10万PVまで、個人開発ゲームなら十分)
- **Cookie不使用**(GDPR/日本の改正個人情報保護法にCookie同意不要で対応)
- **超軽量**(スクリプト~3KB、体感速度への影響ゼロ)
- **静的サイト向け**(GitHub Pages との相性が良い、サーバ不要)

### 有効化手順(所要3分)

1. **アカウント作成**: https://www.goatcounter.com/ で無料アカウントを作成
   - サブドメイン(サイトコード)を選ぶ。例: `umine2025` を選ぶと `https://umine2025.goatcounter.com` で管理画面
2. **設定ページで hitsugi の設定**:
   - Site title: 灯継ぎ -HITSUGI-
   - Site URL: `https://hitsugi-game.github.io/hitsugi/`
   - Public: OFF(推奨、他人にダッシュボードを見せないなら)
3. **サイトコードを反映**: `index.html` の GoatCounter script タグの `data-goatcounter` URL を:
   ```html
   data-goatcounter="https://your-code.goatcounter.com/count"
   ```
   の `your-code` を自分のサブドメイン(例: `umine2025`)に書き換える。
4. **commit & push**:
   ```bash
   git add index.html
   git commit -m "chore(analytics): GoatCounterのサイトコードを設定"
   git push
   ```
5. **確認**: 数分後 https://umine2025.goatcounter.com/ にアクセスして PV が計測されていることを確認。

### 何が計測される
- **ページビュー**(SPA なので実質1ページだが、内部画面遷移は個別にトラック可能=下記参照)
- **リファラー**(X からの流入、itch.io からの流入等)
- **ブラウザ/OS/画面サイズ**の統計
- **国別**(ざっくり、詳細な位置情報は取らない)

### 内部画面遷移をトラック(任意・将来の拡張)

SPA なので画面遷移は URL 変更を伴わない。ゲーム内画面(intro/home/dungeon/battle/pact等)を個別に計測したい場合は `store.setScreen` にフックして `window.goatcounter.count({path: '/game/home'})` 等を呼ぶ。

現時点では必須ではない(まず全体PVを把握する段階)。

### プライバシー配慮
- Cookie 非使用、fingerprint 非使用
- IP アドレスは即時に匿名化(GoatCounter 側で hash 化)
- Do Not Track を尊重(該当ユーザーは自動除外)
- サイト上での明示的な同意 UI は不要(EU の GDPR/日本の改正個情法に配慮した設計)

もし念のためプライバシーポリシーを掲載するなら `docs/PRIVACY.md` を作成して footer リンクを追加(現段階では未実装、必要なら別途)。

### 代替案(採用しなかった理由)

| サービス | 却下理由 |
|---|---|
| Google Analytics 4 | Cookie 使用、同意 UI 必須、複雑、プライバシー懸念 |
| Plausible | 月$9〜有料、または self-host が必要 |
| Umami | self-host が必要(サーバ運用コスト) |
| Fathom | 月$15〜有料 |
| Matomo | self-host か有料 cloud |

GoatCounter がゲーム個人開発の規模にちょうど良い。

## その他の運用メモ

- 画像工場(ComfyUI @ 192.168.1.10:8188): Windowsタスクスケジューラ `hitsugi_asset_factory` が毎時稼働。手動キック不要。
- 定期的な `docs/STATUS.md` 更新でプロジェクト全体像を維持。
