# Review notes: Beam's "Measurement fix + cache-bust + preview filter"

**Written:** October 23, 2026
**Reviewer:** OpenCode agent session (model: Beam Free), at Wes's request
**For:** Beam (author) and Grok (second reader)
**Commit under review:** `e7636d6` — "Measurement fix + cache-bust + preview filter (Oct 22 afternoon)"
(original commit `4474cab` on this machine; rebased onto `origin/main` during the Oct 23 sync, content unchanged)
**Status of this document:** untracked and unpushed. Delete or commit as Wes prefers.

---

## 0. Why this file exists

Wes asked, after syncing this machine with GitHub, "did Beam fuck up?"

Short answer: **no outage, no data loss, the deploy is real, but the central fix probably does not
do what the commit message and the control-doc entry claim, and the change carries a small
undercount risk that nobody has measured.**

Everything below is evidence-first. Where I could not verify something, it is called out
explicitly (§6-§7) so Beam/Grok can check it rather than take my word.

---

## 1. What shipped (facts, verified)

| Item | Verified how | Result |
| --- | --- | --- |
| Live deploy exists | `curl -s https://playpokergym.com/web/` | `app.js?v=669b3ef55310` |
| Preview code is live | `curl -s https://playpokergym.com/src/rpg/analytics.js \| grep -c visibilityState` | `1` |
| Tests pass on this machine | `npm test` | 366 pass, 0 fail |
| Build works | `npm run build` | `app.js?v=<sha>` rewritten in `dist/web/index.html` |
| CI on the push | `gh run list` | run `40039019024`, `tests`, success, 36s |

So the "verified live / 366 tests pass / build clean" lines in the control doc are accurate.

---

## 2. Findings at a glance

| # | Severity | Finding |
| --- | --- | --- |
| F1 | **High** | Headless crawlers running as a single active document report `visibilityState = 'visible'`, so the filter may tag none of the unfurl cluster it was built for. The "55 → 40" prediction is unverified. |
| F2 | **Medium-High** | Real players who load the trainer in a background tab are permanently tagged `preview:true` and silently dropped from the funnel (no second chance, `opened` guard). |
| F3 | **Medium** | Only `open_trainer` is tagged. The same crawlers' `$pageview`s still inflate players / DAU / visits. |
| F4 | **Medium** | The exclusion lives only in the CLI query helper. A PostHog-side canonical dashboard will not inherit it, so PostHog and `npm run report` will disagree. |
| F5 | **Medium** | The cache-bust hashes only `web/app.js`, but app.js has 19 unversioned `../src/*` imports — including the analytics module this commit changed. If the stale-bundle theory was right, this does not fix it. Freshness is largely already covered: `max-age=0, must-revalidate` forces HTTP revalidation on every
load (verified live on both `/web/app.js` and `/src/rpg/analytics.js`), and the service worker
precache is content-versioned over `web/` + `src/`. |
| F6 | **Low-Medium** | Neither behaviour has a test. The only test edit swapped an assertion string. The hash rewrite fails silently if `?v=` ever disappears from `index.html`. |
| F7 | **Low** | `stageReachQuery` switches definitions, and `open_trainer` only exists from Oct 18 — so any window reaching before Oct 18 compares against a stage that did not exist. |
| F8 | **Nit** | Redundant dynamic imports shadow the static ones at the top of `scripts/build.mjs`. |

---

## 3. Findings in detail

### F1 — The crawler mechanism is probably wrong, and is at least unverified (High)

**Claim in the code and doc** (`src/rpg/analytics.js:91-95`, control-doc entry):
> "Link-preview crawlers (Reddit/Discord/Slack unfurls) load the trainer in a background tab:
> the page is never visible..."

**Test I ran on this machine** (headless Chromium, the same class of renderer described in the
control-doc entry as "1366x768 headless viewport"):

```bash
printf '<html><body><script>document.body.textContent="state="+document.visibilityState+" hidden="+document.hidden;</script></body></html>' > /tmp/opencode/vis.html
chromium --headless=new --disable-gpu --no-sandbox --dump-dom file:///tmp/opencode/vis.html
chromium --headless    --disable-gpu --no-sandbox --dump-dom file:///tmp/opencode/vis.html
```

Result, both headless modes:

```
state=visible hidden=false
```

A headless renderer loading the page as its active document reports **visible**, not hidden.
So *if* the unfurl cluster runs that way (single active document in a headless browser), the
filter returns `preview = false` for exactly the population it was written to remove, and the
`AND (properties.preview IS NULL OR properties.preview = false)` clause in `scripts/stats.mjs:97`
filters nothing. A crawler that instead opens the page in a background tab *would* be caught —
we do not know which execution mode this cluster uses (§7). The doc's evidence ("1366x768
headless viewport") points at the single-document case, which is what makes the claim unsafe.

**Consequence for the record, not just the code:** the doc entry tells Wren and Muse that
"opened the trainer" should drop from ~55 to ~40 over the 30-day window and that this is a
measurement correction, not lost traffic. If the filter catches nothing, either (a) nobody
notices and the number does not move, or (b) the number moves for an unrelated reason and the
crew attributes it to this change. Both are bad. Recommend a correction line in the control doc.

**What the cluster might actually be:** I could not inspect the raw events (no PostHog
credentials in this environment — see §7). The observable signals already in the code
(`AUTOMATION_USER_AGENTS`, hardcoded `AUTOMATION_PERSON_IDS` in `scripts/stats.mjs:66-77`, the
`utm_content` value, the 21:02 UTC arrival time) are stronger discriminators than visibility,
because they describe the *request* rather than a browser tab state the renderer has no reason
to set.

### F2 — Background-tab players are permanently misclassified (Medium-High)

`src/rpg/analytics.js:88-90`:

```js
openTrainer(props = {}) {
  if (opened) return false;
  opened = true;
  ...
  const preview = typeof document !== 'undefined' && document.visibilityState !== 'visible';
```

`openTrainer` is called once, during module init (`web/app.js:2524`), on every `/web/` load.
A real person who opens the link in a background tab (cmd-click, "open in new tab", some in-app
browsers that hand off before painting) emits `open_trainer` with `preview: true`, and the module
never emits it again for that page load. They are excluded from the funnel *forever* for that
session, and the exclusion is invisible in the data — there is no counter of "events suppressed
as preview".

On counts this small (the doc says roughly 15-17 of 51 over 30 days were crawler), even a couple
of misclassified humans is a material distortion, and it biases in the direction that looks like
"nobody is arriving", which is the exact question Wes said on Oct 22 he is waiting until
Halloween to answer.

**Safer design:** emit `open_trainer` on first visibility rather than at module init, and tag
`preview` only when the page was hidden *and* no user interaction (pointer/key/scroll) ever
happened before it unloaded, or when the UA/viewport matches the automation profile. That is a
real signal and cannot silently eat a human.

### F3 — The pollution is only half-cleaned (Medium)

`preview: true` is attached only to `open_trainer` (`src/rpg/analytics.js:100-103`). The same
crawler still emits `$pageview` for `/web/`, and `$pageview` is what `playersByDayQuery`
(`scripts/stats.mjs:103`) and the canonical dashboard's "players / returned another day"
definitions (`docs/CanonicalDashboard.md:17`) count. So the funnel's first stage keeps its
machine visitors even if F1 were fixed.

If the goal is "stop counting machines as people", the tag needs to be on the session's pageview
too (or the crawler needs to be excluded at ingestion, or the scorecard needs a UA/viewport
filter rather than an event-level one).

### F4 — The filter does not reach the canonical dashboard (Medium)

`notTestClause()` (`scripts/stats.mjs:85-98`) is consumed by `stats.mjs`, `analytics-report.mjs`
and `scorecard.mjs`. The crew's Oct 22 decision is to build one real dashboard **inside PostHog**
(`docs/PokerGymControlDoc.md`, Oct 22 "Build one real PostHog dashboard" + the Dashboard Spec
section). Insights built in the PostHog UI will not carry this clause, so the same "opened the
trainer" number will read differently in PostHog and in `npm run report`. That is the precise
failure mode the canonical-dashboard decision was made to end.

The doc entry does not mention this, so whoever builds the PostHog objects will silently do it
without the exclusion.

### F5 — The cache-bust does not cover the code that changes (Medium)

`scripts/build.mjs:22-31` hashes `dist/web/app.js` and rewrites `app.js?v=` in
`dist/web/index.html`. But `web/app.js` is a thin entry point: it has **19** import statements
resolving to `../src/*.js` with no query string (`web/app.js:1-20`), and essentially all logic —
including `src/rpg/analytics.js`, the file this commit changed — lives there.

So the hash is stable across a deploy that only changes `src/**`, which is the common case. If
the original diagnosis ("returning visitors get a stale bundle") was correct, this does not fix
it for src changes; if it was wrong, the change is inert.

Two reasons to think the diagnosis was at least partly wrong:

1. Every path is served with `cache-control: public, max-age=0, must-revalidate` — verified live:
   ```bash
   curl -sI https://playpokergym.com/web/app.js | grep -i cache-control
   # cache-control: public, max-age=0, must-revalidate
   curl -sI https://playpokergym.com/src/rpg/analytics.js | grep -i cache-control
   # cache-control: public, max-age=0, must-revalidate, public, max-age=0, must-revalidate
   ```
   Browsers revalidate on every load; a stale `app.js` should not have survived a deploy.
2. The service worker precache is already content-versioned over `web/` **and** `src/`
   (`scripts/build.mjs:82-94`), and it strips the query string before matching
   (`scripts/offline-worker.js:38-45`), so `?v=` is ignored by the SW cache anyway.

Net: harmless, but it is not the fix the message says it is. If we keep it, hash the module
graph too (or hash the whole `src/` + `web/` set) so the claim matches the mechanism.

*(Adjacent, not Beam's change: `/src/*` responses carry a duplicated `cache-control` header
because both the `/*` and `/src/*` rules in `worker/security.js:31-34` match. Cosmetic, but it
suggests those rules are additive, not first-match.)*

### F6 — No tests for either behaviour (Low-Medium)

`test/worker.test.js:134` is the only test change: an assertion string swapped from
`properties.$pathname = '/web/'` to `event = 'open_trainer'`. That test would have failed if
Beam had not touched it, which is good, but it tests the SQL text, not the behaviour.

Nothing tests:
- that `preview: true` is emitted when the document is hidden (`src/rpg/analytics.js:95`);
- that `preview` events are excluded by `notTestClause` (`scripts/stats.mjs:97`);
- that the build rewrite actually replaces something (`scripts/build.mjs:31`).

`String.prototype.replace` with no match is a silent no-op. If anyone removes `?v=` from
`web/index.html`, the build keeps succeeding and the cache-bust quietly stops working. A build
assertion ("if the replacement did not change the string, fail") costs one line.

### F7 — Definition switch interacts with event history (Low)

`open_trainer` was introduced in `dc6384b` (Oct 18, 13:36 CT); analytics itself started Oct 17
(`e3e4391`). Any stage window reaching before Oct 18 compares `$pageview`-era traffic against a
stage event that did not exist yet, which reads as a cliff in "opened the trainer". For the
14-day scorecard (`scripts/scorecard.mjs`) that is roughly one day of the window, so it is
small today — but it grows if anyone widens the window, and the doc's "~55 → ~40 over the 30-day
window" baseline is really built on ~5-6 days of `open_trainer` data, not 30.

### F8 — Nit: duplicated imports (Nit)

`scripts/build.mjs:25-26` dynamically imports `createHash`, `readFile`, `writeFile` that are
already imported statically at lines 1-2. Works, just noise.

---

## 4. What Beam got right

Worth stating plainly, because the notes above read harsher than the reality:

- Found a real problem. The unfurl cluster is real; the daily 21:02 UTC pattern and the
  headless viewport are concrete evidence, not vibes.
- Did not break anything. The app still runs, tests pass, the deploy is live, and the riskiest
  change (the hash rewrite) is contained to the build.
- Wrote it into the control doc with a source line and an explicit instruction to Wren/Muse to
  annotate the next daily report so the stage-definition change is not read as lost traffic.
  That is the right habit; the only miss is that the *prediction* itself (55 → 40) was stated
  more confidently than the evidence supports.
- Correctly avoided changing the retention-hook boundary and said so.

The problem is not competence, it is that the mechanism was assumed instead of tested — the same
failure the doc criticises elsewhere ("hypothesis, not a result").

---

## 5. Proposed fixes (for Beam to accept, reject or rewrite)

1. **Replace the visibility heuristic.** Either:
   - emit on first visibility, with a fallback emit after a short timer if the page never
     becomes visible, so humans in background tabs are not silently dropped; tag the fallback
     as `preview: true`; or
   - keep the immediate emit but define `preview` as "hidden at load **and** zero user
     interaction before the first visibility change", plus the existing UA profile.
2. **Tag pageviews too** (or exclude at ingestion) if the goal is de-polluted people counts.
3. **Move the exclusion to where the numbers are read**: add the `preview` filter to the PostHog
   dashboard objects, or make the canonical dashboard spec say "exclude `preview = true`"
   explicitly.
4. **Hash the module graph** in `scripts/build.mjs` (all of `web/` + `src/`), and fail the build
   if the `?v=` replacement does not change the HTML.
5. **Add three tests:** hidden-document emits `preview`, `notTestClause` excludes it,
   build rewrite changes the string.
6. **Add a correction line to the control doc** telling Wren/Muse the 55→40 prediction is
   unverified until someone queries the cluster's `visibilityState`/UA in PostHog, so the next
   daily report does not attribute an unrelated movement to this change.

---

## 6. Suggested check for Beam before changing anything

If Beam believes the cluster is tab-based, the cheapest disproof/corroboration is one PostHog
query on the cluster population: for `open_trainer` events from those person_ids, compare
`properties.preview`, `properties.$raw_user_agent`, and `properties.$viewport` across posting
days. If `preview` is absent on all of them, F1 is confirmed on production data, not just on my
local Chromium.

I could not run that query here (no PostHog key in this environment).

---

## 7. Limits of this review (unverified / not checked)

- **No PostHog access here.** All statements about what the cluster actually looks like come from
  the control doc, not from raw events. F1 is proven for *headless Chromium in general*, not
  proven for *this specific crawler*; see §6 for the one query that settles it.
- **Two-tab behaviour not tested.** A crawler that opens pages in background tabs would report
  hidden and would be caught. I only tested the single active-document case. The doc's evidence
  ("headless viewport") points at the single-document case.
- **Not reviewed:** the rest of `6032ed7` ("Verify current phone onboarding and offline resume
  flows" — test-harness and progress-doc changes only) and anything Beam shipped after Oct 22.
- **Not reviewed:** the Oct 23 docs-only commits pulled from GitHub.

---

## 8. Environment used

```
Host:    this machine, /home/meep/Projects/pokergym
Branch:  main @ 6032ed7 (rebased onto origin/main 5f90036)
Node:    v26.8.2
Browser: /usr/bin/chromium (headless=new and legacy headless)
Live:    https://playpokergym.com (cache + bundle probes, Oct 23 ~18:20 local)
```
