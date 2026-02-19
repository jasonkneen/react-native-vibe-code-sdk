#!/usr/bin/env bash
# dev.sh — Run pnpm dev with automatic error detection and Claude auto-fix.
# Usage: bash scripts/dev.sh
#        bash scripts/dev.sh --light   (dev:light variant)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/rn-vibe-dev.log"
DEV_CMD="${1:-dev}"

echo "🔍 Starting error watcher..."
node "$SCRIPT_DIR/error-watcher.mjs" --log "$LOG_FILE" &
WATCHER_PID=$!
echo "   Watcher PID: $WATCHER_PID"

echo "🩺 Starting sandbox heal poller..."
node "$SCRIPT_DIR/heal-poller.mjs" &
HEALER_PID=$!
echo "   Healer PID: $HEALER_PID"

cleanup() {
  echo ""
  echo "🛑 Shutting down error watcher and heal poller..."
  kill "$WATCHER_PID" 2>/dev/null || true
  kill "$HEALER_PID" 2>/dev/null || true
}
trap cleanup EXIT SIGTERM SIGINT

echo "🚀 Starting pnpm $DEV_CMD (logging to $LOG_FILE)..."
echo ""

cd "$PROJECT_DIR"
pnpm "$DEV_CMD" 2>&1 | tee "$LOG_FILE"
