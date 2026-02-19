const express = require("express");
const cors = require("cors");
const healthRouter = require("./routes/health");
const chatRouter = require("./routes/chat");
const conversationsRouter = require("./routes/conversations");

function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/conversations", conversationsRouter);

  return app;
}

module.exports = { createServer };
