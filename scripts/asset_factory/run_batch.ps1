# 素材工場 — manifest.json 駆動の codex 画像量産ランナー
# 使い方:   pwsh scripts/asset_factory/run_batch.ps1 [-MaxSessions 8]
# 仕組み:   15枚/セッションで codex exec(stdinを閉じる)→ DONE順とセッション
#           フォルダの生成順を照合してコピー → 圧縮 → factory_state.json に記録。
#           何度でも再実行可能(完了分はスキップ)。夜間はタスクスケジューラ等でループ起動。
param(
  [int]$MaxSessions = 8,
  [int]$PerSession = 15
)

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$manifestPath = Join-Path $PSScriptRoot 'manifest.json'
$statePath = Join-Path $root 'assets_src\factory_state.json'

# 多重起動ロック(生成フォルダ照合とstateが壊れるため同時実行は不可)
$lockPath = Join-Path $PSScriptRoot '.factory.lock'
if (Test-Path $lockPath) {
  $oldPid = Get-Content $lockPath -ErrorAction SilentlyContinue
  if ($oldPid -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
    Write-Output "FACTORY: already running (pid $oldPid) — exit"; exit 0
  }
}
Set-Content $lockPath $PID
try {
$outDir = Join-Path $root 'public\img'
$origDir = Join-Path $root 'assets_src\orig'
New-Item -ItemType Directory -Force $origDir | Out-Null

$STYLE = 'Unified style for ALL images: japanese kirie(papercut) + watercolor, ink outlines, dark indigo night background (#0b0f1e), amber lantern light accents, NO text, NO watermark.'

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$state = if (Test-Path $statePath) { Get-Content $statePath -Raw | ConvertFrom-Json } else { [pscustomobject]@{ done = @() } }
$doneSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$state.done)

Add-Type -AssemblyName System.Drawing
function Compress-One([string]$png, [string]$name) {
  $maxW = if ($name -like 'bg_*' -or $name -like 'bossbg_*' -or $name -like 'cg_*' -or $name -like 'cg2_*' -or
              $name -like 'fes_*' -or $name -like 'sc_*' -or $name -like 'title_*') { 1600 }
          elseif ($name -like 'cutin_*') { 1280 }
          elseif ($name -like 'boss_*' -or $name -like 'tile_*' -or $name -like 'ev_*' -or $name -like 'life_*') { 1024 }
          elseif ($name -like 'icon_*' -or $name -like 'ic_*' -or $name -like 'node_*' -or $name -like 'slot_*' -or
                  $name -like 'boon_*' -or $name -like 'job_*' -or $name -like 'emb_*' -or $name -like 'nem_*' -or
                  $name -like 'it_*' -or $name -like 'sk_*') { 256 }
          elseif ($name -like 'face_*' -or $name -like 'vil_*') { 384 }
          else { 768 }
  $img = [System.Drawing.Image]::FromFile($png)
  try {
    $w = [Math]::Min($maxW, $img.Width); $h = [int]($img.Height * $w / $img.Width)
    $bmp = [System.Drawing.Bitmap]::new($w, $h)
    $gr = [System.Drawing.Graphics]::FromImage($bmp)
    $gr.InterpolationMode = 'HighQualityBicubic'
    $gr.DrawImage($img, [System.Drawing.Rectangle]::new(0, 0, $w, $h))
    $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
    $p = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $p.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, 82L)
    $bmp.Save(($png -replace '\.png$', '.jpg'), $enc, $p)
    $gr.Dispose(); $bmp.Dispose()
  } finally { $img.Dispose() }
  Move-Item $png (Join-Path $origDir $name) -Force
}

for ($s = 0; $s -lt $MaxSessions; $s++) {
  $todo = @($manifest | Where-Object { -not $doneSet.Contains($_.id) } | Select-Object -First $PerSession)
  if ($todo.Count -eq 0) { Write-Output 'FACTORY: all done'; break }

  $lines = $todo | ForEach-Object { "$($_.file) ($($_.w)x$($_.h)): $($_.prompt)" }
  $prompt = @(
    "Generate the following $($todo.Count) images ONE BY ONE with your image generation tool.",
    "Save each to public/img/ with the EXACT filename given (create the dir if needed).",
    $STYLE,
    'After each image print exactly: DONE: <filename>',
    "At the end print exactly: ALL COMPLETE",
    ''
  ) + $lines -join "`n"

  $log = Join-Path $env:TEMP "factory_s$s.log"
  $promptFile = Join-Path $env:TEMP "factory_prompt_$s.txt"
  Set-Content -Path $promptFile -Value $prompt -Encoding utf8
  Write-Output "FACTORY: session $s starting ($($todo.Count) images)"
  # プロンプトはstdin リダイレクトで渡す(EOFでstdinが閉じ、codexの永久待機を防ぐ)。
  # WebSocket切断後にcodexがハングする事例があるため、45分で子プロセスごと強制終了して次へ進む
  $errLog = "$log.err"
  # 【重要】--profile eco は使わない: low effortだとcodexが本物の画像生成ツールを呼ばず、
  #   簡易フォールバック(28KBの棒人間レベル)を出す。同プロンプトでもeco無しなら2.9MBの精細画像。
  #   トークン節約より画質が目的なのでデフォルトプロファイルで回す(2026-07-03検証)。
  # 注意: codexの実体はnpmの codex.ps1 シム — Start-Processは.ps1を直接起動できないためpwsh -File経由で呼ぶ
  $codexShim = Join-Path $env:APPDATA 'npm\codex.ps1'
  $proc = Start-Process -FilePath 'pwsh' `
    -ArgumentList '-NoProfile', '-File', $codexShim, 'exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', "$root", '-' `
    -RedirectStandardInput $promptFile -RedirectStandardOutput $log -RedirectStandardError $errLog `
    -NoNewWindow -PassThru
  # codexは生成完了後(ALL COMPLETE後)もWebSocketを掴んでハングしがち。
  # errLogに ALL COMPLETE が出たら猶予後に強制終了し、45分の空待ちを避ける。
  $deadline = (Get-Date).AddMinutes(45)
  while (-not $proc.HasExited) {
    Start-Sleep -Seconds 10
    if ((Test-Path $errLog) -and (Select-String -Path $errLog -Pattern 'ALL COMPLETE' -Quiet -ErrorAction SilentlyContinue)) {
      Write-Output "FACTORY: session $s ALL COMPLETE — grace 8s then close"
      Start-Sleep -Seconds 8
      if (-not $proc.HasExited) { taskkill /T /F /PID $proc.Id 2>$null | Out-Null }
      break
    }
    if ((Get-Date) -gt $deadline) {
      Write-Output "FACTORY: session $s TIMEOUT (45min) — killing codex tree"
      taskkill /T /F /PID $proc.Id 2>$null | Out-Null
      Start-Sleep 3
      break
    }
  }

  # DONE行と生成フォルダの照合コピー(codexが直接保存していない場合の保険)。
  # 【重要】codexはDONE:/ALL COMPLETEをstderrに出す — errLogを主に、logも併せてgrep(重複除去)。
  $doneNames = @()
  foreach ($lf in @($errLog, $log)) {
    if (Test-Path $lf) {
      Select-String -Path $lf -Pattern 'DONE: ([a-z0-9_]+\.png)' -AllMatches |
        ForEach-Object { $_.Matches } | ForEach-Object { $n = $_.Groups[1].Value; if ($doneNames -notcontains $n) { $doneNames += $n } }
    }
  }
  $genRoot = Join-Path $env:USERPROFILE '.codex\generated_images'
  $sessDir = Get-ChildItem $genRoot -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $genFiles = @(Get-ChildItem $sessDir.FullName -Filter *.png | Sort-Object LastWriteTime)
  for ($i = 0; $i -lt $doneNames.Count; $i++) {
    $target = Join-Path $outDir $doneNames[$i]
    if (-not (Test-Path $target) -and $i -lt $genFiles.Count) {
      Copy-Item $genFiles[$i].FullName $target
    }
    if (Test-Path $target) {
      # 1枚の不良(切断時の破損png等)で工場全体を殺さない — 失敗はスキップして後のセッションで再試行
      try {
        Compress-One $target $doneNames[$i] -ErrorAction Stop
        $id = ($manifest | Where-Object { $_.file -eq $doneNames[$i] } | Select-Object -First 1).id
        if ($id) { [void]$doneSet.Add($id) }
        Write-Output "FACTORY: ok $($doneNames[$i])"
      } catch {
        Write-Output "FACTORY: skip $($doneNames[$i]) (compress failed: $($_.Exception.Message))"
        Remove-Item $target -Force -ErrorAction SilentlyContinue
      }
    }
  }
  # 進捗保存
  [pscustomobject]@{ done = @($doneSet) } | ConvertTo-Json | Set-Content $statePath
  # クォータ切れは粘っても無駄 — 早期終了して毎時スケジューラの再開に任せる
  if (Select-String -Path $log, $errLog -Pattern 'usage limit' -Quiet -ErrorAction SilentlyContinue) {
    Write-Output 'FACTORY: usage limit reached — stopping (hourly task will resume)'
    break
  }
}
Write-Output "FACTORY: state -> $statePath ($($doneSet.Count) done)"
# 歩行シートが届いていればフレームへ自動分割(冪等)
& (Join-Path $root 'scripts\slice-walk-sheets.ps1') | Select-Object -Last 1
} finally { Remove-Item $lockPath -Force -ErrorAction SilentlyContinue }
