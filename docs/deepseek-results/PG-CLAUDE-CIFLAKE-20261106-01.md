# PG-CLAUDE-CIFLAKE-20261106-01 — Chromium launch reliability

**Owner:** DeepSeek (OpenCode)
**Branch:** `deepseek/ci-chromium-available` (from `main` @ `0e6f448`)
**Scope:** CI harness only. No app code, no `/` or `/web/` changes, no tracking, secrets, deploy config or pricing.

## Root cause

The browser tests did not fail because the app was unavailable. They failed because
the harness could not tell "Chromium is slow" from "Chromium died", and had no
retry and no diagnostics.

Before this change, all three scripts did this:

```js
children.push(spawn('chromium', ['--headless=new', ..., `--remote-debugging-port=19397`, 'about:blank'], { stdio: 'ignore' }));
let page;
for (let i = 0; i < 200 && !page; i++) {
  try { page = (await (await fetch('http://127.0.0.1:19397/json/list')).json()).find(t => t.type === 'page'); } catch {}
  if (!page) await sleep(100);
}
assert.ok(page, 'Chromium available');
```

Four concrete defects:

1. **The child is fire-and-forget.** `spawn()`'s result is never inspected, so a
   browser that exits immediately (crash, bad switch, profile/port problem) is
   indistinguishable from a slow one.
2. **`stdio: 'ignore'` discards Chromium's own explanation.** The job log only
   ever showed `AssertionError: Chromium available`, never the browser's stderr
   or exit code.
3. **The wait is a fixed 20 s wall clock** measured from `spawn`, not a bounded
   retry. `181250c` (#11) already raised it from 6 s to 20 s after a slower
   runner; that treats the symptom and still fails when a cold runner needs
   longer.
4. **Hardcoded ports** (19397 in both `browser-offline` scripts, 9341, 9351–9353)
   make back-to-back launches in one job depend on the previous browser having
   released its listener, and the workflow only exposed Chromium through a PATH
   symlink built with `$(command -v google-chrome)`.

### Evidence from the failing job

`https://github.com/MeepTheTendie/pokergym/actions/runs/42259323725/job/128034800907`
("browser offline", attempt 1):

| Step | Attempt 1 (failed) | Attempt 2 (passed) |
| --- | --- | --- |
| Provide chromium on PATH | **12 s** (`17:11:39` → `17:11:51`) | ~1 s (`17:14:39` → `17:14:40`) |
| npm run test:browser-offline | **66 s**, failed | 42 s, passed |

The "Provide chromium on PATH" step only runs `ln -sf` and `chromium --version`,
so 12 s means the runner was cold/contended and even the browser's first
execution was pathologically slow. The test step was 24 s longer than the green
run, which is one 20 s launch window plus overhead. That is the mechanism: on a
cold runner the fixed window expires once, the job fails with an assertion that
blames availability, and a re-run on a warm runner passes. Docs-only PRs fail
the same way because these jobs run regardless of what changed.

## Fix

**New `scripts/lib/chromium.mjs`** — one launch path for the browser tests:

- Resolves the binary from `CHROME_BIN`, then `chromium`, `chromium-browser`,
  `google-chrome`, `google-chrome-stable`, `chrome`, `msedge`.
- Allocates a **free port** per attempt, so sequential runs cannot collide.
- **Watches the child**: an exit or spawn error fails immediately with the exit
  code/signal and the browser's captured stderr (8 KB tail), instead of waiting
  out the window.
- **Bounded retry on launch only**: 2 attempts × 30 s. Test assertions are never
  retried, skipped or weakened.
- Captures stdout/stderr to a bounded buffer for the failure message.
- Adds `--no-first-run --no-default-browser-check` to avoid avoidable first-run
  work on a cold profile.
- Polls `/json/list` with a 2 s per-request abort so one hung socket cannot eat
  the whole budget.

**Call sites:** `scripts/itch-browser-test.mjs`, `scripts/push-browser-test.mjs`,
`scripts/reminder-browser-test.mjs` now call `launchChromium()` and keep a real
`Chromium DevTools page available` assertion. Every app-behaviour assertion is
untouched; only the locate/launch/wait code changed.

**`.github/workflows/test.yml`:** all three browser jobs now discover the binary
explicitly, fail the step with `::error::` if none exists, export `CHROME_BIN` for
the helper, and keep the `chromium` symlink for scripts that still spawn the
name. The hardcoded single-candidate `$(command -v google-chrome)` is gone.

## Local runs

Environment: Windows, no Chromium and no `python3` installed. The runs used a
portable Python 3.12.7 in `%TEMP%` and a real Chromium build selected through
`CHROME_BIN`; nothing was installed system-wide and the repo was not changed for
the environment.

### `npm run test:itch`

```
> node scripts/itch-browser-test.mjs
Built artifacts/pokergym-itch.zip (free browser demo; no checkout).
PASS: video-poker cache preserves hold positions for reordered cards.
PASS: four bundled phone guides reveal answers and link local practice, privacy and related guides.
PASS: nested portable weekly sample loads local assets, scores five choices, resumes completed review and links local practice; no cloud install advertised.
PASS: weak drill mode and next authored hand persist through phone reload and TODAY resume.
PASS: actual video-poker miss captures 32 original hold patterns; card selection scores once and fits phone.
PASS: actual Holdem miss captures 21 selections; incomplete pick is unscored; best-five retry scores once and fits phone.
PASS: actual baccarat misses capture all three question types; scored retries, once-per-visit/reveal guards and portable counts verified.
PASS: scored blackjack retry, no repeat/revealed-answer scoring, independent persisted counts and portable backup; original gameplay captures legal choices and answer key.
PASS: all four games available to a new trainer; blackjack, baccarat and Hold’em five-hand sessions complete without badges; badge journey remains locked.
PASS: seeded daily drill mixes all four games deterministically; mid-drill progress persists and resumes; a replay scores no new XP or score; the result shares cleanly.
PASS: haptics buzz once per settled hand, a dismissed toggle silences playback and persists across reloads.
LOCAL ZIP EMBED TEST
PASS: ZIP allowlist and nested 390px iframe, module/assets loading, trainer onboarding, lesson/battle/coach, save and resume, hidden-answer mistake self-test, saved review, five-hand session resume/completion, voluntary unsent feedback draft, private invitation copy/fallback/share states; zero runtime or game asset network errors.
```

Ran twice: once from the original `main` checkout and once after moving the work onto
`origin/main` (`0e6f448`). Same result.

### `npm run test:offline`

The npm script is POSIX-only by construction:

```
> POKERGYM_OFFLINE_TEST=1 node scripts/itch-browser-test.mjs
'POKERGYM_OFFLINE_TEST' is not recognized as an internal or external command
```

Its exact equivalent, with the variable set in the environment, launched the
browser successfully and then failed an **app-behaviour** assertion, not the
launcher:

```
AssertionError [ERR_ASSERTION]: Guide link starts its own five-hand session
  actual: null, expected: 'pokergym'
  at scripts/itch-browser-test.mjs:168
```

This is local-only: the script navigates to a guide, clicks its CTA and expects
the trainer to write `pokergym:save:v1` within 10 s. The same commit's
`test:offline` job is green on GitHub's Chromium (`browser offline` succeeded on
`main` `2c0f243` at 21:24 UTC on 2026-11-06, and the run that motivated this
task passed on retry), and the non-offline path of the identical script passed
here. I could not reproduce this on a real Chromium locally because the browser
download stalled, so I am recording it rather than claiming a pass.

### Launch-failure diagnostics (forced)

Pointed `CHROME_BIN` at `node.exe` to force an immediate child exit:

```
Chromium failed to start after 2 attempt(s). Executable: C:\Program Files\nodejs\node.exe
--- attempt 1/2: Chromium exited before its DevTools page was ready (code 9, signal null)
C:\Program Files\nodejs\node.exe: bad option: --headless=new
...
```

Two attempts, immediate detection, exit code and the browser's own stderr in the
message — the behaviour the old assertion could not provide.

Note for anyone running the unit tests on this Windows checkout: `core.autocrlf=true`
gives CRLF files, and `test/` compares generated text against `\n`, so
`npm run test:unit-release` fails locally with CRLF-only diffs. CI checks out LF.
Not caused by this branch.

## Draft PR review (read-only)

### #55 — Redesign Phase B: playable home page (`claude/redesign-phase-b`)

Stacked on #54 (Phase A); base `main`; 58 files, +2756/−984; draft and explicitly
gated "DO NOT MERGE BEFORE NOV 13".

What it does: replaces the static hero with one playable 9-7 vs dealer-10 hand,
keeps the coach answer from `src/coach/blackjack.js` (hit −0.535 vs stand −0.537
per $1), and carries the Phase A design system through 49 regenerated guide
pages via new `scripts/site-chrome.mjs` + `web/site.css` + Inter/Inter Tight
fonts.

Checks that passed review:

- The hero hides/shows correctly: `web/site.css` includes
  `[hidden]{display:none!important}`, so the inline `.coach`/`.moves` display
  rules cannot defeat the `hidden` attribute.
- Tracking is preserved without new event names: the header keeps
  `cta_click/open_trainer/location=header`, the hero buttons add
  `data-cta=hero_hand` with `hero_hit`/`hero_stand`, and the post-answer CTA
  stays `start_daily/location=hero`.
- `scripts/build.mjs` copies the new `site.css` into `dist/web/`, and fonts are
  copied by the existing folder copy.
- Answer accuracy matches the brief; the "Try it again" control resets state and
  moves focus.

Risks / notes for the merge window:

1. It touches `/` (frozen until Nov 13) and regenerates 49 guide pages. The gate
   in the PR title/body is correct; do not let the hourly run merge it early even
   if `test` is green.
2. The landing page swaps Sora for Inter. No other page is changed to stop
   referencing Sora in this PR, so the font files stay in the bundle. Harmless,
   but worth a follow-up cleanup rather than doing it inside a frozen window.
3. No test changes accompany the landing markup. The existing release tests do
   not snapshot the hero, so the green check proves the build, not the hand
   logic. Manual phone check is still required before Nov 13.
4. `aria-label` on the card spans plus `role="img"` is fine, but the two card
   groups have no group label; screen-reader users get "Ten of clubs, face-down
   card, Nine of spades, Seven of hearts" without "dealer/you". Minor.

### #60 — Redesign Phase B part 2: trainer, privacy, itch guides (`claude/redesign-phase-b2`)

Base is `claude/redesign-phase-b`, not `main`; 10 files, +709/−602; draft and
gated to Nov 13.

What it does: gives `/web/` the "Deal Me In" look (loads `site.css`, maps trainer
tokens onto shared tokens, adds desktop ≥1024px two-column layouts and a related
guides box), restyles privacy, and teaches the itch bundler about the shared
header/footer/stylesheet/fonts.

Checks that passed review:

- `scripts/portable-links.mjs` handles every new absolute link, including
  `/guides/` → `index.html#portableGuides`, `/web/?daily=1`, `/web/site.css` and
  `/web/fonts/*.woff2`; the new `localStylesheet()` rewrite matches the unquoted
  `url(/web/fonts/...)` form actually used in `site.css`.
- The added tests are meaningful: they assert no absolute same-site `href`/`src`
  remains in any bundled page and that bundled CSS has no absolute font URL.
  This is the right guard for the itch ZIP.
- `web/privacy.html` deliberately uses relative trainer links so the page works
  both live and in the portable bundle; `build-itch.mjs` rewrites the remaining
  absolute links.
- Privacy and trainer changes keep the existing meta/JSON-LD blocks.

Risks / notes:

1. **Stacked base.** Its required `test` check validates the branch against
   `claude/redesign-phase-b`, so green here does not prove `main` + #60. After
   #55 merges, rebase/retarget #60 onto `main` and let CI run again before
   merging.
2. It also touches `/web/` (frozen until Nov 13). Same gate as #55; do not merge
   both in one squash without re-running CI on the combined tree.
3. `#scr-title > .hint, #scr-title > div:not(...) { text-align: left !important; }`
   is the only new `!important` and is scoped to the title screen. Acceptable,
   but it will be brittle if the title markup changes.
4. The desktop layout reorders `.map-main`/`.map-side` with wrappers inside
   `#scr-map`. Phone order is preserved by CSS, but there is no automated
   visual/DOM-order test for the two-column mode; the manual Nov 13 pass should
   cover 1024px+ and the 760–1023px band.

## Handoff

- Branch pushed: `deepseek/ci-chromium-available`.
- Required check to watch: `test` (aggregates unit-release, browser-core,
  browser-offline, browser-storage, bend).
- No PR opened by me; Claude's hourly run owns that.
- No app behaviour, tracking, analytics, deploy, pricing or branch-protection
  files were modified.
