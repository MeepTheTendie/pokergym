# Poker Gym Canonical Dashboard

> **Historical as of October 26, 2026.** The current source of truth is
> `npm run report` plus the PostHog decision dashboard
> <https://us.posthog.com/project/670990/dashboard/2263366>. This file is kept
> for the record and for the earlier agreed numbers; do not quote it as current.

Ordered by Wes, October 22, 2026. This file was the single source of truth for Poker Gym player numbers until the decision dashboard replaced it. When ChatGPT or Grok needed a number that appeared here, they cited this file. If either computed a different number, they logged the difference and their method in the control doc instead of reporting a rival figure to Wes.

## Fixed windows (never change these silently)

- All time: every event in PostHog project 670990.
- Reporting epoch: October 21, 2026, 00:00 America/Chicago, forward. This is the window the daily report runs on.
- Today: the current America/Chicago calendar day, always labeled partial.

## Fixed definitions (from docs/analytics-events.md)

- Visitor: distinct person_id with at least one $pageview in the window.
- Player: distinct person_id with at least one game_start in the window.
- Finished five hands: distinct person_id with at least one session_complete in the window. Sessions are also reported as an event count beside the person count.
- Daily Drill starter: distinct person_id with start_daily. Daily Drill finisher: distinct person_id with daily_complete.
- Returned another day: a person active (any of $pageview, game_start, session_complete, hand_complete, start_daily, daily_complete, open_trainer) on at least two distinct America/Chicago calendar days.
- Probe and test events are excluded from every player metric: iso_probe, pg_probe_batch, attrib_probe, diag_pipeline_check, pg_proxy_probe, pg_proxy_probe2, and any event whose name contains probe or test.

## Why Wes saw three different numbers for the same thing

Nobody's dashboard was broken. Three different windows and methods were being quoted side by side: PostHog's own interface on its default range, a first touch cohort count, and a since October 18 player read. The fix is the fixed windows and definitions above, quoted with their window label every time.

## Agreed numbers, pulled by Wren, October 23, 2026, about 9:52 AM Central

Reporting epoch, since October 21, 2026:
- Visitors: 74 (by first touch: direct 40, reddit 16, youtube 9, unknown 3, reels 3, facebook 1, x 1, funnel-check 1)
- Players: 22 (reddit 15, direct 5, unknown 1, funnel-check 1)
- Finished five hands: 12 people, 19 sessions (reddit 8, direct 4)
- Daily Drill starters: 5 (direct 2, reddit 3)
- Daily Drill finishers: 1 (reddit, scored true)
- Returned another day: 2 people (both reddit)
- D1 retention: Oct 21 cohort 55 people, 1 active Oct 22; Oct 22 cohort not yet eligible

Today, October 23, 2026, partial day:
- Visitors: 8 new (direct 5, reels 3), 9 pageview people
- Players: 0
- Finished five hands: 0 people
- Daily Drill starters: 1

Prior agreed numbers, October 22, 2026, about 5:25 PM Central (kept for reference):

All time:
- Visitors: 106
- Players: 33
- Finished five hands: 14 people, 27 sessions
- Daily Drill starters: 6
- Daily Drill finishers: 3
- Returned another day: 2 people

Reporting epoch, since October 21, 2026:
- Visitors: 65
- Players: 21
- Finished five hands: 11 people, 17 sessions
- Daily Drill starters: 4
- Daily Drill finishers: 1

Deploy marker: the recap retention hooks went live October 22, 2026, 12:00 PM Central. Return comparisons run from that deploy forward; the first clean cohort day is October 23.

## Update rule

No further updates. This file is historical as of October 26, 2026; use
`npm run report` and the PostHog decision dashboard for current numbers.

