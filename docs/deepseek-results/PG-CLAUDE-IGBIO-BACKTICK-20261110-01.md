# PG-CLAUDE-IGBIO-BACKTICK-20261110-01 — IG bio trailing-backtick attribution fix

- **task id:** `DEEPSEEK-TASK: PG-CLAUDE-IGBIO-BACKTICK-20261110-01` (issue #41 comment 6774568699)
- **correlation_id:** `PG-CLAUDE-IGBIO-BACKTICK-20261110-01`
- **status:** `PASS`
- **branch:** `deepseek/igbio-backtick`
- **commit:** `edeaf1a` (`fix(attribution): trim trailing backticks/quotes/whitespace from campaign values`)
- **from:** Claude (integrator), owner-approved (Wes, live, Nov 10)
- **deadline:** Wed Nov 11, 6 PM CT

## Scope and reasonable reading

Wren's Nov 10 pull: 14 of 16 Instagram first-touch persons carry `utm_content=ig-bio` with a
trailing backtick (`` ig-bio` ``), while the live IG bio link reads clean. The task is to find
where the backticked value comes from and draft a fix so `` ig-bio` `` and `ig-bio` both count
as `ig-bio`. This is a **tracking change**, so the result (and any PR) stays DRAFT until Wren
signs off and the Nov 1–12 test ends (Nov 12). I did not edit any live post, bio, or Metricool
item, and did not rename any event/property or add a dependency.

## Action 1 — Source of the trailing backtick

**Finding: the backtick is not produced by anything in this repo. It originates outside the
repo, in the Instagram @playpokergym bio link (or bio text) itself.**

What I checked:

1. **`worker/index.js` `/go`, `/reel`, `/x` redirects (~lines 115–155).** Every campaign value the
   worker stamps is hard-coded and clean (`endscreen`/`typed`, `wes-daily`, `reel`,
   `hooktest1112`, `fb`/`ig`/`yt`). The only pass-through inputs are `c`, `camp`, `src`, and
   `utm_content` on `/reel` and `/x`; the code copies them verbatim and never adds a backtick.
2. **`web/posthog-loader.js`.** First-touch `utm_content` is read straight from
   `window.location.search` and recorded verbatim as `first_utm_content` / `$set_once.utm_content`.
   Nothing strips or normalizes it.
3. **`worker/count.js` and `src/rpg/links.js`.** `ref` is classified but `utm_*` values are not
   touched on the counting path.
4. **Whole-repo search.** No tracked file contains a backticked `ig-bio` URL (grep for
   `ig-bio`/`utm_content`; the only `ig-bio`` occurrences are prose in `docs/PokerGymControlDoc.md`
   and the prior Beam result).

How the `ig-bio` value reaches the site: the bio link is a **direct** link to
`/web/?utm_source=ig&utm_medium=reel&utm_campaign=hooktest1112&utm_content=ig-bio`. It does not
pass through a worker redirect, so the worker never rewrites its query string; the value arrives
at the browser exactly as stored on Instagram and is recorded verbatim. The ControlDoc records the
intended link as clean (owner-confirmed Oct 29, Wren read it clean live Oct 30), so the trailing
backtick was introduced on the Instagram side at some later point (Wren first flagged backticked
arrivals Nov 7). This is consistent with the URL having been pasted out of a Markdown code span or
quoted string, leaving a stray trailing backtick that Instagram folds into the clickable link.

**What I could not check:** the live Instagram bio itself (no Meta/IG credentials in this
environment, and editing the bio is out of bounds for this task). I could not confirm visually
whether the current bio link field or the bio text carries the backtick; Wren's "reads clean"
observation suggests the stored link may already be corrected and the 14 backticked arrivals are
historical, but I cannot verify that from here.

## Action 2 — Fix (defense-in-depth normalization)

The root cause is external, but the task asked for a code-side fix so the two spellings can never
split a campaign again. I added a single pure helper `cleanCampaign(value)` that strips surrounding
whitespace and any trailing run of backticks/quotes, and applied it at the two points campaign
values are **forwarded** or **recorded**:

- **`src/rpg/links.js`** — new exported `cleanCampaign(value)` (pure, Node-testable). Returns `''`
  for empty/missing input; `ig-bio`` → `ig-bio`.
- **`worker/index.js`** — imports `cleanCampaign` and applies it to the `/reel` and `/x`
  pass-throughs (`src`, `camp`, `c`, `utm_content`) before forwarding, so a backticked short-link
  value is normalized on the edge.
- **`web/posthog-loader.js`** — an inlined mirror of `cleanCampaign` (the loader is a classic
  IIFE and cannot import ES modules) applied to `ref` and all four `utm_*` values when they are
  read from the URL, so the direct bio-link case records `ig-bio` instead of `` ig-bio` ``.

This mirrors the existing `REFERRER_REFS` keep-in-sync pattern between `links.js` and the loader.
No new dependency, no renamed event/property, no change to `classifyRef` or the visit-counter path.

## Unit tests added

- `test/links.test.js` — `cleanCampaign` keeps clean values unchanged; strips trailing
  backticks/quotes/whitespace (incl. curly quotes); returns `''` for empty/blank/backtick-only.
- `test/worker.test.js` — `campaign values are trimmed of trailing backticks, quotes and
  whitespace`: `/reel?src=ig&c=ig-bio%60` → `utm_content=ig-bio`, `utm_source=ig`, `ref=reels`;
  `utm_content`/`camp` pass-through cleaned; `src=ig%60` still resolves to `ig`; `/x?c=soft17%60`
  → `utm_content=soft17`.
- `test/posthog-loader.test.js` — `a trailing backtick on utm_content is trimmed before
  recording`: `?utm_content=ig-bio%60` records `$set_once.utm_content === 'ig-bio'`.

## Platform-side fix to request (Claude/owner)

The repo cannot remove the backtick from the live bio. Please set the Instagram @playpokergym bio
link (the `Website` field, and confirm no trailing backtick in the surrounding bio text) to exactly:

```text
https://playpokergym.com/web/?utm_source=ig&utm_medium=reel&utm_campaign=hooktest1112&utm_content=ig-bio
```

After that, new bio arrivals record `utm_content=ig-bio`. Historical backticked events are not
rewritten (PostHog is append-only for our purposes); this fix plus the code normalization makes
`` ig-bio` `` and `ig-bio` roll up to the same bucket going forward.

## Verification (commands run + actual output)

### Targeted tests (all touched areas)

```text
$ node --test test/links.test.js test/worker.test.js test/posthog-loader.test.js
ℹ tests 54
ℹ suites 0
ℹ pass 54
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 80.8471
```

(Includes the new tests: `cleanCampaign keeps clean campaign values unchanged`,
`cleanCampaign strips trailing backticks, quotes and whitespace`,
`cleanCampaign returns empty for empty, blank or backtick-only values`,
`campaign values are trimmed of trailing backticks, quotes and whitespace`,
`a trailing backtick on utm_content is trimmed before recording` — all pass.)

### Full suite (`npm test`)

```text
ℹ tests 372
ℹ suites 0
ℹ pass 371
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5212.8308

✖ failing tests:
test at test\scenarios.test.js:1:1
✖ test\scenarios.test.js (99.239ms)
```

The one failure is **unrelated to this change** and pre-existing in this Windows worktree
environment: `test/scenarios.test.js` fails at module load with
`ENOENT ... 'C:\C:\Users\Work%20Rig\...\public\sitemap.xml'` (a doubled `C:\C:\` drive prefix and
URL-encoded space when that test resolves `public/sitemap.xml`). My diff touches only
`src/rpg/links.js`, `worker/index.js`, `web/posthog-loader.js`, and three test files, none of which
are read by `scenarios.test.js`. I did not skip, delete, or weaken any test. This matches the known
failure documented in the prior Beam result `PG-CLAUDE-SOCIAL-ATTRIB-20261108-01`.

## Commit

`edeaf1a` — `fix(attribution): trim trailing backticks/quotes/whitespace from campaign values`
(7 files changed). Pushed to `origin/deepseek/igbio-backtick`.

## Files changed

- `src/rpg/links.js` — new `cleanCampaign(value)` helper.
- `worker/index.js` — normalize `src`/`camp`/`c`/`utm_content` in `/reel` and `/x` redirects.
- `web/posthog-loader.js` — normalize `ref` + `utm_*` when reading entry params.
- `test/links.test.js`, `test/worker.test.js`, `test/posthog-loader.test.js` — unit tests.
- `docs/deepseek-results/PG-CLAUDE-IGBIO-BACKTICK-20261110-01.md` — this report.
