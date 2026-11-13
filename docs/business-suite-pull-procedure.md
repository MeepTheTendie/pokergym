# Meta Business Suite per post insights pull: owner procedure and automation spec

Source: Wes's own description of his manual steps, November 7, 2026, after he produced
the six Nov 1 to 6 Facebook post insights prints by hand. Recorded by Wren the same day.
Purpose: this procedure is the entire source of the Facebook per post retention data the
connectors cannot return (3 second views, average watch time, retention shape, completion
rate). The crew goal is to run it without the owner, every day it is needed.

## The owner's manual steps (verbatim in substance)

1. Log in to Meta Business Suite.
2. Go to the business dashboard.
3. Click Content Library.
4. Click on the actual creative (the individual post) to open its Post insights page.
5. Ctrl+P, print the screen, save as PDF.
6. Hand the PDF to Wren.

That is the whole procedure. No date range or filter is touched; the insights page is
per post and lifetime to date. The prints Wes produced on Nov 7, 2026 (4:42 to 4:43 PM CT)
came from facebook.com Content Library post insights pages (URL pattern
facebook.com/content/insights/?content_id=...), one PDF per post, two printed pages each.

## Fields each capture must yield (one row per post)

Post ID or permalink, publish time, duration in seconds, views, viewers,
average watch time (as displayed), the timestamp of the largest drop off,
3 second views, total watch time, average percentage watched,
player completion rate (may be absent; record not available, never zero),
reactions, comments, shares, clicks, follows, link clicks state
(a number, or "Insights not available" exactly as shown),
follower versus non follower split, traffic source.

## Automation translation

The manual path is: authenticated desktop Business Suite session, Content Library,
one post insights page per post, capture the page (print to PDF is acceptable and proven;
a structured read of the same page is better where reliable). Cadence: capture each in
scope post when its 72 hour and 7 day read windows fall due, matching the daily stat
run's 72h/7d table; the Nov 7 to 12 test posts are the immediate scope, with their uniform
seven day reads due by Nov 19. Output lands in a fixed location the daily run reads, one
file or row per post per capture, labeled with capture date and the post's age at capture.

Known constraints (already on record): Meta automated collection terms are the account
risk; sessions expire and draw challenges; desktop Business Suite lacks Instagram per
Reel retention (the Instagram connector already covers that side). A session that dies
is a crew problem to solve, routed through Claude as escalation contact; it does not
escalate to the owner unless every crew route has failed and money or an account
decision is genuinely his.

## Operator decision (owner instruction, Nov 7, 2026)

The owner said the three content agents should decide among themselves who runs this
daily, without him. Wren's position: the build stays with the coding side (Beam and
DeepSeek), daily execution is owned by whoever Claude confirms can hold a stable
Business Suite session, and Claude records the decision in the control doc and on the
issue 51 ledger. Wren consumes the output and does not hold the login (owner ruling,
Nov 7, 2026).
