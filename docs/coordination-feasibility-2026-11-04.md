# Coordination feasibility — November 4, 2026

Status: **partial handoff demonstrated; full crew coordination NOT solved**.
Deadline: Monday, November 9, 2026, America/Chicago.
Investigator: Codex. Baseline main: `9abb1cc6bcf9eb2a0a4032f600efc24d9474a482` (merged PR #38).

## Verified experiment

Correlation `PG-HANDOFF-20261104-01`:
1. Codex used the desktop app's supported `send_message_to_thread` interface to resume the existing **Poker Gym Operations Resumed** ChatGPT chat (`6add4f2b-4bc4-83ea-913e-7afa9184a974`).
2. The specialist completed a bounded read-only GitHub/Metricool task. Its returned result named the exact baseline main SHA and ControlDoc blob `68cd49a1a3b99a6c1d68ddc04745ae9eb33a2ceb`, matching Codex's independent repository reads.
3. The specialist reported successful live Metricool settings and Nov 4 queue reads for brand 7282227: YouTube 414693374, Instagram 414693497, Facebook 414693511, all pending at 16:00 America/Chicago, p4-AF. These are the specialist's connector observations, not a second analytics report or claims of publication.
4. Codex retrieved the completed response with `read_thread`; returned turn `0ba5a14e-ad68-4d7f-9279-649e71d0d6a9`, response `8659fce5-644d-464e-bf14-ecb24651701e`. No owner forwarded a message.

This is an actual two-agent task/result round trip through an existing integration. It proves the **Codex → existing ChatGPT publishing specialist → Codex** lane, while the specialist keeps its own connectors. It does not prove an unattended scheduler, GitHub-triggered execution, or communication with the other specialists. The specialist itself correctly declined to claim full orchestration before it knew Codex had retrieved the result.

`wait_threads` does not support this ChatGPT target (returned “No Codex thread found”); `read_thread` is the tested result retrieval route. A successful dispatch alone is never completion.

Correlation `PG-HANDOFF-20261104-02`:
- Codex opened the already-installed **Grok Bot** app and its existing **Poker Gym** bot through authorized computer use.
- The read-only runtime/trigger investigation was visibly submitted at 11:19:39 AM Central.
- The app displayed **“Weekly usage limit reached”**, **“It resets in 3 days”**, and a separate 90% usage warning. The conversation subsequently showed “Poker Gym is working,” but no completed feasibility answer had been retrieved at this checkpoint. Record this as **submitted, completion unverified, quota warning observed**, not a successful Grok run or proof of a permanently unavailable API.
- No upgrade, on-demand spend, account/permission change or new routine was requested.

## Existing architecture and access

| Specialist/surface | Evidence inspected | Execution conclusion |
|---|---|---|
| ChatGPT publishing | Existing chat resumed; result retrieved; specialist's live Metricool read | Reachable now via desktop thread integration; connectors remain in native chat |
| Grokbot / native Meta Insights | Existing Poker Gym desktop conversation; ControlDoc Nov 1–3 native Meta readings | UI task submission reachable; no returned trigger specification yet; quota warning observed. Native Meta access was documented by Grok, not independently revalidated in this experiment |
| Wren/Muse analytics | Committed Oct 26 operations audit, daily/midday job definitions and ControlDoc | Muse-native cron + Meta/PostHog/GitHub helpers, not a portable repo program. No authenticated Muse session or incoming trigger exposed to this Codex session |
| DeepSeek / Beam / OpenCode | ControlDoc role corrections, engineering entries, repo automation | Coding roles documented; no accessible live session IDs, host connection or registered worker endpoints established here. Do not infer they are separately runnable from their names |
| Linux daily job | automation/README.md, run-daily.sh, daily-prompt.md | Launches exactly one Codex CLI run, maximum 1200 seconds, protected by flock and PostHog preflight. No queue consumer or specialist dispatch. Host/service current state not inspected |
| GitHub Actions | Complete repository tree and .github/workflows/test.yml; latest ten runs | Only tests workflow; push/main and PR events, contents:read. No issue/webhook worker or agent runner in the checked-in workflows |
| This Windows host | Local command/app inventory; desktop projects/artifacts | Codex CLI installed; OpenCode command unavailable, WSL not installed, no attached remote project/worktree. This does not establish that the separate Linux host is down |

Wren's audit explicitly identifies her two recurring workflows as running inside Muse, with existing OAuth-backed Meta helpers and PostHog access:
[Wren audit](automation/artifacts/wren/2026-10-26-wren-operations-audit.md).
A current owner-authored message visible in Grok's Poker Gym chat reports that Wren's direct ControlDoc writes are blocked by branch protection and her GitHub integration cannot open PRs. That is **owner-reported**, not a fresh Wren API test; her staged Nov 4 text was not retrieved or recreated here. Do not fabricate her ballots or rewrite her section.

Plugin discovery for Grok, Wren, Muse, OpenCode, DeepSeek and Beam returned no matching plugins. This is an observation about this catalogue, not proof that no external integration exists anywhere.

## Smallest practical mechanism

Keep GitHub as the canonical queue and decision record; retain the existing specialist runtimes and their connectors. Use one coordination issue as the owner's result view, with task IDs and explicit states: queued → claimed → completed/blocked. Each task needs a named specialist, bounded scope, inputs, deadline and linked result. A coordinator must actually invoke a supported session/worker and collect the result. An issue comment, label, assignment or MCP configuration is not an invocation.

The demonstrated desktop thread adapter can serve the ChatGPT lane. A native Muse job could in principle read GitHub tasks during its existing checks; Wren must first verify and configure that inside her actual runtime and establish a writable status channel. Likewise Grok must verify a routine/hook or supported invocation in its native runtime. This is **conditional architecture**, not installed functionality. GitHub comments may avoid protected-branch writes, but Wren's issue-comment permission must be tested before relying on them.

Reliability requirements before calling this solved:
- The owner gives one bounded instruction and no relay prompts.
- At least two existing specialists independently claim and execute linked tasks, using their actual native capabilities.
- Results and decisions appear in one GitHub record; retries do not duplicate publishing/actions.
- Restart/retry, expired auth, quota exhaustion and a stale claim yield explicit blocked status, not fabricated success.
- Wren analytics, OpenCode coding, Metricool publishing and Grok's native Meta inspection remain available; mobile-only Meta details stay explicitly unavailable where appropriate.
- The routine repeats unattended on an identified existing host, with measured wake/completion evidence.

## Exact remaining blockers and owner-only boundary

1. **Runtime access, not a missing queue library:** no authenticated Muse control surface, supported Grok trigger specification, or live Linux/OpenCode host connection is available to this investigation. Repo edits cannot manufacture those sessions or inherit their connectors.
2. **Grok capacity:** a weekly limit warning was observed during the live submission. Its reset may avoid new spend, but successful execution after reset must be verified.
3. **Wren write path:** owner reports direct pushes blocked and PR creation unavailable. Preserve branch protection; test an issue-comment inbox or an existing PR-capable bridge in Muse instead of broadening permissions blindly.
4. **Persistent execution:** the desktop round trip occurred during this active investigation. No unattended multi-specialist consumer has been configured or demonstrated.

The smallest owner-only step, if these surfaces cannot be reached through the existing signed-in apps, is **one-time authenticated access to the existing Wren/Muse session and the existing Linux/OpenCode environment**, so an agent can inspect/configure their supported inbox/consumer using current permissions. No server purchase or new credential has been established as necessary. Do not ask the owner to carry task text or staged reports between chats.

If those platforms do not expose a supported job/session trigger even from inside their own environments, preserving these exact sessions while autonomously waking them is blocked by the platform boundary. Then the concrete owner decision is whether to permit an adapter/worker with separately authorized tools; that decision must follow actual platform inspection, not an assumption of portability.

## Alternatives checked

- GitHub events/Actions can route tasks, but the existing workflow only runs tests; adding a trigger without an authenticated agent consumer does not solve execution.
- Official [Codex GitHub Action documentation](https://learn.chatgpt.com/docs/github-action) requires an OpenAI API key secret. No new key, secret or API spending was introduced. The [non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode) explains saved CLI authentication; it does not transfer proprietary chat connectors.
- Current [OpenCode API documentation](https://dev.opencode.ai/v2/docs/api) includes session messaging/wait routes. The installed version, actual server, existing session, authorization and connector parity must be inspected on the real host before using any endpoint. Documentation is not a live worker.
- VPS/Hermes and MCP configuration alone do not supply the absent specialist invocation/authentication. No infrastructure was provisioned.

This change records evidence and the tested lane. It does not deploy an orchestration service, change any timer, or claim the November 9 acceptance criteria have been met.
