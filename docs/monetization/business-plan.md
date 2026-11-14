# Poker Gym — Business Plan

**Prepared:** 2026-11-08 by Claude (integrator). **Status:** ACTIVE.
**Owner's goal (Wes, Nov 8):** Poker Gym (plus his X account) covers his AI spend: **$200–300/month, $500 if we push it**, with Wes limited to strategy, budget and consequential calls.
**This plan's target:** **$500/month net by Jun 30, 2027**, passive for Wes (≤ 30 min/week), $0 cash outlay.

## 1. Summary

Poker Gym is a free browser trainer that coaches every decision in blackjack, Jacks or Better, baccarat and Hold'em hand reading. It's built and run by an AI agent crew. We'll monetize with **Gym Pro**, a low-priced add-on of *new* training (mistake-targeted packs, full stats history, Daily Drill archive, certified tracks), sold through Ko-fi at a recommended **$6/month or $29 lifetime**. The free trainer stays complete and acts as the funnel, the way free intro lessons work for paid code courses.

The constraint is traffic, not product or price: ~241 visitors/month today; ~6,000/month needed. The marketing plan targets the people who already play these games (Reddit, search, forums) instead of broad social video.

## 2. Problem and product

- **Problem:** recreational players repeat the same costly mistakes (soft doubles, splits, video-poker holds) and strategy charts don't stick. Existing trainers are either app-store toys or $300–1,000/yr advantage-play schools.
- **Product (free):** five coached hands a session, Daily Drill with shareable grid, spaced mistake review, local save, offline PWA, no signup, no ads, no real money.
- **Product (Pro, launching Tue Nov 24):** see `plan.md` §3.2.
- **Moat (modest, honest):** a verified decision engine with written reasons for every spot, a daily habit loop, and an AI crew that can ship new packs every two weeks at near-zero marginal cost.

## 3. Market

- US blackjack and video-poker players number in the millions; the relevant slice is the subset that seeks to improve and spends time in communities like r/blackjack and r/VideoPoker or searches decision questions.
- **We need very few customers.** $500/month ≈ 50 monthly members plus ~9 lifetime sales a month. Market size isn't the risk; reach is.

## 4. Business model

| Stream | Price | Role |
|---|---|---|
| Gym Pro monthly (Ko-fi membership) | $6/mo | Recurring base |
| Gym Pro lifetime (Ko-fi shop) | $29 first 50, then $39 | Cash from launches and hobby buyers who won't subscribe |
| Gift lifetime (Dec) | same | Seasonal |
| Tips (Ko-fi) | any | Small |

Unit economics (Ko-fi free plan + Stripe): $6 → $5.23 net; $29 → $26.41 net. Marginal cost per user ≈ $0 (static assets on Cloudflare free tier, local storage, no LLM calls at play time). Blended lifetime value per buyer ≈ **$36** at 12% monthly churn and 40% lifetime share. Full analysis: `pricing-analysis.md`.

## 5. Financial projection

From `node scripts/revenue-model.mjs` (assumptions in the script header; every rate is an assumption until Wren's scoreboard replaces it).

| Month | Visitors (plan) | Base case net (2.5% buy rate) | High case net (5%) |
|---|---:|---:|---:|
| Dec 2026 | 800 | $34 | $66 |
| Feb 2027 | 2,500 | $145 | $285 |
| Apr 2027 | 4,500 | $296 | $583 |
| **Jun 2027** | **6,000** | **$444** | **$875** |

**Reading it plainly:** at the plan's traffic, the base case covers Wes's $200–300 floor by **April** and gets close to $500 by June; hitting $500 by June needs either the traffic plan plus a ~3% buy rate, or traffic slightly ahead of plan. If traffic stalls at ~1,500/month, revenue stalls near $80–150/month, and no price change fixes that.

**Costs:** $0/month cash. Optional Ko-fi Gold ($12/mo) once gross > $240/mo. No paid acquisition (a visitor is worth ~$0.13; ads cost more).

## 6. Milestones and gates

| Date | Milestone | If missed |
|---|---|---|
| Fri Nov 13 | One-tap first hand (#44) live | Claude escalates on #51 |
| Wed Nov 18 | Show HN + directories done | Reschedule within a week |
| **Tue Nov 24** | **Gym Pro live** | Ship with 2 packs rather than slip |
| Sun Nov 29 | First paying member | Check offer views; if < 50, it's traffic; if ≥ 50, test copy |
| Jan 19, 2027 | ≥ 10 paying members | Crew revisits price/content (pricing fallbacks §5) |
| Feb 28 | $100/mo net, 2,500 visitors | Reallocate channels per scoreboard |
| Apr 30 | $250/mo net (Wes's floor covered) | Same |
| **Jun 30** | **$500/mo net** | Decide: double down on what's working, or hold at the floor |

## 7. Team and operations

| Seat | Owns |
|---|---|
| **Claude** (integrator) | This plan; Pro build and deploy; Worker payment path; funnel changes; video production; weekly allocation |
| **Wren/Muse** | Monday scoreboard (visitors → players → finishers → return → offer → paid → $); keep/cut calls; Search Console reads |
| **ChatGPT** | All public copy: Sunday weekly pack, launch copy, guide drafts, landing/FAQ text; post-publish readback |
| **DeepSeek** (OpenCode) | Client entitlement module, future engine features |
| **Beam** (OpenCode) | Pro pack content generated from the engine; new pack every 2 weeks |
| **Wes** | ~20–30 min/week posting crew copy from his accounts; ~10 min once for Ko-fi; spend and account decisions |

Coordination stays on GitHub: tasks on #41, results and directives on #51, decisions in the ControlDoc Decision Log.

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Traffic doesn't grow | High | Channel mix weighted to intent-rich sources; weekly keep/cut; search compounding; no single-channel bet |
| Nobody pays | Medium | Live test from Nov 24; fallbacks decided in advance ($4.99 single pack, $19 lifetime test) |
| Reddit pushback on self-promotion | Medium | Helpful-first replies, sub rules checked every time, link posts ≤ 1/month/sub |
| Codes shared publicly | Low impact | Signed per-buyer codes; monthly codes expire; it's a $6 hobby tool, so no DRM arms race |
| Gambling-adjacent platform/policy issues | Low–medium | No real money, no casino links, education framing, 21+ audience targeting, "lowers the edge, never beats it" |
| Wes's time creep | Medium | Crew writes everything; Wes only pastes; Claude handles anything doable in his Chrome with approval |
| Ko-fi dependency | Low | Webhook layer is processor-agnostic; Stripe swap is a Worker change plus an owner account |

## 9. Decisions log for this plan

- 2026-11-08, Wes: monetize; Claude owns the path and directs the crew; Q1 (charge: yes), Q2 (Gym Pro, new features only) and Q4 (Ko-fi) delegated to and decided by Claude. Q3 (price) by crew vote, closes Wed Nov 11 12:00 PM CT.
- 2026-11-08, Wes: requested this pricing analysis and plan, superseding the Oct 15 "no subscriptions / no pricing work" rule in `docs/OPERATING_RULES.md` (updated in the same change).
