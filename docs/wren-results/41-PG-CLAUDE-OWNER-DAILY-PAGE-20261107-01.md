# WREN-RESULT: PG-CLAUDE-OWNER-DAILY-PAGE-20261107-01

## Task as received

- Source: issue 41 comment 6717425391, MeepTheTendie, 2026-11-08T04:51:19Z
  (https://github.com/MeepTheTendie/pokergym/issues/41#issuecomment-6717425391)
- correlation_id: PG-CLAUDE-OWNER-DAILY-PAGE-20261107-01
- scope: Vote on a read-only, owner-facing daily stats page Wes asked for
  (one place on his phone for FB, IG and PostHog daily stats + trend).
  Full proposal: https://github.com/MeepTheTendie/pokergym/issues/51#issuecomment-6717424315
- inputs: #51 comment 6717424315; your daily brief; PostHog decision
  dashboard 2263366; docs/analytics-metrics.md.
- actions: (1) Say yes / no / change. (2) Confirm or edit the 6-metric
  list. (3) Say whether your daily brief can add a small machine-readable
  block (date, values, source) that the page mirrors verbatim.
- return: docs/wren-results/41-PG-CLAUDE-OWNER-DAILY-PAGE-20261107-01.md
  on wren/staged-updates.
- Default if nothing by Nov 8 6 PM CT: Claude builds v1 mirroring your
  latest brief.

## What was run

1. Read the full proposal: issue 51 comment 6717424315 (Claude, 2026-11-07
   ~10:55 PM CT, at Wes's direct request). Read-only, pull model, Wes looks
   when he wants, nothing sent to him. 4 to 6 numbers max, each with a
   7-day vs prior-7-day arrow: (1) PostHog clean visitors, (2) D1/D7
   return-to-game on mature cohorts, (3) FB views, (4) IG views/reach,
   (5) bio-link arrivals, (6) posts published. One plain-English line:
   "on track / flat / off track" against the 90-day expectation. $0.
2. Read docs/analytics-metrics.md from main. Canonical definitions confirmed:
   D1/D7 return-to-game is the primary metric; sample gates under 30
   eligible is too early, 30 to 99 directional, 100+ decision-grade;
   reporting days are America/Chicago; the PostHog decision dashboard is
   2263366 and `npm run report` is the reconciliation source.
3. PostHog live check, project 670990, via the registered custom.posthog
   connection: distinct `$pageview` persons over the last 7 Chicago days.
   Error null, result 55. That is a raw unfiltered count (no exclusion
   rules applied), an upper-bound sanity check only, not the clean report
   number. It confirms the dashboard's source data is live.
4. Latest daily brief checked (Nov 7 brief, control-doc-20261107.md and
   experiment-tracker.md): FB 7-day views 3,782, 28-day 7,296; IG 28-day
   views 3,992; running total since Oct 21: 180 visitors, 39 players,
   23 five-hand completers; 3 people have ever returned on a second day.
5. Recheck of issue 41 comments and open issues for other unprocessed
   WREN-TASK items: none. The three Nov 6 tasks are future-deadline
   scheduled work, not missed items (tracker record): data brief
   PG-CLAUDE-DATABRIEF-20261105-01 due Sun Nov 8, 6 PM CT; tracking
   review PG-CLAUDE-TRACKING-REVIEW-20261105-01 due Thu Nov 12, 6 PM CT;
   video review PG-CLAUDE-VIDEO-REVIEW-20261105-02 due Sun Nov 8, 6 PM CT.
   The cadence vote already has its result file (41-6707601706.md). No open
   issue is titled WREN TASK:.

## Verdict: CHANGE (conditional yes)

Yes to the page, with the edits below. No objection on the owner-silence
question: Wes asked for this himself, unprompted, and the page is pull-only,
nothing is pushed to him. It must stay pull-only: no push, no notification,
no chat message when it refreshes.

### Edit 1: metric list

Replace (6) posts published with five-hand completers (7-day count plus
running total). Posts published stays as an untrended context line
("1 post published today"), not a trended metric.

Reason: completers are the funnel stage between players and returners, and
the primary metric (D1/D7 return-to-game) will read empty for weeks. Only
3 people have ever returned on a second day and the D1/D7 denominator sits
below the 30-person sample gate, so the page needs a real progress number
now. Posts published is activity, not an outcome.

Final list: (1) PostHog clean visitors, (2) D1/D7 return-to-game on mature
cohorts, (3) FB views, (4) IG views/reach, (5) bio-link arrivals,
(6) five-hand completers. Posts published as context, not a metric.

### Edit 2: the status line needs a fourth state

"On track / flat / off track" plus "too early to judge" while the D1/D7
denominator is under the sample gate (under 30 eligible, per
analytics-metrics.md). "Off track" must not appear while the sample is too
small. The measurement mandate is directional only and forbids a
statistical verdict, and a 0 percent return rate on a denominator of a
handful of people is not a verdict.

### Edit 3: label the windows honestly

- FB views and IG views are trailing 7-day windows as of the brief date,
  not "today". My daily pull returns 7-day and 28-day Meta windows. Label
  them "last 7 days".
- PostHog numbers are per Chicago calendar day and can be labelled by date.
- Bio-link arrivals (5): keep, defined as PostHog first-touch source
  Instagram bio link (first_ref reels / utm_content link_in_bio), 7-day
  count. It is a subset of (1) clean visitors, not additive; the page must
  not sum (1) and (5).
- IG reach: include only when the connector returns it. If absent, the
  block carries IG views only and the page shows views, not reach.

### Machine-readable block: YES

Starting with the Nov 8 daily brief, the brief will carry a fenced
`pg-daily` block with: date (Chicago), visitors_7d, players_7d,
completers_7d, completers_total, d1_return_game (rate plus eligible n, or
null when immature), d7_return_game (rate plus eligible n, or null),
fb_views_7d, ig_views_7d, ig_reach_7d (when returned),
bio_link_arrivals_7d, posts_published (context), and source per value.
The page mirrors it verbatim and computes nothing new. D1/D7 come from the
same person-day data my daily PostHog pull already collects (the
ph-databrief prep files hold person_first, person_days, game_start and
session_complete), applying the maturity rule and sample gate from
analytics-metrics.md.

### Default clause

This vote is delivered before Nov 8 6 PM CT, so the default does not
trigger. Claude builds v1 from this edited list, not from the unedited
proposal.

## Bounds

Read-only vote. No merges, deploys, publishing, scheduling, spend, or
account / permission / secret changes. The Nov 1 to 12 matched test is
untouched. No issue comment and no PR (blocked for this token, 403,
"Resource not accessible by personal access token", known and not retried).

## Blocker

None.
