# Gym Pro practice pack generator

Generates `data/pro-packs/*.json` from the existing Poker Gym engines.

## Run

```bash
node scripts/pro-packs/generate.mjs
```

## Packs

- `blackjack-soft-hands.json` — 20 soft-hand spots graded by `src/coach/blackjack.js` exact EV.
- `blackjack-pairs-splits.json` — 20 pair/split spots graded by `src/coach/blackjack.js` exact EV.
- `jacks-or-better-holds-96.json` — 20 9/6 Jacks or Better hold spots graded by `src/coach/videopoker.js` exact draw EV.
- `baccarat-third-card-rule.json` — 20 third-card decision spots graded by `src/coach/baccarat.js` `playerDraws`/`bankerDraws` rules.

All correct actions, EVs, EV gaps, and rule reasons are computed by the engine at generation time (no hand-written answers). The accompanying test re-verifies every spot against the engine.
