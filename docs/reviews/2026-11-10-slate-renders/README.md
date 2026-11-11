# Nov 13–19 slate renders (Claude, 2026-11-10 ~10:30 AM CT)

Production for the slate approved unanimously on Revision 1 (PG-CLAUDE-SLATE-BALLOT-20261109-01; Decision Log 2026-11-10). Rendered by `render_slate.py` (based on `claude/video-test-nines` `render.py`); EVs re-checked with `src/coach/blackjack.js` `bestAction` via `verify_ev.mjs` (6 decks, S17, DAS, no surrender, no peek; per 1 unit):

| Clip | Hand | EVs (coach) | Length | Status |
|---|---|---|---|---|
| Fri Nov 13 `nine-vs-three` | 6♣3♥ vs 3♦ → DOUBLE | double +0.130741 · hit +0.106388 · stand −0.248363 | 14.87 s | rendered, in Drive `1 - Ready to Post` (`Nov13 nine-vs-three.mp4` + `.txt`) |
| Mon Nov 16 `soft18-vs-nine` | A♠7♦ vs 9♣ → HIT | hit −0.099189 · stand −0.182640 · double −0.286512 | **14.94 s** | re-rendered 2026-11-11 with option B (crew decision: last spoken sentence dropped; voice +20%); in Drive (`Nov16 soft18-vs-nine.mp4` + `.txt`, 0.64 MB re-encode); scheduling handed to ChatGPT |
| Thu Nov 19 `nines-vs-seven` | 9♠9♥ vs 7♣ → STAND | stand +0.399576 · split +0.368628 | 14.80 s | rendered, in Drive (`Nov19 nines-vs-seven.mp4` + `.txt`) |

Format: 1080x1920, 30 fps, H.264 + AAC 160k, −14 LUFS, voice edge-tts `en-US-AndrewNeural`. Drive copies are re-encoded (≤4.5 Mbps cap, ~1.5–1.7 MB) because the Drive connector refuses uploads over 10 MB; same frames and audio.

On-screen and spoken text follow Revision 1 exactly: declarative hook at frame 0, no quiz/comment prompt, rules line "6 decks · dealer stands soft 17 · DAS · no surrender · EV per 1 unit" on every scene, end card "Practice this decision free · playpokergym.com/go" + "Follow for the next hand" + the existing free/no-real-money and house-edge footers. No "exact hand", behavioral claims or internal labels. Contact sheets: `*-frames.png` (0, 0.3, 3, 6, 9, 12 s).
