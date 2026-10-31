# Poker Gym design study: what makes a website beautiful (Oct 31, 2026)

## Summary
- **Verdict:** Poker Gym is clean and credible, but it isn't beautiful yet. Three things hold it back. The trainer is locked in a 480px column (`max-width: 480px` in styles.css). The accent colors are the stock "Flat UI" set (#2ecc71 / #e74c3c / #e67e22 / #c0392b) instead of an owned palette. And the visual identity, the mascot and cards, plays a small role.
- **The best sites share four habits:** one owned visual idea, a strict type system, a restrained palette with one accent, and showing the actual product instead of describing it.
- **Top 3 changes for Poker Gym:**
  1. Give the desktop trainer a real two-pane layout.
  2. Replace the stock Flat UI colors with a felt-green, gold and cream palette.
  3. Make the hero a large, real, animated hand of cards plus the mascot.

## Method and honesty notes
- I fetched every site on Oct 31, 2026 using WebFetch (rendered text) and curl (raw HTML: title, meta, theme-color, font-family declarations, `<video>`/`<canvas>`/WebGL markers). I did **not** take screenshots, so the visual notes come from the markup plus each site's widely documented, well-known design. Treat them as an informed read, not a pixel audit.
- **Failed or blocked:**
  - nytimes.com: a 771-byte bot wall.
  - aesop.com: Cloudflare "Just a moment".
  - godly.website: empty response.
  - siteinspire.com: Vercel security checkpoint.
  - innerworlds.com: empty response.
  - balatrogame.com: it loaded, but it's an unofficial fan/SEO site, so I replaced it with the official playbalatro.com.

## Part A: beautiful sites across categories

### Product / SaaS
1. **Linear** (https://linear.app): The near-black theme (#08090a) lets a single gradient glow and real product screenshots carry everything. It uses a monospace face for detail (62 `--font-monospace` uses), and tight, consistent spacing reads as engineering precision.
2. **Stripe** (https://stripe.com): The hero uses a `<canvas>`-rendered animated gradient as its signature, set against very plain type. A single bold motion idea sits inside an otherwise calm, grid-disciplined page.
3. **Vercel** (https://vercel.com): The palette is strictly monochrome (theme #000 / #FAFAFA), with a mono font for code and numbers. Pure contrast and alignment do the work that decoration would do elsewhere.
4. **Figma** (https://www.figma.com): Custom figmaSans/figmaMono are used everywhere (41 and 15 declarations). Owning a typeface gives instant brand recognition, and the bright color blocks stay inside a white frame.
5. **Raycast** (https://www.raycast.com): A dark launcher UI is shown big, as if it were the hero art. The product itself is the illustration.
6. **Notion** (https://www.notion.com): Product `<video>` sits next to hand-drawn character illustration, giving the page warmth through a mascot-like drawing style on a white canvas.
7. **Framer** (https://www.framer.com): It pairs Inter Tight with EB Garamond, a deliberate sans/serif contrast. That pairing makes a tech page feel editorial.
8. **Pitch** (https://pitch.com): Large, confident headlines and plenty of whitespace, with real slides shown as the imagery.
9. **Family** (https://family.co): A white page with Inter, soft rounded shapes and playful micro-animation. Its "delight in small motion" is the reference most often cited for app-like polish.

### Brands / hardware / e-commerce
10. **Apple** (https://www.apple.com): Each section has one product, one line and one call to action, with full-bleed `<video>` (3 on the homepage). It's the purest example of restraint and hierarchy.
11. **Teenage Engineering** (https://teenage.engineering): The custom TechnoType face plus Univers Next Thin, a tiny grid and lots of white space. The quirky typography *is* the brand.
12. **Nothing** (https://www.nothing.tech): Off-white (#F4F4F4), a dot-matrix display face and monochrome product photos. One distinctive type motif repeats everywhere.
13. **Rapha** (https://www.rapha.cc): Editorial photography leads and the copy is a manifesto ("it's never just a ride"). Mood comes from the imagery, not UI chrome.

### Editorial
14. **The Verge** (https://www.theverge.com): Loud, saturated color blocks and oversized type in a dense news grid. It proves "beautiful" can mean bold personality instead of minimalism.
15. **Lichess** (https://lichess.org): Not glamorous, but a coherent warm-dark theme (#2e2a24), an icon font, and the live board/puzzle right on the homepage. The beauty comes from function and honesty ("free (really), libre, no-ads").

### Studios / experimental / inspiration galleries
16. **Bruno Simon** (https://bruno-simon.com): A Three.js/WebGL world where you drive a car around the portfolio. Interaction is the content.
17. **Poolsuite** (https://poolsuite.net): A cream (#f9efe4) retro-Mac pastiche with total commitment to one nostalgic mood, so every detail stays on-theme.
18. **Arc** (https://arc.net): Soft sans plus Space Mono accents and warm gradients make a browser feel friendly. (The page now announces Arc is sunsetting on Dec 22, 2026.)
19. **Awwwards** (https://www.awwwards.com/websites/games-entertainment/): The gallery itself flags WebGL/Three.js heavily. Current game/entertainment winners include The Tie-break (Merci Michel, SOTD Sep 25, 2026), Night Drive Racing Game and Overworld Audio (SOTD Oct 15, 2026). The common thread: one immersive interactive moment.
20. **Land-book** (https://land-book.com): It loaded, and it's best used for browsing landing pages by category.

### Games
21. **Monument Valley** (https://www.monumentvalleygame.com): Pastel isometric art fills the page, and the description sells mood ("meditative," "surreal"). The art direction is the website.
22. **Hearthstone** (https://playhearthstone.com): The custom Belwe Bold serif and the "Step Into the Tavern!" voice give it a tavern/fantasy world through typography and copy alone.
23. **Duolingo** (https://www.duolingo.com): Lowercase, friendly headlines ("free. fun. effective."), a saturated owl green and the mascot used big and everywhere. This is the closest analog to Poker Gym.

## Principles of taste (each with examples)
1. **Have one owned idea and repeat it.** Stripe's gradient, Nothing's dot-matrix, TE's TechnoType, Duolingo's owl. Beautiful sites are recognizable in one screenshot.
2. **Show the real thing, big.** Linear, Raycast, Apple and Lichess put the actual product or board in the hero, not a paragraph about it.
3. **One accent color, earned.** Vercel and Linear are almost monochrome, so the one color that shows up means something. Stock palettes (Flat UI, default Tailwind) read as "template."
4. **Typography is the cheapest brand.** Hearthstone's Belwe, Figma's custom sans, Framer's sans + Garamond pairing. Two faces at most, with strict sizes and a clear jump between headline and body.
5. **Whitespace is confidence.** Apple, Pitch and TE give one message per screen. Crowding says you're unsure what matters.
6. **Motion has one job.** Stripe's canvas and Family's micro-interactions: one signature motion, everything else still. Motion that confirms an action (a card flip, a chip stack) beats ambient decoration.
7. **Commit to a mood.** Poolsuite (retro summer), Monument Valley (serene), Hearthstone (tavern). Half-committed themes look cheap.
8. **Use every viewport.** Apple and Linear compose differently for desktop and phone. A phone column centered on a 1440px screen tells desktop users they're an afterthought.
9. **Copy is part of the design.** Duolingo's "free. fun. effective." and Lichess's "free (really)." Short, voiced lines make layouts feel designed.
10. **Mascots go big or go home.** Duolingo's owl is hero-sized and emotive. A small mascot in an empty card is noise.

### Common ways sites fail
- A stock palette or default fonts, so the site looks like a template.
- Everything is the same visual weight, with no hero and no hierarchy.
- Disabled-looking or ghost buttons on the main path, which read as broken.
- Walls of explanatory text where an image or demo would do.
- Motion everywhere, or none at all.
- A mobile layout simply stretched or centered on desktop.
- Status and debug text ("Downloading…") shown to first-time visitors.

## Part B: card-game and casino references
- **Balatro, official** (https://www.playbalatro.com): A dark theme (#141416), a header key-art image and one sentence of voice ("play illegal poker hands… outrageous combos"). Poker cards made thrilling through art direction and copy.
- **GTO Wizard** (https://gtowizard.com): Four autoplaying looped `<video>` product demos, pro-player social proof up top, and Analyze / Study / Practice as three crisp pillars. It's the best poker-trainer reference.
- **PokerStars** (https://www.pokerstars.com): "The home of online poker" followed by "Download. Register. Play." A short three-beat structure, but the page drowns in SEO text. It's a cautionary example.
- **Hearthstone** (above): A card game sold by world and typography.
- **Chess.com** (https://www.chess.com): A warm-dark theme (#312E2B), `<video>`, and one clear module per mode (Lessons / Bots / Puzzles / Watch), each with a single call to action. It's a good model for Poker Gym's four games.
- **Lichess** (above): The live puzzle of the day on the homepage. Poker Gym's equivalent is the Daily Drill.
- **CardGames.io** (https://cardgames.io): Simple and friendly, with named AI opponents (Mike, Lisa, Bill) giving it personality. Visually it's basic (Arial/monospace), so it shows the floor, not the ceiling.

## Poker Gym vs. the principles (fetched Oct 31, 2026)
**Strengths:**
- The voice is good: "Can you get 5/5 today?", the 🟩🟩🟥🟩🟩 grid, and "No signup, no real money, no ads."
- It's honest and calm, like Lichess.
- Theme color #0a1a14 with the Sora display font is a decent base.

**Gaps:**
- The 480px max-width column (principle 8).
- The Flat UI stock accents #2ecc71 / #e74c3c / #e67e22 / #c0392b (principle 3).
- The landing hero is text plus an inline text-card row (J♠︎ J♥︎ 2♣︎ 5♦︎ 9♣︎) instead of a big, real card hand (principle 2).
- The mascot is small (principle 10).
- The trainer homepage stacks many equal-weight sections: style picker, Daily Drill, game picker, practice, record, review, invite, feedback form, Ko-fi and backup (principle 5).
- The dimmed "Continue" button and "Downloading offline practice…" text show up for new visitors (failure modes).

## Top 5 changes for Beam, in priority order
1. **Desktop two-pane trainer.** At ≥1024px, use a wide felt "table" on the left (cards at real size) and the coach/score panel on the right. Keep the phone layout unchanged. This is the single biggest "unfinished" signal right now.
2. **Owned palette.** Replace the Flat UI hexes with tokens:
   - deep felt green (keep #0a1a14 / #173328)
   - one warm gold accent (#ebd07c already exists, so promote it)
   - a cream card face
   - a muted correct green and a brick-red miss

   Use gold only for the primary action.
3. **Hero = real cards + big mascot.** On the landing page, render the J♠ J♥ 2♣ 5♦ 9♣ hand as large designed cards with one signature motion: the two jacks lift as "held" while the coach line types in. The mascot gets reacting at hero size, Duolingo-style. One motion only.
4. **Cut the trainer home to one job.** Show the Daily Drill hero plus four game tiles (Chess.com-style, one action each). Move record, review, invite, feedback, Ko-fi and backup behind the existing "More" area or onto their own screen.
5. **Fix the first-visit rough edges.** Hide "Continue where I left off" when there's no save, instead of dimming it. Move "Downloading offline practice…" into a small toast or a settings indicator. Tighten the type scale to Sora for display and one body face, with three or four sizes.
