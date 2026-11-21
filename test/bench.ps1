# CPU time of `node main.ts` (all threads) on the kit's practice set, median of N runs.
# Usage: powershell -File test\bench.ps1 -Bot <dir holding main.ts> -InputDir <practice\input> [-Runs 9]
param([string]$Bot, [string]$InputDir, [int]$Runs = 9)
$out = Join-Path $env:TEMP "csvbench-out"
New-Item -ItemType Directory -Force $out | Out-Null
$env:MAKEFUN_INPUT_DIR = (Resolve-Path $InputDir).Path
$env:MAKEFUN_OUTPUT_DIR = $out
$main = Join-Path (Resolve-Path $Bot).Path "main.ts"
$times = @()
for ($i = 0; $i -lt $Runs; $i++) {
  $p = Start-Process -FilePath node -ArgumentList "`"$main`"" -NoNewWindow -PassThru
  $h = $p.Handle
  $p.WaitForExit()
  $times += $p.TotalProcessorTime.TotalMilliseconds
}
$sorted = $times | Sort-Object
"{0}: median {1:N0} ms CPU (min {2:N0}, max {3:N0})" -f $Bot, $sorted[[int]($Runs / 2)], $sorted[0], $sorted[-1]
