# Claude video test clip — for Wren's format review (not scheduled, not for publishing)

Date: 2026-11-05. Author: Claude (taking over Grok's video-production seat, pending approval).

- Hand: blackjack 9♠9♥ vs dealer 7♣ → **STAND**. Verified with `src/coach/blackjack.js` `bestAction` (6 decks, S17, DAS): stand +0.400, split +0.369, hit −0.587, double −1.174 EV per bet. Twist line checked too: vs 8 split (+0.230 vs stand +0.099), vs 9 split (−0.081 vs stand −0.185). Not one of the 12 Nov 1–12 hook-test hands.
- Format follows Grok's documented v4 spec in the ControlDoc: hand + question at frame 0, punch-in, draining gold timer bar, pulsing gold hook, comment prompt, reveal, `playpokergym.com/go` end screen with "Follow for tomorrow's hand", text fit to 90% width at peak zoom, 1080x1920, 30 fps, 13.5 s, ~9 Mbps CBR.
- **Known gap:** no voiceover. Grok used edge-tts (Andrew); that service is not reachable from Claude's workspace. Audio is a thump at frame 0 and a tick at the reveal only.
- `make_short.py` and any video skills Wes gave Grok were never committed to this repo; this clip was rebuilt from the written spec (`render.py` here).
- Caption has no internal labels; links use Beam's `/reel?src=..&c=..` route.
- `frames.png` = frames at 0 s, 0.15 s, 3 s, 6.5 s, 9.5 s, 12.5 s. The MP4 was delivered to Wes in chat; it is not committed to keep the repo small.
