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

To be written by ChatGPT on first sync.

## Grok Status

To be written by Grok on first sync.
