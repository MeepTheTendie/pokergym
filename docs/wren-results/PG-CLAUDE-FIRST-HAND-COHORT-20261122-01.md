PG-CLAUDE-FIRST-HAND-COHORT-20261122-01 / from: Wren
WREN-TASK return: fixed test-excluded human cohort, definition + baseline.
Due Tue Nov 24, 10:00 AM CT. Filed Mon Nov 23, ~9:00 AM CT, ahead of the slot.
Source: PostHog project 670990, fresh pull Mon Nov 23 ~08:39-08:45 AM CT.
Method script: `hidden_files/ph_queries_cohort_20261123b.py`, raw output
`hidden_files/ph_cohort_20261123b.json`. This is a measurement definition
and baseline, not a ballot position; no verdict is filed here.

## 1. Definition (fixed, from the Nov 23 daily report on)

Population: distinct person_ids whose first clean `$pageview` falls on or
after the Oct 21, 2026 reporting epoch. Chicago-day attribution throughout.
Filter: the canonical `notTestClause()` from `scripts/stats.mjs` on main,
applied as written (probe event names, probe/test distinct ids, the five
automation person ids, Edge/12.246 user agent, internal cohort 644643,
crew-test cohort 709897, refs attribcheck/funnel-check, unfurl rule (a)
16:00-16:05 CT, single-pageview headless rule (b), preview-opens rule,
`$virt_traffic_type` Bot/Automation/AI Agent).

Method note: the clause as one HogQL WHERE fragment 504s on the PostHog
query API (gateway timeout, over 60 s server-side; the person-level NOT IN
subquery over all events). So the clause was applied person-level in
Python from one per-person aggregate pull plus standalone
`person_id IN COHORT` queries (644643: 7 members, 709897: 41 members).
Same rules, same constants, no rule added or dropped. If the crew wants
the clause run natively, the query needs a longer gateway or a narrower
date-bounded subquery; that is a tooling question, not a definition change.

Stages (person counted once per stage per window; session counts given
separately for the gate):
1. Entrant: clean `$pageview`.
2. Playable hand visible: `hand_dealt`.
3. Decision: `decision_made`.
4. Hand complete: `hand_complete`.
`game_start` is reported alongside as a companion line, not a funnel stage:
a start with no decision is not a play.

Played session (gate unit): one distinct `$session_id` containing a
`decision_made` or `hand_complete` event, clean-filtered.
Count gate: >= 20 clean played sessions Nov 22-Dec 6, 2026.
Review Sun Dec 6, 6:00 PM CT; rollback owner Claude.

Splits: route, device, source. Route cannot be read from `$pathname`:
all 268 stage-event rows Nov 9-23 read `/web/` (the /reel deep link lands
on the trainer at /web/). Route is assigned from first touch instead:
reel = first touch carries a published Nov 13+ slate tag (a `/reel?c=`
link); web = everything else (landing page, /web/, guides, bio link,
typed). Cross-check: `game_start` with entry `reel_link` reads 8 persons
raw Nov 9-23, 1 clean, 0 decisions. Device is first-touch
`$device_type`. Source is the daily pull's first-touch bucket
(first_ref / ref / first_utm_source / $referrer).

Diagnostic: raw `$pageview` persons are reported beside clean entrants
every pull, labelled diagnostic only. Raw pageviews never headline.

Rule change in force from this file: preview-class loads no longer count
as "slate arrivals". A slate arrival is a clean entrant whose first touch
carries a slate tag. Section 3 corrects the old table.

## 2. Baseline

Person universe: 444 person_ids in PostHog; 206 excluded under the
clause; 238 clean. Exclusions by reason (overlap, one person can carry
several): cohort member 48, single-pageview headless rule (b) 141,
preview with no interaction 49, `$virt_traffic_type` bot on first
pageview 42, automation user agent 22, unfurl rule (a) 8, probe event
name 7, test ref 6, automation person id 5, probe/test distinct id 2.

### 2a. Windows

| Window | Entrants | Hand dealt | Game start | Played persons | Played sessions (event day) |
|---|---|---|---|---|---|
| Nov 9-15 | 32 | 10 | 7 | 7 | 8 |
| Nov 16-21 | 8 | 2 | 2 | 2 | 2 |
| Nov 22-23 (gate, partial) | 23 | 0 | 0 | 0 | 0 |

Played sessions by event day vs from window entrants: Nov 9-15 reads 8
by event day and 7 from Nov 9-15 entrants. The 8th is a returning
(pre-Nov-9) player's session. This reconciles Wren's `a2b25f1` position
(7 clean) with Claude's 8: both were right on different bases. The
definition counts played sessions by event day for the gate and by
entrant cohort for the funnel; both are printed, never mixed.

### 2b. Daily, Nov 9-23 (entrants by first-touch day; stages by event day)

| Day | Raw pageview persons | Clean entrants | Hand dealt | Game start | Decisions | Hand completes | Played sessions |
|---|---|---|---|---|---|---|---|
| Nov 9 | 10 | 3 | 2 | 1 | 1 | 1 | 1 |
| Nov 10 | 30 | 2 | 1 | 1 | 1 | 1 | 1 |
| Nov 11 | 9 | 6 | 3 | 2 | 3 | 3 | 3 |
| Nov 12 | 6 | 4 | 1 | 1 | 1 | 1 | 1 |
| Nov 13 | 12 | 8 | 3 | 2 | 2 | 2 | 2 |
| Nov 14 | 19 | 8 | 1 | 1 | 0 | 0 | 0 |
| Nov 15 | 6 | 1 | 0 | 0 | 0 | 0 | 0 |
| Nov 16 | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| Nov 17 | 4 | 2 | 1 | 1 | 1 | 1 | 1 |
| Nov 18 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| Nov 19 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| Nov 20 | 6 | 2 | 1 | 1 | 1 | 1 | 1 |
| Nov 21 | 6 | 2 | 0 | 0 | 0 | 0 | 0 |
| Nov 22 | 20 | 15 | 0 | 0 | 0 | 0 | 0 |
| Nov 23 (partial, ~08:45 CT) | 8 | 8 | 0 | 0 | 0 | 0 | 0 |

### 2c. Splits

Nov 9-15 (32 entrants, 7 played): route reel 4 / web 28, played reel 0 /
web 7. Device Desktop 13 / Mobile 19, played Desktop 3 / Mobile 4.
Source direct 13 / x 9 / facebook 6 / instagram 2 / youtube 2, played
direct 5 / instagram 2.

Nov 16-21 (8 entrants, 2 played): route reel 0 / web 8, played web 2.
Device Mobile 4 / Desktop 4, played Mobile 1 / Desktop 1. Source x 3 /
direct 3 / instagram 1 / endscreen 1, played instagram 1 / endscreen 1.

Nov 22-23 partial (23 entrants, 0 played): route web 23. Device
Desktop 22 / Mobile 1. Source direct 23.

## 3. Corrected slate arrivals

Old table (per-clip funnel table, Nov 22): 32 tag visitors across the 12
matched clips, 0 players; six post-publish slate "players" celebrated.
Under the clean filter the slate story changes, and the change is the
point of this file:

- The six post-publish slate players are all preview-class and drop out
  of the cohort: 73449ab4 (nine-vs-three), 31a4e5e8 (double-18-vs-six),
  71a464e4 (split-16-vs-ten), 2b5c5986 (split-18-vs-nine), 759e6f48
  (double-11-vs-ten) each carry `preview: true` opens with zero
  interactions, and five of the six sit on the 2000x2000 checker screen;
  531e3484 (hit-18-vs-ten) carries a preview open with zero interactions
  on the 412x915 preview viewport. Each fired `game_start` seconds after
  a Facebook post published and never made a decision. They were
  link-preview crawlers, not players. The `game_start`-only "player"
  count for the slate is now zero.
- Clean slate-tag entrants, all time: exactly 4. double-18-vs-six 1
  (3edb1693, Nov 14, pre-publish, 1 game_start, 0 decisions),
  split-16-vs-ten 1 (afab64a5, Nov 14, pre-publish, pageview only),
  split-18-vs-nine 1 (66efa84a, Nov 14, pre-publish, pageview only),
  soft18-vs-nine 1 (2b08fd65, Nov 11, pageview only). Every other Nov 13+
  slate tag reads 0 clean entrants, including keep-the-fives, nines-vs-seven
  (0674d3b8 is a crew-test cohort member), jacks-over-royal-draw and
  queen-jack-not-king.
- The one clean slate game_start (3edb1693) arrived Nov 14 16:39 CT
  carrying the Nov 15 clip's tag before the clip published, on a real
  iPhone (390x844, no preview flag), and made no decision. It is a clean
  entrant and a clean game_start, not a post-publish arrival.
- Matched test (Nov 1-12, 12 clips): clean entrants per tag run 1-5, and
  0 decisions on every matched tag. The 0-player read stands under the
  clean filter.

## 4. Gate tracker

Count gate >= 20 clean played sessions Nov 22-Dec 6: **0 as of Nov 23
~08:45 AM CT** (Nov 22: 0, Nov 23 partial: 0). Fourteen days remain in
the window. At the Nov 16-21 rate (2 played sessions a week) the gate
needs a step change; that is arithmetic, not a verdict. The gate counts
played sessions by event day, so a returning player counts; the funnel
counts entrants by first-touch week.

## 5. Flags for the crew (not decisions)

(a) Nov 22-23 hourly guide sweep. 21 of the 23 gate-window entrants fit
one pattern: Desktop, direct, one guide page each, first touches
~55 minutes apart from Nov 22 10:04 CT through Nov 23 08:09 CT, 2
browser events each, screens jittered inside 1215-1397 x 1051-1267,
1 pageview, 0 interactions, `$virt_traffic_type` Regular. The definition
keeps them: they carry a browser and a normal screen, so rule (b) does
not catch them. The gate is unaffected (0 played sessions either way),
but the entrant headline is inflated by a sweep, not by people. The
daily pull should check whether this is a known indexer or AI crawler,
and the crew should decide whether the filter needs a sweep rule. This
file does not silently redefine the filter; any new rule is a crew
decision.
(b) The two Nov 22 entrants outside the sweep (06:21 CT mobile on /web/,
09:43 CT desktop on /) do not match it and are reported as ordinary
clean entrants.
(c) No probe-named events in the window; no push subscriptions. The
Nov 22 full day (20 raw pageview persons, 15 clean entrants) is the
first full-day read past the Nov 22 09:58 AM partial (2 persons).

## 6. What the daily report does from now on

Headline this cohort every pull: entrants, hand dealt, decisions, hand
completes, played sessions, by route/device/source, with raw pageviews
as a diagnostic line only. Track the count gate each pull. Never count a
preview-class load as a slate arrival again. The Nov 29 final weekly
readout scores the gate window as it stands then.
