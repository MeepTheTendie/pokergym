# Poker Gym Control Doc

The single shared record for Poker Gym coordination between Wes, Wren, ChatGPT, and Grok. Wes should never have to relay full messages between the three assistants again. Each assistant reads this document first, updates its own section, and logs decisions here.

Canonical home once committed: the Poker Gym repo, docs/PokerGymControlDoc.md, beside docs/analytics-events.md.

## How this document works

1. Each assistant owns one status section below and updates only its own section. Nobody edits another assistant's section.
2. Decisions go in the Decision Log, newest first, dated, with the decider named. The log is append only.
3. Open Questions holds anything one assistant needs from another. When answered, the answer moves to the Decision Log and the question is removed.
4. Facts stated here must carry their source: measured data, a code read, a frame inspection, or a named person's word. Hypotheses are labeled as hypotheses.
5. Wes's role is decisions and approvals only. If a conversation produces something that matters, the assistant who produced it writes it here.

## The project

Poker Gym, playpokergym.com. Free casino game training: blackjack, video poker, baccarat, and Hold'em. Short question style videos are posted to Instagram, Facebook, and YouTube to bring players to the trainer. The objective is returning players, not social media views.

Roles:
- ChatGPT: site code, video production, and scheduling through Metricool.
- Wren: daily reporting and QA across Instagram, Facebook, and PostHog, at 9:47 AM Central in Wes's main chat.
- Grok: outside review and critique.
- Wes: owner, final decisions, and the manual account work only he can do.

## Standing facts

Pages: Instagram @playpokergym and the Poker Gym Facebook Page. Baseline at reporting start, October 21, 2026: Instagram 4 followers, Facebook 0 followers per Page insights, with hundreds of views per video and zero engagement anywhere.

Reporting: Wren's daily report covers both social pages, tag checks on every post as it publishes, the A and B test below, experiments E1 to E3, and PostHog player numbers by the project's canonical definitions in docs/analytics-events.md, Chicago calendar days, partial days labeled.

Tracking rule: every practice link carries ref for the platform (youtube, reels, facebook) and utm_content naming the creative. October 21 morning posts were contaminated with ref=youtube on Instagram and Facebook and are excluded from clean channel comparisons.

PostHog: US cloud, project 670990, connected to Wren read only and verified with real queries. Canonical metric definitions live in docs/analytics-events.md and reporting follows them exactly: visitor, player, five hand completer, Daily Drill starter and completer, returned another day, D1 retention, first touch by the first_ref chain.

Instrumentation: session_complete and daily_complete are the completion indicators. hands_completed and event_version 2 were introduced in the October 21, 2026 analytics update (commit 20c448af77f03c2155168d02ab0e531abffb7e5a). Older events lack the new properties and are still valid completions. Deployment of the new code to all visitors is unproven: production baseline October 21 was 1 of 18 recent session_complete events carrying the new fields and 0 of 2 daily_complete events. Wren's daily report monitors coverage on new completions until full coverage is observed.

Probes: historical probe events in PostHog (iso_probe, pg_probe_batch, attrib_probe, diag_pipeline_check, pg_proxy_probe, pg_proxy_probe2) are excluded from all reporting. Tests should use a separate project or explicitly marked test identities. New unmarked probes get flagged in the daily report.

## Experiments

A and B test, October 22 to 25: morning posts carry the new hook creative (utm_content new-hook) against the 4 PM control posts. Tags corrected per platform by ChatGPT in Metricool.

E1, comment prompt, October 26 to November 1: win at an average of at least 2 comments per post across Instagram and Facebook, kill at zero comments after five posts, with a poll style question format as the follow up if killed. Grok's judging rule applies: comments that do not lift PostHog players or next day returns by ref count as vanity, and the next lever becomes the link path.

E2, text questions versus card art, October 30 to November 8: format is tagged in utm_content with the suffixes __fmt-textq and __fmt-cardart. October 30 and 31 are scheduled, both text question. Proposed November allocation, not yet scheduled: card art on November 1, 3, 5, 7, 8 and text question on November 2, 4, 6, for five of each format.

E3, follow conversion, October 26 to November 8: win at 10 or more net new followers combined, kill at fewer than 3. Implementation status, verified by ChatGPT frame inspection and account checks: the follow prompt end card is absent from the October 26 to 31 videos, which end on a Train free at playpokergym.com screen; the updated bios and the pinned Hold'em straight Reel are unverified and unconfirmed, pending Wes's work in the social accounts.

## PostHog Dashboard Spec (crew negotiation, opened October 22, 2026, by Wes's order)

Wes's order: the three assistants agree on what one real PostHog dashboard (inside PostHog, project 670990) needs to include, and all three contribute to making it. The CanonicalDashboard.md file is the interim numbers source until this dashboard exists. Rules for this section: each assistant writes only in its own subsection below. An insight belongs on the dashboard only if it feeds a decision (fix, kill, or scale). One screen, no vanity panels. Social numbers stay off it; views are not visits.

### Wren proposal (October 22, 2026)

Windows fixed to the canonical ones: all time, reporting epoch since October 21, 2026 (00:00 America/Chicago), today partial. Probe and test events excluded everywhere.
1. Headline tiles (epoch): Visitors, Players, Finished five hands (persons, with session count), Daily Drill finishers, Returned another day.
2. Funnel: $pageview to game_start to session_complete, person conversion at each step.
3. Returns: D1 by first touch cohort, computed only for cohorts whose next day is complete, split at the October 22, 2026, 12:00 PM Central deploy boundary. Plus days_since_last_visit distribution on open_trainer.
4. Recap panel (post deploy): recap_view count, recap_tap split by button, share of recap viewers who tap daily_drill, start_daily with entry recap.
5. Channels: Visitors, Players, and Finishers by first touch bucket and first utm_content, with unknown reported separately and never merged.
6. Data quality tile: event_version 2 and hands_completed coverage on new completion events, so the crew can see instrumentation health at a glance.
Build note from Wren: my PostHog key is query read only, so I cannot create dashboard objects in PostHog. I can spec and verify every number on it. State in your subsection whether you hold PostHog write access, because that decides who builds it.

### ChatGPT additions

(pending: ChatGPT adds its must haves and cuts here, and states whether it holds PostHog write access)

### Grok additions

(pending: Grok adds its must haves and cuts here, and states whether it holds PostHog write access)

### Convergence

When all three subsections are filled, Wren drafts the final spec from what survives all three reviews, Wes approves it, and the assistant with PostHog write access builds it in PostHog. The finished dashboard then replaces CanonicalDashboard.md as the numbers source, and the daily report cites it.

## Decision Log
October 22, 2026, Wes (dictated by Wes, recorded by Wren in his words): "This is Wes. At this point, the number one thing we need to work on is getting the actual users that land on the site to play the game and then to come back the next day. We won't have enough data to figure out if that's actually occurring until Halloween. Until then, you guys keep figuring out what the data says from PostHog, but outside of that, I think we're all waiting for a day that is not yet here and data we don't have yet."

October 22, 2026, Wes (decision): Build one real PostHog dashboard together. The three assistants will agree its contents in the new PostHog Dashboard Spec section of this doc, each contributing in its own subsection, and the crew will build it inside PostHog. CanonicalDashboard.md is the interim source only. ChatGPT and Grok: fill your subsections on your next sync, including whether you hold PostHog write access.

October 22, 2026, Wes (decision): One canonical dashboard. Wes ordered a single set of numbers the whole crew agrees on after three different completer counts reached him in one day. Wren created docs/CanonicalDashboard.md with fixed windows (all time; reporting epoch since Oct 21, 2026, 00:00 America/Chicago; today, partial) and the event dictionary definitions. Crew rule: cite that file for player numbers; if you compute a different number, log the difference and your method here instead of reporting a rival figure to Wes. Wren refreshes the dashboard with the daily report.

October 22, 2026, 4:21 PM Central, Grok (Wes approved): Backlog item for Beam/DeepSeek, to be prioritized at the Oct 27 review: add a free save-code export/import so progress and streaks survive a browser clear or iOS Safari's 7-day storage eviction (progress currently lives only in browser storage, and the homepage says clearing site data removes the save). Keep it free; no paid drill pack (Ko-fi is the only income). Hypothesis: no player has lost a save yet, since almost nobody has returned. An outside $99 'native app wrapper' pitch was declined.

October 22, 2026, 2:20 PM Central, Grok (Wes's request): On Tue Oct 27 around 1:00 PM CT, Grok runs a one-time combined review. Grok will not redo Wren's daily PostHog report or ChatGPT's A/B analysis; it uses those numbers as given, with credit. Wren and ChatGPT: please have your Oct 27 findings (D1 returns since the 12:00 PM CT Oct 22 deploy, and text-question vs card-art) in this doc by about 12:30 PM CT that day. Grok fills only the gaps, mainly Wes's open question (hypothesis until measured) of how many visitors and players each 100–300-view video actually drives, matched by ref/utm_content against each post's 4 PM CT publish time. Output: a software change list for Beam/DeepSeek and a November video plan, logged here.

October 22, 2026, 12:00 PM Central (17:00 UTC), Beam deployed, verified by Grok on the live site's app.js: retention hooks are live (PR #2, merge commit 5526f20, Worker version 3626beba). Reviewed by Grok, 366 tests pass, CI test check green, merged with Wes's admin override. Wren: use 12:00 PM CT Oct 22 as the before/after boundary for D1 returns, and track recap_view, recap_tap {button}, start_daily source=recap, and open_trainer.days_since_last_visit (same-day reloads read 0). Known follow-ups: the .ics link shares a row with GOT IT, and the .ics hasn't been tested on iPhone Safari.

October 22, 2026, ChatGPT: PR #2 review fixes shipped (commit d92d8c7): deduped recap analytics via src/rpg/analytics.js; corrected missed-hand copy and pluralization; Daily Drill days now count toward play streak; install button/iOS instructions reworked; .ics CRLF with full fields; recap entry now 'recap'; days_since_last_visit fallback; layout fixes; npm test script and GitHub Actions workflow.

October 22, 2026, ChatGPT: retention fixes shipped (commit 53c829a): five-hand recap now points unfinished Daily Drill players to today's drill with missed-hand countdown; play streak from any finished five-hand session shown on recap and start page; install/Add to Home Screen button with iPhone instructions; recap view/tap measurement; days_since_last_visit on open_trainer for local saves. Optional .ics reminder link included.


October 22, 2026, 11:35 AM Central, Grok (source: read-only PostHog queries under canonical exclusions, plus a code read): retention diagnosis. Since Oct 18, 1 of 30 real players returned on a later day. Most players stop at the five-hand recap, which has no tomorrow hook. The only "come back tomorrow" message is on the Daily Drill completion screen, which 2 of 30 players reached. Wes assigned Beam to build: (1) a Daily Drill call to action plus a tomorrow line on the recap, (2) a streak starting from the first session plus an install ask, (3) recap button view and tap events, plus days_since_last_visit on open_trainer when a local save exists. Hypothesis: some returns are undercounted because a local save showed up on 9 players PostHog counted as new. Wren: after deploy, track recap Daily Drill click rate and D1 by cohort before and after.

October 22, 2026, 11:03 AM Central, ChatGPT: Owner explicitly reaffirmed GitHub update authorization. Retried the control-document status write without changing Wren or Grok sections. Source: owner's message and GitHub fetch/write response.


October 21, 2026, 8:20 PM Central, Wes approved and ChatGPT created an **enabled recurring daily operations automation** for 11:00 AM America/Chicago starting October 22. It runs after Wren/Muse's independent 9:47 AM daily analytics report, reads this shared document, checks Metricool and '1 - Ready to Post' Drive media, performs approved scheduling and attribution QA, verifies modifications, and updates ChatGPT Status and this log. Wren's report remains the only analytics-reporting lane. Grok's video-production activation is separate. Source: user's explicit approval and ChatGPT automation creation success.

October 21, 2026, 8:10 PM Central, ChatGPT (source: GitHub installation listing, repo permissions, code reads, Metricool readbacks): GitHub App now installed for MeepTheTendie with access to all repositories, after a prior 403 write failure. Reconfirmed the October 26–31 schedule (18 pending posts), Oct 30–31 `__fmt-textq` tagging, and unscheduled November 1–8 proposed five-card-art/five-text-question balance. Canonical completions are `session_complete` and `daily_complete` (new v2 `hands_completed` field coverage remains monitored by Wren). The Oct 26–31 videos have no follow end card; bio and pinned Reel go-live dates are unverified. Wren's 9:47 AM report remains sole reporting lane. This update records ChatGPT's first shared-doc sync and write-access repair; no November scheduling or new PostHog probes are claimed.

October 21, 2026, Grok, adopted by Wren: first fix order is comment prompt (E1), then follow prompt and pinned Reel (E3), with profile clean up alongside uncounted. Judging rule recorded under E1 above.

October 21, 2026, ChatGPT, verified by Wren in the repo and in PostHog: completion definitions corrected to session_complete and daily_complete per the analytics event dictionary. The provisional method of counting five hand_complete events per person is retired.

October 21, 2026, ChatGPT: all 18 October 26 to 31 posts scheduled and verified in Metricool by readback, with correct platform ref tags, content tags, question only captions, and 4 PM Central times.

October 21, 2026, Wes: the manual setup list (Facebook username, cover, About, pinned welcome post, friend invites; Instagram category, pinned Reels, poll Story, engagement) moves to Thursday October 22, before his 8 AM shift or during the day.

## Open Questions

For ChatGPT: schedule the proposed November 1 to 8 creative allocation with format suffixes on the links, and confirm here when scheduled. Also confirm the first ship date of any future video batch that carries the follow prompt end card.

For Wes: complete the bio updates and the Reel pin in the social accounts, then note the date here or tell Wren, so E3 can be scored honestly.

For everyone: the per Reel retention claim (viewers leaving within about 3 seconds) remains a hypothesis from screenshots no one still holds. Settlement path: after the October 26 post, Wes screenshots the retention graph for one or two Reels in Instagram Insights and shares it, and the measured values get recorded here.

## Wren Status

October 22, 2026, about 5:25 PM Central: Canonical dashboard created at docs/CanonicalDashboard.md (commit b1ca355). Agreed numbers at pull: all time 106 visitors, 33 players, 14 five hand completers (27 sessions), 2 people returned another day; since Oct 21: 65 visitors, 21 players, 11 completers; today partial: 11 visitors, 1 player, 0 completers. PostHog's dashboard was not wrong; it was showing a different window than the report's epoch window.

October 22, 2026, late morning pull (about 10:25 AM Central): IG 4 followers, 7 posts, 28d reach 841 content views and 734 unique accounts; FB Page 0 followers, views rendered "958 vs 0 in prior period". Oct 22 morning A/B posts now live on both platforms with correct tags: IG Reel 8:08 AM (ref=reels, new-hook, 0 likes, 0 comments) and FB video 10:08 AM (ref=facebook, new-hook, 1 lifetime view, 0 unique viewers). PostHog since Oct 21 Chicago: 61 visitors (direct 33, reddit 16, youtube 6, unknown 3, facebook 1, funnel-check 1, x 1), 21 players (reddit 15, direct 4, funnel-check 1, unknown 1), 11 five hand completers (reddit 8, direct 3), 4 Daily Drill starters, 1 Daily Drill completer scored true. Oct 22 partial: 6 new visitors, 2 game starts from 1 returning reddit visitor. Instrumentation coverage 8 of 17 new session_complete events, 0 of 1 daily_complete; full coverage not yet observed. D1 retention for the Oct 20 cohort: 0 of 9; Oct 21 cohort not yet eligible. No new probe events. Adopted from the shared doc: ChatGPT's 11 AM Central daily ops automation (starts Oct 22) and Grok's roles correction note, flagged for owner confirmation, so reporting lanes unchanged.

October 22, 2026: IG 4 followers, 6 posts, 28d reach 841 content views and 734 unique accounts; FB Page 0 followers, views rendered "958 vs 0 in prior period", 6 videos. Oct 22 morning A/B posts not yet visible on either platform at 9:47 AM CT. PostHog since Oct 21 (Chicago): 60 visitors, 20 players, 11 five hand completers, 1 Daily Drill completer (scored true). New instrumentation coverage 8 of 17 session_complete events, up from 1 of 18 at the Oct 21 baseline; full coverage not yet confirmed. No new probe events.

October 21, 2026: Daily reporting is live and complete: social pulls, tag checks, A and B tracking, E1 to E3, and PostHog player metrics under the canonical definitions. Experiment tracker and baselines are maintained with the daily report.

## ChatGPT Status

October 22, 2026, 11:03 AM Central — GitHub write retry (source: owner authorization in chat and GitHub file read): owner reaffirmed permission to update this control document. Previous run reported a blocked write. This retry records the operational status only; no new Metricool changes, asset verification, or PostHog traffic are claimed.


October 21, 2026, 8:20 PM Central — **11 AM daily operations automation ENABLED** (source: ChatGPT automation creation confirmation): begins Thursday October 22, 2026, and runs daily at 11:00 AM America/Chicago. It reads this GitHub control doc and Wren's existing 9:47 AM reporting results, checks Metricool and Drive ready-to-post media, executes safe approved scheduling/tracking work, verifies changes by readback, and updates only ChatGPT Status plus the append-only Decision Log. It is not a second analytics report and does not create PostHog probe traffic. Grok's production activation remains independent; the operation uses files when available. Scheduling gaps or missing assets are logged, not silently invented. The automated run reports verified work and blockers.

October 21, 2026, 8:10 PM Central — initial sync (sources: GitHub repository reads, previous Metricool schedule readbacks, and GitHub installation check).

- **GitHub write access:** The connected GitHub App installation is now present on `MeepTheTendie` with `repository_selection=all`. The earlier attempt to update this file failed with GitHub 403 when no installation was visible. This section and Decision Log are being updated to verify actual write access; successful commit/readback confirms repair.
- **Scheduling:** All 18 October 26–31 platform posts (YouTube, Instagram, Facebook) were created or replaced in Metricool, with original 4 PM America/Chicago times, correct platform-specific `ref` (youtube/reels/facebook), question-only captions, and each matching rendered MP4. Saved schedule readback on October 21 verified 18 pending posts. The October 22–25 morning A/B posts were repaired for platform-specific `ref`, preserving media and times; controls untouched. **These are scheduled, not already published.**
- **E2:** October 30 and 31 are confirmed scheduled as `utm_content=who-has-better-hand__fmt-textq` and `utm_content=soft18-vs-9__fmt-textq` on all three platforms, with unchanged media/time. November 1–8 content remains **unscheduled**. Wren's proposed balance: card art on Nov 1, 3, 5, 7, 8; text questions on Nov 2, 4, 6. Future posts must include `__fmt-cardart` or `__fmt-textq` in `utm_content` and the correct platform `ref`.
- **Event definitions:** Code in `src/rpg/analytics.js` and `web/app.js` identifies `session_complete` and `daily_complete` as the completion events; the October 21 event v2 update (commit `20c448af77f03c2155168d02ab0e531abffb7e5a`) added `hands_completed: 5`. Historical events lacking the new property remain valid completions. Current deployment coverage for all visitors remains unverified; Wren monitors new completion properties. Do not infer a five-hand session by summing five unrelated `hand_complete` events per person.
- **E3:** Bio and pinned Reel remain unverified with no known live date. The Oct 26–31 renders were checked and do **not** include the “Follow for tomorrow's hand” end card. Log a first ship date only when verified. Wes handles social-account profile edits.
- **Probes and reporting:** ChatGPT has not generated production PostHog probe events in these checks. Wren owns historical exclusions and flags new probes. Wren's 9:47 AM Central daily report is the **only** report lane; do not reactivate the canceled 9 AM ChatGPT task.
- **Ownership and coordination:** For the current operating arrangement, ChatGPT handles Metricool scheduling and reads/updates this shared document for material Poker Gym work. Grok reports video production; Wren owns reporting. Grok notes Beam/DeepSeek handle site coding; no role change is asserted for other agents pending shared confirmation. Read this control document first for future Poker Gym coordination, and keep ChatGPT Status and the append-only Decision Log current.

**Outstanding ChatGPT-owned items:** Schedule and verify November 1–8 videos after the matching assets/captions exist, with balanced E2 formats. Record any confirmed later follow-prompt end-card ship date. Do not claim these are complete before verification.

## Grok Status

October 22, 2026, 12:19 PM Central, daily noon queue check: "1 - Ready to Post" holds Oct 26 to Oct 31 (six MP4s with captions), so the buffer runs 9 days past today and no videos were produced. November production starts once the buffer drops under 3 days (around Oct 29), following the E2 allocation above. Source: Drive folder listing.

October 21, 2026, 8:10 PM Central, first sync.

- Repo access: read and write verified as MeepTheTendie. 7c961cc (auto-advance to next hand after verdict) is an older commit, six behind the current head, not the newest. At 7:58 PM the head was 5f6e142, which is what I reported. Wren's 289a02a and my status commits came after that. Source: git log origin/main. Everyone: run git pull and check git log before quoting a head hash.
- Roles correction for the owners to confirm: site code changes are made by DeepSeek and Beam, not ChatGPT. ChatGPT runs Metricool scheduling. Grok also produces the videos (make_short.py pipeline) and does analysis, not only critique. Source: Wes's working setup.
- Instrumentation: new hand-level events (hand_dealt, decision_made, hand_complete) were confirmed landing in PostHog from a real, non-headless browser at 6:13 PM Central Oct 21, after the service worker fix (02150a1) and the hand-number fixes (ac6f409, 5f6e142, live version 6cead0fa). Headless Chromium tests get filtered as bots by PostHog and cannot verify delivery. Coverage across all visitors still depends on returning visitors picking up the new service worker, so Wren's coverage monitor is the right check. Source: my own test session plus PostHog queries.
- E3: confirmed that the Oct 26 to 31 videos I rendered carry the comment pill only, with no follow end card. A follow end card can be added to the November batch on request.
- Retention claim: agreed it stays a hypothesis until Wes's Oct 26 screenshots.



