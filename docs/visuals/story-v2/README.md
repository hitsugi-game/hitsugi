# HITSUGI Story v2 Visual Pack

- 生成日: 2026-07-20 JST
- 生成経路: Codex built-in `image_gen`
- 用途: 夢渡り・弐〜終の固有背景候補。現時点では`docs/`内の実装基準素材であり、`public/img/`への配信組込みは未実施。
- 参照: `public/img/title_key.jpg`（画風）、`public/img/boss_shiori.jpg`（汐里）、`public/img/boss_gentou.jpg`（玄冬）
- 共通禁止: 画像内文字、UI、logo、watermark、印章、現代物、汎用的な悪役表現。

## アートの不変条件

1. 汐里は「聖女」ではなく、旅塵のついた楽士から千年疲れた家祖へ変化する。同じ顔立ち、濃藍の装束、紫の髪飾り、琵琶を人物同一性の軸にする。
2. 玄冬は「悪」ではなく、無名の星の子→唄を覚えた存在→飢えを言えない星喰い→面で抑えられた眠り手へ変化する。
3. 金は力の誇示でなく、唄、名、記憶、受け渡された寿命だけに使う。
4. 全画像の下端24〜30%は台詞UI用に暗く保つ。実装時は画像だけに重要情報を依存させない。
5. 1篇につき1枚だけを遅延読込する。7枚一括preloadは禁止し、現在篇の次の1枚までを上限とする。

## Asset manifest

| ID | 対応篇 | File | 物語上の一目情報 | 実装候補名 |
|---|---|---|---|---|
| `STORY-DREAM-02` | 旅の楽士 | [dream-02-traveler.jpg](dream-02-traveler.jpg) | 汐里は家祖以前に、星を聴いて立ち止まった無名の旅人だった | `cg_dream_02.jpg` |
| `STORY-DREAM-03` | 空の子 | [dream-03-star-child.jpg](dream-03-star-child.jpg) | 玄冬は名も面も持たず、唄を聴きに来た孤独な子だった | `cg_dream_03.jpg` |
| `STORY-DREAM-04` | ふたりの演目 | [dream-04-duet.jpg](dream-04-duet.jpg) | ふたりの喜びと、星々まで拍子を取る秘密の時間 | `cg_dream_04.jpg` |
| `STORY-DREAM-05` | 飢え | [dream-05-hunger.jpg](dream-05-hunger.jpg) | 愛した地上に留まるほど、玄冬の内側の星が消えていく | `cg_dream_05.jpg` |
| `STORY-DREAM-06` | 太陽の日 | [dream-06-sunfall.jpg](dream-06-sunfall.jpg) | 太陽を喰う行為は勝利でなく、泣きながら起こした破局 | `cg_dream_06.jpg` |
| `STORY-DREAM-07` | 薪の契り | [dream-07-fire-vow.jpg](dream-07-fire-vow.jpg) | 汐里は玄冬を殺さず抱き止め、寿命を郷の灯へ流した | `cg_dream_07.jpg` |
| `STORY-DREAM-08` | 千年の頂で | [dream-08-invitation.jpg](dream-08-invitation.jpg) | 琵琶を置き、歴代の灯を背に、子孫へ手を伸ばす現在の汐里 | `cg_dream_08.jpg` |

## Dimensions and hashes

| File | Size | Bytes | SHA-256 |
|---|---:|---:|---|
| `dream-02-traveler.jpg` | 1672×941 | 362,399 | `1363219AD7B066CDCB791DD348A9F7339C54F1B7FCFFF66077833BD8B6CA6D74` |
| `dream-03-star-child.jpg` | 1672×941 | 328,999 | `9E879EB77618229A8185EEF9C53A7A1892799021A400535733B43F5B899791A3` |
| `dream-04-duet.jpg` | 1672×941 | 423,867 | `A0BB54622EE66B96F10C63CADA476B8B0A7053F07E5848CC91481DEEC2CB0526` |
| `dream-05-hunger.jpg` | 1672×941 | 309,083 | `D3611FC8D20B8F16446B8411E4B83427B2E3B915258CE327EC2BABCB55BF8131` |
| `dream-06-sunfall.jpg` | 1672×941 | 451,284 | `BDCDCF2F914F69A9915CB16266C9A8524AC0845B304637643D692737E5D1BA23` |
| `dream-07-fire-vow.jpg` | 1672×941 | 446,632 | `DC5A2857E5641E38FCD8EBBA213C8FA67875AE9F7C2C7FFFFA97E5ACD1571FB1` |
| `dream-08-invitation.jpg` | 1672×941 | 413,426 | `FB62DD527E100B9043A8D8D19B8634FF7B98E7DE67C6864B0024C6E9CAAC017F` |

## 生成後の目視採否

| ID | 採否 | 注意 |
|---|---|---|
| `STORY-DREAM-02` | 採用 | 後ろ姿で「無名の旅人」を保ち、星と郷が主役。顔の説明は台詞と次篇へ委ねる |
| `STORY-DREAM-03` | 採用 | 玄冬の無垢さ、距離、命名前の空白が明瞭。日食は未来の伏線として扱う |
| `STORY-DREAM-04` | 条件付き採用 | 玄冬が子どもから星の主へ成長した比喩像。literalな急成長と誤解させない一文を篇冒頭へ置く |
| `STORY-DREAM-05` | 採用 | 小星を胸へ抱き、汐里が遅れて到着する因果が一枚で読める |
| `STORY-DREAM-06` | 採用 | 玄冬の涙と汐里の小ささで、悪意のない破局を維持できている |
| `STORY-DREAM-07` | 採用 | 抱擁、面、寿命の火、大燈籠が一続き。恋愛的抱擁でなく封印と介抱として台詞で固定する |
| `STORY-DREAM-08` | 採用 | 手、置かれた琵琶、歴代灯の登山路が最終招待を直接表す |

## Final prompt set（要約）

### `STORY-DREAM-02`

若い汐里が草鞋と濃藍の旅装、唯一の琵琶を背負い、千年前の燈ノ郷へ星の音を聴いて立ち止まる。青い薄暮、未点灯の大燈籠基壇、右三分の一に小さな人物。精緻な墨・岩絵具・和紙・古金。下端を台詞用に暗くする。

### `STORY-DREAM-03`

山頂で若い汐里が琵琶を弾き、名も面もない星空の子が離れて聴く最初の夜。ふたりの間の空白を信頼の始まりとして描く。冷たい空と小さな暖かさ。戦闘・恋愛・文字なし。

### `STORY-DREAM-04`

汐里の琵琶と、玄冬の体内で明滅する星が拍子を交わし、空全体が応じる秘密の二重奏。のちの悲劇を知るからこそ最も暖かい篇。音符記号を使わず星の弧で音を表す。

### `STORY-DREAM-05`

星が薄くなった玄冬が、小さな星を胸へ抱き震える。汐里は遠景で気づく。恐怖や悪役の勝利でなく、言えなかった飢えと遅すぎた理解を描く。

### `STORY-DREAM-06`

真昼が藍夜へ変わり、巨大化した玄冬が泣きながら太陽へ手を伸ばす。稜線の汐里は琵琶を下ろし、自分の唄が飢えを招いたと悟る。破壊 spectacle より罪と悲しみを優先する。

### `STORY-DREAM-07`

汐里が面をつけた玄冬を環の内側から抱き止め、胸の寿命が金の火となって山を下り、大燈籠へ点る。琵琶は隣へ置く。八季の呪いの起源を一枚で伝える。

### `STORY-DREAM-08`

千年後、疲れた汐里が初めて琵琶を石へ置き、見えない子孫へ手を伸ばす。背後には眠る玄冬、麓からは歴代の小灯が一本の登山路を作る。戦いでなく「待たれていた」という感情を終点にする。

## Claude Codeへの配信統合規則

1. このfolderを直接runtime参照しない。採用画像を`public/img/cg_dream_02.jpg`〜`08.jpg`へcopyし、対応表とhashを`docs/WORKLOG.md`へ記録する。
2. `DreamEpisode`へoptionalな`bg`または`visualId`を追加し、旧saveと既存`cg_kiro.jpg` fallbackを維持する。
3. 画像は現在篇だけを描画し、次篇1枚をidle時に任意prefetchする。Title/Home初期bundleへ含めない。
4. 360/390/768pxでは横長画像を背景`cover`にせず、本文上へ幅100%・`aspect-ratio:16/9`・`object-fit:contain`・`object-position:50% 50%`の前面`figure`として置く。台詞とcontrolsは画像へ重ねない。
5. `alt`相当の短い情景要約を篇データへ持ち、画像OFF、読み上げ、低通信でも物語理解を失わない。
6. 既存`cg_kiro.jpg`は初回夢と夢一覧のcoverとして残し、7篇の固有絵へ使い回さない。

### 表示tokenと採否

| 幅 | 正本画像 | 装飾背景 | 採否 |
|---|---|---|---|
| 360/390px | `width:100%; aspect-ratio:16/9; object-fit:contain; object-position:50% 50%` | 任意。同画像のblurred coverを`aria-hidden`で使用可 | 各行の物語要点に挙げた全対象が同時に見え、画像とcontrolsが交差しない |
| 768px portrait | 同上。本文上の16:9 figure | 任意 | 全景を欠かさず表示し、余白を無理にcropで埋めない |
| 1280px以上 | `cover`可。焦点が落ちる時は`contain` | 任意 | §物語対応表の人物/物体をすべて保持 |

`全景を見る`は拡大鑑賞用の任意機能であり、初見時の欠けを補う必須操作にはしない。mobileで意味を保持するのは前面のcontain画像で、blurred coverは装飾に限る。
