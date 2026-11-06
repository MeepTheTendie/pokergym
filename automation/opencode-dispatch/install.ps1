# One-time install of the Poker Gym OpenCode dispatcher on this Windows 11 PC.
# In PowerShell:  irm https://raw.githubusercontent.com/MeepTheTendie/pokergym/main/automation/opencode-dispatch/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$raw  = 'https://raw.githubusercontent.com/MeepTheTendie/pokergym/main/automation/opencode-dispatch'
$home_ = Join-Path $env:LOCALAPPDATA 'pokergym-opencode-dispatch'
$bin  = Join-Path $home_ 'bin'
New-Item -ItemType Directory -Force -Path $bin | Out-Null

function Find-OpenCode {
  # PATH first (npm/scoop/official installer), then the OpenCode Desktop app's bundled CLI.
  # A candidate counts only if `--version` prints a version and exits within 15 s,
  # so the desktop GUI executable is never picked.
  $cands = @()
  $cmd = Get-Command opencode -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cmd) { $cands += $cmd.Source }
  foreach ($root in @("$env:LOCALAPPDATA\Programs\ai.opencode.desktop", "$env:LOCALAPPDATA\Programs\OpenCode",
                      "$env:USERPROFILE\.opencode\bin", "$env:APPDATA\npm")) {
    if (Test-Path $root) {
      $cands += Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^opencode(-cli)?(-x86_64-pc-windows-msvc)?\.(exe|cmd)$' } |
        Sort-Object @{ Expression = { if ($_.Name -match 'cli') { 0 } else { 1 } } } | ForEach-Object { $_.FullName }
    }
  }
  foreach ($c in ($cands | Select-Object -Unique)) {
    $out = Join-Path $env:TEMP "oc-ver-$PID.txt"
    try {
      $p = Start-Process -FilePath $c -ArgumentList '--version' -NoNewWindow -PassThru -RedirectStandardOutput $out -RedirectStandardError "$out.err"
      if (-not $p.WaitForExit(15000)) { & taskkill /PID $p.Id /T /F | Out-Null; continue }
      if ((Get-Content -Raw $out -ErrorAction SilentlyContinue) -match '\d+\.\d+') { return $c }
    } catch { } finally { Remove-Item $out, "$out.err" -ErrorAction SilentlyContinue }
  }
  return $null
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git is not on PATH. Install Git for Windows, then re-run this.' }
$ocBin = Find-OpenCode
if (-not $ocBin) { throw 'OpenCode command-line program not found (checked PATH and the OpenCode Desktop folder). Run: Get-ChildItem $env:LOCALAPPDATA\Programs\ai.opencode.desktop -Recurse -Filter *.exe | Select FullName   and send the output to Claude.' }
Write-Host "OpenCode CLI: $ocBin"
$cfg = Join-Path $home_ 'config.ps1'
$keep = @(); if (Test-Path $cfg) { $keep = @(Get-Content $cfg | Where-Object { $_ -notmatch '^\$OpencodeBin' }) }
Set-Content -Path $cfg -Value (@("`$OpencodeBin = '$ocBin'") + $keep)
foreach ($f in 'dispatch.ps1', 'standing-prompt.md') {
  Invoke-WebRequest -UseBasicParsing -Uri "$raw/$f" -OutFile (Join-Path $bin $f)
}

$action  = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$bin\dispatch.ps1`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 15)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 4) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'PokerGym OpenCode Dispatcher' -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Polls github.com/MeepTheTendie/pokergym issue #41 for DEEPSEEK-TASK / BEAM-TASK and runs OpenCode.' -Force | Out-Null

# First run records a baseline (existing markers are not replayed) and proves the GitHub read path.
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$bin\dispatch.ps1"
Write-Host "Installed: Task Scheduler > 'PokerGym OpenCode Dispatcher', every 15 min. Logs: $home_\logs"
