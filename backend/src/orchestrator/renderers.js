function renderAgentNetDeterministic({ query, resolverSnippets }) {
  const lines = resolverSnippets.map((s) => `- ${s.text}`);
  const sources = resolverSnippets.map((s) => s.citation).filter(Boolean);

  return [
    "=== AgentNet (Deterministic / Capsules only) ===",
    lines.length
      ? lines.join("\n")
      : `No AgentNet capsule snippets found for "${query}".`,
    "",
    "Sources:",
    sources.length ? sources.map((s) => `- ${s}`).join("\n") : "- none",
  ].join("\n");
}

function renderWebRagOnly({ query, webSources }) {
  if (!webSources.length) {
    return [
      "=== Web RAG (Web crawl only) ===",
      "No web sources collected (crawl returned none).",
      "",
      "Sources:",
      "- none",
    ].join("\n");
  }

  return [
    "=== Web RAG (Web crawl only) ===",
    webSources.map((s) => `- ${s.snippet || s.text || s.title || s.url}`).join("\n"),
    "",
    "Sources:",
    webSources.map((s) => `- ${s.url}`).join("\n"),
  ].join("\n");
}

function renderModelSynthesis({ llmAnswer, sourcesUsedSummary, grounded }) {
  const heading = grounded
    ? "=== Model Synthesis (LLM — grounded if sources available) ==="
    : "=== Model Synthesis (LLM — grounded if sources available) ===\nUNGROUNDED: no AgentNet or Web sources were available.";

  return [
    heading,
    "",
    llmAnswer || "LLM returned no text.",
    "",
    "Grounding used:",
    sourcesUsedSummary.length ? sourcesUsedSummary.map((s) => `- ${s}`).join("\n") : "- none",
  ].join("\n");
}

function renderAllCombined({
  query,
  resolverSnippets,
  webSources,
  llmAnswer,
  sourcesUsedSummary,
  grounded,
}) {
  const agentnetSection = renderAgentNetDeterministic({ query, resolverSnippets });
  const webSection = renderWebRagOnly({ query, webSources });
  const modelSection = renderModelSynthesis({ llmAnswer, sourcesUsedSummary, grounded });
  return [agentnetSection, "", webSection, "", modelSection].join("\n");
}

module.exports = {
  renderAgentNetDeterministic,
  renderWebRagOnly,
  renderModelSynthesis,
  renderAllCombined,
};
