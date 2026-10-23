#!/usr/bin/env bash
# Run the full Poker Gym verification suite, including optional Bend checks.
set -euo pipefail

cd "$(dirname "$0")/.."

# Make the Bend toolchain available if it was installed in the default location.
export PATH="$HOME/.bend/bin:$PATH"
export BEND_NO_TELEMETRY=1

if ! command -v bend >/dev/null 2>&1; then
  echo "Bend is not installed."
  echo "Install it with: curl -fsSL https://bend-lang.com/install.sh | sh"
  echo "Then re-run this script."
  exit 1
fi

echo "==> Running JavaScript tests"
npm test

echo "==> Type-checking Bend reference"
npm run bend:check

echo "==> Verifying Bend evaluation against JavaScript"
npm run bend:verify

echo "==> Verifying Bend video poker win codes against JavaScript"
npm run bend:verify:vp

echo "==> Checking Bend laws and proofs"
npm run bend:proofs

echo "==> Building site"
npm run build

echo "All checks passed."