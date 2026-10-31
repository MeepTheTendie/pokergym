# Play Poker Gym site structure audit (Oct 31, 2026, ~4:40 PM CT)

Read-only. Repo MeepTheTendie/pokergym at b85cfca (after `git pull`). Live checks were made with curl against https://playpokergym.com. Screenshots are in /workspace/shots/audit-2026-10-31/.

## Verdict
It is **a website, but split into three separately built sites that share one domain**:
1. The landing page at `/` (web/landing.html, green #0a1a14 palette, Sora font).
2. The trainer app at `/web/` (web/index.html + styles.css, the same green palette, laid out as a phone column even on desktop).
3. 33 guide pages under `/guides/` plus the privacy page (purple #14121c palette, system font, each page with its own inline `<style>`).

These pieces have no shared header, footer, layout or stylesheet. The trainer has no link back to `/`. Wes's "app first, website bolted on" read is accurate. One correction to the premise: the content (33 indexable guides with canonicals and OG tags, plus a sitemap) is already more than most small sites have. What's missing is the frame around it.

## 1. Site map (live, curl)
| URL | Status | Title |
|---|---|---|
| / | 200 | Play Poker Gym — free blackjack, video poker & baccarat trainer |
| /web/ | 200 | Play Poker Gym — free four-game casino trainer |
| /guides/ | 200 | Guides: one decision at a time — Play Poker Gym |
| /guides/<33 slugs>/ | 200 | e.g. "Hit or stand? Three blackjack decisions", "16 against a dealer 10: hit or stand?" |
| /web/privacy | 200 | Privacy and your data — Play Poker Gym |
| /web/privacy.html | 307 → /web/privacy | |
| /go | 302 → /web/?ref=endscreen&utm_content=typed | |
| /about, /privacy, /games, /blog | 404 | |
| /nonexistent-xyz | 404 with an **empty body**, so there is no 404 page | |
| /web/landing.html, /web/harness.html, /web/sw.js | 404 (correctly not shipped) | |
| /robots.txt | 200, allows everything and lists AI bots, points to the sitemap | |
| /sitemap.xml | 200, 37 URLs: /, /web/, /guides/, /web/privacy and 33 guides | |
| /llms.txt, /llms-full.txt | 200 | |
| /web/manifest.webmanifest | 200, id "/web/", start_url "./index.html", **scope "/"**, theme #14121c | |
| /sw.js | 200; registered from web/offline.js:50 as `../sw.js`, so it controls the root scope | |

Each page's meta description is set and distinct (/, /web/, /guides/ checked).

## 2. Structure
- **Build:** scripts/build.mjs copies an allowlist from web/ into dist/web/, copies web/landing.html to dist/index.html, and copies public/ (sitemap, robots, llms, guides). It then generates /sw.js with a precache list. Guides come from `build:guides` (scripts/build-scenarios.mjs, build-index.mjs) and are committed as static HTML in public/guides/.
- **Worker** (wrangler.jsonc, worker/index.js, 189 lines): `run_worker_first` covers /, /go, /web/, /web, /web/index.html, /guides/*, /ingest/*. It handles visit counting (Analytics Engine), the PostHog proxy, web push with KV, a daily cron, and the /go redirect. Everything else is static assets.
- **Style systems:** at least 3.
  - landing.html has one inline `<style>` with 9 CSS vars and 21 hex colors (--bg #0a1a14).
  - styles.css (trainer) has 23 vars and 86 hex colors (--bg #0a1a14). Landing and trainer share the palette by copying values. Nothing is imported, and landing.html links no stylesheet.
  - Guides and privacy use a different purple palette (#14121c, #4a4468, #a9e9bc, #bde7ff, #ffe3a0) with no CSS variables. All 33 guide pages carry inline `<style>` blocks, and **30 of them are distinct** (md5 of the style blocks), so the styles have drifted page by page.
  - The manifest theme_color #14121c matches the guides, not the green landing and trainer.
- **Dead or orphaned files in web/** (no references in the repo): shot-battle*.png (4), shot-classselect.png, shot-map.png, shot-title.png, character-gallery.html. harness.html and harness.png are test-only. None of them ship (build allowlist).
- **history-atlas leftovers:** pokergym.history-atlas.workers.dev is still hard-coded in scripts/itch-browser-test.mjs:19, scripts/installability-browser-test.mjs:10 and automation/PROGRESS.md. `workers_dev: false` in wrangler.jsonc, so the old host is a stale test reference. (The "atlas" hits in app.js are the sprite atlas, which is unrelated.)

## 3. Website basics
- **Shared chrome:** none.
  - Landing: own header with "♠ Play Poker Gym / Open trainer →", 2 navs and a footer linking guides, privacy, GitHub, Ko-fi and email.
  - Trainer (web/index.html): no header nav, no footer element, **no href to "/"**. Its only outbound links are privacy, sitemap, GitHub issue, Ko-fi and its own canonical.
  - Guides: a minimal header ("♠ Play Poker Gym" link to /) and a footer.
  - Privacy (web/privacy.html:73,99): "Return to the free game" points to index.html, which is the trainer, not the site.
- **Trainer → landing:** there is no path. A visitor in /web/ can't reach / or /guides/ without editing the URL.
- **SEO:** titles, descriptions, canonical and og:title are present on /, /web/, /guides/*, /web/privacy. The weak spots are privacy living under /web/, no about page, and an empty 404.
- **Accessibility:**
  - Trainer: one h1 and 16 h2s (web/index.html). Guides: one h1 each.
  - Landing: 0 `<img>` tags (the art is CSS or background), so there are no missing alts, but the mascot has no alt either.
  - Contrast: the dimmed "Continue where I left off" button on /web/ is low-contrast (web-1440.png). I did not run a contrast tool.
- **Mobile vs desktop:** landing and guides reflow properly. On desktop the trainer is a centered ~320px phone column inside 1440px (web-1440.png).

## Screenshots (390x844 and 1440x900)
home-*, web-*, guides-*, guide-bj-*, privacy-*. The 404 shot rendered nothing because the response body is empty.

## 4. Top 5 structural fixes (smallest first)
1. **Navigation links: a trainer "← Home / Guides" link and the privacy return link set to "/".** These are one-line edits. Note that /web/ is in the hook-test funnel, so **do this after Nov 12**. Fixing the privacy link is safe now.
2. **A real 404 page plus /about and /privacy at the root** (redirect /web/privacy → /privacy). This doesn't touch the funnel. The landing-desktop mockup footer is the model.
3. **One shared tokens.css** (one palette and one font, Sora on green #0a1a14 as in mockups-2026-10-31/style.css) imported by landing, trainer, guides and privacy. Delete the purple palette and fix the manifest theme_color. This covers study "Top 5 changes" (design-study line ~100). Guides and privacy can move now. **The landing and trainer change waits until after Nov 12.**
4. **A shared header and footer partial** injected by build.mjs (or build-index.mjs for guides) into every page, with links to Home, Trainer, Guides, About and Privacy. Matches landing-desktop.png. Guides now; landing and trainer after Nov 12.
5. **Per-game hub pages** (/blackjack/, /video-poker/, /baccarat/, /holdem/) that group the existing 33 guides with "how to play" and "practice in the trainer" links, plus a desktop trainer layout (trainer-home-desktop.png, trainer-play-desktop.png) so the app stops looking like a phone column. Hubs can come anytime; **the trainer layout waits until after Nov 12** (PR #16 territory).

Housekeeping, not structural: delete the orphaned shot-*.png and character-gallery.html files, and replace the history-atlas URLs in the two test scripts.
