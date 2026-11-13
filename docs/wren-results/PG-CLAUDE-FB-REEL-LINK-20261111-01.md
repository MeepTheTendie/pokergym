# FB Reel caption links: clickable on desktop web (signed in)

Correlation: PG-CLAUDE-FB-REEL-LINK-20261111-01
Filed: 2026-11-12, by Wren/Muse. Task restated in Wes's own words in chat, 2026-11-12 ~1:27 PM CT: check whether links in Facebook Reel captions are actually clickable, given zero Facebook link clicks, and whether that is a Facebook limit. Due Thu Nov 12, 6:00 PM CT.
Scope: read-only. No post, comment, reaction, follow, share, edit, or Metricool change was made. The external site was not opened from the Reel.

## Verdict: CONDITIONAL

The caption URL is a clickable link on signed-in desktop web. It is not plain text there. Mobile-width rendering and the Facebook mobile app were not verified, so this is not a PASS on both surfaces.

Zero Facebook link clicks is therefore not explained by desktop-web caption links being non-clickable. The zero stands as a measured zero (see Insights below), not a missing field. What the zero means for mobile and app viewers is still open.

## Evidence

### 1. Page Insights exposes link_clicks, and it reads 0

Source: Facebook connector, pages posts list, Page Poker Gym (page_id 1448771821646352, profile_id 61595647135851), LAST_28D, as_of 2026-11-12T13:27:41-06:00, fields views, unique_viewers, engagements, engagements_including_clicks, clicks, link_clicks, saves. Ten most recent posts (Nov 2-11, all Nov 1-12 matched-test Reels):

- link_clicks returned with availability available, period lifetime, rendered value 0 on all 10 posts. The field exists; it is not blank or unavailable.
- clicks returned 1 on two posts (Nov 7 p2-QF and Nov 9 p4-QF) and 0 on the other eight, while link_clicks stayed 0 on all ten. Total clicks can be nonzero while link clicks stay zero, consistent with the earlier Other Clicks finding. Total clicks must never be reported as link clicks or website visits.
- Every caption in the set carries a full playpokergym.com URL with fb/reel/hooktest1112 UTM tags. Nov 5-11 captions carry it on line 2 after a Play this exact hand free line; Nov 2-4 captions carry it after the body text, before the hashtags.

Lifetime values in this pull: Nov 11 p6-QF 220 views / 202 unique viewers; Nov 10 p3-AF 240 / 222; Nov 9 p4-QF 1,078 / 1,001; Nov 8 p1-AF 1,251 / 1,129; Nov 7 p2-QF 879 / 807; Nov 6 p6-AF 291 / 271; Nov 5 p5-QF 220 / 204; Nov 4 p4-AF 125 / 113; Nov 3 p3-QF 250 / 236; Nov 2 p2-AF 256 / 231. These are lifetime reads at pull time, not windowed reads, and are listed here only to bind the link_clicks zeros to specific posts.

### 2. Signed-in desktop web: the URL is a link element

Source: live browser check, 2026-11-12 1:28-1:33 PM CT (runtime-measured), Reel https://www.facebook.com/reel/1169996105448967/ (Nov 11 p6-QF, object_id 122110075521521571), viewed signed in after Wes supplied the Facebook login through the secure entry card. Caption confirmed present after clicking See more to expand it; the visible URL text is exactly:

https://playpokergym.com/web/?utm_source=fb&utm_medium=reel&utm_campaign=hooktest1112&utm_content=p6-QF

Element inspection: the URL is a link element (role: link). Hovering underlined it and showed the pointer cursor. Its href is Facebook's redirect wrapper (l.facebook.com/l.php with the URL-encoded playpokergym.com URL plus token parameters), not navigated to. The encoded destination in the href matches the visible playpokergym.com URL above. The full href is not reproduced here: its token parameters are session-specific.

Before expanding, the caption was truncated to the first line plus a See more button. The URL line is therefore behind one extra tap/click on desktop web. The video frame also displays playpokergym.com as on-screen text; that is part of the video image, not a separate link.

### 3. No other tappable link surfaces in the Reel viewer

On the same signed-in desktop view: no Learn more button, no Shop now button, no link sticker, no pinned-comment link (comments area read No comments yet), and no profile website link was shown. Other visible controls were profile links, a Follow button, hashtag links, View insights and Boost reel (owner-side links in the right panel), and Like/Comment/Share controls. None were used. No link surface was created by this check.

### 4. Logged-out view is fully gated (18+)

Before sign-in, Facebook showed a full-page login wall instead of the Reel viewer, with the text Log in to view this 18+ content and It may be inappropriate for people under 18. No caption, video, author, or comment content was visible at all, and closing the initial login dialog did not reveal the Reel. No cookie banner blocked the view; the login wall itself blocked everything. After sign-in, the gate disappeared. This gate affects logged-out viewers only; it does not explain zero link clicks from signed-in viewers, and no claim is made here about what share of Reel viewers arrive logged out.

### 5. Not verified

- Narrow mobile-width rendering: not performed. The browser toolset used has no viewport-width control, so no desktop/mobile rendering difference can be claimed either way.
- Facebook mobile app: not checked. Wren has no access to the Facebook app on any phone, and the app cannot be inspected from here.
- Other individual posts: only the Nov 11 p6-QF Reel was browser-checked. The other nine posts share the same caption template and Page, but their individual rendering was not browser-verified.
- Whether the redirect href token parameters persist across loads: unverified; treated as session-specific.

## What this does and does not settle

Settled for desktop web (signed in): a caption link path exists and is tappable. The Nov 13-19 slate FB caption line-2 link test can therefore read nonzero on desktop web; it cannot only read zero there for rendering reasons. FB link clicks remain a valid diagnostic on that surface.

Not settled: whether the same holds in the Facebook app, where most Reel viewing happens, or at mobile widths. Until the app rendering is checked by someone with the app in hand, do not treat zero FB link clicks as proof of a Facebook-wide platform limit, and do not treat it as proof of audience rejection either. Candidate contributors to the zero, all hypotheses, none verified here: the See more expansion hiding the URL line, app rendering differing from desktop web, viewer intent in a feed scroll, and the small follower base. No causal claim is made.

Prior note corrected in scope: an Oct 27 memory line recorded the caption link as not tappable. That line is superseded for signed-in desktop web by the live check above. It is not confirmed or refuted for the mobile app, which remains unchecked.

## Suggested next step (crew decision, not taken here)

Have a crew member with the Facebook app in hand open the same Reel and record, with exact UI text or a screenshot: whether the URL line shows without expanding, whether it is tappable, and where it goes. Until then, keep FB link clicks as a desktop-web diagnostic only, keep the slate FB line-2 test running unchanged, and do not redesign the CTA path on the assumption that caption links cannot work.
