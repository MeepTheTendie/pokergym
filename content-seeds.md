# content-seeds.md

A seed bank for **GrokBot** (YouTube Shorts, Instagram Reels, TikTok).

Everything here is grounded in the actual decision space of **Poker Gym** — the
browser trainer at playpokergym.com. The trainer's coach computes the exact
expected value of every legal play, so **every "correct answer" in this file can
be re-verified inside the app itself**. When in doubt, play the hand and read the
coach. The app is the source of truth; this file is the writer's room.

> **The one-line thesis to repeat in every video:** the correct play is not the
> play that feels right. It is the play with the best average result — and the
> app will prove it to you, hand after hand.

---

## 0. How GrokBot should use this file

1. Pick a **seed** (a specific decision).
2. Apply a **format** (section 8) and a **hook** (section 9).
3. End on the **turn**: what people get wrong, then the exact answer + why.
4. Send viewers to the **free daily drill** (section 11) so the loop closes.

Never invent numbers. If a video needs an EV, a chart cell, or a hold, pull it
from the app or from a table marked **[verified]** below.

---

## 1. The content math (you will not run out)

You will not run out, because the raw material is not "how many games" — it is
**games × decisions × paytables × formats**. The counts:

| Axis | Size |
| --- | --- |
| Blackjack decisions | ~370 graded spots (hard 5–21, soft A2–A9, 10 pairs, vs 10 dealer upcards) |
| Video poker decisions | **134,459** distinct 5-card deals (the canonical equivalence-class count) |
| Video poker paytables in the app | **4** (Jacks or Better 9/6, Bonus Poker 8/5, Double Double Bonus 9/6, Deuces Wild full-pay) |
| Baccarat / Hold'em | 3 bets / best-five-of-seven spots |
| Fractions of each decision worth a video | hand types, near-ties, mistakes people actually make, "old chart vs new paytable" |

Blackjack alone: ~370 spots. Video poker: 134,459 deals × 4 paytables ≈ **500,000
distinct decisions**, and the correct answer *changes* when the paytable changes
(section 5). That is years of Shorts before a single repeat.

**Rule of thumb for the feed:** 1 decision = 1 video. 1 *pair* of decisions that
look identical = the best video (that's a turn).

---

## 2. The games and paytables (so scripts are accurate)

The app trains four games. Video poker now ships **four selectable paytables**:

| Game | Table | What it changes |
| --- | --- | --- |
| **Blackjack** | 6 decks, dealer **stands on all 17**, double after split, no surrender | the "harsh" chart cells below |
| **Jacks or Better** | 9/6 | the classic; every four of a kind pays 25 |
| **Bonus Poker** | 8/5 | four of a kind pays by rank: Aces 80, 2s–4s 40, 5s–Ks 25 |
| **Double Double Bonus** | 9/6 | four of a kind pays by rank **and the kicker**; Aces+2/3/4 pays 400 |
| **Deuces Wild** | full-pay | twos are wild; adds five of a kind, four deuces, and a wild royal; **no pair pays** |
| **Baccarat** | 8:1 tie | the neutral game; the bet with no decisions |
| **Hold'em** | best five of seven | reading the board, not betting |

The four video poker tables are the **content multiplier**: same deal, different
right answer. See section 5.

---

## 3. What a "seed" is

A seed is one of:

- **A cell** — one situation with one correct play (e.g. "16 vs 10").
- **A dilemma** — two plausible plays where most people pick the wrong one.
- **A lie** — a widely-believed rule that is false under real math.
- **A number** — a single EV/odds stat that reframes the game.

Each seed below is written as: **situation → the popular wrong answer → the
correct answer → the one-line why → hook.**

---

## 4. Blackjack seeds

House rules for the app: 6 decks, dealer stands on all 17, double after split,
no surrender, no hole-card peek. Those rules are *why* several answers below feel
wrong. **[verified — the app's coach grades each of these hits/stands/doubles/splits.]**

### 4a. The "that can't be right" cells

| Situation | Most people | Correct | The why | Hook |
| --- | --- | --- | --- | --- |
| 16 vs 10 | stand ("I'll bust") | **HIT** | standing loses ~77% of the time; hitting loses slightly less | "Everyone stands. Everyone is slightly wrong." |
| 9,9 vs a 7 | split (you always split 9s) | **STAND** | 18 already beats a dealer 7; splitting breaks a winning hand | "You split 9s *except here*." |
| 8,8 vs 10 | stand ("10 is a bust card") | **SPLIT** | 16 is the worst hand in the game; 8 is not | "16 vs 10? Split the 8s. Yes, into a 10." |
| 4,4 vs 5 | split | **SPLIT** (vs 2,3,4 → HIT) | only vs 5 and 6 is splitting better; off a 4 it's a trap | "Only two upcards make 4,4 a split." |
| 10,10 vs 6 | split ("6 busts!") | **STAND** | 20 wins ~85% of the time; breaking it throws away a made hand | "The most profitable hand in blackjack, and people still split it." |
| Soft 18 (A,7) vs 9, 10, A | stand ("18 is 18") | **HIT** | soft 18 is a weak 18; you can't bust | "18 you should hit. 18 you shouldn't. Same 18." |
| Soft 19 (A,8) | double ("free money") | **STAND** | 19 doesn't need help | "There is exactly one soft total you never touch." |
| 12 vs 3 | stand ("dealer 3 might bust") | **HIT** | only 4,5,6 are stand cards for 12 | "12 vs 3 is a hit. 12 vs 4 is a stand. One card apart." |
| 11 vs Ace | double | **HIT** (S17) | the dealer's Ace is too strong to double into | "The one hand you don't double 11 into." |

### 4b. "It felt lucky, so it must be right"

- **The double that isn't.** Doubling soft 18 off a weak card feels strong, but
  off a 9/10/A it's a mistake. *Hook: "Soft 18: double, stand, or hit — depending
  on one card you're ignoring."*
- **The 4,4 trap.** People split 4s vs a 3 out of habit; the chart says hit.
- **Never split tens.** The single most costly "instinct" in the game.

### 4c. Series seed (recurring)

> **"THE CHART HURTS"** — one counterintuitive cell per episode. Open on the
> wrong answer, sit in the discomfort, then reveal why the numbers win.

---

## 5. Video poker seeds — *the multiplier*

The same five cards, **four paytables, four different right answers.** This is
the richest vein in the app. All EVs below are **[verified]** by the coach.

### 5a. The famous one: break four aces to chase a kicker

**Hand:** A♠ A♥ A♦ A♣ + K♠ (Double Double Bonus, 9/6)

- Made hand, hold all five: four Aces, kicker is a King → **160**
- **Correct play: hold only the four Aces, throw the King.** Average **221.28**
  (12 of 47 draws bring a 2/3/4 kicker for 400; the other 35 bring 160).

Under **Jacks or Better** the exact same cards: hold all five, **25**.
Under **Bonus Poker**: hold all five, **80**.

> **Hook:** "You have four aces. The app tells you to throw one away. Here's why."
> **Turn:** the difference between the four paytables on one deal.
> **Payoff:** the app has a paytable selector; flip it and watch the answer change.

### 5b. The kicker rule applied to low quads

**Hand:** 2♠ 2♥ 2♦ 2♣ + K♠

- Hold all five: four 2s → **80** (DDB)
- **Correct play: break it, chase an A/3/4 kicker** → average **100.43**
- Bonus Poker, same hand: hold all five → **40**. Jacks or Better: **25**.

> **Hook:** "Four of a kind. Two of the three quads tables say throw it away."

### 5c. JoB classic: the low pair vs three to a royal

**Hand:** 5♠ 5♥ Q♦ J♦ 10♦ (Jacks or Better)

- Three to a royal (Q-J-10 of diamonds) beats a low pair. Correct hold: the three
  diamonds. *(Both are close — that's the point of the video.)*

### 5d. Four to a royal at any table

**Hand:** K♠ Q♠ J♠ 10♠ + 2♥ (Jacks or Better) → **EV 7.98** [verified].
Even with nothing made, four to a royal is the best hold by a mile.

### 5e. A checklist worth a whole series

For every deal, in order: **made hand? → four to a royal → four to a flush →
three to a royal → low pair vs high cards.** Each step is an episode, and each
step changes under DDB/Bonus.

### 5f. Series seed (recurring)

> **"SAME HAND, FOUR PAYTABLES"** — deal one hand, show all four answers, let
> the comment section pick before the reveal. Repeat weekly with a new deal.

### 5g. Deuces Wild: the table where "a pair" is worth nothing

**Hand:** K♠ K♥ 7♦ 4♣ 9♠ (Deuces Wild, full-pay)

- A pair of Kings is a **paying hand** under Jacks or Better — the coach plays it
  for **EV 1.54**. Under Deuces Wild the same pair pays **0**, and the best hold
  is only worth **EV 0.56**. Nothing you can hold here wins.

> **Hook:** "Same pair. One table pays. The other says throw it in."
> **Turn:** Deuces Wild pays **three of a kind or better only** — the whole
> lower half of the paytable is gone.

### 5h. Deuces Wild's own hands (never seen on the other three)

All **EV [verified]** on the full-pay Deuces table:

- **Four deuces + K♠** → hold the **four deuces**, EV **200**. It out-pays every
  straight flush and sits just behind a *natural* royal (250).
- **One deuce + T♠ J♠ Q♠ K♠** → the deuce fills an Ace for a **wild royal**, 25 —
  not 250. Only a **natural** royal pays the top prize.
- **Two deuces + 5♠ 6♠ 7♠** → hold all five for a made **straight flush**, 9.
  Jacks or Better breaks this into a four-card flush draw (EV 1.15).
- **A deuce + A♠ 3♠ 4♥ 5♦** → the deuce plays as the **two** for a wheel
  straight, A-2-3-4-5, 2.
- **Three deuces + 9♠ 9♥** → the deuces copy the nines for **five of a kind**, 15.

> **Hook:** "The wild card can be anything — including the two you threw away."
> **Payoff:** flip the app to Deuces Wild and the *same deal* grades differently.

### 5i. Series seed (recurring, Deuces)

> **"THE WILD CARD"** — one deal under Deuces Wild, one answer, one wild-card
> hand (five of a kind / four deuces / wild royal) that no other table can make.

---

## 6. Baccarat seeds (the neutral game)

Baccarat is the app's reminder that **sometimes the best move is not to think**.

- **The only decision is the bet**, and the Banker bet is the only one with the
  math on your side (lowest house edge; 5% commission).
- **The Tie bet trap.** It looks like a coin flip; it's the worst bet on the
  table. *Hook: "The bet that looks free and costs the most."*
- **Patterns are theatre.** Banker/Player streaks are independent draws. The app
  grades "did you make the *right bet*", not "did it win".
- **Series seed:** **"THERE IS NOTHING TO LEARN (AND THAT'S THE LESSON)"** — one
  minute on why a game with no decisions is the honest one.

---

## 7. Hold'em seeds (seven cards, five to pick)

- **The board plays.** Sometimes your best five are all on the table.
- **Kicker wars.** Two pair, same two pair, decided by the fifth card.
- **Flush beats straight, always.** The one ranking nobody argues about.
- **Series seed:** **"NAME THE BEST FIVE"** — show seven cards, count down to the
  best five, one combo per episode.

---

## 8. Series bible (pick 3–4 and rotate)

| Series | Format | One episode = |
| --- | --- | --- |
| **THE CHART HURTS** | blackjack cell, cold open on the wrong play | one counterintuitive chart cell |
| **SAME HAND, FOUR PAYTABLES** | video poker, flip the variant live | one deal across JoB/Bonus/DDB/Deuces |
| **BREAK THE QUAD** | DDB kicker drama | one four-of-a-kind decision |
| **COUNT THE OUTS** | draw/straight/flush math | one "how many cards help" count |
| **THE DAILY FIVE** | share the app's daily drill result grid | today's five hands |
| **THE HONEST GAME** | baccarat/no-decision framing | one myth about patterns |

---

## 9. Hook + caption templates

**Hooks (first 3 seconds):**
- "Everyone does X. X is wrong."
- "You have four aces. Throw one away."
- "The chart says *stand*. Watch."
- "This hand has four right answers."
- "You're not bad at this. You're guessing. Here's the math."

**Structure:** wrong answer → sit in it → reveal → the one number that decides it
→ "the app grades every hand in a second."

**Captions (rotate):**
- "The play that feels right vs the play that pays."
- "Same cards. Different paytable. Different answer."
- "You can't beat the house. You can stop beating yourself."

**Hashtags:** `#blackjack #videopoker #cards #strategy #learnontiktok #poker`
(keep to ~5; avoid gambling-promise phrasing).

**CTA (always the same, and true):**
> "Poker Gym is free, no signup, works offline, and it grades every hand you
> play — plus a fresh **Daily Drill** the same for everyone. Link in bio."

---

## 10. A 7-day rotation (never two of the same series back-to-back)

| Day | Series | Seed idea |
| --- | --- | --- |
| Mon | THE CHART HURTS | 16 vs 10 (the most-refused hit) |
| Tue | SAME HAND, FOUR PAYTABLES | four aces + King across all four tables |
| Wed | COUNT THE OUTS | four to a flush vs a low pair |
| Thu | THE CHART HURTS | 9,9 vs 7 (don't split) |
| Fri | BREAK THE QUAD | four 2s + King |
| Sat | THE DAILY FIVE | today's Daily Drill grid |
| Sun | THE HONEST GAME | the Tie bet trap |

Then swap in new cells next week — you have ~370 blackjack cells and ~500,000
video poker decisions to draw from.

---

## 11. The loop that makes it compound

The app has a **Daily Drill**: the same five hands for every player on a given
date, scored into a shareable green/red grid, with spaced-repetition review of
the hands you actually missed. Point every video at it. When the audience plays
the same daily hands and screenshots the grid, the account and the app feed each
other — no paid funnels, no signup wall.

---

## 12. Guardrails

- **No gambling promises.** Never "beat the casino" or "guaranteed wins." The app
  is explicitly not real-money.
- **Frame as skill + math**, not tips to make money.
- **Use the app's numbers.** If you can't verify it in the trainer, don't say it.
- **Age-appropriate tone.** Educational, deadpan, not hype.
- **Correctness over virality.** One wrong chart cell costs more trust than ten
  videos earn.

---

*Generated from Poker Gym's decision space: `src/games/videopoker.js` (variants),
`src/coach/videopoker.js` + `src/coach/blackjack.js` (exact-EV graders),
`src/rpg/drills.js` (authored non-obvious hands), `src/rpg/daily.js` (Daily Drill).*
