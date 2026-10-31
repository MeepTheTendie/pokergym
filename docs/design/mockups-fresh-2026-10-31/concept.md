# Poker Gym — fresh site concept (Oct 31, 2026)

## The one idea: "Every page deals a hand."
Every page shows one real hand of cards as its hero, set like a printed rulebook. The page is cream paper with editorial serif type, and the hand sits on felt. Home deals a Jacks or Better hold. A guide deals the exact decision it answers. The trainer is the same felt panel made playable. The 404 page is a "misdeal." Paper means reading and felt means playing, and the whole site uses only those two surfaces.

## Why this is a website, not an app with a front page
- The trainer, the 33 guides, the drill and the landing page all use one stylesheet (`site.css`) with one header, one nav and one footer. Today the guides use a separate purple palette and have no way into the trainer.
- The information architecture comes from the content that already exists. The guides become game hubs, and each guide links to "Read, then train" on that exact hand. The trainer sidebar links back to "Read first" guides.
- The trainer sits inside the site shell (header, breadcrumb, footer) as a wide two-pane layout, not a 480px phone column.

## Information architecture
Nav: Home · Trainer · Guides · Daily Drill · About · Privacy. There's a persistent "Today's drill →" button in the header, and a bottom tab bar on phones.
- `/` Home: the hero hand, four game tiles, the Daily Drill band, and "how a session works"
- `/guides/` Guides index: four hubs with real guide titles and counts (Blackjack 14, Video poker 5, Baccarat 5, Hold'em 7, Drill 2)
- `/guides/blackjack/` Game hub: how to play (the real rules from src/games/blackjack.js), a basic strategy excerpt, decision-guide cards, and "Train blackjack now"
- `/web/` Trainer: the felt table plus a sidebar (session grid, coach, related guides)
- `/drill/` Daily Drill: five face-down hands, deal, then the share grid
- `/404`: "This page folded"
- About and Privacy use the same shell (not mocked)

## Design tokens
- **Palette:** paper #F5F0E6, paper-2 #ECE4D4, ink #16201B, ink-2 #4A564F, felt #123A2C→#0C2A20 (radial), one accent in brass #B8893A (#D9B672 on felt), card red #A3242B, line #D9CFBC. The stock Flat UI colors are gone.
- **Type:** Fraunces for display (92/52/24, tracking -2%, italic brass for the one emphasized word), Inter for body (17/1.6, lede 20), DM Mono for kickers and labels (12, +14% caps). The repo ships Sora, but Fraunces and Inter would need self-hosting.
- **Spacing:** 4·8·16·24·40·64·104. Sections are 104 apart. Max width 1180.
- **Cards:** 5:7 ratio in CSS, ivory #FFFDF8, radius 9% of width, a soft drop shadow, and serif indices. A held card lifts 12px with a brass ring and a "HELD" label. The back is a diagonal felt stripe.
- **Surfaces:** tiles on #FBF8F1 with a 1px line and radius 14. Felt panels use radius 28.

## Motion principle: "Only cards move."
Type and layout never animate. Cards deal in (stagger 60ms, 220ms ease-out, from the deck position), flip on reveal (the hand-reveal moment from the motion study), and lift when held. After you act, the coach card slides up once. The same Remotion components can render the reels, so the site and the videos match. Respect `prefers-reduced-motion`. (The mockups are static.)

## Placeholders and truth notes
- The drill number, streak and XP values are marked as placeholders. The share grids are labeled "example grid, not real results."
- The basic strategy chart excerpt was drafted from standard 6-deck S17 DAS strategy, and the page marks it as a placeholder. Every cell must be checked against src/coach before it ships.
- No stats, testimonials or user counts are used anywhere.
