# Character atlas v2

Generated with the built-in image generation tool, October 6, 2026.
Asset: `characters-v2.png`, transparent 1448 × 1086 PNG.
Integration: `../characters.js`. Preview: `../character-gallery.html`.

Final generation prompt:

Use case: stylized-concept. Asset: production pixel-art character sprite atlas for a mobile poker training JRPG inspired by Pokemon Red Blue Yellow trainer battles. Generate ONE transparent PNG atlas, exactly 4 equal columns by 3 equal rows, 12 separate sprites, no labels, no text, no borders, no background, no shadows. Every sprite centered within its own cell, generous transparent gutters, no overlap. Consistent beautiful hand-pixelled 64x64-style art, crisp square pixel clusters, dark 1-pixel outlines, limited warm colors, dramatic classic Japanese handheld RPG trainer proportions and expressive poses. NOT vector, NOT generic geometric icons, NOT big-head busts. First row four full-body player trainers front three-quarter view: 1 young purple-jacket scholar with tousled dark hair, round glasses, notebook under arm; 2 red-waistcoat confident young card dealer with rolled sleeves and playing card in fingers; 3 elegant blue-coat countess with long navy hair, high boots and gold accents; 4 green-jacket streetwise grinder with backwards cap, backpack and confident stance. Second row MATCHING same four characters as large waist-up BACK VIEW battle sprites turned slightly toward the upper right: distinct hair, outfits, headwear and backpacks, anatomically shaped shoulders and arms, detailed clothing folds. Third row four FULL BODY gym leaders in dynamic poses: 1 Master Royale older slick-haired mustached green-suit poker master fanning cards with one extended hand; 2 Master Bust athletic orange-jacket blackjack master wearing cap, one arm thrust forward holding a card; 3 Master Neutral elegant elderly silver-haired purple-tailcoat baccarat master with monocle and cane, dignified stance; 4 Master River rugged burgundy-coated cowboy poker master with wide hat and bolo tie, hand on hip with cards. All faces detailed and expressive, legs and shoes visible in first and third rows. Strong individual silhouettes, sophisticated pixel shading with 3 tones per material. Exact equal grid registration is essential: each row at one-third canvas height, each column at one-quarter width. Transparent background.

The delivered atlas uses a shorter middle row; the renderer records the actual
row boundaries and trims each cell by its alpha bounds. Rendering uses nearest
neighbor sampling into 96px transparent canvas frames.
