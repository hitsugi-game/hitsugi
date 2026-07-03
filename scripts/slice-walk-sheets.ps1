# 灯型×性別(×年齢段階)の歩行シート(3x4)を透過フレームへスライスする
# 入力: assets_src/orig/sprite_walk_{gata}_{sex}.png / sprite_walk_{gata}_{sex}_{child|elder}.png
# 出力: public/img/sprites/{walk|walkc|walke}_{gata}_{sex}_{down|up|left}_{0..2}.png
#       (右向きはエンジン側で左を反転。walkc=幼子/walke=老年 — img.ts stagePrefixと同期)
Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$srcDir = Join-Path $root 'assets_src\orig'
$outDir = Join-Path $root 'public\img\sprites'
New-Item -ItemType Directory -Force $outDir | Out-Null

$dirs = @('down', 'up', 'left') # row3(右向き行)は左向きに生成されがちなので使わない

Get-ChildItem $srcDir -Filter 'sprite_walk_*.png' | ForEach-Object {
  if ($_.Name -notmatch 'sprite_walk_([a-z]+)_([mf])(?:_(child|elder))?\.png') { return }
  $gata = $Matches[1]; $sex = $Matches[2]
  $prefix = if ($Matches[3] -eq 'child') { 'walkc' } elseif ($Matches[3] -eq 'elder') { 'walke' } else { 'walk' }
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  $cw = [Math]::Floor($img.Width / 3); $ch = [Math]::Floor($img.Height / 4)
  foreach ($r in 0..2) {
    foreach ($c in 0..2) {
      $cell = [System.Drawing.Bitmap]::new(128, 170)
      $gr = [System.Drawing.Graphics]::FromImage($cell)
      $gr.InterpolationMode = 'HighQualityBicubic'
      $gr.DrawImage($img, [System.Drawing.Rectangle]::new(0, 0, 128, 170),
        [System.Drawing.Rectangle]::new([int]($c * $cw), [int]($r * $ch), [int]$cw, [int]$ch),
        [System.Drawing.GraphicsUnit]::Pixel)
      $gr.Dispose()
      # 藍色背景の透過キーイング(青みが強い画素を抜く)
      $keyed = [System.Drawing.Bitmap]::new(128, 170, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      for ($y = 0; $y -lt 170; $y++) {
        for ($x = 0; $x -lt 128; $x++) {
          $p = $cell.GetPixel($x, $y)
          if (($p.B -gt ($p.R + 16)) -and ($p.B -gt ($p.G + 8))) {
            $keyed.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
          } else {
            $keyed.SetPixel($x, $y, $p)
          }
        }
      }
      $cell.Dispose()
      $name = "${prefix}_${gata}_${sex}_$($dirs[$r])_$c.png"
      $keyed.Save((Join-Path $outDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
      $keyed.Dispose()
    }
  }
  $img.Dispose()
  Write-Output "sliced: $gata/$sex"
}
Write-Output 'done'
