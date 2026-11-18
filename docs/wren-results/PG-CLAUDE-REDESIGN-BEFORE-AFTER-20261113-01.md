# Wren result: PG-CLAUDE-REDESIGN-BEFORE-AFTER-20261113-01 (FULL RESULT)

Filed: Wed Nov 18, 2026, morning CT, by Wren/Muse. Source task: issue #41
comment 6867926169, posted 2026-11-13T23:52:38Z (5:52 PM CT). This file
replaces the Fri Nov 13 receipt at this same path, as the receipt said it
would. Return path: branch `wren/staged-updates`, for the integrator to cite
on #41. Wren cannot post #41 comments directly (token 403).

Status: COMPLETE. All three windows are fully closed; nothing is still
maturing. Deadline met: Wed Nov 18, 6:00 PM CT.

## Confound box (read first)

1. **#60 and #44 cannot be told apart.** They landed in the same deploy,
   Fri Nov 13, 7:12 PM CT, bundled with #127, #91, and #92. This result
   reports the bundle as one combined redesign effect. The ledger records
   "analytics cannot separate #60's effect from theirs."
2. **The #55-only after-window is 1 hour 23 minutes, n = 1 landing
   visitor.** The 3-hour minimum spacing rule (OPERATING_RULES, PR #126)
   was not met; Wes set the #60 time himself, so this is recorded as his
   call, not a crew error. Nothing about #55 alone can be concluded from
   the sliver.
3. **Wrong-hand flag.** Every blackjack `/reel?c=` link dealt new visitors
   the intro hand (9 vs 2) instead of the clip's hand, since at least Nov
   13, until the fix verified Nov 17 ~7:46 AM CT (Claude #41 comment
   6949934526). The entire AFTER window is pre-fix for blackjack arrivals,
   so all blackjack deep-link funnel numbers in it carry the "wrong hand
   dealt" flag. Video poker links were fine. Link-to-arrival timing still
   validates attribution; the hand-match experience does not.
4. **The AFTER window coincides with two dead Facebook posts.** Nov 14
   4 PM: 1 view at ~77 hours. Nov 16 4 PM: 2 views, 1 unique viewer, at
   ~29 hours (Nov 17 evening pull). Site traffic is post-driven, so the
   AFTER drop below confounds deploy effect with post distribution. The
   BEFORE and AFTER windows also cover different post sets. This is a
   before/after of the site, not a controlled test.
5. **Tiny n throughout.** No statistical verdict, no claim that one deploy
   caused a result. Directional only, per the measurement mandate.
6. **Receipt date correction.** The receipt said the bundle's 3-day-after
   window "closes Tue Nov 17, ~7:12 PM CT." That is off by one day. Nov 13
   19:12 CT + 72 hours = Mon Nov 16, 19:12 CT. The windows used here are
   the corrected 72-hour windows; the deadline still held either way.

## Task as received

WREN-TASK: PG-CLAUDE-REDESIGN-BEFORE-AFTER-20261113-01
from: Claude (integrator)
correlation_id: PG-CLAUDE-REDESIGN-BEFORE-AFTER-20261113-01
scope: Before/after readout for the three player-facing deploys, so we can tell their effects apart.
inputs: deploy log in ledger #51 "Deploy queue". #55 playable home page deployed **Fri Nov 13 5:49 PM CT**. #60 trainer restyle is due at the Sat 9:09 AM run, and #44 first-visit one-tap deal at the Sat 2:09 PM run; use the exact times logged there. PostHog with the crew exclusions (cohorts 709897 and 644643, `pg_test`).
actions: For each deploy, compare the 3 days before with the 3 days after. Home page: landing `cta_click` per landing visitor, and landing → `/web/` arrivals. Trainer: `open_trainer` → `start_training`, and five-hand completion. #44 only: `open_trainer` with `first_screen=quick_deal` → `start_training` in the same session (exclude `preview:true`). Report raw counts as well as rates; small numbers are fine.
Also, from your **Sun Nov 15 weekly readout** on: report "product changes shipped vs. target (3/week)" separately from docs and ops work (OPERATING_RULES "Shipping cadence"). This week's product merges: #116, #117, #90, #125, #55.
return: `docs/wren-results/PG-CLAUDE-REDESIGN-BEFORE-AFTER-20261113-01.md`
bounds: read-only. No tracking changes.
deadline: **Wed Nov 18, 6:00 PM CT** (#44 needs 3 days after Sat). Default if late: returned to you with a new slot.

## Deploy times as logged (ledger #51) and what changed after the task was posted

The task was posted Fri Nov 13, 5:52 PM CT. Its deploy assumptions were
overtaken within the hour, by Wes himself. The exact logged times, read from
#51 comments 6867925850, 6868157568, and 6869195793:

- #55 playable home page: merged 28852038 (2026-11-13T23:47:16Z), deployed Fri Nov 13, 5:49 PM CT. Matches the task.
- #60 trainer restyle: the task says Sat Nov 14, 9:09 AM run. Wes moved it live at Fri Nov 13, ~6:05 PM CT to Fri Nov 13, 7:05 PM CT. It merged as 73ddfd1 at about 7:03 PM CT and went live at 7:12 PM CT in the deploy of 3cd6082.
- #44 first-visit one-tap deal: the task says Sat Nov 14, 2:09 PM run. It was instead merged between 7:03 and 7:12 PM CT on Fri Nov 13 and reached production in the same 7:12 PM CT deploy as #60, together with #127, #91, and #92.

## Windows used

All America/Chicago, half-open [start, end):

- BEFORE: Mon Nov 10, 5:49 PM CT → Fri Nov 13, 5:49 PM CT (72 h before #55).
- SLIVER (#55 only): Fri Nov 13, 5:49 PM CT → 7:12 PM CT (1 h 23 m, tiny n).
- AFTER (bundle): Fri Nov 13, 7:12 PM CT → Mon Nov 16, 7:12 PM CT (72 h after).

## Method and exclusion (exactly as applied)

PostHog project 670990, HogQL via the established helper, run Wed Nov 18
morning. All timestamps compared in America/Chicago with an explicit
timezone. Raw query outputs are saved at
`redesign-results-20261118.json` in the daily-report goal's hidden files
(60 queries); the runner is `redesign_queries_20261118.py` in the same
folder.

Exclusion: the repo's `notTestClause()` from `scripts/stats.mjs`, applied
verbatim. It drops probe events (`iso_probe`, `pg_probe_batch`,
`pg_proxy_probe`, `pg_proxy_probe2`, `attrib_probe`, `diag_manual_probe`,
`diag_pipeline_check`, `manual_probe`), three probe distinct_ids, five
automation person_ids, `person_id NOT IN COHORT 644643` (PostHog internal /
test users) and `person_id NOT IN COHORT 709897` (crew link checks), refs
`attribcheck` / `funnel-check` on `ref`, `first_ref`, and `session_ref`,
the `Edge/12.246` automation user agent, the person-level unfurl-bot /
single-pageview headless / preview-only rules, and virtual traffic types
Bot, Automation, and AI Agent.

Two notes on the task's exclusion as written:

- **`pg_test` appears nowhere in the data.** A probe over the full span
  for `ref`, `session_ref`, `first_ref`, or `utm_content` containing
  "test" or equal to `pg_test` returned zero rows. There is no `pg_test`
  marker to filter on; the exclusion applied is `notTestClause()` as
  above, which covers the two cohorts the task names.
- **Raw counts are reported alongside clean counts everywhere**, so the
  exclusion's effect is visible. It is large in the AFTER window (see
  below); that is the filter doing its job on unfurl bots and preview
  loads, not a data error.

Same-session joins use `properties.$session_id`. A probe over the span
found `$session_id` present on 100% of `$pageview`, `open_trainer`,
`start_training`, `game_start`, and `session_complete` events, so the
joins are valid. They were cross-checked directly: in AFTER, the one
`start_training` session id matches none of the three quick-deal session
ids, and the BEFORE landing-to-web session count (2) equals its
person count (2).

Two grouped clean queries in the BEFORE window timed out at PostHog
(HTTP 504 Gateway Timeout, twice in the main run and twice on retry):
the clean `cta_click` location split and the clean `open_trainer` /
`start_training` preview split. What is reported instead: the cta split
is derived exactly, because BEFORE clean equals BEFORE raw for
`cta_click` (4 clicks, 3 persons, both variants) and the span probe
plus the SLIVER split account for every click (see the home-page table).
The preview split is reported from raw with the limit stated. No
`start_training` event in any window carries `preview = true` (raw), so
the open-to-start rate is not polluted by auto-fired preview loads in
any window.

Reconciliation: raw event totals summed across the three windows equal
the span probe totals for every event (`$pageview` 67, `open_trainer`
56, `start_training` 14, `game_start` 13, `session_complete` 4,
`cta_click` 6). The windows tile the span with no overlap and no gap.

Context: the Nov 17 morning pull had the epoch since Oct 21 at 304
visitors, 50 players, 27 five-hand completers. These three windows are a
small slice of that epoch.

## Results

### Home page (#55): landing `cta_click` per landing visitor

| Measure (clean) | BEFORE | SLIVER | AFTER |
|---|---:|---:|---:|
| Landing visitors (persons with `$pageview` on `/`) | 10 | 1 | 5 |
| Landing pageviews (events) | 12 | 2 | 5 |
| `cta_click` events / persons | 4 / 3 | 2 / 1 | 0 / 0 |
| CTA persons per landing visitor | 30% (3/10) | 100% (1/1) | 0% (0/5) |

Raw `cta_click` is identical to clean in all three windows: no excluded
traffic clicked a CTA. Raw landing visitors: BEFORE 10, SLIVER 1, AFTER 8
(the exclusion removes 3 AFTER landing visitors).

`cta_click` carries no `button` property (null on all 6 clicks in the
span); the split is by `location`. BEFORE: hero 1, how_it_works 1,
sticky_mobile 1, tile_baccarat 1 (4 clicks, 3 persons; one person clicked
twice). SLIVER: header_button 2 clicks, 1 person (the single sliver
visitor clicked twice). AFTER: no clicks at all.

### Home page (#55): landing → `/web/` arrivals

| Measure (clean) | BEFORE | SLIVER | AFTER |
|---|---:|---:|---:|
| `/web/` visitors (persons) | 11 | 1 | 6 |
| `/web/` pageviews (events) | 15 | 2 | 6 |
| Landing → `/web/`, same session (persons) | 2 | 1 | 0 |
| Same-session rate (of landing visitors) | 20% (2/10) | 100% (1/1) | 0% (0/5) |

Raw `/web/` visitors: BEFORE 20, SLIVER 1, AFTER 19. The exclusion
removes 9 BEFORE and 13 AFTER `/web/` visitors: deep-link arrivals are
where the excluded traffic lands, while landing pageviews are almost
entirely human. In AFTER, all 6 clean `/web/` visitors arrived without a
landing pageview in the same session (deep links); none of the 5 landing
visitors reached `/web/` in-session. In BEFORE, 2 of 10 landing visitors
did. Paths in the span are only `/` (22 pageviews, 18 persons, raw) and
`/web/` (45 pageviews, 40 persons, raw).

### Trainer (#60, bundle): `open_trainer` → `start_training`, five-hand completion

| Measure (clean) | BEFORE | SLIVER | AFTER |
|---|---:|---:|---:|
| `open_trainer` events / persons | 14 / 10 | 2 / 1 | 6 / 6 |
| `start_training` events / persons | 9 / 7 | 2 / 1 | 1 / 1 |
| `game_start` events / persons | 10 / 6 | 0 / 0 | 1 / 1 |
| `session_complete` events / persons | 4 / 4 | 0 / 0 | 0 / 0 |
| Five-hand completions (events, `event_version` 2 + `hands_completed` 5) | 4 | 0 | 0 |
| Open → start rate (persons) | 70% (7/10) | 100% (1/1) | 17% (1/6) |

Raw for comparison: BEFORE `open_trainer` 26 events / 22 persons,
`start_training` 10 / 8, `game_start` 11 / 7, `session_complete` 4 / 4.
SLIVER raw equals clean on every measure. AFTER raw: `open_trainer`
28 / 28, `start_training` 2 / 2, `game_start` 2 / 2,
`session_complete` 0 / 0. The exclusion removes 22 of 28 raw
`open_trainer` events in AFTER: the scheduled-post unfurl bots (posts at
4 PM CT, bots landing 4:00-4:05 PM with first event `open_trainer`) and
preview-only loads. Preview-true `open_trainer` events (raw): BEFORE 6,
SLIVER 0, AFTER 12. No `start_training` event in any window carries
`preview = true`.

### #44 only: `quick_deal` funnel, same session

| Measure (clean) | BEFORE | SLIVER | AFTER |
|---|---:|---:|---:|
| `open_trainer` with `first_screen = quick_deal`, `preview != true` (events / persons) | 0 / 0 | 0 / 0 | 3 / 3 |
| Of those, `start_training` in the same session (persons / events) | 0 / 0 | 0 / 0 | 0 / 0 |

Raw AFTER: 13 opens / 13 persons, still 0 starts. Ten of the 13 raw
opens were excluded traffic. BEFORE reads 0 by construction: the
feature was not live before the bundle, so a nonzero BEFORE read would
have been a finding; there is none. Quick-deal opens in the span
(`first_screen = quick_deal`, raw): 13 non-preview, 2 preview; all 15
fell in the AFTER window.

## Verdicts (one line per deploy)

- **#55 playable home page: no measurable lift in the data.** Landing
  visitors 10 → 5 and CTA persons 3 → 0 across the 72-hour windows, but
  n is tiny and the AFTER window coincides with two flatlined Facebook
  posts, so this is not a verdict on the home page. The sliver (1
  visitor, who clicked twice and reached the trainer) says nothing.
- **#60 trainer restyle (bundle): open-to-start fell 70% → 17% in
  persons and five-hand completions 4 → 0, but the same confounds apply
  (tiny n, dead posts in AFTER, wrong-hand flag on blackjack arrivals),
  and the effect cannot be separated from #44 or from #127, #91, #92.**
  No verdict on the restyle itself.
- **#44 first-visit one-tap deal: 3 clean opens, 0 starts in 72 hours.**
  No conversion observed; n is too small for a verdict, and 10 of 13 raw
  opens were excluded traffic.

## Weekly readout addition (from Sun Nov 15 on)

Done: the Sun Nov 15 weekly readout reported "product changes shipped
vs. target (3/week)" separately from docs and ops work. Flag carried
from the receipt, now closed: the task's merge list (#116, #117, #90,
#125, #55) omitted the Nov 13 evening merges (#60, #44, #127, #91,
#92); the readout verified the week's merge list against the merge log
before naming a count.

## Bounds held

Read-only. No tracking changes, no spend, no account, permission, or
secret changes, no publishing or scheduling, no change to the protected
Nov 1-12 matched test. No message to Wes about this result; his Nov 17,
9:14 PM CT instruction was "Tell the others, not me." This file is the
telling, on the crew path.
