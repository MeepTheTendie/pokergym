# Analytics metrics and scorecard

`npm run report` prints the reconciled scorecard from PostHog. It is the
authoritative product-usage report; Cloudflare visits, social impressions, and
video views are not substitutes.

The code is `scripts/analytics-report.mjs`; the event dictionary is
`docs/analytics-events.md`. All queries are reproducible: the script prints the
numbers, and each query is exported for tests and ad-hoc use.

## Reporting days

- Reporting days are **America/Chicago**.
- Yesterday means the last fully completed Chicago calendar day.
- Today is printed separately and labelled partial.
- The PostHog project remains on UTC. Each Chicago midnight is converted to an
  explicit UTC instant in JavaScript (`Intl`, so CST/CDT and DST changes are
  handled), and events are grouped with
  `toDate(toTimeZone(timestamp, 'America/Chicago'))`.
- Tests cover Chicago midnight, both 2026 DST changes, and the fact that the
  day changes at 05:00/06:00 UTC rather than 00:00 UTC.

Do not mix a UTC number and a Chicago number in the same table without a label.
The old UTC series and the new Chicago series are different populations at the
edges of the day.

## Definitions

| Metric | Definition |
|---|---|
| Visitor | Unique `person_id` with at least one valid `$pageview`. |
| Player | Unique visitor with at least one valid `game_start`. |
| Five-hand completer | Unique person with a valid `session_complete` (five finished hands). |
| Five-hand completion rate | Five-hand completers ÷ players. Total completions are printed separately because one person can finish more than one session. |
| Daily Drill starter / completer | Unique person with `start_daily` / `daily_complete`. |
| Returned another day | Person active on at least two distinct Chicago days. |
| D1 retention | Active on the Chicago day immediately after first touch. Only cohorts whose next day is complete are eligible. |
| 7-day return | Active on any day from first-touch day +1 through +7. Only cohorts whose day +7 is complete are eligible. |
| First-touch source | First valid `first_ref`, else first non-empty `ref`, else `first_utm_source`/`utm_source` when it is a recognized platform, else `direct` when the earliest referrer is explicitly `$direct`, else `unknown`. Exactly one bucket per person. |

The same exclusions are applied to visitors, attribution, conversion, retention,
and the funnel: probe event names, probe `ref` values, probe distinct ids, the
five scripted automation profiles, the impossible Edge/12.246 user agent, and
PostHog's internal/test cohort `644643`. Exclusion counts are printed in the
AUDIT section. Remaining visitors are **not** verified humans; they are traffic
that survived these rules.

`trainer_open` is the brief's stage name; the event keeps its existing name
`open_trainer` so historical series stay comparable. Likewise `game_start` and
`session_complete` are the existing names for the session start and five-hand
completion stages.

## Scorecard sections

1. Yesterday (complete Chicago day).
2. Today (partial, through the generation time).
3. Last seven completed days vs the preceding seven, including visitors,
   game-start rate, five-hand completers/completion rate, return rate, and
   Daily Drill completers.
4. Today's source table and the last fourteen completed days' source table.
   Each has one row per person and a total that must equal the visitor
   denominator. `Direct` and `Unknown` are separate rows; a missing referrer is
   never guessed into a platform. `reels` is tracked as its own `ref` and folded
   into Instagram in the report.
5. Where sessions end, by game and hand number, using `run_id`. Runs before
   this instrumentation are reported separately; their hand-level depth cannot
   be reconstructed.
6. Daily Drill starts, completers, completion rate, replays, resumes, and total
   completions.
7. Retention by first-touch cohort, by source, and by first game; repeat site
   visits and repeat gameplay are separate columns.
8. Audit counts and a data-quality warning when any breakdown does not
   reconcile or when completions exceed starts.

## Before and after (same history, 2026-10-21 snapshot)

**Before** — UTC days, old exclusion list (five scripted profiles only), and
the source table counted pageview refs rather than people:

| Day (UTC) | Visitors |
|---|---:|
| 2026-10-17 | 9 |
| 2026-10-18 | 7 |
| 2026-10-19 | 9 |
| 2026-10-20 | 7 |
| 2026-10-21 (partial) | 45 |

The October 21 source table totalled 50 because one person could appear in more
than one source bucket.

**After** — Chicago days, centralized exclusions (including cohort `644643`),
and one source bucket per person:

| Day (Chicago) | Visitors |
|---|---:|
| 2026-10-17 | 11 |
| 2026-10-18 | 7 |
| 2026-10-19 | 9 |
| 2026-10-20 | 8 |
| 2026-10-21 (partial, 22:17 UTC) | 43 |

The October 21 source table now reconciles: 43 visitors, 43 source rows.
The change from 45 to 43 is the Chicago boundary: 00:00–05:00 UTC on October 21
belongs to October 20 in Chicago. Running the new exclusion list against the
old UTC boundaries still gives 45 on October 21, so the cohort did not hide two
real people; the day definition changed.

Historical values that **cannot** be reconstructed:

- Hand-level depth before `hand_dealt`/`decision_made`/`hand_complete` shipped.
  The old `game_start` and `session_complete` events only support start and
  five-hand completion counts.
- True first-touch source for visits before `first_ref` shipped. The report
  falls back to the earliest non-empty `ref`; a later visit cannot recover a
  source that was never stored.
- Retargeting/identity merges: PostHog may merge anonymous persons. `person_id`
  counts are the best available identity, not verified individuals.
- Anonymous identity limits: a person is a PostHog person keyed by a browser
  profile. Clearing storage, switching browser/device, or using a private
  window creates a new person; the same human on two devices counts twice.
  PostHog may also merge two browsers into one person. There is no login, so
  these numbers cannot be converted into verified unique humans.
- Daily Drill replay state before `scored`/`resumed` were populated. One
  historical anomaly is visible in the report: 2026-10-17 has three
  `daily_complete` events from one start and one person. The data-quality
  warning flags it; raw history is not rewritten.

## Known gaps and permissions

- The existing PostHog dashboard tile still uses its own filter and a cached
  value. It is not automatically rewritten by this report. Refresh or replace
  tiles manually; no scheduled task was recreated.
- The legacy probe person `01a14ba3-de9e-731c-ba49-9c24fe4b762e` cannot be
  patched (PostHog returns 404 for the person) and is not in cohort `644643`.
  It can still appear in historical UTC views. The report's probe distinct-id
  rule excludes it.
- A Cloudflare cross-check was not possible without `CLOUDFLARE_API_TOKEN` and
  the account id. Even with it, Cloudflare counts requests including bots and
  link previews, so it is an upper bound, not a visitor count.
- `POSTHOG_PERSONAL_API_KEY` needs query/read access for the report. Marking
  profiles as internal/test or editing cohort membership needs person/cohort
  write access; those actions are not part of `npm run report`.
- The October 22–25 video A/B pairs were not changed or rescheduled.

## Tests

`npm test` runs the analytics unit tests, including:

- duplicate hand events and duplicate completions;
- a daily token cannot close a session (and vice versa);
- hand events after a run ends are rejected;
- five-hand completion carries `hands_completed: 5`;
- source rows reconcile to one person and one total;
- D1/D7 maturity, repeat site vs repeat gameplay, and Chicago/DST boundaries;
- a data-quality warning when sources or Daily Drill events do not reconcile.
