# Poker Gym — Art Brief for Gemini (image generation)

Hand this whole file to Gemini. It contains a style anchor, a per-asset prompt list,
and integration notes. Generate the assets, then the coding agent will wire them in.

---

## 0. What this is

Poker Gym is a free, mobile-first card-game training app. It just moved from a retro
Game Boy Color look to a modern dark card-table UI. We need new **flat, modern
character art** to replace the old 4-color pixel sprites.

**Deliverable:** transparent-background PNG portraits, flat vector style, on a
consistent palette. No text, no logos, no watermarks, no backgrounds.

**Recommended model:** Gemini 2.5 Flash Image ("Nano Banana") or any current
Gemini image model that supports reference-image editing.

**Workflow:** generate the Scholar first, then reuse it as a **style reference** for
every other asset so proportions, line weight, and shading stay consistent.

---

## 1. Global style (use in every prompt)

> Flat modern vector-style character illustration for a mobile card-game app.
> Clean rounded shapes, simple cel shading with 2–3 tones per material, no outlines,
> no gradients, no texture, no drop shadows. Full body, front-facing, centered,
> transparent background. Consistent proportions across the set: adult characters
> roughly 7 heads tall, large expressive eyes, friendly expression. Limited palette
> only (listed below). Art must read clearly at 96 px and look good at 512 px.
> Dark-friendly: avoid pure black; use deep desaturated tones.

**Palette (use only these, plus skin tones and white/near-white):**

| Name | Hex | Use |
|---|---|---|
| Felt | `#0a1a14` | not used in art; the app background |
| Surface | `#142820` | dark clothing shadows |
| Gold | `#d4a843` | accents, brass, badges, highlights |
| Green | `#27ae60` | success / nature |
| Red | `#c0392b` | hearts, diamonds, warm accents |
| Video poker accent | `#3498db` | Master Royale |
| Blackjack accent | `#e67e22` | Master Bust |
| Baccarat accent | `#9b59b6` | Countess / Master Neutral |
| Hold'em accent | `#2ecc71` | Grinder / Master River |
| Scholar accent | `#7aa2f7` | Scholar |

**Negative prompt (apply to all):**
> pixel art, 8-bit, Game Boy, dithering, retro, low resolution, blurry, jpeg
> artifacts, text, letters, numbers, watermark, signature, background scenery,
> multiple characters, cropped limbs, extra fingers, extra cards, harsh black
> outlines, neon, photorealism.

---

## 2. Asset list

All files: **512×512 PNG, transparent background, centered, full body.**
Name files exactly as shown. Save into `web/assets/`.

### 2.1 Player trainers (used on the title screen and class select)

These are stylized, aspirational versions of the player. Same body proportions,
different silhouettes and one accent color each.

| File | Name | Prompt |
|---|---|---|
| `trainer-scholar.png` | Scholar | A studious young card player with round glasses and neat blue-black hair, wearing a tailored violet cardigan over a cream shirt, holding a small stack of playing cards. Calm, focused expression. Accent color `#7aa2f7`. |
| `trainer-dealer.png` | Dealer | A confident card dealer with short brown hair, white shirt, rolled sleeves, and a burnt-orange vest. One eyebrow raised, holding a single card up. Warm, cocky but friendly. Accent color `#e67e22`. |
| `trainer-countess.png` | Countess | An elegant woman with long flowing dark-blue hair and a gold hairpiece, wearing a regal indigo coat with gold trim and tall boots. Poised, one hand on hip. Accent color `#9b59b6`. |
| `trainer-grinder.png` | Grinder | A street-smart teen in a green hoodie, backwards cap, and backpack, hands in pockets. Relaxed but sharp. Accent color `#2ecc71`. |

### 2.2 Gym masters (gym leaders, used on the map and battle screens)

Larger-than-life mentors. Keep them distinct from the trainers in age and silhouette.

| File | Name | Prompt |
|---|---|---|
| `master-royale.png` | Master Royale | A dapper Victorian gentleman gambler with a curled mustache, emerald-green tailcoat, gold waistcoat, and a top hat. Holds a fan of cards. Video poker master. Accent color `#3498db`. |
| `master-bust.png` | Master Bust | A brash card sharp in an orange bomber jacket, black beanie, and fingerless gloves. Arms crossed, confident smirk. Blackjack master. Accent color `#e67e22`. |
| `master-neutral.png` | Master Neutral | A pale, aristocratic older man with slicked white hair, a monocle, and a long violet coat with a cane. Stoic, unreadable. Baccarat master. Accent color `#9b59b6`. |
| `master-river.png` | Master River | A riverboat gambler with a wide-brimmed cowboy hat, long burgundy duster coat, bolo tie, and boots. Easy smile, one hand on the brim. Hold'em master. Accent color `#2ecc71`. |

### 2.3 Badge icons (map screen, 4 of them)

Flat medallions: a colored circle with a gold ring and a white card-suit symbol.
**No text.** 512×512 PNG, transparent.

| File | Prompt |
|---|---|
| `badge-spade.png` | Flat badge medallion, circular, deep blue `#3498db` face, thick gold `#d4a843` ring, white spade symbol centered. |
| `badge-diamond.png` | Flat badge medallion, circular, burnt-orange `#e67e22` face, thick gold `#d4a843` ring, white diamond symbol centered. |
| `badge-heart.png` | Flat badge medallion, circular, violet `#9b59b6` face, thick gold `#d4a843` ring, white heart symbol centered. |
| `badge-club.png` | Flat badge medallion, circular, green `#2ecc71` face, thick gold `#d4a843` ring, white club symbol centered. |

### 2.4 Mascot (landing page + app icon)

| File | Prompt |
|---|---|
| `mascot.png` | A friendly playing card character with arms and legs, wearing a red sweatband, flexing one arm like a bodybuilder and holding a small dumbbell in the other. Flat modern vector style, same palette, transparent background, centered, square. |

### 2.5 Optional: social / OG image

| File | Prompt |
|---|---|
| `og-v3.png` | Wide 1200×630 flat illustration on a deep felt-green `#0a1a14` background: a clean row of five white playing cards (J♠ J♥ 2♣ 5♦ 9♣), a green/red Daily Drill result grid below, and the gold wordmark "POKER GYM". Flat vector, no photorealism. (Text is allowed here.) |

---

## 3. Consistency instructions for Gemini

1. Generate `trainer-scholar.png` first.
2. Then use that image as a **style reference** for every other character prompt:
   add "Match the art style, line weight, shading, and proportions of the reference
   image exactly."
3. Keep the camera framing identical: full body, centered, same head size relative
   to the canvas, feet near the bottom edge with a little margin.
4. Keep all four trainers at the same height and body proportions.
5. Keep all four masters visually older / larger than the trainers.
6. Do not add scenery, floors, or shadows that imply a ground plane.

---

## 4. File placement & integration notes (for the coding agent)

- Put the raw Gemini output in `web/assets/` with the exact filenames above.
- The current code loads a single atlas at `web/assets/characters-v2.png` via
  `web/characters.js`. Integration work:
  - Replace `characters.js` with a loader that maps each id
    (`scholar`, `dealer`, `countess`, `grinder`, `videopoker`, `blackjack`,
    `baccarat`, `holdem`) to its own PNG.
  - Update `renderSprite` / `drawArt` call sites in `web/app.js` to use the new
    loader. Keep the same canvas sizes so layout does not change.
  - Point the badge renderer in `renderMap()` at the four `badge-*.png` files.
  - Point the landing page mascot `<img src="/mascot.webp">` at the new
    `mascot.png` (or convert to `.webp`).
- Add the new PNGs to the build allowlist in `scripts/build.mjs`:
  the `for (const folder of ['assets', 'fonts'])` loop already copies every
  `.png` in `web/assets/`, so no change is needed there.
- Keep file sizes reasonable: downscale the 512×512 masters to 256×256 if the
  PNG exceeds ~150 KB, or convert to `.webp`.

---

## 5. Acceptance checklist

- [ ] 4 trainer PNGs, transparent, consistent proportions.
- [ ] 4 master PNGs, visually distinct from trainers and from each other.
- [ ] 4 badge medallions with correct suit symbols and accent colors.
- [ ] 1 mascot, matching the flat style.
- [ ] No text, watermarks, backgrounds, or extra characters in any character asset.
- [ ] Every asset reads clearly at 96 px.
- [ ] Palette matches the table above (no off-palette neon or pastel drift).
