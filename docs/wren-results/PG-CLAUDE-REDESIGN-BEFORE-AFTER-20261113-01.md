# Wren receipt: PG-CLAUDE-REDESIGN-BEFORE-AFTER-20261113-01 (SCHEDULED, not the final result)

Filed: Fri Nov 13, 2026, ~8:00 PM CT, by Wren/Muse. Source task: issue #41 comment 6867926169, posted 2026-11-13T23:52:38Z (5:52 PM CT).

Status: RECEIVED and SCHEDULED. This file is a receipt, not the before/after readout. The full result is due Wed Nov 18, 6:00 PM CT, and will replace this file at this same path. Nothing in this receipt is a measurement; no PostHog query was run for it.

## Task as received

WREN-TASK: PG-CLAUDE-REDESIGN-BEFORE-AFTER-20261113-01
from: Claude (integrator)
correlation_id: PG-CLAUDE-REDESIGN-BEFORE-AFTER-20261113-01
scope: Before/after readout for the three player-facing deploys, so we can tell their effects apart.
inputs: deploy log in ledger #51 "Deploy queue". #55 playable home page deployed **Fri Nov 13 5:49 PM CT**. #60 trainer restyle is due at the Sat 9:09 AM run, and #44 first-visit one-tap deal at the Sat 2:09 PM run; use the exact times logged there. PostHog with the crew exclusions (cohorts 709897 and 644643, `pg_test`).
actions: For each deploy, compare the 3 days before with the 3 days after. Home page: landing `cta_click` per landing visitor, and landing → `/web/` arrivals. Trainer: `open_trainer` → `start_training`, and five-hand completion. #44 only: `open_trainer` with `first_screen=quick_deal` → `start_training` in the same session (exclude `preview:true`). Report raw counts as well as rates; small numbers are fine.
Also, from your **Sun Nov 15 weekly readout** on: report "product changes shipped vs. target (3/week)" separately from docs and ops work (OPERATING_RULES "Shipping cadence"). This week's product merges: #116, #117, #90, #125, #55.
return: `docs/wren-results/PG-CLAUDE-REDESIGN-BEFORE-AFTER-20261113-01.md`
bounds: read-only. No tracking changes.
deadline: **Wed Nov 18, 6:00 PM CT** (#44 needs 3 days after Sat). Default if late: returned to you with a new slot.

## Why the full result cannot run yet

The after-windows are not complete. At receipt time (Fri Nov 13, ~8:00 PM CT), the newest deploy is under three hours old. A 3-days-before vs 3-days-after comparison run now would compare a full before-window against a few hours of after-data and misread as a result. The full run happens after the windows close, by the Wed Nov 18, 6:00 PM CT deadline.

## Deploy times as logged (ledger #51) and what changed after the task was posted

The task was posted Fri Nov 13, 5:52 PM CT. Its deploy assumptions were overtaken within the hour, by Wes himself. The exact logged times, read from #51 comments 6867925850, 6868157568, and 6869195793:

- #55 playable home page: merged 28852038 (2026-11-13T23:47:16Z), deployed Fri Nov 13, 5:49 PM CT. Matches the task.
- #60 trainer restyle: the task says Sat Nov 14, 9:09 AM run. Wes moved it live at Fri Nov 13, ~6:05 PM CT to Fri Nov 13, 7:05 PM CT. It merged as 73ddfd1 at about 7:03 PM CT and went live at 7:12 PM CT in the deploy of 3cd6082.
- #44 first-visit one-tap deal: the task says Sat Nov 14, 2:09 PM run. It was instead merged between 7:03 and 7:12 PM CT on Fri Nov 13 and reached production in the same 7:12 PM CT deploy as #60, together with #127, #91, and #92.

## Consequence for the analysis (flagged now, not silently absorbed)

The three deploys cannot be told apart the way the task specifies:

1. #60 and #44 landed in the same deploy window (Fri Nov 13, 7:12 PM CT), bundled with #127, #91, and #92. Their effects are confounded with each other and with those three. The ledger itself records this: "analytics cannot separate #60's effect from theirs."
2. The #55-only after-window is about 1 hour 23 minutes (5:49 PM to 7:12 PM CT), not 3 days. The 3-hour minimum spacing rule from OPERATING_RULES (PR #126) was not met; Wes set the #60 time himself, so this is recorded as his call, not a crew error.
3. The workable comparison is therefore: 3 days before #55 (Nov 10, 5:49 PM CT to Nov 13, 5:49 PM CT) vs 3 days after the bundle (Nov 13, 7:12 PM CT to Nov 16, 7:12 PM CT) as the combined redesign effect, plus the #55-only sliver (5:49 to 7:12 PM CT, tiny n) labeled as such, plus the #44 `quick_deal` funnel reported as part of the bundle with the isolation limit stated. The `open_trainer` to `start_training` and five-hand completion reads use the same split.
4. The bundle's 3-day-after window closes Tue Nov 17, ~7:12 PM CT. The Wed Nov 18, 6:00 PM CT deadline still holds.

## Weekly readout addition (from Sun Nov 15 on)

Accepted as specified: the Sun Nov 15 weekly readout will report "product changes shipped vs. target (3/week)" separately from docs and ops work. One flag for that readout: the task lists this week's product merges as #116, #117, #90, #125, #55. The Nov 13 evening merges (#60, #44, #127, #91, #92) also landed this week and are not in that list, so the readout must verify the week's merge list against the merge log before naming a count. The target itself (3/week, OPERATING_RULES "Shipping cadence") is unchanged.

## What happens next

- The full before/after result replaces this file at this path by Wed Nov 18, 6:00 PM CT, using PostHog with the crew exclusions (static cohorts 709897 and 644643, `pg_test`), raw counts as well as rates, and the split above.
- If any deploy time moves again before then, the times in this receipt are superseded by the ledger and the change will be recorded in the final result.
- Bounds held for this receipt: read-only. No tracking changes, no spend, no account, permission, or secret changes, no publishing or scheduling, no change to the protected Nov 1 to 12 matched test.
