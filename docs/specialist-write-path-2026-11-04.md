> **Historical (marked 2026-11-10).** Written for Grok, who is removed; the CONTROLDOC verbs were never used. Current process: [`OPERATING_RULES.md`](OPERATING_RULES.md) and [`CREW.md`](CREW.md).

# Specialist write path when branch protection blocks a direct push

Date: 2026-11-04. Author: Grok (Poker Gym / Grok Bot). Owner request: open a route for Wren's doc updates without weakening branch protection.

## The constraint, stated as it actually is

`main` on `MeepTheTendie/pokergym` is protected with:

- required status check `test`
- `enforce_admins: true`
- `required_approving_review_count: 0`

The last two matter together. Admins are not exempt, so a direct push is refused for everyone including the repository owner. Reviews are not required, so **any pushed branch with green CI can be merged** without a second human. The only real gate is the `test` workflow.

The repository collaborator list contains exactly one account, `MeepTheTendie`. No other account has write, triage or pull access. So the blocker for a specialist is not approvals — it is that its GitHub identity has no standing to push a branch or open a pull request at all. A permission grant is the one thing we should not do casually, because it would put an agent's write into `main` and into a deploy path.

## Recommended route: the specialist posts, Grok opens the pull request

This keeps every existing control intact. Protection is not relaxed, no new account is added, no token is widened, and nothing an agent writes reaches `main` without the same CI gate as human work.

1. **The specialist publishes its text where it can already write.** In descending order of preference, because availability changed today:
   - A **GitHub issue comment** in this repository. Issues are enabled and the repo is public, so if the specialist's integration can comment on issues, this is the cleanest path and needs no new permission beyond what it already has. This is the route to test first, and it is not yet verified for Wren's integration.
   - Its **Muse-side artifact store**, where Wren's audits already land (see `automation/artifacts/wren/`). Existing behavior, no new access.
   - A **file in Google Drive** in the folder the crew already shares.
2. **It states the intent explicitly, in a fixed one-line header**, so the receiving side never has to guess:
   `CONTROLDOC-APPEND: <section> | <date> | author=<name>`
   followed by the exact text to insert. Two further verbs are accepted: `CONTROLDOC-REPLACE:` with the text to be replaced quoted in full, and `STATUS-APPEND:` for the agent's own Status section.
3. **Grok opens the pull request.** Grok's box holds an authenticated `gh` session as `MeepTheTendie`, and every routine run can push a branch and open a PR. The pull request body quotes the specialist's posted text verbatim and attributes it by name, so authorship stays visible in the record rather than being rewritten into Grok's voice.
4. **CI is the gate, then merge.** `test` must be green. Because zero reviews are required, Grok merges without a second human, which is the same path every other docs change takes.

Worst case latency is one Grok routine fire, which today means roughly an hour if Grok registers the repo-scoped listener described below, and sooner if a run is already in flight.

## Why not the alternatives

- **Add the specialist as a collaborator with write.** It would work immediately, and it is the wrong trade: it grants a standing ability to push branches and open pull requests under an identity that is not a person, and it cannot be scoped to documentation. If the crew ever wants this, it should be a decision Wes makes explicitly, not a workaround adopted to unblock a daily sync.
- **Relax branch protection or exempt an identity from it.** This would restore direct pushes and remove the CI gate from exactly the path that has been most active. The protection was turned on the day before, deliberately. Nothing about a blocked daily sync justifies undoing it.
- **Give Grok a broader personal access token for the specialist to borrow.** This is credential sharing across agent boundaries. It makes the audit trail misleading and puts one credential in two places.
- **Have a specialist commit to a branch under `MeepTheTendie`'s author identity.** This is what happened with at least one recent daily sync commit, and it is why the git log now attributes someone else's work to the repository owner. It works, and it falsifies the record. This document exists partly to stop that pattern becoming the default.

## Verified today, and not

Verified by direct inspection on 2026-11-04:

- `main` protection settings as quoted above, via the repository protection API.
- Collaborator list: one account.
- Issues enabled; repository public.
- `gh` authenticated on Grok's box as `MeepTheTendie`, and able to push a branch and open a pull request (this document is itself the proof: PR #40).
- The only workflow is `.github/workflows/test.yml`, on `pull_request` and `push` to `main`, with `contents: read`. There is no issue-triggered workflow and no agent runner.
- The last ten commits include one docs commit authored as `MeepTheTendie` with a "Daily report sync" message, consistent with a sync landing under the owner's identity rather than its own author.

**Not verified, and required before anyone claims this is solved:** whether Wren's GitHub integration can comment on an issue in this repository. That is the single assumption the recommended route rests on. Until it is tested, the fallback is the Muse artifact store or Drive, which need no GitHub permission at all.

## What to tell a specialist whose push fails

Protection is not going to be relaxed, and that is on purpose. Post the text with the `CONTROLDOC-APPEND:` header where you can write; do not retry the push, do not commit under another identity, and do not ask for a token. The pull request comes from this side.
