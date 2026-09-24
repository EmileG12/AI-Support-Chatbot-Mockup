import { useEffect, useRef, useState, type FormEvent } from "react";
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

function draftsEqual(a: DraftTicket | null, b: DraftTicket | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.category === b.category &&
    a.priority === b.priority &&
    a.summary === b.summary &&
    a.raw_message === b.raw_message &&
    (a.troubleshooting_notes ?? "") === (b.troubleshooting_notes ?? "")
  );
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
  // The AI draft `draft` was last synced from - used to tell "staff edited
  // this field" apart from "the AI's own suggestion moved on".
  const [appliedAiDraft, setAppliedAiDraft] = useState<DraftTicket | null>(initialDraftTicket);
  // A newer AI suggestion that arrived while the draft had unsaved manual
  // edits - held for staff to accept/dismiss rather than applied silently.
  const [pendingAiDraft, setPendingAiDraft] = useState<DraftTicket | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const appliedAiDraftRef = useRef(appliedAiDraft);
  useEffect(() => {
    appliedAiDraftRef.current = appliedAiDraft;
  }, [appliedAiDraft]);

  useEffect(() => {
    if (createdTicket) return;
    let cancelled = false;

    async function poll() {
      try {
        const result = await getConversationMessages(conversationId);
        if (cancelled) return;
        setMessages(result.messages);

        // The customer's own new messages re-drafted this on the backend
        // (see conversationFlow.updateDraftTicket). Only act if it actually
        // changed from the last one we saw.
        if (result.draftTicket && !draftsEqual(result.draftTicket, appliedAiDraftRef.current)) {
          if (draftsEqual(draftRef.current, appliedAiDraftRef.current)) {
            // No manual edits since the last AI draft - safe to apply directly.
            setDraft(result.draftTicket);
            setAppliedAiDraft(result.draftTicket);
            setPendingAiDraft(null);
          } else {
            // Staff has edited fields the AI hasn't seen - don't overwrite
            // them; let staff review and choose.
            setPendingAiDraft(result.draftTicket);
          }
        }
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
  }, [conversationId, createdTicket]);

  function handleAcceptAiDraft() {
    if (!pendingAiDraft) return;
    setDraft(pendingAiDraft);
    setAppliedAiDraft(pendingAiDraft);
    setPendingAiDraft(null);
  }

  function handleDismissAiDraft() {
    if (!pendingAiDraft) return;
    // Keep the staff's own edits, but mark this suggestion as seen so it
    // isn't offered again unchanged next poll.
    setAppliedAiDraft(pendingAiDraft);
    setPendingAiDraft(null);
  }

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

        {pendingAiDraft && (
          <div className="ai-draft-suggestion">
            <p>
              The customer said more since you edited this - the AI suggests an update, but won't
              overwrite your changes without you saying so:
            </p>
            <dl>
              {pendingAiDraft.category !== draft.category && (
                <>
                  <dt>Category</dt>
                  <dd>{CATEGORY_LABELS[pendingAiDraft.category]}</dd>
                </>
              )}
              {pendingAiDraft.priority !== draft.priority && (
                <>
                  <dt>Priority</dt>
                  <dd>{PRIORITY_LABELS[pendingAiDraft.priority]}</dd>
                </>
              )}
              {pendingAiDraft.summary !== draft.summary && (
                <>
                  <dt>Summary</dt>
                  <dd>{pendingAiDraft.summary}</dd>
                </>
              )}
              {(pendingAiDraft.troubleshooting_notes ?? "") !== (draft.troubleshooting_notes ?? "") && (
                <>
                  <dt>Diagnostics</dt>
                  <dd>{pendingAiDraft.troubleshooting_notes || "(cleared)"}</dd>
                </>
              )}
            </dl>
            <div className="ai-draft-suggestion-actions">
              <button onClick={handleAcceptAiDraft}>Use AI update</button>
              <button className="secondary" onClick={handleDismissAiDraft}>
                Keep my edits
              </button>
            </div>
          </div>
        )}

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
