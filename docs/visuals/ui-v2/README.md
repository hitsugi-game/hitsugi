# HITSUGI UI v2 Visual Direction Pack

- 生成日: 2026-07-20 JST
- 生成経路: Codex built-in `image_gen`
- 画風基準: `public/img/title_key.jpg`を主参照。既存の藍夜、和紙、墨線、金の灯を維持。
- 状態: 実装基準画像。Home/Battle/Forgeは背景候補、Dungeon/Villageは歩行geometryと同期させるためのvisual-directionであり、そのまま床画像へ差し替えない。
- 禁止: 画像内文字をUI情報として使う、画像だけで床/壁判定する、モバイルcropで主焦点を隠す、5枚を無条件に同時preloadする。

## 共通アートディレクション

「常夜の藍」95%、「継ぐ灯の金」4%、「危機の朱」1%を基本比率とする。金は見出し、当主、確定報酬、次に継ぐものだけへ使う。背景は装飾ではなく、画面ごとに一つの感情と一つの視線焦点を持つ。

- medium: 墨絵＋岩絵具＋和紙texture。写真、汎用anime、neon fantasyへ寄せない。
- focal hierarchy: 明点は原則1つ。UI主CTAと背景明点が競合する場合は、背景へ暗幕gradientを重ねる。
- overlay: `linear-gradient(rgba(4,8,18,.38), rgba(4,8,18,.72))`相当を画面別に調整し、画像へ文字を焼き込まない。
- motion: 花弁、蛍、火の粉、煙は別layer。静止画自体をzoomし続けない。演出軽減時は全停止。
- mobile: `object-position`をassetごとに固定し、主焦点とCTAの矩形交差0をvisual test化する。

## Asset manifest

| ID | File | 役割 | 実装上の焦点 | 採用gate |
|---|---|---|---|---|
| `VIS-HOME-01` | [home-decision-stage.jpg](home-decision-stage.jpg) | Home「今月の決断台」hero候補 | 祖霊灯と四つの空席を一つの物語焦点にする。文字を中央へ直置きしない | PCは上段/右側hero、390pxは160〜220px crop。主CTAは独立panel |
| `VIS-BATTLE-01` | [battle-firefly-shrine.jpg](battle-firefly-shrine.jpg) | 戦闘stage背景候補 | 左敵/右一族の光を分け、中央を空ける | 1v2/4v4で人物silhouetteと兆しが読める |
| `VIS-DUNGEON-01` | [dungeon-firefly-hollow-map.jpg](dungeon-firefly-hollow-map.jpg) | 蛍火の窪地visual-direction | 床/水/壁、分岐、中央landmark、帰り火の形を定義 | 実engine geometryへ分解し、BFS/contrast/POI test緑 |
| `VIS-VILLAGE-01` | [village-lantern-hub-map.jpg](village-lantern-hub-map.jpg) | 郷歩行visual-direction | 大灯籠を方位anchor、5施設を建築silhouetteで識別 | 衝突mapと一致し、施設5件をlabelなしでも4/5識別 |
| `VIS-FORGE-01` | [forge-heirloom-workshop.jpg](forge-heirloom-workshop.jpg) | 鍛冶と蔵背景候補 | 左=鍛える、右=継ぐ、中央=選択品 | 詳細paneの文字contrast、mobile 360で主焦点保持 |

## Dimensions and hashes

| File | Size | Bytes | SHA-256 |
|---|---:|---:|---|
| `home-decision-stage.jpg` | 1693×929 | 451,928 | `9B38841366730239E66EDE0A23D608FB08897102627765C07A8B425889918582` |
| `battle-firefly-shrine.jpg` | 1672×941 | 473,885 | `D92EE6FF460E6B3B2462C3608BCBBB9259C996E0C4487EE32D25055D1B06EFC8` |
| `dungeon-firefly-hollow-map.jpg` | 1672×941 | 507,456 | `D856C747BD69E5980EFFE98C833D7C2FD7AC2B49D702DD1B5400D7230BB73037` |
| `village-lantern-hub-map.jpg` | 1672×941 | 495,415 | `BA87C3E4255BBCA1E23ADF4D783E9C433E1C9F4073FDC45D9F4FCB884791D73D` |
| `forge-heirloom-workshop.jpg` | 1693×929 | 439,294 | `8DD82872B49F8B9470901F4C43B696CE7FCC9EB17A7B0AF3A21B834205B8D9F6` |

## 生成後の目視採否

| ID | 採否 | 実画像から分かった統合上の注意 |
|---|---|---|
| `VIS-HOME-01` | 条件付き採用 | 灯籠と空席の物語性は強いが、promptで求めた中央下の静域には焦点物が残った。全面背景ではなくheroとして使い、本文を直置きしない |
| `VIS-BATTLE-01` | 採用 | 中央の戦闘面、上端、下端に十分な余白がある。左右の温度差はUI側の味方/敵配置と同期させる |
| `VIS-DUNGEON-01` | 設計参照として採用 | 歩行面、深水、POIが明瞭。画像を直貼りせずengine geometryへ再構成する |
| `VIS-VILLAGE-01` | 設計参照として採用 | 大灯籠と施設silhouetteが強い。実mapでは下端/right controlsの安全域を別途確保する |
| `VIS-FORGE-01` | 採用 | 中央に比較面、左右に製作/継承の物語差がある。中央maskの濃度は文字contrast測定で決める |

## Final prompt set

### `VIS-HOME-01`

HITSUGIのタイトル絵と郷背景を参照し、巨大灯籠の郷にある一族の内庭を描く。祖霊の灯を唯一の焦点とし、人物を描かず四つの空席で家族を示す。藍夜、墨線、岩絵具、和紙、抑えた金箔。16:9。中央下45%をUI用に静かにし、上と両端へ建築detailを寄せる。文字、UI、logo、watermark、現代物、写真、汎用animeは禁止。

### `VIS-BATTLE-01`

HITSUGIのタイトル絵と蛍火の窪地boss背景を参照し、浅い黒水に沈む社の戦場を描く。左を冷たい敵域、右を祖霊灯の暖域に分け、中央55%を戦闘人物用に空ける。上を行動順、下をcommand用の静かな帯にする。人物、魔性、文字、UI、logo、watermarkは禁止。

### `VIS-DUNGEON-01`

現行Dungeon screenshotの歩行構造を、蛍火の窪地の実在感ある俯瞰mapへ再設計する。水没社、苔石道、竹、蛍葦、鳥居、石碑、帰り火、中央landmark、分岐とoptional pocketを持つ。床/水/壁を明確にし、checkerboardを排除。高いthree-quarter/top-down、horizonなし。人物、魔性、grid、文字、UIは禁止。

### `VIS-VILLAGE-01`

現行郷歩行mapを、巨大灯籠を中心に鍛冶、星祠、豆腐屋、出立門、家々と池が環状路で結ばれる俯瞰郷へ再設計する。施設は浮遊labelでなく建築silhouetteで識別できる。下部と右下にmobile control用余白。人物、文字、icon、UI、checkerboardは禁止。

### `VIS-FORGE-01`

現行鍛冶背景をタイトル絵と同じ精緻な和紙・墨・岩絵具へ引き上げる。左は火床と金床、右は形見の蔵、中央は選択品を置く空の作業台。装備を商品でなく継承物として感じさせる。中央45%と上部をUI用に静かにする。人物、浮遊item、文字、UI、logo、watermarkは禁止。

## Integration order

1. Phase 0のlayout欠陥を先に直す。画像追加でoverflowや交差を隠さない。
2. Home/Battle/ForgeをCSS background候補として1画面ずつ導入し、暗幕、crop、lazy loadを調整する。
3. Dungeon/Villageは画像をそのまま貼らず、材質、道幅、landmark、光源をengine layerへ分解する。
4. 各導入commitで既存画像とのA/B screenshot、LCP、mobile crop、reduced-motionを検証する。
