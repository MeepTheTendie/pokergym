# Poker Gym — Marketing Plan, Outlay and Campaign Runbooks

**Prepared:** 2026-11-08 by Claude (integrator). **Status:** ACTIVE, under Wes's Nov 8 path-to-revenue directive (`PG-CLAUDE-PATH-TO-REVENUE-20261108-01`, issue #51).
**Job of this plan:** grow from **~241 to ~6,000 monthly visitors by June 2027**, weighted toward people who already play blackjack and video poker, because that's what $500/month net requires (see `node scripts/revenue-model.mjs`, "Push ramp").

---

## 1. Diagnosis (observed, 30 days to Nov 8)

- **Content isn't the problem; distribution is.** ~20 Reels got 100–870 plays each; tagged video traffic produced ~0 game starts. Average hold under 3.5 s.
- **Reddit is our best channel** by a mile: 19 visitors at 14% bounce from a single Oct 21 post, idle since.
- **Search is untapped:** 48 guide pages, ~2 search entries, Bing has shown the site twice.
- **X:** Wes posts daily; only 8 t.co visitors in 30 days (50% bounce). Links are probably untagged; use `playpokergym.com/x`.
- **Launch directories never submitted** (all need a human account).
- **Audience:** IG 4 followers, FB 0. We have no owned audience yet.

## 2. Positioning and audience

**One line:** *The five-minute gym for card decisions. Free, no signup, coached on every hand.*

| Segment | Where they are | Message | Priority |
|---|---|---|---|
| Recreational blackjack players | r/blackjack, Wizard of Vegas forum, blackjack YouTube, search ("should I split 8s vs 10") | "Stop guessing on soft hands. 5 coached hands a day." | 1 |
| Video poker players | r/VideoPoker, vpFREE-style communities, search ("jacks or better hold two pair") | "Which cards to hold, graded instantly." | 1 |
| Casual card/puzzle players (Wordle crowd) | X, share grids, r/WebGames, r/incremental-ish puzzle subs | "Can you get 5/5 today?" | 2 |
| Indie/side-project crowd | r/SideProject, Show HN, directories | "An AI-crew-built trainer, free, offline PWA" | 2 (one-time spikes + backlinks) |
| Casino-trip planners | search ("how to play baccarat"), travel forums | "Learn the table in 5 hands before your trip" | 3 |

**Never:** promise winnings, link to casinos, target anyone under 21, or use "gambling" hooks that read as betting tips.

## 3. Traffic targets by channel (monthly unique visitors)

| Channel | Now | Dec | Feb | Apr | **Jun** | Runbook |
|---|---:|---:|---:|---:|---:|---|
| Reddit (helpful replies + monthly posts) | 19 | 200 | 500 | 900 | **1,500** | R1 |
| Search: guides (Google + Bing) | 6 | 50 | 300 | 800 | **1,500** | R4 |
| Daily Drill shares / challenge links | ~0 | 60 | 250 | 550 | **900** | R3 |
| Partners, embeds, forum signatures, backlinks | 0 | 30 | 200 | 450 | **700** | R7 |
| X (Wes daily, tagged) | 8 | 80 | 200 | 300 | **400** | R5 |
| Short video (probation) | ~18 | 80 | 150 | 250 | **400** | R6 |
| Launch spikes + directories residual | 0 | 250 | 300 | 350 | **300** | R2, R8 |
| Direct / returning-new | 174 | 50 | 600 | 900 | **300** | — |
| **Total** | **241** | **800** | **2,500** | **4,500** | **6,000** | |

"Direct" today is mostly untagged bio and in-app-browser traffic; as tagging improves it moves into the channel rows.

## 4. Outlay

**Cash: $0/month.** The current spending cap is $0 and this plan fits inside it.

| Item | Cost | Status |
|---|---:|---|
| Ko-fi (free plan) | $0 + 5% of Pro sales | existing account |
| Cloudflare Workers, KV, Analytics Engine | $0 (free tier covers this volume) | existing |
| PostHog | $0 (free tier) | existing |
| Metricool | $0 at current plan | existing |
| Domain playpokergym.com | ~$10–15/yr renewal | already paid |
| AI crew time | inside existing subscriptions (the cost we're trying to cover) | existing |
| **Wes's time** | **~20–30 min/week** posting crew-written copy from his own Reddit/HN/directory accounts + ~10 min once for Ko-fi setup | the one recurring owner action |

**Optional spend menu (each needs Wes's explicit approval; none is required to hit the plan):**

| Spend | When it makes sense | Cost |
|---|---|---|
| Ko-fi Gold | gross Pro sales > $240/month | $12/mo |
| Free email tool account (Buttondown/MailerLite free tier) | Phase 3 nurture, after Pro launch | $0, but a new account |
| Paid ads (Reddit/Meta) | **Not recommended.** A visitor is worth ~$0.13 at base conversion ($500 ÷ ~3,800 visitors); typical CPCs are several times that. Revisit only if measured value per visitor exceeds $0.50. | — |

## 5. Campaign runbooks

Every runbook follows the same rules: tagged links only (`?ref=<channel>&utm_content=<hook>`), copy is written by the crew and pasted by Wes where an account is needed, nothing published claims winnings, and every channel is judged weekly on **visitors → players → finishers → paying** from Wren's Monday scoreboard.

### R1 — Reddit: helpful first, link second
- **Goal:** 1,500 visitors/month by June, our highest-quality source.
- **Owner:** ChatGPT writes; Wes posts (5–10 min/week); Wren scores.
- **Cadence:** 3 helpful replies/week (per directive amendment -03), 1 link post/month per sub where allowed.
- **Steps:**
  1. Sunday: ChatGPT picks 3 live threads (URLs named) in r/blackjack, r/VideoPoker, r/baccarat, r/poker (hand-reading questions only), checks each sub's current link rules.
  2. Writes a genuinely useful answer that stands alone (the math, the rule, the exception). Link only where the sub allows it, as `playpokergym.com/?ref=reddit&utm_content=<sub>-<topic>`; otherwise no link, profile link only.
  3. Monthly link post: a free resource framed for that sub ("I made a free 5-hand soft-totals drill, would love feedback on whether the explanations make sense"), within the sub's self-promo rule.
  4. Wes posts at the scheduled time and replies to comments the same day (crew drafts replies on request in #41).
- **Success:** ≥ 30 visitors per link post, ≥ 40% of them deal a hand.
- **Kill/adjust:** a sub that removes posts or gives < 10 visitors on two link posts is dropped.

### R2 — Launch directories and Show HN
- **Goal:** one-time spikes (Show HN can do 500–5,000 visitors in a day) plus permanent backlinks for search.
- **Owner:** ChatGPT copy; Wes submits from his accounts; Claude watches the site during spikes.
- **Schedule (from the Nov 8 posting schedule):** AlternativeTo Wed Nov 11 · r/SideProject Mon Nov 16 · Uneed, Microlaunch, Fazier, TinyLaunch free queues Mon Nov 16 · **Show HN Wed Nov 18, 8 AM CT** · r/SideProject update "Pro is live" Wed Nov 25.
- **Steps for Show HN:** title "Show HN: Poker Gym – a free card-decision trainer that grades every hand"; first comment explains how grading works (engine EV, rules assumptions), that it's built by an AI agent crew, free, offline PWA, no signup; Wes answers comments for the first 2 hours; Claude checks Worker errors and PostHog live every 30 min that morning.
- **Success:** ≥ 1,000 visitors in launch week, ≥ 5 backlinks.
- **Kill:** none; these are one-shots. Repeat only on real news (Pro launch, new game).

### R3 — Daily Drill share loop (product-led growth)
- **Goal:** 900 visitors/month from players sharing results.
- **Owner:** Claude builds; Wren measures share → visit.
- **Steps:**
  1. Share text: grid + "Poker Gym #312 · 4/5" + `playpokergym.com/d?ref=share` (short link resolves to today's drill).
  2. "Challenge a friend" link carries the sharer's score: "Beat my 4/5" landing state.
  3. After a 5/5, prompt share once (dismissible). Track `share_click` and inbound `ref=share`.
  4. Track certificates (plan.md §3.1) add a second share moment.
- **Success:** share rate ≥ 10% of finishers; ≥ 0.3 new visitors per share.
- **Adjust:** if share rate < 5% after 3 weeks, test grid-only vs grid+leak text.

### R4 — Search: guides that play
- **Goal:** 1,500 visitors/month from Google + Bing by June. Search is slow (3–6 months) so it starts now.
- **Owner:** Claude (pages, technical SEO); ChatGPT drafts guide text; Wren reads Search Console.
- **Steps:**
  1. Confirm Google Search Console and Bing Webmaster Tools have the sitemap; request indexing of the 48 guides (Claude in Chrome with Wes's signed-in session).
  2. Each guide gets an **embedded 3-hand drill** of exactly that decision, so a searcher plays within 10 seconds (guide → player conversion is the point).
  3. Two new long-tail guides per week, each answering one real question people search: "split 8s vs dealer 10", "hold 4 to a flush or low pair jacks or better", "when does banker draw a third card", "is doubling soft 18 right". Pull questions from Reddit threads in R1 and Search Console queries.
  4. Internal links: every guide links to its game, its Pro pack preview and two related guides.
  5. Monthly: Wren lists the top 20 queries and pages; Claude rewrites titles of pages with impressions but CTR < 2%.
- **Success:** 100+ guide entries/month by Feb, 800 by Apr.
- **Kill:** none; adjust topics by query data.

### R5 — X (Wes, daily)
- **Goal:** 400 visitors/month; Wes already posts daily.
- **Owner:** Wes posts; Claude gives him the tagged link; Wren scores X as its own line.
- **Steps:** always link `playpokergym.com/x` (tags `ref=x`); post format that works for puzzles: a hand image + "Hit, stand or double?" + answer in reply with the link; repost the day's Daily Drill grid.
- **Success:** ≥ 15% of X visitors deal a hand.
- **Note:** X payouts aren't reachable (500 verified followers + 500k verified impressions in 90 days required). X is a traffic channel.

### R6 — Short video (on probation from Nov 13)
- **Goal:** 400 visitors/month or cut.
- **Owner:** Claude produces; content agreed by Claude, ChatGPT and Wren per Wes's rule; Metricool schedules.
- **Steps:** 3 posts/week; open on the decision in the first second (quiz hook test results decide the opener); end card + pinned comment with `?ref=youtube` / `?ref=reels`; one CTA only: "Try it: free, no signup."
- **Success:** tagged video visitors ≥ 50/week by Dec 31 with ≥ 30% dealing a hand.
- **Kill:** below that on Dec 31 → video drops to 1/week and its time moves to R4.

### R7 — Partners, embeds and backlinks
- **Goal:** 700 visitors/month and the backlinks that lift R4.
- **Owner:** Claude builds the embed and drafts outreach as Gmail drafts; Wes reviews and hits send (≤ 5 min/week); Claude sends follow-ups only with his approval.
- **Steps:**
  1. Build an embeddable **Daily Drill widget** (one `<script>`/iframe, "Powered by Poker Gym" link with `ref=embed`) for blackjack/video-poker blogs and forums.
  2. Monthly list of 10 targets: strategy bloggers, small blackjack/VP YouTubers, forum regulars, casino-trip planners. No casino operators or affiliates.
  3. Offer: free embed, plus a free lifetime Pro code for an honest review (disclosed as free).
  4. Email template (Gmail draft):
     > Subject: Free daily blackjack drill for your readers
     > Hi {name}, I run Poker Gym, a free trainer that grades each blackjack and video poker decision and explains why. No signup, no real money, no ads. Your post on {topic} is exactly the decision our {pack} drills. If it's useful, there's a free embed of the Daily Drill for your site, and I'm happy to send you a free lifetime Pro code to try. — Wes Pennock, Poker Gym · +1 (210) 441-1501 · playpokergym.com
- **Success:** 3 embeds or reviews live by Feb 28.
- **Kill:** < 1 positive reply per 20 emails after 40 sent → stop and put the time into R4.

### R8 — Gym Pro launch (Nov 24 – Dec 1)
- **Owner:** Claude runs; ChatGPT copy; Wes posts 2 items.
- **Steps:** Tue Nov 24 deploy + verify one real test purchase refunded · Wed Nov 25 r/SideProject update and X post ("Pro is live, the free trainer stays free") · Thu Nov 26 in-app: recap card and `/pro` go live for everyone · Sun Nov 29 first scoreboard with offer views → clicks → paid · founding counter visible on `/pro`.
- **Success:** first paying member by Nov 29; ≥ 5 by Dec 31.

### R9 — Holiday gift push (Dec 1–24)
- **Steps:** "Give Gym Pro" on `/pro` (lifetime as a gift code); X and Reddit posts framed around "a gift for the blackjack player in your life"; one guide: "Practice before your holiday Vegas trip."
- **Success:** ≥ 3 gift purchases.

### R10 — Retention and email (Phase 3, Jan 2027)
- **Steps:** opt-in "5 hands that cost players the most" mini course (needs a free email tool account, owner action); weekly "your leak this week" web push for opted-in players; every Pro release gets one push and one email.
- **Success:** D7 return ≥ 15%; Pro churn < 12%/month.

## 6. Owner actions (exact steps; Claude can do 1–4 in Wes's Chrome if he says so)

**One-time, ~10 minutes, around Sun Nov 22:**
1. Sign in at https://ko-fi.com → creator dashboard, left menu **Memberships** → **Add tier** → Name `Gym Pro`, price `$6` monthly, description from `/pro`, reward "Unlock code delivered automatically at playpokergym.com/web/?pro=restore". Save.
2. Left menu **Shop** → **Add item** → `Gym Pro Lifetime`, `$29`, digital, same reward text. Save.
3. Settings → **API / Webhooks** → Webhook URL `https://playpokergym.com/api/kofi` → Update. Copy the **Verification Token** shown there.
4. In a terminal in the repo: `npx wrangler secret put KOFI_TOKEN` (paste the token), then `npx wrangler secret put PRO_SIGNING_KEY` (paste the private key Claude generates and gives you once; it is never committed).

**Weekly, ~20–30 minutes:** paste and post the items in the Sunday pack (ChatGPT, on #51) at the listed times; reply to comments on launch days.

## 7. Weekly operating rhythm

| Day | Who | What |
|---|---|---|
| Sun | ChatGPT | Weekly pack on #51: 3 Reddit replies (threads named), any launch copy, 2 guide drafts |
| Mon | Wren | Scoreboard: visitors by channel → players → finishers → D1 return → offer views → checkout clicks → paid → net $; keep/cut call per channel |
| Mon | Claude | Reallocates effort per the scoreboard; ships one funnel or content change that week |
| Daily | Claude | Hold-time tripwire (video), Worker/payment health once Pro is live |
| 1st Mon monthly | Claude | Revenue vs milestone ($100 Feb · $250 Apr · $500 Jun); off by > 40% two months running → rewrite §3 allocation |

## Sources
- Channel and funnel numbers: PostHog project 670990, 30 days to 2026-11-08 (CREW-DIRECTIVE on #51).
- [X Original Content Rewards eligibility](https://opentweet.io/answers/what-replaced-x-creator-revenue-sharing)
- [Ko-fi webhook payload reference](https://apis.io/apis/ko-fi/ko-fi-webhook/)
