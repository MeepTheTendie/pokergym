# Poker Gym crew: who does what, with which tools

The single roster. If another doc names a different owner, this file and [`OPERATING_RULES.md`](OPERATING_RULES.md) win. Last cleaned up 2026-11-10 by Claude (integrator), at Wes's request. Ops handoff 2026-11-16: ChatGPT's recurring duties moved to Claude (see below). Update it in the same PR as any change of role or tool.

## People and agents

| Who | Owns | Does not do | Reached by |
|---|---|---|---|
| **Wes** (owner) | Money, accounts, credentials, anything no agent can fix; posts crew-written copy (~20 min/week) | Crew votes, reviews, status, late work (OPERATING_RULES "Crew opinion deadlines") | Claude only, for those cases |
| **Claude** (integrator, the one accountable operator since 2026-11-16) | Monitors #41/#51 and makes sure every task gets an answer; dispatch, retries and re-routing for all agents; opens and merges every PR on green `test`; deploy check; ledger #51; Opinion schedule and closing votes; video production; **all** Metricool scheduling, queue preflight and post-publish checks; Drive→Metricool media handoff; daily hold-time tripwire; dashboard upkeep | Analytics reports (Wren's) | `CLAUDE-TASK:` on #41/#51, or `docs/claude-tasks/*.md` |
| **Wren/Muse** | Decider: a position with reasons on every crew decision and slate (OPERATING_RULES "Active debate"); daily analytics pull (~10 AM CT), weekly readouts, per-clip funnel, tracking reviews, ControlDoc Wren Status | Opening PRs (her token can't); publishing | `WREN-TASK:` on #41 (she polls every 15 min) |
| **ChatGPT** | **Decider again (Wes, live, 2026-11-17 ~9 PM CT):** a position with reasons on every crew decision and slate; critiques Claude's and Wren's calls | Metricool scheduling, merging (Claude) | `CHATGPT-TASK:` on #41 |
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
| Metricool (brand 7282227, America/Chicago) | Scheduling FB Reels, IG Reels, YouTube Shorts | Claude | Media comes in through the `media-handoff` branch, see OPERATING_RULES "Crew returns" 7 |
| Google Drive `1 - Ready to Post` | Archive copy of each finished MP4 + caption .txt | Claude | Connector upload limit 10 MB. No longer on the Metricool path |
| GitHub branch `media-handoff` | Public single-commit copy of approved MP4s, so Metricool can import them by URL | Claude | Never a PR head, never merged; force-replaced per batch |
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
| Crew integrator | 11:09 AM and 7:09 PM daily (owner usage budget, 2026-11-17) | Inbox for #41/#51, dispatch and retries, PRs, merges, Opinion schedule, ledger, video scheduling, Metricool queue preflight (9:09) and post-publish checks (2:09, 7:09) |
| Daily video hold-time check | 12:43 PM, weekdays | Reel watch-time tripwire on #51 |
| Playtest | Fri, 7:41 PM | Plays the live site as a new visitor per [`playtest/PLAYTEST.md`](playtest/PLAYTEST.md); report in `docs/playtest/`, fixes tasked on #41 |
