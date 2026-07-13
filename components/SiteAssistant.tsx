"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SUGGESTED_QUESTIONS, COACH_SUGGESTED_QUESTIONS, contextFromPath } from "@/lib/assistantSuggestions";

type Message = { role: "user" | "assistant"; content: string };

export default function SiteAssistant() {
  const pathname = usePathname();
  const context = contextFromPath(pathname);

  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Determines both login state and (for signed-in users) hydrates any saved
  // conversation — a single client-side fetch after mount, so the root
  // layout itself stays a plain static component (no per-request auth check
  // forcing every route, including marketing pages, to render dynamically).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/assistant/chat")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setLoggedIn(Boolean(data.loggedIn));
        if (Array.isArray(data.messages)) {
          setMessages(data.messages.map((m: { role: "user" | "assistant"; content: string }) => ({
            role: m.role,
            content: m.content
          })));
        }
      })
      .catch(() => {
        // Silent — the widget still works fully, just as the generic
        // logged-out assistant instead of a hydrated coach.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    const previousMessages = messages;
    setInput("");
    setSending(true);
    setError("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context, history: previousMessages })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send message");
      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setMessages(previousMessages);
      setInput(message);
    } finally {
      setSending(false);
    }
  }

  const suggestions = loggedIn ? COACH_SUGGESTED_QUESTIONS : SUGGESTED_QUESTIONS[context];

  return (
    <>
      <button className="assistant-toggle" onClick={() => setOpen((o) => !o)} aria-label="Toggle assistant">
        {open ? "Close" : "Ask Melara AI"}
      </button>
      {open && (
        <div className="assistant-panel">
          <div className="assistant-header">
            <strong>{loggedIn ? "Your AI financial coach" : "Melara Assistant"}</strong>
            <p className="disclaimer">
              {loggedIn
                ? "Grounded in your saved data — educational only, not personalized advice."
                : "Product help — not investment advice."}
            </p>
          </div>
          <div className="chat-messages assistant-messages">
            {messages.length === 0 && (
              <p className="disclaimer">
                {loggedIn ? "Ask about your finances, or try one of these:" : "Ask me anything about the site, or try one of these:"}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble chat-${m.role}`}>
                {m.content}
              </div>
            ))}
          </div>
          {messages.length === 0 && (
            <div className="assistant-chips">
              {suggestions.map((q) => (
                <button key={q} className="assistant-chip" onClick={() => sendMessage(q)} disabled={sending}>
                  {q}
                </button>
              ))}
            </div>
          )}
          {error && <div className="error">{error}</div>}
          <div className="chat-input-row">
            <input
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              disabled={sending}
            />
            <button className="secondary" onClick={() => sendMessage(input)} disabled={sending}>
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
