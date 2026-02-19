const { isDbReachable } = require("../db/connection");
const { requestId } = require("../utils/ids");

const ENABLED = process.env.ENABLE_DB_PERSIST === "true";
let _warningLogged = false;

/**
 * Optionally persist chat run to MySQL.
 * Fail-open: never blocks or rejects the response.
 */
async function persistChatRun({ query, result, conversationId }) {
  if (!ENABLED) return;
  if (!isDbReachable()) return;

  try {
    const { models } = require("../models");
    const { Conversation, Message } = models;

    const cid = conversationId || result.trace?.requestId || requestId();

    await Conversation.findOrCreate({
      where: { conversationId: cid },
      defaults: { conversationId: cid },
    });

    await Message.create({
      conversationId: cid,
      messageId: requestId(),
      role: "user",
      content: query,
      trace: null,
    });

    await Message.create({
      conversationId: cid,
      messageId: result.trace?.requestId || requestId(),
      role: "assistant",
      content: result.response,
      trace: result.trace,
    });
  } catch (err) {
    if (!_warningLogged) {
      console.warn(`persist: write failed – ${err.message}`);
      _warningLogged = true;
    }
  }
}

module.exports = { persistChatRun };
