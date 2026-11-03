# PokerGym operating rules

Canonical rules for PokerGym work. This file supersedes conflicting one-line guardrails in `docs/PokerGymControlDoc.md`, `automation/daily-prompt.md`, and ad-hoc agent notes. It applies to PokerGym only.

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
- No subscriptions or pricing work. The product is free with optional Ko-fi tips.
- Preserve user work and unrelated files.

## Not gates

- A read-only question does not need a done condition.
- An ambiguous internal optimization gets the highest-value safe option, stated up front; it does not need a formal acceptance list unless it touches production, deletes data, or changes external state.
- A green PR does not need a separate human review when the owner has already granted standing permission; use the documented admin-merge path.
- A PR does not need to be rebased onto every new `main` commit merely to satisfy “up to date”; required tests are the gate.
- `automation/daily-prompt.md` applies only to the scheduled systemd job, not to interactive agents.

## Public social caption release gate (Wes, 2026-11-02)

- **Internal experiment metadata must never be published as social copy.** `TEST: pair N, question-first/answer-first`, `TEST`, internal filenames, and similar production markers belong only in the manifest, shared tracker, and UTM values, not in public captions/descriptions/titles/first comments. The user-facing opening must be the approved hook question or statement.
- Before creating/updating/scheduling any social post, remove only nonpublic production metadata from the copy while preserving the approved substantive caption, video, title, link, tracking parameters, posting time, and variant assignment. **Fail closed**: do not schedule an item whose public text still contains a production label. Check every network's final outgoing caption, not merely the source file.
- After bulk scheduling or edits, independently re-read the complete platform-specific queue and verify no `TEST:`/`TEST: pair` prefixes, exact network UTM links, videos, 4 PM America/Chicago schedule, auto-publish and non-draft flags, correct count, and no duplicates. A public-copy error is an escalation-level publishing blocker, not an accepted experimental label.
- Already-published errors require caption edits through an authorized native interface (where available); never delete or repost without owner authorization. The Metricool scheduled-post editing endpoint is **not** evidence of ability to edit a live Facebook/Instagram/YouTube post.

## Conflict rule

If two rule sources disagree, this file wins. Update this file and the ControlDoc Decision Log together when the policy changes.
