import { useState } from "react";

function Toggle({ label, on, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={[
        "text-xs px-2 py-0.5 rounded-full border transition-colors",
        on
          ? "bg-blue-600 border-blue-500 text-white"
          : "bg-neutral-800 border-neutral-600 text-neutral-400",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      {label} {on ? "ON" : "OFF"}
    </button>
  );
}

export default function ChatInput({
  onSend,
  disabled,
  enableWebRag,
  enableLlm,
  answerMode,
  onAnswerModeChange,
  onToggleWebRag,
  onToggleLlm,
}) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText("");
    onSend(trimmed);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-neutral-700 px-4 py-3 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <Toggle label="Web RAG" on={enableWebRag} onToggle={onToggleWebRag} disabled={disabled} />
        <Toggle label="LLM" on={enableLlm} onToggle={onToggleLlm} disabled={disabled} />
        <label className="ml-auto flex items-center gap-2 text-xs text-neutral-400">
          <span>Answer mode</span>
          <select
            value={answerMode}
            onChange={(e) => onAnswerModeChange(e.target.value)}
            disabled={disabled}
            className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-neutral-100"
          >
            <option value="agentnet">AgentNet (Deterministic)</option>
            <option value="rag">RAG (AgentNet + Web)</option>
            <option value="model">Model (LLM Synthesis)</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder="Type a message…"
          className="flex-1 bg-neutral-800 border-2 border-[#F26B3A] rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#F26B3A]"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  );
}
