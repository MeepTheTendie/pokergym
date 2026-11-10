# PokerGym operating rules

Canonical rules for PokerGym work. This file supersedes conflicting one-line guardrails in `docs/PokerGymControlDoc.md`, the retired `automation/retired/daily-prompt.md`, and ad-hoc agent notes. It applies to PokerGym only.

## Ship path

1. One branch per task. Delete the branch after merge.
2. Open a PR to `main`. The required `test` check must be green before merge.
3. A green PR may be squash-merged by the agent that owns the task. If GitHub blocks only on the required-review or up-to-date rule, the owner/agent may use an admin merge (`--admin`). Never use it to bypass a red test.
4. Deploy only from a merged, green `main` with `npm run deploy`. Wes's 2026-10-28 standing permission covers PokerGym deploys; no extra per-deploy approval is needed.
5. After deploy, check the live URL, report the commit and Worker version, and log the change in `docs/PokerGymControlDoc.md`.

## Non-negotiables

- Never commit or print a credential. The VAPID private key stays out of the repo.
- No paid spend, new accounts in Wes's name, DNS changes, auth changes, or secret rotation without explicit approval.
- No fabricated evidence, fake reviews, guaranteed gambling profits, or real-money wagering.
- Monetization follows `plan.md` (Wes, 2026-11-08): the free trainer stays free forever and nothing free today is ever gated; Gym Pro sells new content only through Ko-fi. Price changes, new paid products, ad spend or a new payment processor need a crew decision logged in the ControlDoc, and anything that spends money or needs a new account needs Wes. (Replaces the Oct 15 "no subscriptions or pricing work" rule.)
- Preserve user work and unrelated files.

## Not gates

- A read-only question does not need a done condition.
- An ambiguous internal optimization gets the highest-value safe option, stated up front; it does not need a formal acceptance list unless it touches production, deletes data, or changes external state.
- A green PR does not need a separate human review when the owner has already granted standing permission; use the documented admin-merge path.
- A PR does not need to be rebased onto every new `main` commit merely to satisfy “up to date”; required tests are the gate.
- `automation/retired/daily-prompt.md` belonged to the daily systemd job, which is retired (Wes, 2026-11-06). It applies to no one.

## Public social caption release gate (Wes, 2026-11-02)

- **Internal experiment metadata must never be published as social copy.** `TEST: pair N, question-first/answer-first`, `TEST`, internal filenames, and similar production markers belong only in the manifest, shared tracker, and UTM values, not in public captions/descriptions/titles/first comments. The user-facing opening must be the approved hook question or statement.
- Before creating/updating/scheduling any social post, remove only nonpublic production metadata from the copy while preserving the approved substantive caption, video, title, link, tracking parameters, posting time, and variant assignment. **Fail closed**: do not schedule an item whose public text still contains a production label. Check every network's final outgoing caption, not merely the source file.
- After bulk scheduling or edits, independently re-read the complete platform-specific queue and verify no `TEST:`/`TEST: pair` prefixes, exact network UTM links, videos, 4 PM America/Chicago schedule, auto-publish and non-draft flags, correct count, and no duplicates. A public-copy error is an escalation-level publishing blocker, not an accepted experimental label.
- Already-published errors require caption edits through an authorized native interface (where available); never delete or repost without owner authorization. The Metricool scheduled-post editing endpoint is **not** evidence of ability to edit a live Facebook/Instagram/YouTube post.

## Crew opinion deadlines (Wes, 2026-11-09)

Wes is not part of crew decisions. Every crew question closes on its own, on a clock.

1. **Two due slots a day: 10:00 AM CT and 6:00 PM CT.** Every vote, ballot, review or "what do you think" posted to the crew names one of them when it is posted: the first slot at least 12 hours away (at least 4 hours if the item is time-critical, said so in the post).
2. **Every question states its default** (what happens if nobody objects). No default stated → the default is "no change".
3. **No due time → the integrator assigns** the next eligible slot and posts it on #41. Nothing stays open without a date.
4. **At the slot, the integrator closes it** with whatever is on record: silence is recorded as "no vote" (not yes, not no), the question's decision rule applies to the votes cast, and if that rule cannot be met the default stands. Then the integrator carries the result out under the standing "if the crew decides and you can do it, do it" rule, and logs it in the ControlDoc Decision Log.
5. **Never take an opinion question, a late deliverable, or a status update to Wes.** Those are settled crew side: late or missing work goes back to its owner on #41 with a new slot. Wes is contacted only for money, accounts/credentials, or something no crew member can fix, once, through Claude, as the smallest owner action.
6. **The live schedule** is the "Opinion schedule" list in the ControlDoc *Current focus*; the integrator keeps it current every run.

## Fix the cause, not the symptom (Wes, 2026-11-09)

Wes's mantra for every agent: **don't fix the symptom, fix the cause.** A problem is not done when the error goes away; it is done when we know why it happened and that reason can no longer produce it.

1. **Every blocker, failure or miss is reported in four parts:** the symptom (what we saw), the cause (why it happened, or "cause unknown"), the action taken, and whether that action is a **cause fix** or a **stopgap**.
2. **Stopgaps are allowed to unblock work, but they are labelled as stopgaps** and the cause gets an owner and a due slot (10 AM / 6 PM CT) in the same post. A stopgap never closes the item.
3. **A problem that happens twice means the cause was not fixed.** The second time, nobody repeats the workaround without also fixing or assigning the cause.
4. **"Flake", "glitch", "harmless" and "one-off" are not causes.** If the cause is unknown, say so and assign finding it.
5. **The integrator applies this to its own work first** and records cause vs stopgap in the #51 ledger.

## Crew returns and the dispatch log (Claude, integrator, 2026-11-10)

From DeepSeek's review of #41, relayed by Wes, live, Nov 10.

1. **`wren/staged-updates` is never a PR head.** The repo auto-deletes merged head branches, and that deleted Wren's return branch four times. The integrator copies her new commits, unedited, onto `claude/land-wren-<date>` from main and merges that copy. If the branch is ever missing, the integrator re-creates it from main and tells Wren on #41. This overrides any older instruction to open a PR from `wren/staged-updates`.
2. **Result files are named by correlation_id:** `docs/<agent>-results/<correlation_id>.md`. Existing comment-id files (`41-<comment id>.md`) stay as they are.
3. **Every #41 / #51 comment starts with its attribution**, `<AGENT>-TASK:` or `<AGENT>-RESULT:` plus `from:` (and "relayed by" when pasted). All agents post from the owner's GitHub account, so the account proves nothing about who wrote a comment.
4. **Any #41 request that names its own deadline and default** (for example KEEP/DROP) goes on the ControlDoc Opinion schedule like a vote, so it is closed at its slot.

## Conflict rule

If two rule sources disagree, this file wins. Update this file and the ControlDoc Decision Log together when the policy changes.
