#!/usr/bin/env bash
set -euo pipefail
umask 077
project=/home/meep/Projects/pokergym
state=/home/meep/.local/state/pokergym-automation
mkdir -p "$state"
exec 9>"$state/run.lock"
flock -n 9 || exit 0
cd "$project"
deadline=$(( $(date +%s) + 7195 ))
run_stamp=$(date +%Y%m%dT%H%M%S)
round=0
while (( $(date +%s) < deadline )); do
  remaining=$(( deadline - $(date +%s) ))
  (( remaining >= 60 )) || break
  round=$((round + 1))
  report="$state/$run_stamp-$round.md"
  log="$state/$run_stamp-$round.log"
  printf 'Poker Gym iteration %s, model gpt-6.1-sol, effort low, remaining %ss\n' "$round" "$remaining"
  set +e
  timeout --signal=TERM --kill-after=5s "${remaining}s" \
    /home/meep/.local/share/mise/installs/codex/latest/bin/codex exec \
    -C "$project" -m gpt-6.1-sol -c 'model_reasoning_effort="low"' \
    -c 'approval_policy="never"' -s danger-full-access --color never \
    -o "$report" - < "$project/automation/daily-prompt.md" > "$log" 2>&1
  result=$?
  set -e
  if (( result != 0 )); then
    printf 'Iteration stopped with exit %s; inspect local log %s\n' "$result" "$log"
    exit "$result"
  fi
  if [[ ! -s "$report" ]]; then
    printf 'No final report; stopping instead of retrying indefinitely.\n'
    exit 1
  fi
  if rg -q '^AUTOMATION_(BLOCKED|TARGET_VERIFIED)$' "$report"; then
    printf 'Iteration reached a documented stop condition: %s\n' "$report"
    break
  fi
done
printf 'Daily work window finished. Reports: %s\n' "$state"
