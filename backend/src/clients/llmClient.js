const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 15000;

async function generateResponse({ query, groundingBlocks, grounded }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  const prompt = [
    "You are a grounded assistant.",
    "Answer the user query using grounding context if provided.",
    "If no grounding is provided, say that your response is ungrounded and keep claims conservative.",
    "",
    `User query: ${query}`,
    "",
    "Grounding context:",
    groundingBlocks || "(none)",
    "",
    `Grounded sources available: ${grounded ? "yes" : "no"}`,
  ].join("\n");

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        text: `LLM unavailable (${res.status}).`,
        model: OPENAI_MODEL,
        tokensUsed: 0,
        error: text || `HTTP ${res.status}`,
      };
    }

    const body = await res.json();
    const outputText =
      body.output_text ||
      body.output?.[0]?.content?.map((c) => c.text).join("\n") ||
      "";

    return {
      text: outputText || "LLM returned no text.",
      model: body.model || OPENAI_MODEL,
      tokensUsed: body.usage?.total_tokens || 0,
      error: null,
    };
  } catch (err) {
    return {
      text: "LLM unavailable (network error).",
      model: OPENAI_MODEL,
      tokensUsed: 0,
      error: String(err?.message || err),
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { generateResponse };
