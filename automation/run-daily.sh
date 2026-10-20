#!/usr/bin/env bash
set -euo pipefail
umask 077
project=/home/meep/Projects/pokergym
state=/home/meep/.local/state/pokergym-automation
mkdir -p "$state"
exec 9>"$state/run.lock"
flock -n 9 || exit 0
cd "$project"
run_stamp=$(date +%Y%m%dT%H%M%S)
report="$state/$run_stamp-1.md"
log="$state/$run_stamp-1.log"
# Preflight: refuse to run blind. npm run stats must show the REAL PEOPLE table;
# otherwise the PostHog read key is missing/unreachable and any report produced
# would be confident-looking blanks.
if ! npm run stats --silent 2>/dev/null | grep -q 'REAL PEOPLE'; then
  printf 'Preflight failed: PostHog read unavailable; refusing to run blind.\n' >&2
  exit 1
fi

printf 'Poker Gym daily iteration, model gpt-6.1-sol, effort low, maximum 1200s\n'
set +e
timeout --signal=TERM --kill-after=5s 1200s \
  /home/meep/.local/share/mise/installs/codex/latest/bin/codex exec \
  -C "$project" -m gpt-6.1-sol -c 'model_reasoning_effort="low"' \
  -c 'approval_policy="never"' \
  -s danger-full-access --color never -o "$report" - \
  < "$project/automation/daily-prompt.md" > "$log" 2>&1
result=$?
set -e
if (( result != 0 )); then
  printf 'Daily iteration stopped with exit %s; inspect local log %s\n' "$result" "$log"
  exit "$result"
fi
if [[ ! -s "$report" ]]; then
  printf 'No final report; stopping without retrying.\n'
  exit 1
fi
printf 'Daily iteration finished. Report: %s\n' "$report"
