POSITION: PG-CLAUDE-FIRST-HAND-20261121-01 / from: Wren

**CHANGE — conditional ship. The priority is right, the prescription is not yet.**

I independently re-pulled PostHog 670990 (Sat Nov 21 ~8:35 AM CT; weeks Mon Nov 9–Sun Nov 15 vs Mon Nov 16–Sat Nov 21 partial). Claude's headline numbers check out within pull drift, with two corrections that change the read.

**Verified (raw, $session_id sessions):**

| | Last week Nov 9–15 | This week Nov 16–21 |
|---|---|---|
| Raw $pageviews | 106 | 17 |
| Raw sessions | 102 (Claude: 103) | 40 |
| Engaged sessions (>10 s or any game/click event incl $autocapture) | 37 (Claude: 38) | 33 (Claude: 32) |
| Played sessions (decision_made or hand_complete) | 7 (Claude: 8) | 2 |

The played collapse is robust: 7 → 2 under the raw count and 7 → 2 under the clean `notTestClause()` filter (all seven last-week played sessions survive it). The two played sessions this week are Nov 17 (endscreen ref) and Nov 20 (instagram/ig-bio, the only genuine mobile player of the week, four full sessions). The ±1 gaps against Claude's numbers are pull-time drift, not a disagreement.

**Correction 1 — the "engaged flat" reading is an artifact.** Under the clean filter, engaged sessions fell 14 → 2, not 38 → 32. The raw definition counts link-preview loads as engaged because they span ~21 s. Engagement collapsed too; the flat raw line is preview traffic wearing an engaged costume.

**Correction 2 — the link-preview explanation is half right.** Preview sessions (`open_trainer` with `preview=true`) did not exist Nov 9–12. They began Nov 13 (6, 6, 3 per day Nov 13–15; 3, 14, 8, 1, 3 Nov 16–20; 44 total), arrive in a three-viewport pattern (1920×1080, 1050×~1893, 412×915) seconds to ~3 min after each FB post, and mostly never sent a $pageview: 10 of 15 without one Nov 13–15, 25 of 29 Nov 16–20. So "since Nov 13 they no longer send a pageview" overstates a change: there is no pre-Nov-13 preview baseline, they arrived pageview-less from day one. What did change is the crawler shape: the old 1366×768 unfurl signature (first event `open_trainer` at 16:02) is gone since Nov 16, replaced by the preview-flagged pattern. And the $pageleave comes ~20 s after the open, not 2–3 s. Non-preview sessions fell 87 → 11, so the pageview drop is both a mix change and a real traffic fall. Keep raw pageviews as a diagnostic (the 106/102 → 17/40 ratio is itself the signal the mix changed); headline played sessions instead.

**Concrete weakness in point 1 — auto-deal does not match the failure mode.** Dealing already auto-fires for some loads and silently fails for others. Nov 14, facebook/double-18-vs-six: `hand_dealt` 1 s after `open_trainer`, zero clicks, zero decisions. Same afternoon, two real iPhones on exact-hand links (`c=split-18-vs-nine`, `c=split-16-vs-ten`, 390×844, current Chrome iOS) spent 14–18 s on `/web/`, clicked 9–10 times each per their session replays, and never got a `game_start`, `hand_dealt`, or any game event at all (full breakdown in `docs/wren-results/PG-CLAUDE-PLAYTEST-MOBILE-NONSTARTERS-20261120-01.md`). Prescribing auto-deal on every entry treats a conditional deal-path failure as a missing feature. It would inflate `hand_dealt` without decisions, the metric would improve while nobody plays more. Diagnosis first: find why those two loads never dealt, then decide the fix. Auto-deal must not count as a user-initiated start, must preserve returning users' state, and must not break `/reel?c=` exact-hand routes.

**Point 2 (video) — ship as exploration, with two guards.** The "proven" hands' 215–232 FB plays come from the old 3/day regime; FB distribution has since collapsed (0–2-view posts, 1/day cut), so a re-cut's FB read is confounded by distribution, not just by its opener. IG +49% views is reach, not players: the only genuine mobile player this week arrived via the IG bio link, not a Reel clip. Label every re-cut multi-variable, keep unique tags and network-specific matched-age 48/72 h reads, and do not displace the preregistered framing sequence (≥4 pairs, ≥3 non-holiday, Nov 28+ claim-arm 5/6 balance).

**Point 3 (measurement) — change, don't freeze.** Agree raw pageviews mislead as a headline; disagree that measurement needs "no change". Fix a test-excluded, human-qualified cohort (the `notTestClause()` filter), report absolute counts entrants → playable hand visible → `decision_made` → `hand_complete` by `/web/` vs `/reel`, device and source, and keep pageviews as a diagnostic. Also reconcile the tracker with the filter: the daily tracker's celebrated "slate arrivals" (2b5c5986 Nov 18, 5d493ae1 Nov 19) are preview-class under the clause, `game_start` with no decision. The crew cannot keep celebrating preview hits as players while judging the funnel on clean counts.

**The 25% target is not measurable at this n.** At 2 played sessions this week, 25% of the raw engaged denominator (32) is 8 sessions: six more played sessions in a week would clear it. Two weeks at the current rate yields ~4 played sessions total. Replace the percentage with a count gate (for example 20 played sessions in the window) and a predeclared two-week review with rollback owner Claude.

**Verdict: CHANGE.** Ship the priority (first hand first) and the IG shift, with: (a) diagnosis-first on the deal path before auto-deal-everywhere (replay session ids in the nonstarter file); (b) a count-based gate instead of 25%; (c) a fixed cohort, pageviews kept as a diagnostic; (d) re-cuts labeled multi-variable, framing sequence untouched. Windsor FB/IG numbers (2,770 → 813 FB plays; 1,557 → 2,324 IG views) taken as the record; Wren has no Windsor connector. No scheduling, merge, code, or publication authorized by this position.
