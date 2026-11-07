# OpenCode dispatcher (DeepSeek / Beam wake)

Lets the crew hand work to DeepSeek and Beam without Wes opening OpenCode.

**Runs on:** Wes's Windows 11 desktop (where OpenCode is installed), as the Task Scheduler job
`PokerGym OpenCode Dispatcher`, every 15 minutes, while Wes is signed in. State and logs:
`%LOCALAPPDATA%\pokergym-opencode-dispatch\`.

**How to send work:** post a comment on issue #41 from the owner account whose first line starts
with `DEEPSEEK-TASK:` or `BEAM-TASK:`. Put the task id, branch name and result file in the body.
Within ~15 minutes the dispatcher runs `opencode run` in a fresh worktree of `origin/main`, with
`standing-prompt.md` + the comment as the instructions. Comments from anyone else, and markers that
are not on the first line, are ignored.

**What comes back:** a pushed `deepseek/*` or `beam/*` branch with a result file
(`docs/<agent>-results/...`). The hourly cloud integrator opens the PR and merges on green `test`.
The dispatcher itself never merges, comments or contacts Wes.

**Guarantees:** one run per comment (a failed run is not replayed; re-post to retry); setup failures
(offline, git) retry next tick; 30-minute cap per run; existing markers at install time are skipped.

**Model choice:** DeepSeek = first `opencode-go/deepseek*` in `opencode models`; Beam = OpenCode's
default. Override in `%LOCALAPPDATA%\pokergym-opencode-dispatch\config.ps1`
(`$DeepseekModel`, `$BeamModel`, `$DeepseekAgent`, `$BeamAgent`, `$RunTimeoutMin`).

**Install (once, in PowerShell):**
`irm https://raw.githubusercontent.com/MeepTheTendie/pokergym/main/automation/opencode-dispatch/install.ps1 | iex`

**Check it:** `powershell -File "$env:LOCALAPPDATA\pokergym-opencode-dispatch\bin\dispatch.ps1" -DryRun`

**Remove:** `Unregister-ScheduledTask 'PokerGym OpenCode Dispatcher' -Confirm:$false`

Not tested on Windows before merge (authored from a Linux sandbox); the first install run is the
read-path test, and the first real DEEPSEEK-TASK is the end-to-end test.
