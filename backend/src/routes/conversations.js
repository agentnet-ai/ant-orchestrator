const { Router } = require("express");
const { isDbReachable } = require("../db/connection");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const router = Router();

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

router.get("/:conversationId/messages", async (req, res) => {
  if (!isDbReachable()) {
    return res.status(503).json({ error: "DB_UNAVAILABLE" });
  }

  const { conversationId } = req.params;
  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  try {
    const conversation = await Conversation.findOne({
      where: { conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    const rows = await Message.findAll({
      where: { conversationId },
      order: [["createdAt", "ASC"]],
      limit,
      attributes: ["messageId", "role", "content", "createdAt", "trace"],
    });

    return res.json({ conversationId, messages: rows });
  } catch (err) {
    console.error("conversations error:", err);
    return res.status(500).json({ error: "INTERNAL" });
  }
});

module.exports = router;
