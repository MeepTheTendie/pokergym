# Poker Gym — Free-to-Paid Funnel Implementation Plan

**Owner of this plan:** Claude (integrator), under Wes's Nov 8, 2026 directive to find the path to monetization and direct the crew on it.
**Status:** ACTIVE. Supersedes the Nov 4 proposal (archived at `docs/monetization/archive/plan-2026-11-04.md`).
**Goal:** $500/month net, passive for Wes, by **Jun 30, 2027**. Interim: first paying member by Nov 29, 2026; $100/mo by Feb 28; $250/mo by Apr 30 (covers Wes's AI spend floor).
**Companion docs:** [business plan](docs/monetization/business-plan.md) · [pricing analysis](docs/monetization/pricing-analysis.md) · [marketing plan, outlay and campaign runbooks](docs/monetization/marketing-plan.md) · model: `node scripts/revenue-model.mjs`

---

## 0. The answer in one screen

1. **Keep everything that's free today free, forever.** Four games, Daily Drill, coaching, mistake review, local save, offline, no signup. That's the "free intro course" and it's our marketing.
2. **Sell Gym Pro: new content only.** Mistake-targeted practice packs, a full stats/history view, the Daily Drill archive and course-style "tracks" with a completion certificate.
3. **Price (pending crew vote Q3, closes Wed Nov 11 noon CT):** recommended **$6/month** (Ko-fi membership) **or $29 lifetime** (Ko-fi shop item), with the first 50 lifetime buyers locked at $29 and the price moving to $39 after that. Reasoning in the pricing analysis.
4. **Collect through Ko-fi** (account already exists, $0, no new owner account). A Cloudflare Worker turns each Ko-fi payment into a signed unlock code. Works offline, no login.
5. **Traffic is the bottleneck, not pricing.** We have ~241 visitors/month. $500/month needs **~6,000 visitors/month at a 2.5–5% buy rate among players who finish a session**. The marketing plan is the bigger half of this job.

What makes this "code-course" and not "freemium nag": the free product is a real, complete first course. Pro is the *next* course, shown as a visible syllabus the player can see but not yet enter, offered at the moment they've just proved to themselves they're learning.

---

## 1. Where we start (observed, PostHog, 30 days to Nov 8, test accounts filtered)

| Stage | Count | Rate |
|---|---:|---:|
| Visitors | 241 | — |
| Players (dealt a hand) | ~40 | 17% of visitors |
| Five-hand finishers | ~23 | 58% of players, 9.5% of visitors |
| Returned next day | Wren reports Tue Nov 10 | — |
| Paying | 0 | — |

Best source by quality: Reddit (19 visitors, 14% bounce, from one post). Video Reels: 100–870 plays each, tagged traffic → ~0 game starts. Organic search: ~2 entries to 48 guide pages.

**Implication for the funnel:** the steepest drop is visitor → first hand (83% leave). PR #44 (one tap deals the first hand) lands Nov 13 and is the single highest-value funnel change before any upsell exists.

---

## 2. What we borrow from paid code courses

| Code-course tactic | Example | Poker Gym version |
|---|---|---|
| **Free first lesson, no account** | Scrimba/Codecademy let you code in the browser before signup | Already true: hand dealt on first tap (after #44). Keep. |
| **Visible syllabus with locked chapters** | Course map shows every module; Pro ones carry a lock | **Training Map**: each game shows its free Foundations track plus 2–3 Pro tracks with lesson counts. Pro tiles are visible, tappable, and open a preview. |
| **Interactive sample of paid content** | First Pro lesson free | **Every Pro pack's first 3 spots are free.** The player feels the pack before the offer. |
| **Personal "aha" before the ask** | "You've completed 12 lessons!" | **Session recap names the exact leak**: "Both misses were soft-hand doubles." Then: "Fix it: Soft Hands pack, 20 spots." |
| **Progress you can lose by stopping** | Streaks, % complete bars | Track progress bars (free track shows 100% reachable; Pro tracks show 0/20 with first 3 open). Streaks stay free. |
| **Certificate of completion** | Shareable cert on LinkedIn | **Gym Certificate** per completed track (score + date, share image). Foundations cert free; Pro track certs are Pro. Every share is an ad. |
| **Annual/lifetime anchoring** | $39.99/mo vs $19.99/mo annual | $6/month vs **$29 lifetime** ("about 5 months of monthly"). Lifetime is for people who won't subscribe to a hobby tool. |
| **Founding/launch price (real, enforced)** | Early-bird course pricing | First 50 lifetime at $29, counter shown live from the Worker; then $39. No fake countdowns. |
| **Money-back guarantee** | 30-day refund | "Didn't help? Email within 14 days for a full refund." Ko-fi refunds are manual; volume will be tiny. |
| **Social proof** | Learner counts, testimonials | Real numbers only: "N players finished a session this week" from PostHog. Quotes only with permission. |
| **Email nurture** | 5-day free mini course | Phase 3, opt-in only: "5 hands that cost players the most", one per day. Needs a free email tool (owner account). |
| **Re-engagement** | "Your streak is about to end" | Already have web push daily reminder. Add one weekly "your leak this week" push for opted-in players. |

**Hard guardrails (non-negotiable):** never gate a free feature; never interrupt a hand with an offer; at most one offer per completed session; no fake scarcity or fake timers; no real-money gambling links or casino affiliates; never claim Pro helps anyone win money. "Learning the best play lowers the house edge; it never beats it" stays on every Pro surface.

---

## 3. The funnel, step by step

| # | Stage | What the player sees | Offer? | Event (PostHog) | Target rate |
|---|---|---|---|---|---|
| 1 | Land | Landing or guide page, "Can you get 5/5?" | No | `$pageview` (+ `ref`) | — |
| 2 | First hand | One tap deals a hand (#44) | No | `hand_dealt` (first) | 35% of visitors (now 17%) |
| 3 | Finish session | 5 coached hands | No | `session_complete` | 65% of players (now 58%) |
| 4 | Recap + leak | Score, the named leak, "come back tomorrow" | **Soft**: "Fix this leak" → free 3-spot sample of the matching Pro pack | `recap_view`, `leak_named`, `pro_sample_start` | 40% of finishers tap the sample |
| 5 | Sample done | 3 spots graded, pack progress 3/20 | **Main offer card**: Pro value + price + "keep training free" | `pro_sample_complete`, `offer_view` | 50% of sample starters finish |
| 6 | Pro page | `/pro`: what's in it, syllabus, price, FAQ, refund | Checkout buttons → Ko-fi | `pro_page_view`, `checkout_click` (`plan`=monthly/lifetime) | 15% of offer viewers click |
| 7 | Pay | Ko-fi checkout (new tab) | — | Ko-fi webhook → Worker `purchase` | 40% of clickers pay |
| 8 | Unlock | Return to `/web/?pro=restore` → enter Ko-fi email → code fetched, verified, Pro on | — | `pro_unlocked` | 95% of payers unlock same day |
| 9 | First Pro win | Lands in the pack they sampled, at spot 4 | — | `pro_first_spot` | 90% |
| 10 | Retain | Weekly leak push, new Daily Drill archive week, track certs | Renewal is Ko-fi's | `pro_weekly_active`, Ko-fi renewals | <12% monthly churn |

Rough math at targets: 35% × 65% = 23% of visitors finish; 40% × 50% × 15% × 40% ≈ 1.2% of finishers buy from the recap path alone. The Training Map, `/pro` page from the landing nav, the Daily Drill archive teaser and certificate shares add the rest of the 2.5% base buy rate. If we only hit 1.2%, the [pricing analysis](docs/monetization/pricing-analysis.md) has the fallback.

### 3.1 Offer surfaces (in priority order)

1. **Session recap leak card** (step 4–5). Highest intent. Copy:
   > **4 of 5.** Your miss: doubling soft 17 against a 6. That's the most common soft-hand leak.
   > **Fix it now: 3 free spots from the Soft Hands pack →**
   >
   > *(after the sample)* **3/3. That's the Soft Hands pack: 20 graded spots, each with the exact reason.** Gym Pro unlocks it plus 3 more packs, your full stats history and every past Daily Drill. **$6/month or $29 once.** Keep training free →
2. **Training Map** (new screen off the game picker): free Foundations track per game + locked Pro tracks with lesson counts. Pro tile → preview → `/pro`.
3. **Daily Drill archive teaser:** after today's drill, "Missed yesterday's? Pro keeps every past drill." One line, no modal.
4. **Stats page teaser:** free shows the last 7 days; the Pro view adds full history, accuracy by decision type and trend lines. Free players see a blurred sample chart of *their own* data with "Pro shows all of it."
5. **Landing page:** a "Gym Pro" section below the fold and a nav link. FAQ copy changes from "no paid tier" to "The core trainer is free forever. Gym Pro is optional and adds new training." (Only when Pro ships, same deploy.)
6. **Certificate share card:** finishing a track produces a share image with `?ref=cert`.

### 3.2 What Pro contains at launch (definition of done for "Pro is live")

- 4 practice packs × 20 graded spots, generated from the engine (Beam, `beam/pro-packs`): Blackjack soft hands, Blackjack pairs/splits, Jacks or Better holds (9/6), Baccarat third-card rule. First 3 spots of each free.
- Pack player that reuses the existing coach explanation UI.
- Full stats history view (all local history, by game and decision type).
- Daily Drill archive (every past drill is deterministic from the date seed, so it's just a date picker).
- 2 Pro tracks with certificates (Blackjack Pro: soft hands + splits; Video Poker Pro: holds).
- Unlock, restore and "Manage membership" (link to Ko-fi).

**After launch, one new Pro thing every 2 weeks** (keeps monthly members and gives the crew launch news): Hold'em hand-reading pack, blackjack hard-total doubles, deuces wild holds, "weakest decision" auto-pack built from the player's own misses.

---

## 4. Payments and unlock: technical design

**Principle:** no accounts, no passwords, works offline, Wes does nothing per sale.

```
Ko-fi checkout ──webhook──▶ Worker /api/kofi
                             • verify verification_token (Worker secret)
                             • tier: lifetime (Shop Order, item code) or monthly (Subscription)
                             • sign entitlement {tier, exp, id} with Ed25519 private key (Worker secret)
                             • KV PRO_ENTITLEMENTS: sha256(lowercased email) → signed code, exp
Player /web/?pro=restore ──▶ Worker /api/pro/restore {email}
                             • look up sha256(email) → return code (rate limited, 5/hour/IP)
Client                       • verify signature with the embedded PUBLIC key (offline)
                             • set pro flag + exp in the existing save (survives export/import)
```

- **Lifetime** codes have no expiry. **Monthly** codes expire 35 days after the last payment; each renewal webhook refreshes the code; the client silently re-fetches when within 5 days of expiry and online. Offline players keep Pro until expiry.
- **Why Ed25519 signatures instead of a shared-secret checksum:** the client only holds the public key, so codes can't be forged from the shipped JavaScript. This **amends DeepSeek's task `PG-CLAUDE-PRO-UNLOCK-20261108-01`**: verify an Ed25519 signature with `crypto.subtle` (Web Crypto, no dependency) instead of HMAC.
- **Privacy:** store only a SHA-256 hash of the email, the code and expiry. Privacy page gets one paragraph. No PII in PostHog: `purchase` events carry tier and ref only.
- **Membership ends:** Ko-fi sends no cancellation webhook; expiry handles it.
- **Founding counter:** KV key `lifetime_sold`; `/api/pro/status` returns `{lifetime_sold, lifetime_price}` for the `/pro` page.
- **Owner-only one-time setup** (about 10 minutes, Claude does it in Wes's Chrome if he approves; otherwise exact steps in the marketing plan §6): create the Ko-fi "Gym Pro" membership tier ($6) and "Gym Pro Lifetime" shop item ($29); paste the webhook URL `https://playpokergym.com/api/kofi`; store the Ko-fi verification token and the Ed25519 private key as Worker secrets (`wrangler secret put KOFI_TOKEN`, `wrangler secret put PRO_SIGNING_KEY`); create the KV namespace.

### 4.1 Build tasks and owners

| Task | Owner | Branch | Due |
|---|---|---|---|
| Pack content + generator + engine-match tests | Beam | `beam/pro-packs` | Sun Nov 15 |
| Client entitlement module (Ed25519 verify, save flag, restore UI) | DeepSeek | `deepseek/pro-unlock` | Sun Nov 15 |
| Worker `/api/kofi`, `/api/pro/restore`, `/api/pro/status`, KV binding, tests with sample Ko-fi payloads | Claude | `claude/pro-worker` | Wed Nov 18 |
| Pack player, Training Map, stats history, drill archive, recap leak card, `/pro` page | Claude (review DeepSeek/Beam) | `claude/pro-ui` | Fri Nov 20 |
| Events + PostHog funnel insight "Pro funnel" (steps 2–9) | Claude, Wren verifies | same | Fri Nov 20 |
| Landing/FAQ/privacy copy | ChatGPT drafts, Claude ships | `claude/pro-ui` | Fri Nov 20 |
| Ko-fi tier + item + secrets | Wes (or Claude in Chrome with approval) | — | Sun Nov 22 |
| Launch | Claude deploys | main | **Tue Nov 24** |

### 4.2 Tests (required `test` check must cover)

- Every free feature reachable with Pro off (regression list: four games, Daily Drill today, coaching, review queue, export/import, offline).
- Valid code unlocks; tampered code, wrong key, expired monthly code rejected; flag survives export/import.
- Webhook: bad token → 401; Subscription and Shop Order payloads → correct tier/expiry; duplicate `message_id` idempotent.
- Pack spot answers match the engine for all 80 spots.
- No offer renders during a hand; max one offer per session.

---

## 5. Measurement and decisions

**Funnel insight** in PostHog: steps 2→9 above, broken down by `ref`. Wren adds it to the Monday scoreboard (visitors → players → finishers → returned D1 → **offer views → checkout clicks → paid → $**).

| Check | When | Rule |
|---|---|---|
| Sample uptake < 20% of finishers | 2 weeks after launch | Rewrite the recap card copy; test leak-first vs score-first |
| Offer → checkout click < 5% | 3 weeks | Test price display (lifetime first vs monthly first) |
| 0 buyers with ≥ 300 finishers | Any time | Pricing problem, not traffic: run the $4.99 single-pack fallback (pricing analysis §5) |
| Under 10 paying members | 8 weeks after launch (Jan 19) | Crew revisits price and Pro content; traffic plan continues regardless |
| Monthly churn > 20% | After 3 renewal cycles | More new Pro content per month; push lifetime harder |
| Net revenue vs milestone | Monthly, first Monday | Off by >40% two months running → Claude rewrites the marketing allocation |

**A/B tests (one at a time, ≥ 100 offer views per arm before reading):** recap copy (leak-first vs score-first) → price order (lifetime-first vs monthly-first) → sample size (3 vs 5 free spots) → founding counter shown vs hidden.

---

## 6. Timeline

| Date | Milestone |
|---|---|
| Wed Nov 11 | Price vote closes (Q3). Claude updates prices in this plan if the vote differs. |
| Fri Nov 13 | #44 merged: one tap deals the first hand. Video test closes. |
| Sun Nov 15 | Packs (Beam) and entitlement module (DeepSeek) delivered |
| Wed Nov 18 | Worker payment path tested on staging with sample payloads |
| Fri Nov 20 | Pro UI complete, all tests green |
| Sun Nov 22 | Ko-fi tier/item + secrets set (owner, ~10 min) |
| **Tue Nov 24** | **Gym Pro live.** "Pro is live" posts go out Wed Nov 25 (marketing plan) |
| Sun Nov 29 | First paying member (target) |
| Dec 1–31 | Gift-code push for the holidays (lifetime as a gift) |
| Jan 19, 2027 | 8-week review: ≥ 10 paying members or change course |
| Feb 28 | $100/mo net |
| Apr 30 | $250/mo net |
| **Jun 30** | **$500/mo net** |
