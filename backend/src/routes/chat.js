const { Router } = require("express");
const { z } = require("zod");
const { runOrchestration } = require("../orchestrator/runOrchestration");

const router = Router();

const chatSchema = z.object({
  conversationId: z.string().min(1),
  message: z.object({
    role: z.string(),
    content: z.string(),
  }),
  options: z.object({
    enableWebRag: z.boolean().optional(),
    enableLlm: z.boolean().optional(),
  }).optional(),
  answerMode: z.enum(["agentnet", "rag", "model", "all"]).optional(),
});

router.post("/", async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  const { conversationId, message, options, answerMode } = parsed.data;

  try {
    const result = await runOrchestration(message.content, {
      ...options,
      conversationId,
      answerMode,
    });
    res.json(result);
  } catch (err) {
    console.error("chat error:", err);
    res.status(500).json({ error: "internal" });
  }
});

module.exports = router;
