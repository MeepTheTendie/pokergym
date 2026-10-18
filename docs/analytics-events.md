# Analytics events

Events go to PostHog through `window.trackEvent` (web/posthog-loader.js), which
only sends from playpokergym.com. The trainer's lifecycle events are emitted by
`src/rpg/analytics.js` and nowhere else, so each has one meaning.

Every event below also carries `ref` (the visit's channel tag, e.g. `youtube`,
`x`, `share`) when the visit has one. It comes from the loader's attribution
snapshot (`?ref=`, or the referrer fallback), which is also registered as a
PostHog super property.

## Trainer (/web/)

| Event | Fires when | Properties |
|---|---|---|
| `open_trainer` | The trainer page loads. Once per page load. | `entry`: `daily_link` (`?daily=1`), `share_link` (`?d=<n>` share grid), `practice_link` (`?practice=`), `direct`; `returning`: has a local save |
| `start_training` | The first hand of the page load is dealt (any mode). Once per page load. | `game`; `mode`: `daily`, `session`, `challenge` |
| `game_start` | A five-hand session or gym challenge begins, including a resumed one. Not fired for Daily Drill hands. | `game`: `blackjack`, `videopoker`, `baccarat`, `holdem`; `mode`: `session`, `master`, `weak` (drills), `challenge`; `resumed` |
| `session_complete` | A five-hand session started by `game_start` finishes. Once per run. | `game`, `correct` (0-5) |
| `start_daily` | A Daily Drill run begins, from any entry path. | `entry`: `daily_link`, `share_link`, `title` (title-screen button), `map` (TODAY card), `map_resume` (TODAY card, unfinished run), `replay`; `number`; `resumed`; `scored` (false for a replay of a finished day); `shared` |
| `daily_complete` | A Daily Drill run started by `start_daily` finishes. Once per run. | `correct` (0-5), `number`, `scored` |
| `share` | A result is shared. | `channel`: `native`, `copy`, `challenge` |
| `feedback_submit` | The feedback form is submitted. | `clarity`, `returnInterest` |

A completion only fires for a live start in the same page load, so every
`session_complete` has a `game_start` and every `daily_complete` a
`start_daily`. Gym challenges (`mode: challenge`) have no completion event.

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
