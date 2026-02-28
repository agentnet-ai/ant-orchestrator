#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ORCH_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STACK_ROOT="$(cd "$ORCH_ROOT/.." && pwd)"

REGISTRAR_URL="${REGISTRAR_BASE_URL:-http://localhost:4002}"
RESOLVER_URL="${RESOLVER_BASE_URL:-http://localhost:5175}"
ORCH_URL="${ORCH_BASE_URL:-http://localhost:5055}"
WITH_RESET=0
ALLOW_OWNER_ID_MISMATCH=0

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  echo "PASS: $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  echo "FAIL: $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

http_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local tmp
  tmp="$(mktemp)"
  local code

  if [[ -n "$body" ]]; then
    code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$body" || true)"
  else
    code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" || true)"
  fi

  printf "%s\n" "$code"
  cat "$tmp"
  rm -f "$tmp"
}

http_json_capture() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local tmp
  tmp="$(mktemp)"
  local code

  if [[ -n "$body" ]]; then
    code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$body" || true)"
  else
    code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" || true)"
  fi

  HTTP_CODE="$code"
  HTTP_BODY="$(cat "$tmp")"
  rm -f "$tmp"
}

for arg in "$@"; do
  case "$arg" in
    --with-reset) WITH_RESET=1 ;;
    --allow-owner-id-mismatch) ALLOW_OWNER_ID_MISMATCH=1 ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: bash scripts/verify-owner-id-mode.sh [--with-reset] [--allow-owner-id-mismatch]"
      exit 1
      ;;
  esac
done

echo "=== Cross-Stack Owner-ID-First Smoke Test ==="

if [[ "$WITH_RESET" -eq 1 ]]; then
  echo
  echo "[1/8] Running sample reset..."
  (cd "$ORCH_ROOT" && npm run reset:sample-data -- --yes)
else
  echo
  echo "[1/8] Skipping reset (use --with-reset to run reset:sample-data)."
fi

echo
echo "[2/8] Registrar owner lookup by slug..."
http_json_capture "GET" "${REGISTRAR_URL}/v1/owners/ant-worker"
OWNER_LOOKUP_CODE="${HTTP_CODE}"
OWNER_JSON="${HTTP_BODY}"

if [[ "$OWNER_LOOKUP_CODE" == "200" ]]; then
  pass "Registrar slug lookup returned HTTP 200"
else
  fail "Registrar slug lookup returned HTTP ${OWNER_LOOKUP_CODE}"
fi

OWNER_ID="$(
  printf "%s" "$OWNER_JSON" | node -e '
let s = "";
process.stdin.on("data", (c) => (s += c));
process.stdin.on("end", () => {
  try {
    const obj = JSON.parse(s);
    const id = obj.ownerId ?? obj.owner_id;
    if (id === undefined || id === null || id === "") process.exit(2);
    process.stdout.write(String(id));
  } catch {
    process.exit(2);
  }
});
' || true
)"

OWNER_SLUG="$(
  printf "%s" "$OWNER_JSON" | node -e '
let s = "";
process.stdin.on("data", (c) => (s += c));
process.stdin.on("end", () => {
  try {
    const obj = JSON.parse(s);
    const slug = obj.ownerSlug ?? obj.owner_slug;
    if (!slug) process.exit(2);
    process.stdout.write(String(slug));
  } catch {
    process.exit(2);
  }
});
' || true
)"

if [[ -n "${OWNER_ID}" && -n "${OWNER_SLUG}" ]]; then
  pass "Registrar slug lookup JSON includes owner_id and owner_slug"
else
  fail "Registrar slug lookup JSON missing owner_id or owner_slug"
  echo "$OWNER_JSON"
  exit 1
fi

echo "Discovered owner_id: ${OWNER_ID} (owner_slug=${OWNER_SLUG})"

echo
echo "[3/8] Registrar canonical lookup by id..."
http_json_capture "GET" "${REGISTRAR_URL}/v1/owners/id/${OWNER_ID}"
OWNER_BY_ID_CODE="${HTTP_CODE}"
OWNER_BY_ID_JSON="${HTTP_BODY}"

OWNER_BY_ID_MATCH="$(
  printf "%s" "$OWNER_BY_ID_JSON" | node -e '
let s = "";
process.stdin.on("data", (c) => (s += c));
process.stdin.on("end", () => {
  try {
    const obj = JSON.parse(s);
    const id = String(obj.ownerId ?? obj.owner_id ?? "");
    const slug = String(obj.ownerSlug ?? obj.owner_slug ?? "");
    if (id === process.argv[1] && slug === process.argv[2]) {
      process.stdout.write("1");
    } else {
      process.stdout.write("0");
    }
  } catch {
    process.stdout.write("0");
  }
});
' "$OWNER_ID" "$OWNER_SLUG"
)"

if [[ "$OWNER_BY_ID_CODE" == "200" && "$OWNER_BY_ID_MATCH" == "1" ]]; then
  pass "Registrar id lookup matches slug lookup owner"
else
  fail "Registrar id lookup failed or mismatched owner"
fi

echo
echo "[4/8] Export lines for orchestrator backend (.env or shell):"
echo "export RESOLVER_MODE=http"
echo "export RESOLVER_OWNER_ID=${OWNER_ID}"
echo "export RESOLVER_BASE_URL=http://localhost:5175"
echo "export ANT_WORKER_OWNER_ID=${OWNER_ID}"

if [[ -z "${ANT_WORKER_OWNER_ID:-}" ]]; then
  echo "ERROR: ANT_WORKER_OWNER_ID is required in current shell."
  echo "Set it to registrar owner_id before running: export ANT_WORKER_OWNER_ID=${OWNER_ID}"
  exit 1
fi

if [[ "${ANT_WORKER_OWNER_ID}" != "${OWNER_ID}" ]]; then
  if [[ "$ALLOW_OWNER_ID_MISMATCH" -eq 1 ]]; then
    echo "WARN: ANT_WORKER_OWNER_ID=${ANT_WORKER_OWNER_ID} does not match discovered owner_id=${OWNER_ID}; proceeding due to --allow-owner-id-mismatch."
  else
    echo "ERROR: ANT_WORKER_OWNER_ID=${ANT_WORKER_OWNER_ID} does not match discovered owner_id=${OWNER_ID}."
    echo "Use: export ANT_WORKER_OWNER_ID=${OWNER_ID}"
    echo "Or rerun with --allow-owner-id-mismatch to bypass."
    exit 1
  fi
fi

echo
echo "[5/8] Orchestrator resolverClient id-only payload probe..."
OWNER_PAYLOAD_MODE="$(
  RESOLVER_MODE=http \
  RESOLVER_OWNER_ID="$OWNER_ID" \
  RESOLVER_BASE_URL="$RESOLVER_URL" \
  node -e '
const path = require("path");
const clientPath = path.resolve(process.argv[1], "backend/src/clients/resolverClient.js");
let capturedBody = null;
global.fetch = async (_url, opts) => {
  capturedBody = JSON.parse(opts.body || "{}");
  return {
    ok: true,
    async json() { return { ok: true, results: [], coverage: 0, confidence: 0 }; },
  };
};
(async () => {
  const { queryResolver } = require(clientPath);
  await queryResolver("what is an agentnet resolver", { conversationId: "owner-id-smoke" });
  const hasOwnerId = Object.prototype.hasOwnProperty.call(capturedBody || {}, "owner_id");
  const hasOwnerSlug = Object.prototype.hasOwnProperty.call(capturedBody || {}, "owner_slug");
  process.stdout.write(hasOwnerId && !hasOwnerSlug ? "1" : "0");
})();
' "$ORCH_ROOT"
)"

if [[ "$OWNER_PAYLOAD_MODE" == "1" ]]; then
  pass "Orchestrator id-only mode builds resolver payload without owner_slug"
else
  fail "Orchestrator id-only payload probe failed"
fi

echo
echo "[6/8] Orchestrator live chat call..."
http_json_capture "POST" "${ORCH_URL}/api/chat" '{"conversationId":"owner-id-mode-verify","message":{"role":"user","content":"what is an agentnet resolver"}}'
CHAT_CODE="${HTTP_CODE}"
CHAT_JSON="${HTTP_BODY}"

CHAT_OK="$(
printf "%s" "$CHAT_JSON" | node -e '
let s = "";
process.stdin.on("data", (c) => (s += c));
process.stdin.on("end", () => {
  try {
    const obj = JSON.parse(s);
    const hasResponse = Object.prototype.hasOwnProperty.call(obj || {}, "response");
    process.stdout.write(hasResponse ? "1" : "0");
  } catch {
    process.stdout.write("0");
  }
});
'
)"

if [[ "$CHAT_CODE" == "200" && "$CHAT_OK" == "1" ]]; then
  pass "Orchestrator chat endpoint succeeded in owner_id-first workflow"
else
  fail "Orchestrator chat endpoint failed (HTTP ${CHAT_CODE})"
fi

echo
echo "[7/8] Resolver owner_id-only query path..."
http_json_capture "POST" "${RESOLVER_URL}/v1/resolve/query" "{\"owner_id\":${OWNER_ID},\"q\":\"agentnet resolver\",\"limit\":5}"
QUERY_CODE="${HTTP_CODE}"
QUERY_JSON="${HTTP_BODY}"

QUERY_OK="$(
printf "%s" "$QUERY_JSON" | node -e '
let s = "";
process.stdin.on("data", (c) => (s += c));
process.stdin.on("end", () => {
  try {
    const obj = JSON.parse(s);
    process.stdout.write(Array.isArray(obj.results) ? "1" : "0");
  } catch {
    process.stdout.write("0");
  }
});
'
)"

NODE_IDENTIFIER="$(
printf "%s" "$QUERY_JSON" | node -e '
let s = "";
process.stdin.on("data", (c) => (s += c));
process.stdin.on("end", () => {
  try {
    const obj = JSON.parse(s);
    const first = Array.isArray(obj.results) ? obj.results[0] : null;
    const id = first?.nodeId ?? first?.node_id ?? "";
    process.stdout.write(String(id));
  } catch {
    process.stdout.write("");
  }
});
'
)"

if [[ "$QUERY_CODE" == "200" && "$QUERY_OK" == "1" ]]; then
  pass "Resolver /v1/resolve/query works with owner_id-only request"
else
  fail "Resolver /v1/resolve/query owner_id-only check failed (HTTP ${QUERY_CODE})"
fi

if [[ -z "$NODE_IDENTIFIER" ]]; then
  NODE_IDENTIFIER="00000000-0000-0000-0000-000000000000"
fi

echo
echo "[8/8] Resolver owner_id-only node path..."
http_json_capture "POST" "${RESOLVER_URL}/v1/resolve/node" "{\"owner_id\":${OWNER_ID},\"identifier\":\"${NODE_IDENTIFIER}\"}"
NODE_CODE="${HTTP_CODE}"
NODE_JSON="${HTTP_BODY}"

NODE_OK="$(
printf "%s" "$NODE_JSON" | node -e '
let s = "";
process.stdin.on("data", (c) => (s += c));
process.stdin.on("end", () => {
  try {
    const obj = JSON.parse(s);
    const hasFound = Object.prototype.hasOwnProperty.call(obj || {}, "found");
    const hasOwner = Object.prototype.hasOwnProperty.call(obj || {}, "owner");
    process.stdout.write(hasFound && hasOwner ? "1" : "0");
  } catch {
    process.stdout.write("0");
  }
});
'
)"

if [[ "$NODE_CODE" == "200" && "$NODE_OK" == "1" ]]; then
  pass "Resolver /v1/resolve/node works with owner_id-only request"
else
  fail "Resolver /v1/resolve/node owner_id-only check failed (HTTP ${NODE_CODE})"
fi

echo
echo "Capsulizer strict owner_id check:"
pass "ANT_WORKER_OWNER_ID is set and validated before smoke checks"

CAPSULIZER_GUARD="$(
  node -e '
const fs = require("fs");
const p = process.argv[1];
const src = fs.readFileSync(p, "utf8");
const hasEnvGuard = src.includes("Set ANT_WORKER_OWNER_ID (discover via registrar GET /v1/owners/ant-worker)");
const hasOwnerIdRequired = src.includes("Job payload must include owner_id");
process.stdout.write(hasEnvGuard && hasOwnerIdRequired ? "1" : "0");
' "$STACK_ROOT/ant-capsulizer/src/seed.js"
)"

if [[ "$CAPSULIZER_GUARD" == "1" ]]; then
  pass "Capsulizer seed path enforces required owner_id guardrail"
else
  fail "Capsulizer seed required owner_id guard check failed"
fi

echo
echo "Resolver fallback debug stats check (optional):"
http_json_capture "GET" "${RESOLVER_URL}/debug/owner-fallback-stats"
FALLBACK_STATS_CODE="${HTTP_CODE}"
FALLBACK_STATS_JSON="${HTTP_BODY}"

if [[ "$FALLBACK_STATS_CODE" == "200" ]]; then
  FALLBACK_ZERO="$(
printf "%s" "$FALLBACK_STATS_JSON" | node -e '
let s = "";
process.stdin.on("data", (c) => (s += c));
process.stdin.on("end", () => {
  try {
    const obj = JSON.parse(s);
    const nodeFallback = Number(obj?.fallback_owner_slug_node_count ?? obj?.fallbackOwnerSlugNodeCount ?? -1);
    const queryFallback = Number(obj?.fallback_owner_slug_query_count ?? obj?.fallbackOwnerSlugQueryCount ?? -1);
    process.stdout.write(nodeFallback === 0 && queryFallback === 0 ? "1" : "0");
  } catch {
    process.stdout.write("0");
  }
});
'
)"
  if [[ "$FALLBACK_ZERO" == "1" ]]; then
    pass "Resolver debug stats confirm owner_slug fallback counts remain 0 in id-only workflow"
  else
    fail "Resolver debug stats show non-zero owner_slug fallback counts"
  fi
else
  echo "INFO: debug endpoint unavailable (HTTP ${FALLBACK_STATS_CODE}); set ENABLE_DEBUG_ENDPOINTS=1 in ant-resolver to enable this check."
fi

echo
echo "=== Smoke Test Summary ==="
echo "Passed: ${PASS_COUNT}"
echo "Failed: ${FAIL_COUNT}"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi

echo "All checks passed."
