"use client";

import { useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/reportChat";
import { REPORT_CHAT_SUGGESTIONS, type ReportChatModule } from "@/lib/assistantSuggestions";

export default function ReportChat({
  reportId,
  module
}: {
  reportId: string;
  module: ReportChatModule;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reports/${reportId}/chat`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMessages(data.messages ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/reports/${reportId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send message");
      setMessages((current) => [...current, data.userMessage, data.assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setInput(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="report-chat">
      <h4>Ask about this report</h4>
      {loading ? (
        <p className="disclaimer">Loading chat...</p>
      ) : (
        <div className="chat-messages">
          {messages.length === 0 && (
            <p className="disclaimer">No messages yet — ask a follow-up question below, or try one of these:</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble chat-${m.role}`}>
              {m.content}
            </div>
          ))}
        </div>
      )}
      {!loading && messages.length === 0 && (
        <div className="assistant-chips">
          {REPORT_CHAT_SUGGESTIONS[module].map((q) => (
            <button key={q} className="assistant-chip" onClick={() => send(q)} disabled={sending}>
              {q}
            </button>
          ))}
        </div>
      )}
      {error && <div className="error">{error}</div>}
      <div className="chat-input-row">
        <input
          placeholder="Ask a question about this report..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={sending}
        />
        <button className="secondary" onClick={() => send()} disabled={sending}>
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
