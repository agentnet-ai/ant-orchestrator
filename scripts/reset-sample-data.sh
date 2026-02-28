#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STACK_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

REGISTRAR_DIR="$STACK_ROOT/ant-registrar"
RESOLVER_DIR="$STACK_ROOT/ant-resolver"
CAPSULIZER_DIR="$STACK_ROOT/ant-capsulizer"

ASSUME_YES=0
FLUSH_QUEUES=1
CLEAR_CAPSULIZER_FILES=1

for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=1 ;;
    --no-queue-flush) FLUSH_QUEUES=0 ;;
    --no-capsulizer-files) CLEAR_CAPSULIZER_FILES=0 ;;
    *)
      echo "[reset-sample-data] Unknown argument: $arg"
      echo "Usage: bash scripts/reset-sample-data.sh [--yes] [--no-queue-flush] [--no-capsulizer-files]"
      exit 1
      ;;
  esac
done

echo "═══════════════════════════════════════════════════"
echo "  AgentNet DEV sample data reset"
echo "═══════════════════════════════════════════════════"
echo "This will:"
echo "  1) Reset ant-orchestrator conversation tables"
echo "  2) Reset ant-registrar DB sample tables (owners/nodes/audit)"
echo "  3) Reset ant-resolver DB sample tables (nodes/capsules/events)"
echo "  4) Optionally clear BullMQ Redis keys for capsulizer queues"
echo "  5) Optionally clear ant-capsulizer run artifacts (runs/snapshots/log)"
echo

if [[ "$ASSUME_YES" -ne 1 ]]; then
  read -r -p "Continue? [y/N] " reply
  if [[ ! "$reply" =~ ^[Yy]$ ]]; then
    echo "[reset-sample-data] Aborted."
    exit 0
  fi
fi

echo
echo "[1/5] Reset orchestrator dev data..."
(cd "$STACK_ROOT/ant-orchestrator" && npm run reset:dev)

echo
echo "[2/5] Reset registrar dev data..."
(cd "$REGISTRAR_DIR" && npm run reset:dev)

echo
echo "[3/5] Applying resolver migrations..."
(cd "$RESOLVER_DIR" && npm run db:migrate)

echo
echo "[4/5] Reset resolver dev data..."
(cd "$RESOLVER_DIR" && npm run reset:dev)

if [[ "$FLUSH_QUEUES" -eq 1 ]]; then
  echo
  echo "[5/5] Flushing BullMQ keys for capsulizer queues..."
  CAPSULIZER_ENV="$CAPSULIZER_DIR/.env"
  if [[ -f "$CAPSULIZER_ENV" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$CAPSULIZER_ENV"
    set +a
  fi

  REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  REDIS_PASSWORD="${REDIS_PASSWORD:-}"
  CAPSULE_QUEUE_NAME="${CAPSULE_QUEUE_NAME:-capsuleQueue}"
  INQUIRY_QUEUE_NAME="${INQUIRY_QUEUE_NAME:-resolver-inquiry}"
  BULL_PREFIX="${BULL_PREFIX:-bull}"

  if command -v redis-cli >/dev/null 2>&1; then
    if [[ -n "${REDIS_PASSWORD:-}" ]]; then
      export REDISCLI_AUTH="${REDIS_PASSWORD:-}"
    else
      unset REDISCLI_AUTH || true
    fi

    delete_pattern() {
      local pattern="$1"
      local count=0
      local key=""

      while IFS= read -r key; do
        [[ -z "${key:-}" ]] && continue
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" DEL "$key" >/dev/null
        count=$((count + 1))
      done < <(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --scan --pattern "$pattern")

      if [[ "$count" -eq 0 ]]; then
        echo "  - no keys for pattern: $pattern"
        return
      fi
      echo "  - deleted $count keys for pattern: $pattern"
    }

    delete_pattern "${BULL_PREFIX}:${CAPSULE_QUEUE_NAME}:*"
    delete_pattern "${BULL_PREFIX}:${INQUIRY_QUEUE_NAME}:*"
  else
    echo "  - redis-cli not found, skipping queue flush."
  fi
else
  echo
  echo "[5/5] Queue flush skipped (--no-queue-flush)."
fi

if [[ "$CLEAR_CAPSULIZER_FILES" -eq 1 ]]; then
  echo
  echo "[6/6] Clearing capsulizer run artifacts..."
  rm -rf "$CAPSULIZER_DIR/runs" "$CAPSULIZER_DIR/snapshots"
  rm -f "$CAPSULIZER_DIR/crawler.log"
  mkdir -p "$CAPSULIZER_DIR/runs" "$CAPSULIZER_DIR/snapshots"
else
  echo
  echo "[6/6] Capsulizer file cleanup skipped (--no-capsulizer-files)."
fi

echo
echo "Reset complete."
echo "Canonical registrar owner is now: ant-worker"
