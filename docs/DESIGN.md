# Poker Gym — Design Document

**Version:** 1.0 (draft for implementation)
**Theme:** The Dojo — a martial-arts training gym for card decisions
**Goal:** Turn a first-time visitor into a daily practitioner who returns tomorrow for the Daily Drill.

---

## 1. Vision

Poker Gym is not a casino, not a casino trainer, and not a Pokémon clone. It is a **dojo**: a place you show up to train a skill, earn belts, face sensei, and come back tomorrow. The core loop is:

> Open app → see your trainer card (level, belts, streak) → do today's Daily Drill (5 hands, ~2 minutes) → share your green/red grid → come back tomorrow to protect your streak.

Everything in the UI must answer one question: **"Does this make the dojo feel real?"** If yes, build it. If it's collection, content, or gambling-adjacent, skip it.

### Constraints (non-negotiable)
- No real money, no betting, no prizes.
- No subscriptions, no paywalls, no signup.
- No ads, no advertising trackers.
- Progress stays local (browser storage + manual backup).
- First-party analytics only (PostHog), text inputs masked, session replay on.
- Works offline once loaded.

---

## 2. UX Goals & Success Metrics

| Goal | Metric (PostHog / scorecard) |
|---|---|
| First-time visitor plays a hand | `opened_the_trainer` → `game_start` conversion |
| First-time visitor finishes a session | `session_complete` per person |
| First-time visitor tries the Daily Drill | `daily_complete` per new person |
| Day-2 return | people with `count(DISTINCT day) > 1` |
| Share loop | `share` events + `ref=share` arrivals |
| Channel attribution | % of sessions with non-null `ref` |

**North-star:** day-2 return rate ≥ 20% within 30 days of launch.

---

## 3. Information Architecture

### Screens (in order of typical use)

1. **Landing (`/`)** — marketing + entry. Hero CTA → trainer. Daily drill preview.
2. **Title (`/web/` scr-title)** — trainer card summary, Daily Drill button, Practice Misses nudge, Start Training, Choose Style, Continue.
3. **Map / Dojo Floor (scr-map)** — four mats (games), sensei portraits, belts, XP bar, trainer card, practice record, mistake review.
4. **Battle (scr-battle)** — the hand in progress: master/sensei, status, zones (cards), coach, controls.
5. **Class Select (scr-class)** — choose style (grinder, etc.).
6. **Review (scr-review)** — spaced-repetition mistake drill.
7. **Daily result** — grid, share, streak, "come back tomorrow."

### Navigation rules
- Returning users (save exists) land on the **Map**, not the title menu.
- First-time users land on **Title** with the Daily Drill visible and a one-tap start.
- Every screen has a single primary action. Secondary actions are visually demoted.
- Back is always available; nothing is a dead end.

---

## 4. Visual System

### 4.1 Palette (dojo)

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#14121c` | Text, borders, outlines |
| `--mat` | `#0f380f` | Dojo floor, primary green |
| `--mat-light` | `#306230` | Mat highlight, held cards |
| `--belt-gold` | `#ffe3a0` | Belts, focus rings, eyebrows |
| `--panel` | `#ece9f4` | Card surfaces |
| `--panel-2` | `#d8d3e6` | Secondary surfaces |
| `--wood` | `#8b5a2b` | Dojo accents (borders, frames) |
| `--danger` | `#983448` | Red suits, wrong answers |
| `--accent` | `#a9e9bc` | CTAs, success |

Belt colors (per gym):
- Video poker (Jacks): `#7aa2f7` (blue belt)
- Blackjack: `#f8a24b` (orange belt)
- Baccarat: `#c792ea` (purple belt)
- Hold'em: `#6ee7b7` (green belt)

### 4.2 Typography
- **Headings / UI labels:** `PressStart2P` (pixel) at 8–14px. Use sparingly — only titles, buttons, short labels.
- **Body / hints:** system-ui 14–16px. Pixel fonts at small sizes are unreadable; use system font for paragraphs and explanations.
- **Minimum readable size:** 10px for pixel, 14px for system. Never below.

### 4.3 Spacing & touch
- Base unit: 4px. All spacing in multiples of 4.
- Tap targets: minimum 44×44px (WCAG). Cards: 52×74px desktop, 46×68px mobile.
- `touch-action: manipulation` on every interactive element.
- `user-select: none` on buttons and cards.

### 4.4 Components
- **Buttons:** 3px border, hard shadow (no blur), press-down transform. Primary = green fill. Secondary (`.cta.alt`) = outline.
- **Cards (playing):** GBC green tile, 3px inset border, 3px outer border. Held = lifted 6px + `HELD ✓` label.
- **Windows:** 2px border, panel background, 4px radius. Title in pixel font.
- **Belts:** colored square (■) in gym color, 20px, with aria-label "X BELT" / "X BELT (locked)".
- **Trainer card:** compact summary block (level, belts, streak, hands) on title and map.

### 4.5 Motion
- Deal animation: 130ms ease-out, staggered 40ms per card.
- Flash on correct: 520ms green flash.
- Shake on wrong: 520ms.
- All motion respects `prefers-reduced-motion: reduce`.
- Haptics: tap (8ms), correct (15ms), wrong ([30,40,30]), level/badge (longer). Mute switch silences vibration.

---

## 5. Interaction Patterns

### 5.1 First-time onboarding
- Show a one-time hint on the first video poker hand: "TAP CARDS TO HOLD THEM, THEN PRESS DRAW." Auto-hide after 6s; dismiss on first tap; persist in localStorage so it never shows again.
- No multi-step tutorial. The coach explains every decision after it's made — that *is* the tutorial.

### 5.2 Tap feedback
- Every tap: haptic buzz + visual state change (lift, color, or label) within 60ms.
- Cards: `:active` scales to 0.96 and translates 2px.
- Held state: lifted 6px, dark background, "HELD ✓" label.

### 5.3 Session flow
- 5 hands → recap (score, best streak, near-miss line, review miss, Play Again, Share, Got It).
- Near-miss line when `optimal === 4`: "ONE MORE CORRECT WOULD HAVE BEEN A PERFECT RUN."
- Share button: copies/sends invite text + fires `share` event with channel.

### 5.4 Daily Drill
- Visible to everyone (no save required). Tap creates a profile and starts.
- Completion line: "DAILY DRILL #N COMPLETE: X/5 CORRECT. COME BACK TOMORROW FOR #N+1. THE STREAK IS S." Append "STREAK MILESTONE!" at 3/7/14 days.
- Streak forgiveness: one missed day per 7 days (already implemented).

### 5.5 Mistake review
- Spaced repetition (1, 2, 4, 8, 16 days). Wrong retry resets to box 1.
- Weak-spot drill: auto-deals missed blackjack types, most-missed first.

---

## 6. Content & Copy Guidelines

- **Voice:** encouraging, terse, no guilt. A broken streak "starts again at one" — no shame.
- **No gambling language:** never "bet," "win money," "odds of winning." Use "correct play," "best decision," "house edge."
- **Belts, not badges.** "Earn belts, not bets."
- **Sensei, not master.** "Sensei Royale," "POKER SENSEI."
- **Workout, not drill (optional).** "Daily Drill" is fine and recognizable; "Daily Workout" is more dojo. Either works; pick one and be consistent.
- **No pricing language** until unprompted demand. No "Pro," no "unlock," no "premium."

---

## 7. Asset List (for PixelLab / artist)

All sprites: PNG, exact sizes, shared palette (the 4 belt colors + GBC greens + wood).

| Asset | Size | Count | Notes |
|---|---|---|---|
| Sensei portraits | 48×48 | 4 | One per gym. Pixel-art face, dojo robe. |
| Trainer sprite | 48×48 | 4 classes | Already exists; keep. |
| Belt icons | 20×20 | 4 | Colored belt shape, not a square. |
| Map tiles | 48×48 | 4 mats | Tatami/mat texture per gym color. |
| Card suits | 16×16 | 4 | Pixel suit glyphs for the trainer. |
| Landing hero | 960×560 | 1 | Optional; current illustration is fine. |
| OG image | 1200×630 | 1 | Already exists. |

**Palette constraint:** every asset must use only the tokens in §4.1. No anti-aliasing beyond 1px. No gradients in sprites.

---

## 8. Implementation Phases

### Phase 1 — Foundation (done)
- Referrer attribution fallback.
- Daily Drill visible to first-timers.
- Card tap UX (touch-action, haptic, held lift).
- Landing conversion (clickable hero, play links, sticky CTA).
- Dojo labels (belts, sensei, dojo floor, trainer card).

### Phase 2 — Visual polish (next)
- Refine color palette (warmer wood tones for dojo frames).
- Larger body text (system-ui 14–16px instead of 10px pixel).
- Belt icons (replace ■ with actual belt sprites).
- Sensei portraits on map and battle screens.
- Trainer card on title (done) + map.

### Phase 3 — Engagement (after Oct 18–19 data)
- Streak surfacing on title (done) + result screen countdown.
- Share after any session (done).
- Weak-spot nudge (done).
- "One more hand" loop (done).
- Near-miss framing (done).
- PWA daily reminder opt-in.
- Challenge-a-friend deep link.

### Phase 4 — Conditional (only if data supports)
- Weekly challenge (only if Daily Drill alone isn't enough).
- Pro / paid tier (only after unprompted demand).
- Korean localization (if IG traffic confirms Korean audience).
- Leaderboards (privacy + moderation cost — probably skip).

---

## 9. Non-Goals

- No real-money gambling features, ever.
- No subscriptions or paywalls.
- No signup or cloud accounts.
- No collection/grind systems (no 150+ items).
- No leaderboards with strangers.
- No dark patterns (streak-loss guilt, energy timers, pay-to-continue).
- No A/B testing infrastructure at this traffic level.

---

## 10. Open Questions

1. Should "Daily Drill" become "Daily Workout"? (Consistency vs. recognizability.)
2. Belt count: 4 (one per gym) or more granular (white/yellow/green/blue/black per game)?
3. Should the map be the default landing screen for returning users, or keep title → map?
4. Korean localization: worth the effort, or does the English UI serve the Korean IG audience fine?

---

## 11. Where to find this

- Repo: `docs/DESIGN.md` (this file)
- Plan (items 1–3): `.opencode/plan/pokergym-1-3-plan.md`
- Marketing tagging convention: `MARKETING.md`
- Progress log: `automation/PROGRESS.md`
