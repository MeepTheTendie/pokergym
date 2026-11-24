# Renders: Sun Nov 29 slate (Claude, video owner, 2026-11-23 11:09 AM CT run)

Slate `docs/video/slate-20261129.md` (PR #161), closed CHANGE 3–0 at the Sun Nov 22 6 PM CT slot (#41 7089035604). Rendered ahead of the #161 deploy; Metricool scheduling waits for #161 to deploy and the three tags to click-verify (Mon 7:09 PM CT run). #164 (owner-merged SEO, 10:29 AM CT Mon) holds the 3-hour deploy gap until 1:29 PM CT.

`render.py` = `../renders-20261128/render.py` with the new clips. Answer at 7.0 s with the countdown. Noon answer card: "HIT." / "HIT +0.147 · DOUBLE +0.126" / "Dealer stands soft 17 here. Hits soft 17? Double." (crew close: S17 named on screen, in the YT title and the voice). Re-cuts say split "loses less" (never "wins"). Holiday-flagged (Thanksgiving weekend); re-cuts labelled multi-variable.

Media handoff: `media-handoff` commit `f2d12e616f117d71ec1922c0445d2ff7fac3d3d4` (raw URLs pinned to it, all three 200 with matching byte counts). Drive archive copy not attempted (MP4s over the connector's 4.2 MB per-call limit seen Nov 20).

| Clip | sha256 (first 16) | Length | Size | Post time (CT) | Metricool ids |
|---|---|---|---|---|---|
| break-18-recut | ca98f2312834f759 | 17.23 s | 8.6 MB | Sun Nov 29 9:00 AM (IG, YT) | IG 439675651 · YT 439675688 |
| hit-11-vs-ace | 5580a07fdf2dec5a | 16.00 s | 8.0 MB | Sun Nov 29 noon (IG, YT) | IG 439675715 · YT 439675738 |
| eights-vs-king-recut | 30fb04a4fe722001 | 17.31 s | 8.7 MB | Sun Nov 29 4:00 PM (FB, IG, YT) | FB 439675777 · IG 439675797 · YT 439675809 |

Captions per network are in `<clip>.txt`.

**Readback (Mon Nov 23 7:09 PM CT run):** #161 squash-merged `ec50497` 7:12 PM CT, deploy green 7:14 PM CT, Worker `5885d16e-fa19-4878-99a5-70362c962d80`. All three tags click-verified live (logged-out iPhone 13 emulation, `pg_test=1`): `break-18-recut` 9♦ 9♣ vs 9♥; `hit-11-vs-ace` 6♠ 5♥ vs A♦; `eights-vs-king-recut` 8♥ 8♣ vs K♦. Seven Metricool posts created 7:15 PM CT (brand 7282227, America/Chicago), all PENDING, media from the media-handoff URLs pinned to `f2d12e6`; captions and YT titles exactly as in `<clip>.txt`.
