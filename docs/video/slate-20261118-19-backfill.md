# Slate addendum: Wed Nov 18 and Thu Nov 19, 9 AM + noon (Claude, video owner)

**Why:** Nov 15–19 were running 1 video per platform per day against the owner target of 3 (Wes, Nov 11; restated live Nov 16: "3 per day so you can run more tests"). These four clips bring Nov 18 and Nov 19 to 3 per platform. Nov 17 stays at 1 (its 9 AM and noon slots come before the veto window). The existing 4 PM clips (`split-18-vs-nine` Wed, `nines-vs-seven` Thu) are unchanged.

**Veto window: Tue Nov 17, 10:00 AM CT** (same window as `slate-20261122-23.md`; Wren; default ship). Render, media handoff and Metricool scheduling at the Tue 2:09 PM run.

**What they test, and why these cells:** the Nov 20–23 slates read as a game × opener 2×2. The video poker puzzle cell has only one clip (Nov 22 9 AM). These fill it twice and add two more blackjack puzzles, and because they post 2–4 days earlier their 72 h reads land Nov 21–22, before the Nov 20+ reads, so the puzzle-vs-claim answer comes sooner.

Rules: blackjack 6 decks · S17 · DAS · no surrender · EV per 1 unit (`bestAction`); 9/6 Jacks or Better · EV per 1 coin (`bestHold`). EVs checked 2026-11-16.

| Date / time (CT) | Tag (`c=`) | Hand | Frame-0 on screen | Variable it tests | EVs (coach) |
|---|---|---|---|---|---|
| Wed Nov 18, 9:00 AM | `queen-jack-not-king` | K♠ Q♥ J♥ 5♦ 3♣ → hold Q♥J♥ | "King, queen, jack. Which do you keep?" (puzzle) | **VP × puzzle** (cell rep. 1) | Q♥J♥ 0.576 · K♠Q♥J♥ 0.515 · K♠Q♥ 0.479 |
| Wed Nov 18, noon | `soft17-vs-three` | A♥6♠ vs 3♦ → DOUBLE | "Soft 17 against a 3. Which play wins?" (puzzle) | **BJ × puzzle**, earliest read of the cell | double +0.059 · hit +0.030 · stand −0.113 |
| Thu Nov 19, 9:00 AM | `jacks-over-royal-draw` | K♥ Q♥ J♥ J♠ 3♦ → hold J♥J♠ | "Pair of jacks or three to a royal?" (puzzle) | **VP × puzzle** (cell rep. 2) | J♥J♠ 1.537 · K♥J♥J♠ / Q♥J♥J♠ 1.416 |
| Thu Nov 19, noon | `hit-15-vs-ten` | 10♥5♣ vs 10♠ → HIT | "15 against a 10. Hit or stand?" (puzzle) | **BJ × puzzle** (rep.) | hit −0.504 · stand −0.540 |

All four answers match standard 6-deck S17 DAS / 9/6 JoB strategy charts. Script shape, end card, footers and render pipeline as `slate-20261122-23.md`.

**Captions** (hook line = frame-0 line):
- Facebook: hook, then `Practice this decision free → https://playpokergym.com/reel?src=fb&c=<tag>`.
- Instagram: hook, then `Practice this decision free — link in bio 👆`.
- YouTube: hook, then `Free drill: playpokergym.com/go`. Titles:
  - `Jacks or Better: K-Q-J, keep the suited queen-jack | Poker Gym`
  - `Soft 17 vs dealer 3: double, don't hit | Poker Gym`
  - `Jacks or Better: pair of jacks beats three to a royal | Poker Gym`
  - `Hard 15 vs dealer 10: hit, don't stand | Poker Gym`

The four tags are added to `src/rpg/reel-clips.js` in the same PR, with a test that the coach gives each stated answer.
