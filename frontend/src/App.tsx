import { useState, useRef, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { sendChatMessage, confirmContact, submitContact } from "./api";
import { TicketCard } from "./TicketCard";
import { ContactConfirmCard } from "./ContactConfirmCard";
import { ContactForm } from "./ContactForm";
import type { ChatMessage, ContactDetails, Ticket } from "./types";
import "./App.css";

function makeId() {
  return crypto.randomUUID();
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I'm the Fenmoor Telecom support assistant. Before we get started, could I take your name, email address and phone number so our team can follow up with you after this chat?",
};

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingContact, setPendingContact] = useState<ContactDetails | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

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
      if (response.pendingContact) {
        setPendingContact(response.pendingContact);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong reaching the support assistant. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  function applyContactActionResult(
    userAckText: string,
    result: { reply: string; ticket: Ticket | null }
  ) {
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", content: userAckText },
      ...(result.reply
        ? [{ id: makeId(), role: "assistant" as const, content: result.reply }]
        : []),
    ]);
    if (result.ticket) {
      setTicket(result.ticket);
    }
    setPendingContact(null);
    setIsEditingContact(false);
    setContactError(null);
  }

  async function handleConfirmContact() {
    if (!conversationId) return;
    setIsContactSubmitting(true);
    setContactError(null);
    try {
      const result = await confirmContact(conversationId);
      applyContactActionResult("Yes, that's correct.", result);
    } catch (err) {
      console.error(err);
      setContactError(err instanceof Error ? err.message : "Failed to confirm contact details.");
      setIsEditingContact(true);
    } finally {
      setIsContactSubmitting(false);
    }
  }

  async function handleSubmitContactForm(details: ContactDetails) {
    if (!conversationId) return;
    setIsContactSubmitting(true);
    setContactError(null);
    try {
      const result = await submitContact(conversationId, details);
      applyContactActionResult("Updated my contact details.", result);
    } catch (err) {
      console.error(err);
      setContactError(err instanceof Error ? err.message : "Failed to update contact details.");
    } finally {
      setIsContactSubmitting(false);
    }
  }

  const awaitingContact = pendingContact !== null;

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

        {awaitingContact && pendingContact && !isEditingContact && (
          <div className="contact-panel">
            <ContactConfirmCard
              contact={pendingContact}
              onConfirm={handleConfirmContact}
              onEdit={() => setIsEditingContact(true)}
              isSubmitting={isContactSubmitting}
            />
          </div>
        )}

        {awaitingContact && pendingContact && isEditingContact && (
          <div className="contact-panel">
            <ContactForm
              initial={pendingContact}
              onSubmit={handleSubmitContactForm}
              onCancel={() => {
                setIsEditingContact(false);
                setContactError(null);
              }}
              isSubmitting={isContactSubmitting}
              error={contactError}
            />
          </div>
        )}

        {!awaitingContact && (
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
        )}
      </main>
    </div>
  );
}

export default App;
