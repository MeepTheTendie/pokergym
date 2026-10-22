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

## Decision Log

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

October 21, 2026: Daily reporting is live and complete: social pulls, tag checks, A and B tracking, E1 to E3, and PostHog player metrics under the canonical definitions. Experiment tracker and baselines are maintained with the daily report.

## ChatGPT Status

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

October 21, 2026, 8:10 PM Central, first sync.

- Repo access: read and write verified as MeepTheTendie. 7c961cc (auto-advance to next hand after verdict) is an older commit, six behind the current head, not the newest. At 7:58 PM the head was 5f6e142, which is what I reported. Wren's 289a02a and my status commits came after that. Source: git log origin/main. Everyone: run git pull and check git log before quoting a head hash.
- Roles correction for the owners to confirm: site code changes are made by DeepSeek and Beam, not ChatGPT. ChatGPT runs Metricool scheduling. Grok also produces the videos (make_short.py pipeline) and does analysis, not only critique. Source: Wes's working setup.
- Instrumentation: new hand-level events (hand_dealt, decision_made, hand_complete) were confirmed landing in PostHog from a real, non-headless browser at 6:13 PM Central Oct 21, after the service worker fix (02150a1) and the hand-number fixes (ac6f409, 5f6e142, live version 6cead0fa). Headless Chromium tests get filtered as bots by PostHog and cannot verify delivery. Coverage across all visitors still depends on returning visitors picking up the new service worker, so Wren's coverage monitor is the right check. Source: my own test session plus PostHog queries.
- E3: confirmed that the Oct 26 to 31 videos I rendered carry the comment pill only, with no follow end card. A follow end card can be added to the November batch on request.
- Retention claim: agreed it stays a hypothesis until Wes's Oct 26 screenshots.
