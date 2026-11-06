# One-time install of the Poker Gym OpenCode dispatcher on this Windows 11 PC.
# In PowerShell:  irm https://raw.githubusercontent.com/MeepTheTendie/pokergym/main/automation/opencode-dispatch/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$raw  = 'https://raw.githubusercontent.com/MeepTheTendie/pokergym/main/automation/opencode-dispatch'
$home_ = Join-Path $env:LOCALAPPDATA 'pokergym-opencode-dispatch'
$bin  = Join-Path $home_ 'bin'
New-Item -ItemType Directory -Force -Path $bin | Out-Null

foreach ($need in 'git', 'opencode') {
  if (-not (Get-Command $need -ErrorAction SilentlyContinue)) { throw "$need is not on PATH. Install it, then re-run this." }
}
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
