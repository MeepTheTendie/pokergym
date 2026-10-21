# Analytics events

Events go to PostHog through `window.trackEvent` (web/posthog-loader.js), which
only sends from playpokergym.com. The trainer's lifecycle events are emitted by
`src/rpg/analytics.js` and nowhere else, so each has one meaning.

Every event below also carries `ref` (this visit's channel tag, e.g. `youtube`,
`x`, `share`) when the visit has one. It comes from the loader's attribution
snapshot (`?ref=`, a UTM tag, or the referrer fallback). The loader also sends:

- `first_ref`, `first_utm_*` — the **first** source ever seen for this browser.
  Written once to `localStorage` and never overwritten by a later visit.
- `session_ref` — the source for the current 30-minute session, kept across
  internal navigation in `sessionStorage`.
- `ref` — kept for older reports; equals `session_ref` when there is one.

`session_ref`/`first_ref` are absent for direct and unknown traffic. A missing
referrer is never turned into a platform guess; only explicit `?ref=`, UTM tags,
or a known referrer host counts.

## Trainer (/web/)

`game_start`, `start_daily`, and the hand events carry `run_id` (unique per page
load) and, where relevant, `event_version` (currently `2`). The five-hand
session completion events also carry `hands_completed`, so the definition is
visible in the data rather than implied by the event name.

| Event | Fires when | Properties |
|---|---|---|
| `open_trainer` | The trainer page loads. Once per page load. | `entry`: `daily_link` (`?daily=1`), `share_link` (`?d=<n>` share grid), `practice_link` (`?practice=`), `direct`; `returning`: has a local save |
| `start_training` | The first hand of the page load is dealt (any mode). Once per page load. | `game`; `mode`: `daily`, `session`, `challenge` |
| `game_start` | A five-hand session, drill, or gym challenge begins, including a resumed one. Not fired for Daily Drill hands. | `game`: `blackjack`, `videopoker`, `baccarat`, `holdem`; `mode`: `session`, `master`, `weak` (drills), `challenge`; `resumed`; `run_id` |
| `hand_dealt` | A hand is dealt inside a live `game_start`/`start_daily` run. | `run_id`, `run_kind` (`session`/`daily`), `game`, `mode`, `hand_index` (1-based), `hand_total` (5 for sessions/daily, 10 for a challenge), `event_version` |
| `decision_made` | The **first** player decision in a hand. Later blackjack actions do not emit again. A natural blackjack has no decision. | same run fields plus `hand_index`, `action` (`hit`, `stand`, `double`, `split`, `draw`, `confirm`, or the baccarat choice) |
| `hand_complete` | That hand is settled, once per hand index per run. | same run fields plus `hand_index`, `optimal` (boolean), `decisions` (actions taken in the hand), `difficulty` |
| `session_complete` | Five finished hands in a session started by `game_start`. Once per run. | `game`, `correct` (0-5), `run_id`, `hands_completed: 5`, `event_version` |
| `start_daily` | A Daily Drill run begins, from any entry path. | `entry`: `daily_link`, `share_link`, `title` (title-screen button), `map` (TODAY card), `map_resume` (TODAY card, unfinished run), `replay`; `number` (drill id); `resumed`; `scored` (false when the day is already complete); `shared`; `run_id`; `event_version` |
| `daily_complete` | A Daily Drill run started by `start_daily` finishes five hands. Once per run. | `correct` (0-5), `number`, `scored`, `run_id`, `hands_completed: 5`, `event_version` |
| `share` | A result is shared. | `channel`: `native`, `copy`, `challenge` |
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
| Visitor | Unique `person_id` with at least one valid `$pageview` in the reporting window. |
| Player | Unique visitor with at least one valid `game_start` in the window. |
| Five-hand completer | Unique person with a valid `session_complete` (five finished hands). |
| Five-hand completion rate | Five-hand completers divided by players. The report also prints total completions. |
| Daily Drill starter / completer | Unique person with `start_daily` / `daily_complete` in the window. |
| Returned another day | Person active on at least two distinct Chicago calendar days. |
| D1 retention | Person active on the Chicago day immediately after their first-touch day. Only shown for cohorts whose next day is fully complete. |
| 7-day return | Person active on any day from first-touch day +1 through +7. Only shown for cohorts whose day +7 is fully complete. |
| First-touch source | The first valid `first_ref`, else the first non-empty `ref`, else `first_utm_source`/`utm_source` when it names a recognized platform, else `direct` when the earliest referrer is explicitly `$direct`, else `unknown`. One bucket per person, so rows reconcile to the visitor total. |

Reporting days are **America/Chicago**, not UTC and not the PostHog project's
UTC setting. `scripts/analytics-report.mjs` converts each Chicago midnight to
an explicit UTC instant with `Intl` (so DST transitions are handled) and groups
events with `toDate(toTimeZone(timestamp, 'America/Chicago'))`. Yesterday is
the last fully completed Chicago day; today is reported separately as partial.
See `docs/analytics-metrics.md` for the scorecard and remaining gaps.
