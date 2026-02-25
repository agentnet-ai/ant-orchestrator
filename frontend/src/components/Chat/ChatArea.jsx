import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatArea({ messages, selectedIdx, onSelect, replaying, onClear }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClear}
          disabled={messages.length === 0}
          className="text-sm px-3 py-1 border border-gray-300 rounded hover:border-[#F26B3A] hover:text-[#F26B3A] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>
      {replaying && (
        <div className="text-xs text-neutral-500 text-center py-2 animate-pulse">
          Replaying…
        </div>
      )}
      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          selected={i === selectedIdx}
          onClick={() => msg.role === "assistant" && onSelect(i)}
        />
      ))}
      <div ref={endRef} />
    </div>
  );
}
