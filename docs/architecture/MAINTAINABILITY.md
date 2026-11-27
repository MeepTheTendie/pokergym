# Poker Gym architecture convergence — final pass (2026-11-27)

## Scope and constraints

Maintenance-only work explicitly authorized by Wes after the November 26 sunset. Preserve existing behavior, save compatibility, routes, analytics exclusions, payment posture and public content. Do not restart retired crew automations, marketing, or unfinished feature work. Production merge is contingent on required CI being green. This is a focused source/dependency inventory, **not** a claim to have manually audited every historical file.

## Architecture and state ownership

| Responsibility | Authority / boundary |
| --- | --- |
| Cards and evaluation | `src/cards.js`, `src/evaluate.js` — pure primitives |
| Game rules and transitions | `src/games/*.js` — no UI, storage or edge dependency |
| Coach strategy | `src/coach/*.js` — consumes games/evaluation; must not reinvent rules |
| Progression, daily recall, backup and deep links | `src/rpg/*.js`; `state.js` owns save format and migrations, `backup.js` validates external imports more strictly |
| Browser presentation and persistence integration | `web/app.js`, `web/*.js` — consumes `src/` |
| Synchronous first-touch analytics | `web/posthog-loader.js` — captures URL before SDK load, excludes tagged crew visits |
| Edge, counters and proxy | `worker/*.js` — short links, redirects, PostHog proxy, security and Pro API |
| Static output, SEO and diagnostics | `scripts/*.mjs`, `public/guides/` — build and reporting, not separate game rules |
| Verification | `test/`, `test/release/`, `.github/workflows/test.yml` — Node, browser and Bend gates |

The Git tree has 26 core JavaScript files under `src/`, six Worker modules and eleven browser JS files, alongside substantial historical documentation and static assets. The 26 core files inspected have no static circular imports and no imports into browser or Worker code. The new architecture test makes this boundary enforceable. The Worker and browser may import pure core functions; not the reverse.

State flows: browser input -> `src/games` decision -> `src/coach` explanation -> `src/rpg/state.js` progression -> browser-local persistence. `src/rpg/backup.js` owns strict external backup validation; `src/rpg/analytics.js` owns trainer event semantics. First-touch attribution and short-link redirects belong at the browser/Worker edges. These responsibilities are not interchangeable.

## Entropy findings and optimization pool

| Priority | Finding | Disposition |
| --- | --- | --- |
| High | Existing builds cleared only `web`, `src`, `guides`, and build-info, allowing obsolete `about`/`pro` files to survive rebuilds | **Fixed** with complete generated-subtree cleanup and regression test |
| High | Core import direction and acyclic graph were not machine-enforced | **Guarded** with a dependency test in the unit suite |
| Medium | `src/rpg/links.js` owns `REFERRER_REFS`/`cleanCampaign`; classic `web/posthog-loader.js` mirrors both | **Pending**: preserve synchronous attribution, prove behavior via fixtures, then unify at a single generated or bundled source and delete mirror |
| Medium | `web/app.js` is ~3,270 lines; rendering and interaction orchestration are closely coupled | **Pending**: isolate one cohesive feature at a time, migrate all callers, test and delete its old implementation |
| Medium | Static guide pages repeat blackjack-rule explanations | **Pending**: establish search/structured-data fixtures before introducing single-source generation |
| Medium | `web/styles.css` and `web/site.css` have overlapping presentation concerns | **Pending caller audit**: don't merge distinct page semantics just to reduce file count |
| Retain | Bend reference hand evaluator and JavaScript evaluator | Different verification/runtime responsibilities; not needless parallel production engines |
| Retain | Save v1-to-v2 migration, `reel?c=` URLs and existing public contracts | Real external callers/compatibility; deletion would break behavior |

## ADR-2026-11-27-01 — Enforce existing boundaries before reorganizing

**Decision:** keep the browser-first JavaScript architecture. Delete stale build artifacts and guard the pure-core import direction. Do not add new runtime layers for cosmetic regularity. Preserve synchronous analytics capture until its call timing and test-visit exclusions are independently verified.

**Options considered:** wholesale rewrite (rejected: unbounded migration and regression surface); async module conversion of the analytics loader (deferred: can lose first-touch information); targeted cleanup and architecture contract checks (**chosen**: smallest closed-loop improvement).

**Deletion test:** generated-build cleanup removes stale files without adding a runtime abstraction. The test-only dependency graph is an anti-regression policy rather than a production layer. Future extraction must remove its previous implementation and migrate every caller in the same batch.

## Closed-loop progress

1. Round 1 — `scripts/build.mjs` and `test/release/build.test.js`: remove duplicate setup, clear all generated subtrees, and test stale-file deletion in an isolated temp output.
2. Round 2 — `test/architecture.test.js`: inspect all `src/` JS imports, reject missing/external imports and cycles.
3. Verification gate — GitHub `test` status must pass: unit/release, browser core/offline/storage, and Bend. Any failure keeps the branch unmerged.
4. Next refactor — move duplicated referrer attribution semantics to one authoritative source **only after** synchronous browser attribution tests cover all existing callers; delete the old copy.
5. Subsequent refactors — one tested slice of browser orchestration, then guide-generation/CSS ownership only where real duplication is demonstrated.

**Deferred pending explicit product decision:** schema-breaking save migrations, authentication/permissions, payments/Pro, public URL changes, DNS/credentials, SEO behavior changes and reactivation of automation.

Every future round: scan -> callers -> options -> behavior baseline -> full migration -> deletion -> independent review -> verification -> anti-regression check -> recorded result. An identified issue is not a completed refactor.
