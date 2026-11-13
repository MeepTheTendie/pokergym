# Reel retention baseline, Oct 17 – Nov 12, 2026

Source: Meta Business Suite lifetime exports pulled by Wes on 2026-11-13 (Facebook Page and Instagram, Oct 1 – Nov 13). Raw exports are not committed (public repo); figures below are computed from them by Claude.

## Totals (64 reels)

| | Views | Link/other clicks | Comments | Shares | Follows |
|---|---|---|---|---|---|
| Facebook (32 reels) | 11,554 | 7 total clicks | 2 | 0 | n/a in export |
| Instagram (32 reels) | 5,112 | n/a | 0 | 1 | 0 |

## Facebook by era (median views, median average seconds viewed)

| Era | Reels | Median views | Median avg seconds viewed | Median length |
|---|---|---|---|---|
| Long, Oct 18–25 | 13 | 225 | 4.0 s | 39 s |
| Short, Oct 26–31 | 7 | 160 | 2.5 s | 13 s |
| Hook test, Nov 1–12 | 12 | 253 | 2.7 s | 13 s |

## Findings

1. **Viewers leave at second 2–3.** Hook-test reels held ~20% of a 12–15 s clip. The question, answer and CTA are mostly never seen, so caption/CTA/link tuning has little to work on until the first seconds improve. (Matches Wren's Nov 8 brief: largest drop at 0:01–0:02 on every post.)
2. **Question-first vs answer-first: no clear winner.** FB QF ~490 vs AF ~395 mean views, driven by the Nov 7–9 FB distribution bump that lifted all formats; IG slightly favoured AF.
3. **What holds attention is a counter-intuitive claim or a visible puzzle in frame one:**
   - Oct 27 "You have a flush. Throw it away." — 1,518 FB views, 8.9 s of 12 s (~74%).
   - Nov 11 "Three pairs. Which two play?" — 9.6 s of 14 s (~69%), the only hook-test reel above 3.5 s; low reach (240).
   - Plain rules questions ("Banker five, which cards draw?", "Lowest total you'd stand on?") lose viewers at ~2 s.
4. **"Comment your answer 👇" produced 2 comments across 30+ captions.**

## Production direction (Claude, video owner)

From the next unrendered slate: every clip opens, in the first second and on screen, with a claim that sounds wrong or a puzzle readable at a glance (the Oct 27 pattern). Metric to beat: 3.0 s average seconds viewed on FB; target the Oct 27 level (>6 s).

## Automatic source for per-reel seconds watched (verified 2026-11-13)

No owner export needed. Windsor.ai connector `facebook_organic`, account `1448771821646352`, fields `date, reels_permalink_url, post_video_avg_time_watched` (milliseconds, lifetime, includes replays), `fb_reels_total_plays`, `post_video_view_time`. Use the permalink field to tell reels apart; querying with `post_id` returns zeros on the post row and the values on an unlabeled row. Checked against Wes's export: Nov 10 3,483 ms / 241 plays, Nov 11 9,593 ms / 240, Nov 12 2,088 ms / 204 — exact match. Instagram per-reel watch time is not in the export or confirmed in the connector yet.
