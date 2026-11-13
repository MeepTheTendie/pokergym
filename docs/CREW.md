# Poker Gym crew: who does what, with which tools

The single roster. If another doc names a different owner, this file and [`OPERATING_RULES.md`](OPERATING_RULES.md) win. Last cleaned up 2026-11-10 by Claude (integrator), at Wes's request. Update it in the same PR as any change of role or tool.

## People and agents

| Who | Owns | Does not do | Reached by |
|---|---|---|---|
| **Wes** (owner) | Money, accounts, credentials, anything no agent can fix; posts crew-written copy (~20 min/week) | Crew votes, reviews, status, late work (OPERATING_RULES "Crew opinion deadlines") | Claude only, for those cases |
| **Claude** (integrator) | Opens and merges every PR on green `test`; deploy check; ledger #51; Opinion schedule and closing votes; video production; Metricool scheduling for Nov 13+ clips; daily hold-time tripwire; dashboard upkeep | Analytics reports (Wren's); the Nov 1–12 queue (ChatGPT's) | `CLAUDE-TASK:` on #41/#51, or `docs/claude-tasks/*.md` |
| **Wren/Muse** | Daily analytics pull (~10 AM CT), weekly readouts, per-clip funnel, tracking reviews, ControlDoc Wren Status | Opening PRs (her token can't); publishing | `WREN-TASK:` on #41 (she polls every 15 min) |
| **ChatGPT** | Nov 1–12 publishing queue in Metricool; social link and caption audits; launch copy; return-hook proposal; fallback for getting Drive clips into Metricool | Merging; site code | `CHATGPT-TASK:` on #41 (polls #41/#51 hourly at :25) |
| **DeepSeek** (OpenCode) | Site and test code tasks (e.g. Pro unlock #92, ig-bio backtick fix) | Merging; publishing | `DEEPSEEK-TASK:` on #41; woken by the desktop dispatcher |
| **Beam** (OpenCode) | Site code tasks (Pro packs #91, `/reel?c=` deep link #90, attribution); read-only code checks | Merging; publishing | `BEAM-TASK:` on #41; woken by the desktop dispatcher |
| **Codex** | No standing duties (its daily systemd job was retired Nov 6) | — | `CODEX-TASK:` on #41 if ever needed |
| ~~Grok~~ | Removed Nov 5, 2026. Never contact or assign. | | |

## How work moves

- **Tasks and results:** issue #41 (dispatch log). Every comment's first lines are `<AGENT>-TASK:` / `<AGENT>-RESULT:` plus `from:`, because every agent posts from the owner's GitHub account.
- **Status:** issue #51 (ledger), kept by Claude.
- **Decisions:** `docs/PokerGymControlDoc.md` Decision Log; open votes on its Opinion schedule (10 AM / 6 PM CT slots).
- **Code and docs:** each agent commits to its own `<agent>/<topic>` branch; Claude opens the PR (DRAFT when held) and merges on green `test`. Wren's `wren/staged-updates` is copied, never used as a PR head.

## Tools in use

| Tool | What for | Who uses it | Notes |
|---|---|---|---|
| GitHub `MeepTheTendie/pokergym` | Code, docs, CI (`tests`), auto `deploy` and `indexnow` after merge | All | Branch protection: required `test`; merged heads auto-delete |
| Cloudflare Workers | Hosts playpokergym.com | Deploy workflow only | Deploy token expires **Feb 4, 2027**; Claude flags it the week before |
| PostHog (US, project 670990) | Site analytics; canonical definitions in `docs/analytics-events.md` | Wren (read-only), Claude | Bots excluded per `scripts/stats.mjs` |
| Metricool (brand 7282227, America/Chicago) | Scheduling FB Reels, IG Reels, YouTube Shorts | ChatGPT (≤ Nov 12), Claude (Nov 13+) | Can't fetch private Drive files; see OPERATING_RULES "Crew returns" 7 |
| Google Drive `1 - Ready to Post` | Hand-off of finished MP4 + caption .txt | Claude, ChatGPT | Connector upload limit 10 MB |
| Meta Business Suite | Per-post insights (watch time, 3 s views) | Wren (native); Claude's daily dashboard pull via Chrome on Wes's Windows PC | Read-only |
| Windsor.ai | FB/IG reel plays and average watch time | Claude (hold-time check) | Free tier only, no upgrade |
| Claude dashboard "Poker Gym Daily Numbers" | Wes's daily view of social and site numbers | Claude keeps it current | Artifact; Metricool/PostHog live, Meta data pulled daily |
| OpenCode + desktop dispatcher | Runs DeepSeek and Beam | DeepSeek, Beam | Task Scheduler on Wes's Windows PC, every 15 min |
| edge-tts (`en-US-AndrewNeural`) | Voice for clips | Claude | Free, no account |
| Ko-fi | Gym Pro sales (planned launch Nov 24) | — (Wes owns the account) | New products or prices need a crew decision |
| Bend | Formal checks of strategy tables in CI | CI | |

## Claude's scheduled runs

| Run | When (CT) | Does |
|---|---|---|
| Crew integrator | :09, hourly in deadline windows, else every 2 h 7 AM–11 PM | PRs, merges, Opinion schedule, ledger, Nov 13+ scheduling |
| Daily video hold-time check | 12:43 PM | Reel watch-time tripwire on #51 |
| Dashboard Meta pull + accountability | 6:47 AM | Refreshes the dashboard's Meta data and decision checks |
| Playtest | Tue and Fri, 7:41 PM | Plays the live site as a new visitor per [`playtest/PLAYTEST.md`](playtest/PLAYTEST.md); report in `docs/playtest/`, fixes tasked on #41 |
