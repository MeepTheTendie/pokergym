# Poker Gym — Complete Art Handoff for Gemini

**Purpose:** Replace the remaining pixel-art characters and icons in the Poker Gym app
with flat, modern illustrations that match the new dark card-table UI.
**Who this is for:** Gemini (image generation) + a coding agent (integration).
**Everything needed is in this file.** Generate the PNGs, then the coding agent wires
them in using §7.

---

## 1. Project context

Poker Gym (`playpokergym.com`) is a free, mobile-first card-game trainer. Play five
hands of blackjack, video poker, baccarat, or Hold'em; a coach grades every decision.
No real money, no signup, no ads.

The landing page and app chrome were just redesigned: deep felt green (`#0a1a14`),
dark surfaces (`#142820`), gold actions (`#d4a843`), system fonts, white playing
cards with red/black suits, rounded corners.

**The only thing left from the old retro look is the character art** — 4-color
Game Boy-style sprites (`web/assets/characters-v2.png`). We are replacing them with
flat, modern vector-style illustrations.

---

## 2. Where the art appears (so proportions make sense)

| Asset | Screen | Display size | Notes |
|---|---|---|---|
| Trainer portrait | Title screen hero | 118 px (150 px desktop) | Large, front-facing, full body |
| Trainer portrait | "Choose your style" grid | 84 px (96 px desktop) | Must read at small size |
| Trainer portrait | "Your trainer" card | 72 px | Small avatar |
| Master portrait | Battle header | 78 px (96 px desktop) | Waist-up is fine at this size |
| Master portrait | Lesson screen | 84 px | Beside dialogue text |
| Badge icon | Map "Badges" row | 40 px | Circular medallion, simple |
| Mascot | Landing page + app icon | 72 px / 512 px | Card character with dumbbell |

Keep silhouettes bold and uncluttered: these are shown small.

---

## 3. Global style (apply to every character image)

> Flat modern vector-style character illustration for a mobile card-game app.
> Clean rounded shapes, simple cel shading with 2–3 tones per material, no outlines,
> no gradients, no texture, no drop shadows. Full body, front-facing, centered,
> transparent background. Consistent proportions across the set: adult characters
> roughly 7 heads tall, large expressive eyes, friendly expression. Limited palette
> only (below). Must read clearly at 96 px and look good at 512 px. Dark-friendly:
> avoid pure black; use deep desaturated tones. No background scenery, no floor,
> no ground shadow.

**Palette (use only these, plus natural skin tones and white):**

| Token | Hex | Used by |
|---|---|---|
| Gold | `#d4a843` | accents, brass, rings, highlights |
| Green | `#27ae60` | success / hold'em |
| Red | `#c0392b` | hearts, diamonds, warm accents |
| Video poker | `#3498db` | Master Royale |
| Blackjack | `#e67e22` | Master Bust, Dealer |
| Baccarat | `#9b59b6` | Master Neutral, Countess |
| Hold'em | `#2ecc71` | Master River, Grinder |
| Scholar | `#7aa2f7` | Scholar |
| Dark surface | `#142820` | clothing shadows, dark fabric |
| Felt | `#0a1a14` | app background (not drawn in art) |

**Negative prompt (apply to all):**
> pixel art, 8-bit, Game Boy, dithering, retro, low resolution, blurry, jpeg
> artifacts, text, letters, numbers, watermark, signature, background scenery,
> multiple characters, cropped limbs, extra fingers, extra cards, harsh black
> outlines, neon, photorealism, drop shadow.

---

## 4. Asset list — copy-paste prompts

All files: **512×512 PNG, transparent background, centered, full body.**
Save into `web/assets/` with the exact filenames.

### 4.1 Player trainers (title screen, class select, trainer card)

| File | Prompt |
|---|---|
| `trainer-scholar.png` | A studious young card player with round glasses and neat blue-black hair, wearing a tailored violet cardigan over a cream shirt, holding a small fan of playing cards. Calm, focused expression. Accent color blue `#7aa2f7`. |
| `trainer-dealer.png` | A confident card dealer with short brown hair, white shirt with rolled sleeves, and a burnt-orange waistcoat. One eyebrow raised, holding a single card up. Warm, cocky but friendly. Accent color orange `#e67e22`. |
| `trainer-countess.png` | An elegant woman with long flowing dark-blue hair and a gold hairpiece, wearing a regal indigo coat with gold trim and tall boots. Poised, one hand on hip. Accent color violet `#9b59b6`. |
| `trainer-grinder.png` | A street-smart teen in a green hoodie, backwards cap, and backpack, hands in pockets, relaxed but sharp. Accent color green `#2ecc71`. |

### 4.2 Gym masters (battle header, lesson)

| File | Prompt |
|---|---|
| `master-royale.png` | A dapper Victorian gentleman gambler with a curled mustache, emerald-green tailcoat, gold waistcoat, and a top hat, holding a fan of cards. Video poker master. Accent color blue `#3498db`. |
| `master-bust.png` | A brash card sharp in an orange bomber jacket, black beanie, and fingerless gloves, arms crossed, confident smirk. Blackjack master. Accent color orange `#e67e22`. |
| `master-neutral.png` | A pale, aristocratic older man with slicked white hair, a monocle, and a long violet coat with a cane. Stoic, unreadable. Baccarat master. Accent color violet `#9b59b6`. |
| `master-river.png` | A riverboat gambler with a wide-brimmed cowboy hat, long burgundy duster coat, bolo tie, and boots, easy smile, one hand on the hat brim. Hold'em master. Accent color green `#2ecc71`. |

### 4.3 Badge medallions (map "Badges" row)

Flat circular medallions: colored face, thick gold ring, white card-suit symbol.
**No text.** 512×512 PNG, transparent.

| File | Prompt |
|---|---|
| `badge-spade.png` | Flat circular badge medallion, deep blue `#3498db` face, thick gold `#d4a843` ring, a white spade symbol centered. |
| `badge-diamond.png` | Flat circular badge medallion, burnt-orange `#e67e22` face, thick gold `#d4a843` ring, a white diamond symbol centered. |
| `badge-heart.png` | Flat circular badge medallion, violet `#9b59b6` face, thick gold `#d4a843` ring, a white heart symbol centered. |
| `badge-club.png` | Flat circular badge medallion, green `#2ecc71` face, thick gold `#d4a843` ring, a white club symbol centered. |

### 4.4 Mascot (landing page + app icon)

| File | Prompt |
|---|---|
| `mascot.png` | A friendly playing-card character with arms and legs, wearing a red sweatband, flexing one arm like a bodybuilder and holding a small dumbbell in the other. Flat modern vector style, same palette, transparent background, centered, square. |

### 4.5 Optional social image

| File | Prompt |
|---|---|
| `og-v3.png` | Wide 1200×630 flat illustration on a deep felt-green `#0a1a14` background: a clean row of five white playing cards (J♠ J♥ 2♣ 5♦ 9♣), a green-and-red square result grid below them, and a bold gold "POKER GYM" wordmark. Flat vector, no photorealism. (Text allowed here.) |

---

## 5. Consistency workflow (important)

1. Generate `trainer-scholar.png` **first**.
2. For every other character, attach the Scholar as a **style reference** and add:
   > Match the art style, line weight, shading, proportions, and framing of the
   > reference image exactly.
3. Keep identical framing: full body, centered, same head size relative to the canvas,
   feet near the bottom edge with a little margin.
4. All four trainers should share height and body proportions.
5. All four masters should look older / larger than the trainers.
6. Do not add scenery, floors, or shadows.

If the model drifts between images, regenerate the outlier using the first good image
as the reference until the set matches.

---

## 6. Master prompt (paste this first)

> You are creating a consistent set of flat vector-style character portraits for a
> mobile card-game app called Poker Gym. Art direction: [paste §3 global style].
> Palette: [paste §3 palette]. Generate `trainer-scholar.png` at 512×512 with a
> transparent background. Full body, centered, front-facing, no background, no text.
> This image will be the style reference for the rest of the set, so favor clean,
> reusable shapes and a restrained palette.

Then generate the remaining assets from §4, attaching the Scholar as reference.

---

## 7. Integration notes (for the coding agent)

Current state: one atlas at `web/assets/characters-v2.png`, decoded by
`web/characters.js` (4 columns × 3 rows, 96 px frames) and drawn via
`drawArt(canvas, id)` / `drawTrainerBack(canvas, id)`.

**Steps after the PNGs exist in `web/assets/`:**

1. **Rewrite `web/characters.js`** to load individual images instead of the atlas.
   Keep the same exported API (`drawArt(canvas, id)`, `drawTrainerBack(canvas, id)`)
   so `web/app.js` call sites do not change. Map ids:
   - trainers: `scholar`, `dealer`, `countess`, `grinder` → `trainer-<id>.png`
   - masters: `videopoker`, `blackjack`, `baccarat`, `holdem` → `master-<name>.png`
     (`royale`, `bust`, `neutral`, `river`)
   - `drawTrainerBack` can fall back to the front portrait (the back sprite is no
     longer shown anywhere in the new UI).
2. **Badges:** in `renderMap()` (`web/app.js`), the badge loop currently sets
   `d.textContent = gym.badgeGlyph`. Replace with an `<img>` pointing at the matching
   `badge-*.png` (spade/diamond/heart/club), keeping the existing `.badge` sizing and
   `.locked` opacity.
3. **Mascot:** point `web/landing.html`'s `<img src="/mascot.webp">` at the new
   `mascot.png` (or convert to `.webp`). Regenerate `web/icon.svg`/PNGs only if asked.
4. **Build:** `scripts/build.mjs` already copies every `.png` in `web/assets/`, so no
   build change is needed for the new files. Remove `characters-v2.png` from
   `web/assets/` once nothing references it.
5. **Tests:** run `npm test` (322 tests) and `npm run test:itch` (headless mobile /
   offline suite). Both must stay green.

---

## 8. Acceptance checklist

- [ ] 4 trainer PNGs — transparent, consistent proportions, one accent color each.
- [ ] 4 master PNGs — distinct from trainers and from each other.
- [ ] 4 badge medallions — correct suit symbol and accent color, gold ring.
- [ ] 1 mascot — flat style, transparent, reads at 72 px.
- [ ] No text, watermark, background, or extra characters in any character asset.
- [ ] Every asset reads clearly at 96 px.
- [ ] Palette matches §3 (no off-palette neon or pastel drift).
- [ ] After integration: `npm test` and `npm run test:itch` pass.
