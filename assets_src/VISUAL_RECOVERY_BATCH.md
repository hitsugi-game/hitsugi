# ビジュアル復旧バッチ 348枚

## 目的

追加データへ追随していない画像を、出立・探索・戦闘・星契りの体験価値が上がる順で復旧する。

## 全量

| Batch | 内容 | 枚数 | 生成方式 |
|---|---|---:|---|
| A | 新12地域背景 | 12 | text-to-image |
| B | 新12地域ボスの間 | 12 | Aを画風参照 |
| C | 新12ボス立ち絵 | 12 | text-to-image |
| D | 新12ボスカットイン | 12 | Cを同一性参照 |
| E | 欠落神通常立ち絵 | 60 | text-to-image、10枚ごと目視 |
| F | 欠落敵基礎 | 60 | text-to-image、属性ごと目視 |
| G | 欠落神MAX | 60 | Eをimg2img参照 |
| H | 欠落敵若/老 | 120 | Fをimg2img参照 |
|  | **合計** | **348** |  |

## 生成順

### A〜D: 新12地域セット

1. `hotarubi_no_kubochi` / `boss_hotarubime`
2. `nemurijizou_no_michi` / `boss_jizouoi`
3. `kuchinawa_no_hotoke` / `boss_kuchinawanushi`
4. `usugiri_no_watashiba` / `boss_watashimori`
5. `hisui_no_sawa` / `boss_hisuinushi`
6. `nakiotoko_no_hara` / `boss_nakiotoko`
7. `sabigatana_no_haka` / `boss_sabigatananomononofu`
8. `yumemaboroshi_no_yakata` / `boss_yumemaboroshi`
9. `maboroshi_no_sandou` / `boss_maborosendatsu`
10. `nakiryuu_no_mine` / `boss_nakiryuu`
11. `todome_no_kaidan` / `boss_todomenomono`
12. `gentou_no_zenya` / `boss_zenyanoutage`

必要ファイル:

- `bg_r_<region>.jpg` 1600×900。
- `bossbg_<region>.jpg` 1600×900。
- データの `sprite` と同名の `.jpg` 1024×1024。
- `cutin_<bossId>.jpg` 1280×512。

### E/G: 神

欠落IDは `docs/GOD_ART_AUDIT_2026-07-11.md` を正とする。

- Eでは通常絵だけを作る。
- 同一属性内で年齢、体格、性表現、姿勢、象徴物を重複させない。
- Gは承認済みEを参照し、別人化を防ぐ。
- MAX差分は露出増加ではなく、視線・灯り・贈り物・一族印で表現する。

### F/H: 敵

不足基礎60ID:

`tsuchiguruma_ko`, `yubiori_kazoe`, `kusakizawa`, `hikage_botaru`, `namisaki_gani`, `funshitsu_geta`, `kaya_no_me`, `tsukimi_usagi`, `funabashi_oni`, `hiwatari_zaru`, `ishigaki_kuzure`, `yoake_matazu`, `nawame_hebi`, `kazaguruma_douji`, `moetsuki_ningyou`, `mizuoto_baba`, `kyoumon_kuzure`, `hi_no_tori_zan`, `mizu_no_seirei_kuzure`, `kazakoshi_oni`, `dorodoro_nushi`, `hoshiotoshi_ami`, `yamikaze_ren`, `shitodome_no_koe`, `kagaribi_rounin`, `kessho_no_oni`, `iwane_kongou`, `mizu_no_taishou`, `oozora_karasu_ou`, `yamiyo_no_taikyoku`, `hoshikui_no_miko`, `mukuro_zenmai`, `kagenui_bushou`, `yamiba_karasu`, `tsuchikure_boushi`, `kazahana_oni`, `hono_neko`, `hotarubi_ko`, `uroko_ame`, `kaminari_ko`, `mizukaki_kappa`, `sabi_kanabou`, `kodama_kuzure`, `yukemuri_onna`, `tsuranui_gama`, `sazare_oni`, `mogura_daishou`, `tsurugi_ishi`, `kagebouki`, `hone_no_wa`, `yamiiro_kitsune`, `hakobune_yurei`, `tsuchidama`, `kagenagashi`, `tsukikage_ryuu`, `hi_no_youjin`, `tsurugi_no_hikari`, `shirube_hi`, `akaki_kabuto`, `hoshi_no_namida`。

各基礎に `_w`, `_o` の2差分が必要。

## ComfyUIキュー

正本生成:

```powershell
node scripts/asset_factory/gen_manifest.mjs
```

2026-07-11再生成結果: 初回未生成618件。先行7枚配置後は**611件**(重要復旧341+装備270)。生成順は場所と主を先に見せる順へ調整済み。

接続確認:

```powershell
Invoke-RestMethod http://192.168.1.10:8188/system_stats -TimeoutSec 10
```

公開せず生成:

```powershell
pwsh scripts/asset_factory/run_batch_comfy.ps1 -MaxImages 40 -NoCommit
```

注意:

- 2026-07-11時点でComfyUIは接続タイムアウト。稼働を確認してから実行する。
- `-NoCommit`を必ず付ける。pushは公開と同義。
- 現行workflowはtext-to-image。G/Hはimg2img対応後に回す。
- 既存ファイルを上書きしない。欠落ファイルだけを生成する。

## 目視ゲート

10枚ごとに確認:

- 文字・署名・枠がない。
- 暗部で輪郭が消えない。
- 地域画は場所が主役。
- ボスの間は中央下に戦闘用の余白がある。
- ボスは1024pxと128pxの両方でシルエットが読める。
- 通常/MAX、基礎/若/老は同一存在に見える。
- 既存の和紙、岩絵具、墨、金泥、濃紺と並べて違和感がない。

不合格はdone扱いにせず、候補へ隔離して再生成する。
