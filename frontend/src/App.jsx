import { useState, useCallback, useEffect, useRef } from "react";
import { sendMessage, replayConversation } from "./api/chatApi";
import ChatArea from "./components/Chat/ChatArea";
import ChatInput from "./components/Chat/ChatInput";
import TracePanel from "./components/Trace/TracePanel";

const LS_CID = "ant_orch_conversationId";
const LS_WEB = "ant_orch_enableWebRag";
const LS_LLM = "ant_orch_enableLlm";
const LS_ANSWER_MODE = "ant_orch_answerMode";

function getOrCreateCid() {
  let cid = localStorage.getItem(LS_CID);
  if (!cid) {
    cid = crypto.randomUUID();
    localStorage.setItem(LS_CID, cid);
  }
  return cid;
}

function loadBool(key) {
  return localStorage.getItem(key) === "true";
}

function loadAnswerMode() {
  const stored = localStorage.getItem(LS_ANSWER_MODE);
  if (stored === "agentnet" || stored === "rag" || stored === "model" || stored === "all") {
    return stored;
  }
  return import.meta.env.PROD ? "agentnet" : "all";
}

export default function App() {
  const [conversationId] = useState(getOrCreateCid);
  const [messages, setMessages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [banner, setBanner] = useState(null);

  const [enableWebRag, setEnableWebRag] = useState(() => loadBool(LS_WEB));
  const [enableLlm, setEnableLlm] = useState(() => loadBool(LS_LLM));
  const [answerMode, setAnswerMode] = useState(loadAnswerMode);

  const replayDone = useRef(false);

  // Persist toggle state
  useEffect(() => { localStorage.setItem(LS_WEB, enableWebRag); }, [enableWebRag]);
  useEffect(() => { localStorage.setItem(LS_LLM, enableLlm); }, [enableLlm]);
  useEffect(() => { localStorage.setItem(LS_ANSWER_MODE, answerMode); }, [answerMode]);

  // Replay on mount
  useEffect(() => {
    if (replayDone.current) return;
    replayDone.current = true;

    (async () => {
      setReplaying(true);
      try {
        const result = await replayConversation(conversationId);

        if (result.status === "db_unavailable") {
          setBanner("Audit DB unavailable");
        }

        if (result.status === "ok" && result.messages.length > 0) {
          const mapped = result.messages.map((m, i) => ({
            id: m.messageId || `replay-${i}`,
            role: m.role,
            content: m.content,
            trace: m.trace || null,
          }));
          setMessages(mapped);

          const lastAssistant = mapped.reduce(
            (acc, m, i) => (m.role === "assistant" ? i : acc),
            null
          );
          if (lastAssistant !== null) setSelectedIdx(lastAssistant);
        }
      } catch {
        // Network error — treat as fresh
      } finally {
        setReplaying(false);
      }
    })();
  }, [conversationId]);

  const handleSend = useCallback(
    async (text) => {
      const userMsg = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        trace: null,
      };
      const thinkingMsg = {
        id: "thinking",
        role: "assistant",
        content: "",
        thinking: true,
        trace: null,
      };

      setMessages((prev) => [...prev, userMsg, thinkingMsg]);
      setLoading(true);

      try {
        const data = await sendMessage({
          conversationId,
          text,
          options: { enableWebRag, enableLlm },
          answerMode,
        });

        const assistantMsg = {
          id: data.trace?.requestId || crypto.randomUUID(),
          role: "assistant",
          content: data.response,
          trace: data.trace,
        };

        setMessages((prev) => {
          const next = prev.filter((m) => m.id !== "thinking");
          next.push(assistantMsg);
          return next;
        });

        setMessages((prev) => {
          setSelectedIdx(prev.length - 1);
          return prev;
        });
      } catch (err) {
        setMessages((prev) => {
          const next = prev.filter((m) => m.id !== "thinking");
          next.push({
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Error: ${err.message}`,
            trace: null,
          });
          return next;
        });
      } finally {
        setLoading(false);
      }
    },
    [conversationId, enableWebRag, enableLlm, answerMode]
  );

  const handleClearResponse = useCallback(() => {
    setMessages([]);
    setSelectedIdx(null);
  }, []);

  const selectedTrace =
    selectedIdx !== null && messages[selectedIdx]?.trace
      ? messages[selectedIdx].trace
      : null;

  return (
    <div className="flex h-full">
      {/* Left: Chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {banner && (
          <div className="bg-amber-900/60 text-amber-200 text-xs px-3 py-1.5 text-center">
            {banner}
          </div>
        )}
        <ChatArea
          messages={messages}
          selectedIdx={selectedIdx}
          onSelect={setSelectedIdx}
          replaying={replaying}
          onClear={handleClearResponse}
        />
        <ChatInput
          onSend={handleSend}
          disabled={loading}
          enableWebRag={enableWebRag}
          enableLlm={enableLlm}
          answerMode={answerMode}
          onAnswerModeChange={setAnswerMode}
          onToggleWebRag={() => setEnableWebRag((v) => !v)}
          onToggleLlm={() => setEnableLlm((v) => !v)}
        />
      </div>

      {/* Right: Trace */}
      <div className="w-[360px] max-w-[25vw] border-l border-neutral-700 flex-shrink-0">
        <TracePanel trace={selectedTrace} />
      </div>
    </div>
  );
}
