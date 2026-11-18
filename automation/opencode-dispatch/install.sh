#!/usr/bin/env bash
# Install the Poker Gym OpenCode dispatcher on Linux (systemd user timer, every 15 minutes).
#   curl -fsSL https://raw.githubusercontent.com/MeepTheTendie/pokergym/main/automation/opencode-dispatch/install.sh | bash
# Safe to re-run: it refreshes the scripts and keeps the seen-ids state.
set -euo pipefail

RAW='https://raw.githubusercontent.com/MeepTheTendie/pokergym/main/automation/opencode-dispatch'
BIN="${XDG_DATA_HOME:-$HOME/.local/share}/pokergym-opencode-dispatch/bin"
CFG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/pokergym-opencode-dispatch"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

missing=()
for b in git curl jq timeout flock systemctl; do command -v "$b" >/dev/null || missing+=("$b"); done
if (( ${#missing[@]} )); then
  echo "Missing: ${missing[*]}. On Arch/Omarchy: sudo pacman -S --needed git curl jq util-linux coreutils" >&2; exit 1
fi
OC="$(command -v opencode || true)"
[[ -n "$OC" ]] || { echo 'opencode is not on PATH. Install it or set OPENCODE_BIN in the config, then re-run.' >&2; exit 1; }

mkdir -p "$BIN" "$CFG_DIR" "$UNIT_DIR"
curl -fsSL "$RAW/dispatch.sh" -o "$BIN/dispatch.sh"
curl -fsSL "$RAW/standing-prompt.md" -o "$BIN/standing-prompt.md"
chmod +x "$BIN/dispatch.sh"

# systemd user units get a minimal PATH, so record where opencode lives.
if [[ ! -f "$CFG_DIR/config.sh" ]]; then
  cat > "$CFG_DIR/config.sh" <<EOF
# Poker Gym dispatcher config (sourced by dispatch.sh)
OPENCODE_BIN='$OC'
# DEEPSEEK_MODEL=''   # default: first opencode-go/deepseek* in \`opencode models\`
# BEAM_MODEL=''       # default: OpenCode's default model
# DEEPSEEK_AGENT=''; BEAM_AGENT=''; RUN_TIMEOUT_MIN=30
EOF
fi

cat > "$UNIT_DIR/pokergym-opencode-dispatch.service" <<EOF
[Unit]
Description=Poker Gym OpenCode dispatcher (DeepSeek/Beam tasks from issue #41)
After=network-online.target

[Service]
Type=oneshot
Environment=PATH=$(dirname "$OC"):/usr/local/bin:/usr/bin:/bin
ExecStart=$BIN/dispatch.sh
EOF

cat > "$UNIT_DIR/pokergym-opencode-dispatch.timer" <<'EOF'
[Unit]
Description=Run the Poker Gym OpenCode dispatcher every 15 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=15min
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl --user daemon-reload
if [[ -f /etc/systemd/system/pokergym-opencode-dispatch.timer ]]; then
  # install-wake.sh already set up the system (wake-from-sleep) timer; keep the user timer off.
  systemctl --user disable --now pokergym-opencode-dispatch.timer 2>/dev/null || true
  echo 'Wake-from-sleep system timer found: user timer left disabled (scripts refreshed).'
else
  systemctl --user enable --now pokergym-opencode-dispatch.timer
fi
echo
echo 'Installed. First tick records existing #41 tasks as a baseline (they are not replayed).'
echo "Dry run:  $BIN/dispatch.sh --dry-run"
echo "Logs:     ${XDG_STATE_HOME:-$HOME/.local/state}/pokergym-opencode-dispatch/logs/"
echo 'Status:   systemctl --user list-timers pokergym-opencode-dispatch.timer'
echo 'Remove:   systemctl --user disable --now pokergym-opencode-dispatch.timer'
echo
echo 'Note: agents push branches with this machine'"'"'s git credentials. Check with:'
echo '  git ls-remote https://github.com/MeepTheTendie/pokergym HEAD   (read)  and that a push works from a normal clone.'
