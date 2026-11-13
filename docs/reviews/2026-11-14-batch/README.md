# Nov 14 batch: first 3-a-day set (Claude, 2026-11-11)

Under the owner directives on #41: 3 posts a day ([6805870427](https://github.com/MeepTheTendie/pokergym/issues/41#issuecomment-6805870427)) and Claude approving variants within the approved format, with a 12 h Wren/ChatGPT veto ([6805902212](https://github.com/MeepTheTendie/pokergym/issues/41#issuecomment-6805902212)). Rendered by `render_batch.py` (Nov 10 `render_slate.py` plus an optional on-screen URL banner). EVs come from `test/blackjack-helpers.mjs` `bestAction` (6 decks, S17, DAS, no surrender, no peek; per 1 unit), run 2026-11-11.

| Slot (Sat Nov 14, CT) | Job | Tag `c=` | Hand | Coach EVs | Length |
|---|---|---|---|---|---|
| 9:00 AM | HOOK variant: question-first opener ("…Stand?") | `soft18-vs-three` | A♥7♣ vs 3♠ → DOUBLE | double +0.1789 · stand +0.1511 · hit +0.0906 | 13.71 s |
| 12:00 PM | CTA variant: `Play free · playpokergym.com/go` on screen for the whole hand | `eights-vs-ten` | 8♠8♦ vs 10♥ → SPLIT | split −0.4743 · hit −0.5351 · stand −0.5369 | 12.73 s |
| 4:00 PM | BASELINE: approved Revision 1 format, unchanged | `twelve-vs-three` | Q♠2♦ vs 3♣ → HIT | hit −0.2327 · stand −0.2545 | 13.46 s |

Caveat: each job sits in a fixed slot today, so job and time of day are confounded. Rotate slots across days.

Format: 1080x1920, 30 fps, H.264 + AAC, −14 LUFS, `en-US-AndrewNeural`, rules line on every scene, end card "Practice this decision free · playpokergym.com/go". No behavioral or causal claims, no internal labels.

## Captions (Revision 1 fallback CTA; PR #90 not live)

**soft18-vs-three**
- FB: `Soft 18 vs a 3. Stand?` / `Practice this decision free → https://playpokergym.com/reel?src=fb&c=soft18-vs-three`
- IG: `Soft 18 vs a 3. Stand?` / `Practice this decision free — link in bio 👆`
- YT title `Soft 18 vs a dealer 3: stand or double?`; text `Soft 18 vs a 3. Stand?` / `Free drill: playpokergym.com/go`

**eights-vs-ten**
- FB: `Eights against a ten? Still split.` / `Practice this decision free → https://playpokergym.com/reel?src=fb&c=eights-vs-ten`
- IG: `Eights against a ten? Still split.` / `Practice this decision free — link in bio 👆`
- YT title `Pair of 8s vs a dealer 10: split or hit?`; text `Eights against a ten? Still split.` / `Free drill: playpokergym.com/go`

**twelve-vs-three**
- FB: `Twelve against a three? Hit it.` / `Practice this decision free → https://playpokergym.com/reel?src=fb&c=twelve-vs-three`
- IG: `Twelve against a three? Hit it.` / `Practice this decision free — link in bio 👆`
- YT title `Hard 12 vs a dealer 3: hit or stand?`; text `Twelve against a three? Hit it.` / `Free drill: playpokergym.com/go`

## Status
Rendered and reviewed by Claude (contact sheets in this folder). **Not uploaded and not scheduled:** the Drive upload from Claude's session hit a per-call size limit (about 3 MB; the clips are about 7.5 MB each). Upload and scheduling are handed to the crew on #41.
