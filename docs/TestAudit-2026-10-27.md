# Poker Gym test audit (Oct 27, 2026, Grok)

Read-only. Repo at 783146a after `git pull`. Node v20.19.2 on the box.

## Measured
- Unit suite (`node --test test/*.test.js`): **377 tests, 377 pass, 0 fail, ~14 s wall** (13.9 s reported).
- Release suite (`test/release/*.test.js`): **15 tests, 15 pass, ~0.4 s**.
- **Total: 392 tests.**
- Note: `npm test` reports "Could not find test/*.test.js" on Node 20. It depends on Node 22+/24 globbing (commit 6a99d39). On older Node it runs **zero tests** without failing loudly.
- Runtime is almost all strategy solving: blackjack-pairs-a 9.6 s, blackjack-pairs-b 8.5 s, blackjack 7.9 s, videopoker 3.8 s, drills 2.6 s, variants 1.3 s (per-file runs; they run in parallel). Every other file finishes in under 0.5 s.

## Per-file verdict
| File | Tests | Time (s, alone) | Verdict | Reason |
|---|---|---|---|---|
| blackjack.test.js | 55 | 7.9 | KEEP 30 / MERGE 8→1 / CUT 11 | The rules, payouts, dealer distribution and EV tests are core. 9 "coach plays X,X vs Y" pair spot checks duplicate the full pair chart in the pairs files (9,9 vs 7/8/10, 5,5 vs 2/3, 4,4 vs 5, 7,7 vs 2, 6,6 vs 7, 10,10 vs 2) → cut. The other 8 spot checks → one table test. Cut "rank names cover every rank" and "hand count is capped" (trivial). |
| blackjack-pairs-a/b | 10 | 9.6 / 8.5 | KEEP | The full pair-splitting chart. This is the most valuable kind of test. Slow, but the split was already made for parallelism (824deee). |
| evaluate.test.js | 31 | 0.15 | KEEP 18 / MERGE 13→1 | The 13 "classifies <hand>" tests become one table test. Tie-break and best-of-7 tests stay. |
| videopoker.test.js | 28 | 3.8 | KEEP 15 / MERGE 12→1 / CUT 1 | The 12 "optimal play holds N on <hand>" tests become one table test. Cut "card labels render for a dealt hand" (display only). |
| variants.test.js | 16 | 1.3 | KEEP | Pay tables per variant. Includes the Bonus Poker quad-kicker regression (e702224). |
| baccarat.test.js | 17 | 0.46 | KEEP | Tableau draw rules, payouts and exact probabilities. Could fold "the correct quiz choice is not pinned to a fixed button position" in elsewhere, but it's cheap. |
| holdem.test.js | 8 | 0.25 | KEEP | Best-five grading. |
| rpg.test.js | 34 | 0.16 | KEEP 26 / MERGE 8→3 | XP, streak, badges and save migration are core. The 8 lesson-bookkeeping tests (lookup null, done once, doesn't mark others, no mutation, new profile has none, intro/tips split, valid lesson exists) → about 3. |
| daily.test.js | 16 | 0.18 | KEEP | Streak, rest-day, seed and backup logic. |
| drills.test.js | 15 | 2.6 | KEEP | Weak-spot and mastery logic, plus legacy-save acceptance. |
| practice.test.js | 14 | 0.43 | KEEP | Accuracy and persistence. Includes Hold'em and VP retry regressions. |
| backup.test.js | 4 | 0.15 | KEEP | Save import/migration. Losing a save is the worst bug possible for a returning-player goal. |
| analytics.test.js | 24 | 0.25 | KEEP 17 / MERGE 6→1 / CUT 1 | Event-flow tests guard real funnel bugs (dc6384b, 72b258b, 834857f). 6 tests grep app.js source text for where calls sit (lines 239-298: "lives inside startDaily", "fires in startGym", etc.). They're brittle and break on harmless refactors → one wiring check. Cut "progress bar is driven by JS" (UI implementation detail). |
| analytics-order.test.js | 1 | 0.2 | MERGE into analytics.test.js | Source-string order check that guarded a real bug (78a345f). Keep the intent, but put it in one file. |
| analytics-report.test.js | 23 | 0.28 | KEEP | Chicago-day, DST, bot exclusion and Wilson math. This is what makes the reports trustworthy, and several tests came from real miscounts. |
| worker.test.js | 21 | 0.22 | KEEP | /go redirect, security headers, and the unfurl-bot and headless filters. Each filter test maps to a fix commit (81d5257, da4c11f, d5db812). |
| links.test.js | 17 | 0.14 | KEEP 15 / MERGE 2→1 | "posthog-loader mirrors every REFERRER_REFS host" and "referrer map in posthog-loader exactly mirrors REFERRER_REFS" test the same thing. |
| proxy.test.js | 3 | 0.2 | KEEP | The PostHog /ingest proxy. If it breaks, analytics goes dark. |
| portable-links.test.js | 3 | 0.14 | KEEP | Offline/itch bundle. |
| keys.test.js | 8 | 0.13 | KEEP (low priority) | Keyboard controls. Cheap, and they catch real usability breakage. |
| audio.test.js | 21 | 0.24 | KEEP 4 / CUT 17 | Keep: tracks compile, the expected tracks exist, the SFX bank has every sound, drum letters map. Cut the 17 music-taste checks ("lounge loop is slow", "vegas comping is rootless voicings", "tempo band", "swing delays only the off-beat"...). The lounge track isn't played anymore (app.js:217 says "still defined, to switch back"). |
| tip.test.js | 3 | 0.15 | MERGE 3→1 | A static copy check. Keep only the "no personal name / no pricing" rule check, which is a real policy. The Ko-fi line test was already loosened once (f8c0afc). |
| feedback.test.js | 2 | 0.13 | KEEP | Encoding safety. |
| coach-meter.test.js | 2 | 0.15 | KEEP (brittle) | Source-grep regression guard for 0035be8. |
| haptics.test.js | 1 | 0.12 | KEEP | Cheap. |
| release/* | 15 | 0.4 | KEEP | Build, asset and SEO checks run at release. Fine as is. |

## Totals (proposed)
| | Tests |
|---|---|
| Current | 392 (377 unit + 15 release) |
| Cut outright | 30 (audio 17, blackjack 11, video poker 1, analytics 1) |
| Removed by merging | 43 (evaluate 12, video poker 11, blackjack 7, analytics 5, rpg 5, tip 2, links 1; the analytics-order test moves into analytics.test.js) |
| **After** | **about 319** (73 fewer) |

**Runtime saved: under 1 second.** The tests being cut are all millisecond-fast. The ~14 s wall time comes from the blackjack and video-poker strategy solvers, which are must-keep. The test count is not a speed problem. If speed matters, cache the solver results and don't touch the coverage.

## Under-tested must-keep areas
1. **Blackjack hard and soft totals.** Pairs are checked against the full chart (10 pairs × 10 upcards), but hard totals (5-17) and soft totals (A2-A9) only have about 8 spot checks. A wrong "stand 12 vs 2" would most likely ship. Add the hard and soft chart rows the same way the pairs files do.
2. **Video poker holds outside Jacks or Better.** Bonus, Double Double and Deuces each have 1-2 hold-strategy tests. Their pay tables are well covered, but their hold advice isn't.
3. **`npm test` silently runs nothing on Node 20.** Make sure every agent and CI runs Node 22+, or expand the glob in a script.
4. **Browser end-to-end checks** (`test:analytics`, `test:itch`, offline and storage) aren't part of `npm test`, so agents probably never run them.
5. **Hold'em** has 8 tests, all on best-five reading. That's fine for what it teaches today. If an equity or odds feature is added, it has no coverage.

## Bottom line
About 73 of the 392 tests are fat: music-taste checks, duplicate pair spot checks, and one-test-per-row tables. Trimming them makes the suite easier to read but won't make it faster. The real gap is missing chart coverage, not too many tests.
