/**
 * Mock web-RAG client.
 * In production this performs web retrieval-augmented generation.
 */
async function queryWeb(query) {
  const latencyMs = 80 + Math.random() * 60;
  await sleep(latencyMs);

  return {
    results: [
      {
        title: `Web result for: "${query}"`,
        url: "https://example.com/mock",
        snippet: "This is a mock web-RAG snippet.",
        source: "web",
      },
    ],
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { queryWeb };
