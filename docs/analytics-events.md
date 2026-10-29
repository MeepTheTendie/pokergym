# Analytics events

Events go to PostHog through `window.trackEvent` (web/posthog-loader.js), which
only sends from playpokergym.com. The trainer's lifecycle events are emitted by
`src/rpg/analytics.js` and nowhere else, so each has one meaning.

Every event below also carries `ref` (this visit's channel tag, e.g. `youtube`,
`x`, `share`) when the visit has one. It comes from the loader's attribution
snapshot (`?ref=`, a UTM tag, or the referrer fallback). The loader also sends:

- `display_mode` — a super property on every event: `standalone` or `browser`.
- First-touch `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` are set once as person properties (`$set_once`), so they survive later visits.

- `first_ref`, `first_utm_*` — the **first** source ever seen for this browser.
  Written once to `localStorage` and never overwritten by a later visit.
- `session_ref` — the source for the current 30-minute session, kept across
  internal navigation in `sessionStorage`.
- `ref` — kept for older reports; equals `session_ref` when there is one.

`session_ref`/`first_ref` are absent for direct and unknown traffic. A missing
referrer is never turned into a platform guess; only explicit `?ref=`, UTM tags,
or a known referrer host counts.

## Identity (since 2026-10-26)

The loader mints `pg_player_id_v1` once per browser, stores it in
`localStorage`, and calls `posthog.identify` with it, so clearing cookies no
longer splits one device into several people. The person also carries
`first_seen` and `first_ref`. The trainer then updates that profile through
`window.pgIdentify` on every load with `trainer_class`, `level`, `hands_played`,
`returning`, and `days_since_last_visit`.

This is **device** identity, not human identity: it does not link two devices,
and no PII is sent. Retention measured before 2026-10-26 is cookie-scoped and
is not comparable with retention measured after it.

## Trainer (/web/)

`game_start`, `start_daily`, and the hand events carry `run_id` (unique per page
load) and, where relevant, `event_version` (currently `2`). The five-hand
session completion events also carry `hands_completed`, so the definition is
visible in the data rather than implied by the event name.

| Event | Fires when | Properties |
|---|---|---|
| `open_trainer` | The trainer page loads. Once per page load. | `entry`: `daily_link` (`?daily=1`), `share_link` (`?d=<n>` share grid), `practice_link` (`?practice=`), `drill_link` (`?drill=<scenario id>`, opens that authored hand first), `direct`; `returning`: has a local save; `days_since_last_visit`: days since the last local visit when a save exists |
| `start_training` | The first hand of the page load is dealt (any mode). Once per page load. | `game`; `mode`: `daily`, `session`, `challenge`; `entry` |
| `game_start` | A five-hand session, drill, or gym challenge begins, including a resumed one. Not fired for Daily Drill hands. | `game`: `blackjack`, `videopoker`, `baccarat`, `holdem`; `mode`: `session`, `master`, `weak` (drills), `challenge`; `resumed`; `entry`; `run_id` |
| `hand_dealt` | A hand is dealt inside a live `game_start`/`start_daily` run. | `run_id`, `run_kind` (`session`/`daily`), `game`, `mode`, `entry`, `hand_index` (1-based), `hand_total` (5 for sessions/daily, 10 for a challenge), `event_version` |
| `decision_made` | The **first** player decision in a hand. Later blackjack actions do not emit again. A natural blackjack has no decision. | same run fields plus `hand_index`, `action` (`hit`, `stand`, `double`, `split`, `draw`, `confirm`, or the baccarat choice) |
| `hand_complete` | That hand is settled, once per hand index per run. | same run fields plus `hand_index`, `optimal` (boolean), `decisions` (actions taken in the hand), `difficulty` |
| `session_complete` | Five finished hands in a session started by `game_start`. Once per run. | `run_kind` (`session`), `game`, `mode`, `entry`, `correct` (0-5), `run_id`, `hands_completed: 5`, `event_version` |
| `start_daily` | A Daily Drill run begins, from any entry path. | `entry`: `daily_link`, `share_link`, `title` (title-screen button), `map` (TODAY card), `map_resume` (TODAY card, unfinished run), `replay`, `recap` (five-hand recap button); `number` (drill id); `resumed`; `scored` (false when the day is already complete); `shared`; `run_id`; `event_version` |
| `daily_complete` | A Daily Drill run started by `start_daily` finishes five hands. Once per run. | `run_kind` (`daily`), `entry`, `correct` (0-5), `number`, `scored`, `run_id`, `hands_completed: 5`, `event_version` |
| `time_to_first_decision` | The first player decision in a run is made. | `ms` (milliseconds from deal to decision), `game`, `mode`, `run_id`, `run_kind`, `entry`, `event_version` |
| `recap_view` | The end-of-run recap is shown after a five-hand session **or a completed Daily Drill**. | `daily_done`, `missed`, `run_id`, `run_kind` (`session`/`daily`), `event_version` |
| `recap_tap` | A button on the end-of-run recap is tapped. | `button`: `daily_drill`, `play_again`, `replay_daily`, `challenge`, `review_mistakes`, `install`; `run_id`, `event_version` |
| `share` | A result is shared. | `channel`: `native`, `copy`, `challenge`; `surface`: `recap`, `recap_daily`, `daily`, `invite` |
| `share_click` | A share action is invoked. | `game`, `channel` (`native`, `copy`, `x`, `facebook`…), `share_id` (short random id). Every share link carries `?ref=share&sh=<share_id>`. |
| `share_arrival` | The trainer or landing loads with `ref=share`. | `sh` (the share id). Fires on load and registers `ref`/`sh` as first-touch person properties. |
| `push_opt_in` | The recap reminder button is used. | `result`: `subscribed`, `unsubscribed`, `denied`, `dismissed`, `error`; `surface` |
| `push_prompt_shown` | The push opt-in UI is shown. | `surface` |
| `push_subscribe` | A push subscription attempt resolves. | `result`: `granted`, `denied`, or `unsupported`; `surface` |
| `push_unsubscribe` | A push subscription is removed. | `surface` |
| `push_open` | The app loads with `ref=push`. | (none) |
| `a2hs_installed` | The app is installed to the home screen (`appinstalled`). | `display_mode` |
| `first_nudge` | The one-time first-hand nudge appears (6s after hand 1 with no decision). | `game`; `mode` |
| `feedback_submit` | The feedback form is submitted. | `clarity`, `returnInterest` |

A completion only fires for a live start in the same page load, so every
`session_complete` has a `game_start` and every `daily_complete` a
`start_daily`. Gym challenges (`mode: challenge`) have hand events but no
`session_complete`; they are an exam, not a five-hand session.

`decision_made` is deliberately a **stage**, not every action. A blackjack hand
can contain several actions; `hand_complete.decisions` is the count. This keeps
the funnel denominator equal to hands dealt.

## Landing page and guides (click tracking)

Any element with `data-track="name"` sends `name` on click, with its other
`data-*` attributes and `path`, `text`. These record clicks, not starts, and
may be lost if the page navigates before the SDK loads.

| Event | Fires when | Properties |
|---|---|---|
| `cta_click` | A landing call to action is clicked. | `cta`: `open_trainer`, `start_training`, `start_daily` (the button's intent); `location` |
| `challenge_friend` | Landing "Challenge a friend" link. | `location` |
| `open_guide` | Landing guide link. | `guide` |
| `guide_cta_play` | A guide's play button. | `guide`, `game` |

PostHog also autocaptures `$pageview`, `$pageleave` and clicks.

## Metric definitions

These are the definitions used by `scripts/analytics-report.mjs`; do not
compare a number from another report unless it uses the same definition.

| Metric | Definition |
|---|---|
| Visitor | Unique `person_id` with at least one valid `$pageview` in the reporting window, after the exclusions below. |
| Player | Unique visitor with at least one valid `game_start` in the window. |
| Five-hand completer | Unique person with a valid `session_complete` (five finished hands). |
| Five-hand completion rate | Five-hand completers divided by players. The report also prints total completions. |
| Daily Drill starter / completer | Unique person with `start_daily` / `daily_complete` in the window. |
| Returned (any) | Person active on at least two distinct Chicago calendar days. This is the broadest return definition and is not the same as returning to play. |
| Returned site | Person with a valid `$pageview` on at least two distinct Chicago days. |
| Returned game | Person with a `game_start` on a later Chicago day than their first-touch day. |
| D1 site return | Person with a valid `$pageview` on the Chicago day immediately after their first-touch day. Only shown for cohorts whose next day is fully complete. |
| D1 return-to-game | Person with a `game_start` on the Chicago day immediately after their first-touch day. Only shown for cohorts whose next day is fully complete. |
| D7 site return | Person with a valid `$pageview` on any day from first-touch day +1 through +7. Only shown for cohorts whose day +7 is fully complete. |
| D7 return-to-game | Person with a `game_start` on any day from first-touch day +1 through +7. Only shown for cohorts whose day +7 is fully complete. |
| First-touch source | The first valid `first_ref`, else the first non-empty `ref`, else `first_utm_source`/`utm_source` when it names a recognized platform, else `direct` when the earliest referrer is explicitly `$direct`, else `unknown`. One bucket per person, so rows reconcile to the visitor total. |

### Excluded traffic

Every count above applies `notTestClause()` from `scripts/stats.mjs`. It drops
named probe events, known automation user agents and person ids, the internal
test cohort, the `attribcheck` / `funnel-check` test refs, link-preview bots
that reach the trainer within five minutes of a scheduled post, and — since
2026-10-27 — a narrow headless-crawler shape.

The crawler rule only fires when a profile's entire history is one pageview on
one day, with no `game_start`, `start_daily`, `decision_made`, hand, recap,
Daily or CTA event, **and** its fingerprint is a headless default: no
`$browser`, an 800x600 screen, or a 2000x2000 screen. A real visitor on a small
window who does anything at all survives.

Unfiltered connector pulls count these profiles, which is the whole gap between
the raw and filtered visitor numbers. As of 2026-10-27 the epoch read 102 raw,
82 after the probe and unfurl rules, and 55 after the headless-crawler rule;
none of the 27 removed profiles ever started a hand. The report prints raw and
filtered side by side so the gap is never hidden. Exclusions change reported
numbers, never collected events.

Reporting days are **America/Chicago**, not UTC and not the PostHog project's
UTC setting. `scripts/analytics-report.mjs` converts each Chicago midnight to
an explicit UTC instant with `Intl` (so DST transitions are handled) and groups
events with `toDate(toTimeZone(timestamp, 'America/Chicago'))`. Yesterday is
the last fully completed Chicago day; today is reported separately as partial.
See `docs/analytics-metrics.md` for the decision dashboard, metric definitions, and remaining gaps.
