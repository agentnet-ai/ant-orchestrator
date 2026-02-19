const API_BASE = "http://localhost:5055";

export async function sendMessage({ conversationId, text, options }) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId,
      message: { role: "user", content: text },
      options,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  return res.json();
}

export async function replayConversation(conversationId, limit = 200) {
  const res = await fetch(
    `${API_BASE}/api/conversations/${encodeURIComponent(conversationId)}/messages?limit=${limit}`
  );

  if (res.status === 404) return { status: "not_found", messages: [] };
  if (res.status === 503) return { status: "db_unavailable", messages: [] };

  if (!res.ok) {
    return { status: "error", messages: [] };
  }

  const data = await res.json();
  return { status: "ok", messages: data.messages || [] };
}
