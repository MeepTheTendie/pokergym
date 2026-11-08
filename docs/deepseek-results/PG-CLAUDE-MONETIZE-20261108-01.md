# PG-CLAUDE-MONETIZE-20261108-01 — DeepSeek ballot

- **task:** `DEEPSEEK-TASK: PG-CLAUDE-MONETIZE-20261108-01-deepseek` (issue #41 comment 6727261013)
- **correlation_id:** `PG-CLAUDE-MONETIZE-20261108-01`
- **status:** PASS
- **branch:** `deepseek/monetize-ballot`
- **commit:** `e3ff615` (`e3ff615a49afb313bbddccfd664906c95b0b548d`)
- **verification:** Read the ballot verbatim via GitHub API (`GET /repos/MeepTheTendie/pokergym/issues/comments/6727258167`, HTTP 200), `docs/OPERATING_RULES.md`, and the crew ledger issue #51. Docs-only ballot — no product changes, so no build/tests were run (nothing to run).

## Ballot — PG-CLAUDE-MONETIZE-20261108-01

**Q1 — Put a paid offer live now? → (a) YES.** Ship a minimal offer now as a cheap learning probe, not a revenue plan: it costs almost nothing if nobody buys, a live offer yields a real signal a guess cannot, and a pre-declared kill criterion (under 10 buyers 8 weeks after launch → back to tips-only) guards against a false "nobody pays" read.

**Q2 — What do we charge for? → (a) Gym Pro, new features only.** Personalized mistake-targeted practice packs are the one thing a free strategy chart cannot give; everything free today stays exactly as it is. I would sequence the build cheapest-first (unlock + stats/history first, practice packs last).

**Q3 — Price and form? → (a) $6/month + $29 lifetime.** A low-friction monthly targets Wes's recurring-coverage goal while the $29 lifetime option captures the "won't subscribe to a hobby tool" buyer; revisit after the first 10 buyers.

**Q4 — How to collect? → (a) Ko-fi.** Existing account, $0 outlay (respects the standing $0 spending cap), live this month; Stripe is a new account that requires owner action, so it is off the table for now.

## Build estimate — Q2(a) Gym Pro behind a Ko-fi unlock code

Estimate only (I did not build this). One engineer, grounded in the current client-side app (`web/app.js` ~2,800 lines; localStorage `profile` already tracks mistakes/daily/session/badges/xp) plus the Cloudflare Worker (`worker/index.js` ~220 lines):

- Ko-fi unlock plumbing — code entry UI, validation, and a persisted entitlement flag; plus the Ko-fi webhook → Worker/KV code-issuance path: **2–3 days** (the webhook/KV path touches `wrangler.jsonc`, so it needs the standing deploy-config sign-off).
- Full stats & history view — the data mostly already lives in `profile`; this is a new UI screen plus a per-hand history record: **1–2 days**.
- Daily Drill archive — a replay UI over the existing `DRILL_*` / `findDrill` data: **1 day**.
- Mistake-targeted practice packs (soft hands / splits / VP holds / baccarat third card) — a generator over the existing `mistakes` list and rigged-drill path: **3–4 days**.
- Tests plus the required green `test` CI gate: **1–2 days**.

**Total: ~9 working days (range 8–11).**
