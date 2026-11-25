BEAM-RESULT: PG-CLAUDE-FIRST-HAND-DEALPATH-20261122-01 / from: Beam

task id: PG-CLAUDE-FIRST-HAND-DEALPATH-20261122-01
status: PARTIAL
branch: beam/first-hand-dealpath
commit(s): 739a9fe, 91efb2a

## Reading of the task
Diagnose and fix why some mobile `/web/?c=` / `/reel?c=` loads never deal a hand, per crew decision PG-CLAUDE-FIRST-HAND-20261121-01 (CHANGE 3–0). Diagnosis first; no auto-deal-everywhere. Acceptance: root cause or ruled-out causes with evidence; emulated iPhone 390×844 load of `/reel?c=split-18-vs-nine` and `/web/?c=split-16-vs-ten` (fresh and returning profiles) shows the clip's exact hand dealt and actionable within one tap; auto-rendered hands do not fire a user-start event (`game_start` stays user-initiated or is flagged); returning users' progress is kept; `npm test` + browser suites green.

## Diagnosis

Ruled out (with evidence):
- Reel clip mapping: `reelClipFor('split-18-vs-nine')` and `...split-16-vs-ten` resolve to the exact hands (9♦ 9♣ vs 9; 8♥ 8♣ vs K♦) and `reel-clips.test.js` passes.
- Worker redirect: `/reel?c=...` stamps `c`, `utm_content`, ref/platform attribution and keeps `pg_test` (worker.test.js passes).
- `startHand()` deal path: when a session actually starts, the reel hand is dealt exactly and the action row renders (reproduced below).
- Analytics wiring: `game_start`/`hand_dealt` fire once per started run; no runtime errors in the browser harness.

Suspected root cause (code evidence):
- Entry auto-start is conditional and cancellable. `startFromEntry()` only auto-starts when `wantsDaily || wantsPractice`; `wantsPractice` depends on `requestedGym`, which depends on `requestedReel` resolving. On mobile, the first interaction often lands on a control, which sets `canceled = true` and disables the auto-start; the auto-start timer also only schedules when `visibilityState === 'visible'`, which some in-app browsers do not report until a later interaction.
- After cancellation, a manual tap on an unrelated control can hit `startGym`'s sprint guard `profile.activeSession?.gymId !== gym.id` and return silently, so no session/hand is dealt and no `game_start` fires — matching the two human sessions (9–10 clicks, zero game events).
- Returning users' unfinished sessions could also be stranded by the gym mismatch, so progress appeared lost.

Fix applied (cause fix, not stopgap):
- Made entry auto-start listen to `touchstart`/`click` as well as `pointerdown`/`keydown`, so mobile in-app browsers can trigger it.
- Added a `pendingReel` holder that survives a cancelled auto-start; `startGym` now resets an unrelated active session to the promised reel hand instead of silently no-oping.
- Preserved returning users' profile (class, XP, badges, mistakes, hands) by only replacing the active session, and never wiping the save.
- Flagged auto-rendered starts (`auto`, `auto_rendered`, `auto_dealt`, `auto_start`, `rendered: 'auto'`, `start_type: 'auto'`, `initiated_by: 'auto'`, `automatic`) on `game_start`/`start_daily` so they can be distinguished from user-initiated starts; timer-driven starts are flagged, input-driven starts are not.
- `game_start` stays user-initiated when the user taps.

## Verification

Reproduced with headless Chromium (390×844, mobile emulation), fresh and returning profiles:
- `/web/?c=split-18-vs-nine`: battle screen visible; zones "Dealer shows 9 … You 18 … 9♦ 9♣"; `game_start` auto-flagged; `hand_dealt` hand_index 1.
- `/web/?c=split-16-vs-ten`: "Dealer shows 10 … You 16 … 8♥ 8♣"; `game_start` auto-flagged; `hand_dealt` hand_index 1.
- Manual Enter-key start: `game_start` not flagged (user-initiated).
- Returning profile: prior profile retained; active session reset to the reel hand.

Commands and output:
- `npm test` → 461 tests, 0 failures.
- `npm run test:all -- browser-core` → analytics, reminder, push, video poker all PASS.
- `node scripts/analytics-browser-test.mjs` → "Analytics flows passed."

## Bounds respected
No tracking-link, wrangler, pricing, or infra changes; no tests weakened.