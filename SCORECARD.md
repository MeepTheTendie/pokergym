# Poker Gym — 14-day launch archive (Oct 16 – Oct 29, 2026)

**Historical record only.** This file is not a decision tool. The current
decision surface is the PostHog decision dashboard
(<https://us.posthog.com/project/670990/dashboard/2263366>) and its
reconciliation source is `npm run report`. See `docs/analytics-metrics.md`.

The old 3-of-4 rule is retired. It could pass on video views, site visits, and
unprompted comments while zero people returned to play, so it did not test the
stated hypothesis. The current primary metric is D1/D7 **return-to-game** among
mature first-touch cohorts.

## Historical targets (Thu Oct 29)

These were the original launch targets, kept for the record only.

| Target | Goal | Actual | Hit? |
| --- | --- | --- | --- |
| Total video views (all platforms) | 5,000+ | | |
| Clean pageview visitors (browser profiles) | 300+ | | |
| People who came back on a second day | 20+ | | |
| Unprompted requests for more | 3+ | | |

Day 14 is a checkpoint only. It does not lower the day-30 / five-ask gate in
LAUNCH.md. Do not use this table to decide whether to build the Pro unlock.

## Where each number came from

- **Site numbers** — `npm run scorecard` for the historical UTC view;
  `npm run report` and the PostHog decision dashboard for the current Chicago-day
  definitions. Neither produces verified humans; they are browser profiles that
  survived the exclusion rules.
- **Video views per platform** — YouTube Studio / Instagram / X. TikTok account
  banned 2026-10-18; channel retired. Platform view definitions are not
  comparable, so do not add them into a product decision.
- **Unprompted requests** — copy the exact words. If you asked "would you want
  X?" it does not count. This is qualitative evidence, not a willingness-to-pay
  metric.
- **Do not** use the Cloudflare visit counter for humans: it counts crawlers and
  link previews.

## Daily rows

| Date | X posted | YouTube | FB Reels | Clean browser profiles | Returning | Comments | Unprompted / notable (verbatim) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fri Oct 16 | | | | | | | | | |
| Sat Oct 17 | | | | | | | | | |
| Sun Oct 18 | | | | | | | | | |
| Mon Oct 19 | | | | | | | | | |
| Tue Oct 20 | | | | | | | | | |
| Wed Oct 21 | | | | | | | | | |
| Thu Oct 22 | | | | | | | | | |
| Fri Oct 23 | | | | | | | | | |
| Sat Oct 24 | | | | | | | | | |
| Sun Oct 25 | | | | | | | | | |
| Mon Oct 26 | | | | | | | | | |
| Tue Oct 27 | | | | | | | | | |
| Wed Oct 28 | | | | | | | | | |
| Thu Oct 29 | | | | | | | | | |

## Channel check — "make more of what works"

The `npm run scorecard` channel table was the original launch view. It is kept
here as an archive only; the current source-quality table is in the PostHog
decision dashboard and `npm run report`. Views were never players.

| Date | ref | People |
| --- | --- | --- |
| Fri Oct 23 | | |
| Mon Oct 26 | | |
| Thu Oct 29 | | |

## Notes

- Views on a platform are not players. A Short with 2,000 views and 0 tagged
  visits tells you the hook got attention and the link did not.
- Every link must carry its channel tag (`?ref=…`, plus `&utm_content=<hook>`).
  See the tagging convention in MARKETING.md.
