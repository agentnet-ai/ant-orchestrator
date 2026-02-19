const express = require("express");
const cors = require("cors");
const healthRouter = require("./routes/health");
const chatRouter = require("./routes/chat");

function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/chat", chatRouter);

  return app;
}

module.exports = { createServer };
