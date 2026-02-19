const RESOLVER_MODE = process.env.RESOLVER_MODE || "mock";
const RESOLVER_BASE_URL = process.env.RESOLVER_BASE_URL || "http://localhost:5175";
const RESOLVER_NODE_ENDPOINT = process.env.RESOLVER_NODE_ENDPOINT || "/v1/resolve/node";
const RESOLVER_ENDPOINT = process.env.RESOLVER_ENDPOINT || "/v1/resolve/capsules";
const RESOLVER_TIMEOUT_MS = Number(process.env.RESOLVER_TIMEOUT_MS) || 5000;
const RESOLVER_API_KEY = process.env.RESOLVER_API_KEY || "";
const RESOLVER_OWNER_SLUG = process.env.RESOLVER_OWNER_SLUG || "";

// ── public API ──────────────────────────────────────────────

async function queryResolver(query, context = {}) {
  if (RESOLVER_MODE === "http") {
    return queryResolverHttp(query, context);
  }
  return queryResolverMock(query);
}

// ── HTTP mode (two-step: node resolve → capsule fetch) ──────

async function queryResolverHttp(query, context) {
  const ownerSlug = RESOLVER_OWNER_SLUG || context.conversationId || "";

  // Step 1: resolve node by identifier
  const nodeResult = await postResolver(
    `${RESOLVER_BASE_URL}${RESOLVER_NODE_ENDPOINT}`,
    { owner_slug: ownerSlug, identifier: query }
  );

  if (nodeResult.error) {
    return failResult(`node resolve: ${nodeResult.error}`);
  }

  const raw = nodeResult.data;

  if (raw.ok === false) {
    const msg = raw.error?.message || raw.error?.code || "unknown error";
    return failResult(`node resolve ok:false (${msg})`);
  }

  if (raw.found === false || !raw.node) {
    return {
      coverage: 0,
      confidence: 0,
      snippets: [],
      capsules: [],
      facts: [],
      snippetText: "",
      notes: "resolver: node not found",
      mode: "http",
      raw,
    };
  }

  const node = raw.node;
  const nodeId = node.nodeId ?? node.node_id ?? node.id;

  if (!nodeId) {
    return failResult("node resolve: nodeId missing from response");
  }

  // Step 2: fetch capsules for the resolved node
  const capResult = await postResolver(
    `${RESOLVER_BASE_URL}${RESOLVER_ENDPOINT}`,
    { nodeId }
  );

  if (capResult.error) {
    return failResult(`capsules fetch: ${capResult.error}`);
  }

  const capRaw = capResult.data;

  if (capRaw.ok === false) {
    const msg = capRaw.error?.message || capRaw.error?.code || "unknown error";
    return failResult(`capsules ok:false (${msg})`);
  }

  return normalizeCapsuleResponse(capRaw, node);
}

/**
 * Generic POST helper with timeout and structured error capture.
 * Returns { data } on success or { error: string } on failure.
 */
async function postResolver(url, body) {
  const headers = { "Content-Type": "application/json" };
  if (RESOLVER_API_KEY) {
    headers["Authorization"] = `Bearer ${RESOLVER_API_KEY}`;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RESOLVER_TIMEOUT_MS);

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      let detail = "";
      try {
        const errBody = await res.json();
        detail = errBody.error?.message || errBody.error?.code || errBody.message || "";
      } catch { /* not JSON */ }
      return { error: `${res.status}${detail ? ": " + detail : ""}` };
    }

    return { data: await res.json() };
  } catch (err) {
    if (err.name === "AbortError") {
      return { error: `timed out (${RESOLVER_TIMEOUT_MS}ms)` };
    }
    return { error: `unreachable (${err.message})` };
  }
}

function normalizeCapsuleResponse(capRaw, node) {
  const capsules = capRaw.capsules ?? capRaw.summary?.capsules ?? capRaw.data?.capsules ?? [];
  const count = capRaw.count ?? capsules.length;
  const facts = capRaw.facts ?? capRaw.data?.facts ?? [];

  // Derive coverage/confidence from explicit fields or from capsule count
  const coverage = capRaw.coverage ?? capRaw.summary?.coverage ?? capRaw.meta?.coverage
    ?? (count > 0 ? Math.min(0.7 + count * 0.03, 1.0) : 0);
  const confidence = capRaw.confidence ?? capRaw.summary?.confidence ?? capRaw.meta?.confidence
    ?? (count > 0 ? Math.min(0.65 + count * 0.03, 1.0) : 0);

  // Extract text from capsule_json content (AgentNet capsule format)
  const snippets = capsules.map((c, i) => {
    const cj = c.capsule_json;
    const content = cj?.["agentnet:content"];
    const text = c.text || c.snippet
      || content?.["agentnet:description"]
      || content?.["agentnet:name"]
      || "";
    const name = content?.["agentnet:name"] || "";
    return {
      id: c.id || `cap-${i}`,
      text: name && text !== name ? `[${name}] ${text.slice(0, 500)}` : text.slice(0, 500),
      source: c.source || cj?.["agentnet:source"] || "resolver",
      score: c.score ?? coverage,
    };
  });

  const snippetText = capRaw.snippetText ?? capRaw.text ?? node.description
    ?? snippets.map((s) => s.text).join("\n").slice(0, 2000)
    ?? "";

  return {
    coverage: round(coverage),
    confidence: round(confidence),
    snippets,
    capsules,
    facts,
    snippetText,
    notes: "",
    mode: "http",
    raw: { node, capsules: capRaw },
  };
}

function failResult(reason) {
  return {
    coverage: 0,
    confidence: 0,
    snippets: [],
    capsules: [],
    facts: [],
    snippetText: "",
    notes: `resolver error: ${reason}`,
    mode: "http",
    raw: null,
  };
}

// ── Mock mode ───────────────────────────────────────────────

async function queryResolverMock(query) {
  const latencyMs = 40 + Math.random() * 30;
  await sleep(latencyMs);

  const forceFailAllowed =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_FORCEFAIL === "true";
  const forceFailRequested = query.toLowerCase().includes("forcefail");
  const forceFail = forceFailAllowed && forceFailRequested;
  const forceFailIgnored = forceFailRequested && !forceFailAllowed;

  const snippets = [
    {
      id: "snip-001",
      text: `Mock resolver result for: "${query}"`,
      source: "internal-kb",
      score: forceFail ? 0.3 : 0.82,
    },
  ];

  const coverage = forceFail ? 0.3 + Math.random() * 0.2 : 0.65 + Math.random() * 0.3;
  const confidence = forceFail ? 0.2 + Math.random() * 0.2 : 0.6 + Math.random() * 0.35;

  return {
    coverage: round(coverage),
    confidence: round(confidence),
    snippets,
    capsules: [],
    facts: [],
    snippetText: "",
    notes: forceFailIgnored ? "forcefail override ignored (production mode)" : "",
    mode: "mock",
    raw: null,
  };
}

// ── helpers ─────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

module.exports = { queryResolver };
