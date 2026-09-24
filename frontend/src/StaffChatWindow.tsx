import { useEffect, useState, type FormEvent } from "react";
import { getConversationMessages, sendStaffMessage, createTicketFromDraft } from "./api";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "./TicketCard";
import type { ChatMessage, DraftTicket, Ticket, TicketCategory, TicketPriority } from "./types";

const POLL_INTERVAL_MS = 2500;

function blankDraft(messages: ChatMessage[]): DraftTicket {
  return {
    category: "other",
    priority: "medium",
    summary: "",
    raw_message: messages.find((m) => m.role === "user")?.content ?? "",
  };
}

interface StaffChatWindowProps {
  conversationId: string;
  initialDraftTicket: DraftTicket | null;
  initialMessages: ChatMessage[];
  onClose: () => void;
  onTicketCreated: (ticket: Ticket) => void;
}

export function StaffChatWindow({
  conversationId,
  initialDraftTicket,
  initialMessages,
  onClose,
  onTicketCreated,
}: StaffChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState<DraftTicket>(initialDraftTicket ?? blankDraft(initialMessages));
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await getConversationMessages(conversationId);
        if (!cancelled) setMessages(result.messages);
      } catch (err) {
        console.error(err);
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conversationId]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setError(null);
    try {
      const message = await sendStaffMessage(conversationId, trimmed);
      setMessages((prev) => [...prev, message]);
      setInput("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to send the message.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateTicket() {
    setIsCreatingTicket(true);
    setError(null);
    try {
      const ticket = await createTicketFromDraft(conversationId, draft);
      setCreatedTicket(ticket);
      onTicketCreated(ticket);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create the ticket.");
    } finally {
      setIsCreatingTicket(false);
    }
  }

  return (
    <div className="ticket-detail-panel staff-chat-window">
      <div className="staff-chat-header">
        <h2>Live chat</h2>
        <button className="secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="staff-draft-card">
        <span className="staff-draft-label">AI-drafted ticket (edit before creating)</span>
        <div className="edit-row">
          <label>
            Category
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as TicketCategory })}
              disabled={!!createdTicket}
            >
              {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as TicketPriority })}
              disabled={!!createdTicket}
            >
              {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="staff-draft-textarea">
          Summary
          <textarea
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            disabled={!!createdTicket}
            rows={2}
          />
        </label>
        <label className="staff-draft-textarea">
          Diagnostics / troubleshooting notes
          <textarea
            value={draft.troubleshooting_notes ?? ""}
            onChange={(e) => setDraft({ ...draft, troubleshooting_notes: e.target.value })}
            disabled={!!createdTicket}
            rows={2}
          />
        </label>

        {createdTicket ? (
          <p className="staff-ticket-created">Ticket #{createdTicket.id.slice(0, 8)} created.</p>
        ) : (
          <button onClick={handleCreateTicket} disabled={isCreatingTicket || !draft.summary.trim()}>
            {isCreatingTicket ? "Creating…" : "Create ticket"}
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <h3>Conversation</h3>
      <div className="transcript">
        {messages.map((m) => (
          <div key={m.id} className={`transcript-message transcript-${m.role}`}>
            {m.role === "staff" && <span className="message-author">You</span>}
            {m.content}
          </div>
        ))}
      </div>

      {!createdTicket && (
        <form className="chat-input-row" onSubmit={handleSend}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Reply to the customer…"
            disabled={isSending}
          />
          <button type="submit" disabled={isSending || !input.trim()}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}
