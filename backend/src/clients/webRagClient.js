const { crawlWeb } = require("./capsulizerClient");

async function queryWeb(query) {
  const { sources, errorCode, error } = await crawlWeb({ query, limit: 5 });
  return {
    results: sources.map((s) => ({
      title: s.title || s.url,
      url: s.url,
      snippet: s.snippet || "",
      source: "web",
    })),
    errorCode: errorCode || null,
    error: error || null,
  };
}

module.exports = { queryWeb };
