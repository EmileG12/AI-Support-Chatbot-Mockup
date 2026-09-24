import { useState, useRef, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  sendChatMessage,
  confirmContact,
  submitContact,
  getConversationMessages,
  getSettings,
  updateSettings,
} from "./api";
import { TicketCard } from "./TicketCard";
import { ContactConfirmCard } from "./ContactConfirmCard";
import { ContactForm } from "./ContactForm";
import { QueuePanel } from "./QueuePanel";
import { StaffChatWindow } from "./StaffChatWindow";
import type {
  ChatMessage,
  ContactActionResponse,
  ContactDetails,
  DraftTicket,
  HandoffStatus,
  StaffJoinResponse,
  Ticket,
} from "./types";
import "./App.css";

const POLL_INTERVAL_MS = 2500;

interface LiveConversation {
  id: string;
  draftTicket: DraftTicket | null;
  messages: ChatMessage[];
}

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

  // Staff-side state, shown alongside the customer chat below so the whole
  // working-hours handoff can be presented on one page.
  const [workingHours, setWorkingHoursState] = useState(false);
  const [liveConversation, setLiveConversation] = useState<LiveConversation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSettings()
      .then((settings) => setWorkingHoursState(settings.workingHours))
      .catch((err) => console.error(err));
  }, []);

  async function handleToggleWorkingHours() {
    const next = !workingHours;
    setWorkingHoursState(next);
    try {
      await updateSettings({ workingHours: next });
    } catch (err) {
      console.error(err);
      setWorkingHoursState(!next);
    }
  }

  function handleJoined(conversationId: string, result: StaffJoinResponse) {
    setLiveConversation({ id: conversationId, draftTicket: result.draftTicket, messages: result.messages });
  }

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
        <label className="working-hours-toggle">
          <input type="checkbox" checked={workingHours} onChange={handleToggleWorkingHours} />
          Working hours
        </label>
        <Link className="nav-link" to="/staff">
          Staff view →
        </Link>
      </header>

      <div className="app-body">
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

        <div className="staff-panel">
          {liveConversation ? (
            <StaffChatWindow
              conversationId={liveConversation.id}
              initialDraftTicket={liveConversation.draftTicket}
              initialMessages={liveConversation.messages}
              onClose={() => setLiveConversation(null)}
              onTicketCreated={() => {
                // The panel shows its own "Ticket #... created." confirmation
                // and "Close" button - nothing more to do here.
              }}
            />
          ) : (
            <QueuePanel onJoined={handleJoined} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
