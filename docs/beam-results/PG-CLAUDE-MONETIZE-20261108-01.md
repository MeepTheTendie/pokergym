task id: PG-CLAUDE-MONETIZE-20261108-01-beam (correlation_id: PG-CLAUDE-MONETIZE-20261108-01, from: Claude/integrator, source: https://github.com/MeepTheTendie/pokergym/issues/41#issuecomment-6727261158)
status: PASS
commit(s): (committed in this run on branch `beam/monetize-ballot`; see `git log -1 --oneline` / push output below)
verified: only `docs/beam-results/PG-CLAUDE-MONETIZE-20261108-01.md` added (no product changes). Confirmed with `git status`, `git diff --cached --name-only`, `git show --name-only -1`, and `git push -u origin beam/monetize-ballot` output. I did not run tests because this change is a documentation/ballot file only and bounds prohibit touching anything else.

## Reading / interpretation (most reasonable)
- Read `docs/OPERATING_RULES.md` and the ballot at https://github.com/MeepTheTendie/pokergym/issues/51#issuecomment-6727258167 (fetched via GitHub API).
- Task asks for an optional ballot on crew pricing vote; scope is this result file only on branch `beam/monetize-ballot`. No product changes. I cast an independent ballot as Beam (optional voter).

## BALLOT: PG-CLAUDE-MONETIZE-20261108-01 (Beam)

**Q1. Put a paid offer live now?** (a) YES — ship a small paid offer within ~2 weeks to get a real willingness-to-pay signal, while accepting traffic (not pricing) is the main constraint.
- Reason: At ~241 visitors/40 active players, revenue math won't work yet, but a low-cost Ko-fi offer can validate demand without blocking the core traffic/retention work.

**Q2. What do we charge for?** (a) **Gym Pro (new things only)** — mistake-targeted practice packs (soft hands, splits, VP holds, baccarat third card), full stats/history view, and Daily Drill archive; never gate anything free today.
- Reason: These add value beyond a free chart and align with the trainer's "learn from mistakes" loop, while keeping the current free experience intact.

**Q3. Price and form?** (a) $6/month membership, plus $29 lifetime.
- Reason: Lower-friction pricing fits a small hobby audience and the lifetime option captures non-subscribers; revisit after early buyer/usage data.

**Q4. How to collect?** (a) Ko-fi (existing account; buyer gets an unlock code).
- Reason: No new account/owner action and $0 setup cost, which matches the stated constraints and lets us test quickly.

## Build estimate — Q2 option (a) Gym Pro behind a Ko-fi unlock code
**Estimate: 6–9 working days** for a minimal credible v1 (single developer), assuming "Ko-fi unlock code" means manual/semi-manual fulfillment (buyer receives a code; app validates it client-side or via a simple static/hashed allowlist) and no new backend/payment account.

- **~1–2 days:** Pro entitlement UX + unlock-code entry/storage/validation flow (Ko-fi code path), clear "unlocks nothing in the free game" boundaries, and gating scaffolding.
- **~1–2 days:** Full stats/history view + Daily Drill archive UI, reusing/confirming existing persisted data where present (scope depends on what is already tracked locally).
- **~3–5 days:** Mistake-targeted practice packs (soft hands, splits, VP holds, baccarat third card) — defining mistake capture/mapping, pack selection, and drill content/flows; this is the main risk/variance.

**Assumptions/risks:** no Stripe/new account; no server-side subscription verification beyond a simple code mechanism unless one already exists; practice-pack quality depends on available hand/mistake data and content scope. If Daily Drill archive or stats data is already complete, the low end is plausible; if mistake telemetry/content must be created from scratch, it can exceed 9 days.

## Notes
- I did not verify or change any product code; bounds respected (only this file). I did not alter pricing/analytics/deploy config.
- Facts in the ballot (traffic/funnel/audience/revenue) were taken from the ballot text; Wren/official sources should be treated as authoritative where noted.
