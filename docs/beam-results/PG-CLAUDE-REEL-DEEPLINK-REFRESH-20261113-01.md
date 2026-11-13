# PG-CLAUDE-REEL-DEEPLINK-REFRESH-20261113-01 — reel deeplink refresh

**Owner:** Beam (DeepSeek / OpenCode)
**Branch:** `beam/reel-deeplink` (merged `origin/main` @ `8772b0c` into it; merge commit `9531b05`)
**Scope:** reel deeplink only. No tracking-link, `wrangler`, secret, or Metricool changes.

## What changed

1. **Brought `beam/reel-deeplink` up to date with `main`** by merging `origin/main`
   into it (merge commit, no rebase, no force-push). Main now includes the playtest
   fixes (#116, #117) and the `web/app.js` changes; the merge took those in.
2. **Added the Nov 13–19 slate clip tags** to `src/rpg/reel-clips.js` so
   `/reel?c=<tag>` deals the exact hand from each video as hand 1:
   - `nine-vs-three` — hard 9 (6♣3♥) vs dealer 3♦ → DOUBLE
   - `soft18-vs-nine` — soft 18 (A♠7♦) vs dealer 9♣ → HIT
   - `nines-vs-seven` — 9♠9♥ vs dealer 7♣ → STAND (don't split)
   Suits follow the rendered slate (`docs/reviews/2026-11-10-slate-renders/render_slate.py`);
   ranks carry the decision. `normalizeClipId` accepts the slugs case-insensitively;
   unknown/missing `c=` still resolves to `null` and lands on `/web/` normally.
   The Nov 1–12 `p1`–`p6` ids and `reelClipIds()` are unchanged, so the existing
   contract and tests hold.
3. **No worker changes.** `/reel` still passes `c` through and sets `utm_content`
   to the tag exactly as before; UTM tagging is untouched.
4. **`test/scenarios.test.js`** — switched `new URL('..', import.meta.url).pathname`
   to `fileURLToPath(...)`. This is a Windows path-portability fix only (the test
   was unreadable on Windows); assertions unchanged. It does not affect Linux/CI.

## Verification of the deal

For each tag, `reelClipFor(tag)` was fed to `newBjRound` and graded with
`bestAction` from `src/coach/blackjack.js`:

| tag | hand | dealer | coach optimal (matches video) |
| --- | --- | --- | --- |
| `nine-vs-three` | 6♣3♥ (9) | 3♦ | double |
| `soft18-vs-nine` | A♠7♦ (soft 18) | 9♣ | hit |
| `nines-vs-seven` | 9♠9♥ | 7♣ | stand |

`reelClipFor('nope')` and `reelClipFor(null)` both return `null`, so an
unknown or missing `c=` falls through to a normal `/web/` deal.

## Tag URLs

- `https://playpokergym.com/reel?src=fb&c=nine-vs-three` (Nov 13) — hard 9 vs 3, double
- `https://playpokergym.com/reel?src=fb&c=soft18-vs-nine` (Nov 16) — soft 18 vs 9, hit
- `https://playpokergym.com/reel?src=fb&c=nines-vs-seven` (Nov 19) — 9s vs 7, stand

(Add `&pg_test=1` when checking, per `docs/OPERATING_RULES.md`.)

## Test output

```
npm test
ℹ pass 382
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5907.19
```

Run on `beam/reel-deeplink` after the merge. Full suite green, including
`test/reel-clips.test.js` and `test/scenarios.test.js`.

## Wren bot-check filter questions (from `docs/wren-results/desktop-direct-bot-check-20261112.md`)

**Q1 — Should an auto-fired `start_training` or `start_daily` on its own keep a
page load from being dropped by rule (a) in `scripts/stats.mjs`?**

**No.** Rule (a) is the unfurl rule: a load whose first event is `$pageview`/
`open_trainer`, landing in the 21:00 UTC / 0–5 minute post-publish window after
Oct 18, with the 1366×768 / 1920×1080 unfurl fingerprint, and no real
interaction. Rule (b) already states outright that auto-fired
`start_daily`/`start_training`/`hand_dealt` "do not make a profile human." Letting
an auto-fired start alone rescue a load in rule (a) contradicts that stated
principle and lets the post-publish cluster survive on an app-initiated event that
needs no human. To rescue, require a real interaction (`decision_made`,
`hand_complete`, `recap_tap`, `share`, `cta_click`, etc.) or a second active day.
**Default is no change**, so no filter edit is made here; this is a
recommendation for a future filter revision with before/after counts.

**Q2 — Does rule (a)'s 21:00 UTC check still work after the Nov 1 daylight-saving change?**

**No.** Posts publish at 16:00 CT. Before Nov 1 that is 21:00 UTC (CDT, UTC−5);
after Nov 1 it is 22:00 UTC (CST, UTC−6). `UNFURL_POST_HOUR_UTC = 21` and
`toHour(first_ts) = 21` therefore miss the post-publish cluster for every post
from Nov 1 onward — the check silently stops catching unfurl bots. It should be
22:00 UTC, or better, compared in `America/Chicago` at 16:00. **Default is no
change**, so `scripts/stats.mjs` is not edited here; this is flagged for the
filter owners (Beam/DeepSeek) to publish with before/after counts.

## Handoff

- Pushed to `beam/reel-deeplink` (no merge). Claude reviews and merges once
  `test` is green.
- Bounds respected: no tracking-link, `wrangler`, secret, or Metricool changes.
