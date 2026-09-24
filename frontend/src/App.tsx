import { useState, useRef, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { sendChatMessage, confirmContact, submitContact, getConversationMessages } from "./api";
import { TicketCard } from "./TicketCard";
import { ContactConfirmCard } from "./ContactConfirmCard";
import { ContactForm } from "./ContactForm";
import type { ChatMessage, ContactActionResponse, ContactDetails, HandoffStatus, Ticket } from "./types";
import "./App.css";

const POLL_INTERVAL_MS = 2500;

function makeId() {
  return crypto.randomUUID();
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I'm the Fenmoor Telecom support assistant. Before we get started, could I take your name, email address, phone number, full address, postcode, and confirm whether you're the account holder, so our team can follow up with you after this chat?",
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

  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus>("none");
  const [estimatedWaitMinutes, setEstimatedWaitMinutes] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Once queued/live, the AI stops replying synchronously - poll for whatever a
  // staff member (or the queue transition itself) has added, replacing the
  // transcript with the authoritative server copy each tick (their ids differ
  // from the locally-generated ones used for optimistic messages, so this
  // avoids duplicating the same message under two different ids).
  useEffect(() => {
    if (!conversationId || (handoffStatus !== "queued" && handoffStatus !== "live")) return;

    let cancelled = false;
    async function poll() {
      try {
        const result = await getConversationMessages(conversationId!);
        if (cancelled) return;
        setMessages([WELCOME_MESSAGE, ...result.messages]);
        setHandoffStatus(result.handoffStatus);
        setEstimatedWaitMinutes(result.estimatedWaitMinutes);
      } catch (err) {
        console.error(err);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conversationId, handoffStatus]);

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
      setHandoffStatus(response.handoffStatus ?? "none");
      setEstimatedWaitMinutes(response.estimatedWaitMinutes ?? null);
    } catch (err) {
      console.error(err);
      setError("Something went wrong reaching the support assistant. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  function applyContactActionResult(userAckText: string, result: ContactActionResponse) {
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
    setHandoffStatus(result.handoffStatus ?? "none");
    setEstimatedWaitMinutes(result.estimatedWaitMinutes ?? null);
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
              {m.role === "staff" && <span className="message-author">Support agent</span>}
              {m.content}
            </div>
          ))}
          {isSending && (
            <div className="message message-assistant message-pending">Typing…</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {handoffStatus === "queued" && (
          <div className="handoff-banner">
            Waiting for a team member — estimated wait: {estimatedWaitMinutes ?? "a few"}{" "}
            minute{estimatedWaitMinutes === 1 ? "" : "s"}.
          </div>
        )}
        {handoffStatus === "live" && (
          <div className="handoff-banner handoff-live">You're now chatting with a team member.</div>
        )}

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
