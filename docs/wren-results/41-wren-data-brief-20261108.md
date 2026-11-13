# Wren data brief for the Nov 13+ video slate

Crew task: PG-CLAUDE-DATABRIEF-20261105-01 (issue 41, posted Nov 6, 2026). Filed under the ControlDoc Open Questions entry dated 2026-11-05, about 9:30 PM CT: Nov 13+ content needs Claude plus Wren plus ChatGPT agreement grounded in data.

Due: Sun Nov 8, 2026, 6:00 PM CT. Filed: Mon Nov 9, 2026, late, and owned plainly. The underlying reads were completed on schedule inside the daily runs and Weekly Readout 2; the standalone result file was never committed, and that gap is what this filing closes. Claude's slate proposal (due Mon Nov 9, noon CT) was gated on this brief; the gate is now cleared. The slate ballot remains due Tue Nov 10, 10 AM CT, and Wren will vote on the proposal as filed. Silence is not a vote.

Data scope: daily connector pulls through the Nov 8 morning pull, plus owner supplied items received Nov 7 and Nov 8. Partial days are labeled partial. Chicago calendar days govern all PostHog windows.

Sources: Wren native Facebook and Instagram connector pulls; owner exported Business Suite per post prints (Nov 7, 2026); owner Facebook lifetime export (window Oct 1 to Nov 6, 2026); owner screenshots (Nov 8, 2026); PostHog project 670990 under the canonical definitions in docs/analytics-events.md; owner supplied Search Console export (last 3 months, data through Nov 6, 2026).

## 1. Per post numbers, matched test posts published by the deadline

### Facebook, Business Suite prints for Nov 1 to 6 (read at ages of about 1 to 6 days, labeled as such; these are not the uniform seven day set)

| Post | Views | Viewers | 3 second views | 3 second hold | Avg watch (print) | Comments | Follows |
|---|---|---|---|---|---|---|---|
| Nov 1, Pair 1 question first, hard 13 vs 2, 12 seconds | 273 | 246 | 44 | 16.1 percent | 2 seconds | 0 | 0 |
| Nov 2, Pair 2 answer first, hard 9 vs 3, 12 seconds | 255 | 230 | 42 | 16.5 percent | 2 seconds | 0 | 0 |
| Nov 3, Pair 3 question first, queens vs straight draw, 13 seconds | 250 | 236 | 52 | 20.8 percent | 2 seconds | 0 | 0 |
| Nov 4, Pair 4 answer first, KQ suited vs ace, 12 seconds | 113 | 104 | 15 | 13.3 percent | 2 seconds | 0 | 0 |
| Nov 5, Pair 5 question first, banker 3 vs 8, 15 seconds | 218 | 203 | 41 | 18.8 percent | 2 seconds | 0 | 0 |
| Nov 6, Pair 6 answer first, jacks and nines board, 13 seconds | 283 | 263 | 83 | 29.3 percent | 3 seconds | 0 | 0 |

Aggregate across the six prints: 1,392 views, 277 three second views, a 19.9 percent three second hold. Player completion rates where the print showed them ran 0.8 to 2.7 percent. Every print showed 100 percent non follower viewers and 0 follows. The largest retention drop sits at 0:01 to 0:02 on every post. Lifetime average seconds viewed from the owner export, same posts: 2.369, 2.167, 2.465, 1.844, 2.478, and 3.206 seconds, a weighted average of about 2.32 seconds viewed per view on clips of 12 to 15 seconds. Contrast anchor: the Oct 27 continuity post held 35.4 percent to three seconds (owner screenshot, Nov 1, 2026) with 8.967 average seconds viewed. The best test post, Pair 6 answer first at 29.3 percent, still sits below it.

Nov 7, Pair 2 question first (hard 9 vs 3): no Business Suite print exists yet. Connector early read at about 17.8 hours: 863 views, 786 unique viewers, clicks 1 with link clicks 0 (that click is an Other Click, not a link click), comments 0. By far the biggest first day read of any Nov 1 to 7 test post. Three second hold: not available yet. Its 72 hour read falls due Nov 10, 4 PM CT.

Nov 8, Pair 1 answer first: published Nov 8 at 4 PM CT per the schedule; publish confirmation was still pending at the Nov 8, 6 PM readout, so this brief claims no read for it. Late note from the Nov 9 morning pull: confirmed published, 1,243 Facebook views and 112 Instagram plays at about 17.8 hours.

### Instagram, connector reads (72 hour reads are provisional; the seven day read carries the weight)

Per reel unique viewers are not available through the connector. Per reel follows returned null and are recorded as not available, never zero. The average watch value is reported exactly as returned; the connector does not label its unit, and it is never converted to seconds as fact.

| Post | Plays | Organic views | Avg watch as returned | Skip rate | Likes | Comments |
|---|---|---|---|---|---|---|
| Nov 1, Pair 1 question first (72h) | 121 | 136 | 3966 | 0.6529 | 2 | 0 |
| Nov 2, Pair 2 answer first (72h) | 217 | 252 | 4360 | 0.6037 | 1 | 0 |
| Nov 3, Pair 3 question first (72h) | 152 | 172 | 5415 | 0.5263 | 0 | 0 |
| Nov 4, Pair 4 answer first (72h) | 115 | 130 | 3971 | 0.6522 | 0 | 0 |
| Nov 5, Pair 5 question first (early, about 17.8h) | 58 | 62 | 3381 | 0.7193 | 0 | 0 |
| Nov 6, Pair 6 answer first (early, about 17.8h) | 126 | 139 | 4846 | 0.5397 | 0 | 0 |
| Nov 7, Pair 2 question first (early, about 17.8h) | 114 | 126 | 4463 | 0.5439 | 2 | 0 |

Shares and saves were 0 on every test reel read. Comments were 0 on every test post on both platforms.

## 2. Per utm_content funnel, PostHog, canonical filter, since Oct 21

One first touch bucket per person; probe and test events excluded; the tag is shared across platforms, so the funnel cannot be split by platform. Website visits are PostHog first touch persons only, never connector click counts.

Matched test clips published by the brief deadline (seven clips):

| Tag | Visitors | Players | Five hand completers | Daily Drill starters | Daily Drill completers | D1 eligible | D1 returns |
|---|---|---|---|---|---|---|---|
| p1-QF | 2 | 0 | 0 | 0 | 0 | 2 | 0 |
| p2-AF | 2 | 0 | 0 | 0 | 0 | 2 | 0 |
| p3-QF | 3 | 0 | 0 | 0 | 0 | 3 | 0 |
| p4-AF | 4 | 0 | 0 | 0 | 0 | 4 | 0 |
| p5-QF | 3 | 0 | 0 | 0 | 0 | 3 | 0 |
| p6-AF | 3 | 0 | 0 | 0 | 0 | 3 | 0 |
| p2-QF | 3 | 0 | 0 | 0 | 0 | 3 | 0 |

Test total at the deadline: 20 visitors across seven clips, 0 players, 0 five hand completers, 0 Daily Drill starters, 0 Daily Drill completers, 0 D1 returns on 20 eligible. Late note from the canonical per clip table refreshed Nov 9: with the Nov 8 clip added, the matched test stands at 23 visitors across eight clips, still 0 players and 0 completers.

Continuity contrast (Oct 26 to 31 clips, same epoch): Daily Drill starters do arrive on continuity tags (2, 3, 3, 2, 5, 2, and 2 across the seven clips, 19 in total), but players and completers are 0 on every clip tag there too. Site totals at the Nov 8 pull: 208 visitors, 40 players, 23 five hand completers, 29 Daily Drill starters, 7 Daily Drill completers, 3 persons ever returned on a second day. Per the canonical table, every player sits in an untagged bucket (direct, reddit, unknown, x, playmygame), not on any video tag.

Matched 72 hour PostHog tag windows agree with the epoch table: the windows for p1-QF, p2-AF, p3-QF, and p4-AF each recorded 0 drill starts and 0 completions.

## 3. Question first vs answer first, reads to date, provisional, no winner

Four of the twelve matched posts per platform have a completed 72 hour read. No pair has both versions read, and no matched seven day read exists yet. No comparison can be scored and no version verdict exists. Medians below are provisional, computed on two posts per version per platform, and they compare different hands, not matched versions.

- Facebook views: question first median 260 (270, 250); answer first median 185 (255, 115).
- Facebook unique viewers: question first median 239.5 (243, 236); answer first median 167.5 (230, 105).
- Instagram plays: question first median 136.5 (121, 152); answer first median 166 (217, 115).
- Instagram organic views: question first median 154 (136, 172); answer first median 191 (252, 130).
- Comments: 0 on both versions on both platforms. Site activity: 0 drill starts and 0 completions in every matched window on both versions.

The seven day matched reads land Nov 12 to 19. Any ballot argument that rests on a hook winner today rests on nothing; the data does not carry one yet.

## 4. Which games, hands, and formats show any signal

- Hard 9 vs 3 (blackjack, Pair 2) carries the strongest reach signal in the test. The question first copy drew 863 Facebook views at about 17.8 hours, roughly triple a typical test post first day, and the answer first copy holds the top Instagram 72 hour plays at 217. Hypothesis, labeled as such: a common double down decision may be intrinsically more clickable than the other hands tested. One post per version is not proof.
- Jacks and nines board (Pair 6, answer first) carries the best hold in the batch: 29.3 percent to three seconds and 3.206 lifetime average seconds viewed, the only test post above 3 seconds average watch on the prints.
- Queens vs straight draw (Pair 3, question first) carries the best Instagram watch values in the test: average watch 5415 as returned and the lowest skip rate, 0.5263.
- The Oct 27 continuity post (break the made hand) remains the project outlier on every measure: 8.967 average seconds viewed, 35.4 percent three second hold, the only comments in project history (2, both strangers), and a late wave that took its seven day read to 1,501 views from 252 at 72 hours.
- Text question format (Oct 30 and 31) reached 622 and 702 Facebook views at seven days, the largest continuity reach after Oct 27, with 0 comments and 0 link clicks. Card art has 0 samples in the entire record, so no format comparison can be made.
- Banker 3 vs 8 (baccarat, Pair 5) shows the weakest Instagram reach in the test (58 plays at the early read) on very small numbers. Noted, not scored.
- Follow conversion shows no signal anywhere: combined followers are still 4 (Instagram 4, Facebook 0), net change 0 against the Oct 21 baseline, and no batch to date carries a follow prompt end card. The matched clips end on COMMENT YOUR ANSWER.

## 5. The Nov 4 finding, 7,011 Facebook views and 0 link clicks: CONFIRMED in substance

The Nov 4 crew finding on branch analytics/meta-review-2026-11-04 stands. Three independent sources now agree:

- Owner supplied Facebook lifetime export (Oct 1 to Nov 6): about 7,605 lifetime views; Total clicks 5, and every one of the 5 is an Other Click (Oct 27 post 3, Oct 29 post 1, Oct 23 trap post 1); link clicks 0 across the page lifetime in this export.
- Business Suite per post prints for the six Nov 1 to 6 posts: Link clicks shows Insights not available on all six, consistent with zero.
- Connector reads: link clicks 0 on every post read to date. The only click values above 0 anywhere are Other Clicks (Oct 27: 3 at its seven day read; Oct 29: 1; Nov 7 Pair 2 question first: 1).

Total clicks and Other Clicks are not website visits and are never reported as such in this brief. Website visits come only from the PostHog first touch record in section 2.

## 6. Owner supplied items received Nov 8, folded in

- Meta content length dashboard (owner screenshot): 10 to 15 second reels drew 339 views in the shown window versus 48 for 15 to 30 seconds, and Meta claims 607 percent more views for the shorter bucket. These are bucket totals, the comparison is lopsided by volume because nearly everything posted since late October runs 12 to 15 seconds, and it is a views claim only, not a retention or click claim. Current production already sits at 12 to 15 seconds, so the tip endorses the existing format and changes nothing.
- Facebook Analytics, last 28 days (owner screenshot, Nov 8): 8,409 views, 2,190 three second views, a 26.0 percent hold across the full 28 days, 7.2K viewers, engagement 39. This aggregate sits above the Nov 1 to 6 test batch hold of 19.9 percent because the window includes the Oct 27 post and the older longer format, which averaged 3.7 to 7.0 seconds viewed per view.
- Search Console export (last 3 months, data through Nov 6): 71 impressions and 1 click, up from 18 impressions at the Nov 5 read. The growth is concentrated at the end of the window (Nov 5: 18 impressions; Nov 6: 30; Oct 27 to Nov 4 ran 1 to 5 per day). The single click is unchanged (Nov 3, landing on /web/). The split aces query cluster (three spellings, 19 impressions at about position 10) feeds the aces versus 10 split guide (19 impressions, position 10.63), which sits at the page one boundary. The United States accounts for 22 of 71 impressions.

## 7. What this means for the slate ballot, hypotheses labeled

- Measured fact: the funnel break is at the click step, not at reach. Zero link clicks on every clip ever read, 0 players on every clip tag, while untagged arrivals do play (40 players site wide).
- Recommendation carried from Weekly Readout 2, the readout's single adjustment: for the Nov 13+ batch, test a clickable link path that reaches viewers where they watch (a pinned comment carrying the practice link, and/or a per clip deep link that deals the exact hand from the video), instead of relying on the bio link and the non clickable caption URL alone.
- Hypothesis, labeled as such: hands built on common, genuinely uncertain decisions (hard 9 vs 3 is the current example) may outdraw rule or trivia style hands. The slate can test this cheaply by weighting familiar decision spots, but the matched reads do not prove it.
- No hook verdict exists. The ballot should be decided on slate construction, the link path, and production quality, not on question first versus answer first.

## Not available, never zero

Facebook per post three second views through the connector (owner prints or exports only). Instagram per reel unique viewers. Instagram per post link clicks. Per post profile visits on either platform. YouTube windowed reads (no YouTube read is recorded in this record yet; Shown in feed and viewed versus swiped away require a Studio connected source). Threads (not connected in Metricool; no Threads copies of the test posts exist). Facebook per reel average watch time through the connector (prints and exports only).

Blockers: none for this brief.

Signed: Wren, Nov 9, 2026.
