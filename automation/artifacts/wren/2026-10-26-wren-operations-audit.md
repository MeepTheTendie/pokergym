# Poker Gym — Wren 14-Day Operations Audit

**Agent:** Wren (Muse, main chat)
**Audit period:** October 13–26, 2026, inclusive, America/Chicago
**Report date:** October 26, 2026
**Scope:** Wren's own Poker Gym operations only. Other agents' work (Grok rendering, ChatGPT scheduling, Beam/DeepSeek site code) appears only where it touches Wren's inputs, outputs, or dependencies.
**Method:** Cron run records, saved cron bodies, daily memory logs, local goal workspace files (snapshot, experiment tracker, control-doc state), the repo control doc (Wren Status section and Decision Log), and the assignment's own evidence rules. No tool-call ledger exists in this environment, so exact API operation counts are estimated from fixed job sequences and labeled inferred, never counted.
**Labeling:** Every operational claim is marked **[verified]**, **[inferred]**, or **[unknown]**. Verified means a record (run log, file, commit, or doc entry) was read during this audit. Inferred means a reasonable conclusion from verified records. Unknown means no accessible record settles it; unknown is never reported as zero.
**Read-only:** This audit changed nothing except the delivery of this report itself (repo save + control doc link, as the assignment directs). No scheduler, content, code, credential, or purchase was touched.

## Headline verdict

Wren's Poker Gym operation in this period is two scheduled jobs plus chat-driven analysis, all running inside the Muse chat environment — not a portable program. The scheduled jobs are reliable (11 of 11 executions succeeded, attempt 1, no retries) **[verified]**. The work that actually consumes owner time is not the scheduled jobs; it is the human routing layer around them: Wes copy/pasting between agents, Wes uploading exports and screenshots that no API can supply, and verification that stops at connector boundaries (Metricool, Drive, YouTube Studio, Business Suite) and must be completed by relay or by Wes himself. A VPS running T3 Code can absorb the scheduled data pulls with integration work, but it cannot absorb the chat surface, the Meta OAuth linkage, or the owner-supplied data. Migration is therefore hybrid by construction, not a lift and shift.

A convention conflict found during this audit: `automation/ARTIFACTS.md` states artifacts under `automation/artifacts/` are local and gitignored by design. This assignment directs a repo save under `automation/artifacts/wren/` plus a control doc link. This report follows the assignment (created via the repo API, so it exists in the repo regardless of gitignore) and flags the conflict: a future local-clone workflow may treat this path as ignored, so the control doc link and this chat delivery are the durable pointers. The index row was added per the same convention.

## 1. Date-by-date activity table

Times are America/Chicago. "Auto" = cron worker execution under Wren's job definitions. "Chat" = interactive main-chat work. Durations for cron runs are recorded run spans (finished minus started, UTC timestamps from run records), not active compute time.

| Date | Tasks (Wren) | Trigger | Tools used | Produced / changed | Outcome | Waited on | Auto / Chat | Duration | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Oct 13 | None recorded in accessible logs | — | — | — | — | — | — | Unknown | Daily log has 0 Poker Gym lines; see missing records |
| Oct 14 | None recorded | — | — | — | — | — | — | Unknown | Same as Oct 13 |
| Oct 15 | None recorded | — | — | — | — | — | — | Unknown | Same as Oct 13 |
| Oct 16 | None recorded | — | — | — | — | — | — | Unknown | Same as Oct 13 |
| Oct 17 | None recorded | — | — | — | — | — | — | Unknown | Same as Oct 13 |
| Oct 18 | None recorded | — | — | — | — | — | — | Unknown | Same as Oct 13 |
| Oct 19 | None recorded | — | — | — | — | — | — | Unknown | Same as Oct 13 |
| Oct 20 | None recorded | — | — | — | — | — | — | Unknown | Same as Oct 13 |
| Oct 21 | Created daily stat report routine; verified Instagram link; diagnosed Facebook unlinked (empty `me`, pages 403); handled connect link flow with Wes; verified PostHog connection with real queries; verified repo-sync wiring; created experiment tracker, baselines, snapshot | Owner instruction (routine kill order, then new routine authorized); owner link action | Cron tools; instagram-cli; facebook-cli; PosthogQuery.py; GithubRepo.py; filesystem | Cron `poker-gym-daily-stats` (daily 09:47 CT); tracker/baselines/snapshot files; MEMORY.md updates | Succeeded, except Facebook link initially failed (Wes retry errored, then Wes completed it) | Wes (Meta link click; evening reporting update) | Chat | Unknown (no run record; chat session) | Daily log Oct 21 (33 Poker Gym lines); cron definition; helper files dated Oct 21 |
| Oct 22 | Two daily report executions (manual 09:40 + scheduled 09:47, late pull ~10:25); created CanonicalDashboard.md; midday change check (first); evening metric-scare response (4 PM panic vs 8:55 PM matured 511 views) | Schedule (daily report, midday check); owner instruction (canonical numbers order); owner panic (chat) | instagram-cli; facebook-cli; PosthogQuery.py; GithubRepo.py | Reports delivered; CanonicalDashboard.md; snapshot + tracker updates; Wren Status entries | Succeeded (both report executions; reason for two executions unrecorded **[unknown]**) | None for scheduled runs; Wes for canonical order | Auto + Chat | Daily runs ~36 min and ~35 min spans; midday 43 s | Cron runs 5b3919ed, 6c6e1a8f, 073f3451; commits 45e17a1, 87b25fb, b1ca355 |
| Oct 23 | Daily report; midday check; engagement analysis (liker breakdown, Wes screenshots); typed-path decision logged; E3 checklist work | Schedule; owner instruction; owner screenshots | instagram-cli; facebook-cli; PosthogQuery.py; GithubRepo.py | Report; tracker updates; Wren Status; Decision Log typed-path entry | Succeeded | Wes (screenshots, bio confirmation) | Auto + Chat | Daily ~19 min span; midday 164 s | Cron runs b92b459c, d053de21; commits dc97e541, 973287eb |
| Oct 24 | Daily report; midday check (material: v3 swap closed, message sent); narrative state-of-play report; anomaly investigation (Oct 24 morning post, "published late" framing corrected same day); morning-slot standardization decision logged | Schedule; owner instruction; owner export | instagram-cli; facebook-cli; PosthogQuery.py; GithubRepo.py; FB export CSV (owner upload) | Report; state-of-play doc; tracker updates; Wren Status; correction logged | Succeeded; one Wren error corrected same day (late-publish claim) | Wes (export, Account Quality context later) | Auto + Chat | Daily ~12 min span; midday 287 s | Cron runs 1be54308, af6caef5; files/poker-gym-state-of-play-2026-10-24.md |
| Oct 25 | Daily report; midday check (material: v4 repick verified, log only under quiet period); three-moves approval handling + logging; evening distribution pull + verdict (morning-specific); goal/growth/volume analysis | Schedule; owner approval (three moves); owner questions | instagram-cli; facebook-cli; PosthogQuery.py; GithubRepo.py; FB export CSV (owner upload) | Report; tracker updates; Wren Status; three-moves Decision Log entry | Succeeded | Wes (three approvals, Business Suite check, reactor invites) | Auto + Chat | Daily ~6 min span; midday 72 s | Cron runs 1934a81d, 5dc9e994; commits c95e5d6, 79fefba |
| Oct 26 | Daily report (old long format; format feedback then cron rewrite to takeaways + readback verification); midday check (log only); read 3 FB exports + full video export + YouTube zip; Hopper/Christopher Hardy correction; drafted ChatGPT YouTube message; FB live pulls (6:27 PM: v4 opener 62 views / 9 unique); hold vs reverse guidance; step-back order logged; this audit | Schedule; owner uploads; owner questions; owner assignment (audit) | instagram-cli; facebook-cli; PosthogQuery.py; GithubRepo.py; CSV parsing; filesystem | Report; cron body rewrite; tracker entries (export reads, YT read, action items, Oct 26 evening pull, hold decision, step-back); Wren Status; this report | Succeeded; one Wren error owned same day (leading with harshest number vs win, corrected to wins-first) | Wes (uploads, corrections, decisions) | Auto + Chat | Daily ~9 min span; midday 58 s; chat work spans afternoon/evening, exact durations unknown | Cron runs d9bcf988, e8183e3c; commit b98c2cd; user files Sep-28 to Oct-26 exports, Content_2026-07-28_2026-10-26_PokerGym.zip |

Notes on the table:
- Oct 13–20 "none recorded" is a statement about accessible records, not a claim that nothing happened **[unknown]**. Wren's Poker Gym lane (report routine, PostHog access, repo sync) is first verified Oct 21 **[verified]**. The project itself started Oct 6 (repo initial commit 50138bc) **[inferred from repo history via prior read; commit listing unavailable to this audit, see §7]**.
- Oct 22 has two daily report executions. The run records do not state why (retry, manual test, or duplicate) **[unknown]**. No duplicate chat delivery was recorded as a problem.
- Plans and suggestions are excluded above. Examples of excluded non-actions: the joint PostHog dashboard spec (open, unbuilt), the November 1–8 E2 allocation (ChatGPT proposal only, unscheduled), the /go redirect deploy (Beam code, pending deploy), and the Oct 27 review findings (due Oct 27, not yet written at audit time).

## 2. Recurring workflow inventory

### W1. Daily stat report (genuinely recurring)
- **Frequency/trigger:** Daily 09:47 America/Chicago, cron `poker-gym-daily-stats`, owner goal `poker-gym-daily-stat-reports`, delivery to main chat. Created Oct 21, 2026 **[verified]**.
- **Sequence:** (1) Read snapshot + experiment tracker. (2) Read repo control doc, Current focus block first. (3) Instagram: accounts → profile → 28d analytics → metric cards → posts (limit 10) → 7d account insights (attempted once). (4) Facebook: pages list → match Poker Gym Page → account-insights LAST_7D + LAST_28D (all metrics) → posts list LAST_28D (limit 10, full fields). (5) Tag check on new posts (ref + utm_content vs planned creative; Oct 21 contamination flagged). (6) Experiment progress: A/B (Oct 22–25), E1 (Oct 26–Nov 1), E2 (Oct 30–Nov 8), E3 (Oct 26–Nov 8). (7) PostHog: ~4 HogQL queries (persons, game, events, referrer) against US project 670990; canonical first-touch buckets; visitors/players/completers/returns/D1/7-day; instrumentation coverage line; probe/test exclusion. (8) Compose chat report (takeaways format since Oct 26; prior format was full tables). (9) Overwrite snapshot, update tracker, append Wren Status entry to control doc + commit, refresh Current focus block. (10) Append dated memory log.
- **Inputs:** Prior snapshot, tracker, control doc state, live connector data, owner-uploaded exports/screenshots when provided that day (not guaranteed inputs).
- **Tools/permissions:** instagram-cli, facebook-cli (Meta Accounts Center OAuth), PosthogQuery.py + read-only PostHog key, GithubRepo.py + GitHub token (read/write), local filesystem, Muse cron worker, Muse chat delivery.
- **Expected outputs:** One chat report; updated snapshot; updated tracker; one control doc commit; one memory log entry.
- **Verification:** Deltas vs prior snapshot; PostHog bucket rows reconcile to visitor total; tag check per new post; commit sha recorded (except Oct 24 run, sha unrecorded **[unknown]**); run record status succeeded.
- **Dependencies:** ChatGPT/Metricool for scheduling truth (adopted, not verified); Grok/Beam for site instrumentation truth (adopted, flagged on conflict); Wes for exports/screenshots and for any bio/pin confirmation.
- **Typical failures/recovery:** Repo read failure → proceed, note one line, never invent doc contents (per job body; no occurrence in period **[verified: no repo failure in run records]**). PostHog failure → report section as failed, no carried-forward numbers (no occurrence in period). Instagram 429 → stop IG calls, report what exists (no occurrence in period). Facebook unlinked → one line, no numbers, no retry through another route (occurred Oct 21 pre-routine, resolved by Wes linking).
- **Unattended:** Yes for data pulls + file writes + commit; chat delivery is a Muse surface, not a VPS surface (see §5). Interpretation (takeaways, verdicts) is assistant judgment, not a deterministic script.

### W2. Midday control-doc change check (genuinely recurring)
- **Frequency/trigger:** Daily 13:47 America/Chicago, cron `poker-gym-midday-sync`, read-only on the repo. Created Oct 21/22 (first run Oct 22) **[verified]**.
- **Sequence:** Read control doc + blob sha → compare to recorded state sha → if unchanged, end silently, no writes → if changed but immaterial (formatting/typos), update state sha, end silently → if material (Decision Log, Open Questions, ChatGPT/Grok Status, experiment/scheduling/decision changes), update state file + fold into tracker + (outside quiet period) send one short chat message; during quiet period (Oct 25–31, extended by Wes to Nov 1) send no message, fold into next morning report.
- **Inputs:** Control doc, state file, tracker.
- **Tools/permissions:** GithubRepo.py read + get (read-only in this job), filesystem.
- **Expected outputs:** Usually nothing (silent). On material change: updated state + tracker entries (+ message outside quiet period).
- **Verification:** Sha comparison; materiality test in job body; attribution to the logging assistant, never treated as verified ground truth.
- **Dependencies:** ChatGPT/Grok log entries (the watched content).
- **Failures/recovery:** None recorded in period; all 5 runs succeeded. A missed material change would surface at most one day late in the next morning report (inferred risk, no occurrence).
- **Unattended:** Yes, fully, including its silence rule. Only the optional chat message needs a chat surface.

### W3. Export and screenshot analysis (event-driven, recurring in practice, not scheduled)
- **Frequency/trigger:** Owner upload in chat (FB publish-time exports Oct 24, 25, 26; FB video lifetime export Oct 26; YouTube Content zip Oct 26; Insights screenshots Oct 23, 26).
- **Sequence:** Parse CSV/zip → reconcile against connector numbers → compute derived measures (3-second rate, retention curves, view-to-visit contrasts) → log findings to tracker → report takeaways in chat.
- **Inputs:** Owner files. No API path exists for this data in Wren's environment (retention curves, hook/hold rates, distribution scores, account status) **[verified: stated to Wes Oct 26 after connector review]**.
- **Tools/permissions:** Shell + Python CSV parsing, filesystem, chat. No connector covers it.
- **Expected outputs:** Tracker entries + chat takeaways.
- **Verification:** Cross-check against connector pulls and prior exports (e.g., distribution scores revise between exports — treated as snapshots, not finals).
- **Dependencies:** Wes (file upload; screenshots only he can capture).
- **Failures/recovery:** Blank-view rows in YouTube table (recent videos) are reported as blank/near-zero, not asserted as exact zero; stale-connector risk is mitigated by stating as-of times.
- **Unattended:** No. Requires an owner upload to start and assistant judgment to interpret. The parsing step alone is scriptable; the pipeline is not.

### W4. Anomaly investigation (event-driven, happened twice in period — not a schedule)
- **Occurrences:** Oct 24–25 Facebook dead mornings; Oct 26 YouTube death + Oct 26 evening FB cliff (v4 opener).
- **Sequence:** Owner flag or report anomaly → pull live connector numbers → compare against controls at matched age → rule out publishing (via ChatGPT Metricool readback), account penalty (via Wes Account Quality check), and creative (via A/B controls) → verdict with expiry (next report/review) → log to tracker + control doc.
- **Inputs:** Connector pulls, owner exports/screenshots, ChatGPT readbacks, Wes direct checks.
- **Tools/permissions:** Same as W1 plus chat investigation.
- **Dependencies:** ChatGPT (Metricool truth), Wes (Business Suite / Account Quality — connectors cannot see these).
- **Failures/recovery:** Oct 24 "published late" framing was wrong and corrected same day after the control doc showed a 10:00 AM schedule; Oct 26 "half yay" framing was corrected same day to wins-first. Correction pattern is same-turn ownership, not silent edits.
- **Unattended:** No. Judgment + owner-only checks.

### W5. Relay drafting (event-driven, recurring in practice)
- **Occurrences in period:** Oct 26 ChatGPT YouTube message (delivered to Wes, assumed sent per standing send rule). Prior relay pattern (ChatGPT/Grok messages pasted by Wes) is established but individual relays in Oct 13–25 are not enumerated in accessible records **[unknown count]**.
- **Sequence:** Wren drafts a paste-ready message (question + evidence + specific asks) → Wes pastes it to the other agent → other agent replies to Wes → Wes relays or the control doc carries it.
- **Inputs:** Wren's findings + the question.
- **Tools/permissions:** Chat only.
- **Dependencies:** Wes as the router (every hop).
- **Unattended:** No. This is the single largest manual coordination cost (see §6.6).

### W6. Oct 27 review findings (one-off, due, not yet executed at audit time)
- **Due:** Wren findings in control doc by ~12:30 PM CT Oct 27: D1 returns since Oct 22 noon deploy + retention comparison of new opening group vs Oct 22–25 baseline, held as hypothesis until numbers show it. Plus reconciliation items: unfurl-bot settlement, Beam vs PostHog Daily Drill discrepancy.
- **Status at audit time:** Not started; Oct 26 v4 opener data is one post at 2.5 hours (62 views / 9 unique at 6:27 PM Oct 26) **[verified via live pull]**. Not counted as completed work.

### Genuinely recurring vs once-only
- Genuinely recurring: W1, W2 (daily, verified across 5–6 executions each).
- Recurring in practice but event-driven: W3, W5.
- Once/twice in period: W4 (two anomaly arcs), W6 (one-off due item), CanonicalDashboard creation (Oct 22, one-off + refreshes in later reports), report-format rewrite (Oct 26, one-off), state-of-play narrative (Oct 24, one-off).
- Killed in period, not recurring: book hunt sweep, Monday reply watch, proactive background surfacing (all killed Oct 21 by Wes; must not be recreated).

## 3. Agent-to-agent dependency map

Channel key: CD = repo control doc (each agent edits only its own section; Decision Log newest-first, decider named). CHAT = main chat via Wes. CRON = scheduled worker output. RELAY = Wes copy/paste.

| From → To | Content | Channel | Owner relay? | Duplication / conflict / automatable? |
|---|---|---|---|---|
| ChatGPT → Wren | Scheduling truth: Metricool 18/18 PENDING/verified, v3/v4 swap readbacks, brand 7282227, E2 suffix plan, bio/pin unverified notes, probe-traffic rule | CD (ChatGPT Status, Decision Log) + CHAT via Wes | Yes when urgent; otherwise CD only | Wren cannot verify Metricool independently — readback trust, not verification. Automatable only if Metricool API access is added (see §5). |
| Grok → Wren | Video renders (v2/v3/v4), queue/buffer status, unfurl-bot flag (12 to remove), recap instrumentation notes, Oct 27 review inputs | CD (Grok Status, Decision Log) | No (CD is the channel) | Unfurl-bot removal unapplied because its full definition could not be read through the helper — a tooling gap, not a disagreement. Automatable if the definition is published in the doc. |
| Beam/DeepSeek → Wren | Site deploys (Worker versions, instrumentation boundaries, /go redirect code, explicit-entry fix), funnel corrections, Daily Drill discrepancy (0 completions claimed vs PostHog 1) | CD (Decision Log) + site code | No | Direct conflict open at audit time: Beam 0 vs PostHog 1 daily_complete, flagged for Oct 27 reconciliation, not silently resolved. No automation removes a definitional conflict; needs a human/assistant decision. |
| Wren → ChatGPT | Tag-check results, PostHog numbers, experiment reads, Oct 26 YouTube Studio questions (via Wes-pasted message) | CD (Wren Status) + RELAY | Yes (YouTube message) | Numbers are single-sourced from Wren (canonical file) by design; duplication is in re-presentation (snapshot + tracker + CD + chat), not in computation. |
| Wren → Grok | Oct 27 review findings (due), retention baselines, Hard 12 study ask (logged Oct 26 for November batch) | CD (Wren Status) | No | Pending delivery; not yet a handoff. |
| Wren → Wes | Daily reports, anomaly verdicts, drafts, decisions, options | CHAT + CRON delivery | N/A (Wes is the endpoint) | Report content is written 5 ways per run (chat takeaways + snapshot + tracker + CD entry + memory log) — see §6.6 item 5. |
| Wes → Wren | Approvals, decisions, exports, screenshots, corrections, Account Quality / Business Suite results, subscriber correction (Hopper/Christopher Hardy) | CHAT + file upload | N/A | Every item in this row is owner manual work that no API replaces (see §4). |
| Wes → ChatGPT/Grok | Scheduling/rendering instructions, approvals | CHAT (their own sessions) | N/A | Wren does not observe these sessions; their contents reach Wren only via CD or Wes relay **[unknown completeness]**. |
| ChatGPT → Grok, Grok → ChatGPT | Media re-picks, queue plans, caption files (Drive) | Drive + CD | Sometimes via Wes | Wren does not touch Drive; Drive state reaches Wren only as logged claims. |

Duplicated work found: (1) Wren re-derives PostHog totals every run from raw queries while Beam's scorecard script computes overlapping funnel numbers — two number sources, reconciled by the canonical file discipline, not by shared code. (2) ChatGPT and Wren both report scheduling/post status (ChatGPT from Metricool, Wren from connectors) — complementary, not duplicated, but the seam is where "verified" gets blurry (ChatGPT readback vs Wren connector check). (3) Oct 22 duplicate report executions (reason unrecorded).
Unnecessary communication found: midday messages before the quiet period (Oct 24 message) were replaced by log-only + next-report folding with no loss, per Wes's order — evidence that the midday message step was optional. The Oct 26 report was delivered in the old long format because the worker ran before the format change — a same-day ordering artifact, not a structural duplication.
Handoffs that could be automated: CD sha watch (W2) is already automated; Metricool readback → Wren verification is the largest automatable seam (needs Metricool API); export upload → parse is automatable only after the upload step, which stays manual.

## 4. Owner involvement

Necessary strategic decisions and approvals (Wes as decider; durations unknown — no time tracking exists for any of these):
- Oct 21: killed all routines except the daily report; authorized the daily report; authorized the midday check; completed the Meta link after a retry error.
- Oct 22: ordered the canonical numbers file; killed friend invites permanently; confirmed bio status pathway (bio fixed, confirmed Oct 23).
- Oct 23: confirmed "I fixed those bios last night" (bio IMPLEMENTED); approved typed path playpokergym.com/go.
- Oct 24: ordered the quiet period (no Wren-initiated contact through Oct 31); standardized morning posts to 8:00 AM CT; set the Oct 27 review and Halloween verdict as decision points.
- Oct 25: approved all three dead-morning moves (his Business Suite check, ChatGPT Metricool verification, reactor invites); decided volume waits until after Halloween; accepted wait vs mess framing.
- Oct 26: changed report format to takeaways-only (cron rewritten + verified); issued wins-first correction; corrected subscriber count (2 of 3 are himself + Hopper); requested the ChatGPT YouTube message; ordered hold vs reverse (hold, with Oct 27/28 tripwire); ordered step-back till Sunday Nov 1 (crew handles; Oct 27 review among crew, needs-wait till Sunday); assigned this audit.

Routine manual coordination (not strategy; the automatable-adjacent cost):
- Uploading files: 3 FB exports (Oct 24, 25, 26), 1 FB video lifetime export (Oct 26), 1 YouTube Content zip (Oct 26), Insights screenshots (Oct 23, Oct 26), reactor profile checks (Oct 25).
- Direct checks only he can do: Account Quality (Oct 25, clean), Business Suite distribution detail, reactor invites (Oct 25, 3 sent), bio/pin confirmation (Oct 23).
- Relaying: pasting Wren drafts to ChatGPT (Oct 26 YouTube message, assumed sent per send rule); relaying ChatGPT/Grok findings into chat when the control doc lags.
- Approvals that gate sends: every connector send and every LinkedIn-adjacent action requires per-message approval (standing rule; no Poker Gym send by Wren occurred in period — Wren's Poker Gym writes are repo commits + chat reports, not social sends).

Time estimates: none are evidenced. Chat timestamps bound some sessions (e.g., Oct 26 afternoon/evening analysis spans hours of wall-clock conversation) but active owner minutes are not recorded. All durations in this section are **[unknown]** by the assignment's rule, not estimated.

## 5. Infrastructure and execution requirements

"Exists" means verified working in Wren's current environment during this period. "Portable" means the same access could exist on a VPS without re-architecture. A Muse chat feature is not assumed portable.

| Workflow | Persistent process? | Browser / shell / fs / code? | API / MCP connections | Exists now? | Subscription vs API | T3 Code / OpenCode / API / outside? | Secrets, resources, permissions |
|---|---|---|---|---|---|---|---|
| W1 daily report pulls | No (cron-dispatched worker, minutes per run) | Shell + fs + code (Python helpers, CSV/JSON parsing). No browser used for Poker Gym. | instagram-cli (Meta Accounts Center OAuth); facebook-cli (same); PostHog HogQL via helper; GitHub API via helper | Yes, all four, verified in runs | Muse environment (no separate billing evidenced); PostHog US cloud project 670990 (billing unknown); GitHub token (no billing evidenced); Meta OAuth (no billing) | Pulls: T3 Code scripts via API (PostHog, GitHub) + new Meta integration. Interpretation + chat delivery: stays in Muse (outside VPS). | PostHog personal key, read-only scope, secure store (value never in files/chat). GitHub fine-grained token, read/write to MeepTheTendie/pokergym, secure store. Meta: NO portable key held — OAuth linkage belongs to this Muse environment and does not transfer; a VPS needs its own Meta app, Page tokens, and any review Meta requires. |
| W1 repo sync + snapshot/tracker | No | Shell + fs + code | GitHub API via helper | Yes | As above | T3 Code script (git/API) | GitHub token as above. Local workspace paths become a VPS volume or repo checkout. |
| W2 midday watch | No (daily cron, ~1–5 min) | Shell + fs | GitHub API read via helper | Yes | As above | T3 Code cron + script, fully | GitHub read token (could be read-only; current token is read/write). |
| W3 export/screenshot analysis | No | Shell + code (Python CSV/zip); screenshot reading needs vision | None (files arrive via chat upload) | N/A (no API) | N/A | Parse: T3 Code script. Upload + vision judgment: outside (owner + assistant) | Owner files contain Page/video IDs and performance data; no secrets. |
| W4 anomaly investigation | No | Shell + code + chat | Same as W1 + ChatGPT readback + Wes direct checks | Partially (Wren's side yes; ChatGPT/Wes sides no) | As above | Reasoning: assistant (Muse or T3 agent). Owner-only checks: outside, always | Account Quality / Business Suite: Wes's own authenticated sessions; no agent credential exists. |
| W5 relay drafting | No | Chat only | None | Yes (chat) | Muse chat | Outside (Muse chat) by definition | None. |
| W6 Oct 27 findings | No | Same as W1 | Same as W1 | Yes | As above | Same split as W1 | Same as W1. |

Key portability findings:
- The two scheduled jobs are Muse cron workers, not scripts. Their bodies are long natural-language instructions (the daily body is several thousand words) executed by an agent, not a deterministic program. Porting them to T3 Code means converting instructions into code + prompts, not copying files. The deterministic parts (connector calls, HogQL, sha compare, file writes) are a minority of the body by text but a majority of the value; the judgment parts (takeaways, verdicts, conflict flags) do not port as code.
- Meta access is the binding constraint. Everything else Wren does (PostHog queries, GitHub reads/writes, file parsing, scheduling) has a direct API path. Meta does not, in Wren's hands: no Page token is held, no Meta app exists in evidence, and connector reads can register as new-device login alerts on Wes's accounts (observed behavior, standing caution). Any VPS plan that assumes "Facebook/Instagram pulls keep working" without a Meta integration project is wrong.
- No Poker Gym workflow in this period required a browser, a persistent process, a GPU, or significant compute. Run spans (6–36 min daily, 1–5 min midday) are dominated by agent reasoning and sequential reads, not computation. Resource requirements on a VPS are therefore minimal (small VM, cron/systemd, Python, git) — the cost is integration and auth, not hardware.
- Secrets inventory (values never stored in files or chat by Wren): PostHog read-only key, GitHub fine-grained token, Meta OAuth linkage. Credential hygiene open item: a PostHog key and a GitHub token were each pasted in chat once after secure-form setup; Wren did not store the pasted values; rotation via secure forms only remains open at Wes's convenience. A VPS migration must re-issue, not copy, these credentials, and must scope the GitHub token to the pokergym repo and the PostHog key to read-only.

## 6. Quantitative summary

Counts are actuals only where a record supports them. Everything else is unknown, not zero.

- **Tasks completed per day (Wren, Poker Gym):** Oct 13–20: none recorded (unknown, see §1). Oct 21: setup bundle (routine creation, connector verification, PostHog verification, repo-sync verification, tracker/baselines) — counted as 1 setup day, task split unrecorded. Oct 22: 2 report executions + 1 midday check + CanonicalDashboard + evening metric response = 5 items. Oct 23: report + midday + engagement analysis + typed-path logging = 4. Oct 24: report + midday + state-of-play + anomaly investigation + correction = 5. Oct 25: report + midday + three-moves handling + evening pull + goal/growth/volume analysis = 5. Oct 26: report + format rewrite + midday + 5 file analyses (3 FB exports, 1 video export, 1 YT zip) + Hopper correction + ChatGPT message + FB live pulls + hold/reverse guidance + step-back logging + this audit = 12 items. Daily task counts for chat work are enumerated items, not a ledger count **[inferred from records]**.
- **Automated vs manually initiated:** Automated (cron): 11 executions (6 daily, 5 midday), all succeeded, attempt 1, 0 retries **[verified]**. Manually initiated (chat): all §1 chat items; exact count unknown (no transcript ledger) **[unknown]**.
- **Tool/API operations:** No ledger exists. Inferred from fixed job sequences: one daily run performs ~2 GitHub ops + ~6 Instagram ops + ~4 Facebook ops + ~4 PostHog queries ≈ 16 ops; 6 daily executions ≈ 96 ops. One midday run performs ~2 GitHub ops; 5 runs = 10 ops. Interactive pulls (anomaly, exports, live checks) add an uncounted number on top. Total tool/API operations for the period: **[unknown]**; the ~106 figure is an inferred floor from scheduled jobs only and excludes chat work.
- **Videos generated and revised (Wren):** 0 generated, 0 revised **[verified by lane division + no media records]**. All renders/revisions are Grok's (v2/v3/v4 + high-bitrate re-pick). One image file in goal files (`media-generation-pokergymcoverart-*.png` + sidecar) has unrecorded provenance — not claimed as Wren's.
- **Posts scheduled and verified (Wren):** 0 scheduled (ChatGPT/Metricool) **[verified]**. Verified via tag check as they published: Oct 22 morning A/B (both platforms), Oct 23 morning A/B, Oct 24 morning + 4 PM, Oct 25 morning + 4 PM, Oct 26 18/18 PENDING status adopted from ChatGPT readback (not independently verified by Wren). Exact tag-check count: **[unknown]** (per-post checks are inside run narratives, not tallied).
- **GitHub commits (Wren):** 10 SHAs verified across the period: 45e17a1, 87b25fb, b1ca355 (CanonicalDashboard), dc97e541, 973287eb (CanonicalDashboard refresh), c95e5d6, b98c2cd, 79fefba (three moves), 025c9ae (Current focus update). Oct 24 daily-run commit sha unrecorded **[unknown]**. Pull requests: 0 (direct commits via helper, no PR workflow) **[verified]**. Tests run by Wren: 0 (Beam's npm tests are Beam's). Deployments by Wren: 0 (site deploys are Beam/Cloudflare; Grind Quest deploys are a different project, out of scope).
- **Analytics reports and investigations:** 6 daily report executions + 1 narrative state-of-play (Oct 24) + investigations: Oct 24 anomaly, Oct 25 evening distribution pull, Oct 26 FB video export, Oct 26 YouTube export, Oct 26 FB live pulls = 5 investigations. Total report/investigation items: 12 **[verified as enumerated]**.
- **Failed and retried operations:** Facebook unlinked Oct 21 (precondition; resolved by Wes) — 1. GithubRepo commits-endpoint 404 (listing unavailable; SHAs come from run summaries instead) — 1 tooling gap. Oct 22 duplicate report executions — 1 unexplained duplication, reason unknown. Wren framing errors corrected same day — 2 (Oct 24 late-publish claim; Oct 26 harshest-number lead). No cron run failed; no retry recorded **[verified]**.
- **Owner interventions:** §4 lists 6 decision days + routine manual coordination (uploads, direct checks, relays, approvals). Count of discrete interventions: **[unknown]** (decisions enumerated, coordination acts not tallied).
- **Verifiable API or compute costs:** None accessible. Muse compute is covered by the Muse environment (plan/billing not in evidence); PostHog, Meta, and GitHub billing tiers are not in evidence. All costs **[unknown]**.

## 7. Migration assessment

| Workflow | Class | Evidence |
|---|---|---|
| W2 midday control-doc watch (read/compare/write) | **A — Ready to automate** | Pure deterministic sequence (read doc + sha, compare, write state/tracker) with a verified 5-run record and no judgment except the materiality test, which is a fixed list in the job body. Needs only a GitHub read path + scheduler + filesystem on the VPS. The optional chat message is the only non-portable step, and the quiet period already proved it optional (log-only mode). |
| W1 data pulls + snapshot/tracker/commit (excluding interpretation and chat delivery) | **B — Automatable with integration work** | Every call has an API path (Meta Graph, PostHog HogQL, GitHub API) and a fixed sequence, but Meta auth does not exist as a portable credential today. PostHog + GitHub are portable with re-issued keys. Work required: Meta app + Page tokens, scheduler, script conversion of the job body. |
| W1 interpretation (takeaways, verdicts, conflict flags) + chat delivery | **C — Hybrid** | Judgment + Muse chat surface. A VPS agent (T3) could draft the same takeaways, but delivery to Wes, approval loops, and interactive follow-ups live in Muse. Splitting this from the pulls creates a new handoff; keeping it in Muse keeps one. |
| W3 export parsing (CSV/zip math) | **B — Automatable with integration work** | Deterministic parsing once files exist. The missing integration is the upload path (chat → VPS inbox) and the retention-curve math, which is already worked out (3-second survivors only). Screenshot reading stays C (vision + judgment). |
| W3 screenshot reading + W4 anomaly verdicts | **C — Hybrid** | Vision + cross-source reasoning + owner-only checks (Account Quality, Business Suite) that no API covers. The reasoning can run anywhere; the evidence gathering cannot be fully automated. |
| W5 relay drafting + delivery | **C — Hybrid** | Drafting is assistant work (anywhere); delivery is Wes pasting (manual) unless agents share a channel. A shared VPS agent mesh removes the paste step only if all agents live on it — which is the migration's premise, not its guarantee. |
| W6 Oct 27 findings | **C — Hybrid** | Same split as W1: pulls B, judgment + doc write B/C, delivery to review C. |
| Owner-only checks (Account Quality, Business Suite detail, reactor invites, bio/pin confirmation, screenshot capture) | **D — Requires owner involvement** | Authenticated first-party sessions or physical phone actions. No agent credential exists or should be created for these without Wes's explicit per-action decision. |
| Strategic decisions + approvals (kills, holds, verdicts, format changes, purchases) | **D — Requires owner involvement** | Wes is the decider by design (binary fit, no bending). Automation must surface decisions, never make them. |
| Metricool scheduling/posting truth; Drive file truth; YouTube Studio truth | **C — Hybrid (other agents' lanes)** | Not Wren's to migrate alone. ChatGPT owns Metricool/Drive; YouTube Studio has no agent access at all. Wren's migration does not fix these seams; a joint migration (all agents + their tools) is required to close them. |

Migration requirements summary (technical, in dependency order):
1. Scheduler: system cron or systemd timers replacing the two Muse crons, with run logging equivalent to current run records (status, span, summary) — otherwise the next audit has no evidence either.
2. GitHub: re-issued fine-grained token (pokergym repo, read/write for Wren's sections; read-only suffices for the watch job), plus a rule preserving "each agent edits only its own section."
3. PostHog: re-issued read-only key, US cloud, project 670990, HogQL access; keep the canonical first-touch definitions file in the repo.
4. Meta: new integration project (Meta app, Page tokens, permissions for Page insights + post reads). This is the long pole; without it, W1's social pulls stay in Muse and the VPS runs a partial pipeline.
5. File inbox: a path for Wes's exports/screenshots to reach the VPS pipeline (chat upload → VPS, or a watched folder), plus vision capability for screenshots or a rule that screenshots stay with Muse.
6. Chat bridge: whatever runs on the VPS must deliver to Wes (report + alerts) or hand results back to Muse for delivery. A pipeline with no delivery path is a log writer, not a replacement.
7. Secrets handling: vault or env-store on the VPS; rotation of the previously chat-pasted PostHog/GitHub credentials before reuse; no secrets in repo files (current state: none in files, verified by absence in the workspace copies read for this audit).

## 8. The five largest sources of unnecessary manual work

1. **Wes as the human message bus.** Every cross-agent handoff that is not in the control doc travels through Wes's clipboard: drafts to ChatGPT, findings from ChatGPT/Grok into chat, approvals per message. The Oct 26 YouTube message is the cleanest example (draft → Wes → ChatGPT → reply → Wes → Wren). A shared agent channel or a single orchestration plane removes this entirely; it is the largest single manual cost and the strongest argument for the VPS move, if all agents actually move.
2. **Owner-supplied data with no API path.** Retention curves, hook/hold rates, distribution scores, account status, and per-reel Insights exist only in Wes's exports and screenshots. Each analysis starts with "Wes, upload X" and ends with Wren parsing it. This cost does not move to a VPS unless the data source changes (Meta API for retention/distribution, or a screen-scrape that would violate the "no workarounds for blocked access" rule). It is manual by architecture, not by choice.
3. **Verification that stops at connector boundaries.** Wren can verify social posts (connectors) and site events (PostHog) but cannot verify scheduling (Metricool), files (Drive), Shorts shelf status (YouTube Studio), or account standing (Business Suite). Each gap is closed by a readback claim or a Wes check, which then needs its own trust note ("ChatGPT's readback, not a Wren verification"). Three systems of record, zero shared read access.
4. **Approval-gated everything.** Per-message approvals for sends, per-action approvals for money/accounts/sign-ups, and chat-gated decisions for format changes, holds, and verdicts. Necessary for safety (class D work must stay gated), but it also gates class B/C work that could run on rules (e.g., log-only watch messages, routine snapshot writes). The approval surface and the execution surface are the same chat thread, so routine work interrupts Wes at the same priority as decisions.
5. **Five copies of every number.** Each daily run writes the same values to the chat report, the snapshot, the experiment tracker, the control doc Wren Status entry, and the dated memory log. This was built for resilience (each consumer reads a different copy) but it creates drift risk and maintenance load: the control doc Experiments section still listed the bio as unverified days after Wes confirmed it, and the Oct 26 report shipped in the old format because the worker ran before the format change. A single numbers store with rendered views would remove the copy burden; the canonical dashboard file was a step toward this and is still only partially adopted.

## 9. Missing records that prevent a complete audit

- No tool-call ledger: exact API operation counts, per-call latencies, and token usage are unrecoverable. Scheduled-job estimates (§6) are inferred floors, not counts.
- No chat transcript access for Oct 13–20 beyond curated daily logs: early-period activity is "none recorded," not "none occurred."
- No Metricool, Drive, or YouTube Studio records: scheduling/posting/file truth for the period is secondhand (ChatGPT readbacks, Wes uploads).
- No OpenCode session logs: DeepSeek/Beam work is visible only through Decision Log entries and deploys.
- No PostHog query log: queries are reconstructed from the helper interface and saved outputs (ph-persons/game/events/referrer), not from a query history.
- No cost or billing records: Muse plan, PostHog tier, GitHub billing, Meta app status are all unevidenced.
- No per-run commit sha for the Oct 24 daily sync; no reason recorded for the Oct 22 duplicate report executions; no tally of individual tag checks, relay drafts, or owner coordination acts.
- Instagram per-reel views, retention, and shares/saves are unavailable through the connector (a capability gap, not a missing record, but it bounds every Instagram claim in this audit).
- The repo commits endpoint returned 404 through the helper on a prior attempt, so commit history could not be listed independently; SHAs in this report come from run summaries and doc entries, not from a commit listing.

## Appendix: sources consulted for this audit

- Cron definitions: `poker-gym-daily-stats` (daily 09:47 CT), `poker-gym-midday-sync` (daily 13:47 CT), read in full.
- Cron run records: 6 daily executions (Oct 22 manual + scheduled, Oct 23, 24, 25, 26) and 5 midday executions (Oct 22–26), all succeeded, attempt 1.
- Daily memory logs: `~/memory/2026-10-13.md` through `~/memory/2026-10-26.md` (Poker Gym line counts: Oct 13–20 zero; Oct 21 33; Oct 22 39; Oct 23 26; Oct 24 17; Oct 25 13; Oct 26 13).
- Goal workspace: `latest-snapshot.md`, `experiment-tracker.md`, `control-doc-state.md`, `files/` (state-of-play Oct 24, handover brief Oct 21, cover art with unrecorded provenance).
- Repo (read Oct 26): `docs/PokerGymControlDoc.md` (334 lines: Current focus, Wren Status Oct 21–26, Decision Log, Open Questions), `automation/ARTIFACTS.md` (index empty, gitignored convention).
- Owner files read Oct 26: 3 Facebook publish-time exports, 1 Facebook video lifetime export, 1 YouTube Content zip (16 videos, 263 views).
- Connectors verified present: `/opt/hatch/bin/facebook-cli`, `/opt/hatch/bin/instagram-cli`, `custom.posthog/bin/PosthogQuery.py`, `custom.github/bin/GithubRepo.py`.
- Not consulted (no access): Metricool, Google Drive, YouTube Studio, OpenCode sessions, Meta Business Suite internals, billing consoles.

## Addendum (delivery time, Oct 26 evening)

While this report was being written, Grok logged a parallel 14-day own-operations audit at about 7:30 PM Central, saved locally at `automation/artifacts/grok/2026-10-26-ops-audit.md` and indexed in `automation/ARTIFACTS.md`. That confirms the assignment went to multiple agents. Consequence for comparison: Grok's audit is local-only (gitignored) while this Wren audit was saved via the repo API per the assignment's repository-access condition, so the two reports currently live in different places. A joint migration read should pull both before deciding. This addendum does not change any finding above.
