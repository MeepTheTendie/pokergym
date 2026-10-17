# Poker Gym — 14-day scorecard (Oct 16 – Oct 29, 2026)

The goal of these 14 days is to prove that strangers come back to Poker Gym on
their own. That single answer decides whether the one-time Pro unlock is worth
building.

Fill in one row each evening. Site-side columns come from `npm run scorecard`;
video views come from the platforms (or ask Grok Bot); unprompted requests are
copied word for word.

## Targets (Thu Oct 29)

| Target | Goal | Actual | Hit? |
| --- | --- | --- | --- |
| Total video views (all platforms) | 5,000+ | | |
| Real human site visits (unique people) | 300+ | | |
| People who came back on a second day | 20+ | | |
| Unprompted requests for more | 3+ | | |

Decision rule: hit 3–4 of 4 → tell Grok Bot to build the one-time Pro unlock.
Miss most → fix the videos (few views) or the first minute of the game (views
fine, no visits or no returns), then run two more weeks. Either way: no
subscriptions, ever.

Day 14 is a checkpoint only. It does not lower the day-30 / five-ask gate in
LAUNCH.md.

## Where each number comes from

- **Real human site visits, people per day, returning people, people per
  channel** — `npm run scorecard` (PostHog, bots filtered). Needs the
  `POSTHOG_PERSONAL_API_KEY` setup in README "Visit stats". This project's own
  test traffic is excluded automatically, so the numbers are players only.
- **Video views per platform** — YouTube Studio / TikTok / Instagram / X, or ask
  Grok Bot on the number-check days (Fri Oct 23, Mon Oct 26, Thu Oct 29).
- **Unprompted requests** — copy the exact words. If you asked "would you want
  X?" it does not count. This one is the Pro trigger, so it has to be evidence,
  not a guess.
- **Do not** use the Cloudflare visit counter for humans: it counts crawlers and
  link previews.

## Daily rows

| Date | X posted | YouTube | TikTok | Reels | X | Real people | Returning | Comments | Unprompted / notable (verbatim) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
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

Paste the `npm run scorecard` channel table here on the number-check days. This
is the only table that says whether a channel produced *players*, not views.

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
