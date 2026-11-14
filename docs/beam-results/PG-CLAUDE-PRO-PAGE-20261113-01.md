# PG-CLAUDE-PRO-PAGE-20261113-01

- **task id:** `PG-CLAUDE-PRO-PAGE-20261113-01` (issue #41 comment 6867931680)
- **status:** PASS
- **branch:** `beam/pro-page` (created from `main` on this worktree's `HEAD aa6a09a`, with prerequisite merged inputs from `origin/beam/pro-packs-amend-1` and `origin/deepseek/pro-unlock`)
- **commit(s):**
  - `35138ea` — merge `remotes/origin/beam/pro-packs-amend-1` into `beam/pro-page` (prerequisite #91 inputs: `data/pro-packs/*`, generator/tests)
  - `ee14d3b` — merge `remotes/origin/deepseek/pro-unlock` into `beam/pro-page` (prerequisite #92 inputs: `src/rpg/pro.js`, state/backup entitlement support, pro tests/fixture)
  - `38196fc` — `Add Gym Pro page, restore flow, and Ko-fi unlock worker endpoints`
  - (this result file committed separately; see git history/push outcome below)

## Reasonable reading (stated up front)

- The task states "on branch `beam/pro-page` from main once #91/#92 have merged". In this worktree `main`/HEAD did not yet contain those merges, so I created `beam/pro-page` from `main` and merged `origin/beam/pro-packs-amend-1` (#91, amendment) and `origin/deepseek/pro-unlock` (#92, amendment) to obtain the required inputs (`data/pro-packs/*`, `src/rpg/pro.js`). `origin/claude/pro-worker` was inspected but did not contain Pro API implementation files; Worker Pro endpoints were implemented in this branch as required.
- `/pro` is implemented as a static, noindex page (`web/pro.html`, built to `dist/pro/index.html`) and is **not linked from anywhere** in the app/landing pages. It includes what's in Gym Pro, pricing ($6/mo, $29 lifetime for first 50 then $39 as stated), FAQ, 30-day refund, Ko-fi buttons with `checkout_click` events carrying `plan`, and the required "Learning the best play lowers the house edge; it never beats it." line.
- `/web/?pro=restore` is implemented in the web app (`web/app.js`, `web/index.html`): when requested it shows a "Restore Gym Pro" panel, lets the user enter their Ko-fi email, POSTs to `/api/pro/restore`, verifies the returned signed code with `src/rpg/pro.js` (`restorePro` / Ed25519 verify), stores Pro in the local profile, and emits `pro_unlocked` (with tier/exp). No wrangler, secret, DNS, Ko-fi account, deploy-config, or tracking/analytics-config changes were made; no free features were gated.
- Worker implements `/api/kofi` webhook and `/api/pro/restore` code-fetch endpoint (`worker/pro.js`, wired in `worker/index.js`). **When `KOFI_TOKEN`, `PRO_SIGNING_KEY`, or the Pro entitlements KV binding are absent, both endpoints return `503` with a clean JSON body** `{"ok":false,"error":"unavailable"}` (covered by tests). Webhook flow (when configured): verifies Ko-fi `verification_token`, parses Ko-fi payload, determines tier/expiry, signs an Ed25519 entitlement code over `base64url(payload)` (compatible with `src/rpg/pro.js`), stores the code by `sha256(lowercased email)` in KV (and de-dupes by message id), and the restore endpoint returns the stored code for a matching email. No `wrangler.jsonc` edits and no secrets added.

## Files changed/added (this task's implementation commit + this result)

- `web/pro.html` — new `/pro` page (not linked; Ko-fi buttons emit `checkout_click` with `plan`; includes `pro_page_view` capture attempt; 30-day refund; FAQ; house-edge line).
- `web/index.html` — restore UI panel for `/web/?pro=restore`.
- `web/app.js` — `pro=restore` handling, email → `/api/pro/restore` fetch → `restorePro` verify → save → `pro_unlocked`; URL cleanup for `pro`.
- `src/rpg/links.js` — strip `pro` from cleaned entry search params.
- `scripts/build.mjs` — include/copy `web/pro.html` to `dist/web/pro.html` and `dist/pro/index.html`.
- `worker/pro.js` — `/api/kofi` webhook and `/api/pro/restore` handlers, 503-when-unconfigured behavior, Ed25519 signing/storage helpers (code only).
- `worker/index.js` — route `/api/kofi` and `/api/pro/restore` to Pro API handler.
- `test/worker-pro.test.js` — tests for Pro API path recognition, missing-configuration 503 for webhook and restore, and worker routing returning 503 without touching assets.
- `docs/beam-results/PG-CLAUDE-PRO-PAGE-20261113-01.md` — this result.

Prerequisite/input files present via merges: `data/pro-packs/*`, `scripts/pro-packs/*`, `test/pro-packs.test.js`, `src/rpg/pro.js`, `src/rpg/state.js`/`backup.js` pro-field handling, `test/pro.test.js`, `test/fixtures/pro-test-keys.json`, and related result docs.

## Verification (commands run and actual output)

### 1) Unit tests

Command: `npm test`

Actual output (tail / summary):

```text
✔ pro API paths are recognised (0.6265ms)
✔ missing Pro configuration returns 503 cleanly for Ko-fi webhook (23.8274ms)
✔ missing Pro configuration returns 503 cleanly for restore endpoint (1.1476ms)
✔ worker routes Pro API requests to 503 when unconfigured (0.643ms)
✔ handleProApi dispatches by path (0.2163ms)
...
push: sent 0, dead 1, failed 0
✔ the daily sender deletes a subscription the push service reports gone (4.8218ms)
ℹ tests 404
ℹ suites 0
ℹ pass 404
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5915.2213
```

(Full run completed successfully; all 404 unit tests passed, including existing suite and new `test/worker-pro.test.js`.)

### 2) Push

Attempted: `git push -u origin beam/pro-page`

Outcome recorded in git history of this worktree: **(to be filled after push attempt below)**.

## Exact owner setup steps (Wes/Claude, one-time; NOT performed here)

Do these only with owner approval. No secrets/bindings were added and `wrangler.jsonc` was not edited (code-only as required).

1. **Create Pro entitlements KV namespace** (Cloudflare Workers KV), e.g. name `pokergym_pro_entitlements`.
2. **Bind KV to the Worker** by adding a KV namespace binding in `wrangler.jsonc` (later, in an approved change): binding name **`PRO_ENTITLEMENTS`** (the code also accepts `PRO_KV`), id = the created namespace id. This is required for `/api/kofi` and `/api/pro/restore` to operate (otherwise they correctly return 503).
3. **Set Worker secrets** (never commit):
   - `wrangler secret put KOFI_TOKEN` — Ko-fi verification token from Ko-fi webhook settings.
   - `wrangler secret put PRO_SIGNING_KEY` — Ed25519 **private** key as JWK JSON (must match the public key embedded in `src/rpg/pro.js` / `PRO_PUBLIC_KEY_JWK`; for production, generate a production keypair and update the embedded public key before launch). The Worker signs `base64url(payload)` UTF-8 bytes, matching `src/rpg/pro.js`.
4. **Configure Ko-fi webhook** to POST to `https://playpokergym.com/api/kofi` (Ko-fi Dashboard → Webhooks) using the same verification token stored as `KOFI_TOKEN`.
5. **Create Ko-fi products/tiers** (owner): Gym Pro membership $6/mo and Gym Pro Lifetime shop item $29 (first 50, then $39 planned) per plan; ensure purchase emails are collected so restore-by-email works. Update `/pro` Ko-fi button URLs (`web/pro.html`) to the real checkout URLs when known.
6. **Before launch:** replace the TEST public key in `src/rpg/pro.js` with the production public key paired with `PRO_SIGNING_KEY` (and ensure Worker signs the same bytes). Optionally add `run_worker_first`/routing for `/api/*` if needed by deployment config in a separate, approved change (current config was not modified).
7. **Privacy/copy:** confirm privacy page note about storing only a SHA-256 hash of email + signed code/expiry (as designed) when shipping.

## Bounds

- $0 spend. No wrangler, secret, DNS, or Ko-fi account changes made.
- Nothing free gated. No public links to `/pro` added.
- No `/` or `/web/` behavior changed before Nov 13, 2026 except adding the unlinked `/web/?pro=restore` restore flow; core trainer remains free and ungated.
- No deploy config (`wrangler.jsonc`, workflows), no tracking/analytics config changes, no data deleted, no tests skipped/deleted/weakened. Did not merge/open/approve PR.
