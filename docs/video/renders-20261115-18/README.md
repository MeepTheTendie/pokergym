# Nov 15/17/18 slate renders (Claude, 2026-11-14 ~2:15 PM CT)

Slate `docs/video/slate-20261115-18.md`; veto window Sat Nov 14 10 AM CT closed with no veto (ChatGPT "NO VETO" #41 6863919474; Wren silent). Rendered with `render.py` (copy of `docs/reviews/2026-11-10-slate-renders/render_slate.py`, new clips only). EVs re-checked with `src/coach/blackjack.js` `bestAction` (6 decks, S17, DAS, no surrender):

| Clip | Hand | EVs (coach) | Length | Drive `1 - Ready to Post` |
|---|---|---|---|---|
| Sun Nov 15 `double-18-vs-six` | A♦7♣ vs 6♠ → DOUBLE | double +0.383732 · stand +0.280488 · hit +0.191866 | 14.65 s | `Nov15 double-18-vs-six.mp4` 1GkKFBG_fJfmnuG-gfa6ZQF53Af0Svg-b + `.txt` 168J2JHnr1YD2jB9EMSvlwK5UE7pV_hd3 |
| Tue Nov 17 `split-16-vs-ten` | 8♥8♣ vs K♦ → SPLIT | split −0.474307 · hit −0.535111 · stand −0.536853 | 14.91 s | `Nov17 split-16-vs-ten.mp4` 15bwT8pMTCl89JNwe1xiirbJ5odS-uRhG + `.txt` 16FWt8fYfIfZY7f63N4EAgdk2-hwHZjkE |
| Wed Nov 18 `split-18-vs-nine` | 9♦9♣ vs 9♥ → SPLIT | split −0.081017 · stand −0.185235 | 13.37 s | `Nov18 split-18-vs-nine.mp4` 1GVIusrrsiJ5mBqD3F7aznJgv4mqT6zfK + `.txt` 1lCiCbQTezLakUWGWt2NI4qyLcvA15YeD |

Variable each clip tests (slate): frame-0 claim that sounds wrong ("Double down on 18." / "Split 16 against a ten." / "Break up 18."), hand on screen from frame 0. Drive copies are re-encoded (CRF 23, ≤1.5 Mbps, 0.56–0.67 MB) because the connector refuses calls over ~3 MB; same frames and audio. Captions: `<tag>.txt` (slate fallback wording; no "exact hand"). Metricool could not read the Drive files ("Metricool can't access the Google Drive file … shared as 'Anyone with the link'"), so scheduling went to ChatGPT as a CHATGPT-TASK on #41.
