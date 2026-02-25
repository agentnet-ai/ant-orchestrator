const { requestId } = require("../utils/ids");
const { startTimer } = require("../utils/time");
const { queryResolver } = require("../clients/resolverClient");
const { queryWeb } = require("../clients/webRagClient");
const { generateResponse } = require("../clients/llmClient");
const { THRESHOLDS, evaluateThresholds } = require("./thresholds");
const { buildPrompt } = require("./promptBlocks");
const { persistChatRun } = require("../persist/persistChatRun");
const {
  renderAgentNetDeterministic,
  renderWebRagOnly,
  renderModelSynthesis,
  renderAllCombined: renderCombinedAll,
} = require("./renderers");

const DEFAULT_OPTIONS = { enableWebRag: false, enableLlm: false, answerMode: "agentnet" };

async function runOrchestration(query, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const id = requestId();
  const total = startTimer();

  // --- Ground-First: resolver always runs first ---
  const resolverTimer = startTimer();
  const resolverResult = await queryResolver(query, { conversationId: opts.conversationId });
  const resolverMs = resolverTimer();

  // --- Threshold evaluation ---
  const threshold = evaluateThresholds(resolverResult);

  // --- Strict execution semantics by answer mode ---
  const answerMode = normalizeAnswerMode(opts.answerMode);
  const forceWeb = answerMode === "rag" || answerMode === "model" || answerMode === "all";
  const forceLlm = answerMode === "model" || answerMode === "all";

  // --- Routing decisions / execution ---
  const steps = [];
  let webResult = null;
  let webMs = 0;
  let llmResult = null;
  let llmMs = 0;

  steps.push({ name: "resolver", executed: true, reason: "Ground-First: always executes" });

  if (forceWeb) {
    const webTimer = startTimer();
    webResult = await queryWeb(query);
    webMs = webTimer();
    steps.push({ name: "webRag", executed: true, reason: `Forced by answerMode=${answerMode}` });
  } else {
    steps.push({ name: "webRag", executed: false, reason: `Skipped by answerMode=${answerMode}` });
  }

  if (forceLlm) {
    const resolverSnippets = buildResolverSnippets(resolverResult);
    const webSources = buildWebSources(webResult);
    const groundingBlocks = buildGroundingBlocks(resolverSnippets, webSources);
    const llmTimer = startTimer();
    llmResult = await generateResponse({
      query,
      groundingBlocks,
      grounded: groundingBlocks.length > 0,
    });
    llmMs = llmTimer();
    steps.push({ name: "llm", executed: true, reason: `Forced by answerMode=${answerMode}` });
  } else {
    steps.push({ name: "llm", executed: false, reason: `Skipped by answerMode=${answerMode}` });
  }

  // --- Build prompt blocks list (for trace) ---
  const { blocks } = buildPrompt({ query, resolverResult, webResult });

  // --- Assemble response ---
  const resolverSnippets = buildResolverSnippets(resolverResult);
  const webSources = buildWebSources(webResult);
  const sourcesUsedSummary = [
    ...resolverSnippets.map((s) => s.citation).filter(Boolean),
    ...webSources.map((s) => s.url),
  ];
  const grounded = sourcesUsedSummary.length > 0;

  let response;
  if (answerMode === "agentnet") {
    response = renderAgentNetDeterministic({ query, resolverSnippets });
  } else if (answerMode === "rag") {
    response = renderWebRagOnly({ query, webSources });
  } else if (answerMode === "model") {
    response = renderModelSynthesis({
      llmAnswer: llmResult?.text || "LLM returned no text.",
      sourcesUsedSummary,
      grounded,
    });
  } else {
    response = renderCombinedAll({
      query,
      resolverSnippets,
      webSources,
      llmAnswer: llmResult?.text || "LLM returned no text.",
      sourcesUsedSummary,
      grounded,
    });
  }

  // --- Assemble provenance ---
  const sources = resolverResult.snippets.map((s) => ({
    type: "resolver",
    id: s.id,
    source: s.source,
  }));
  if (webResult) {
    webResult.results.forEach((r) =>
      sources.push({ type: "web", url: r.url, source: r.source })
    );
  }

  const routedVia = resolverResult.routedVia || "identifier";

  const result = {
    response,
    trace: {
      traceVersion: "0.1",
      requestId: id,
      routing: {
        resolverUsed: true,
        webRagUsed: forceWeb,
        routedVia,
        reason: `Strict mode: ${answerMode}`,
        steps,
      },
      resolver: {
        coverage: resolverResult.coverage,
        confidence: resolverResult.confidence,
        snippetCount: resolverResult.snippets.length,
        mode: resolverResult.mode || "mock",
        routedVia,
      },
      thresholds: {
        ...THRESHOLDS.resolver,
        passed: threshold.passed,
        webRagTriggered: forceWeb,
        notes: resolverResult.notes
          ? threshold.notes + "; " + resolverResult.notes
          : threshold.notes,
      },
      promptBlocks: blocks,
      provenance: { sources },
      timing: {
        totalMs: total(),
        resolverMs,
        webRagMs: webMs,
        llmMs,
      },
    },
  };
  result.trace.answer = { mode: answerMode, grounded };

  await persistChatRun({ query, result, conversationId: opts.conversationId, identitySnapshot: resolverResult.identitySnapshot });

  return result;
}

module.exports = { runOrchestration };

function normalizeAnswerMode(mode) {
  return ["agentnet", "rag", "model", "all"].includes(mode) ? mode : "agentnet";
}

function buildResolverSnippets(resolverResult) {
  const capsules = Array.isArray(resolverResult.capsules) ? resolverResult.capsules : [];
  return resolverResult.snippets.map((s, i) => {
    const cap = capsules[i] || {};
    const citation =
      cap.capsule_uri ||
      cap.capsuleUri ||
      cap.url ||
      (cap.id ? `capsule:${cap.id}` : null);
    return {
      text: s.text,
      citation,
    };
  });
}

function buildWebSources(webResult) {
  return (webResult?.results || []).map((r) => ({
    url: r.url,
    title: r.title || "",
    snippet: r.snippet || "",
  }));
}

function buildGroundingBlocks(resolverSnippets, webSources) {
  const resolverBlock = resolverSnippets.map((s) => `- ${s.text} [${s.citation || "capsule:unknown"}]`);
  const webBlock = webSources.map((s) => `- ${s.snippet || s.title} [${s.url}]`);
  return [...resolverBlock, ...webBlock].join("\n");
}
