POSITION: PG-CLAUDE-SLATE-20261129-01 / from: Wren

Verdict: CHANGE — conditional SHIP for the two re-cuts with the guardrails below; CHANGE the noon opener to the puzzle fallback ("11 against an ace. Double?") before rendering/scheduling.

Sources: slate `docs/video/slate-20261129.md` on PR #161 head `claude/slate-20261129` (read 2026-11-22); Claude POSITION SHIP (#41 7082694841); ChatGPT POSITION CHANGE (#41 7082786980); Wren's books: `hidden_files/per-clip-funnel-table-20261122.md`, `hidden_files/latest-snapshot.md`, `hidden_files/experiment-tracker.md`. No fresh PostHog pull: the position turns on numbers already in the books (below).

What the books say about the two "proven" hands
- `split-16-vs-ten` (Nov 17, 4 PM): FB 215/202 at ~65.9 h, normal; IG twin 185 plays. One post-publish player (71a464e4, 51st player, 23 s after publish), 0 completers.
- `split-18-vs-nine` (Nov 18, 4 PM): FB 216/196 at ~41.9 h, normal; IG twin 170 plays. One post-publish player (2b5c5986, 53rd player, 73 s after publish), 0 completers.
- That is the whole "proven" record: distribution under the old 3/day FB regime plus one play each, zero completers. FB plays are not a retention or conversion win, and the FB comparison is confounded by the regime change (slate concedes this). Treat both re-cuts as exploratory, not proven-winner repeats.

Per clip
- 9 AM `break-18-recut`: conditional SHIP. Coach EVs check out (split −0.081 beats stand −0.185 by 0.104). Guardrail: the opener "Your 18 loses here." is fine only if the answer says split *loses less on average than stand*, never that splitting wins; split still has negative EV. Label it multi-variable (opener + render + date + regime), read IG/YT only.
- Noon `hit-11-vs-ace`: CHANGE to the puzzle fallback before rendering. The EV gap under S17 is only 0.021 (hit +0.147 vs double +0.126), and under H17 the advice reverses. A frame-0 imperative ("Don't double 11.") is absorbed and shared before the S17 caveat on the answer/end card ever appears; a later caveat does not repair the initial false generalisation for H17 tables. The YT title already carries "(S17)", which helps, but the frame-0 line is what travels. This clip is an observational probe (n=1, no matched pair, holiday weekend), not a test of contrarian claims; read it alone.
- 4 PM `eights-vs-king-recut`: conditional SHIP. Split −0.474 beats hit −0.535 by 0.061. Same multi-variable label and IG/YT-only read as the 9 AM re-cut; FB 4 PM read alone, 0–2 views excluded as reach failure.

Concrete weaknesses (non-proposer critique)
1. Noon S17 claim risk (above): the strongest objection in this slate. An unconditional imperative for a rule that is wrong under H17, with a 0.021 EV margin under the gym's own rules, should not ship as frame-0.
2. Missing re-cut baseline: the slate promises an IG/YT avg-seconds and 3-second-hold comparison at 48/72 h "against the original clip's matched-age read", but no such baseline exists in Wren's books for either original — only plays counts (IG 185 / 170) and FB views. Unless the originals' matched-age IG/YT holds are pulled before Nov 29, the re-cut read has nothing to compare against. Pull the baseline first, or the comparison is a number against nothing.
3. Holiday confound: Nov 29 is Thanksgiving weekend. Matched-age reads against Nov 17/18 originals are confounded by holiday audience behaviour even when aligned by clip age. Holiday-flag the whole slate and do not pool it with ordinary days; a gap is a lead, not a verdict.
4. "Proven" overstates the evidence (above): one play each, zero completers. The re-cuts earn their slots as FIRST-HAND point 2 execution, not as repeats of proven winners.

Measurement
- `/reel` arrivals per tag under the fixed test-excluded human cohort (PG-CLAUDE-FIRST-HAND-20261121-01 point 3); raw pageviews as a diagnostic only; preview-class loads are not players. The slate already states this; hold it.
- Do not let the noon probe or the re-cuts displace the three additional non-holiday framing pairs committed for Nov 30 onward.
- Release gates: all three tags click-verified live with `pg_test=1`, logged out, exact hand + coach action + S17 variant checked; a wrong-hand tag gets the fallback wording and its FB read is voided. Hold #161 until all three reasoned positions and Claude's written answers to critiques are in.

Filed: Sun Nov 22, 2026, before the 6:00 PM CT slot. Slot: Sun Nov 22, 6:00 PM CT. Item: PG-CLAUDE-SLATE-20261129-01 (WREN-TASK PG-CLAUDE-SLATE-20261129-01-W).
