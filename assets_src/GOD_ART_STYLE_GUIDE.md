# 星神アート制作規格 v2

## 目的

新規60柱と縁MAX差分を、既存120柱と同じ世界の存在として制作する。単体の美しさより、一覧・契り・図鑑での統一感を優先する。

## 既存の基準画像

- `public/img/god_amatsuhi.jpg` — rank 4の儀式性、全身構図、星と灯籠。
- `public/img/god_kagaribi.jpg` — 火属性、人物を囲む炎、濃紺との対比。
- `public/img/god_hokushin.jpg` — 老神、低彩度、星図の幾何学。

上記を複製するのではなく、次を共通文法として使う。

## 共通文法

- 縦3:4、768×1024以上。
- 日本の和紙に岩絵具・水彩・墨を重ねたような質感。
- 背景は深い藍・墨紺。完全な黒一色にしない。
- 金泥の細線、朱または属性色を限定的な焦点として使う。
- 全身〜膝上。顔は一覧の25%縮小でも読める大きさ。
- 神の象徴物を一つ大きく、一つ小さく配置する。
- 輪郭は背景と明度差を作る。
- 画面内の文字、ロゴ、UI、透かしは禁止。
- 西洋ファンタジー鎧、現代服、写真調3D、過度なアニメ塗りは避ける。

## 位階差

| rank | 見せ方 |
|---|---|
| 1 | 郷の道具、動物、子ども、老人など身近な尺度。表情が読みやすい |
| 2 | 職能・役目が一目で分かる。半儀式的な装い |
| 3 | 神話的な威厳。大きな象徴、複層衣装、強いシルエット |
| 4 | 空間そのものを支配。円環、祭壇、天体、巨大自然物。静かな畏怖 |

## 属性文法

- 火: 朱、煤、金、火の粉。焦げ跡や炉具で個性化。
- 水: 青緑、銀、波紋、雫。海・川・雨・井戸を描き分ける。
- 風: 白藍、薄金、布・羽・雲の流線。透明感より方向性を優先。
- 土: 黄土、苔緑、石、根、陶。重心を低く安定させる。
- 月: 青銀、薄紫、鏡、影、弧。火属性より低温の光。
- 星: 群青、金、星図、糸、環。星粒だけで済ませず幾何学を持たせる。

## 通常絵と縁MAX絵

通常絵:

- 神の役目と距離感を優先。
- 正面〜斜め、落ち着いた表情。
- 一族をまだ観察している空気。

MAX絵:

- 承認済み通常絵を画像参照する。
- 顔、年齢、髪、衣装の骨格、象徴物を維持する。
- 表情をわずかに柔らかくし、視線を近づける。
- 金泥・灯り・贈り物・一族の家紋で親縁を表現する。
- 別人化、若返り、露出増加だけの差分は禁止。

## 共通ネガティブ指定

> no text, no letters, no logo, no watermark, no UI, no frame, no photorealistic 3D, no western plate armor, no modern clothing, no neon cyberpunk, no extra limbs, no malformed hands, no duplicate face, no cropped head, no flat black background

## 月夜見の大神 制作プロンプト

用途: 欠落しているrank 4通常立ち絵の制作候補。

> Create a production-ready vertical 3:4 standing portrait for a Japanese generational dark-fantasy RPG. Subject: 月夜見の大神, an ageless and androgynous primordial deity who rules the concept of night itself and has watched the village since before eternal night began. Full figure, calm unreadable face, long moon-silver hair fading into deep indigo, layered ancient court robes in midnight blue and muted silver, restrained gold-leaf seams. Behind the deity is one immense incomplete moon-disc like a shrine halo, crossed by delicate star-map rings; below, a black mirror of water reflects a second moon that does not exist in the sky. One hand holds a small extinguished family lantern with a single silver ember, the other opens toward the viewer. Quiet awe, not aggression. Japanese washi paper, mineral pigment, sumi ink and gold-leaf illustration, dense tactile brush texture, elegant asymmetry, deep navy negative space, readable face and silhouette at thumbnail size, visual continuity with existing HITSUGI god portraits. No text or symbols resembling letters.

推奨ファイル:

- 候補: `assets_src/god_candidates/god_tsukiyomikami_v1.png`
- 承認後の配信: `public/img/god_tsukiyomikami.jpg`

## 月夜見の大神 MAX差分プロンプト

通常絵承認後、その画像を参照して使う。

> Preserve the exact same deity, face, age, hair, robe construction, moon-disc and black-water mirror. Create the maximum-bond variant: the deity's gaze is now gently directed toward the family lantern; the lantern holds a warm amber flame mixed with the original silver ember; a subtle HITSUGI family-thread motif winds once around the wrist; the distant second moon reflection is now complete. Keep the mood intimate and solemn, not romanticized, not sexualized. Slightly warmer gold illumination while retaining the deep-indigo night palette. No text, no UI, no redesign of the character.

## バッチ制作順

1. P0-A rank 1を属性ごとに4〜5柱ずつ。身近さとシルエット差を確認。
2. P0-B rank 4を2柱ずつ。円環構図の重複を避ける。
3. 承認済み通常絵を参照しMAX差分。
4. P1 rank 2、P2 rank 3。
5. 極ツ星の通常/MAXが揃った後に選抜カットイン。

各バッチは最大10枚。次バッチへ進む前に、一覧縮小・契り大表示・図鑑カードの三箇所で目視する。
