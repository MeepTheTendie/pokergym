# Analytics improvements — handoff for Grok & ChatGPT

Date: 2026-10-21 (America/Chicago)
Status: implemented, tests green (364/364). Nothing is committed; unrelated dirty
files were left alone.

## What changed

1. **Reporting days are America/Chicago.** `scripts/analytics-report.mjs` converts
   each Chicago midnight to an explicit UTC instant with `Intl` (DST-safe) and
   groups events with `toDate(toTimeZone(timestamp, 'America/Chicago'))`. The
   PostHog project stays on UTC. Yesterday = last completed Chicago day; today
   is printed separately as partial.

2. **One consistent exclusion rule.** `scripts/stats.mjs` now excludes probes,
   the five scripted Edge/12.246 profiles, the internal/test cohort `644643`,
   and probe `ref`/`first_ref`/`session_ref` values. The same clause is used for
   visitors, source attribution, conversion, retention, daily drill, and the
   funnel. Audit counts are printed.

3. **Source counts reconcile by construction.** The new report assigns exactly
   one first-touch source per person and prints a total row. Today's table is
   43 visitors / 43 source rows, not 45/50. `Unknown` and `Direct` are separate.

4. **Hand-level funnel instrumentation.** New events `hand_dealt`,
   `decision_made`, `hand_complete` carry `run_id`, `run_kind`, `game`, `mode`,
   `hand_index`, `hand_total`, and `event_version: 2`. `session_complete` carries
   `hands_completed: 5` (the app passes `SESSION_HANDS`); `daily_complete` passes
   `DAILY_HANDS`. Duplicate hand events and duplicate completions are rejected
   by the tracker.

5. **Attribution storage.** The loader stores the first valid `ref` + UTM values
   in `localStorage` (`pg_first_touch_v1`) and the current 30-minute session
   source in `sessionStorage` (`pg_session_source_v1`). It registers
   `first_ref`, `first_utm_*`, `session_ref`, and keeps `ref` for old reports.
   Explicit UTM sources (`utm_source=ig`, etc.) are recognized; a missing
   referrer is never guessed as a platform.

6. **One reconciled scorecard.** `npm run report` prints yesterday, today
   partial, 7-day vs preceding-7-day comparisons, today's and 14-day source
   tables, the run-level quit funnel, Daily Drill metrics, retention by cohort /
   source / first game, audits, and data-quality warnings.

## Numbers at 2026-10-21 17:30 CDT (today is partial)

- Yesterday, 2026-10-20: **8 visitors**, 4 players, 0 five-hand completers,
  0 Daily Drill completers.
- Today, 2026-10-21: **43 visitors**, 12 players (27.9%), 5 five-hand completers
  (6 completions), 1 Daily Drill completer (1 completion).
- Last 7 completed days, 2026-10-14..20: **32 visitors**, 11 players, 3 five-hand
  completers (10 completions), 1/32 returned on another day (3%), 2 Daily Drill
  completers (4 completions).
- Preceding 7 days, 2026-10-07..13: 0 visitors (no site traffic before launch).
- Today's first-touch source: YouTube 6, Facebook 1, Reddit 9, X 1, Direct 23,
  Unknown 3 — **total 43**.
- Last 14 completed days' source: YouTube 5, Instagram 3, Reddit 1, Direct 13,
  Unknown 5, Other 5 — **total 32**.
- Audit: today raw pageview people 46 → 43 clean (3 excluded); last 14 days
  raw 41 → 32 clean (9 excluded).
- Funnel: no instrumented runs yet because this code is not deployed.
  Pre-instrumentation sessions: 27 starts, 10 completions; hand-level depth
  cannot be reconstructed.
- Daily Drill: 2026-10-17 one starter/one completer/three completions (flagged
  duplicate or missing events); 2026-10-19 drill 292, one starter/one completer/
  one completion. No one has started a drill on 2+ days in the window.
- Retention: 2026-10-17 cohort 11 people, D1 = 1 (9%). No cohort is mature
  enough for a 7-day rate yet.

## Why "45 visitors / 50 source counts" is now 43/43

The dashboard tile was a cached UTC snapshot. The old source table counted
pageview `ref` values, so one person could appear in several source buckets.
The new table uses one all-time first-touch bucket per person and sums to the
visitor denominator. The 45 → 43 change is the Chicago boundary: 00:00–05:00 UTC
on Oct 21 belongs to Oct 20 in Chicago. Running the new exclusions against the
old UTC boundaries still gives 45, so the cohort did not hide two real people.

Before (UTC, old exclusions): Oct 17=9, Oct 18=7, Oct 19=9, Oct 20=7, Oct 21=45.
After (Chicago, same rules): Oct 17=11, Oct 18=7, Oct 19=9, Oct 20=8, Oct 21=43
(partial at 17:30 CDT). Same UTC boundaries with the new rules: 9, 7, 9, 7, 45.

## What cannot be reconstructed

- Hand-level depth before `hand_dealt`/`decision_made`/`hand_complete` ship.
- True first-touch source before `first_ref` shipped. The report falls back to
  the earliest non-empty `ref`/UTM; it cannot recover a source never stored.
- Daily Drill replay state for old events (`scored`/`resumed` were absent).
- Verified unique humans: PostHog persons are browser profiles, not logins.
  Different devices count separately; PostHog may merge profiles.
- The legacy probe `01a14ba3-de9e-731c-ba49-9c24fe4b762e` cannot be patched
  (person PATCH returns 404) and is not in cohort `644643`; the distinct-id
  exclusion still removes it from the report.

## Remaining gaps / permissions

- The existing PostHog dashboard 2224048 is **not rewritten** by this change.
  Its tiles keep their cached values until refreshed or replaced manually. The
  reproducible scorecard is `npm run report` (`docs/analytics-metrics.md`).
- `POSTHOG_PERSONAL_API_KEY` needs query/read access for the report. Marking
  profiles internal/test or editing cohort membership needs person/cohort write
  access; the report itself does not write.
- A Cloudflare cross-check was not possible without `CLOUDFLARE_API_TOKEN` and
  the account id. Cloudflare counts requests, including bots/link previews, so
  it is an upper bound rather than a visitor count.
- The October 22–25 video A/B test pairs were not changed or rescheduled.
- No scheduled reporting task was recreated.

## Tests and files

`npm test` → 364 passed. New coverage: Chicago midnight and both 2026 DST
changes, duplicate hand events, duplicate completions, a daily token cannot
close a session, hand events after a run ends, resumed sessions finishing hands
3–5, source reconciliation, repeated pageviews, D1/D7 maturity, repeat site vs
repeat gameplay, and data-quality warnings.

Changed/added:
- `src/rpg/analytics.js`
- `web/app.js`
- `web/posthog-loader.js`
- `scripts/stats.mjs`
- `scripts/analytics-report.mjs` (new)
- `test/analytics.test.js`
- `test/analytics-report.test.js` (new)
- `docs/analytics-events.md`
- `docs/analytics-metrics.md` (new)
- `package.json` (`npm run report`)
- `README.md`
