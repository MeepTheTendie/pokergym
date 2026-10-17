# Poker Gym launch

## Monetization rule (owner, 2026-10-15)

No subscriptions, ever, and no recurring prices. Monetization is the optional Ko-fi tip jar (https://ko-fi.com/playpokergym). The only other path left open is a possible one-time US$4.99 Pro unlock, considered only if at least five people ask for something like it unprompted after day 30. Prompted answers do not count as demand, so public copy asks no pricing or willingness-to-pay question. Older log entries below that mention a monthly offer or pricing research are superseded; that research was removed. Day 14 of the current launch is a measurement checkpoint only: report the number of unprompted requests for more. It does not lower the day-30 / five-ask gate above.

## Direction

Poker Gym is a free card-game trainer supported by optional tips. Stop new website-care prospecting. Previously sent inquiries need no additional sales outreach.

Build a low-touch Android-oriented training game with original retro artwork and music, no real-money wagering, and honest strategy explanations. Do not represent inspiration as affiliation with Nintendo or Pokémon. Do not claim guaranteed winnings or passive income.

## Current verified gaps

The production build now includes the frontend and strategy modules, and excludes diagnostic pages and repository metadata. The free demo and landing page are live at https://pokergym.history-atlas.workers.dev (Worker version afcdd94f-1fe4-4e6e-9fe3-b04870a45895). Live checks confirm landing HTTP 200, harness HTTP 404, successful app loading, audible measured output, mute and interrupted-audio recovery in headless Chromium. The local full-game browser harness passed four gyms, 40 hands, badges and save/resume with zero browser errors; that full harness was not run remotely. The Android-oriented manifest exists, but installability, offline behavior and Android device testing remain unverified. No checkout, server-verified entitlement, cancellation workflow or revenue is verified.

## Execution order

1. Build a reproducible public demo artifact; test deployed module loading, mobile layout, sound gestures, strategy feedback and save/resume. Preserve existing local changes.
2. Add a clear product landing page and playable free introduction. Keep learning free; the optional Ko-fi tip jar is the only live monetization.
3. Learn from real player feedback. Record visitors, completed first sessions and return visits separately. Ask no pricing questions; note unprompted requests for paid extras.
4. Only after day 30, and only if at least five players ask unprompted, consider a one-time US$4.99 Pro unlock. Never a subscription.
5. Complete Android distribution, privacy/data disclosures and storefront requirements before claiming a store launch. A responsive website is not a published Android app.

## Autonomous daily marketing brief

Target one to two hours per day once there is a stable shareable demo and a verified scheduled execution mechanism. Find relevant channels that permit promotion; publish accurate gameplay demonstrations and useful training content using available authorized accounts. Reply to interested players, record attribution and feedback, then improve the highest-impact onboarding issue. No spam, fabricated reviews, guaranteed winnings, platform-rule evasion or unapproved ad spend. Measure qualified players, activation, retention and actual paid subscriptions, not number of posts. The measurement is `npm run stats`: it prints the crawler-inclusive visit counter plus the PostHog real-player report (unique people per day, journey stages, top events); use the PostHog numbers to pick the next improvement. See MARKETING.md for how to read it.

Daily scheduling is requested but not yet configured or verified. An active thread goal or a delayed tool call is not evidence of a daily scheduled marketing job. Verify the scheduler, authorized publishing accounts and a completed run before reporting automation as operational.

## Owner involvement

Minimize routine involvement. Escalate only genuine authority/access gaps, required seller identity/payment steps, or decisions with material financial or legal consequences. Do not promise that the owner has no legal responsibility or that revenue is guaranteed.

## Success

Players finish a first session, come back to practice, and a few choose to tip. Projections, waitlists, fake paywalls and test payments are not revenue.

## Practice release

Worker version f219bb11-7d1e-49eb-a3d3-009db717a137 publishes per-game decision accuracy and hands played, plus replay practice in earned gyms without duplicate badge rewards. All 167 automated tests passed. The updated local browser harness verified four gyms, ten tracked hands per game, replay buttons available after all badges, and save/resume with zero errors. No paid plan or revenue is verified.


## Mistake self-test release

Worker version eb3727c5-c8eb-4e46-934b-f960fb1ba64f adds a local notebook of the last 20 missed hands, recall-before-reveal coaching and saved self-review counts. Reviews award no XP and do not alter decision accuracy. All 169 unit tests and local portable ZIP/browser checks passed; a live 390px headless browser smoke check passed onboarding, save/resume and notebook review. Interactive original-hand replay, physical Android verification, customer demand and payment are still unverified. See automation/PROGRESS.md for evidence and exact access blockers.

## Offline practice release

Worker version 590a4b43-6219-4265-8041-2768ace08cea adds a complete versioned offline game download and explicit readiness status, plus Android browser installation guidance. Local headless checks passed offline reload with the HTTP server stopped; live 390px checks passed with browser networking disabled, including saved continuation, lessons, battles, coaching and notebook review. Existing game tabs must close to activate future updates. This is browser offline readiness, not verified physical Android installation or a store release. Revenue and real player demand remain unverified. See automation/PROGRESS.md for changes, tests and access blockers.

## Player feedback release

Worker version 24118c9f-531e-49a3-8ee6-2487a195824d adds voluntary feedback after a completed five-hand session: clarity and return interest (a pricing question in this release was removed on 2026-10-15). Players review an unsent email draft and send it themselves. No signup, checkout or paid plan exists. All 171 unit tests, portable/offline browser checks and final live 390px offline smoke check passed. No actual demand or revenue verified; see automation/PROGRESS.md for limitations and access blockers.

## Immediate training choice release

Worker version 0a10cbe6-2307-4c89-9ed3-5e7c3367d689 makes five-hand training available in all four games from a new trainer's first map. Badge progression remains a separate longer challenge. All 173 unit tests, portable phone embed and final live/offline phone checks passed, including actual five-hand completion in the three formerly gated games. No customer demand or payment verified; see automation/PROGRESS.md for the initial live-check failure, limits and access blockers.

## Storage resilience release

Worker version dfda8fd7-2a28-45cf-93fd-cddc94092491 keeps practice running when browser storage is blocked or full, shows an explicit unsaved-progress warning and preserves manual backup export. All 175 unit tests, local cross-site/offline browser checks and final live denied-storage/quota/offline checks passed. Failure simulations use isolated headless Chromium; physical Android and actual itch.io privacy blocking remain unverified. No customer demand or payment verified. See automation/PROGRESS.md for evidence, the initial live-check failure and access blockers.

## Scored blackjack retry release

Worker version 4787c4eb-799a-4a39-b814-8110e542b72a adds scored decision retries for new blackjack notebook entries, using legal choices and acceptable answers captured from the original coach. Counts persist separately from gameplay accuracy and rewards, and travel in validated manual backups. All 177 unit tests, cross-site ZIP and live/offline 390px checks passed. This is decision recall, not full hand replay. Customer demand, physical Android and payment remain unverified. See automation/PROGRESS.md for evidence and access limits.


## Privacy and local-data guidance release

Worker version 3d730aef-a7d1-4325-bf89-e1683476284d publishes https://pokergym.history-atlas.workers.dev/web/privacy with source-checked local-storage, backup, feedback and hosting disclosures and browser data-removal guidance. Landing/game links, portable 390px embedding and live offline rendering passed. Cached HTML canonical-redirect handling was fixed after an initial live failure. Physical Android, store approval, player demand and payment remain unverified. See automation/PROGRESS.md for evidence and access limits.

## Copy cleanup and service-worker test fix release

Worker version 187b7ac0-57d0-4a34-978f-26f2ca89c3ca removes the remaining player-role "TRAINER" copy (now PLAYER/class/profile, consistent with the shipped "ONE SHARP PLAYER") from the game, landing page, privacy page and guides, and drops a stale /web/-scoped service worker left by an earlier build. The build test now reads dist/sw.js, restoring 212/212. Offline checks and a live 390px smoke test passed with zero runtime or game asset errors. Physical Android installation, store approval, player demand and payment remain unverified. See automation/PROGRESS.md for evidence and access limits.

## Public copy refresh release

Worker version f28565c5-e4e9-4b10-b567-ec81825a402c reframes the public copy as a learning-first card-game trainer instead of a retro RPG: the landing hero, tiles and details, the README and the unsent post draft in MARKETING.md. It removes the retro-RPG / gym-badge / class-picking vocabulary from those three surfaces and states the honest position — "no signup, no ads, no third-party trackers" plus "learning the best play lowers the house edge; it never beats it" and "Built by Poker Gym with AI assistance." No app logic, OG tags or prices changed. All 212 unit tests passed and the live 390px smoke test passed with zero runtime or game asset network errors. The landing page deliberately does not claim page-visit counts, because the counter does not exist yet (scheduled separately). Physical Android installation, store approval, player demand and revenue remain unverified. See automation/PROGRESS.md for evidence and access limits.
