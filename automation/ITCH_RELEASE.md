# Ready-to-upload free demo

Build: `npm run build:itch`
Verify: `npm run test:itch` and `npm run test:itch:cross-site`
Artifact: `artifacts/pokergym-itch.zip` (generated and ignored by Git).

The ZIP has a playable index.html at its root, relative paths, bundled fonts/artwork/strategy modules, and no diagnostic harness, screenshots, repository files or credentials. Its entry point uses a relative base to the bundled web directory. The ordinary cloud build and landing entry point remain available through `npm run build`.

## Suggested itch.io listing

Title: Poker Gym — Retro Card Training
Kind: HTML Game
Price: Free (the ZIP does not implement memberships or checkout)
Upload: pokergym-itch.zip; select “This file will be played in the browser.”
Embed: click to launch fullscreen, click to play, fullscreen button enabled.
Mobile: local Chromium tested at 390px; physical Android testing remains outstanding. Do not claim an Android store release.

Description:

Practice card decisions in a small retro training adventure. Choose a trainer, read short lessons, visit four gyms and get coaching feedback. Includes Jacks or Better video poker, blackjack, baccarat and Hold’em hand evaluation. Hold’em covers finding the best five-card hand, rather than a full betting strategy.

The free demo includes badges, replay practice and per-game accuracy. Progress saves in this browser. Use the private text backup/restore tool to transfer progress manually; clearing browser data without a backup loses it. Embedded-browser storage restrictions may affect persistence. No signup, deposits, real-money wagering or paid membership. There are no guaranteed winnings. Development uses AI assistance.

Feedback prompt: Where did you hesitate during your first lesson on a phone, and was the next action clear?

Documentation checked 2026-10-07: https://itch.io/docs/creators/html5
This artifact is prepared locally, not uploaded or published. itch.io HTML5 donation payments are not recurring subscription checkout or evidence of recurring revenue.

Cross-site verification: the actual ZIP passed a 390px localhost parent / 127.0.0.1 iframe test in separate Chromium targets, including isolated game storage, reload, backup/restore and five-hand sessions. This is local default Chromium behavior, not hosted itch.io, restricted-storage browsers or physical Android evidence.

Storage resilience checks: `npm run test:storage:denied` and `npm run test:storage:quota` simulate inaccessible/full storage in standalone headless Chromium at 390px. Training continues in memory, warns that progress is not saving, and permits manual export. These simulations do not establish actual itch.io blocked-storage behavior. If saving is blocked in an embed, players should open the standalone demo and preserve a private backup before closing the unsaved tab.
