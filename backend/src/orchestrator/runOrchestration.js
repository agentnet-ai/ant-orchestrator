const { requestId } = require("../utils/ids");
const { startTimer } = require("../utils/time");
const { queryResolver } = require("../clients/resolverClient");
const { queryWeb } = require("../clients/webRagClient");
const { generateResponse } = require("../clients/llmClient");
const { THRESHOLDS, evaluateThresholds } = require("./thresholds");
const { buildPrompt } = require("./promptBlocks");
const { persistChatRun } = require("../persist/persistChatRun");

const DEFAULT_OPTIONS = { enableWebRag: false, enableLlm: false };

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

  // --- Routing decisions ---
  const steps = [];
  let webResult = null;
  let webMs = 0;
  let llmResult = null;
  let llmMs = 0;

  steps.push({ name: "resolver", executed: true, reason: "Ground-First: always executes" });

  if (threshold.passed) {
    steps.push({ name: "webRag", executed: false, reason: "Resolver met thresholds" });
    steps.push({ name: "llm", executed: false, reason: "Resolver met thresholds" });
  } else {
    if (opts.enableWebRag) {
      const webTimer = startTimer();
      webResult = await queryWeb(query);
      webMs = webTimer();
      steps.push({ name: "webRag", executed: true, reason: "Resolver below thresholds" });
    } else {
      steps.push({ name: "webRag", executed: false, reason: "Disabled by options" });
    }

    if (opts.enableLlm) {
      const { prompt } = buildPrompt({ query, resolverResult, webResult });
      const llmTimer = startTimer();
      llmResult = await generateResponse(prompt);
      llmMs = llmTimer();
      steps.push({ name: "llm", executed: true, reason: "Resolver below thresholds" });
    } else {
      steps.push({ name: "llm", executed: false, reason: "Disabled by options" });
    }
  }

  // --- Build prompt blocks list (for trace) ---
  const { blocks } = buildPrompt({ query, resolverResult, webResult });

  // --- Assemble response ---
  let response;
  if (llmResult) {
    response = llmResult.text;
  } else {
    response = resolverResult.snippets.map((s) => s.text).join("\n");
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

  const result = {
    response,
    trace: {
      traceVersion: "0.1",
      requestId: id,
      routing: {
        resolverUsed: true,
        webRagUsed: webResult !== null,
        reason: threshold.notes,
        steps,
      },
      resolver: {
        coverage: resolverResult.coverage,
        confidence: resolverResult.confidence,
        snippetCount: resolverResult.snippets.length,
        mode: resolverResult.mode || "mock",
      },
      thresholds: {
        ...THRESHOLDS.resolver,
        passed: threshold.passed,
        webRagTriggered: webResult !== null,
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

  await persistChatRun({ query, result, conversationId: opts.conversationId });

  return result;
}

module.exports = { runOrchestration };
