export default function MessageBubble({ message, selected, onClick }) {
  const isUser = message.role === "user";

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
        {message.content || (
          <span className="italic text-neutral-500">(empty response)</span>
        )}
      </div>
    </div>
  );
}
