export default function MessageBubble({ message, selected, onClick }) {
  const isUser = message.role === "user";
  const displayContent = !isUser
    ? buildVisibleAssistantContent(message.content, message.trace)
    : message.content;

  if (message.thinking) {
    return (
      <div className="flex justify-start">
        <div className="bg-neutral-800 text-neutral-400 text-sm px-3 py-2 rounded-lg max-w-[75%] animate-pulse">
          Thinking…
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        onClick={onClick}
        className={[
          "text-sm px-3 py-2 rounded-lg max-w-[75%] whitespace-pre-wrap break-words",
          isUser
            ? "bg-blue-700 text-white"
            : "bg-neutral-800 text-neutral-100 cursor-pointer hover:bg-neutral-750",
          selected ? "ring-2 ring-blue-400" : "",
        ].join(" ")}
      >
        {displayContent || (
          <span className="italic text-neutral-500">(empty response)</span>
        )}
      </div>
    </div>
  );
}

function buildVisibleAssistantContent(content, trace) {
  const steps = trace?.routing?.steps || [];
  const llmExecuted = steps.some((s) => s?.name === "llm" && s?.executed);
  if (!llmExecuted || !content) return content;

  const llmAnswerText = extractLlmAnswer(content).trim() || content;
  const webUrls = extractWebUrls(trace);
  const capsuleCount = extractCapsuleCount(trace);
  const ungrounded =
    trace?.answer?.grounded === false || content.includes("UNGROUNDED:");

  return [
    ungrounded
      ? "UNGROUNDED — no AgentNet or Web sources were available.\n"
      : "",
    "--- Final Answer (LLM) ---",
    llmAnswerText,
    "",
    "--- Evidence ---",
    "Web sources:",
    webUrls.length ? webUrls.map((u) => `- ${u}`).join("\n") : "- none",
    "",
    `AgentNet capsules used: ${capsuleCount}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractLlmAnswer(content) {
  const modelHeading = "=== Model Synthesis";
  const idx = content.indexOf(modelHeading);
  if (idx < 0) return content;

  let section = content.slice(idx);
  section = section.replace(/^=== Model Synthesis[^\n]*===\n?/, "");
  section = section.replace(/^UNGROUNDED:[^\n]*\n?/, "");
  const groundingMarker = "\n\nGrounding used:";
  const gIdx = section.indexOf(groundingMarker);
  if (gIdx >= 0) section = section.slice(0, gIdx);
  return section.trim();
}

function extractWebUrls(trace) {
  const sources = trace?.provenance?.sources || [];
  const urls = sources.filter((s) => s?.type === "web" && s?.url).map((s) => s.url);
  return Array.from(new Set(urls));
}

function extractCapsuleCount(trace) {
  const sources = trace?.provenance?.sources || [];
  const resolverCount = sources.filter((s) => s?.type === "resolver").length;
  if (resolverCount > 0) return resolverCount;
  return Number(trace?.resolver?.snippetCount || 0);
}
