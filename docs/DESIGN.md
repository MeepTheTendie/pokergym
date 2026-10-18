# Poker Gym — Design Document

**Version:** 2.0 (implemented)
**Theme:** The Card Academy & Club Lounge — a handheld-RPG training academy and vintage card club for mastering card decisions
**Goal:** Turn a first-time visitor into a daily practitioner who returns tomorrow for the Daily Drill.

---

## 1. Vision & Theme Evaluation

### Why "The Card Academy & Club Lounge" (and not a Martial-Arts Dojo)
Poker Gym's actual art, world, mascot, and soundtrack already define a distinct, cohesive world:
- **Mascot (`web/mascot.webp`):** A playing card in a sweatband curling a dumbbell on green baize felt ("Poker Gym" = working out your card sense).
- **Character & Master Atlas (`web/assets/characters-v2.png`):** Eight custom 16-bit pixel-art characters — four Academy Trainers (**Scholar**, **Dealer**, **Countess**, **Grinder**) and four Gym Masters (**Master Royale** in a Victorian green tailcoat, **Master Bust** in an orange street jacket, **Master Neutral** with a monocle and cane, and **Master River** in a riverboat gambler's duster and cowboy hat).
- **Overworld (`web/world.js`):** A handheld-RPG town with pine trees, footpaths, a pond, and four specialty Gym buildings (`POKER GYM`, `COUNTY FAIR GYM`, `VILLA OAK GYM`, `RIVERSTONE GYM`).
- **Soundtrack (`web/audio.js`):** A late-night Vegas lounge piano trio (`vegas`).

Renaming a riverboat cowboy to "Sensei River" or replacing the four card-suit badges (`♠ ♦ ♥ ♣`) with karate belts clashed with the existing sprites, overworld, and lounge soundtrack. Instead, the unified identity is **The Card Academy & Club Lounge** (inspired by *Pokémon Trading Card Game* for Game Boy Color meets a tactile vintage card room: warm ivory card stock, crimson `♥ ♦` and deep emerald-slate `♠ ♣` suits, brass-trimmed green baize felt, and gold-framed Suit Badges).

### Core Loop
> Open app → see your trainer status (level, badges, streak) → play today's Daily Drill (5 seeded hands across all 4 games, ~2 minutes) → share or challenge a friend with your `🟩🟥` grid → return tomorrow before the countdown hits zero to build your streak.

### Non-Negotiable Constraints
- No real money, no betting, no prizes.
- No subscriptions, no paywalls, no signup.
- No ads, no advertising trackers.
- Progress stays local (`localStorage` + manual text backup).
- First-party analytics only (PostHog via `/ingest`), text inputs masked, session replay enabled.
- Works 100% offline once loaded (`sw.js`).

---

## 2. UX Goals & Success Metrics

| Goal | Metric (PostHog / `npm run scorecard`) |
|---|---|
| First-time visitor plays a hand | `opened_the_trainer` → `game_start` conversion |
| First-time visitor finishes a session | `session_complete` per person |
| First-time visitor completes the Daily Drill | `daily_complete` per person |
| Day-2 return | people with `count(DISTINCT toDate(timestamp)) > 1` |
| Share & challenge loop | `share` events + `ref=share` / `ref=invite` arrivals |
| Channel attribution | % of sessions with non-null `ref` (explicit `?ref=` or `document.referrer` fallback) |

---

## 3. Information Architecture & Screen Flow

1. **Landing (`/`)** — Hero value prop, clickable 5-card example scene, primary CTA (`Start training free →`), Daily Drill preview (`?daily=1`), per-game `Play <game> →` trainer links + recall guides, "How a session works" with direct play CTA, and a sticky mobile bottom CTA bar.
2. **Title (`/web/` `#scr-title`)** — Overworld preview with active trainer sprite, Trainer Card summary (`LEVEL · BADGES · STREAK · HANDS`), `START TRAINING` (or `PLAY TODAY'S DAILY DRILL #N` when promoted), `CHOOSE STYLE`, `CONTINUE`, `DAILY DRILL #N` (visible to all visitors, including first-timers), and `PRACTICE MISSES (N)` weak-spot nudge when blackjack mistakes exist.
3. **Map / The Card Academy (`#scr-map`)** — `TODAY` priority card (resumes unfinished session, launches today's Daily Drill, prompts due spaced-repetition reviews, or recommends the lowest-accuracy game, plus countdown `NEXT IN XH YM` once today's drill is complete), interactive Academy overworld with 4 Gyms, Five-Hand Training launcher (including unlocked Master Drills and Blackjack Weak-Spot Drill), Player Card, Practice Record, and Suit Badge Case (`♠ ♦ ♥ ♣`).
4. **Lesson (`#scr-lesson`)** — Short intro pages spoken by the Gym Master before a player's first session in each game. Tapping `NEXT` / `PLAY!` advances immediately in one tap (never eating a tap on the typewriter).
5. **Battle (`#scr-battle`)** — Master & Trainer across a brass-trimmed green baize table, hand potential gauge, dialogue box, card zones with red/black suits and elevated `HELD ✓` / `PICK ✓` states, optional Coach panel (`ASK COACH`, `WHY?`, `APPLY PLAY`), and sticky action bar.
6. **Session Recap (`#sessionSummary`)** — Appears on completing a 5-hand session: `🟩🟥` per-hand result grid, score & best streak, near-miss prompt on 4/5 runs, first missed decision review, `PLAY AGAIN`, and `CHALLENGE A FRIEND` (`?ref=share&d=<number>`).
7. **Review (`#scr-review`)** — Spaced-repetition mistake notebook (boxes 1 → 2 → 4 → 8 → 16 days).

---

## 4. Visual System

### 4.1 Palette
- **Chrome & Felt:** `--gbc-0: #263c35` (deep club green), `--gbc-1: #526451` (muted sage border), `--gbc-2: #a1b18a` (bevel shadow), `--gbc-3: #edf0d5` (light highlight), `--panel: #f6f5e8` (warm parchment), `--panel-2: #e3e7cc` (secondary panel), brass rail `#b5892e` / `#c89d42`.
- **Playing Cards:** Warm ivory stock (`#fffdf7`), crimson (`#b42336`) for Hearts `♥` and Diamonds `♦`, deep slate-ink (`#1c2e28`) for Spades `♠` and Clubs `♣`.
- **Held / Picked Cards:** Deep emerald back (`#1c332b`), gold top accent (`#c89d42`), `-5px` upward lift, `HELD ✓` / `PICK ✓` badge, and rose-coral (`#ff8e9e`) pip on held red suits so suit color remains distinguishable while held.
- **Suit Badges (`#badgeList`):**
  - Jacks Badge (`♠`, Video Poker): `#2563eb`
  - County Badge (`♦`, Blackjack): `#d97706`
  - Oak Badge (`♥`, Baccarat): `#b91c1c`
  - River Badge (`♣`, Hold'em): `#15803d`
  - Earned badges display a gold border (`#b5892e`) on warm cream (`#fff9e6`).

### 4.2 Touch, Motion, & Audio
- All interactive controls maintain `>= 44px` height, `touch-action: manipulation`, and `user-select: none`.
- Video Poker's `DRAW` button dynamically receives `.primary` while a hand is live (`!handDone`), switching `.primary` to `DEAL` / `NEXT HAND` only after settlement.
- Haptics fire on card hold toggle (`tap: 8ms`) and hand settlement (`correct`, `wrong`, `level`, `badge`), respecting both the Haptics switch and the Sound mute switch.

---

## 5. Implementation Status

### Shipped (Phases 1–3)
- Referrer attribution fallback (`src/rpg/links.js`, `web/posthog-loader.js`) with drift tests.
- Daily Drill exposed to first-time visitors on `/web/` without requiring a prior save.
- Landing page conversion upgrades (clickable hero card scene, per-game `Play →` trainer links, sticky mobile CTA, "Play one hand now →" CTA).
- Rageclick & mobile UX fixes:
  - `btnLessonNext` advances immediately on first tap instead of requiring two taps during typewriter playback.
  - `btnDraw` styled as `.primary` during live Video Poker hands.
  - High-contrast red (`♥ ♦`) vs black (`♠ ♣`) card suits, `-5px` held card lift, `HELD ✓` / `PICK ✓` labels, and `tap` haptics.
  - First-hand Video Poker onboarding hint (`#holdHint`).
- Retention & viral loops:
  - Title-screen Trainer Card (`#trainerCard`) with accurate `levelFromXp(profile.xp).level`, badge count, streak, and hands played.
  - Blackjack weak-spot nudge (`#btnPracticeMisses`) on the title screen.
  - Session recap `🟩🟥` mini-grid, 4/5 near-miss framing, `PLAY AGAIN`, and `CHALLENGE A FRIEND` deep-link (`?ref=share&d=<number>`).
  - Next Daily Drill countdown (`formatDailyCountdown()`) in the daily completion verdict and on the Map's `TODAY` card.
  - Streak milestone callouts at 3, 7, and 14 days.

### Held for Phase 4 (Conditional on Oct 18–29 Scorecard Data)
- Weekly challenge pack expansion (hold until Daily Drill return rate is measured).
- One-time Pro unlock (only after 3+ unprompted player requests).
- Korean localization (evaluate if Korean Instagram traffic continues).
