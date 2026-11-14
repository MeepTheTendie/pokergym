# PG-CLAUDE-HAND1-LEAK-20261113-01 — why Daily Drill hand 1 loses the player

- **task:** `PG-CLAUDE-HAND1-LEAK-20261113-01` (from Claude, integrator)
- **status:** PASS — pushed, not merged
- **branch:** `deepseek/hand1-leak` (from `origin/main` @ `aa6a09a`)
- **bounds:** no `worker/`, no wrangler config, no tracking events or properties,
  no Metricool, no game rules. Not merged.
- **verified on:** local `npm run serve` (`127.0.0.1:8899`, current `main` + this
  branch) at 390×844, 360×740, 1366×768 and 1440×900. **Not verified on the live
  site** — this branch is not deployed.

## Symptom

PostHog, last 30 days (to 2026-11-13 18:05 CT), cohorts 709897 and 644643
excluded, one run per `start_daily`:

- 40 Daily runs dealt hand 1; **25 never made a decision** (`decision_made`
  with `hand_index = 1`).
- 24 distinct people, not ~39: the other 15 come from five-hand sessions, which
  I did not reproduce as a leak (see "What I could not reproduce").
- Every non-deciding session was counted: none of the 25 carried
  `preview: true`, so this is not hidden preview loads.

## What hand 1 is

`dailyPlanV2()` rotates the plan so hand 1 is **blackjack** (`src/rpg/daily.js`).
The drill renders `#scr-battle`: scene header, coach card (`Master Baron`, the
daily opener plus the game instruction, status box), then the table, then the
action row (`#rowActions`: Hit / Stand / Double / Split). A `?daily=1` link
auto-starts the run 1.5 s after the page becomes visible (`startFromEntry`), so
hand 1 is dealt to a visitor who has tapped nothing.

## Cause (measured, not guessed)

The hand-1 screen is simply taller than the first viewport, and the layout only
pins the action row on phones (`@media (max-width: 640px)`). Measured with
Playwright on `main` before this branch:

| viewport | player's cards | action row | verdict |
|---|---|---|---|
| 390×844 | 526–763 | 779–844 (pinned) | fine |
| 360×740 | 526–763 | bar top **675** | cards hidden **88 px behind the bar** |
| 1366×768 | 506–767 | **791–839** | **buttons entirely below the fold**, nudge below them too |
| 1440×900 | 506–767 | 791–839 | fine |

Two independent defects, both silent:

1. **1366×768 laptop: the decision buttons are off screen.** They sit 23 px below
   the fold, with nothing to suggest scrolling; the one-time nudge is rendered
   underneath them, so it is invisible in exactly the case it exists for. This is
   the single largest bucket in the data: **12 of the 25** non-deciding runs are
   desktop at exactly 1366×768 (the other desktop runs are 945–1893 px tall).
2. **360×740 phone: the pinned bar covers the player's own cards** by 88 px, so
   the screen asks for a decision on a hand it is hiding. 4 of the 7 mobile
   non-deciders had a 637–668 px tall viewport, the same class.

The five-line Daily opener is the largest block in the coach card (266 characters
of coach text on hand 1 versus 151 after this change) and pushes the table down;
the whole card is 284 px on desktop and 304 px on phones.

### Entry, device and preview split

| split | runs dealt hand 1 | no decision |
|---|---|---|
| entry `daily_link` | 29 | 22 |
| entry `map` | 6 | 3 |
| entry `replay`, `title`, `recap` | 5 | 0 |
| Desktop | 24 | 18 (12 at 1366×768) |
| Mobile | 16 | 7 (4 at 637–668 px tall) |
| `open_trainer.preview = true` | 0 | 0 |

`?daily=1` did start a hand before the player had chosen anything — that is what
the deeplink is for — but it is not the differentiator: mobile daily-link runs
leak less than desktop daily-link runs, and `map` (button-tap) runs leak too. The
variable that moves is viewport height.

### What is not a real player

5 of the 25 runs send **no event at all after the deal** (two report a
`Google-Safety` user agent), which looks like link-preview/unfurl fetches. They
account for part of the "dealt a hand and never tapped" count. I left tracking
alone, as instructed; the report should stop counting these runs as players.

## Fix (cause fix, not a stopgap)

1. **Short opener** — `web/app.js`: hand 1 of the Daily now opens with
   "Five hands, all four games — the coach grades each one." plus the per-game
   move, instead of the five-line explanation already carried by the
   `Daily Drill #317 · hand 1 of 5` label. 266 → 151 characters. The blackjack
   and hold'em lines also lose the "Not sure? Ask the coach for a hint."
   sentence in Daily mode, where the coach button is hidden.
2. **Reveal the hand on deal** — `web/app.js` `revealHand()`, pure rule in
   `src/ui/reveal.js`: after every deal (and again when the nudge appears) it
   scrolls only as far as needed so that the cards clear the pinned bar and the
   action row is inside the viewport. It does nothing when the hand already
   fits, and honours `prefers-reduced-motion`.
3. **Nudge where the player is looking** — `web/index.html`: `#firstNudge`
   moved into the status box above the table. In the hand panel it was behind
   the pinned bar on phones and below the fold on laptops. Copy drops the
   duplicated "Your call" (the grade row already says it). The `first_nudge`
   event is unchanged.

After (same harness):

| viewport | scroll | cards | action row | verdict |
|---|---|---|---|---|
| 390×844 | 0 px | 465–702 | 779–844 | no scroll needed |
| 360×740 | 56 px | 429–667 | 675–740 | cards clear the bar by 8 px |
| 1366×768 | 39 px | 426–687 | 711–759 | buttons inside the viewport |
| 1440×900 | 0 px | 465–726 | 750–798 | no scroll needed |

Since every hand re-checks, the same guarantee now covers hands 2–5 (video
poker, baccarat and hold'em all measured with cards 8 px clear of the bar at
360×740, and buttons in view at 1366×768).

## Evidence

Screenshots, 360×740 and 1366×768, before and after (headless Chromium, fresh
profile, `?daily=1`, hand 1 dealt):

| before | after |
|---|---|
| `PG-CLAUDE-HAND1-LEAK-20261113-01-before-desktop-1366x768.png` — cards, no buttons | `PG-CLAUDE-HAND1-LEAK-20261113-01-after-1366x768.png` — buttons visible |
| `PG-CLAUDE-HAND1-LEAK-20261113-01-before-360x740.png` — cards behind the bar | `PG-CLAUDE-HAND1-LEAK-20261113-01-after-360x740.png` — cards and buttons visible |
| `PG-CLAUDE-HAND1-LEAK-20261113-01-before-390x844.png` — already fine | `PG-CLAUDE-HAND1-LEAK-20261113-01-after-390x844.png` |
| — | `PG-CLAUDE-HAND1-LEAK-20261113-01-after-phone-nudge.png` — nudge readable above the table |

Interaction check at all three sizes: `#btnHit` is inside the viewport, is the
topmost element at its centre, and tapping it produces the coach grade (the
daily hand then settles normally). No page errors. The Daily also advanced
hand 1 → 2 → 3 in the same run without errors.

## Tests

- `test/hand1-visibility.test.js` (new, 8 tests): the reveal arithmetic at the
  measured 1366×768, 360×740 and 390×844 numbers; no scroll when the hand fits;
  missing boxes never move the page; the reveal is wired into `startHand()` and
  the nudge; the opener is short; the nudge lives in the status box once.
- `src/ui/reveal.js` (new, pure) is the rule the browser code calls.

```
$ node --test test/hand1-visibility.test.js
ℹ tests 8
ℹ pass 8
ℹ fail 0

$ npm test
ℹ tests 393
ℹ pass 393
ℹ fail 0
ℹ duration_ms 6455.838055
```

## Not changed / notes for the integrator

- No changes to `worker/`, wrangler config, `docs/analytics-events.md` events,
  Metricool, or any game rule. `first_nudge` still fires once per device with
  the same properties.
- `docs/PokerGymControlDoc.md` says the nudge appears "one line above them"
  (the controls). It now appears in the status box above the table, still above
  the controls; that sentence needs a one-line update when this merges.
- Worth a separate, tracking-side follow-up (not done here): exclude
  link-preview fetches (zero events after `hand_dealt`, `Google-Safety`-style
  user agents) from "player" counts, or they keep inflating the hand-1 leak.
- Suggested deploy-queue note: this touches the first screen every Daily link
  opens, so it is the right next product deploy once Claude has reviewed.
