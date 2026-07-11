# 神アート充足監査 2026-07-11

## 1. 監査結果

`src/core/data/gods*.ts` の180柱と `public/img` の実ファイルを、portrait参照単位で突合した。

| 種別 | 配置済み | 未配置 | 充足率 | 判断 |
|---|---:|---:|---:|---|
| 通常立ち絵 | 120 | 60 | 66.7% | プレイヤーの「神の絵が足りない」は正しい |
| 縁MAX立ち絵 | 120 | 60 | 66.7% | 通常絵と同じ新規60柱が欠落 |
| 神カットイン | 24 | 156 | 13.3% | 現行生成仕様が24柱限定。全件漏れではない |
| manifest通常絵登録 | 96 | 84 | 53.3% | 実ファイル120枚とmanifestがドリフト |

補足:

- 通常立ち絵の参照重複は0。
- 配置済み通常絵は768×1024で統一されている。
- UIは `.png` を参照し、`gameImg()` が配信用 `.jpg` へ解決する既存方式。
- MAX絵は `godMaxImg()` が `god_xxx_max.png` を組み立てる。
- 神カットインは `gen_manifest.mjs` が `DUMP.gods.slice(0, 24)` のみ登録するため24枚で仕様通り。

## 2. 重要な判断

### 2.1 60柱を一括生成しない

先に通常絵の顔・衣装・象徴物を承認し、その画像を参照してMAX差分を作る。通常/MAXを別々のtext-to-imageで作ると同一神に見えなくなる。

### 2.2 最初の30柱をP0とする

- rank 1不足20柱: 序盤で出会いやすく、代替表示が第一印象を損なう。
- rank 4不足10柱: 解放難度に対する最大の視覚報酬が必要。

rank 2の15柱をP1、rank 3の15柱をP2とする。

### 2.3 カットインは選抜する

全180柱分を作ると希少性と制作コストの両方が悪化する。極ツ星10柱と物語鍵神だけを固有カットイン化し、それ以外は属性共通紋＋立ち絵演出にする。

## 3. 未配置一覧

### P0-A — rank 1 / 序盤20柱

| 属性 | id | 神名 |
|---|---|---|
| 火 | `hotarubi` | 蛍火童女 |
| 火 | `kayaribi` | 蚊遣り翁 |
| 火 | `hibukuro` | 火袋提灯翁 |
| 火 | `irorihata` | 囲炉裏端の媼 |
| 水 | `mizukuki` | 水茎姫 |
| 水 | `amagoi` | 雨乞い翁 |
| 水 | `shimizu` | 清水番の童 |
| 水 | `kawagoromo` | 皮衣河童 |
| 風 | `kazehana` | 風花姫 |
| 風 | `nobori` | 幟旗の精 |
| 風 | `kazamidori` | 風見鶏翁 |
| 土 | `inudouma` | 犬張子の精 |
| 土 | `domanji` | 土まんじ翁 |
| 土 | `ishidourou` | 石灯籠の主 |
| 月 | `yotsuboshi` | 夜露の四つ星 |
| 月 | `kagamimochi` | 鏡餅の精 |
| 月 | `yosuzume` | 夜雀語り |
| 星 | `hoshimeguri` | 星巡り小僧 |
| 星 | `kaboshi` | 欠け星の童 |
| 星 | `houkiboshi` | 箒星の小娘 |

### P0-B — rank 4 / 終盤10柱

| 属性 | id | 神名 |
|---|---|---|
| 火 | `kagaribi_oo` | 大篝火の主宰 |
| 星 | `shinkuu` | 深空の座主 |
| 土 | `daichinnushi` | 大地根の主 |
| 水 | `shiotsuchi` | 潮満つ大巫女 |
| 風 | `oozora_nushi` | 大空乃主 |
| 月 | `tsukiyomikami` | 月夜見の大神 |
| 月 | `kagayaki_hime` | 輝夜の姫神 |
| 土 | `houraisen` | 蓬莱仙翁 |
| 火 | `kokuten_ou` | 黒天王 |
| 星 | `towa_no_oya` | 永久の親神 |

### P1 — rank 2 / 中盤15柱

`hibashira`, `kajibi`, `sekirei`, `mizuchi`, `kazahaya`, `kamikaze`, `tsuchigumo`, `suna`, `tsukikage`, `yoihoshi`, `akatsuki`, `seimeisen`, `sansui`, `suzunari`, `yamiyo`

### P2 — rank 3 / 上位15柱

`kagutsuchi`, `homura`, `wadatsumi`, `mizuha`, `oyamatsumi`, `shakujou`, `shinabi`, `tatsumaki`, `tsukuyomi`, `yuzukihime`, `kaiousei`, `meireisei`, `kokuen`, `kokuryuu`, `seimeikan`

## 4. ファイル制作契約

通常絵:

- データ参照: `god_<id>.png`
- 配信用実体: `public/img/god_<id>.jpg`
- 生成元候補: `assets_src/god_candidates/god_<id>_v1.png`
- 基準サイズ: 768×1024、縦3:4。

MAX絵:

- データからの組立: `god_<id>_max.png`
- 配信用実体: `public/img/god_<id>_max.jpg`
- 通常絵を画像参照し、同一人物・同一象徴物を保つ。

カットイン:

- `cutin_god_<id>.png` → `public/img/cutin_god_<id>.jpg`
- 1280×512、横2.5:1。
- UI文字を画像内へ焼かない。

## 5. manifestドリフトの扱い

現行 `scripts/asset_factory/manifest.json` は2073件だが、180柱の通常絵のうち96柱しか登録していない。一方、実ファイルは120柱ある。

Claude実装時:

1. 現行データからmanifestを再生成する。
2. 再生成前後の差分を確認する。
3. 既存画像を削除・上書きしない。
4. `factory_state.json` のdoneだけで実在判定せず、`public/img` と突合する。
5. 60通常＋60MAXのスロットがmanifestへ入ったことを機械確認する。

## 6. 目視QA

各画像で確認する:

- 既存の和紙・岩絵具・墨金・濃紺背景と並べて違和感がない。
- 顔、手、装身具、武器、小物に破綻がない。
- 神名や意味不明な文字が画像内にない。
- 立ち絵の輪郭が暗背景へ埋もれない。
- 属性色だけで神を区別せず、象徴物と姿勢でも見分けられる。
- 同じ属性内で髪型・年齢・体格・性表現・シルエットが重複しない。
- rank 1は親しみ、rank 4は儀式性とスケールで格差が分かる。
- MAX絵は露出増加ではなく、距離感・表情・灯り・贈り物で親縁を表現する。
- 25%縮小表示でも顔と主要象徴が読める。

## 7. 受入コマンド例

画像投入後、Claude側で既存検証に加えて件数を再計測する。

```powershell
npm run build
npm run lint
node scripts/validate_data.mjs
git diff --check
```

PC 1280×720とモバイル390×844で、星契り一覧・詳細・契り演出・図鑑を確認する。
