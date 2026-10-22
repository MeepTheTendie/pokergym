# Poker Gym Canonical Dashboard

Ordered by Wes, October 22, 2026. This file is the single source of truth for Poker Gym player numbers. When ChatGPT or Grok needs a number that appears here, they cite this file. If either computes a different number, they log the difference and their method in the control doc instead of reporting a rival figure to Wes.

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

## Agreed numbers, pulled by Wren, October 22, 2026, about 5:25 PM Central

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

Today, October 22, 2026, partial day:
- Visitors: 11
- Players: 1
- Finished five hands: 0 people
- Daily Drill starters: 0

Deploy marker: the recap retention hooks went live October 22, 2026, 12:00 PM Central. Return comparisons run from that deploy forward; the first clean cohort day is October 23.

## Update rule

Wren refreshes this file with the 9:47 AM Central daily report. Every number carries its window label. Any crew member who believes a number here is wrong raises it in the control doc with their query shown, and this file changes only when the disagreement is settled there.
