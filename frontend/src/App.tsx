import { useState, useRef, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { sendChatMessage } from "./api";
import { TicketCard } from "./TicketCard";
import type { ChatMessage, Ticket } from "./types";
import "./App.css";

function makeId() {
  return crypto.randomUUID();
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi, I'm the Fenmoor Telecom support assistant. What's gone wrong, or what can I help with?",
};

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const response = await sendChatMessage(trimmed, conversationId);
      setConversationId(response.conversationId);
      if (response.reply) {
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: "assistant", content: response.reply },
        ]);
      }
      if (response.ticket) {
        setTicket(response.ticket);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong reaching the support assistant. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Fenmoor Telecom Support</h1>
        <p>Chat with us and we'll log a ticket for the right team.</p>
        <Link className="nav-link" to="/staff">
          Staff view →
        </Link>
      </header>

      <main className="chat-panel">
        <div className="message-list">
          {messages.map((m) => (
            <div key={m.id} className={`message message-${m.role}`}>
              {m.content}
            </div>
          ))}
          {isSending && (
            <div className="message message-assistant message-pending">Typing…</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {ticket && (
          <div className="ticket-panel">
            <TicketCard ticket={ticket} />
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <form className="chat-input-row" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the issue you're having…"
            disabled={isSending}
          />
          <button type="submit" disabled={isSending || !input.trim()}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
