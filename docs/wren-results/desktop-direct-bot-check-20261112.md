# Desktop direct bot check: mixed segment, do not exclude as a whole

Filed: 2026-11-12, by Wren/Muse. Source: Nov 10 playtest doc (docs/playtest/2026-11-10.md, Data going in) plus Wes's own-words task in chat, 2026-11-12 ~1:27 PM CT: do the desktop direct bot check from the Nov 10 playtest if still open. No prior result file for this check exists on main or on wren/staged-updates (directory listing checked 2026-11-12); it was still open.
Scope: read-only PostHog HogQL, project 670990, query:read key only. No events changed, no filter changed, no Replay video watched (see Limits).

## Question

Playtest (last 30 days, raw, not bot-filtered): desktop open_trainer 137, mobile 52. Referred desktop visits deal a hand about 60% of the time. Direct Windows Chrome/Edge/Firefox: 82 people, 9 dealt. The playtest asked Wren to check a sample of those sessions before anyone redesigns the home screen around them.

## Window and reproduction

Window used here: Oct 11, 2026 00:00 CT through Nov 11, 2026 00:00 CT, as explicit UTC bounds (toDateTime 2026-10-11 05:00:00 UTC to toDateTime 2026-11-11 06:00:00 UTC, handling the Nov 1 DST change), matching the playtest 30-day span as calendar days. All counts below are raw (no notTestClause filter), matching the playtest basis, unless stated otherwise.

Segment definition, applied to open_trainer events in the window: device Desktop, OS Windows, browser Chrome / Microsoft Edge / Firefox, referring domain $direct.

Reproduction: 83 persons, 84 open_trainer events. Playtest said 82 people. The one-person difference is a window-boundary difference (playtest "last 30 days" from its Nov 10 run time vs calendar days here) and is immaterial: the hand_dealt count reproduces exactly at 9 persons (see below).

## Funnel in the segment (raw, same window, persons)

- open_trainer: 83 persons, 84 events
- $pageview: 81 persons, 92 events (2 segment persons have no $pageview in the window; see Notes)
- start_training: 12 persons, 12 events
- hand_dealt: 9 persons, 113 events
- game_start: 8 persons, 26 events
- start_daily: 7 persons, 7 events
- cta_click: 9 persons, 10 events
- decision_made: 1 person, 92 events
- hand_complete: 2 persons, 105 events
- session_complete: 1 person, 18 events
- daily_complete: 1 person, 1 event
- recap_view: 1 person, 19 events
- $autocapture: 27 persons, 300 events
- $pageleave: 19 persons, 24 events

Per-person totals: minimum 2 events, median 5 events, maximum 678 events. 18 persons have 3 or fewer total events in the window. 74 of 83 persons never reached hand_dealt.

## Referred desktop comparison (same window, raw)

Desktop open_trainer with a non-direct, non-empty referring domain: 38 persons, 46 events. Of those: start_training 23 persons (about 61%), hand_dealt 17 persons (about 45%), game_start 14 persons, decision_made 8 persons (about 21%).

The direct segment deals far less often than referred desktop on every downstream step. The gap is real in the raw data. What it means depends on who the direct persons are (see Verdict); it does not by itself prove the home screen is broken for humans.

## The heavy player: one real, engaged session

One person (id prefix 17011eb6) accounts for 678 events in a single session: Oct 26, 2026, 21:16:49 to 21:39:57 CT (23 minutes). In that session: 105 hand_dealt, 104 hand_complete, 92 decision_made, 20 time_to_first_decision, 19 game_start, 18 session_complete, 19 recap_view, 18 recap_tap, 270 $autocapture, 1 open_trainer, 2 $pageview. Fingerprint on the open: Chrome 152, Windows, Desktop, $direct, screen 1280x720, viewport 1280x585, entry daily_link, URL bare /web/.

First-decision times (20 values, ms): 9979, 4186, 4, 6234, 7411, 5493, 6746, 4114, 3106, 2917, 4090, 3055, 3500, 5250, 5815, 4, 4, 3124, 11739, 9516. Seventeen values fall in a human-plausible 2.9 to 11.7 second range with varied timing; three values read 4 ms (implausibly fast for reading a fresh hand, consistent with a carried-over tap, resumed run, or auto-advance artifact; mechanism unverified). The overall pattern is engaged human-like play with varied pacing, not a fixed-delay loop.

No identity is claimed for this person. The point is narrow and important: the segment contains at least one unambiguously engaged player. Any filter that drops the whole segment would drop real play. This person must not be excluded.

## The rest: clustered, low-interaction bulk

Excluding the heavy player, the remaining 82 persons share 456 events in the window across all event types in the person-level pull, with almost no downstream play: 8 persons with exactly 1 hand_dealt each and no decision_made, 1 of whom also has 1 hand_complete and 1 time_to_first_decision with no decision_made event (mechanism unverified; a single hand; immaterial to the verdict), and 74 persons with no hand_dealt at all.

Timing cluster: 47 of 84 open_trainer events fall in the 16:00 CT hour; 42 fall at 16:01-16:03 CT (16:01: 10, 16:02: 32, 16:03: 3). Posts publish at 16:00 CT. A 3-minute post-publish cluster covering half the segment is the signature of traffic triggered by posting (link fetch / preview / scheduler-side load), not of humans arriving independently through the day. Timing alone does not prove automation for any single person, but the cluster shape matches the unfurl pattern the project filter already describes.

Fingerprints (one per person, latest open_trainer in window; 83 persons):
- Screen 1920x1080: 50 persons (6 reached hand_dealt, 44 did not). Viewport 1366x768: 50 events. The 1920x1080 screen with 1366x768 viewport pairing is the exact fingerprint in the project's unfurl rule (see Filter analysis).
- Screen 800x600: 21 persons, 0 reached hand_dealt. Screen 1024x1024: 6 persons, 0 reached hand_dealt. Both are headless-default shapes named in the project filter.
- Other screens (1280x720, 1536x864, 1536x960, 1024x898, 2560x1440): 6 persons, including the heavy player (1280x720) and 2 more who reached hand_dealt.
- Browsers (84 events): Chrome 56, Microsoft Edge 18, Firefox 10.
- Entry: direct 59 events, daily_link 24 events, practice_link 1 event. Preview flag: null (absent, never true) on all 84 opens, so the hidden-preview exclusion rule does not fire for this segment.
- URLs: utm_content-only 36 events, full UTM set 23 events, bare /web/ 19 events, other UTM combinations 5 events, ?practice= 1 event. The utm_content-only URLs carry that day's post slug with no utm_source, consistent with links copied or fetched without a source tag; no stronger claim is made from URL shape alone.

$autocapture: 27 persons have at least one $autocapture event, but 270 of 300 $autocapture events belong to the heavy player. The remaining 26 persons average about 1 $autocapture each. Element-level detail was not pulled. A single $autocapture event was not treated as proof of human play; the canonical interaction definition (decision, finished hand/run, recap/CTA tap, share, feedback) was used instead, matching scripts/stats.mjs.

## PostHog traffic classification

$postHog $virt_traffic_type for segment persons in the window: Regular 67 persons (1,027 events), Automation 16 persons (107 events), no Bot or AI Agent labels. The 16 Automation persons are all Microsoft Edge with headless screens (800x600: 10, 1024x1024: 6). They are already excluded from clean counts by notTestClause (see below). The heavy player is classified Regular. The remaining 11 persons with 800x600 screens are classified Regular, not Automation, so screen shape alone does not determine the classification.

## Filter analysis (scripts/stats.mjs, read on main)

notTestClause() already excludes from clean counts, without deleting events:
- Named probe events, test distinct IDs and person IDs, internal/test and crew-test cohorts, test refs, and automation user agents.
- Unfurl rule (a): first event $pageview/open_trainer, first timestamp in hour 21 UTC, minute 0-5, after Oct 18, with an open_trainer carrying viewport 1366x768 and screen 1920x1080 in that window, AND no game_start / start_training / decision_made / hand_complete / recap_tap / start_daily / daily_complete / share ever. Note the rescue list includes start_training and start_daily: an auto-starting load that auto-fires start_training or start_daily escapes this rule even if it never interacts further. Several single-hand persons in this segment have exactly that shape (start_training + start_daily + 1 hand_dealt, no decision). Whether that rescue is intended for auto-fired starts is a question for the filter owners (Beam/DeepSeek), not a verdict here.
- Headless rule (b): whole history is 1 pageview, 1 active day, 0 canonical interactions, AND (no browser events OR screen 800x600 / 1366x1400 / 2000x2000). Auto-fired start_daily/start_training/hand_dealt do not count as interactions under this rule. How many segment persons meet rule (b) exactly was not computed person-by-person here; the rule's own comment already states its intent.
- Hidden-preview rule: preview_opens > 0 with 0 interactions. Does not fire here (preview never true).
- $virt_traffic_type Bot / Automation / AI Agent excluded. Covers the 16 Automation persons above.

Two narrow questions for the filter owners, flagged not decided:
1. Rule (a) rescue: should auto-fired start_training / start_daily alone rescue a post-publish-cluster load from unfurl exclusion, when rule (b) explicitly says auto-fired starts do not prove a human?
2. Hour check: rule (a) uses hour 21 UTC. Verify that hour against the 16:00 CT post time across the Nov 1 DST boundary, given timestamp timezone handling in HogQL. No DST bug is claimed here; the check is requested because the segment includes both CDT (Oct) and CST (Nov) dates.

No filter change is proposed by this check and none was made. Any change needs the filter definition published and the before/after counts shown, per the canonical-numbers discipline.

## Verdict: MIXED, do not exclude as a whole

- The segment is not uniformly bots. It contains at least one heavily engaged human-like player, plus a small number of light loads that may be humans bouncing after one hand.
- The bulk is clustered, low-interaction traffic consistent with automated link-fetch / preview loads triggered by posting. That reading rests on timing cluster, unfurl fingerprint, headless screens, near-zero decisions, and the referred-desktop contrast. It is directional, not a per-person bot verdict: without session replays, no single light person in the bulk can be called bot or human from aggregates alone.
- Do not redesign the home screen around the direct-desktop funnel. Referred desktop (61% start_training, 45% hand_dealt, 21% decision_made) is the human comparator in this window. The direct segment funnel (14% start_training, 11% hand_dealt, 1% decision_made, the 1% being the single heavy player) describes mostly non-playing loads, not human difficulty with the trainer.
- Daily reporting: keep unfiltered totals unfiltered, with this flag attached. Keep clean counts on notTestClause as published. Do not add a new desktop-direct exclusion on the basis of this check alone.

## Limits (read before reusing these numbers)

- No session Replay / Replay Vision access. Wren's PostHog key is query:read HogQL only; no recording, replay metadata API, or video was available. The verdict rests on event sequences, timing, fingerprints, classifications, and comparisons, not on watching sessions. If Replay access exists elsewhere in the crew, a replay sample of the 16:02 cluster would be the direct test this check could not run.
- No $raw_user_agent analysis was pulled. Automation-user-agent filtering was assessed via $virt_traffic_type and the published filter text, not by inspecting individual user-agent strings.
- Raw basis: reproduction queries did not apply notTestClause, matching the playtest. Probe/test refs were not separately filtered in the reproduction counts. Clean-count statements above rest on the filter text and $virt_traffic_type, not on re-running the filtered report.
- One window, one segment definition. Results do not generalize to mobile, to other OS/browser combinations, or to other date ranges without re-running.
- 2 segment persons have open_trainer but no $pageview in the window. Whether their $pageview falls outside the window or is otherwise absent was not pursued; it does not change the funnel verdict, since Visitor requires a $pageview and these 2 would not count as visitors in this window under the canonical definition.
- The 4 ms first-decision values and the single hand_complete without decision_made are unexplained single-instance anomalies. Neither changes the segment verdict.
