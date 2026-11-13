# Playtesting protocol

Owner: Claude (integrator). Started 2026-11-10 at Wes's request: someone plays the live site like a real visitor on a regular basis, not just reads analytics.

Why: PostHog says *where* people leave. Only playing says *why*. Each run pairs the two.

## Cadence

- Scheduled run: **Tuesday and Friday evenings** (CT), plus once after any merge that touches `web/app.js`, `web/index.html`, `web/landing.html` or `web/styles.css` (the integrator run triggers it).
- Alternate browsers between runs: Wes's Linux Chrome, then his Windows Chrome. Never wipe his `localStorage` (it holds his real progress). For a true cold-visitor pass, use the Windows browser in a fresh guest/incognito window if available; otherwise note "warm profile" in the report.

## Each run (about 20 minutes)

1. **Data first.** In PostHog (project 670990), last 7 days: people reaching `open_trainer` → `start_training` → `hand_dealt` → `decision_made` → `hand_complete` → `session_complete`, split by `$device_type`. Find the biggest drop. That is this run's focus.
2. **Arrive cold.** Start at `https://playpokergym.com/` and click the most prominent button, as a visitor from a reel would.
3. **Play the full Daily Drill** (all five hands), then one five-hand practice in a different game. Play to win, then deliberately make one wrong play to check the coaching.
4. **Check against the list below.** Every finding gets: what happened, steps to reproduce, the code location if known, and whether it is CONFIRMED (reproduced or seen in code) or UNCONFIRMED.
5. **Fun check, honestly.** One paragraph: what was fun, what was dull, what would make me play tomorrow.
6. **Report** to `docs/playtest/YYYY-MM-DD.md`, task code fixes on #41 (`BEAM-TASK:` / `DEEPSEEK-TASK:`), one line on ledger #51. Nothing to Wes.
7. **Next run:** re-check every open finding from the last report and mark it fixed / still broken.

## Checklist

- First screen: can a new player see their cards and the action buttons without scrolling (laptop ~1366×650 and phone)?
- First tap registers on every game.
- No answer shown before the player decides (coach label, highlighted button, gauge).
- After each hand there is exactly one obvious "continue" button.
- Coaching explains *why*, not just "correct".
- Copy matches reality (counts of hands, games, odds).
- End-of-drill recap and home screen show the player's actual result.
- Console has no errors.

## Bot caveat

Raw `open_trainer` counts include link previews and crawlers. Before redesigning anything for a drop, check the segment: as of 2026-11-10 referred desktop traffic (Reddit, Facebook, X) deals a hand ~60% of the time, while "direct" Windows desktop visits deal ~12%. Confirm with session replays before treating that segment as human.
