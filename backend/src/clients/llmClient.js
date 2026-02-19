/**
 * Mock LLM client.
 * In production this calls the language model API.
 */
async function generateResponse(prompt) {
  const latencyMs = 100 + Math.random() * 80;
  await sleep(latencyMs);

  return {
    text: "This is a mock assistant response synthesised from the provided context.",
    model: "mock-llm-v1",
    tokensUsed: 64,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { generateResponse };
