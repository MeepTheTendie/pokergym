# Gym Pro — Pricing Analysis

**Prepared:** 2026-11-08 by Claude (integrator). **Decision status:** price is crew vote Q3 (`PG-CLAUDE-MONETIZE-20261108-01`, closes Wed Nov 11 12:00 PM CT). This doc is the evidence for that vote and Claude's recommendation.
**Recommendation:** **$6/month** (Ko-fi membership) **+ $29 lifetime** for the first 50 buyers, then **$39 lifetime**. Re-test after the first 10 buyers.

## 1. What we're pricing

A casual, browser-based card-decision trainer. No real money, no card counting, no solver. The buyer is a recreational player (blackjack/video poker first) who wants to stop making the same mistake. Pro adds new content only; the free trainer stays complete.

## 2. Market benchmarks (checked Nov 8, 2026)

| Product | Type | Price | Read for us |
|---|---|---|---|
| Black Jack Trainer Masterclass (iOS) | Casual blackjack trainer | Free; $19.99/yr unlock all; $4.99 one-time variant | Closest comparable: casual trainers price at **$5–20/year** |
| WinPoker (iOS) | Video poker trainer | $9.99 one-time, no IAP | Video poker players pay **~$10 once** for a trainer |
| Blackjack Apprenticeship | Pro card-counting school | ~$397–997/yr first year, ~$299 renewals; $3,000 bootcamp | Serious advantage players pay a lot; **not our buyer** (we don't teach counting) |
| Codecademy | Paid code course | Free Basic; Plus $14.99/mo annual, $29.99 monthly; Pro $19.99/$39.99 | The funnel model, not the price model; career value justifies their price |
| Scrimba | Paid code course | Free limited courses and 10 challenges; Pro unlocks all | Model for "sample the paid content before paying" |
| Ko-fi memberships | Creator support | Typical tiers $3–10/mo | The checkout our buyers will see; $6 reads as normal |

**Conclusion:** we sit at the casual end. A price above ~$10/month or ~$40 once is out of category for a hobby trainer with no money-making promise. Below ~$5, fixed payment fees eat the margin.

## 3. Fees (Ko-fi free plan: 5% platform fee on memberships and shop + Stripe ~2.9% + $0.30)

| Gross | Net to Wes | Fee share |
|---:|---:|---:|
| $4.99 | $4.30 | 13.8% |
| $6.00 | $5.23 | 12.8% |
| $9.00 | $7.99 | 11.2% |
| $29.00 | $26.41 | 8.9% |
| $39.00 | $35.62 | 8.7% |
| $72.00 | $66.01 | 8.3% |

Ko-fi Gold ($12/month) removes the 5% and pays for itself above **$240 gross/month**. Switch then (owner spend approval needed), not before. PayPal checkout costs a bit more than Stripe; either is fine.

## 4. Options compared

Steady-state monthly visitors needed for **$500 net/month**, at 14% visitor→finisher (the post-#44 target), 12% monthly churn, 40% of buyers choosing lifetime (from `scripts/revenue-model.mjs`, adjusted per option):

| Option | Net per buyer (lifetime value) | Visitors needed @2.5% buy rate | Risk |
|---|---:|---:|---|
| **A. $6/mo + $29 lifetime** (recommended) | ~$36 blended | **~3,800** | Low price may undersell serious users |
| B. $9/mo + $72/yr (Nov 4 plan) | ~$66 blended, but buy rate likely ~40% lower | ~3,600 at 1.5% | Higher sticker shock for a casual tool; annual on Ko-fi is clumsy |
| C. $4.99 one-time unlock | $4.30 | ~29,000 | Needs 116 sales every month; dead end for $500 |
| D. $19.99/yr only | ~$18 (first year) | ~7,600 | Matches app-store comparables but half the cash per buyer |
| E. Pay-what-you-want, $5 floor | unknown | unknown | Ko-fi handles it, but unpredictable; keep as tips |

Why A wins: on paper A and B are a tie per visitor (B earns more per buyer, A sells to more buyers). A wins on risk: a casual audience at a casual price is the safer bet on buy rate. It also offers two clear choices (rent or own), lifetime suits hobby buyers who hate subscriptions, and the $29 → $39 founding step gives an honest reason to buy now. Monthly creates the recurring base; lifetime creates cash spikes from launches.

## 5. Fallbacks (decided now so nobody debates later)

- **0 buyers after ≥ 300 finishers saw the offer:** add a **$4.99 single-pack** shop item (one pack, own it). Tests whether *any* price works. If singles sell and Pro doesn't, Pro value isn't clear; fix content, not price.
- **Buyers exist but < 1% of finishers:** test lifetime at $19 for 2 weeks (above the fee cliff, below impulse ceiling).
- **Buy rate ≥ 5%:** raise monthly to $7 for *new* members (existing members keep their price, stated on `/pro`).
- **Holiday window (Dec 1–31):** "Give Gym Pro" — the lifetime item as a gift code (buyer receives the code by email to forward). Same price.

## 6. What we will not do

No casino or sportsbook affiliate links (conflicts with "no real-money gambling" and invites under-18 risk). No ads on the trainer (the site promises "no ads"; revisit display ads on guide pages only at >20,000 guide pageviews/month). No auto-renew traps, no fake discounts. No claims that Pro improves winnings.

## 7. Other income (small, for completeness)

| Stream | Realistic $/mo by Jun 2027 | Notes |
|---|---:|---|
| Ko-fi tips | $5–20 | Keep the link; add "Support" on the recap after a 5/5 |
| X Original Content Rewards | $0 near term | Requires Premium, 500 verified followers and 500k verified impressions in 90 days. X's job is traffic, not payouts. |
| Book affiliate links (strategy books on guide pages) | $0–15 | Needs an Amazon Associates account (owner). Low priority. |
| Guide-page display ads | $0 until ~20k guide pageviews | Not before Jun 2027 |

## Sources
- [Ko-fi pricing and fees, 2026](https://schoolmaker.com/blog/ko-fi-pricing.md)
- [Black Jack Trainer Masterclass, App Store](https://apps.apple.com/app/id1613689111)
- [WinPoker price, App Pricing Lab](https://apppricinglab.com/app/apple/298071996)
- [Blackjack Apprenticeship pricing review](https://countedge.pages.dev/blog/blackjack-apprenticeship/)
- [Codecademy pricing, PricingSaaS](https://pricingsaas.com/companies/codecademy)
- [Scrimba Pro vs Free](https://scrimba.helpscoutdocs.com/article/73-whats-the-difference-between-pro-and-free)
- [Free-to-paid conversion benchmarks, Lenny's Newsletter](https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion) (good 3–5%, great 6–8% for self-serve freemium)
- [X Original Content Rewards eligibility](https://opentweet.io/answers/what-replaced-x-creator-revenue-sharing)
