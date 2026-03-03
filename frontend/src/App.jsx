import { useState, useCallback, useEffect } from "react";
import { sendMessage } from "./api/chatApi";
import ChatArea from "./components/Chat/ChatArea";
import ChatInput from "./components/Chat/ChatInput";
import TracePanel from "./components/Trace/TracePanel";

const LS_CID = "ant_orch_conversationId";
const LS_WEB = "ant_orch_enableWebRag";
const LS_LLM = "ant_orch_enableLlm";
const LS_ANSWER_MODE = "ant_orch_answerMode";

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
  const [conversationId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replaying] = useState(false);
  const [banner, setBanner] = useState(null);
  const [latestInquiry, setLatestInquiry] = useState(null);
  const [latestInquiryStatus, setLatestInquiryStatus] = useState("idle");

  const [enableWebRag, setEnableWebRag] = useState(() => loadBool(LS_WEB));
  const [enableLlm, setEnableLlm] = useState(() => loadBool(LS_LLM));
  const [answerMode, setAnswerMode] = useState(loadAnswerMode);

  // Persist toggle state
  useEffect(() => { localStorage.setItem(LS_WEB, enableWebRag); }, [enableWebRag]);
  useEffect(() => { localStorage.setItem(LS_LLM, enableLlm); }, [enableLlm]);
  useEffect(() => { localStorage.setItem(LS_ANSWER_MODE, answerMode); }, [answerMode]);

  // Stateless demo mode: clear stale UI/persistence on fresh load.
  useEffect(() => {
    const keysToClear = [
      LS_CID,
      "agentnet:conversations",
      "agentnet:lastTrace",
      "ant_orch_lastTrace",
      "ant_orch_messages",
    ];
    for (const key of keysToClear) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
    setMessages([]);
    setSelectedIdx(null);
    setLatestInquiry(null);
    setLatestInquiryStatus("idle");
    setBanner(null);
  }, []);

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
        if (err?.code === "OWNER_ID_REQUIRED") {
          setBanner("Resolver owner is required. Demo mode expects owner_id=1.");
        } else if (err?.code === "QUERY_TOO_SHORT") {
          setBanner("Query too short for resolver. Please enter a longer query.");
        }
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

  const refreshLatestInquiry = useCallback(async () => {
    try {
      setLatestInquiryStatus("loading");

      const res = await fetch("http://localhost:5055/api/demo/latest-inquiry");

      if (res.status === 204) {
        setLatestInquiry(null);
        setLatestInquiryStatus("empty");
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("[latest-inquiry] fetched", data);

      setLatestInquiry(data);
      setLatestInquiryStatus("idle");
    } catch (err) {
      console.error("[latest-inquiry] error", err);
      setLatestInquiryStatus("error");
    }
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
        <div className="border-b border-neutral-700 px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-neutral-300">Latest grounded result</span>
            <button
              type="button"
              onClick={refreshLatestInquiry}
              disabled={latestInquiryStatus === "loading"}
              className="rounded border border-neutral-600 px-2 py-1 text-neutral-200 disabled:opacity-60"
            >
              {latestInquiryStatus === "loading" ? "Refreshing..." : "Refresh grounded result"}
            </button>
          </div>
          {latestInquiry ? (
            <div className="mt-2 space-y-1 text-neutral-300">
              <div>updatedAt: {latestInquiry.updatedAt || "-"}</div>
              <div>nodeOrigin: {latestInquiry.nodeOrigin || "-"}</div>
              <div>capsuleCount: {latestInquiry.capsuleCount ?? "-"}</div>
              <div>runId: {latestInquiry.runId || "-"}</div>
            </div>
          ) : latestInquiryStatus === "loading" ? (
            <div className="mt-2 text-neutral-400">Loading...</div>
          ) : latestInquiryStatus === "error" ? (
            <div className="mt-2 text-rose-300">Error loading inquiry.</div>
          ) : (
            <div className="mt-2 text-neutral-400">No inquiry captured yet.</div>
          )}
        </div>
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
