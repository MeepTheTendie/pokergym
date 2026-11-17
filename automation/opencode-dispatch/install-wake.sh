#!/usr/bin/env bash
# Make the Poker Gym OpenCode dispatcher wake the desktop from sleep (suspend) to check issue #41.
# Run once on the desktop, AFTER install.sh, as your normal user (it asks for sudo):
#   curl -fsSL https://raw.githubusercontent.com/MeepTheTendie/pokergym/main/automation/opencode-dispatch/install-wake.sh | bash
#
# What it does:
# - Replaces the user timer with a SYSTEM timer that has WakeSystem=true: the hardware RTC alarm
#   wakes the machine from suspend every WAKE_EVERY (default 15 min) to run the dispatcher.
# - While the dispatcher runs (including any OpenCode task, max 30 min), a sleep/idle inhibitor
#   stops the idle daemon from suspending the machine mid-task. Afterwards it may sleep again.
# - Waits up to 60 s for the network after waking before checking #41.
# Wakes from suspend only: not from power-off or hibernate.
# Remove: sudo systemctl disable --now pokergym-opencode-dispatch.timer
set -euo pipefail

WAKE_EVERY="${WAKE_EVERY:-15min}"
U="$(id -un)"; H="$HOME"
BIN="${XDG_DATA_HOME:-$H/.local/share}/pokergym-opencode-dispatch/bin/dispatch.sh"
OCCFG="${XDG_CONFIG_HOME:-$H/.config}/pokergym-opencode-dispatch/opencode.json"
[[ "$U" != root ]] || { echo 'Run as your normal user, not root (it uses sudo itself).' >&2; exit 1; }
[[ -x "$BIN" ]] || { echo "Dispatcher not installed at $BIN. Run install.sh first." >&2; exit 1; }
OC="$(command -v opencode || true)"; OCDIR="$(dirname "${OC:-/usr/bin/opencode}")"

ENV_OC=''
[[ -f "$OCCFG" ]] && ENV_OC="OPENCODE_CONFIG=$OCCFG"

SERVICE="[Unit]
Description=Poker Gym OpenCode dispatcher (wakes from suspend; DeepSeek/Beam tasks from issue #41)
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
# Wait for the network after resume (up to 60 s); never fail the run on this.
ExecStartPre=/bin/sh -c 'for i in \$(seq 30); do getent hosts api.github.com >/dev/null && exit 0; sleep 2; done; exit 0'
# '+' = run this line privileged so the inhibitor can block sleep; the dispatcher itself runs as $U.
ExecStart=+/usr/bin/systemd-inhibit --what=sleep:idle --mode=block --who=pokergym-dispatch --why='Poker Gym task running' /usr/bin/runuser -u $U -- /usr/bin/env HOME=$H USER=$U XDG_RUNTIME_DIR=/run/user/$(id -u) DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus PATH=$OCDIR:/usr/local/bin:/usr/bin:/bin $ENV_OC $BIN
TimeoutStartSec=45min
"

TIMER="[Unit]
Description=Wake the desktop and run the Poker Gym OpenCode dispatcher every $WAKE_EVERY

[Timer]
OnCalendar=*:0/${WAKE_EVERY%min}
WakeSystem=true
Persistent=true
AccuracySec=1min

[Install]
WantedBy=timers.target
"
[[ "$WAKE_EVERY" =~ ^[0-9]+min$ ]] || { echo 'WAKE_EVERY must look like 15min or 30min' >&2; exit 1; }

echo "Installing system timer (wakes from suspend every $WAKE_EVERY). sudo will ask for your password."
printf '%s' "$SERVICE" | sudo tee /etc/systemd/system/pokergym-opencode-dispatch.service >/dev/null
printf '%s' "$TIMER"   | sudo tee /etc/systemd/system/pokergym-opencode-dispatch.timer >/dev/null
sudo systemctl daemon-reload
# Retire the user timer so only one scheduler runs (the dispatcher also locks against overlap).
systemctl --user disable --now pokergym-opencode-dispatch.timer 2>/dev/null || true
sudo systemctl enable --now pokergym-opencode-dispatch.timer

echo
systemctl list-timers pokergym-opencode-dispatch.timer --no-pager | head -3
echo
echo 'Done. Test it: suspend the machine and check the log ~20 min later:'
echo "  tail -5 $H/.local/state/pokergym-opencode-dispatch/logs/dispatcher.log"
echo 'If it never wakes, check BIOS/UEFI "Wake on RTC/alarm" and: cat /sys/class/rtc/rtc0/wakealarm'
