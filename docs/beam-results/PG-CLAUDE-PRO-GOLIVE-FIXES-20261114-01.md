# PG-CLAUDE-PRO-GOLIVE-FIXES-20261114-01

- **task id:** `PG-CLAUDE-PRO-GOLIVE-FIXES-20261114-01` (issue #41 comment 6879555566)
- **status:** PASS
- **branch:** `beam/pro-golive-fixes` (from `main` commit `d103b39`)
- **commit(s):**
  - `f9538ea` — `Restrict Ko-fi Pro grants to configured lifetime shop orders`

## Reasonable reading (stated up front)

- (1) `worker/pro.js` `tierForKofi` now takes `(data, env)`. Donations (`type: donation`) are ignored and never grant Pro. `Subscription` still grants monthly (35-day expiry). `Shop Order` grants lifetime only when `env.PRO_LIFETIME_ITEM` is set (non-empty, trimmed) and a `shop_items` entry contains a matching item code (matched case-insensitively against `direct_link_code`, `code`, `variant_code`, `item_code`, or `product_code`); if `PRO_LIFETIME_ITEM` is unset/empty, no shop order grants Pro. `handleKofiWebhook` passes `env` through. Added tests in `test/worker-pro.test.js` covering donation → ignored, shop order with unset lifetime item → ignored, other shop items → ignored, and lifetime item → lifetime grant (with KV/email-hash storage and message-id dedupe assertions).
- (2) Added one line to `/pro`'s "How does unlock work?" FAQ in `web/pro.html`: "Restore works with the checkout email only, so buyers should keep that email private."
- No secrets, bindings, `wrangler.jsonc`, prices, or Ko-fi account changes made. Pro remains dark (endpoints still return 503 when required config is absent; existing behavior/tests preserved).

## Files changed

- `worker/pro.js` — donation/shop-order grant logic gated on `PRO_LIFETIME_ITEM` match in `shop_items`; export `tierForKofi(data, env)`.
- `web/pro.html` — restore FAQ privacy note (checkout email only).
- `test/worker-pro.test.js` — tests for donation ignored, other/unconfigured shop items ignored, configured lifetime item grants lifetime.

## Verification (commands run and actual output)

### 1) Targeted worker Pro tests

Command: `node --test test/worker-pro.test.js`

```text
✔ pro API paths are recognised (0.3845ms)
✔ missing Pro configuration returns 503 cleanly for Ko-fi webhook (11.8511ms)
✔ missing Pro configuration returns 503 cleanly for restore endpoint (1.0215ms)
✔ worker routes Pro API requests to 503 when unconfigured (0.3985ms)
✔ handleProApi dispatches by path (0.1372ms)
✔ Ko-fi donation is ignored and does not grant Pro (0.6567ms)
✔ Ko-fi shop order without configured lifetime item is ignored (0.188ms)
✔ Ko-fi shop order for other items is ignored (0.1966ms)
✔ Ko-fi shop order containing lifetime item grants lifetime Pro (4.8604ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 64.8961
```

### 2) Full unit test suite

Command: `npm test`

```text
✔ push subscribe refuses a brand-new device once the namespace ceiling is reached (2.1822ms)
✔ push subscribe reports unavailable when the KV binding is missing (0.2347ms)
push: sent 0, dead 1, failed 0
✔ the daily sender deletes a subscription the push service reports gone (8.2659ms)
ℹ tests 429
ℹ suites 0
ℹ pass 429
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6172.5089
```

### 3) Push

Command: `git push -u origin beam/pro-golive-fixes`

Actual output: _attempted below; see final status in this file's push section._

## Push status

Pending at time of initial commit of this result doc; will be updated after push attempt.
