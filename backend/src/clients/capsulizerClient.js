const CAPSULIZER_BASE_URL = process.env.CAPSULIZER_BASE_URL || "http://localhost:5176";
const CAPSULIZER_TIMEOUT_MS = Number(process.env.CAPSULIZER_TIMEOUT_MS) || 6000;

async function crawlWeb({ query, limit = 5 }) {
  const url = `${CAPSULIZER_BASE_URL}/v1/web/crawl`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CAPSULIZER_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, limit }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { sources: [], errorCode: "WEB_RAG_UNAVAILABLE", error: `HTTP ${res.status}` };
    }

    const body = await res.json();
    const sources = Array.isArray(body?.sources)
      ? body.sources
          .filter((s) => s && s.url)
          .map((s) => ({
            url: s.url,
            title: s.title || "",
            snippet: s.snippet || s.text || "",
          }))
      : [];

    return { sources };
  } catch (err) {
    const timedOut = err?.name === "AbortError";
    return {
      sources: [],
      errorCode: "WEB_RAG_UNAVAILABLE",
      error: timedOut ? "timeout" : String(err?.message || err),
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { crawlWeb };
