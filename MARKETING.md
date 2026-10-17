# Poker Gym player acquisition

## Monetization rule (owner, 2026-10-15)

No subscriptions, ever, and no recurring prices. Monetization is the optional Ko-fi tip jar (https://ko-fi.com/playpokergym). The only other path left open is a possible one-time US$4.99 Pro unlock, considered only if at least five people ask for something like it unprompted after day 30. Prompted answers do not count as demand, so public copy asks no pricing or willingness-to-pay question. Older log entries below that mention a monthly offer or pricing research are superseded; that research was removed. Day 14 of the current launch is a measurement checkpoint only: report the number of unprompted requests for more. It does not lower the day-30 / five-ask gate above.

## Verified status

Playable demo: https://playpokergym.com/web/
Landing: https://playpokergym.com/
Dashboard (plain English, start here): https://us.posthog.com/project/670990/dashboard/2224048
No social posts, player responses or tips verified yet. No daily marketing schedule configured.

First-party analytics is live (2026-10-17). PostHog is proxied through playpokergym.com, so events are same-origin; its bot filter drops headless clients, so counts are real people rather than crawler-inflated page requests. `npm run stats` now prints both the bot-inclusive visit counter and the honest PostHog report (unique people per day, journey stages, top events). Read it before choosing a daily action: if few people reach "finished five hands", the next improvement is onboarding or the game, not more posting.

Authenticated check on 2026-10-14 verified a connected YouTube channel in Metricool. One original blackjack quiz Short is queued for 2026-10-14 at 16:00 America/Chicago (post 395923480); read-back status PENDING, not verified published. This is one post, not a new recurring automation. See the checkpoint below.

## Initial feedback post — unsent

Title: Poker Gym: a free card-game trainer — is the first lesson clear on your phone?

Game title: Poker Gym
Playable link: https://playpokergym.com/web/
Platform: browser, designed for phone screens; not an Android store release.
Free-to-play status: free demo, no signup or deposits.

Poker Gym turns card-game practice into a short training session. Choose a game, read its lesson and make decisions with coaching feedback. The games include Jacks or Better video poker, blackjack, baccarat and Hold’em hand evaluation—not a full Hold’em betting strategy. You earn experience for correct decisions rather than lucky payouts, earned practice stays open for replay, and a per-game record shows your accuracy and completed hands. Progress saves in the same browser, not to a cloud account. There is no real-money wagering and nothing is for sale today. The app uses original artwork and music. Built by Poker Gym with AI assistance. Learning the best play lowers the house edge; it never beats it. I’m especially looking for feedback on the first lesson: where do you hesitate, and is the next action obvious on a phone?

Involvement disclosure for automated posting: AI development assistant working on Poker Gym for its owner. Do not pretend the assistant is a human developer or claim first-hand playtesting that did not happen.

## Channel evidence and eligibility

r/playmygame moderator guidance requires free play, a direct playable link, a written description, developer involvement and platform flair; the 2024 guide limits game posts to once per calendar month. A July 2025 moderator update enforces genuine feedback contributions to other games. Recheck current rules and the authorized account’s relevant participation before posting. Do not fabricate comments or bypass eligibility.

Sources:
- https://www.reddit.com/r/playmygame/comments/1eg08dh/
- https://www.reddit.com/r/playmygame/comments/1m61887/

itch.io supports playable HTML5 ZIP uploads with index.html at the archive entry and relative asset paths. Current cloud landing uses absolute URLs, so do not upload the cloud artifact unchanged. Prepare a dedicated relative-path game package and verify it in an iframe before publishing. No itch.io publisher account is verified.

Source: https://itch.io/docs/creators/html5

## Measurement

Read `npm run stats` first each run. It reports the bot-inclusive visit counter (page-like requests: crawlers and link unfurls included) and, separately, the PostHog real-player report: unique people per day, how many reached each journey stage (saw a page → opened the trainer → started a session → finished five hands → finished the daily drill) and the top events; reference labels arrive as the `ref` event property. Only the PostHog numbers are people. With near-zero real players, expect zeros and do not read noise into them.

Record a published URL, time, channel and specific player feedback for every actual post. Do not count drafted posts as outreach. Separate visits, first-session completion, repeat play, unprompted requests for paid extras and tips. Use genuine feedback and the stage counts to choose the next onboarding or return-practice improvement. No mass unsolicited email, fabricated reviews, guaranteed winnings or paid ads without a budget.

## Link tagging convention

Every published link carries `?ref=<channel>` so the source is attributable in both the visit counter and PostHog. Append `&utm_content=<video-or-hook>` to compare hooks. PostHog records the raw `ref`; the visit counter recognises only the refs in `src/rpg/links.js`.

| Where it is posted | ref |
| --- | --- |
| YouTube Shorts description | `youtube` |
| TikTok | `tiktok` |
| Instagram Reels | `reels` |
| X / Twitter | `x` |
| r/playmygame launch post | `playmygame` |
| r/WebGames launch post | `webgames` |
| Helpful answers in other subreddits | `reddit` |
| Hacker News | `hn` |
| Player's own shared daily result | `share` |
| Owner's copyable invite | `invite` |

Example: `https://playpokergym.com/web/?ref=youtube&utm_content=holdem-quiz`. With no `ref`, visits land in `other`/`none` and cannot be attributed, so a video with 500 views and no tag teaches nothing about which channel works.

## Published GitHub demo — 2026-10-07

Public release: https://github.com/MeepTheTendie/pokergym/releases/tag/free-demo-2026-10-07
Public opt-in feedback thread: https://github.com/MeepTheTendie/pokergym/issues/1

Published through the authenticated owner account with explicit AI-assistance disclosure. Release includes the verified portable HTML5 ZIP, checksum, playable demo link, existing three-hand guide and a mistake-review routine. Public download verified byte-for-byte. No real player responses or revenue verified. This is a GitHub release, not an itch.io listing or Android store release. See automation/PROGRESS.md for tests, source snapshot and access limits.

## Live distribution entry points — 2026-10-07

The landing, three-hand guide and completed-session feedback panel now link the public GitHub feedback thread. Landing also links the published portable release. Public/account-required feedback and email alternatives are explicit. https://pokergym.history-atlas.workers.dev/sitemap.xml now lists the landing, guide and game; indexing and audience remain unverified. Deployment and live phone checks documented in automation/PROGRESS.md. No new social post or player response verified.

## Published blackjack guide — 2026-10-07

https://pokergym.history-atlas.workers.dev/guides/blackjack/ now offers three recall-first blackjack decisions checked against the simulator coach, plus a five-hand practice and later mistake-retry routine. Linked from the landing, video-poker guide and sitemap; production phone/offline checks passed. Published via authenticated Cloudflare. No social post, indexing, external player response or payment verified. Details and deployment evidence in automation/PROGRESS.md.

## Published current portable practice release — 2026-10-07

https://github.com/MeepTheTendie/pokergym/releases/tag/practice-demo-2026-10-07

Separately versioned public ZIP now includes scored blackjack mistake retries already available live. Published through authenticated owner GitHub with AI-assistance disclosure, a recall/practice/return routine, both learning guides and the existing opt-in feedback thread. All 177 unit tests and actual ZIP cross-site 390px checks passed; unauthenticated public download matched the tested ZIP byte-for-byte. Earlier release preserved. No external player response or revenue verified. Checkpoint: automation/PROGRESS.md.

## Current download entry point — 2026-10-07

Production landing now links practice-demo-2026-10-07, the verified current portable release with scored blackjack retries. Cloudflare version b20fe16a-3286-4696-a4d8-a30fba940ef7; live link and public release HTTP 200 verified. GitHub README publication retry still failed with server error; no new player feedback or revenue verified. Details in automation/PROGRESS.md.


## Guide-to-practice entry points — 2026-10-07

Both published guides now link the matching five-hand practice (?practice=blackjack or ?practice=videopoker). New trainers enter its lesson after choosing a trainer; Continue preserves and resumes any unfinished session first. Cloudflare version 5d7792de-61b6-4dd9-844b-d0c04d54ec88; final 390px live/offline browser checks passed. No external player response or revenue verified. README publication remains blocked by GitHub server errors. Evidence and remaining access requirements: automation/PROGRESS.md.


## Published current gameplay download — 2026-10-08

https://github.com/MeepTheTendie/pokergym/releases/tag/practice-demo-2026-10-08

Latest non-draft GitHub release now includes current video-poker controls/payout correction and baccarat question bank/answer-order/transition fixes, with an honest return-practice routine and opt-in feedback invitation. Published through authenticated owner GitHub with AI assistance disclosure; all 183 tests and actual 390px cross-site ZIP checks passed. Public ZIP/checksum downloads matched tested files byte-for-byte. Production landing links this release (Cloudflare version 082013fe-5a62-4606-92d2-166f84862dae). Existing releases preserved. Feedback issue has zero comments; no real demand or payment verified. Evidence and access limits: automation/PROGRESS.md.


## Published GitHub discovery paths — 2026-10-08

https://github.com/MeepTheTendie/pokergym now has the playable browser demo as its homepage, an accurate free-training description and six relevant repository topics. README now links practice-demo-2026-10-08 and accurately identifies release tags as published source snapshots. README-only commit bc24ed09cbeeb308a1a48e653c4ab821661196d9 published to main through authenticated owner GitHub with explicit AI-assistant commit identity; earlier dirty app changes were not included. Public README matched local bytes and all five unique links returned HTTP 200. No audience increase, player response or revenue verified. Checkpoint: automation/PROGRESS.md.


## Published baccarat recall download — 2026-10-10

https://github.com/MeepTheTendie/pokergym/releases/tag/practice-demo-2026-10-10

Published latest non-draft portable release through authenticated owner GitHub, including scored original-decision baccarat retries now available live. All 184 unit tests and actual ZIP cross-site 390px browser checks passed. Public ZIP/checksum downloads matched tested local bytes. Previous October 8 release retains its original assets and description with a new-release link prepended, so existing landing/README download paths can find the update. AI involvement disclosed; opt-in feedback invitation retained. No social post, real player demand or payment verified. Details: automation/PROGRESS.md.

## Latest-download production entry point — 2026-10-10

Production landing now links https://github.com/MeepTheTendie/pokergym/releases/latest directly, verified to resolve to practice-demo-2026-10-10 with HTTP 200. Cloudflare version 81ede818-5dec-42ae-9976-539d628e21a2 changed only the landing asset; live HTML matched source. README still links October 8. No new post, real player response or revenue verified. Evidence and access requirements: automation/PROGRESS.md.

## Current GitHub player entry point — 2026-10-10

Public README now links the latest portable release and explains scored blackjack/baccarat retries, legacy self-review limits and the October 10 source snapshot. README-only commit 82dbee89f0bc527c60b307b7f4819fb867adf489 published through authenticated owner GitHub with AI-assistant author/committer identity. Public commit-pinned README matches local bytes; latest download resolves to practice-demo-2026-10-10 with HTTP 200. Feedback issue remains open with zero comments at this inspection. No new social post, customer feedback or revenue verified.


## Published portable original-hold recall — 2026-10-10

https://github.com/MeepTheTendie/pokergym/releases/tag/hold-recall-demo-2026-10-10

Latest public portable download now includes original video-poker hold retries, the ordered-card coaching cache fix and return-practice suggestions. Published via authenticated owner GitHub with AI involvement disclosed. All 187 unit tests and actual cross-site phone-width ZIP checks passed; public ZIP and checksum matched tested local bytes. Existing landing/README latest links resolve to this release. No new social post, player feedback or revenue verified. Checkpoint: automation/PROGRESS.md.

## Published Hold’em best-five lesson — 2026-10-10

https://pokergym.history-atlas.workers.dev/guides/holdem-best-five/

Three recall-first puzzles cover playing the board, two-pair kickers and the ace-low straight. All examples checked against the actual evaluator/selection grader; direct five-hand practice entry, hidden answers and phone layout passed locally and live. Linked from landing and sitemap. Published through authenticated Cloudflare with AI involvement and current self-review limits disclosed. Worker version 50217f39-495b-438d-bda3-7ad2d10811f2. No social post, indexing, real player demand or payment verified. Evidence and remaining access limits: automation/PROGRESS.md.


## Published all-game spaced recall download — 2026-10-10

https://github.com/MeepTheTendie/pokergym/releases/tag/spaced-recall-demo-2026-10-10

Latest public portable demo now includes scored original-decision retries in all four games and persistent due-first spaced recall. Release describes a real practice/return routine, device-local limits and voluntary real-player feedback. Published through authenticated owner GitHub with explicit AI involvement. All 189 unit tests and actual cross-site phone-width ZIP checks passed; unauthenticated public ZIP/checksum matched tested files byte-for-byte. Existing latest-download entry points resolve to this release with HTTP 200. No wider social post, real player demand or revenue verified. Details: automation/PROGRESS.md.


## Live reviewed GitHub feedback drafts — 2026-10-10

The completed-five-hand form now preserves clarity and return-interest answers (a monthly-price question was removed 2026-10-15) in an optional prefilled public GitHub issue draft. Players review before opening and submit themselves; GitHub account/public and URL-transfer disclosures are explicit. Email and the existing public thread remain alternatives. Production version 430d4e10-728d-4263-9928-46228ae47a5f; final phone/offline checks passed. No player submission, new outreach or revenue verified. Evidence and initial stale-module failures: automation/PROGRESS.md.


## Published portable daily drill — 2026-10-12

https://github.com/MeepTheTendie/pokergym/releases/tag/daily-drill-demo-2026-10-12

Latest public download now includes the live five-hand daily mix, persisted mid-drill resume, replay reward limits, optional haptics and reviewed feedback drafts. Published through authenticated owner GitHub with explicit AI involvement and device-local/date limitations. All 205 unit tests and actual cross-site 390px ZIP checks passed; unauthenticated public ZIP/checksum matched tested bytes. Existing latest-download links reach this release. No social post, real player feedback or revenue verified. Evidence: automation/PROGRESS.md.


## Original blackjack quiz video — 2026-10-14

Published media: https://github.com/MeepTheTendie/pokergym/releases/tag/blackjack-quiz-2026-10-14
Metricool planner: https://app.metricool.com/planner/calendar?blogId=7282227&openWithPostUuid=6708244008917944429

Created a 44-second original silent, caption-first quiz comparing hard 16 against dealer six and ten. Both answers checked against the simulator coach under the stated fresh-six-deck/S17/no-surrender rules; includes the house-edge sentence and AI-assistance disclosure. Public MP4 download matches the tested local file. One YouTube Short accepted and independently read back as PENDING for October 14, 16:00 America/Chicago, autoPublish true, public, not made for kids, AI-generated-content flag true, subscriber notifications false. Not yet a verified YouTube publication; no public video URL, real player response or tip verified. Existing stable game release remains latest.

The description links five-hand blackjack practice, the fuller rules/explanation guide and the voluntary public feedback thread. The practice link uses ref=youtube; the October 14 attribution fix now buckets youtube separately for future aggregate page-like requests. Counts include crawlers and are not verified players; no measured YouTube audience is established. Next run: verify publication after its due time, capture the actual YouTube URL and any real feedback; do not duplicate the pending post. Details and exact tool corrections are in automation/PROGRESS.md.

## Published baccarat recall-first guide — 2026-10-14

https://playpokergym.com/guides/baccarat/ now offers three hidden-answer questions about house edge, Banker commission and an 8:1 Tie payout, checked against the actual simulator coach. Links directly into free baccarat practice, with public/email opt-in feedback and honest expected-loss/model limits. Landing and sitemap link it; all four game tiles now have learning guides. AI assistance disclosed. Live byte matches and 390px guide-to-lesson/saved-session checks passed; Worker version 9efe9d75-2a45-4ad7-a4a1-ab10a1d9a6cf. No new social post, indexing, player response or revenue verified. Existing queued YouTube Short was still future and was neither polled nor duplicated. See automation/PROGRESS.md.


## Published daily-record portable release — 2026-10-14

https://github.com/MeepTheTendie/pokergym/releases/tag/daily-record-demo-2026-10-14

Published latest portable demo through the authenticated owner GitHub account, bringing downloads up to the live daily practice record and canonical playpokergym.com link. All 247 unit tests and actual cross-site 390px ZIP checks passed. Unauthenticated public ZIP/checksum downloads matched tested local bytes; production landing already follows releases/latest. AI assistance and simulator/data limits disclosed, voluntary public feedback invited. Earlier releases preserved. No new social post, player demand or revenue verified. See automation/PROGRESS.md.


## Current portable daily-resume release — 2026-10-14

https://github.com/MeepTheTendie/pokergym/releases/tag/daily-resume-demo-2026-10-14

Published latest non-draft download from current source 1331d5b. Includes preserved unfinished daily plans and accurate new completed-game attribution, with honest return-practice guidance, browser-local backup limits and voluntary feedback invitation. Owner/AI-assistant involvement disclosed. All 250 tests and actual 390px cross-site ZIP checks passed; unauthenticated public assets matched tested bytes. Existing releases/latest entry points reach this update. No new social post, player feedback or payment verified. Checkpoint: automation/PROGRESS.md.


## Original Hold’em best-five clip — 2026-10-14

Public original media: https://github.com/MeepTheTendie/pokergym/releases/tag/holdem-quiz-2026-10-14
Metricool planner: https://app.metricool.com/planner/calendar?blogId=7282227&openWithPostUuid=-1244525086496305710

Created a 45-second original silent quiz: A–Q versus A–J on K–K–7–7–2. Ace-kicker selection, queen exclusion and tie checked against the actual evaluator/coach. AI assistance and hand-evaluation limits disclosed. One distinct YouTube Short queued for October 15 at 16:00 America/Chicago (post 395958003). Independent readback confirms PENDING, public, EDUCATION, not made for kids, AI-generated-content flag true, autoPublish true, subscriber notifications false. Not verified published; no public watch URL or real player response. Today’s already queued blackjack clip was not changed or duplicated.

Description links free five-hand Hold’em practice with ref=youtube, the full puzzle guide and voluntary public feedback. Public GitHub and Metricool-hosted MP4 both match the tested artifact byte-for-byte. Latest portable demo remains daily-resume-demo-2026-10-14. No payment verified. Checkpoint: automation/PROGRESS.md.


## Current authored-drill download — 2026-10-14

https://github.com/MeepTheTendie/pokergym/releases/tag/authored-resume-demo-2026-10-14 is now the latest non-draft portable release. Includes current master/weak rotation, authored-drill save/backup resume and distinct purchase-intent choices. 257 tests and actual cross-site 390px ZIP suite passed; public downloads match tested bytes. Existing landing latest-download entry reaches this release. AI assistance disclosed, voluntary feedback thread retained. No new social post, player demand or revenue verified. Details: automation/PROGRESS.md.

## Free weekly-training sample — 2026-10-14

Published https://playpokergym.com/guides/weekly-01/ through authenticated Cloudflare; source commit b942906, Worker version 8146d0f5-16db-432f-8445-1d72adb5fb86. Five coach-checked blackjack decisions with hidden explanations and a next-day recall routine. Landing, blackjack introduction and sitemap link the sample. Optional feedback (its pricing question removed 2026-10-15) followed trying concrete content. No weekly schedule promised, paid offer launched, social post sent, real player feedback or payment verified. Local/production 390px checks and live source byte equality passed; evidence in automation/PROGRESS.md.


## Weekly sample linked from existing queued blackjack Short — 2026-10-14

Existing blackjack Short description now links https://playpokergym.com/guides/weekly-01/?ref=youtube and asked for pricing feedback; superseded 2026-10-15 — the description's monthly-price question should be removed (ChatGPT/Metricool side). Updated post ID 395977962, unchanged UUID 6708244008917944429 and October 14 16:00 America/Chicago time; independent readback PENDING with original video/title/YouTube settings preserved. No new post or verified public YouTube URL. Sample with query matched live source; public feedback thread still has zero comments. Guide visits are not counted by existing worker analytics. No actual demand or revenue verified. See automation/PROGRESS.md.

## Published feedback entry points (pricing question superseded 2026-10-15) — 2026-10-14

https://github.com/MeepTheTendie/pokergym/issues/1 now invites players to try https://playpokergym.com/guides/weekly-01/ and report actual first scores, unclear explanations, return interest and, at the time, a pricing question. On 2026-10-15 every pricing question was removed from the issue, README and site. No player replies existed at update/read-back. AI-assistant involvement and public/email privacy limits explicit; no signup, sale or release-schedule promise.

README now featured the sample (its pricing question was later removed); README-only commit 47945bf pushed to main through authenticated owner GitHub with AI-assistant commit identity. Authenticated contents and unauthenticated raw README matched local bytes, issue body matched intended text and all seven README links returned HTTP 200. No new social post/message, real player demand or payment verified. Existing queued Shorts untouched. Details/access blockers in automation/PROGRESS.md.


## Portable weekly sample available — 2026-10-14

https://github.com/MeepTheTendie/pokergym/releases/tag/weekly-sample-demo-2026-10-14 is the latest free download. It now includes the five-decision weekly-training sample with bundled scoring, completed-review persistence, local-game practice links and reviewed voluntary feedback (pricing question since removed). No sale or release schedule promised. 259 tests and actual cross-site 390px ZIP checks passed; public ZIP/checksum matched local bytes. Source e719c6d published with AI-assistant identity. No new social post, real player response or revenue verified. Existing queued Shorts untouched. Checkpoint: automation/PROGRESS.md.

Correction to the earlier queued-Short checkpoint: current worker/count.js and wrangler.jsonc already whitelist the weekly guide and published guide variants for aggregate page-like request attribution. These requests include crawlers and do not establish players or demand. Analytics read access remains unverified/unavailable per prior evidence.


## Portable learning routine release — 2026-10-14

https://github.com/MeepTheTendie/pokergym/releases/tag/offline-guides-demo-2026-10-14 is the latest free portable release. All four recall guides now accompany local five-hand practice and the weekly sample. Published with AI-assistance disclosure; unauthenticated assets matched tested ZIP/checksum bytes. 259 unit tests and full 390px cross-site ZIP checks passed. GitHub feedback issue still has zero comments. No new social post, player demand or payment verified. Details/access blockers: automation/PROGRESS.md.


## Original baccarat odds clip — 2026-10-14

Public original media: https://github.com/MeepTheTendie/pokergym/releases/tag/baccarat-quiz-2026-10-14
Metricool planner: https://app.metricool.com/planner/calendar?blogId=7282227&openWithPostUuid=7894233004572166573

Created a 46-second silent, caption-first quiz on lowest house edge and 5% Banker commission. Both answers verified against the actual eight-deck coach/payouts; full-shoe averages, expected losses and AI-assistance disclosure explicit. One new YouTube Short queued for October 16 at 16:00 America/Chicago, ID 396021471. Independent readback confirms PENDING, public EDUCATION Short, madeForKids=false, isAiGeneratedContent=true, notifySubscribers=false and autoPublish=true. Existing October 14/15 clips untouched. Not verified published; no public watch URL, real player response or tip verified.

Description links baccarat practice/guide and the actual blackjack weekly sample with voluntary feedback (its pricing question is superseded 2026-10-15 and should be removed from the description). GitHub/public checksum and Metricool MP4 match the tested artifact byte-for-byte; latest portable release remains offline-guides-demo-2026-10-14. Source-only commit 8a49bbc pushed with AI-assistant identity. See automation/PROGRESS.md for verification and remaining access gaps.
