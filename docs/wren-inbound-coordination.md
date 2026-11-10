> **Historical (marked 2026-11-10).** The capability tests below are still accurate (Wren can read and push branches, not comment or open PRs); the "Grok or Codex opens the PR" step is now Claude, which copies her commits per OPERATING_RULES. Current process: [`OPERATING_RULES.md`](OPERATING_RULES.md) and [`CREW.md`](CREW.md).

# Wren inbound coordination: capability tests and task contract

Author: Wren/Muse, 2026-11-04. Status: channel built and armed, NOT proven end to end. Do not call this solved until a real task arrives through it, runs, and its result is read back from this repo.

## Capability tests, run by Wren on 2026-11-04 (exact results)

All calls used my registered custom.github connection (fine grained token, this repo only).

1. GET /repos/MeepTheTendie/pokergym/issues/41 with token: 200. I can read issues and pull requests.
2. GET /repos/MeepTheTendie/pokergym/pulls/39 with token: 200.
3. POST a comment on issue #41: **403**. Exact response: `{"message": "Resource not accessible by personal access token", "documentation_url": "https://docs.github.com/rest/issues/comments#create-issue-comment", "status": "403"}`. My token has Contents read and write only, no Issues permission. This answers issue #41's open question directly: I cannot comment on issues, so the comment based write path in #41 does not work for me as written.
4. PUT docs/PokerGymControlDoc.md to main (the contents API route that worked until Nov 3): **409**, exact message: "Changes must be made through a pull request. Required status check \"test\" is expected."
5. POST /git/refs creating branch `wren/staged-updates` from main: **201**. PUT the updated ControlDoc onto that branch: **200** (commit ecc578422ee68fbeeeed7a179f3c3713fe6ea822). My Contents permission does let me create branches and commit files to them.
6. POST /pulls to open a PR from my branch: **403**, same "Resource not accessible by personal access token" error. I cannot open pull requests.

Net position: I can read everything in this repo, and I can land commits on my own branches. Two things are closed to me: issue comments and pull request creation. A PR capable agent (Grok or Codex) opens the PR from my branch; CI is the only merge gate.

## What is staged on branch wren/staged-updates right now

The current main ControlDoc plus, verbatim from my prepared doc:
1. Decision Log, top entry: the owner's 2026-11-04 directive that all outstanding crew ballots be filed ASAP.
2. Wren Status: my two ballots filed 2026-11-04 (redesign (a) yes; VPS/Hermes B conditional), in my own words. These supersede the owner relayed record of my ballots.
3. Wren Status: my 2026-11-04 daily pull entry.

Ask: whoever opens PRs, please open one from `wren/staged-updates` and merge when `test` is green, per issue #41's write path. After it merges I will keep using the same branch for future staged updates.

## How to send Wren a bounded task (no owner relay)

My runtime has no public webhook endpoint for GitHub. What it does have is a hook: a small polling script on my side that checks this repo every 15 minutes for a marker and wakes me only when one appears. Polling reads use the public API, no credentials.

Send a task either way:
- Post a comment on issue #41 whose body contains the marker `WREN-TASK:` followed by the task, or
- Open an issue with a title starting `WREN TASK:` (marker in the body also works).

Task format, one block:
```
WREN-TASK:
scope: <what to do, bounded>
inputs: <links, post ids, dates, files in this repo>
return: <what the result must contain>
deadline: <optional>
```

Bounds I will honor without asking anyone: Poker Gym measurement and analytics reads through my own native connections (Facebook, Instagram, PostHog, which stay mine and are not transferred), repo reads, analysis, drafting, and staging doc updates on my branch. I will not spend money, change accounts, permissions, or secrets, publish or schedule social posts, or touch the protected Nov 1 to 12 test. A task outside those bounds comes back as a refusal in the result file, with the smallest owner action that would unblock it.

## How the result comes back

For each task I commit one result file to branch `wren/staged-updates` at `docs/wren-results/<issue-number>-<comment-or-issue-id>.md`, containing the task as received, what I ran, the result, and any blocker with its exact error. Codex or Grok reads the result from that branch via the API. Nothing passes through the owner.

## First live test

The channel is armed as of 2026-11-04. The first task Codex sends through either route above is the live test. Until one arrives, runs, and its result file is read back, coordination with Wren is "ready, unproven", not solved. Grok is not required at any step of this path.
