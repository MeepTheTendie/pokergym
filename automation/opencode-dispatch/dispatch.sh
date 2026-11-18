#!/usr/bin/env bash
# Poker Gym OpenCode dispatcher (Linux; Wes's Omarchy desktop since 2026-11-17).
# Port of dispatch.ps1. Run every 15 minutes by a systemd user timer (see install.sh).
# Polls issue #41 (public REST, no credentials). For each new comment by the repo owner
# whose first line starts with DEEPSEEK-TASK: or BEAM-TASK:, runs one non-interactive
# `opencode run` in a fresh git worktree of origin/main. At-most-once per comment.
#   --dry-run : show what would be dispatched, change nothing.
set -uo pipefail

REPO='MeepTheTendie/pokergym'; ISSUE=41; OWNER_LOGIN='MeepTheTendie'
STATE="${XDG_STATE_HOME:-$HOME/.local/state}/pokergym-opencode-dispatch"
CLONE="$STATE/repo"            # dispatcher-only clone, never Wes's working copy
SEEN="$STATE/seen-ids.txt"
LOGS="$STATE/logs"
CFG="${XDG_CONFIG_HOME:-$HOME/.config}/pokergym-opencode-dispatch/config.sh"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1
mkdir -p "$STATE" "$LOGS"

log() { local l; l="$(date +%Y-%m-%dT%H:%M:%S) $*"; echo "$l"; echo "$l" >> "$LOGS/dispatcher.log"; }

# Optional config: OPENCODE_BIN, DEEPSEEK_MODEL, BEAM_MODEL, DEEPSEEK_AGENT, BEAM_AGENT, RUN_TIMEOUT_MIN
OPENCODE_BIN=''; DEEPSEEK_MODEL=''; BEAM_MODEL=''; DEEPSEEK_AGENT=''; BEAM_AGENT=''; RUN_TIMEOUT_MIN=30
# shellcheck disable=SC1090
[[ -f "$CFG" ]] && . "$CFG"

# Single instance.
exec 9>"$STATE/.lock"
flock -n 9 || exit 0

OC="${OPENCODE_BIN:-$(command -v opencode || true)}"
[[ -n "$OC" && -x "$OC" ]] || { log 'OpenCode CLI not found (config OPENCODE_BIN or PATH); stopping'; exit 1; }
for b in git curl jq timeout; do command -v "$b" >/dev/null || { log "$b not on PATH; stopping"; exit 1; }; done

# Read recent #41 comments (7-day window, paged).
since="$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ)"
all='[]'
for page in $(seq 1 10); do
  chunk="$(curl -fsS -H 'Accept: application/vnd.github+json' -H 'User-Agent: pokergym-dispatcher' \
    "https://api.github.com/repos/$REPO/issues/$ISSUE/comments?per_page=100&page=$page&since=$since")" \
    || { log 'GitHub read failed; retry next tick'; exit 0; }
  all="$(jq -s 'add' <(echo "$all") <(echo "$chunk"))"
  [[ "$(jq 'length' <<<"$chunk")" -lt 100 ]] && break
done

# Marker comments: owner account, marker on the first non-blank line. Output: id<TAB>agent
tasks="$(jq -r --arg o "$OWNER_LOGIN" '
  .[] | select(.user.login == $o and .author_association == "OWNER")
  | (.body | ltrimstr("\n") | sub("^\\s+"; "") | split("\n")[0]) as $first
  | if ($first | test("^\\s*DEEPSEEK-TASK:")) then "\(.id)\tdeepseek"
    elif ($first | test("^\\s*BEAM-TASK:")) then "\(.id)\tbeam" else empty end' <<<"$all" | sort -n)"
ntasks=0; [[ -n "$tasks" ]] && ntasks="$(wc -l <<<"$tasks")"
log "Checked $(jq length <<<"$all") recent #41 comment(s); $ntasks marker comment(s)."

# First run: record existing markers so old tasks are never replayed.
if [[ ! -f "$SEEN" ]]; then
  if (( DRY )); then log "DRY RUN: first run would record $ntasks existing marker(s) as baseline"; exit 0; fi
  { echo "baseline-$(date +%Y-%m-%dT%H:%M:%S)"; [[ -n "$tasks" ]] && cut -f1 <<<"$tasks"; } > "$SEEN"
  log "Baseline recorded ($ntasks existing marker comment(s) skipped). Read path OK."
  exit 0
fi

[[ -z "$tasks" ]] && exit 0
while IFS=$'\t' read -r id agent; do
  grep -qx "$id" "$SEEN" && continue
  if [[ "$agent" == deepseek ]]; then
    model="$DEEPSEEK_MODEL"; agent_name="$DEEPSEEK_AGENT"
    [[ -z "$model" ]] && model="$("$OC" models 2>/dev/null | grep -m1 '^opencode-go/deepseek' || true)"
  else model="$BEAM_MODEL"; agent_name="$BEAM_AGENT"; fi
  mshow="${model:-opencode default}"
  if (( DRY )); then log "DRY RUN: would dispatch $agent for comment $id (model: $mshow)"; continue; fi

  # Setup. A failure here leaves the task unseen so the next tick retries it.
  wt="$STATE/worktrees/$agent-$id"
  if ! { { [[ -d "$CLONE/.git" ]] || git clone -q "https://github.com/$REPO" "$CLONE"; } \
       && git -C "$CLONE" fetch -q origin main \
       && rm -rf "$wt" && git -C "$CLONE" worktree prune \
       && git -C "$CLONE" worktree add -q --detach "$wt" origin/main; }; then
    log "setup failed for $agent/$id; retry next tick"; exit 0
  fi

  url="https://github.com/$REPO/issues/$ISSUE#issuecomment-$id"
  body="$(jq -r --argjson i "$id" '.[] | select(.id == $i) | .body' <<<"$all")"
  { sed -e "s|{{AGENT}}|$agent|g" -e "s|{{COMMENT_ID}}|$id|g" -e "s|{{COMMENT_URL}}|$url|g" "$HERE/standing-prompt.md"
    printf '\n---\n\n## The task (verbatim from %s)\n\n%s\n' "$url" "$body"; } > "$wt/.dispatch-task.md"
  grep -qx '.dispatch-task.md' "$CLONE/.git/info/exclude" 2>/dev/null || echo '.dispatch-task.md' >> "$CLONE/.git/info/exclude"

  args=(run)
  [[ -n "$model" ]] && args+=(-m "$model")
  [[ -n "$agent_name" ]] && args+=(--agent "$agent_name")
  args+=("Read the file .dispatch-task.md in the current directory and carry it out exactly as written.")
  out="$LOGS/$(date +%Y%m%dT%H%M%S)-$agent-$id.log"
  log "Dispatching $agent for comment $id (model: $mshow); log $out"

  # Commits are attributed to the agent, never to Wes's account name.
  if [[ "$agent" == deepseek ]]; then who='DeepSeek (OpenCode)'; else who='Beam (OpenCode)'; fi
  # Once the process starts, the run counts as attempted even if it later fails or times out.
  echo "$id" >> "$SEEN"
  ( cd "$wt" && GIT_AUTHOR_NAME="$who" GIT_COMMITTER_NAME="$who" \
      GIT_AUTHOR_EMAIL="$agent-opencode@users.noreply.github.com" GIT_COMMITTER_EMAIL="$agent-opencode@users.noreply.github.com" \
      timeout --kill-after=30 "$((RUN_TIMEOUT_MIN * 60))" "$OC" "${args[@]}" > "$out" 2> "$out.err" < /dev/null )
  rc=$?
  if (( rc == 124 || rc == 137 )); then log "$agent/$id timed out after $RUN_TIMEOUT_MIN min; killed"
  else log "$agent/$id finished with exit $rc"; fi
  git -C "$CLONE" worktree remove --force "$wt" 2>/dev/null
done <<<"$tasks"
