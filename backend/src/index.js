require("dotenv").config();

const { createServer } = require("./server");
const { testDbConnection } = require("./db/connection");
const { initModels } = require("./models");

const PORT = process.env.PORT || 5055;

async function main() {
  initModels();
  await testDbConnection();

  const app = createServer();
  app.listen(PORT, () => {
    console.log(`backend listening on http://localhost:${PORT}`);
  });
}

main();
