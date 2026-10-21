# Poker Gym

[Try the five-decision weekly sample](https://playpokergym.com/guides/weekly-01/) · [Play the free browser demo](https://playpokergym.com/web/) · [Download the current portable demo](https://github.com/MeepTheTendie/pokergym/releases/latest) · [Share player feedback](https://github.com/MeepTheTendie/pokergym/issues/1)

Practice card-game decisions in a free training game. Pick a game, play a five-hand session with coaching on every decision, and keep missed hands coming back until they stick. Free to play: no signup, no ads, no third-party trackers, no real-money wagering, and nothing is for sale today.

## Try a five-minute training session

1. Open the demo on your phone or computer and choose a game.
2. On the map, choose a game's five-hand practice. Read its lesson, then make your own decisions before reading the coach.
3. Visit the mistake notebook after practice. For new mistakes in all four games, retry the original decision before revealing the explanation; scored retries are tracked separately from gameplay accuracy.
4. Return when the notebook shows reviews due. A missed decision is due the same day, then a correct retry schedules recall after 2, 4, 8, then 16 days; a wrong retry sends it back to tomorrow. This schedule stays on your device and sends no reminders. Longer in-game challenges award badges; practice remains available in every game.

The games cover Jacks or Better video poker, blackjack, baccarat and Hold'em hand evaluation. Hold'em practice does not teach a complete betting or bluffing strategy. Coaching uses the simulator's rules and assumptions. Learning the best play lowers the house edge; it never beats it.

Prefer a quick lesson first? Try the [three-hand video-poker guide](https://playpokergym.com/guides/jacks-or-better/) or [three blackjack decisions](https://playpokergym.com/guides/blackjack/), with answers hidden until you reveal them.

## Help decide what comes next

Try the [free five-decision blackjack sample](https://playpokergym.com/guides/weekly-01/), choose before revealing each explanation, then retry on a later day. It saves your unfinished attempt and first/latest completed scores in the same browser. An explicit download button enables offline practice.

After trying it, [leave voluntary feedback](https://github.com/MeepTheTendie/pokergym/issues/1): what was your first score, which explanation was unclear, and what would make you return next week? Poker Gym is free, with no subscriptions. If it helps you, an optional [Ko-fi tip](https://ko-fi.com/playpokergym) is welcome.

GitHub feedback is public and requires an account. Omit personal details and save backups. The demo also provides an email-draft alternative that you review and send yourself.

## Saves, offline play and downloads

Progress stays in this browser, without a cloud account. Clearing browser data can remove it. Use the game's manual backup export to keep a private copy. When browser storage is blocked or full, practice still runs but progress may not persist.

The live demo shows when its offline game download is ready. Close existing game tabs to activate updates. Offline behavior has been checked in headless Chromium; physical Android installation and an Android store release remain unverified.

The release ZIP is an HTML5 browser game for hosting or local serving, not an Android installer. Actual itch.io hosting is not verified. Use the release's checksum file to check the downloaded archive.

## Project and source status

Poker Gym is independent, with original artwork and music. Built by Poker Gym with AI assistance. Publication and documentation may be performed by an AI development assistant for the owner. No affiliation with Nintendo or Pokémon is claimed.

Releases and their tags are point-in-time source snapshots. The [spaced-recall-demo-2026-10-10 release](https://github.com/MeepTheTendie/pokergym/releases/tag/spaced-recall-demo-2026-10-10) contains scored original-decision retries in all four games and persistent spaced recall, alongside practice, backups, offline play and mistake review. Older notebook entries without an original answer key support self-review only. The download link above follows the latest published release. Use that release tag to inspect the downloadable demo source; the default branch may differ from the live build.



## Visit stats (owner only)

`npm run stats` prints two independent reports.

**1. Visit counter (Analytics Engine).** Counts page-like requests to `/`, `/web/` and the five published learning guides per UTC day and by link label (`ref`, from the fixed list in `src/rpg/links.js`). No IPs, user agents or cookies are stored. These are page-like requests, not people: link-preview bots and crawlers count too, so treat this as an upper bound.

**2. Real people (PostHog).** Unique people per day, the journey stages they reach, and the events they fire. PostHog is first-party (proxied through `playpokergym.com`) and its bot filter drops headless/automated clients, so these are the honest human numbers. The same data drives the "Poker Gym — Start Here" dashboard at <https://us.posthog.com/project/670990/dashboard/2224048>.

Either section is skipped, not fatal, if its credential is missing.

`npm run scorecard` prints the launch scorecard instead: the Oct 16–29 targets (real site visits, people who came back on a second day) and people per channel, with this project's own test traffic excluded. See `SCORECARD.md` for the tracking table and the decision rule. It uses UTC days, so label it that way when comparing it with the Chicago report below.

`npm run report` prints the reconciled product scorecard: **America/Chicago** reporting days, today's partial numbers, seven-day comparisons, one-bucket-per-person source attribution, the hand-level funnel, Daily Drill participation, retention by first-touch cohort, exclusion audits, and data-quality warnings. See `docs/analytics-metrics.md` for the definitions and known gaps.

One-time setup:

1. **Cloudflare:** dashboard → My Profile → API Tokens → Create Token → Custom token with **Account · Account Analytics · Read** for this account only. Store it in the desktop keyring (never in the repo):
   `secret-tool store --label='Cloudflare Analytics (pokergym stats)' service cloudflare-analytics account pokergym`
   (paste the token when prompted). Alternatively export `CLOUDFLARE_API_TOKEN` for one run.
2. **PostHog:** dashboard → Settings → Personal API keys → Create, with read access to insights and query. Store it:
   `secret-tool store --label='PostHog (pokergym stats)' service posthog-personal-api-key account pokergym`
   Alternatively export `POSTHOG_PERSONAL_API_KEY` for one run. Set `POSTHOG_PROJECT_ID` only if the project is not `670990`.
3. The account id is read from `.wrangler/cache/wrangler-account.json` (created by any wrangler command) or `CLOUDFLARE_ACCOUNT_ID`.
