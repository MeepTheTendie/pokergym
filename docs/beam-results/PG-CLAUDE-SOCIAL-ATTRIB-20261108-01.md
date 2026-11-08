# PG-CLAUDE-SOCIAL-ATTRIB-20261108-01 — Social attribution trustworthiness (Beam)

- **task id:** `PG-CLAUDE-SOCIAL-ATTRIB-20261108-01` (issue #41 comment 6727884430, TOP PRIORITY reorder)
- **from:** Claude (integrator), 2026-11-08 ~4:25 PM CT
- **status:** `PARTIAL` (code/test + IG bio diagnosis/corrected URL delivered; per-clip raw-vs-real PostHog pull and Wren table **BLOCKED** on PostHog credentials in this environment — see Actions 1, 2, 4)
- **branch:** `beam/social-attrib`
- **commit(s):** `44b636d` (final, after amend to correct commit ref in this file) — `fix(analytics): exclude virtual bot/automation traffic; social attrib result (PG-CLAUDE-SOCIAL-ATTRIB-20261108-01)`
- **deadline:** Mon 2026-11-09 18:00 CT

## Reasonable reading (task was partially ambiguous without live data access)

The task asks for a raw first-touch pull, per-clip classification (unfurlers/Metricool/ChatGPT readbacks/owner checks/people), `notTestClause()` extension if not people, the bad Instagram bio link location + exact corrected URL, and a Wren-ready table. This workspace is a fresh detached worktree with **no `POSTHOG_PERSONAL_API_KEY` / `CLOUDFLARE_API_TOKEN` available** (`scripts/stats.mjs`/`analytics-report.mjs` read env or `secret-tool`; `.env` absent; `gh` CLI unavailable). I **did not fabricate** any PostHog numbers. I: (a) extended `notTestClause()` to exclude PostHog `$virt_traffic_type` `Bot`/`Automation`/`AI Agent` (defensible, test-backed), (b) documented the exact method/queries for the raw pull and per-clip table so Claude/Wren can run them with credentials, (c) identified the Instagram bio backtick issue location and provided the exact corrected URL, (d) cited repo evidence for the YouTube 2–3/clip pattern. Actions 1 and 4 remain blocked on running HogQL against project 670990.

## Action 1 — YouTube clips: raw first-touch 2–3 Desktop visitors to `/web/` (who are they?)

**Live determination:** BLOCKED in this run (no PostHog key). **Do not claim verified per-clip raw vs real without running the queries below.**

### Evidence from repo (consistent with non-human traffic, not a substitute for per-clip live verification)

`docs/PokerGymControlDoc.md` (2026-10-23 entry, Grok read-only HogQL, project 670990, since 2026-10-21, `notTestClause()` applied): every first-touch video-tagged person (youtube/reels/facebook) = **15 people, 0 game starts**. 7/8 arrivals tagged to a 4 PM post landed **1–3 minutes after 21:00 UTC**; fingerprints matched crawlers, not viewers: 6 were a single `$pageview` with **no browser, 1366x1400 screen, 0 s on page**; others matched **1920x1080 / 1366-viewport unfurl** pattern or **2000x2000 Chrome-on-Windows checker, fixed 10 s pageleave**. `new-hook` youtube arrivals on 2026-10-21 came within 13 s of the 8 AM post, same pattern. Reading recorded there: videos currently bring ~0 human site visitors (small sample). The “2–3 Desktop visitors to /web/ per YouTube clip” described in this task fits that unfurl/checker/readback cluster pattern; **per-clip raw vs real must be confirmed with the live pull** using `$virt_traffic_type`, UA, screen size, time after publish, and interaction.

### Classification criteria (apply per first-touch person, per clip `utm_content`)

| Signal | Suggests non-person | Suggests person |
|---|---|---|
| `$virt_traffic_type` | `Bot`, `Automation`, `AI Agent` | `Regular` / null |
| Time after publish | lands within ~0–5 min of scheduled 21:00 UTC / 4 PM CT post window (or immediately after post time) | later, varied |
| Interaction | only `$pageview`/auto `open_trainer`/auto `start_*`/`hand_dealt`, no `decision_made`, no `hand_complete`/`session_complete`/`daily_complete`, no `recap_tap`/`share`/`cta_click`/`feedback_submit` | makes a real decision or finishes a hand/run, or returns |
| UA / browser | no `$browser`, impossible UA combos, headless defaults, checker UA | normal browser/OS |
| Screen/viewport | 1366x1400 no-browser single-pv; 2000x2000 checker; 1366x768 viewport + 1920x1080 screen unfurl fingerprint at post hour | plausible varied viewport |
| Page depth / duration | single pageview, ~0–10 s fixed, `/web/` only | multiple events or meaningful dwell |

**Unfurlers:** link-preview crawlers (X/Discord/Slack/Meta etc.) — typically immediate after publish, single pageview/open, no interaction. **Metricool/ChatGPT readbacks / owner checks:** may show `Regular` or odd fingerprints; owner checks often have known refs/devices (ControlDoc notes 3 `reels` people were `ig-bio` link visits, 2 iPhones same city, plausibly owner checks — unverified). **People:** `Regular` (or null) + real interaction and/or plausible later arrival.

### HogQL templates to run (project 670990, Chicago reporting as needed; **run with `POSTHOG_PERSONAL_API_KEY`**)

**A. Raw first-touch persons for YouTube-tagged clips (no filter), last 30 days** — first touch = earliest event carrying clip attribution; adapt `utm_source`/`ref`/`utm_content` to match how YouTube posts are tagged (`ref=youtube`, `utm_source=yt/youtube`, `utm_content` = clip slug). Exclude only true test markers if desired for “raw operational” view, but task states “no filter” for the raw pull — report **both** raw and clean.

```sql
-- Per-person first touch for YouTube clip traffic, last 30 Chicago days (raw).
SELECT
  person_id,
  argMin(properties.utm_content, timestamp) AS first_utm_content,
  argMin(coalesce(nullIf(properties.ref,''), nullIf(properties.utm_source,'')), timestamp) AS first_ref,
  min(timestamp) AS first_ts_utc,
  toString(toTimeZone(min(timestamp), 'America/Chicago')) AS first_ts_chicago,
  any(properties.$virt_traffic_type) AS virt_traffic_type,
  any(properties.$raw_user_agent) AS ua,
  any(properties.$browser) AS browser,
  any(properties.$os) AS os,
  any(properties.$device_type) AS device_type,
  any(properties.$screen_width) AS screen_w,
  any(properties.$screen_height) AS screen_h,
  any(properties.$viewport_width) AS viewport_w,
  any(properties.$viewport_height) AS viewport_h,
  countIf(event = '$pageview') AS pageviews,
  countIf(event IN ('game_start','start_daily','start_training')) AS starts,
  countIf(event = 'hand_dealt') AS hands_dealt_events,
  countIf(event = 'decision_made') AS decisions,
  countIf(event = 'hand_complete') AS hands_complete,
  countIf(event = 'session_complete') AS session_complete,
  countIf(event = 'daily_complete') AS daily_complete,
  countIf(event IN ('recap_tap','share','cta_click','feedback_submit','recap_view')) AS other_interactions
FROM events
WHERE timestamp > now() - INTERVAL 30 DAY
GROUP BY person_id
HAVING lower(first_ref) IN ('youtube','yt')
   OR lower(first_ref) LIKE '%youtube%'
LIMIT 100000
```

**B. Clean (real-candidate) view:** apply the same exclusions as `npm run report` / `notTestClause()` in `scripts/stats.mjs` (includes the new `$virt_traffic_type` Bot/Automation/AI Agent exclusion added in this commit). Compare counts per `first_utm_content` (clip): **raw persons vs clean persons**; for clean persons report interactions above.

**C. Time-after-publish:** join each clip’s known publish instant (from Metricool/native platform records in ControlDoc) to `first_ts_chicago`; flag arrivals within 0–5 minutes as unfurl-suspect unless interaction proves human.

## Action 2 — `notTestClause()` extended (defensive) + conditional follow-up

**Implemented now (defensive, aligned with action 1’s `$virt_traffic_type` signal):** `scripts/stats.mjs` `notTestClause()` now excludes events whose `properties.$virt_traffic_type` is `Bot`, `Automation`, or `AI Agent` (null/`Regular` pass). Rationale: ControlDoc (2026-11-03 entry) shows `$virt_traffic_type` categories exist (Regular/Automation/Bot/AI Agent); PostHog-classified non-human traffic should not count in clean funnel/report numbers. This complements existing behavioural rules.

**Conditional (after action 1 live pull):** if specific YouTube-clip visitors remain in the clean set but match unfurler/readback fingerprints (e.g., fixed post-window timing + no-interaction + checker UA/screen/viewport combos not yet covered), add **narrow** rules to `notTestClause()` with tests. Do **not** over-exclude real people (keep anyone with real interactions / second-day activity as existing rules do). Candidate patterns to evaluate from live data: `YouTube`/platform unfurl UAs, Metricool/ChatGPT readback signatures if present, and any clip-specific 1366x1400-no-browser single-pageview-at-post-time variants.

**Not changed:** PostHog dashboard 2263366 is an external/PostHog-side artifact (not editable from this repo without PostHog access); `npm run report` and repo HogQL consumers use `notTestClause()`/`scripts/stats.mjs` and will pick up this exclusion.

## Action 3 — Instagram bio link: stray backtick (`ig-bio\``)

**Observed (repo evidence):** `docs/PokerGymControlDoc.md` Wren entries 2026-11-07/08 report “instagram first-touch persons now 10 (8 carrying the **backticked `ig-bio\``** link)”. Task states 8 people arrive with first-touch `utm_content` as `ig-bio\`` (stray backtick).

**Where the bad link lives (cannot be fixed in this repo):** the **Instagram profile bio link for @playpokergym** (external platform setting). ChatGPT recorded an owner-confirmed bio update on 2026-10-29 (ControlDoc): intended link `https://playpokergym.com/web/?utm_source=ig&utm_medium=reel&utm_campaign=hooktest1112&utm_content=ig-bio` — evidence level owner-confirmed, not independently checked live. The live bio URL currently produces/has `utm_content=ig-bio\`` for arriving visitors, which means the stored URL contains a trailing backtick (`` ` ``) at the end of the value or link field. **No tracked file in this worktree contains the bad `ig-bio\`` URL** (searched repo/docs); fix requires editing the Instagram bio link in Meta/Instagram.

**Exact corrected URL (give to Claude / owner to set as the bio link):**

```text
https://playpokergym.com/web/?utm_source=ig&utm_medium=reel&utm_campaign=hooktest1112&utm_content=ig-bio
```

**Verification after fix:** in PostHog, new Instagram bio arrivals should show `utm_content` = `ig-bio` (no backtick), `utm_source=ig`, `utm_medium=reel`, `utm_campaign=hooktest1112`. Existing historical events keep the backticked value; for reporting, treat `ig-bio` and `ig-bio\`` as the same campaign/bio source (bucket normalization can be added in report code if Wren wants a rolled-up label — not done here without a concrete requirement).

## Action 4 — Wren table (Tue): per platform and per clip, real visitors → dealt a hand → finished, last 30 days

**Status:** BLOCKED in this run (no PostHog access). **Template/definitions below; populate from live HogQL.**

**Definitions (proposed, align with existing analytics):** *Real visitors* = clean, first-touch-attributed persons in window after exclusions (use `notTestClause()` / same rules as report) — or, for “raw vs real” transparency, show raw and real. *Dealt a hand* = person had `hand_dealt` and/or started gameplay (`game_start`/`start_daily`/`start_training` with real interaction context) — prefer `countIf(hand_dealt)>0 OR countIf(decision_made)>0 OR countIf(game_start)>0` depending on Wren’s definition; state which. *Finished* = `session_complete` (five-hand/training completion) and/or `daily_complete` as relevant — separate columns if needed.

| platform | clip (`utm_content`) | raw visitors | real visitors | real → dealt a hand | real → finished (session_complete) | real → finished (daily_complete) | notes (unfurl/readback/owner/person mix) |
|---|---|---:|---:|---:|---:|---:|---|
| YouTube (`yt`/youtube) | *(per clip)* | | | | | | fill from Action 1 classification |
| Instagram (`ig`/reels) | *(per clip + `ig-bio`/`ig-bio\`` bucketed)* | | | | | | bucket backtick variant with `ig-bio` |
| Facebook (`fb`) | *(per clip)* | | | | | | |
| **Total** | | | | | | | |

**SQL sketch (aggregate by first-touch platform + clip, last 30 days):** build one row per person with `argMin` first-touch `utm_source/ref/utm_content`, apply clean clause for “real” metrics, then `GROUP BY platform, clip` counting distinct `person_id` and flagging dealt/finished via person-level `max(countIf(...))>0` or conditional distinct counts. Must run in PostHog with credentials.

## Verification (commands run + actual output)

### Unit tests (touched areas)

```text
$ node --test test/worker.test.js test/analytics-report.test.js
...
ℹ tests 52
ℹ suites 0
ℹ pass 52
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 92.1131
```

### Full suite (unrelated failure observed; no changes made to it)

```text
$ npm test
...
ℹ tests 367
ℹ suites 0
ℹ pass 366
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5121.7686

✖ failing tests:
test at test\scenarios.test.js:1:1
✖ test\scenarios.test.js (98.6711ms)

$ node --test test/scenarios.test.js
Error: ENOENT: no such file or directory, open 'C:\C:\Users\Work%20Rig\AppData\Local\pokergym-opencode-dispatch\worktrees\beam-6727884430\public\sitemap.xml'
  (module load in test/scenarios.test.js:8:17)
ℹ tests 1  ℹ pass 0  ℹ fail 1
```

Failure is **unrelated to this change** (my diff is only `scripts/stats.mjs` + `test/worker.test.js` + this result file). It appears to be a Windows/worktree path mangling issue in that test’s environment (`C:\C:\...` doubled, URL-encoded space) when resolving `public/sitemap.xml`; I did not skip/delete/weaken any test (OPERATING_RULES / task rule 23/25).

### No PostHog/gh in environment (limits verified)

```text
$ node -e "try{require('fs').accessSync('.env');console.log('env exists')}catch(e){console.log('no .env')}"
no .env

$ gh --version
gh : The term 'gh' is not recognized...
Exited with code 1
```

## BLOCKED / needs from integrator (Claude)

1. **PostHog HogQL access** (project 670990, `POSTHOG_PERSONAL_API_KEY` or equivalent) to run Action 1 raw/clean per-clip pull and populate Action 4 table before Tue brief. Use templates in Actions 1/4 and the updated `notTestClause()` semantics.
2. **Instagram @playpokergym bio link fix (external, owner/authorized admin):** replace bio URL with the exact corrected URL in Action 3 (remove trailing backtick). Repo cannot change it.
3. **BEAM-RESULT comment on issue #51:** `gh` CLI unavailable in this run; I cannot post the comment. Please post a `BEAM-RESULT` on #51 referencing this branch/commit/result file, or instruct rerun with `gh` auth.
4. **Push:** attempted in this run (see git output below). If push fails, commit remains local per task rules.

## Files changed

- `scripts/stats.mjs` — `notTestClause()` excludes `$virt_traffic_type` Bot/Automation/AI Agent.
- `test/worker.test.js` — asserts `$virt_traffic_type` exclusion in notTestClause test.
- `docs/beam-results/PG-CLAUDE-SOCIAL-ATTRIB-20261108-01.md` — this report.
