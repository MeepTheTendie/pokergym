# CLAUDE-RESULT: Business Suite daily pull, operator decision

Task: `docs/claude-tasks/business-suite-daily-operator.md` (Wren, `wren/staged-updates` commit `9a78408`, Nov 7, 2026)
Result by: Claude (integrator), scheduled run 2026-11-07 ~5:15 PM CT
Status: **CONDITIONAL** — split decision below; the browser-capture operator is not confirmed.

## Finding that changes the scope

Windsor `facebook_organic` (already connected, read-only, $0 trial) returns per-Reel Facebook
metrics that Wren's books list as "not available". Read by Claude this run, Nov 1–7 Reels:

| Date | Reel | Plays (`blue_reels_play_count`) | Avg watch (`post_video_avg_time_watched`, ms) | Total watch (`post_video_view_time`, ms) | Follows | Shares |
|---|---|---|---|---|---|---|
| Nov 1 | facebook.com/reel/1379879747327451 | 247 | 2369 | 585144 | 0 | 0 |
| Nov 2 | facebook.com/reel/952026531034214 | 230 | 2167 | 498582 | 0 | 0 |
| Nov 3 | facebook.com/reel/1146434461241193 | 238 | 2465 | 586725 | 0 | 0 |
| Nov 4 | facebook.com/reel/1144791751325068 | 107 | 1844 | 197391 | 0 | 0 |
| Nov 5 | facebook.com/reel/2568899306909842 | 203 | 2478 | 503108 | 0 | 0 |
| Nov 6 | facebook.com/reel/2222877705273219 | 266 | 3206 | 853045 | 0 | 0 |
| Nov 7 | facebook.com/reel/1696257261843197 | 2 | 3455 | 3455 | 0 | 0 |

Values exactly as returned (lifetime to date at read time; Nov 7 is ~1 h old). Unit is ms per
Windsor's field description. Every Nov 1–5 Reel with 100+ plays reads under 3.0 s avg watch.

Fields from Wren's spec this covers via API: post permalink, publish date, plays, average watch
time, total watch time, follows, shares (reactions/comments fields also exist). Not available
via this connector: the retention curve / largest drop-off timestamp, 3-second view count for
Reels, follower vs non-follower split, traffic source, link-clicks state.

## Decision (Claude as coordinator, per owner's Nov 7 instruction to decide within the crew)

1. **API-available fields — owner: Claude.** Read through Windsor (sanctioned Meta API, no
   login, no session to expire, no automated-collection risk) and posted on #51 with the daily
   hold-time cross-check. Wren consumes them; she may also pull the same Windsor fields herself.
2. **Browser capture (retention curve, 3 s views, follower split, traffic source) — operator
   NOT CONFIRMED.** No agent has shown it can hold a stable Business Suite session:
   - Claude cannot: runs in the cloud with no browser on the owner's desktop, and its standing
     bounds forbid Meta actions outside Metricool scheduling.
   - Wren cannot: owner ruling Nov 7.
   - Beam/DeepSeek: build owners per Wren's spec, but no session test exists. Driving the owner's
     own logged-in Meta session with automation is the account-risk case Wren's spec names
     (Meta automated collection terms) — an account decision that is the owner's.
   So the browser capture stays the **fallback**: an owner export (his 6-step PDF procedure) only
   when the crew actually needs the curve, e.g. once for the Nov 19 seven-day read.
3. **Smallest owner action, only if the crew wants daily browser capture:** Wes states whether
   an agent may drive his logged-in Business Suite session on his desktop (accepting that
   account risk). Without that, nothing further is built; the API path above covers the daily
   hold-time metric.

Nothing was written to Meta, Metricool or the Nov 1–12 queue.
