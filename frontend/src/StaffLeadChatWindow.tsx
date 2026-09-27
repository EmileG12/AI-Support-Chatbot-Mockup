import { useEffect, useRef, useState, type FormEvent } from "react";
import { getConversationMessages, sendStaffMessage, createLeadFromDraft } from "./api";
import { SALES_CATEGORY_LABELS } from "./LeadCard";
import type { ChatMessage, DraftLead, Lead, SalesCategory } from "./types";

const POLL_INTERVAL_MS = 2500;

function blankDraft(messages: ChatMessage[]): DraftLead {
  return {
    category: "broadband",
    summary: "",
    raw_message: messages.find((m) => m.role === "user")?.content ?? "",
  };
}

function draftsEqual(a: DraftLead | null, b: DraftLead | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.category === b.category &&
    a.summary === b.summary &&
    a.raw_message === b.raw_message &&
    (a.plan_interested ?? "") === (b.plan_interested ?? "")
  );
}

interface StaffLeadChatWindowProps {
  conversationId: string;
  initialDraftLead: DraftLead | null;
  initialMessages: ChatMessage[];
  onClose: () => void;
  onLeadCreated: (lead: Lead) => void;
}

export function StaffLeadChatWindow({
  conversationId,
  initialDraftLead,
  initialMessages,
  onClose,
  onLeadCreated,
}: StaffLeadChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState<DraftLead>(initialDraftLead ?? blankDraft(initialMessages));
  // The AI draft `draft` was last synced from - used to tell "staff edited
  // this field" apart from "the AI's own suggestion moved on".
  const [appliedAiDraft, setAppliedAiDraft] = useState<DraftLead | null>(initialDraftLead);
  // A newer AI suggestion that arrived while the draft had unsaved manual
  // edits - held for staff to accept/dismiss rather than applied silently.
  const [pendingAiDraft, setPendingAiDraft] = useState<DraftLead | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [createdLead, setCreatedLead] = useState<Lead | null>(null);
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
    if (createdLead) return;
    let cancelled = false;

    async function poll() {
      try {
        const result = await getConversationMessages(conversationId);
        if (cancelled) return;
        setMessages(result.messages);

        // The customer's own new messages re-drafted this on the backend
        // (see conversationFlow.updateDraftLead). Only act if it actually
        // changed from the last one we saw.
        if (result.draftLead && !draftsEqual(result.draftLead, appliedAiDraftRef.current)) {
          if (draftsEqual(draftRef.current, appliedAiDraftRef.current)) {
            // No manual edits since the last AI draft - safe to apply directly.
            setDraft(result.draftLead);
            setAppliedAiDraft(result.draftLead);
            setPendingAiDraft(null);
          } else {
            // Staff has edited fields the AI hasn't seen - don't overwrite
            // them; let staff review and choose.
            setPendingAiDraft(result.draftLead);
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
  }, [conversationId, createdLead]);

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

  async function handleCreateLead() {
    setIsCreatingLead(true);
    setError(null);
    try {
      const lead = await createLeadFromDraft(conversationId, draft);
      setCreatedLead(lead);
      onLeadCreated(lead);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create the lead.");
    } finally {
      setIsCreatingLead(false);
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
        <span className="staff-draft-label">AI-drafted lead (edit before creating)</span>
        <div className="edit-row">
          <label>
            Category
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as SalesCategory })}
              disabled={!!createdLead}
            >
              {(Object.keys(SALES_CATEGORY_LABELS) as SalesCategory[]).map((c) => (
                <option key={c} value={c}>
                  {SALES_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Plan interested
            <input
              type="text"
              value={draft.plan_interested ?? ""}
              onChange={(e) => setDraft({ ...draft, plan_interested: e.target.value })}
              disabled={!!createdLead}
            />
          </label>
        </div>
        <label className="staff-draft-textarea">
          Summary
          <textarea
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            disabled={!!createdLead}
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
                  <dd>{SALES_CATEGORY_LABELS[pendingAiDraft.category]}</dd>
                </>
              )}
              {(pendingAiDraft.plan_interested ?? "") !== (draft.plan_interested ?? "") && (
                <>
                  <dt>Plan interested</dt>
                  <dd>{pendingAiDraft.plan_interested || "(cleared)"}</dd>
                </>
              )}
              {pendingAiDraft.summary !== draft.summary && (
                <>
                  <dt>Summary</dt>
                  <dd>{pendingAiDraft.summary}</dd>
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

        {createdLead ? (
          <p className="staff-ticket-created">Lead #{createdLead.id.slice(0, 8)} created.</p>
        ) : (
          <div className="staff-draft-buttons">
            <button onClick={handleCreateLead} disabled={isCreatingLead || !draft.summary.trim()}>
              {isCreatingLead ? "Creating…" : "Create lead"}
            </button>
          </div>
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

      {!createdLead && (
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
