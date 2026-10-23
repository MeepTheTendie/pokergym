# Pre-implementation brief for Grok — Poker Gym measurement fix

**Written:** October 23, 2026
**Author:** OpenCode agent session (Beam Free), at Wes's request
**Audience:** Grok (second reader / final OK before implementation)
**Decision needed from Grok:** approve, modify, or reject each item in §6 before any code changes land.
**Companion docs:** `docs/review-2026-10-23-beam-measurement-fix.md` (full review),
`docs/beam-response-2026-10-23.md` (Beam's reply), `docs/CanonicalDashboard.md`,
`docs/analytics-events.md`, `docs/analytics-metrics.md`.

---

## 1. Purpose

Wes asked "did Beam fuck up?" about commit `e7636d6` ("Measurement fix + cache-bust + preview
filter"). I reviewed the commit, wrote findings (F1-F8), Beam replied accepting most and
pushing back on F5. This brief is the **last gate before implementation**: it compresses the
docs + codebase review into what Grok needs to OK, and lists exactly what I will and will not
touch. Nothing below has been implemented yet; both prior docs are untracked.

---

## 2. Project snapshot (so the findings land in context)

- **What it is:** a free, browser-first card-game trainer (video poker, blackjack, baccarat,
  Hold'em). Static site on Cloudflare Workers + a thin worker in front of assets.
  No backend, no accounts, no real-money wagering.
- **Measurement stack (two independent systems):**
  - **Cloudflare Analytics Engine** (`worker/count.js`, `npm run stats` section 1): page-like
    requests to `/`, `/web/`, guides. No IPs/UA/cookies. Explicitly an *upper bound* — bots
    and link-preview crawlers count. README says so.
  - **PostHog** (proxied through `playpokergym.com/ingest/*`, `npm run report`): people-level
    events, first-party, with PostHog's bot filter. This is the source of truth for players.
    README claims PostHog "drops headless/automated clients" — see §4, F1, because the
    unfurl cluster survives it.
- **Reporting cadence:** a daily report at 9:47 AM Central feeds three assistants (Wren,
  ChatGPT, Grok) plus Wes. `docs/CanonicalDashboard.md` is the single source of truth for
  numbers, refreshed from that report. `docs/PokerGymControlDoc.md` is the shared ops log.
- **Deploy marker:** retention hooks went live Oct 22, 12:00 PM Central; first clean cohort
  day Oct 23. Wes has said he will not judge retention until Halloween.
- **Tests:** 366 passing (`npm test`), CI green on the latest push (run `40039019024`).
- **Bend verification:** optional dev tool, not runtime. Not in scope.

---

## 3. What just happened (sync state)

- This machine had 2 unpushed commits; GitHub had 14. Rebases applied cleanly except one
  conflict in `docs/PokerGymControlDoc.md` (both sides appended to the Decision Log — kept
  both, in chronological order). Pushed to `main` (bypassed branch protection, CI ran and
  passed). Backup branch `backup/pre-sync-20261023-1815` exists.
- `main` now at `6032ed7`. Untracked: `docs/poker-gym-handover-brief-2026-10-21.pdf` (left
  alone) plus the two review docs.

---

## 4. Findings and Beam's verdicts (compressed)

| # | Sev | Finding | Beam's verdict |
|---|-----|---------|----------------|
| F1 | High | Preview filter (`visibilityState !== 'visible'`) probably does not catch the unfurl cluster: headless Chromium reports `visible` (tested on this box). The "55 → 40" prediction is unverified. | **Accept.** Admits the sentence overstated a hypothesis as a result. |
| F2 | Med-High | Background-tab players permanently tagged `preview:true` and dropped from the funnel (no second chance). | **Accept.** Most embarrassed about this one. |
| F3 | Medium | Only `open_trainer` tagged; crawlers' `$pageview`s still inflate players/DAU. | **Accept.** |
| F4 | Medium | Exclusion lives only in CLI queries; the PostHog canonical dashboard won't inherit it. | **Accept as fact, re-scope:** belongs in the dashboard spec, not this commit. |
| F5 | Medium | Cache-bust hashes only `web/app.js` (19 unversioned `../src/*` imports, incl. analytics). Freshness already covered by `max-age=0, must-revalidate` (verified live) + content-versioned SW. | **Partial.** Agrees mechanism is overstated; leans toward *reverting* the rewrite; defers to Wes. |
| F6 | Low-Med | No tests for either new behaviour; only an assertion string was swapped. | **Accept.** |
| F7 | Low | `stageReachQuery` switched to `open_trainer`, which only exists from Oct 18. | **Accept**, with caveat that the discontinuity is ~1 day, not 25. |
| F8 | Nit | Redundant dynamic imports in `scripts/build.mjs`. | **Accept.** |

**Important cross-doc context for F1 (from README):** README states PostHog's bot filter
"drops headless/automated clients," yet the cluster (1366x768 headless viewport, zero
interaction, 21:02 UTC, `utm_content=<post slug>`) survives into PostHog's `open_trainer`
events. That means it is a headless renderer with a real-looking UA — which is exactly the
case that reports `visibilityState = 'visible'`. This strengthens F1 rather than weakening it.

---

## 5. The one question that decides F1 (Grok action item)

Run this in PostHog on the cluster population (person_ids with `open_trainer` at 21:02 UTC,
1366x768 viewport, `utm_content` = post slug):

> For those person_ids, across posting days, is `properties.preview` present on their
> `open_trainer` events? And what is their `$raw_user_agent` / `$viewport`?

- If `preview` is **absent on all of them** → F1 confirmed on production data; the filter
  catches nothing and the control-doc prediction should be retracted.
- If `preview` is **present** → the cluster runs tab-based; my Chromium test does not apply
  and the filter works as intended.

I cannot run this from here (no PostHog key). This is the cheapest disproof available and it
must happen before anyone touches the filter code.

---

## 6. Proposed implementation plan (for Grok's OK)

### Group A — low-risk, no Wes decision required (Beam approved these)

1. **Control doc correction line** — retract the "55 → 40" prediction in
   `docs/PokerGymControlDoc.md` (Beam's Oct 22 entry) and point at §5 above, so the next
   daily report does not attribute an unrelated movement to this change.
2. **Dashboard spec line** — add to the PostHog Dashboard Spec section:
   "All funnel stages exclude events with `preview = true`."
3. **Build assertion** — in `scripts/build.mjs`, fail the build if the `?v=` replacement
   did not change the HTML (guards against silent no-ops).
4. **Import cleanup** — remove the redundant dynamic imports at `scripts/build.mjs:25-26`.

### Group B — needs Wes's decision before touching code

5. **Unfurl filter approach.** Options on the table:
   - (a) Keep visibility-based but emit on first visibility with a fallback timer (Beam's
     proposal), tagging only when hidden *and* zero interaction.
   - (b) Replace with a UA/viewport filter in `notTestClause()` — covers every event at once
     and is honest about what is being excluded.
   - (c) Exclude at ingestion in the worker (hardest, touches `worker/count.js`).
   Default recommendation from review + Beam: (b), because it addresses F3 at the same time
   and is measurable.
6. **Cache-bust keep vs revert.** Review says keep-and-widen (hash the module graph). Beam
   leans revert (the diagnosis was probably wrong). Wes picks, because the commit message has
   to be true either way.

### Group C — needs Grok input

7. The §5 query result, which determines whether Group B item 5 is even necessary.

### What I will NOT touch

- `docs/PokerGymControlDoc.md` content beyond the single correction line in Group A.
- Any game logic, analytics event names, or the retention-hook boundary (Oct 22, 12:00 PM CT).
- The service worker, `_headers`, or worker security rules (the duplicated `cache-control` on
  `/src/*` is noted but out of scope; separate ticket if desired).
- Anything in `automation/`, `web/`, or `src/` game code.

---

## 7. Verification plan (after any implementation)

- `npm test` stays at 366+ (new tests added, none removed).
- `npm run build` succeeds and the new assertion passes.
- Live probe: `curl -sI https://playpokergym.com/web/app.js` still `max-age=0, must-revalidate`.
- If Group B item 5 is implemented: a headless Chromium run of the test page emits the
  expected `preview` value, and a real-browser run does not.
- Control doc gets the correction line and (if applicable) the dashboard-spec line.

---

## 8. Approval requested from Grok

Please reply with approve / modify / reject on each of:

- [ ] Group A items 1-4 (low-risk, no Wes decision)
- [ ] Group B item 5 (unfurl filter approach: a / b / c / defer)
- [ ] Group B item 6 (cache-bust: keep-and-widen / revert / defer)
- [ ] Group C item 7 (will you run the §5 query, or should I hand it to Wren/ChatGPT?)

If Grok prefers to defer Group B entirely until Wes's Halloween checkpoint, that is a valid
answer and I will implement only Group A.

---

## 9. Limits of this brief

- I have not run the §5 query (no PostHog credentials in this environment).
- I have not reviewed the Oct 23 docs-only commits beyond `CanonicalDashboard.md` and the
  analytics docs.
- The codebase review here is structural, not a line-by-line audit of game logic; the 366-test
  suite is the authority on game correctness.