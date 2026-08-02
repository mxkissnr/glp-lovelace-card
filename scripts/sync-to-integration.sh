#!/usr/bin/env bash
# Copies the built glp-card.js into glp-integration's bundled www/ folder.
# The card is no longer submitted to HACS as its own listing (see
# hacs/default#8568) -- it ships inside glp-integration and is registered
# automatically as a Lovelace resource on setup. Run this as part of every
# glp-lovelace-card release, then bump+release glp-integration too so the
# cache-busting version query param actually changes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CARD_REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
INTEGRATION_REPO="${1:-$CARD_REPO/../glp-integration}"
DEST="$INTEGRATION_REPO/custom_components/gaggiuino_profiler/www/glp-card.js"

if [ ! -d "$INTEGRATION_REPO/custom_components/gaggiuino_profiler" ]; then
  echo "error: '$INTEGRATION_REPO' doesn't look like the glp-integration repo (pass its path as \$1)" >&2
  exit 1
fi

cp "$CARD_REPO/glp-card.js" "$DEST"
echo "synced glp-card.js -> $DEST"
echo "next: bump glp-integration's manifest.json version and release it too"
