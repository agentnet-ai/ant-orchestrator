const SYSTEM_BLOCK = `You are a helpful assistant. Answer using ONLY the provided context. If the context is insufficient, say so.`;

function buildPrompt({ query, resolverResult, webResult }) {
  const blocks = ["system", "resolverContext"];
  const parts = [SYSTEM_BLOCK];

  parts.push(formatResolverContext(resolverResult));

  if (webResult) {
    blocks.push("webContext");
    parts.push(formatWebContext(webResult));
  }

  blocks.push("userQuery");
  parts.push(`User query: ${query}`);

  return { prompt: parts.join("\n\n"), blocks };
}

function formatResolverContext(result) {
  const lines = result.snippets.map((s) => `- [${s.source}] ${s.text}`);
  return `Resolver context:\n${lines.join("\n")}`;
}

function formatWebContext(result) {
  const lines = result.results.map((r) => `- [${r.source}] ${r.snippet} (${r.url})`);
  return `Web context:\n${lines.join("\n")}`;
}

module.exports = { buildPrompt };
