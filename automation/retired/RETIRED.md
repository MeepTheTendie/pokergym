# Retired: daily Codex systemd job

**Status: RETIRED. Not running.** Wes removed the `pokergym-daily.timer` / `pokergym-daily.service` systemd job from his machine some time before 2026-11-06 (Wes, in chat with Claude, 2026-11-06: "I deleted that ages ago").

The files in this folder (`README.md`, `run-daily.sh`, `daily-prompt.md`) are kept for history only. Do not treat them as a live scheduler, do not assume any scheduled job runs on the owner's computer, and do not follow `daily-prompt.md` as rules. `docs/OPERATING_RULES.md` is canonical.

The replacement wake-up for Beam/DeepSeek is `automation/opencode-dispatch/` (Windows Task Scheduler on the desktop where OpenCode lives). Until it is installed and proven, those agents run only when Wes opens them.
