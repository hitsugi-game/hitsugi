# 『灯継ぎ -HITSUGI-』マーケティング設計書

**公開URL**: https://umine2025.github.io/hitsugi/
**リポジトリ**: https://github.com/UmiNe2025/hitsugi
**初回リリース**: 2026-07-02

---

## 1. ポジショニング

**一言**: 「俺屍の切なさを、ブラウザで5分から。」

- **カテゴリ**: 世代交代RPG(ジェネレーションRPG)× ローグライト。国産では希少ジャンル。
- **差別化**:
  1. インストール不要・無料・スマホ対応(俺屍系の体験の圧倒的な敷居の低さ)
  2. 辞世の句と家譜の自動生成 = **スクショ1枚で語れる物語**(UGC装置内蔵)
  3. 1セッション5〜15分で必ず区切りが来る設計(現代の可処分時間に適合)
- **ターゲット**:
  - 一次: 俺屍・Fire Emblem・ダーケストダンジョン等「喪失系」ゲーム経験者(30〜40代中心)
  - 二次: Slay the Spire系ローグライト層(20〜30代)
  - 三次: フリーゲーム/ブラウザゲーム愛好層

## 2. キーメッセージ

- メイン: **八季の命を、継いでゆけ。**
- サブ:
  - 「あなたの一族は、必ず二年で死ぬ。それでも物語は千年続く」
  - 「最期の言葉は、一人ひとり違う。あなたの家譜にしか残らない」
  - 「ボスに勝てない? ——なら、勝てる子を産めばいい」

## 3. チャネル別施策

### X(旧Twitter) — 主戦場
- リリーススレッド(下記文面)を投稿。ハッシュタグ: #灯継ぎ #インディーゲーム #フリーゲーム
- 家譜共有カード(ゲーム内機能)による自然拡散を設計済み — プレイヤーの辞世スクショが広告になる
- 週1回、開発小話(星神の設定画、辞世の名作選)を投稿

### itch.io — 海外・インディー層
- HTML5ゲームとして登録(無料、投げ銭有効)。英語ストアページ文面は下記
- タグ: roguelite, jrpg, generation, story-rich, japanese

### フリーゲーム系ポータル(日本)
- ふりーむ!、フリーゲーム夢現、PLiCy に登録申請(ブラウザゲーム区分)

### Reddit
- r/incremental_games, r/WebGames, r/JRPG に「I made a browser RPG where your characters always die in 2 years」投稿

## 4. リリース告知文面

### X スレッド(日本語)
> 【無料ブラウザゲーム公開】
> 『灯継ぎ -HITSUGI-』
>
> あなたの一族は、呪いで必ず「2年」で死にます。
> 星の神と契って子を授かり、血を濃くして、
> 誰も届かなかった常夜の山の頂を目指す世代交代RPG。
>
> インストール不要・スマホOK・セーブあり
> ▶ https://umine2025.github.io/hitsugi/
>
> (2/4) このゲームには「辞世の句」があります。
> 性根と生き様で変わる、その人だけの最期の言葉。
> 臆病な子の辞世「怖かった。最後まで怖かった。でも、逃げなかったよ」
>
> (3/4) 全滅しても終わりじゃない。
> 一番運の強い子が、一人だけ帰ってくる。
> 形見を継ぎ、血を継ぎ、次の世代で雪辱する。
> 「俺の屍を越えてゆけ」——あの感情を、ブラウザで。
>
> (4/4) 家譜(一族の記録)は画像で書き出せます。
> あなたの家の千年紀、ぜひ #灯継ぎ で見せてください。
> 全部無料です。夜のお供にどうぞ。

### itch.io(英語)
> **HITSUGI — Pass the Flame**
>
> Your bloodline is cursed: every family member dies in exactly 2 years (8 seasons). Bear children with star gods, inherit stats, skills and keepsakes across generations, and push through a roguelite night-realm to end the eternal darkness.
>
> - Every character's remaining lifespan is always visible — as tiny flames
> - Transparent inheritance: preview your child's stat ranges before the pact
> - Push-your-luck expeditions: go deeper for treasure, or burn out your lantern
> - Auto-generated family chronicle & death poems, exportable as an image
> - 5-15 min sessions, autosave, works on mobile, 100% free
>
> Inspired by the Japanese cult classic *Oreshika*, redesigned with modern UX. All story, characters and systems are original.

## 5. KPI(初月)

| 指標 | 目標 |
|---|---|
| ユニークプレイヤー | 1,000 |
| クリア率 | 8%(2〜4時間ゲームとして健全) |
| #灯継ぎ 投稿数 | 50 |
| itch.io収集(コレクション追加) | 100 |

計測: GitHub Pages はアクセス解析がないため、リリース後に privacy-friendly な計測(GoatCounter等・要ユーザー判断)を検討。

## 6. 継続改善ロードマップ

- v0.2: 星神の親密度イベント(契り回数で専用会話)、実績システム
- v0.3: 継承新周回(クリア特典: 家宝持ち越し)、高難度「常夜」モード
- v0.4: 画像アセット(星神立ち絵・敵絵)組込 ※codex画像生成の安定稼働後
- v1.0: itch.io/ポータル同時展開、BGM追加、実況者向けプレスキット

## 7. 要ユーザー対応(認証必要のため保留)

- [ ] itch.io アカウントでのページ作成(要ログイン)
- [ ] フリーゲームポータルへの登録申請(要アカウント)
- [ ] X での告知投稿(要アカウント)※文面は上記コピペ可
- [ ] アクセス解析の導入判断
