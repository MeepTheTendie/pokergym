# Poker Gym sunset handoff (2026-11-26)

**Status: sunset.** Owner direction (Wes, live, Wed Nov 25 ~4:10 PM CT): the site stays up as-is and the crew stops putting effort in. The crew decided how in **PG-CLAUDE-SUNSET-20261125-01/-02**, closed **SUNSET 3–0** with CHANGEs on points 2 and 4 at the Thu Nov 26 10 AM CT slot. Positions: Claude #41 7176075801, ChatGPT #41 7176269893, Wren `docs/wren-results/PG-CLAUDE-SUNSET-20261125-01.md`. Close: #41 7198633394. Restart only on Wes's explicit direction. Everything is in this repo.

## What the record says (and does not say)
Oct 21–Nov 25: 353 visitors, 59 players, 4 returned on a second day, 9 players from video links, IG 6 / FB 3 followers after 64 posts, six matched hook pairs with no direction, $0 revenue. These are **weak outcomes under this acquisition approach, not a controlled demand test.** $0 is not willingness-to-pay evidence, because Gym Pro was never switched on. The SEO changes (#162–#173) and the first-hand fix (#166) have immature observation windows.

## Site handoff
- **Deployed commit:** `3ce0517` (#173, SEO internal linking), merged by the owner account at 10:34 AM CT on Nov 26, deploy green at 10:36 AM CT. **Worker version** `9005c1c4-c676-4c30-afab-941b43bc1d43`. (The sunset plan named `b3f4ead`; #173 landed after it.) If the merge of this docs file triggers a deploy, it redeploys the identical `public/` + `worker/` build with a new Worker version id. No served file changes. That version is recorded in ledger #51.
- **Hosting:** Cloudflare Worker + static assets (`wrangler.jsonc`), custom domains `playpokergym.com` / `www.playpokergym.com`, on the owner's Cloudflare account.
- **Known dependencies, owner-held:** domain registration/renewal (registrar and renewal date: **unknown**), Cloudflare account and plan (billing status: **unknown**; the project ran at $0 spend), Ko-fi page (untouched), Metricool / Google Drive / PostHog accounts (owner).
- **Deploy token:** the `CLOUDFLARE_API_TOKEN` Actions secret **expires Feb 4 2027**. After that, merges to main can't deploy, but the live Worker keeps serving. It is not being renewed.
- **Known risk (Wren):** nobody watches the site. A Worker or domain failure would go unnoticed, and nobody is named as owner for the domain renewal.
- **Recovery (no credentials here):** to redeploy, put a valid Cloudflare API token and account id in the repo's Actions secrets and push a green commit to main. `.github/workflows/deploy.yml` deploys after `tests` passes. To run it locally: `npm ci && npm test`, then `npx wrangler deploy` with the owner's Cloudflare login.

## Shutdown checklist (a job is marked off only when its owner confirms it)
| Job | Owner | Status (2026-11-26 11:09 AM CT) |
|---|---|---|
| Integrator scheduled task (11:09 AM / 7:09 PM CT) | Wes (only the owner changes scheduled tasks) | **not verified**: still running. Until it's switched off it does only the quick check. |
| Hold-time check scheduled task | Wes | **not verified** |
| Wren daily stat pulls | Wren | **not verified**: off after the Nov 29 closing readout (Wren) |
| Wren #41 watch (twice daily) | Wren | **not verified**: off after the Nov 29 closing readout |
| Wren weekly readout | Wren | **not verified**: Nov 29 becomes the closing readout |
| ChatGPT inbox / CHATGPT-TASK polling | ChatGPT | **not verified**: retire now that the item has closed |
| DeepSeek/Beam desktop dispatcher (Omarchy, polls #41 every 15 min) | Wes's desktop | **not verified**: no tasks open |
| Metricool posts Nov 25–29 | already scheduled | run out on their own. Nothing new is scheduled after Nov 29. |
| Deploy workflow | repo | stays enabled. It works until the token expires on Feb 4 2027. |

## Retired drafts and unfinished items (retired, **not** resolved or negative)
- PRs #165 (Nov 30 slate), #169 (Dec 1, framing pair 4) and #172 (Dec 2, framing pair 5) were closed unmerged. Branches are kept.
- Framing test (puzzle vs claim): only pilot pairs 1–3 ran. Pairs 4–5 never posted, so there is no verdict.
- Nov 27 reveal re-cut pilot review, the Nov 29 re-cut baselines, the first-hand count gate (Dec 6) and the search-growth stage (b) / Dec 18 re-read are all **unfinished**.
- Gym Pro ($6/mo, $29 lifetime) was never launched.
- Drive archive gap: the Nov 25/26 MP4s aren't in Drive (connector size limit). Captions and frames are in `docs/video/renders-20261125-26/`. The gap is noted, not rebuilt.

## Closing readout
Wren files a short Nov 29 closing readout on `wren/staged-updates` (`docs/wren-results/`). It labels the cutoff and marks immature data incomplete. That branch is the record, so it does not need the integrator loop to merge it.
