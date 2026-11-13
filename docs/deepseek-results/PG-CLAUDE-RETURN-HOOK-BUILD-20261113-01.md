# PG-CLAUDE-RETURN-HOOK-BUILD-20261113-01 — "come back tomorrow" recap prompt

- **task:** `PG-CLAUDE-RETURN-HOOK-BUILD-20261113-01` (from Claude, integrator)
- **status:** PASS — pushed, not merged
- **branch:** `deepseek/return-hook` (`origin/main` @ `c0d8a15`, then merged `origin/main` @ `d1ea03a`)
- **commits:** `c062f67` (build), `5331da3` (merge of `origin/main`)
- **bounds:** no `worker/`, `wrangler` config, secrets, tracking-link or Metricool
  changes; #92 (Pro unlock) untouched; no merge.

## What changed

### 1. Recap prompt — `web/app.js:2293-2313`

Inside `renderSessionSummary(session, daily = null)`, after the existing recap
action row and gated on `if (!daily)` (the five-hand session recap, not a Daily
Drill recap):

- One line: **"Come back tomorrow for a fresh Daily Drill."**
- When today's drill is already done (`dailyDone`), the same line becomes
  **"Come back tomorrow for a fresh Daily Drill. The next one unlocks in …"**
  using the existing `formatDailyCountdown()` helper.
- One button, wired to the existing Daily Drill path `startDaily('recap')`:
  **"Play today's Daily Drill"**, or **"Replay today's Daily Drill"** when today's
  drill is done.
- No popup, modal, email, account, or new storage. The prompt adds no streak
  claim; the existing streak line below it still derives only from saved days
  (`sessionStreak(profile)`).

### 2. Analytics — `src/rpg/analytics.js:29-30, 236-246`

`return_prompt_shown` and `return_prompt_clicked` did not exist anywhere in the
repo before this change (search for `return_prompt` returned no matches). They now
go through the existing `createAnalytics` wrapper, like every other trainer event:

- `analytics.returnPromptShown({ daily_done, run_id })` — fires once whenever the
  non-daily recap renders with the prompt (`web/app.js:2312`).
- `analytics.returnPromptClicked({ daily_done, run_id })` — fires before the
  existing Daily Drill flow starts (`web/app.js:2308`).
- Both add `event_version: 2` and the visit's `ref`, as the other events do.
- `run_id` is the recap's existing `recapRunId` (`sessionToken` here), matching
  `recap_view` / `recap_tap` / `session_complete`.

No other tracking event, property or link was changed. Event docs updated in
`docs/analytics-events.md:58-59`.

### 3. Tests — `test/analytics.test.js`

- Unit: both events emit once with `run_id`, `daily_done`, `event_version` and
  `ref`.
- Source wiring: the prompt is gated on `!daily`, carries the exact line, uses
  `formatDailyCountdown()` in the `dailyDone` branch, and fires the click event
  before `startDaily('recap')`.
- The existing "every Daily Drill entry path names itself" assertion now expects
  the second `'recap'` entry (the new button) alongside the existing recap CTA.

## The recap, rendered

Screenshot (390 × 844 headless Edge, five-hand recap after the real app was
played to completion): `docs/deepseek-results/PG-CLAUDE-RETURN-HOOK-BUILD-20261113-01-recap.png`.

Text extracted from the rendered `#sessionSummary` (same run; the new prompt is
the line and button between the action row and the reminder section):

```text
Five hands complete
You played five hands. Green squares are decisions you got right; red squares are the ones worth reviewing.
🟥🟥🟥🟥🟥
You got 0 of 5 decisions right · best streak 0
Worth another look: 6♠ 3♥ against 2♦ — Hit. Average result: 0.077 per hand under this gym’s rules.

Review my mistakes
Play Daily Drill #317
Play another five hands
Challenge a friend

Come back tomorrow for a fresh Daily Drill.

Play today's Daily Drill
Want a reminder for tomorrow?
...
```

The same browser run recorded exactly `return_prompt_shown: 1` for the session.
When today's Daily Drill is complete, the line reads
`Come back tomorrow for a fresh Daily Drill. The next one unlocks in 9H 46M.`
(the helper's live output at the time of the run) and the button reads
`Replay today's Daily Drill`.

## Test output

```text
$ npm test
ℹ tests 385
ℹ suites 0
ℹ pass 385
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5700.24
```

Run on `deepseek/return-hook` after merging `origin/main` @ `d1ea03a`.

Note on the local browser harness: `scripts/analytics-browser-test.mjs` also
fails on untouched `origin/main` in this Windows/Edge environment at its
"returning player opens the map" step, so it is not used as a gate here; the
prompt was still rendered and exercised end-to-end in the same headless browser,
which is where the screenshot and the `return_prompt_shown` count above come
from.

## PR #111 (`deepseek/igbio-backtick`) — up to date

**Yes.** Merged `origin/main` (`d1ea03a`) into `deepseek/igbio-backtick` and
pushed as merge commit **`ff2331d`** (no rebase, no force-push).

- One code conflict in `worker/index.js` (`/reel` block). Resolved by keeping both
  main's `c=`/`clip` deeplink passthrough and #111's `cleanCampaign` trimming:
  campaign, clip and `utm_content` are cleaned before forwarding; `clip` is still
  passed through as `c`.
- One semantic conflict in `test/posthog-loader.test.js`: main's owner rule of
  2026-11-10 (`docs/OPERATING_RULES.md` §Crew visits) treats any stray backtick
  as a crew test visit and returns before identifying, while #111's loader test
  expected a backticked `utm_content` to be trimmed and recorded. The merge keeps
  main's live behavior: whitespace trimming is still tested, and a backticked
  `utm_content` is now asserted to mark the visit internal with no identify.
- **Open item for Wren's sign-off:** if a real Instagram bio arrival can carry the
  backtick (the historical `ig-bio\`` persons), main's rule drops those people
  instead of recording the cleaned tag. The worker-level cleaning still applies
  to `/reel?c=` values; the direct bio-link case is governed by main's rule,
  which this merge did not change.
- `npm test` in the #111 worktree after the merge: **389 pass, 0 fail**.
- #111 still needs Wren's sign-off; it was not merged.

## Handoff

Pushed to `deepseek/return-hook`. Claude reviews and merges once `test` is green.
