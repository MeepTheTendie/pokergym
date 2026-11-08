# Poker Gym — Free-to-Paid Growth, Business and Marketing Plan

**Status:** Strategic proposal only; no pricing, paywall, checkout, subscription, ad spend, scheduling, or production changes authorized by this document.  
**Prepared:** 2026-11-04 | **Website:** https://playpokergym.com | **Repository:** MeepTheTendie/pokergym  
**Primary goal:** Sustain **at least $500/month of contribution after payment fees and a small site-operations allowance**, before tax and the owner's existing LLM subscription costs, with a low-maintenance, honest learning product.  
**Working horizon:** 90-day validation and 3–6-month acquisition path. This is a model, not a claim of demand, current sales, or a guarantee.

## 0. Executive recommendation and decision required

Build **Poker Gym Pro**, an inexpensive optional layer of **structured card-decision practice**, borrowing the *try a genuine interactive lesson for free, see a roadmap, experience a result, then unlock more advanced content* funnel from paid coding courses. **Never remove, degrade, or retroactively gate any feature currently promised free.** Keep the no-login core: four games, five-hand sessions, Daily Drill, coach explanations, base mistake review, local save/export and offline access. Pro should buy *more guided value*, not the right to enjoy Poker Gym.

Initial proposed offers:
- **Free Forever — $0:** every existing core game, short lessons, Daily Drill, coaching, baseline review and local progress.
- **Gym Pro — $9/month:** structured multiweek mastery paths; targeted practice packs based on missed decision categories; expanded historical analytics and detailed mastery reviews; additional challenge archives/levels; optional account and cross-device sync when delivered.
- **Gym Pro Annual — $72/year upfront:** identical Pro features at an effective $6/month. It is a $72 annual cash payment, **not** $6 collected each month.
- **Optional, later:** a paid one-time challenge pack, only after demand is observed, as a no-subscription fallback. Do not multiply tiers before validation.

**Conflict / owner approval gate:** The binding project policy recorded in LAUNCH.md and MARKETING.md on 2026-10-15 says **no subscriptions ever**, Ko-fi tips only, with a possible **one-time $4.99** unlock only after day 30 **and five unprompted requests**. This new requested monetization plan suggests recurring Pro, so it **conflicts with that earlier rule**. The owner's present request authorizes **planning**, not rewriting the old policy, changing live FAQ copy, implementing a paywall or collecting money. Before launch the owner must explicitly approve whether to replace that restriction, whether the old demand gate remains, and any billing terms. Until then: tips only. Keep this proposal separate from the control doc's operational instructions.

**Key gating reality:** A beautiful funnel cannot compensate for low acquisition/retention. The available Oct 23 historical checkpoint recorded 74 unique visitors, 22 players and 12 five-hand finishers since Oct 21; these are **historical, NOT current**, and small enough that conversion estimates are highly uncertain (docs/CanonicalDashboard.md). Re-read today's canonical PostHog dashboard and npm run report before assigning a baseline. Do not use Cloudflare raw views, social views, test traffic or bot activity as humans.

## 1. Product, audience and positioning

### 1.1 Reality of the existing product

Verified from the live landing page (Nov 4) and current repository:
- Browser/PWA experience, installable and offline capable; no account or real-money gambling.
- Five-hand training and explaining decisions in **blackjack, Jacks or Better video poker, baccarat, and Hold'em hand evaluation**.
- Same daily five-hand puzzle for all players, shareable score grid, streaks, local progress, and spaced mistake reviews.
- Honest limitation: the Hold'em trainer presently teaches **hand reading**, not full betting/GTO strategy. Do **not** market it as a solver or GTO coach.
- Live text says "100% free", "no ads", "no signup", "no subscription or paid tier". This must stay accurate **until launch**, then update carefully to "Core training is free forever; optional Pro adds..." only after a tested, authorized release.
- Current monetization: optional Ko-fi at https://ko-fi.com/playpokergym; no verified paid tier.
- Current operating infrastructure appears Cloudflare Workers with first-party/proxied PostHog events; do not introduce a second analytics stack or force migration.

### 1.2 Beachhead customers

**First target: beginner/improving blackjack decision learners** who prefer five-minute practice and immediate feedback to long lectures. They have clearer repeatable decision patterns than broad "poker fans."  
**Second: Jacks or Better video poker learners** who want to master hold/draw choices.  
**Third: casual card enthusiasts** attracted by the daily five-hand challenge and puzzles.  
**Do not lead with advanced Hold'em players:** the present product is not a full GTO offering. Baccarat is useful free top-of-funnel content but weaker as a recurring mastery-subscription hook without richer lessons.

**Job to be done:** "Help me practice the decision, explain why, and prove I remember it a week later."  
**Positioning:** "The five-minute gym for card decisions: learn, drill, fix mistakes, repeat."  
**Differentiation:** low price, interactive feedback, browser/PWA access, lightweight daily habit, no real-money play. Do **not** promise profitability, beating casinos, or particular win rates.

### 1.3 Paid value must be concrete

Avoid generic "more AI" upselling. Publish at least **two meaningful paid modules** before asking for a recurring fee:
1. **Blackjack Foundations → Decisions Under Pressure:** 4 chapters × 5–8 lessons, tens of calibrated situations, mastery checks and revision packs; declare rules assumptions.
2. **Jacks or Better Hold/Draw Mastery:** 4 chapters × 5–8 lessons, decision families and error-driven drills, with paytable shown.
3. **Personalized Practice Plan:** after a free session, suggest a 7-day path from actual mistakes; first sample plan free, extended sequence Pro.
4. **Detailed dashboard:** correct choices by decision family, due mistakes, improvement vs prior attempts, personal best over time; no fake comparative percentiles.
5. **Challenge archive and noncompetitive milestones:** 30-day training path and past Daily Drills after the free same-day drill; accessibility-first, not exploitative streak pressure.

Launch can ship #1, #2 and simple #3/4. Account sync, custom scenario editors and new games are **later** contingent features, not features to sell before delivery. Prefer deterministic simulator/rule engine and static authored explanations over per-hand LLM calls.

## 2. Model the coding-course funnel, not a gambling funnel

Reference patterns:
- **Codecademy:** useful Basic lessons remain free; Plus/Pro sell deeper learning paths, projects and additional features rather than hiding all value.
- **Scrimba:** free lessons and an interactive challenge sample; Pro unlocks fuller paths and unlimited challenges. Inspiration: demonstrate the interaction before asking for a card.
- **PokerCoaching/PeakGTO:** free daily trainer caps and visible paid training expansion. Use as a high-price category benchmark, **not** a feature/accuracy equivalence claim.

### 2.1 Exact learner journey and screens

| Step | Product moment | UX offer | KPI / instrumentation |
| --- | --- | --- | --- |
| 1. Discover | Search/video/guide/social share | "Can you get 5/5?" with immediate playable link; no account gate | qualified landing visits; source and UTM |
| 2. First success | 1 hand solved | immediate coach explains a decision; next hand button | first_hand_complete |
| 3. Activate | Complete first 5 hands | genuine performance recap plus "try tomorrow" | session_complete, activation_rate |
| 4. Diagnose | One or more mistakes | show actual category of mistake; one free personalized tip | mistake_category_viewed |
| 5. Reveal pathway | After completed session or 2 return visits | "Your next 7-day training plan" with first module fully playable | path_preview, path_start |
| 6. Show Pro value | Player chooses next premium chapter | syllabus, sample lesson, example analytics, clear plan comparison | pro_preview_view, pricing_view |
| 7. Checkout | Intentional choice; never surprise auto-renew | $9 monthly / $72 annual, exact billing and cancellation, tax disclosed at checkout | checkout_start, purchase_success |
| 8. First Pro value | Immediately after verified entitlement | open a promised advanced module, no empty unlock screen | pro_first_lesson_complete |
| 9. Habit / retain | Weekly recap | new targeted practice pack and gentle optional reminder | weekly_pro_active, D7/D30 retention |
| 10. Win-back | Cancellation / inactivity | optional survey and accessible resubscribe; honor cancellation | cancel_request, churn, winback |

**Upgrade prompts:** after learning value, not at page load, not in the middle of grading a hand. A dismissible Pro invitation in the session recap; a static pricing page; a genuine preview at the edge of an **additional** advanced chapter. Cap upsells to roughly one on a completed session and never hide free replay links. All exercises already free stay free. Pro analytics labels must reflect actual scores, not generated pseudo-insights.

**Sample non-pushy copy**:
> "You got 3 of 5. Both misses came from blackjack double-down decisions. Try a free 3-hand fix now. Want a guided 7-day path, deeper review and more drills? Explore Gym Pro — from $9/month. Keep training free whenever you like."

**Email option:** only after opt-in, a free 5-day micro-course (one real example/day) or consent-based progress reminder. No required email before a free hand, no purchased lists, and clear unsubscribe. Push/email are optional; no dark patterns, fake scarcity, or forced card trial.

### 2.2 Content curriculum shaped like a code course

A repeatable chapter template: concept (60–120 sec) → interactive exercise (5 decisions) → explain wrong choices with rule assumptions → checkpoint quiz → spaced review on days 1/3/7 → "now you can..." recap. Clearly distinguish educational expected-value explanation from any guarantee of winning.

**Free example chapter (blackjack):** hit vs stand against common dealer upcards; three genuine practice choices, coach answers.  
**Pro chapter:** mixed hit/stand/double/split with rule configuration displayed, error-type drill, mastery criterion (e.g. >=80% on 15 fresh items; marked as a course benchmark rather than external certification).  
**Premium creation bar:** no duplicate/near-identical questions masquerading as new content; strategy correctness tested independently against the engine and documented assumptions.

### 2.3 Pricing presentation

- Show "Free forever" beside the paid plan; no "most popular" badge until real plan choice data warrants it.
- Explain exactly what remains free. Clearly state annual charge is **$72 today, renews yearly** (subject to tax), not "only $6".
- No default checked annual plan, no fake countdown. Easy cancellation and restore purchase.
- Start with **no trial requiring a card**; offer a genuine free lesson/sample. A 7-day no-card preview of a subset is possible but do not build it until demand.
- Free progress survives upgrade, downgrade, subscription cancellation and account disconnection; no lockout of personal practice data.

## 3. Pricing analysis and unit economics

### 3.1 External benchmarks (checked Nov 4, 2026)

| Service | Published price/context | What it teaches us | Source |
| --- | --- | --- | --- |
| Codecademy Basic / Plus / Pro | Free; Plus $29.99 monthly or $14.99/mo billed annually; Pro $39.99 monthly or $19.99/mo annually | Useful free tier and richer paid structured curriculum | https://www.codecademy.com/pricing |
| Scrimba Pro | Free selected courses/limited interactive challenges, Pro broader courses and unlimited challenges | Interactive samples + visible course progression | https://scrimba.helpscoutdocs.com/article/73-whats-the-difference-between-pro-and-free |
| PeakGTO | Free daily-limited trainer; $79/mo or $59/mo annual effective | Rich poker solver training supports premium pricing, **not comparable in feature breadth** | https://pokercoaching.com/peakgto-pricing |
| PokerCoaching Premium | $147/month on published pricing | Specialist instruction costs much more; not beginner price anchor alone | https://pokercoaching.com/home/pricing/ |
| Blackjack Apprenticeship | $39/month Starter in monthly pricing; annual-focused higher membership options | Deep card education is paid, but materially broader curriculum | https://www.blackjackapprenticeship.com/plans-and-pricing-monthly/ |

**Recommended initial price: $9/month, $72/year.** It is not derived from a reliable willingness-to-pay study; it is a **hypothesis** between free hobby tools and comprehensive $39–$147 specialist platforms. Test it only after a premium module genuinely exists. An alternative $12/month could reduce customer count but likely require stronger features. A $5/month offer looks inviting but needs far more members and per-payment fixed fees hurt the margin.

### 3.2 Payment math, properly separating cash and MRR

Published baseline Stripe US domestic online card: **2.9% + $0.30 per successful transaction** (https://stripe.com/pricing); Stripe Billing pay-as-you-go: **0.7% of billing volume** (https://stripe.com/billing/pricing). These are indicative 2026 US prices and exclude tax tools, refunds, cross-border surcharges, disputes, FX, and potential invoicing/other fees.

| Product | Gross recognized MRR per active member | Example cash collected per charge | Example payment + Billing fee | Contribution before hosting |
| --- | ---: | ---: | ---: | ---: |
| $9 monthly | $9.00 | $9.00 each month | $0.261 + $0.30 + $0.063 = $0.624 | **$8.376/mo** |
| $72 annual | $6.00 | $72 upfront once/year | $2.088 + $0.30 + $0.504 = $2.892 per annual charge | **$69.108/year = $5.759/mo equivalent** |
| $4.99 one-time fallback | Not recurring MRR | $4.99 at each sale | about $0.445 card fee, no subscription Billing fee assumed | **about $4.545 per sale** |

For the planning mix **70% monthly / 30% annual**, one active paid member generates **$8.10 gross recognized MRR** and about **$7.5909 normalized monthly contribution** after those modeled fees. The word "normalized" matters: annual subscriptions pay cash upfront; cash receipts are lumpy, and member count cannot be equated with a monthly cash deposit.

At **70 active paid members** under that mix:
- Gross recognized MRR: 70 × $8.10 = **$567.00**.
- Approx payment/Billing-fee-adjusted monthly contribution: 70 × $7.5909 = **$531.36**.
- Less a **planning allowance of $25/month** incremental hosting/email/operations: **$506.36/month** before refunds, acquisition, taxes, labor, and the owner's LLM subscriptions.
- **Operational target: 75–85 paying members**, not 62, to add room for churn, failed charges, variable costs and forecast errors. If incremental operating expense is $50 rather than $25, about 73 paid members are needed to clear $500 on this idealized model. **$500 is a target, not verified revenue.**

A one-time-only $4.99 offer would require about **116 sales each month** to yield $500 after card fees plus a $25 operations allowance (rounded up), with new buyers every month. A $19 one-time course pack would need roughly **29 new sales/month** under standard domestic card fees to clear the same amount. One-time packs can generate revenue, but a stable $500 **monthly** run-rate may require repeat launches or higher recurring acquisition. If the owner keeps the original no-subscription rule, run the one-time/tips plan only **after its existing five-unprompted-requests/day-30 gate or a new explicit authorization**.

### 3.3 Monthly outlay and ROI guardrails

| Cost | Lean first validation | Scaling test | Notes |
| --- | ---: | ---: | --- |
| Current static site / Worker | $0–$25 incremental/mo placeholder | $5–$50/mo placeholder | Audit real Cloudflare bill; D1/KV/Workers usage varies; no assumed migration |
| Transaction/Billing fees | Variable, modeled above | Variable | Deduct on actual paid revenue |
| Email / transactional notifications | $0–$15/mo | $10–$40/mo | Implement only when consent, deliverability and need are verified |
| Analytics | Existing PostHog; $0 incremental assumed | Watch usage plan | Do not duplicate tracking |
| Design/video production | Existing agent workflow | Existing workflow | **Not free economically** if LLM/API spend increases |
| Organic channels | $0 media spend | $0 media spend | Already scheduled social posts; opportunity cost still exists |
| Paid experimentation | **$0** | Optional capped **$150 total** after gates | Owner authorization required, not a recurring default |
| Domain, taxes, tax compliance | Audit actuals; not estimated as zero | Audit | Local/national tax collection obligations and chargebacks require review |

**Set an incremental run-rate cap of $50/month** during validation (excluding already existing subscriptions and payment fees), with alerts at 50%, 80% and 100%; budget an illustrative $25 in the target contribution model. Do not promise $0 cost without checking existing invoices. Do not launch traffic buying before converting organic traffic and checking ad-policy eligibility.

### 3.4 Market, conversion and churn scenarios (assumptions, NOT observed)

"Qualified visitor" means a distinct real person landing intentionally on training content, after test/bot exclusions and a fixed reporting window. Activation = completed first five-hand session in 7 days. New paid = **activated** visitor who completes a verified subscription charge in 30 days.

| Scenario | Qualified visits/month | Activation | Paid conversion of activated | New paying members/month |
| --- | ---: | ---: | ---: | ---: |
| Low | 1,000 | 20% | 2% | 4 |
| Working case | 2,500 | 30% | 4% | 30 |
| Strong | 4,000 | 35% | 5% | 70 |

With an **illustrative 8% monthly logo churn**, 30 new paying members/month results in approximately **30 active at month 1, 57.6 at month 2, 83.0 at month 3**, assuming no annual-cohort retention differences and identical acquisition each month. At the proposed mix, month 3 contributes approximately **$630 before operating allowance** (about $605 after $25). This is a *conditional path* to the initial goal, **not** a prediction that 2,500 qualified visits/mo will arrive within 90 days. On the low scenario, $500 may take a year or longer; churn can keep the total below target. Organic channel learning may require **3–6 months or more**.

The actual growth question is whether the existing acquisition channels can reliably create ~2,500 **qualified** visitors per month, not 2,500 Reel views. Until they do, don't assume the target date.

**Sensitivity:** At the 30% activation and 4% activated-to-paid assumptions, total visitor-to-paid conversion is **1.2%**. A $1 paid click implies about **$83.33 CAC**, while revenue at $9/month is only $9 gross in month 1. At 8% monthly churn, a simplistic monthly-only gross LTV would be $112.50, but that excludes fees, support, variable costs and churn differences. Paid advertising may be unprofitable; organic distribution first.

### 3.5 Validation and stop rules

- Gate A — **retention first:** hold monetization implementation until the core first-five-hand funnel is reliable and at least 30 non-test learners complete sessions; seek 10+ cross-day returners as an initial directional sign. This is a practical pilot threshold, not statistical proof.
- Gate B — **request/value evidence:** maintain the project's currently recorded unprompted-interest threshold unless the owner explicitly changes it; run 10–15 brief *neutral* learner interviews about frustrations and actual behavior without asking leading "would you buy?" questions.
- Gate C — **paid offer test:** offer a real working Pro trial/sample and real checkout only after owner policy sign-off, safety/legal review, and billing QA. 2–3 actual payments can validate plumbing, not product-market fit; 20+ paying customers and 30-day retention is an initial business signal.
- Gate D — **scale:** at least 2% activated-to-paid, stable first-session completion, and a measured 30/60-day renewal/churn sample before spending on ads. Do not turn tiny samples into definitive A/B claims.
- Kill/pivot: after 8 weeks of sustained qualified traffic and genuine premium exposure, if fewer than 10 paying customers or no repeat usage, stop feature expansion, interview learners, improve paid value, or revert to one-time packs/donations. No sunk-cost escalation.

## 4. Technical implementation plan (existing repository + Cloudflare)

**No actual implementation is authorized by this planning document.** Once monetization policy is explicitly approved, use narrow PRs and CI. The repository's main branch is protected (required test CI, no direct pushes even by admin); do not bypass it.

### 4.1 Minimal approach

1. **Audit current architecture:** identify deployed frontend vs built assets, Cloudflare Worker routes, service worker offline behavior, PostHog proxy, local save format, all four decision engines, environment binding patterns and existing tests. Confirm dependencies before making any backend choices.
2. **Content first:** represent premium curricula as versioned source data with chapter IDs, stable question IDs, answer rationale, simulator rule assumptions, completeness tests and sample/free flags. Validate strategy content against the existing engine.
3. **Offer UI:** nonintrusive module browser, course path preview, price page, free/pro comparison, honest FAQ; feature flag off until gated launch. Existing free routes unchanged.
4. **Accounts only for purchasers:** free anonymous local play must continue. Offer email one-time-code/magic-link authentication for paid users, account deletion and optional sync. Don't assume a provider is already connected. Use secure, rate-limited backend identity/session verification.
5. **Payments:** Stripe Checkout hosted payment and Stripe Customer Portal for cancellations, receipts, card changes and invoices. Server owns Stripe price IDs and customer mapping. Never trust a client flag saying paid; prevent client-side spoofing.
6. **Entitlement:** server-side account/entitlement table (evaluate Cloudflare D1 vs existing storage, choose after audit); consume signed webhook events, verify signatures against raw body, dedupe by event ID, handle checkout completion, invoice paid/failed, subscription updated/canceled, refund/chargeback, and async events in any order. Fetch canonical Stripe state on uncertainty. Support restore purchase.
7. **Offline:** existing free PWA must remain offline. For paid lessons, cache only legitimately entitled content and define a short, disclosed offline grace window; test expiry/renewal/revocation at next network connection. No leaked keys or entire protected course shipped to every guest.
8. **Accessibility/security/privacy:** keyboard/touch, readable labels, mobile 390px test, content security, CSRF/state protection, session cookie flags, rate limits, privacy policy update, retention/deletion policy and email consent; never put cards or payment secrets into analytics.
9. **Observability:** server-side only purchase_success and renewal/refund events, webhooks monitored for retries/failures, anonymized nonpurchase funnel events in PostHog. Separate synthetic QA purchases from production revenue.
10. **Rollout:** owner-approved pilot → limited live entitlement with verified payments → broader release. Feature-flag rollback must never erase a purchaser's entitlement. Keep a way to honor paid commitments if a rollback occurs.

### 4.2 Definition of done and tests

- All current no-signup free routes work in web/offline browsers with no account or paywall and no accidental paid redirect.
- Free-to-Pro upgrade from a real completed session works on mobile, including cancellation, error/decline, duplicate webhook, repeated checkout click, renewal, payment failure, refund, downgrade, backup export, offline mode and restoration on another device.
- No premium access from fake localStorage, spoofed network response or stale paid flag; entitlements checked server-side with correct grace policies.
- Email unsubscribe, account deletion, subscription cancellation and consumer disclosure paths are discoverable and tested.
- Webhook replays are idempotent; no duplicate receipts/revenue events. All unit, browser, offline, storage, build and deployment smoke tests pass.
- Pricing page visibly discloses currency, exact renewal terms, taxes as applicable, cancellation method and what is included. Refund policy reviewed before launch.
- Existing games and outcomes validated against simulator under declared rules; no "beat the casino" marketing.
- No deploy until owner explicitly approves monetization policy change and necessary seller/tax/payment setup.

**Proposed PR order:** (1) curriculum + QA, (2) course preview + analytics events behind flag, (3) accounts/entitlement, (4) Stripe + cancellation / compliance, (5) release review and guarded launch. Keep the current control doc intact and log owner decisions there only when explicitly authorized.

### 4.3 Analytics contract

Reuse today's canonical dashboard/report and agreed exclusions. New events after schema review:
- pro_path_preview, lesson_sample_completed, pro_feature_preview, pricing_view, checkout_start;
- purchase_success, pro_first_lesson_complete, renewal_paid, payment_failed, subscription_cancel_requested, entitlement_expired, refund_issued;
- event properties: course_id, offer, price_version, platform, ref, utm_campaign, utm_content, local_day, paid_status (where appropriate) and test=false.
Use source attribution via the existing ref conventions, with the Nov 1–12 campaign's utm_campaign=hooktest1112 and the QF/AF variant tags preserved. **Do not overwrite or relabel existing experiments.** Record paid MRR from the payment processor ledger, not click/checkout intent events.

Weekly owner-facing scorecard: qualified visitors → started → completed five → returned D1/D7 → saw sample → saw pricing → checkout started → verified new paid → active paid → gross MRR → payment fees → operating expense → normalized contribution → churn/refunds. Show sample sizes, date window, sources, exclusions and confidence caveat for every rate.

## 5. Marketing plan: organic-first acquisition, 90 days

**North star:** **completed first sessions from qualified human visitors**, then **returning learners and verified paid contribution**. Views, impressions and follower counts are distribution diagnostics only.

### 5.1 Channels, priorities and spend

| Priority | Channel | Role | Cadence | Paid media |
| --- | --- | --- | --- | ---: |
| P0 | Existing YouTube Shorts, FB Reels, IG Reels, Threads | Teach one real decision; route to free matching lesson | Keep current approved 4 PM CT daily creative schedule and 8 AM FB where already configured; don't duplicate/override current matched-pair test | $0 |
| P0 | In-product sharing | Share daily score with deep link to same quiz | Always available; measure shares → arrivals → session_complete | $0 |
| P1 | Search-focused guides | Capture evergreen "blackjack hit or stand quiz", "jacks or better hold strategy practice" intent | 1–2 genuinely useful guides/week until 10 indexed pages | $0 |
| P1 | Reddit/community helpfulness | Answer relevant questions; link only when allowed/relevant | 1–2 substantive human-reviewed contributions/week | $0 |
| P1 | Consent-based email mini-course | Bring learners back to their next free exercise | 5-email series, opt-in only; pause if open/clicks don't lead to return | $0–$15/mo |
| P2 | Micro-creator collaborations | Co-create one decision challenge and verified referral URL | 2 outreach offers/week only after funnel works | $0 initially; paid deals require approval |
| P3 | Search/social paid tests | Hypothesis test **only** after compliance + measurable organic sales | Single controlled test, not "always-on" | Max $150 total, explicit approval |

**Important platform policy:** gambling-adjacent material, even instructional casino-game content, can trigger restricted advertising review. Google specifically lists online educational materials for casino games and poker-for-fun games among gambling-related restricted examples and has certification rules. Never assume that "no cash gambling" makes Google/Meta paid ads eligible; review current platform policy/target geography and obtain any required authorization. Do not use casino logos, deposits, wagering promotions or gambling affiliates to improve conversion. Sources: https://support.google.com/adspolicy/answer/6008942 and https://support.google.com/adspolicy/answer/15132179 .

### 5.2 Existing content experiment — preserve before changing

The Poker Gym team's Nov 1–12 QF vs AF matched-pair experiment is already running. Do not silently rewrite its hooks, scheduling or creative, and do not add a new overlapping experiment. Produce **new, clearly labeled** Pro-preview material only after that test closes and the team reconciles results. Existing agent/owner roles, PostHog reports, Metricool scheduling and GitHub tracking remain the coordination system. No new separate spreadsheet, analytics dashboard, or VPS needed for this plan.

### 5.3 Campaign runbook A: five-hand challenge / short-form funnel

**Objective:** more real started and completed five-hand sessions, not more views.

**Setup**
1. Choose one verified strategy decision per clip and its matching public lesson/drill deep link.
2. Hook options: **QF**: "Against a dealer 6, do you stand on 12?" vs **AF**: "A dealer 6 changes the answer to this hand. Can you spot why?" Verify actual strategy/rules before publishing.
3. 15–25s vertical video: show hand → 2–3s thinking → correct decision → 1 concise explanation → CTA: "Try five free hands. Link in bio/description."
4. Tags: existing channel ref and utm_campaign/utm_content conventions, preserving the running experiment's variant labels exactly.
5. Publish via established Metricool schedule; capture post ID/URL, scheduled vs actually published state, site URL and timestamp.
6. At 24h and 7d reconcile platform impressions/video views, tagged site visitors, trainer opens, first five-hand completions, D1/D7 return; segment by clip.

**Decision:** Fix CTA/deep-link if a clip has high views but negligible visits. Fix onboarding if visits arrive but completion is poor. Repeat creatives with evidence of **qualified sessions**, not top-level impressions. No manufactured comments or bot posting.

### 5.4 Campaign runbook B: evergreen guides and discoverable curriculum

**Objective:** organic high-intent traffic that continues without buying clicks.

**First ten content candidates** (only if genuine unique instruction can be authored and verified):
1. Blackjack hit or stand quiz (beginner)
2. Blackjack when to double down (rule-specific)
3. Blackjack hard 12 vs dealer 2–6 explanations
4. Blackjack split pairs practice (rule-specific)
5. Blackjack basic strategy mistake drill
6. Jacks or Better: keep high pair vs four to a flush
7. Video poker hold/draw beginner guide with explicit paytable
8. Jacks or Better common mistakes
9. Baccarat banker vs player explained, with house-edge caveat
10. Texas Hold'em hand ranking and kicker puzzle

**Production runbook:** keyword intent check → outline correct lesson → 3–5 playable quiz choices → strategy QA against engine → source/assumptions → unique explanatory text → mobile readability → relevant internal link to five-hand drill → sitemap/canonical tags → Google Search Console / indexing check → PostHog attribution → update when rules or tests change. One substantial teaching page beats ten AI-generated near-duplicates. Avoid thin scaled content and claims of gambling gains.

**Weekly review:** indexed pages, search impressions/clicks where available, qualified visitors, practice starts, completions, returning learners and eventually conversion. If a page attracts visitors but no play, improve intro/CTA instead of making more pages.

### 5.5 Campaign runbook C: community and partnerships

**Objective:** honest referrals and useful feedback in places where people actually learn cards.

1. Check each community's self-promotion, account-age and moderation rules afresh. Never mass-post the same promo or conceal AI-agent affiliation.
2. Give a useful standalone explanation of a real hand or situation; respond to questions. Only include a link if relevant and permitted.
3. For creator outreach: propose a no-cost "Can your audience beat my five-hand challenge?" collaboration with a transparent, trackable link and no gambling sponsorship.
4. Verify organic participants and comments; use comments to identify actual player friction, not synthetic enthusiasm.
5. Record each outreach item (community/creator, date, disclosed affiliation, URL, referral tags, replies, qualified plays, cost).
6. If a creator asks for compensation or revenue share, **halt for owner approval**, verify channel audience authenticity, disclosure compliance and expected CAC. No promises about results.

Sample answer style: "For Jacks or Better, a high pair has an existing payout, so that draw can beat chasing a long-shot hand under this paytable. Here's the reasoning and a free three-hand interactive version if links are allowed." The actual hand-specific statement must be checked against rules before publication.

### 5.6 Campaign runbook D: opt-in retention mini-course

**Objective:** convert a one-time player into someone who practices several days.

- Trigger only after an affirmative opt-in in the web app, with subscription consent recorded separately from an account/purchase.
- Sequence: day 0 welcome + backup info + free 5-hand practice; day 2 one common mistake; day 4 another scenario; day 7 a personal next-week learning path if data available; day 10 optional Pro sample **only after launch**. Never imply individual performance without actual permission/data.
- Each email deep-links to the right lesson; subject lines informative, not fear-of-missing-out.
- Mail authenticity (SPF/DKIM/DMARC), one-click unsubscribe where required, preference management, deletion and rate-limiting required.
- Measure real return-to-game, paid conversion after launch, unsubscribe and complaint rates; stop if complaints or no lift.

### 5.7 Campaign runbook E: small paid test (future, optional)

**Only if all are true:** owner has approved a $150 maximum, at least 20 genuine paid customers exist, organic activation/renewal is measurable, ad account/domain meets gambling-related eligibility requirements, and ads have legal/policy clearance.

One channel / one offer / one landing page; measure cost per **verified customer**, not per click. Spend maximum $150 once, stop early if qualified sessions do not materialize. Example threshold: require a modeled CAC that pays back within 3 months of **net contribution**, which for $9/month is approximately **$25** before operating costs. If CPC is $1 and visitor-to-paid conversion is 1.2%, modeled CAC is $83, far above the threshold: **do not scale**. A $150 campaign may be too small to draw confident inferences; treat as a plumbing/traffic-quality test, not an ROI proof.

## 6. 90-day delivery and market validation schedule

| Window | Deliverables | Evidence gate | Responsible role |
| --- | --- | --- | --- |
| Days 1–14 | Snapshot today's PostHog baseline, reconcile social UTMs, session funnel and existing content experiment. Pro-course outline and first free sample, technical/cost audit. No monetization change. | Source quality, actual completion rate; owner chooses whether policy can change | Wren/analytics + creative + engineering; owner approves policy |
| Days 15–30 | Publish 4–6 high-quality lessons/guides; instrument course preview; test Pro interest through **observed behavior** without a fake paid claim; collect unsolicited requests and neutral feedback. | >=30 genuine completed sessions, meaningful return usage, truthful demand record | Engineering/creative/analytics |
| Days 31–45 | If owner approves: build/test two premium curricula, entitlement model and price page behind a closed flag. Add payment test mode and legal/privacy checklist. | QA green, owner pricing/legal consent; no charge before real delivery | Engineering + QA |
| Days 46–60 | Owner-approved limited Pro pilot; process genuine payment and support/restore/cancel tests; keep social cadence and SEO guides. | 5–20 customers as initial signal, verified billing/zero severe defects | Engineering + marketing/analytics |
| Days 61–90 | Iterate activation/Pro onboarding, add second paid path, partner outreach, SEO improvements; only consider paid tests if economics demonstrate viability. | 20+ paid users, renewal evidence, actual source-attributed conversion | Product + growth agents |
| Months 4–6 | Grow toward ~2,500 qualified visits/mo and 75–85 active paid if assumptions validate. | Monthly contribution >=$500 on reconciled ledger, 2 consecutive months; revisit cost growth | Autonomous team, owner reviews exceptions |

These are **sequence windows, not promised dates**. A failed gate extends or stops that stage rather than requiring the agents to invent traction. Protect the owner's preference for minimal manual relay: weekly exception-only reporting after initial approval.

## 7. Business plan and operational runbook

### 7.1 Revenue streams, in order

1. Low-cost Gym Pro subscription **only if the earlier policy is formally superseded by the owner** and the content merits recurring use.
2. Existing Ko-fi tip jar as a non-disruptive optional support path.
3. One-time paid course/challenge packs as an alternative if users resist subscription or owner keeps no-subscription policy; do not double-sell the same lessons without clarity.
4. No display ads, gambling affiliate links, paid wagering offers, sponsored casinos or user-data sales in the initial plan.

### 7.2 Lean operations ownership

| Workstream | Agent/role | Definition of done | Owner involvement |
| --- | --- | --- | --- |
| Funnel/product strategy | Product coordinating agent | staged spec, variant-free baseline, explicit evidence and risks | approve change to subscription rule and spend caps |
| Deterministic strategy content | Engineering + QA agents | correctness against engine, no contradictory tips, tested lessons | only exceptions |
| Short-form creative | Existing Grok video workflow | original clip, verified lesson and published URL | none within existing mandate |
| Metrics and reporting | Wren/Muse and canonical PostHog dashboard | qualified visitor → paid revenue ladder; no fake numbers | exception-only |
| Publishing | Existing Metricool operator | correct date, UTM, channel and verification; no duplicate schedules | none within prior permissions |
| Checkout/tax/privacy | Owner + authorized payment/tax setup | seller identity, tax/legal settings, Stripe live keys and policy | required explicit action |
| Monthly P&L check | Finance/reporting role | Stripe cash/recognized MRR, refunds, fees, hosting, subscriptions and retained profit | monthly high-level review |

No assistant may assume access to another agent's credentials or environment; no shared tokens, no branch protection workarounds, no unapproved subscriptions. GitHub remains canonical change record. A weekly automated report should cite what was **actually observed**, and flag blockers or costs for decision; do not create another scheduler when the team's daily processes already exist.

### 7.3 Weekly growth meeting as an executable runbook

Every Monday:
1. Read the canonical report, first-party traffic and actual payments with fixed date ranges.
2. Identify single highest drop-off: views→site, site→started, started→finished, finished→returned, preview→pricing, pricing→paid, paid→renewed.
3. Select **one** fix with hypothesis, owner, effort and success criterion; preserve active matched experiments.
4. Keep current publishing routine; do not launch a second campaign until the first has clean attribution.
5. Publish verified changes via PR, green CI and approved deployment path.
6. The following week record change and outcome, including **no effect**. Avoid uncontrolled simultaneous edits.
7. Escalate only payment/security/legal issues, ad policy, permission blocks, budget thresholds or major strategic changes.

**Decision thresholds (initial heuristics, calibrate after data):**
- <15% first-session completion from qualified entrants: work on speed/onboarding/phone UX before buying traffic.
- >=30% session activation but <10% D7 return after meaningful cohort: improve recurrence, "what's next", and relevance before paid push.
- high premium-preview interest but <2% activated-to-paid: check whether course depth/pricing/value statement is weak; do not reflexively discount.
- >10% monthly churn after meaningful paying cohort: prioritize actual recurring value; suspend acquisition spend.
- Paid conversion or churn on n<20 is anecdotal; no sweeping pricing conclusion.

### 7.4 Risks and mitigation

- **Policy contradiction:** current "no subscriptions ever" rule vs new proposal → owner must explicitly approve replacement first.
- **Low audience size:** current known historical visitor scale is small → model as hypotheses; invest in high-intent guides and real activation, not promised revenue.
- **Product/claim mismatch:** Poker Gym has four casino/card-game trainers, not a solver → position as five-minute card decisions.
- **Recurring value gap:** five hands alone may not justify monthly fee → deliver sustained curricula, mastery progress and archives before billing.
- **Payment and tax liabilities:** Stripe account and tax registrations not verified → seller approval and compliance checklist; no invented "set and forget" operations.
- **Provider payment fees / disputes:** fixed fees meaningful at $9 → report gross/fees/net independently; monitor chargebacks/refunds.
- **Gambling adjacency:** advertising/platform requirements may apply even without wagers → organic first, policy/certification review before any paid campaign.
- **AI accuracy and copyright:** AI-authored prompts can be wrong/duplicative; don't copy paid-course materials or competitor brand identity; test rule engine outputs and author original explanations.
- **Misleading "passive":** support, renewals, refunds, outages, legal compliance and marketing still need monitoring → automate only what can be verified; monthly financial review and issue escalation remain necessary.
- **Offline paid content:** security/entitlement vs original offline/no account contract → preserve free offline, explicit premium grace semantics, restore path.

## 8. Success conditions and immediate next actions

**Success definition:** Two consecutive closed calendar months at **$500+ normalized contribution** from verified recurring and one-time educational product revenue after processing/Billing fees and incremental site operating expense, **before taxes, owner's subscription outlay and labor**, with no policy violations or material refund backlog. If the objective is instead *$500 surplus after all LLM subscriptions*, add the actual monthly subscription costs to this threshold; do not pretend the current costs are known.

**Next action queue — no implementation without approval:**
1. **Owner:** Decide whether this request supersedes October's no-subscription policy and old day-30/five-ask gate; authorize a cap for extra spending. If not, follow the one-time/tip fallback only under the prior rule.
2. **Analytics:** Obtain a dated current baseline from npm run report and the PostHog decision dashboard, reconciled to the social source tags. Never use the historical Oct 23 figures as "today".
3. **Curriculum:** Prototype a **free complete chapter** and one **Pro-ready advanced chapter** in blackjack. Validate correctness and replay value with actual users before building full billing.
4. **Funnel:** Sketch the post-session personalized next-step panel, module preview and honest free/pro comparison behind a disabled flag.
5. **Finance/tech:** Check Cloudflare/email/LLM incremental bills; validate Stripe availability, fees, tax and paid-entitlement storage, using least privilege.
6. **Growth:** Keep existing social schedules and Nov 1–12 experiment unchanged; begin evergreen guide work and measure source-tagged **sessions**, not views.
7. **Approval to charge:** Get an explicit owner go-ahead, a real delivered paid product, green CI, secure webhook and cancellation tests, and accurate disclosures before public checkout.
8. **First goal:** get 10 honest paying members; then 25; then 50; then **75–85 retained members** at the modeled offer, measuring real monthly contribution at each milestone.

## 9. Source register and assumptions

**Primary product evidence**
- Live landing: https://playpokergym.com/ (checked 2026-11-04)
- Free playable app: https://playpokergym.com/web/
- Repository: https://github.com/MeepTheTendie/pokergym
- Project sources: README.md, LAUNCH.md, MARKETING.md, SCORECARD.md, docs/PokerGymControlDoc.md, docs/CanonicalDashboard.md, docs/OPERATING_RULES.md, docs/analytics-events.md
- Canonical current dashboard (requires proper project access): https://us.posthog.com/project/670990/dashboard/2263366

**External pricing and advertising evidence checked 2026-11-04**
- Codecademy: https://www.codecademy.com/pricing
- Scrimba free-vs-Pro: https://scrimba.helpscoutdocs.com/article/73-whats-the-difference-between-pro-and-free
- PeakGTO: https://pokercoaching.com/peakgto-pricing
- PokerCoaching: https://pokercoaching.com/home/pricing/
- Blackjack Apprenticeship: https://www.blackjackapprenticeship.com/plans-and-pricing-monthly/
- Stripe Payments: https://stripe.com/pricing
- Stripe Billing: https://stripe.com/billing/pricing
- Cloudflare platform: https://www.cloudflare.com/plans/
- Google gambling/games policy: https://support.google.com/adspolicy/answer/15132179 and https://support.google.com/adspolicy/answer/6008942

**Explicit assumptions vs facts:** $9/$72 pricing, paid-feature scope, 70/30 plan mix, 8% logo churn, conversion rates, traffic growth, $25 monthly operating allowance, $150 optional ad test, and 90-day milestones are **proposals/scenarios**, not observed audience willingness, verified costs, contractual payments or financial forecasts. Payment rates and competitor list are external snapshot prices and may change. Actual site revenue, current PostHog traffic and real monthly LLM subscription spend were **not verified** in preparing this document.

---

**Approval boundary:** This file is a planning artifact. It does not alter the existing 2026-10-15 monetization rule, authorize marketing spend, create a subscription, change the product, or direct an agent to work outside its existing authorized mandate.