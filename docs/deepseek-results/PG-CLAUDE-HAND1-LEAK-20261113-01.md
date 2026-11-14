# PG-CLAUDE-HAND1-LEAK-20261113-01 — Daily Drill hand-1 drop-off

- **task:** `PG-CLAUDE-HAND1-LEAK-20261113-01` (from Claude, integrator)
- **status:** PASS — pushed, not merged
- **branch:** `deepseek/hand1-leak` (from `origin/main` @ `aa6a09a`)
- **commits:** `f61abe1` (fix); this result file + screenshots committed separately
- **bounds:** no `worker/`, `wrangler` config, tracking-event or Metricool changes;
  no game-rule changes; no merge.

## The cause

The Daily Drill's hand 1 is **blackjack** for every recent day (the V2 plan
rotates blackjack to the front, `src/rpg/daily.js:78-86`). Confirmed for the
10 days ending 2026-11-13 — every plan begins `blackjack` (for example
`2026-11-13 → blackjack,holdem,baccarat,holdem,videopoker`).

Hand 1 lands the player on the **battle screen** with a decision already live.
The task's three hypotheses were checked against a real headless-Chromium render
of `?daily=1` at both target sizes (raw CDP; Chromium here is Microsoft Edge
`msedge.exe`, since no `chromium`/Playwright binary is installed — the repo's own
`scripts/screenshots.mjs` uses the same `chromium`/CDP path):

1. **Are the action buttons below the fold? — No.** `#rowActions` (Hit / Stand /
   Double / Split) is already pinned to the bottom of the viewport
   (`web/styles.css:767-783`), so the buttons are visible without scrolling at
   both 390×844 and 360×740. This is not the leak.
2. **Does the intro text push the cards down? — Partly.** The hand-1 coach line
   was a dense two-sentence paragraph (the verbose `dailyIntro` + a long
   instruction), which made the coach card 284–304 px tall. At 360×740 that
   pushed the player's own cards to y≈677, **behind the fixed action bar**
   (top 675). The dealer's upcard stayed visible, but the player's own cards and
   the "Your move." line were cut off.
3. **Does `?daily=1` auto-start before the player has seen anything? — Yes.**
   `web/app.js:2963-3040` shows the map/title screen, then after 1.5 s of
   visibility teleports the visitor into a live blackjack hand. That is a
   deliberate earlier fix (auto-start), so it is not changed here.

The biggest cause I can show is a **self-contradictory hand-1 prompt** on top of
that auto-start. The coach line for blackjack/hold'em ended with
*"Not sure? Ask the coach for a hint."*, but the Daily Drill deliberately hides
the **Ask coach** button (`el('btnAsk').hidden = dailyMode || handDone`,
`web/app.js:1765`) so the clean read cannot be farmed. A player auto-started into
hand 1 was shown a wall of text that ended by pointing at a button that is not
there — and no immediate, above-the-fold "your move" cue. In the data that maps
directly to the 24 of 25 hand-1 stoppers who never made a decision.

### Before / after (headless render, `?daily=1`, hand 1)

Screenshots: `PG-CLAUDE-HAND1-LEAK-20261113-01-{before,after}-{390x844,360x740}.png`.

| measure | before 390×844 | after 390×844 | before 360×740 | after 360×740 |
| --- | --- | --- | --- | --- |
| coach line (`#masterLine`) | 101 px | 81 px | 122 px | 81 px |
| coach card | 284 px | 264 px | 304 px | 264 px |
| player's cards top (`#zones .card`) | 532 / 657 | 512 / 637 | 553 / 677 | 512 / 637 |
| action row (`#rowActions`, fixed) | 779–844 | 779–844 | 675–740 | 675–740 |
| document height | 1036 | 1016 | 1056 | 1016 |
| `btnAsk` visible | hidden | hidden | hidden | hidden |

Before, the player's cards at 360×740 sat at y=677 — under the fixed action bar
(y=675). After, they sit at y=637, clear of the bar.

**Before** coach line:

```text
This is the Daily Drill: five hands across all four games. Make the play you
think is best; the coach grades it and explains why after each hand. Look at
your hand and the dealer’s upcard, then choose Hit, Stand, Double, or Split.
Not sure? Ask the coach for a hint.
```

**After** coach line (no dead hint, one short intro sentence):

```text
Daily Drill: five hands across four games. Make the play you think is best —
the coach grades it after. Look at your hand and the dealer’s upcard, then
choose Hit, Stand, Double, or Split.
```

## The fix

`web/app.js` no longer inlines the hand-1 copy. The copy now lives in a pure,
unit-testable module:

- **`src/rpg/battle-copy.js`** — `battleMessage(gameId, { daily, dailyIntro })`.
  - Shortens the Daily Drill intro from two sentences to one
    (*"Daily Drill: five hands across four games. Make the play you think is
    best — the coach grades it after."*).
  - Strips *"Not sure? Ask the coach for a hint."* whenever `daily` is set, so
    the Daily Drill never points at the hidden coach button.
  - Leaves the five-hand session copy byte-for-byte unchanged (the hint is still
    shown there, where the coach button exists).
- **`web/app.js`** imports it and calls it in `startHand()`.

No game rules, tracking events, worker or analytics changed. Videopoker and
baccarat instructions are untouched in both modes.

## Tests

New `test/battle-copy.test.js` (4 tests): the session hint is preserved; the
Daily Drill never references the coach; the daily intro is one short sentence
(not the old two-sentence paragraph); videopoker/baccarat are unchanged; unknown
games return an empty instruction without throwing.

```text
$ npm test
ℹ tests 389
ℹ suites 0
ℹ pass 389
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5959.9717
```

The new-module tests were also run in isolation first
(`node --test test/battle-copy.test.js` → 4 pass).

## Verification

- `node -e` over `src/rpg/daily.js` printed the V2 plan for 10 recent days; all
  begin with `blackjack`.
- Headless render of `http://127.0.0.1:<port>/web/index.html?daily=1` (Edge via
  CDP, the repo's `chromium`/CDP approach) captured the `#masterLine`,
  `#masterLineText`, `#zones` card tops, and the fixed `#rowActions` rect before
  and after the change, at 390×844 and 360×740 (table above). The change moved
  the player's cards above the fixed action bar at 360×740 and shortened the
  coach card by 20–40 px.
- `git diff --check` is clean.

## Handoff

Pushed to `deepseek/hand1-leak`. Claude reviews and merges once `test` is green.
