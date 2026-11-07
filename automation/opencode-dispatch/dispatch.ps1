# Poker Gym OpenCode dispatcher (Windows 11, Windows PowerShell 5.1+).
# Run every 15 minutes by Task Scheduler (see install.ps1).
# Polls issue #41 (public REST, no credentials). For each new comment by the repo owner
# whose first line starts with DEEPSEEK-TASK: or BEAM-TASK:, runs one non-interactive
# `opencode run` in a fresh git worktree of origin/main. At-most-once per comment.
#   -DryRun : show what would be dispatched, change nothing.
param([switch]$DryRun)
$ErrorActionPreference = 'Stop'

$Repo = 'MeepTheTendie/pokergym'; $Issue = 41; $OwnerLogin = 'MeepTheTendie'
$Home_ = Join-Path $env:LOCALAPPDATA 'pokergym-opencode-dispatch'
$Clone = Join-Path $Home_ 'repo'          # dispatcher-only clone, never Wes's working copy
$Seen  = Join-Path $Home_ 'seen-ids.txt'
$Logs  = Join-Path $Home_ 'logs'
$Cfg   = Join-Path $Home_ 'config.ps1'    # optional: $DeepseekModel, $BeamModel, $DeepseekAgent, $BeamAgent, $RunTimeoutMin
$Here  = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Item -ItemType Directory -Force -Path $Home_, $Logs | Out-Null

function Log($m) { $l = "$(Get-Date -Format s) $m"; Write-Host $l; Add-Content -Path (Join-Path $Logs 'dispatcher.log') -Value $l }

$OpencodeBin = ''; $DeepseekModel = ''; $BeamModel = ''; $DeepseekAgent = ''; $BeamAgent = ''; $RunTimeoutMin = 30
if (Test-Path $Cfg) { . $Cfg }

# Single instance.
$mutex = New-Object System.Threading.Mutex($false, 'Global\PokerGymOpenCodeDispatch')
if (-not $mutex.WaitOne(0)) { exit 0 }
try {
  # $OpencodeBin comes from config.ps1 (written by install.ps1); fall back to PATH.
  # Application only: npm also installs an opencode.ps1 shim that Start-Process cannot launch.
  $oc = $null
  if ($OpencodeBin -and (Test-Path $OpencodeBin)) { $oc = [pscustomobject]@{ Source = $OpencodeBin } }
  else { $oc = (Get-Command opencode -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1) }
  if (-not $oc) { Log 'OpenCode CLI not found (config.ps1 OpencodeBin or PATH); stopping'; exit 1 }
  $git = (Get-Command git -ErrorAction SilentlyContinue)
  if (-not $git) { Log 'git not on PATH; stopping'; exit 1 }

  # Read recent #41 comments (oldest-first API, so use a 7-day window, paged).
  $since = (Get-Date).ToUniversalTime().AddDays(-7).ToString('yyyy-MM-ddTHH:mm:ssZ')
  $comments = @()
  try {
    for ($page = 1; $page -le 10; $page++) {
      # Assign first, then enumerate: in Windows PowerShell 5.1, @(Invoke-RestMethod ...) wraps the
      # whole JSON array as ONE item, which made every comment fail the filter.
      $resp = Invoke-RestMethod -Headers @{ 'Accept' = 'application/vnd.github+json'; 'User-Agent' = 'pokergym-dispatcher' } `
        -Uri "https://api.github.com/repos/$Repo/issues/$Issue/comments?per_page=100&page=$page&since=$since"
      $chunk = @(); foreach ($x in $resp) { $chunk += $x }
      $comments += $chunk
      if ($chunk.Count -lt 100) { break }
    }
  } catch { Log "GitHub read failed ($($_.Exception.Message)); retry next tick"; exit 0 }

  $tasks = @()
  foreach ($c in $comments) {
    if ($c.user.login -ne $OwnerLogin -or $c.author_association -ne 'OWNER') { continue }
    $first = ($c.body.TrimStart() -split "`n")[0]
    if ($first -match '^\s*DEEPSEEK-TASK:') { $tasks += [pscustomobject]@{ Id = [long]$c.id; Agent = 'deepseek'; Body = $c.body } }
    elseif ($first -match '^\s*BEAM-TASK:') { $tasks += [pscustomobject]@{ Id = [long]$c.id; Agent = 'beam'; Body = $c.body } }
  }
  $tasks = @($tasks | Sort-Object Id)
  Log "Checked $($comments.Count) recent #41 comment(s); $($tasks.Count) marker comment(s)."

  # First run: record existing markers so old tasks are never replayed.
  if (-not (Test-Path $Seen)) {
    if ($DryRun) { Log "DRY RUN: first run would record $($tasks.Count) existing marker(s) as baseline"; exit 0 }
    Set-Content -Path $Seen -Value (@("baseline-$(Get-Date -Format s)") + ($tasks | ForEach-Object { "$($_.Id)" }))
    Log "Baseline recorded ($($tasks.Count) existing marker comment(s) skipped). Read path OK."
    exit 0
  }
  $seenIds = @(Get-Content $Seen)

  foreach ($t in $tasks) {
    if ($seenIds -contains "$($t.Id)") { continue }
    $model = ''; $agentName = ''
    if ($t.Agent -eq 'deepseek') {
      $model = $DeepseekModel; $agentName = $DeepseekAgent
      if (-not $model) { $model = (& $oc.Source models 2>$null | Where-Object { $_ -match '^opencode-go/deepseek' } | Select-Object -First 1) }
    } else { $model = $BeamModel; $agentName = $BeamAgent }
    $mshow = $model; if (-not $mshow) { $mshow = 'opencode default' }
    if ($DryRun) { Log "DRY RUN: would dispatch $($t.Agent) for comment $($t.Id) (model: $mshow)"; continue }

    # Setup. A failure here leaves the task unseen so the next tick retries it.
    $wt = Join-Path $Home_ "worktrees\$($t.Agent)-$($t.Id)"
    try {
      if (-not (Test-Path (Join-Path $Clone '.git'))) { & git clone -q "https://github.com/$Repo" $Clone; if ($LASTEXITCODE) { throw 'git clone failed' } }
      & git -C $Clone fetch -q origin main; if ($LASTEXITCODE) { throw 'git fetch failed' }
      if (Test-Path $wt) { Remove-Item -Recurse -Force $wt }
      & git -C $Clone worktree prune
      & git -C $Clone worktree add -q --detach $wt origin/main; if ($LASTEXITCODE) { throw 'git worktree add failed' }
    } catch { Log "setup failed for $($t.Agent)/$($t.Id): $($_.Exception.Message); retry next tick"; exit 0 }

    $url = "https://github.com/$Repo/issues/$Issue#issuecomment-$($t.Id)"
    $prompt = (Get-Content -Raw (Join-Path $Here 'standing-prompt.md')).Replace('{{AGENT}}', $t.Agent).Replace('{{COMMENT_ID}}', "$($t.Id)").Replace('{{COMMENT_URL}}', $url)
    $prompt += "`n---`n`n## The task (verbatim from $url)`n`n$($t.Body)`n"
    # The task goes in a file (no command-line quoting limits); kept out of git.
    Set-Content -Path (Join-Path $wt '.dispatch-task.md') -Value $prompt -Encoding UTF8
    Add-Content -Path (Join-Path $Clone '.git\info\exclude') -Value '.dispatch-task.md'

    $ocArgs = @('run')
    if ($model) { $ocArgs += @('-m', $model) }
    if ($agentName) { $ocArgs += @('--agent', $agentName) }
    $ocArgs += '"Read the file .dispatch-task.md in the current directory and carry it out exactly as written."'
    $stamp = Get-Date -Format 'yyyyMMddTHHmmss'
    $log = Join-Path $Logs "$stamp-$($t.Agent)-$($t.Id).log"
    Log "Dispatching $($t.Agent) for comment $($t.Id) (model: $mshow); log $log"

    # Commits are attributed to the agent, never to Wes's account name.
    $who = @{ deepseek = 'DeepSeek (OpenCode)'; beam = 'Beam (OpenCode)' }[$t.Agent]
    $env:GIT_AUTHOR_NAME = $who; $env:GIT_COMMITTER_NAME = $who
    $env:GIT_AUTHOR_EMAIL = "$($t.Agent)-opencode@users.noreply.github.com"; $env:GIT_COMMITTER_EMAIL = $env:GIT_AUTHOR_EMAIL
    try {
      $p = Start-Process -FilePath $oc.Source -ArgumentList $ocArgs -WorkingDirectory $wt -NoNewWindow -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err"
    } catch {
      Log "launch failed for $($t.Agent)/$($t.Id): $($_.Exception.Message); task remains unseen for retry"
      & git -C $Clone worktree remove --force $wt 2>$null
      continue
    }
    # Once the process exists, treat this as an attempted run even if it later
    # exits nonzero or times out. A setup/spawn failure stays unseen for retry.
    Add-Content -Path $Seen -Value "$($t.Id)"
    $null = $p.Handle   # PS 5.1: cache the handle now, or ExitCode comes back empty after the wait
    if (-not $p.WaitForExit($RunTimeoutMin * 60 * 1000)) {
      & taskkill /PID $p.Id /T /F | Out-Null
      Log "$($t.Agent)/$($t.Id) timed out after $RunTimeoutMin min; killed"
    } else { Log "$($t.Agent)/$($t.Id) finished with exit $($p.ExitCode)" }

    & git -C $Clone worktree remove --force $wt 2>$null
  }
} finally { $mutex.ReleaseMutex() }
