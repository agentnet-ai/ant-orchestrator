#!/usr/bin/env bash
set -euo pipefail

CAPS_DIR="$(cd "$(dirname "$0")/../../ant-capsulizer" && pwd)"
CAPSULIZER_DIR="$CAPS_DIR"

ANT_WORKER_OWNER_ID_PRESET="${ANT_WORKER_OWNER_ID-__UNSET__}"
ANT_WORKER_OWNER_SLUG_PRESET="${ANT_WORKER_OWNER_SLUG-__UNSET__}"

if [ -f "$CAPS_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$CAPS_DIR/.env"
  set +a
fi

if [[ "$ANT_WORKER_OWNER_ID_PRESET" != "__UNSET__" ]]; then
  ANT_WORKER_OWNER_ID="$ANT_WORKER_OWNER_ID_PRESET"
fi
if [[ "$ANT_WORKER_OWNER_SLUG_PRESET" != "__UNSET__" ]]; then
  ANT_WORKER_OWNER_SLUG="$ANT_WORKER_OWNER_SLUG_PRESET"
fi

ANT_WORKER_OWNER_ID="${ANT_WORKER_OWNER_ID:-}"
ANT_WORKER_OWNER_SLUG="${ANT_WORKER_OWNER_SLUG:-ant-worker}"

if [[ -z "$ANT_WORKER_OWNER_ID" ]]; then
  echo "[demo-prep] ERROR: ANT_WORKER_OWNER_ID is required."
  echo "[demo-prep] Set it first (example): export ANT_WORKER_OWNER_ID=1"
  exit 1
fi

if [[ ! "$ANT_WORKER_OWNER_ID" =~ ^[0-9]+$ ]] || [[ "$ANT_WORKER_OWNER_ID" -le 0 ]]; then
  echo "[demo-prep] ERROR: ANT_WORKER_OWNER_ID must be a positive integer."
  exit 1
fi

DEMO_REPO_PATH="${DEMO_REPO_PATH:-../agentnet}"
DEMO_REPO_GLOB="${DEMO_REPO_GLOB:-**/*.md}"
DEMO_REPO_LIMIT="${DEMO_REPO_LIMIT:-200}"
DEMO_SITE_URL="${DEMO_SITE_URL:-https://agent-net.ai}"

echo "[demo-prep] [1/2] Capsulizing repo content into resolver DB..."
(
  cd "$CAPSULIZER_DIR"
  ANT_WORKER_OWNER_ID="$ANT_WORKER_OWNER_ID" ANT_WORKER_OWNER_SLUG="$ANT_WORKER_OWNER_SLUG" \
    npm run capsulize:repo -- \
      --repoPath "$DEMO_REPO_PATH" \
      --include "$DEMO_REPO_GLOB" \
      --limit "$DEMO_REPO_LIMIT"
)

echo "[demo-prep] [2/2] Enqueuing single-page crawl..."
(
  cd "$CAPSULIZER_DIR"
  ANT_WORKER_OWNER_ID="$ANT_WORKER_OWNER_ID" ANT_WORKER_OWNER_SLUG="$ANT_WORKER_OWNER_SLUG" \
    npm run seed -- --url "$DEMO_SITE_URL"
)

echo "[demo-prep] Complete. Worker will process crawl jobs; UI is ready."
