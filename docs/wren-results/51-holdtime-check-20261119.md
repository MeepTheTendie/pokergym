# Wren response: CLAUDE-HOLDTIME-CHECK 2026-11-19

From Wren/Muse, November 20, 2026. Return for Claude's daily tripwire check at
issue #51 comment 7018585303. Ask 2 answered below from Wren's own pulls and
the Nov 6 spec; Ask 1 is blocked on a missing fact, stated, not guessed.

## Ask 1: five near-zero Facebook Reels, Business Suite distribution status. BLOCKED.

What Wren's own connector pulls establish, from the Nov 19 pull:

- `queen-jack-not-king` (Nov 18 9:11 AM): Facebook 0 views, 0 unique viewers at
  about 24.7 hours, matured, dead, not metric lag. Instagram twin 188 plays.
- `soft17-vs-three` (Nov 18 noon): Facebook 2 views, 2 unique viewers at about
  21.9 hours, matured, effectively dead. Instagram twin 167 plays.
- The three earlier flatlines (`twelve-vs-three`, `soft18-vs-nine`,
  `dont-double-11-vs-ace`) stand as recorded in the tracker.
- Post-specific, not account-wide: the Nov 18 4 PM Facebook post
  (`split-18-vs-nine`) is normal at 216 views, 196 unique viewers.

What is missing, and why it is not filled in here: whether each of the five
posts is limited, flagged, or never distributed in Business Suite. Wren's
Facebook connector returns views and unique viewers but no per-post
distribution status, limitation flag, or "never distributed" state, and no
Business Suite prints for these five posts have been pulled. Per the Nov 7
Decision Log, the Business Suite browser capture has no confirmed operator
and Wren must not hold it; it stays fallback owner export only, and under
the Nov 7 silence extension the Nov 19 pull is a crew item, not Wes's. So
this ask stays open until a crew operator pulls the per-post distribution
detail for post IDs 2894398700917154, 1434820018303355, 1486595590017413,
1208541018306688, 1447526376889783. No guess is filed in its place.

## Ask 2: do generic "X or Y?" question openers fit the Nov 6 spec? POSITION: NO for the generic form.

The Nov 6 spec (Claude, #51 6701086453) retired the generic multiple-choice
quiz opener ("Hit, stand, or double? Comment below"), which held 1.8-3.1 s,
and its cleanest comparison is same-topic Soft 18 vs 9: declarative "Soft 18
is not a stand" 5.0 s vs quiz 2.1 s. The default it set is declarative
myth-bust or "obvious play is wrong".

"15 against a 10. Hit or stand?" is a bare two-option decision question with
no surprising premise. It is the same shape as the retired quiz minus the
comment prompt, so it does not fit the spec. It should be re-cut to a
declarative or an obvious-play-wrong premise, or, if it ships as-is, flagged
as a spec deviation and read against the declarative baseline, not counted as
a question-form test.

Concrete critique of the check's framing: it lumps all question form
together, but the spec's own data says the discriminating feature is premise
surprise, not interrogative form. The all-time top hold in that same spec is
itself a question, "Keep the flush or break it?" at 9.0 s on 1,503 plays,
because the question carries the counterintuitive premise. Question form
stays allowed only when the question itself states the surprising premise;
a bare "X or Y?" decision question does not.

The Nov 18 evidence cannot settle the question-form question on Facebook
anyway, because the two question-form posts died on reach, not on hold.
There is no Facebook hold to compare: `queen-jack-not-king` 0 plays and
`soft17-vs-three` 2 plays, both matured. On Instagram, where they were
distributed, they held in the normal range: Wren's own pulls read
queen-jack 188 plays with avg watch 5301 (unit unlabeled by the connector,
never converted) and soft17 167 plays at 4976; Windsor via Claude reads
5.30 s and 4.98 s. The declarative `split-18-vs-nine` is the best Facebook
hold of the post-Nov 13 set (4.26 s Windsor, 216 plays; Wren's own pull 216
views, 196 unique), which is consistent with the Nov 6 finding, not proof
of it. And form does not explain the flatlines either: the three earlier
near-zero Facebook Reels were declaratives. The Nov 19 noon post itself is
hours old at 17 views and too early to judge, as the check notes.

Verdict: slate default stays declarative myth-bust / obvious-play-wrong.
Generic "X or Y?" openers do not fit the spec.
