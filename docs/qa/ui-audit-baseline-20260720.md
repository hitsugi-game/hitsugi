# UI監査ベースライン — 2026-07-20

この記録は、UI改善前の再現条件と採用した証拠を、Playwrightのgitignore対象領域から切り離して引き継ぐためのもの。

## 基準

- 対象commit: `478be96241124aa5c530acac2b768c8e1d9a7824`
- 監査時URL（歴史証拠）: `https://umine2025.github.io/hitsugi/`
- 現在の正典URL: `https://hitsugi-game.github.io/hitsugi/`
- 現在のrepository: `https://github.com/hitsugi-game/hitsugi`
- URL状態: 2026-07-20のOrganization移管後、新Pages HTTP 200、旧Pages HTTP 404を確認。以後のafter証拠は正典URLを使う。
- 観測日: 2026-07-20（Asia/Tokyo）
- 観測環境: Chromium、PCおよびモバイル相当viewport
- 判定者: Codexによる実ブラウザ計測と目視。自動pixel比較の合格を意味しない。

## P0証拠

| ID | 画面 / 条件 | before証拠 | 観測 | 修正後gate |
|---|---|---|---|---|
| UI-P0-01 | Home、390px相当 | 実ブラウザDOM計測 | `clientWidth=375px`、`body.scrollWidth=1049px`。`.family-main`、`.family-smalls`、`.blood-diag`、当主`.char-card`が約1020pxへ拡張 | 5幅で`scrollWidth <= clientWidth` |
| UI-P0-02 | 戦闘、1対2、360px | [before画像](baselines/20260720-battle-1v2-mobile-360-before.png) | 行動順・敵の兆し・敵名札が上端で競合し、敵情報を隠す | 1対2/4対4で3領域の矩形交差0 |
| UI-P0-03 | 郷、360px | [before画像](baselines/20260720-village-mobile-360-before.png) | D-padと近接人物の「話す」が下端で競合 | 移動帯/行動帯の矩形交差0、端から12px以上、方向button 48px以上 |

## 魅力・没入のbefore判定

以下はpixel差分だけでは測れないため、同一taskの5秒説明、人間採否、画面状態fixtureで比較する。生成画像はafter合格の証拠ではなく、改善目標を固定する参照である。

| ID | 画面 | beforeの欠損 | v2目標像 | 修正後gate |
|---|---|---|---|---|
| UI-ATTR-01 | Home | 情報札と入口が競合し、一族の危機と世界の焦点が分離 | [今月の決断台](../visuals/ui-v2/home-decision-stage.jpg) | 初見4/5人が5秒で危機人物・推奨・他も選べることを回答 |
| UI-ATTR-02 | 戦闘 | 暗い空面に札が浮き、敵意図→対象→コマンドの焦点が弱い | [蛍火の社・戦場](../visuals/ui-v2/battle-firefly-shrine.jpg) | 1対2/4対4で矩形交差0、初見4/5人が次行動・対象・継足理由を回答 |
| UI-ATTR-03 | Dungeon | 床/壁/未探索が似て見え、地域のランドマークと主の予告が弱い | [蛍火の窪地・地図](../visuals/ui-v2/dungeon-firefly-hollow-map.jpg) | 5層以上へ分解、50%縮小で主経路・境界・帰り火を判別、2地域差を説明 |
| UI-ATTR-04 | 郷 | 歩けても施設のsilhouetteと中心軸が弱く、メニュー背景に見える | [大灯籠の郷](../visuals/ui-v2/village-lantern-hub-map.jpg) | 施設3か所taskを4/5人が迷子30秒未満、操作競合0で完了 |
| UI-ATTR-05 | 鍛冶と蔵 | 大量品目が先に並び、人物・推薦理由・継承の物語が後景 | [継承工房](../visuals/ui-v2/forge-heirloom-workshop.jpg) | 4/5人が指定人物を誤購入なく強化、grayscaleでも希少度識別 |

### 参照画像の扱い

- 正本manifest: [UI v2 visual pack](../visuals/ui-v2/README.md)。生成条件、寸法、SHA-256、promptをここで追跡する。
- Homeは上段/右側hero候補、戦闘/鍛冶は背景候補。実装前にmobile crop、文字コントラスト、solid fallbackを確認する。Homeの中央灯へ主情報を直置きしない。
- Dungeon/郷は空間文法の概念画。一枚を床へ貼らず、navigation、境界、光、POI、前景へ分解する。
- 5枚の一括preloadは禁止。採用前production profileを保存し、LCP p75を悪化させない。

## 証拠ファイルの同一性

- `20260720-battle-1v2-mobile-360-before.png`
  - SHA-256: `640ACBA22A37FD5F5C17605F88962345F391DA78F6DEDEA0C4C897802A4B34F1`
- `20260720-village-mobile-360-before.png`
  - SHA-256: `FAB8204CFAF81FCC34B727B2D71BE8784591D4F1E07C17A67491F8D7B9D58168`

## Phase 0で追記するもの

- 同一fixture・同一viewportのafter画像。
- 対象実装commit、ブラウザversion、実行日時、矩形/overflow測定値。
- 人間の採否と、失敗時の欠陥ID。
- UI-ATTR-01〜05の同一task台本、回答、採否。印象語だけで「魅力が増した」と判定しない。
- 採用画像ID、配信先path、crop、文字コントラスト、lazy-load/LCP測定、背景OFF時のfallback結果。
- `docs/qa/`は対象pathを明示してstageする。`tests/visual/.shots/`を永続証拠として参照しない。
