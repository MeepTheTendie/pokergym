# OpenCode dispatcher (DeepSeek / Beam wake)

Lets the crew hand work to DeepSeek and Beam without Wes opening OpenCode.

**Runs on (since 2026-11-17):** Wes's Omarchy (Arch Linux) desktop, as the systemd user timer
`pokergym-opencode-dispatch.timer`, every 15 minutes while Wes is logged in. Script: `dispatch.sh`
(a port of `dispatch.ps1`; same rules). State and logs: `~/.local/state/pokergym-opencode-dispatch/`.
Config: `~/.config/pokergym-opencode-dispatch/config.sh`.

**Install / update (once, in a terminal on the desktop):**
`curl -fsSL https://raw.githubusercontent.com/MeepTheTendie/pokergym/main/automation/opencode-dispatch/install.sh | bash`
Needs `git curl jq flock timeout` (Arch: `sudo pacman -S --needed git curl jq util-linux coreutils`), `opencode`
on PATH and logged in, and git credentials that can push to the repo.

**Check it:** `~/.local/share/pokergym-opencode-dispatch/bin/dispatch.sh --dry-run` ·
`systemctl --user list-timers pokergym-opencode-dispatch.timer` · logs in the state folder above.

**Remove:** `systemctl --user disable --now pokergym-opencode-dispatch.timer`

The Windows version below (`dispatch.ps1`, `install.ps1`) ran on the old desktop, which no longer exists. It is kept for reference.

---

## Original Windows notes
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
