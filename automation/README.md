# Daily Linux work session

The user timer starts at 09:00 America/Chicago daily. GPT-6.1 Sol uses low reasoning through the existing ChatGPT-signed-in Codex CLI. No desktop app is required. Each scheduled session starts exactly one Codex run, capped at 20 minutes. The runner does not relaunch Codex when that iteration completes or fails. Its four expired Cloudflare MCP connections are disabled for this job only, avoiding repeated OAuth refresh failures; other Codex sessions retain their normal configuration. The runtime cap is not a token or subscription-usage cap. Usage limits can stop a run.

Keep the machine powered on, awake, online and your user session running. This is a local user timer, not a cloud task. Persistent scheduling catches a missed timer when the user manager next runs; it cannot wake a powered-off computer. No lingering, sleep policy or privileged configuration was changed.

Reports and diagnostic logs: /home/meep/.local/state/pokergym-automation/ (private permissions). Cross-run work checkpoints: automation/PROGRESS.md. Runs use the main checkout, so avoid simultaneous changes to the same files. CLI plugins and publishing capabilities must be checked within the run; connections available in a different chat are not assumed available.

Status: `systemctl --user status pokergym-daily.timer pokergym-daily.service`

Stop the current run: `systemctl --user stop pokergym-daily.service`

Disable future runs: `systemctl --user disable --now pokergym-daily.timer`

Start a session manually: `systemctl --user start pokergym-daily.service`

The scheduled runner has broad computer access to carry out the owner's authorized app development and marketing, constrained by its scope prompt. It must never expose secrets, spend money, invent revenue, spam, or alter its own schedule/permissions.
