# PG-CLAUDE-RETURN-HOOK-VERIFY-20261110-01

- task id: PG-CLAUDE-RETURN-HOOK-VERIFY-20261110-01
- correlation_id: PG-CLAUDE-RETURN-HOOK-VERIFY-20261110-01
- status: PASS
- commit(s): b1b3e3e
- branch: `beam/return-hook-verify` (pushed to `origin/beam/return-hook-verify`)

## Reading / scope statement
Read-only groundwork per task. I did **not** modify `web/`, `worker/`, or tests. I read `docs/OPERATING_RULES.md`, `web/app.js` (recap and Daily Drill code), and the related tests `test/daily.test.js`, `test/analytics.test.js`, `scripts/reminder-browser-test.mjs`. I also inspected `src/rpg/daily.js`, `src/rpg/state.js`, `src/rpg/analytics.js`, and `web/index.html` for referenced behavior/line evidence.

## Verification (commands run and actual output)

```text
$ git status --short
(no output before creating result file)

$ git branch --show-current
(no output; detached HEAD at start)

$ git log -1 --oneline
0e87501 Record: Claude video format test clip (9s vs 7) into docs/reviews (#107)

$ git checkout -b beam/return-hook-verify
Switched to a new branch 'beam/return-hook-verify'

$ git add docs/beam-results/PG-CLAUDE-RETURN-HOOK-VERIFY-20261110-01.md
$ git commit -m "Add return-hook recap/Daily Drill verification result (PG-CLAUDE-RETURN-HOOK-VERIFY-20261110-01)"
[beam/return-hook-verify b1b3e3e] Add return-hook recap/Daily Drill verification result (PG-CLAUDE-RETURN-HOOK-VERIFY-20261110-01)
 1 file changed, 98 insertions(+)
 create mode 100644 docs/beam-results/PG-CLAUDE-RETURN-HOOK-VERIFY-20261110-01.md

$ git push -u origin beam/return-hook-verify
To https://github.com/MeepTheTendie/pokergym.git
 * [new branch]      beam/return-hook-verify -> beam/return-hook-verify
branch 'beam/return-hook-verify' set up to track 'origin/beam/return-hook-verify'.
```

## Findings

### (a) How the recap is reached and every way the player leaves it

**Recap container:** `web/index.html:403` defines `<div class="window" id="sessionSummary" hidden></div>`.

**How reached (rendered/shown):**
- **Five-hand session (non-daily) completion:** `web/app.js:1899-2008` `settleHand(...)` scores the session via `scoreSession(...)` (`web/app.js:1985-1994`, `src/rpg/state.js:445-462`, `SESSION_HANDS=5` at `src/rpg/state.js:445`). When the short session ends and `profile.activeSession` becomes `null`, it calls `renderSessionSummary(profile.sessions[0])` at `web/app.js:2007`.
- **Daily Drill completion (scored or replay):** `web/app.js:2411-2484` `settleDailyHand(...)` records progress/results (`2411-2451`), emits `analytics.dailyComplete(...)` when finished at `2457` (`test/analytics.test.js:281` asserts this call shape), then calls `renderSessionSummary(null, run)` at `2461` for finished daily runs.
- **Render/show behavior:** `renderSessionSummary(session, daily=null)` at `web/app.js:2108-2409` builds recap content into `#sessionSummary`, emits `analytics.recapView({ daily_done, missed, run_id, run_kind })` at `2164`, and unhides the recap with `box.hidden = false` at `2408`. For regular sessions it also emits `analytics.sessionComplete(...)` at `2153` (daily already completed in `settleDailyHand`, noted at `2151-2152`).

**Ways the player leaves the recap (actions available on recap):**
- **Review mistakes:** `web/app.js:2168-2177` button “Review my mistakes” (shown only when `missed > 0 && profile?.mistakes?.length`) emits `analytics.recapTap({ button: 'review_mistakes', run_id })` and calls `openReview()` (`openReview` at `978-983`, screen `scr-review`). Recap element itself is not hidden by this handler.
- **Play Daily Drill (non-daily recap, daily not done):** `web/app.js:2179-2190` primary button `Play Daily Drill #${todayNum}` emits `analytics.recapTap({ button: 'daily_drill', run_id })` and calls `startDaily('recap')` (`1149+`, entry mapped in `test/analytics.test.js:295-299` includes `'recap'`). Starts/loads drill flow; recap not explicitly hidden here.
- **Play another five hands / Replay this drill:** `web/app.js:2191-2210` emits `analytics.recapTap({ button: daily ? 'replay_daily' : 'play_again', run_id })`, hides recap (`box.hidden = true`, `2197`), then either resets daily mode and calls `startDaily('replay')` (`2198-2202`) or begins a new five-hand session via `beginSession`/`save`/`startGym` (`2204-2209`).
- **Challenge a friend (share):** `web/app.js:2211-2234` attempts `navigator.share` or clipboard copy, tracks share/click events (`2223-2229`) and emits `analytics.recapTap({ button: 'challenge', run_id })` on success (`2230`); user-cancel/errors are swallowed (`2231-2232`). Does not navigate or hide recap.
- **Browser reminder (push) toggle:** `web/app.js:2248-2295` when `pushSupported()` (`web/push.js` imported at `38`), shows push option, emits `window.trackEvent?.('push_prompt_shown', { surface: 'recap' })` on render (`2249`), and on click toggles subscription via `enablePush`/`disablePush`, emits `window.trackEvent?.('push_opt_in', { result, surface: 'recap' })` (`2277`) with in-place status copy (`2278-2292`). No navigation/hide.
- **Calendar reminder download (.ics):** `web/app.js:2302-2343` anchor downloads `poker-gym-reminder.ics` (data URL built at `2312-2336`) and on click emits `window.trackEvent?.('calendar_reminder', { surface: 'recap' })` and `analytics.recapTap({ button: 'calendar_reminder', run_id })` (`2337-2340`). No navigation/hide.
- **Install app / Add to Home Screen:** `web/app.js:2364-2393` (non-standalone only). iOS gets instructional text (`2367-2371`); non-iOS gets an install button wired to existing `#btnInstall` click and emits `analytics.recapTap({ button: 'install', run_id })` (`2374-2382`), visibility synced to `beforeinstallprompt` (`2384-2385`). No navigation/hide.
- **Close recap:** `web/app.js:2395-2398` button “Close recap” sets `box.hidden = true` (dismisses recap only).
- **Implicit/underlying navigation path after recap remains visible:** `web/app.js:2479` sets `#btnNext` text to “Back to home” when finished; `btnNext.onclick` (`2772-2795`) hides `battleEndRow` (`2776`) and, for finished daily or awarded badge, clears daily/awaiting state and returns to map (`2778-2793`), otherwise starts next hand (`2794`). This is the battle end-row control beneath/alongside recap state (not a recap button), but it is a way the player proceeds from the end-of-run screen.

**Related test evidence:** `scripts/reminder-browser-test.mjs` drives to recap after 5 hands and verifies reminder section/options (`145-188`), including push subscribe without download (`158-167`) and calendar `.ics` download without subscribe (`169-186`).

### (b) How often the Daily Drill changes: date source, timezone and rollover time, and whether "fresh tomorrow" is literally true

- **Date source/key:** `src/rpg/daily.js:13-18` `dailyKey(date = new Date())` formats the player’s **local** calendar date as `YYYY-MM-DD` using `date.getFullYear()`, `getMonth()+1`, and `getDate()` (no UTC conversion). Tests confirm local formatting/default behavior (`test/daily.test.js:39-43`).
- **Timezone:** Local device/browser timezone of `new Date()` / `Date` local getters (`src/rpg/daily.js:13-18`, countdown uses local midnight via `new Date(now.getFullYear(), now.getMonth(), now.getDate()+1)` at `122-123`). No explicit timezone parameter.
- **Rollover time:** Local midnight boundary (next calendar day key) implied by local date keying; countdown target is next local midnight (`src/rpg/daily.js:121-129` `formatDailyCountdown`).
- **How often it changes:** Once per local calendar day key. Drill number is day count since fixed launch `DAILY_LAUNCH_KEY='2026-01-01'` (`src/rpg/daily.js:8,45-47`), and plan is deterministic per key (`dailyPlan` -> `dailyPlanV2` at `69-86`, seeded from key/`plan:${key}` in V1 at `53-67`; tests `test/daily.test.js:53-63` show same key => same plan, different day => different plan).
- **"Fresh tomorrow" literally true?** **Yes, literally at local midnight rollover:** a different local `YYYY-MM-DD` key yields a different `dailyNumber` (`45-47`) and (for different day keys) a different seeded plan (`53-67,78-86`; `test/daily.test.js:62`). The UI communicates this in completed-daily copy/countdown (e.g. `web/app.js:2468`, `2350`, `2147`, and title/map states using `dailyNumber/dailyCompleted` at `335-356,609-627`).

State/guardrails: first completion stored in `profile.daily.lastKey/history` and replay is not rescored (`src/rpg/state.js:111-153`, `dailyCompleted` `96-99`; `test/daily.test.js:77-120,134-140`; `web/app.js:1156` sets `scored: !completed`).

### (c) What the recap already shows about reminders or Daily (and what exists to avoid duplication)

**In recap UI (`renderSessionSummary`, `web/app.js:2108-2409`):**
- **Daily-related content:** header/score context distinguishes daily vs session (`2120,2124-2128,2139-2142,2147`), shows `Daily Drill #number` complete and daily streak in summary (`2120,2140,2154,2354-2359`). If recap is for a non-daily session and today’s daily is not done, it offers a primary CTA `Play Daily Drill #${todayNum}` that starts the daily (`2179-2190`). If missed hands, it tells user “The next Daily Drill unlocks in ${formatDailyCountdown()}.” (`2345-2351`). Daily replay button offered as “Replay this drill” when `daily` recap (`2191-2202`).
- **Reminder-related content:** dedicated “Want a reminder for tomorrow?” section (`2238-2246`) explicitly explains two different options. **Browser notification** path (when supported) explains device-only tomorrow-morning notification, no email/account, with enable/disable button and status including next reminder time label from `nextReminderLabel()` (`2248-2295`, label helper `2092-2104`, sends at 14:00 UTC noted in code). **Calendar file** path explains it downloads an `.ics` for a calendar app and “does not send a browser notification” (`2302-2343`). If push unsupported, shows add-to-home-screen/calendar fallback note (`2296-2300`). `scripts/reminder-browser-test.mjs:146-188` asserts these distinctions/behaviors.

**Existing nearby Daily/reminder prompts outside recap body but on same completion flow:** `settleDailyHand` finished verdict text (master line/typewriter) includes “Come back tomorrow for #…” and unlock countdown (`web/app.js:2466-2475`); recap is rendered in addition for finished daily (`2461`). Title/map surfaces also promote/resume daily (`web/app.js:335-356,397-401,609-690,1153-1163`), so a new recap prompt must avoid duplicating these existing reminder and “play/resume/replay daily” affordances.

### (d) Whether `return_prompt_shown` / `return_prompt_clicked` or equivalent events already exist

- **No:** repository search for `return_prompt` returned no matches (command run: `grep -n "\breturn_prompt\b"` across repo => `No matches found`).
- **Existing related (not equivalent) events present:** `recap_view` / `recap_tap` are defined and emitted via analytics (`src/rpg/analytics.js:27-28,222-231`; emitted in recap at `web/app.js:2164,2173,2185,2196,2230,2339,2379`; event docs `docs/analytics-events.md:56-58`). Reminder-specific events in recap: `push_prompt_shown` and `push_opt_in` via `window.trackEvent` (`web/app.js:2249,2277`) and `calendar_reminder` via `window.trackEvent` plus `recap_tap` button `calendar_reminder` (`2338-2339`). Tests/docs reference these (`test/analytics.test.js:296` includes `'recap'` startDaily entry; `scripts/reminder-browser-test.mjs` exercises reminder UI paths).

### (e) The smallest place to add the prompt, with an estimated diff size

**Smallest place (read-only recommendation):** add the “come back tomorrow for a fresh Daily Drill” prompt inside `renderSessionSummary(session, daily = null)` in `web/app.js` (function spans `2108-2409`), as a small conditional block in the existing recap layout.

- **Best insertion point to avoid duplication:** near the existing tomorrow/Daily messaging but non-blocking and conditional on state, e.g. just before the reminders section creation (`2236-2238`) or just after the missed-hands/unlock line block (`2345-2351`), gated so it does not duplicate:
  - the non-daily “Play Daily Drill #…” CTA already shown when daily not done (`2179-2190`),
  - the reminder section/options (`2238-2343`),
  - and the daily-finished verdict text in `settleDailyHand` (`2466-2469`).
  Likely condition: show on a **completed/scored daily recap** (`daily` present and daily done/scored context) where there is currently no explicit recap-body “fresh drill tomorrow” CTA except streak/countdown fragments, or as a subtle note after daily-finished recap header/score/streak; final copy/condition should be chosen to not repeat `2350`/`2468`/reminder options.

- **Estimated diff size:** **~12–30 lines** in `web/app.js` for a minimal non-blocking prompt element (create text/button/link element, append, optional click handler that navigates/scrolls or no-op) **plus** `0–10 lines` if new analytics events are introduced (none exist today; see (d)). Total expected **~12–40 LOC** in one file if no new shared helper is needed. Any event/schema/test/docs updates would add follow-on diffs outside this minimal placement, but this task is read-only and build waits for vote/Nov 13.

**Bounds respected:** no changes made to `web/`, `worker/`, or tests in this task.
