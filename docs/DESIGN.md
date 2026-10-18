# Poker Gym — Redesign Spec v3 (Ground-Up)

**Status:** Plan (not implemented)
**Goal:** A modern, mobile-first card decision trainer. Throw out the retro aesthetic. Keep the training content and daily habit loop.

---

## 1. Identity

**Name:** Poker Gym
**Tagline:** Train your card sense. One hand at a time.
**Metaphor:** A gym. You show up, train, track progress, leave. Not a dojo, not a casino, not a retro game.
**Audience:** Mobile-first. People who want to learn card game strategy in 2-minute sessions. Arriving from Instagram/TikTok/Reddit.
**Tone:** Encouraging, terse, no guilt. A broken streak "starts again at one."

### What we're throwing out
- GBC green palette and pixel fonts for body text
- The 7-screen navigation (title → map → gym → lesson → battle → recap → review)
- The "choose your style" gate
- Retro pixel art as the primary visual language
- "Dojo," "belt," "sensei," "lounge" framing
- The lesson system as a mandatory first step
- The overworld map as the primary navigation

### What we're keeping
- 4 games + coaches (videopoker, blackjack, baccarat, holdem)
- Daily Drill (5 seeded hands, all games, shareable grid)
- Streak + forgiveness system
- Mistake review (spaced repetition)
- First-party analytics (PostHog)
- No real money, no signup, no ads, no subscriptions
- Weak-spot drills
- Share loop

---

## 2. Visual System

### 2.1 Palette

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0a1a14` | App background (deep felt green) |
| `--surface` | `#142820` | Cards, panels, windows |
| `--surface-2` | `#1e3a2e` | Secondary surfaces, inputs |
| `--border` | `#2a4a3a` | Borders, dividers |
| `--text` | `#e8f0e8` | Primary text |
| `--text-dim` | `#8fa89a` | Secondary text, hints |
| `--gold` | `#d4a843` | CTAs, streaks, milestones, focus rings |
| `--gold-dim` | `#a07c2e` | Secondary gold |
| `--red` | `#c0392b` | Hearts, diamonds, wrong answers |
| `--black` | `#e8f0e8` | Spades, clubs (on dark bg) |
| `--green` | `#27ae60` | Correct, success |
| `--danger` | `#e74c3c` | Errors, reset |
| `--accent-vp` | `#3498db` | Video poker game color |
| `--accent-bj` | `#e67e22` | Blackjack game color |
| `--accent-bac` | `#9b59b6` | Baccarat game color |
| `--accent-he` | `#2ecc71` | Hold'em game color |

### 2.2 Typography

- **Headings:** System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`), 20–28px, bold, letter-spacing -0.5px.
- **Body:** Same stack, 16px, line-height 1.6. Never below 14px.
- **Labels/buttons:** Same stack, 14px, semibold, uppercase for short labels only.
- **Card ranks/suits:** System font, 24–32px, bold. No pixel fonts anywhere.
- **Daily grid:** Monospace (`ui-monospace`), 20px for the 🟩🟥 characters.

### 2.3 Spacing

- Base unit: 8px. All spacing in multiples of 8.
- Card padding: 16px.
- Section gaps: 24px.
- Tap targets: minimum 48×48px.
- Max content width: 480px, centered.

### 2.4 Components

- **Buttons:** Rounded (8px radius), 48px min height, 16px horizontal padding. Primary = gold fill, dark text. Secondary = transparent, gold border. Disabled = 40% opacity.
- **Cards (playing):** White background, 8px radius, subtle shadow. Red suits in `--red`, black suits in `--text`. Held state: gold border + "HELD" badge + slight lift.
- **Panels:** `--surface` background, 12px radius, 1px `--border` border. No hard shadows.
- **Progress bar:** 8px height, rounded, `--surface-2` track, `--gold` fill.
- **Badges:** Circular medallions (image asset) with the suit symbol, accent color per gym. Gold ring when earned, dimmed when locked. Rendered at 40px.
- **Trainer card:** Compact card with avatar (left), name/level (center), stats (right). Subtle border, no heavy shadow.

### 2.5 Motion

- Card deal: 200ms ease-out, staggered 50ms.
- Hold toggle: 150ms scale + color transition.
- Screen transitions: 200ms fade + slide.
- Streak celebration: scale-up + glow on the streak number.
- All motion respects `prefers-reduced-motion: reduce`.
- Haptics: tap (10ms), correct (20ms), wrong ([40, 60, 40]).

---

## 3. Screen Structure (5 screens)

### 3.1 Home (default for returning users)

- Streak badge + level + belts (compact trainer card)
- Daily Drill hero: 🟩🟩🟥🟩🟩 grid, "Can you get 5/5?", "Try today's drill →", countdown
- Game grid (2×2): each shows game icon, name, level, "Play →"
- Weak-spot nudge (if mistakes exist)
- Review due (if any)
- "Start 5-hand session" (tertiary)

### 3.2 Play (battle screen)

- Header: back button, game name, coach toggle
- Hand potential gauge (collapsible)
- Card hand: large cards, tap to hold/pick
- Action buttons: DRAW/DEAL (VP), HIT/STAND/DOUBLE/SPLIT (BJ), BANKER/PLAYER/TIE (BAC), CONFIRM 5 (HE)
- Coach panel (collapsed by default, expands on tap)
- Pay table (collapsible)

### 3.3 Recap

- Grid, score, best streak, near-miss line
- Review miss, Play Again, Challenge a Friend, Got It
- Feedback + tip links

### 3.4 Review (secondary)

- List of due mistakes, one at a time
- Reveal → Mark Reviewed flow
- Progress indicator (box 1 → 2 → 4 → 8 → 16)

### 3.5 Settings (secondary)

- Sound toggle, haptics toggle
- Backup/restore
- Privacy link
- Install app
- About/feedback

---

## 4. Landing Page Flow

### New structure

1. Hero (above fold): headline, sub, CTA, trust strip
2. Daily Drill preview (above fold on desktop): 🟩🟩🟥🟩🟩 grid, "Can you get 5/5?", CTA
3. What you'll learn (4 cards, horizontal scroll on mobile): each game + "Play →"
4. How it works (3 steps, compact): Learn → Play 5 hands → Review mistakes
5. Final CTA: "Ready for five hands?" + "Start training free →"
6. Footer: privacy, GitHub, email, Ko-fi (simplified)

### Cut from current
- "See the coach in action" screenshot → move to "How it works" as thumbnail
- "Good to know" FAQ → separate `/about` page or collapse to 3 questions
- Long footer → simplify to 4 links max

### Sticky mobile CTA
- Context-aware: "Start training" for new visitors, "Continue daily drill" for returning (detected via localStorage)

---

## 5. Sprites & Characters

> **Authoritative art spec:** `docs/ART-BRIEF.md`. It contains the exact prompts,
> palette, filenames, and integration steps for Gemini. This section is the summary.

### Keep (conceptually)
- 4 player classes: Scholar, Dealer, Countess, Grinder
- 4 gym masters: Royale (videopoker), Bust (blackjack), Neutral (baccarat), River (holdem)
- Game-to-character mapping

### Change
- Redo art as clean, flat, modern illustrations (simple shapes, 2–3 tones, readable at any size)
- One image per character instead of a 4×3 pixel atlas
- Overworld already replaced with a CSS grid map (done)
- Card suits stay Unicode glyphs (♠♥♦♣) styled with CSS, not separate icon files

### Asset list (matches ART-BRIEF.md)

| Asset | Size | Count | Format | Notes |
|---|---|---|---|---|
| Trainer portraits | 512×512 | 4 | PNG (transparent) | `trainer-<id>.png`, flat, one accent each |
| Master portraits | 512×512 | 4 | PNG (transparent) | `master-<name>.png`, distinct silhouettes |
| Badge medallions | 512×512 | 4 | PNG (transparent) | `badge-<suit>.png`, gold ring + suit symbol |
| Mascot | 512×512 | 1 | PNG (transparent) | Card character with dumbbell |
| OG image | 1200×630 | 1 | PNG | Optional refresh (`og-v3.png`) |

### Phase plan for art
- Phase 1 (done): Modern UI chrome and CSS grid map shipped.
- Phase 2 (next): Generate the 12 PNGs with Gemini per `docs/ART-BRIEF.md`.
- Phase 3: Coding agent rewrites `web/characters.js` and the badge renderer to use
  the individual images; `npm test` and `npm run test:itch` must stay green.

---

## 6. What to Throw Out

### Code
- `web/world.js` (pixel-art overworld) → CSS grid map
- `web/sprites.js` (4-color pixel sprites) → modern illustrations
- `web/characters.js` (sprite atlas decoder) → `<img>` or inline SVG
- 7-screen navigation → 5 screens
- "Choose your style" gate → default to a class
- Lesson system as mandatory → optional/skippable

### CSS
- All GBC-specific styling (pixel borders, inset shadows, 4px borders)
- `PressStart2P` font for body text (keep for short labels only, or drop entirely)
- `--gbc-0` through `--gbc-3` variable system → new palette tokens
- `data-class` palette switching → subtle accent color per class

### Copy
- "Dojo," "belt," "sensei," "lounge" — all gone (already reverted)
- "Gym" stays (it's in the name)
- "Master" stays (it's a game term)
- "Badge" stays

---

## 7. What to Keep

### Code
- All game logic (`src/games/*`, `src/coach/*`, `src/rpg/*`)
- Daily drill system (`src/rpg/daily.js`)
- Streak + forgiveness system
- Mistake review / spaced repetition
- Practice summary + recommended practice
- Share/invite links (`src/rpg/links.js`)
- Analytics (PostHog loader, attribution)
- Offline worker (`scripts/offline-worker.js`)
- Build system (`scripts/build.mjs`)

### CSS
- Component structure (buttons, panels, cards) — re-skin only
- Responsive breakpoints (mobile-first, 760px, 1100px)
- `prefers-reduced-motion` handling

### Copy
- Trust strip (free, no signup, no real money, no ads, offline)
- "Earn badges, not bets"
- Coach explanations
- FAQ (move to separate page or collapse)

---

## 8. Implementation Plan

### Phase 1: Modern UI frame (CSS/HTML)
- New palette tokens in `:root`
- New typography (system font for body, pixel font for labels only)
- New component styles (buttons, panels, cards, progress bars)
- Simplified screen structure (5 screens)
- Landing page restructure (daily drill as hero, sticky CTA)
- Keep existing sprites as placeholders

### Phase 2: Screen simplification (JS)
- Home screen: daily drill hero, game grid, trainer card, weak-spot nudge
- Play screen: single hand view, collapsible coach, collapsible pay table
- Recap screen: grid, score, share, play again
- Review screen: card-based mistake review
- Settings screen: sound, haptics, backup, privacy, install
- Remove lesson system as mandatory (make it optional/skippable)
- Remove "choose your style" gate (default to a class)
- Make map the default home for returning users

### Phase 3: Character art (assets)
- Redo 4 trainer + 4 master portraits as modern flat illustrations
- Replace suit glyphs with SVG icons
- Replace overworld with CSS grid map
- Update `drawArt` to use `<img>` or inline SVG

### Phase 4: Polish
- Streak celebration animation
- Card deal/flip polish
- Offline banner
- Accessibility (aria-live, focus management)
- Performance (font loading, image optimization)

---

## 9. Success Metrics

| Metric | Target |
|---|---|
| Landing → Play conversion | ≥ 30% |
| Play → Session complete | ≥ 60% |
| Session complete → Day-2 return | ≥ 20% |
| Daily drill completion | ≥ 40% of active users |
| Share rate | ≥ 10% of sessions |

---

## 10. Open Questions

1. Should we keep the pixel font at all, or go fully modern?
2. Do we need the overworld map, or is a CSS grid of game cards sufficient?
3. Should the daily drill be the *only* thing on the home screen for returning users?
4. Do we commission new character art, or use PixelLab/AI generation?
5. Should we support dark/light mode, or stay dark-only?

---

## 11. Where to find this

- Repo: `docs/DESIGN.md` (this file, v3)
- **Art handoff for Gemini:** `docs/ART-BRIEF.md` (authoritative for images)
- Previous plan: `.opencode/plan/pokergym-1-3-plan.md`
- Previous design: `.opencode/plan/pokergym-design.md` (v1, dojo theme — superseded)
- Marketing: `MARKETING.md`
- Progress: `automation/PROGRESS.md`
