const express = require("express");
const cors = require("cors");
const healthRouter = require("./routes/health");
const chatRouter = require("./routes/chat");
const conversationsRouter = require("./routes/conversations");
const { getLatestInquiry } = require("./state/latestInquiry");

function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/conversations", conversationsRouter);
  app.get("/api/demo/latest-inquiry", (_req, res) => {
    const latest = getLatestInquiry();
    if (!latest) return res.status(204).end();
    return res.json(latest);
  });

  return app;
}

module.exports = { createServer };
