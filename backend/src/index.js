require("dotenv").config();

const { createServer } = require("./server");
const { testDbConnection } = require("./db/connection");
const { initModels } = require("./models");

const PORT = process.env.PORT || 5055;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();

console.info(`[ORCH] OPENAI_BASE_URL=${OPENAI_BASE_URL} OPENAI_MODEL=${OPENAI_MODEL}`);
if (!OPENAI_API_KEY) {
  console.warn("[ORCH] WARN: OPENAI_API_KEY not set — answerMode=model/all will return LLM unavailable (401).");
}

async function main() {
  initModels();
  await testDbConnection();

  const app = createServer();
  app.listen(PORT, () => {
    console.log(`backend listening on http://localhost:${PORT}`);
  });
}

main();
