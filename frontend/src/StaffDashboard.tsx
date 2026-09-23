import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchTickets, fetchTicketDetail, updateTicket } from "./api";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "./TicketCard";
import type { Ticket, TicketCategory, TicketPriority, TicketStatus, TicketDetail } from "./types";
import "./StaffDashboard.css";

const STATUS_OPTIONS: (TicketStatus | "all")[] = ["all", "open", "in_progress", "resolved", "closed"];
const CATEGORY_OPTIONS: (TicketCategory | "all")[] = ["all", ...(Object.keys(CATEGORY_LABELS) as TicketCategory[])];
const PRIORITY_OPTIONS: (TicketPriority | "all")[] = ["all", ...(Object.keys(PRIORITY_LABELS) as TicketPriority[])];

function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`status-badge status-${status}`}>{status.replace("_", " ")}</span>;
}

export default function StaffDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("open");
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchTickets({
        status: statusFilter === "all" ? undefined : statusFilter,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        priority: priorityFilter === "all" ? undefined : priorityFilter,
      });
      setTickets(result);
    } catch (err) {
      console.error(err);
      setError("Failed to load tickets.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetchTicketDetail(selectedId)
      .then(setDetail)
      .catch((err) => {
        console.error(err);
        setError("Failed to load ticket detail.");
      });
  }, [selectedId]);

  async function handleUpdate(
    updates: Partial<Pick<Ticket, "category" | "priority" | "status" | "duplicate_dismissed">>
  ) {
    if (!selectedId) return;
    try {
      const updated = await updateTicket(selectedId, updates);
      setDetail((prev) => (prev ? { ...prev, ticket: updated } : prev));
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      console.error(err);
      setError("Failed to update ticket.");
    }
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <h1>Staff Dashboard</h1>
        <Link className="nav-link" to="/">
          ← Back to chat
        </Link>
      </header>

      <div className="dashboard-body">
        <div className="ticket-list-panel">
          <div className="filter-bar">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "all")}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : s.replace("_", " ")}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | "all")}
            >
              <option value="all">All categories</option>
              {CATEGORY_OPTIONS.filter((c) => c !== "all").map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c as TicketCategory]}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | "all")}
            >
              <option value="all">All priorities</option>
              {PRIORITY_OPTIONS.filter((p) => p !== "all").map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p as TicketPriority]}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="error-banner">{error}</div>}
          {isLoading && <div className="loading-note">Loading…</div>}

          <table className="ticket-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  className={t.id === selectedId ? "selected" : ""}
                  onClick={() => setSelectedId(t.id)}
                >
                  <td className="ticket-id-cell">#{t.id.slice(0, 8)}</td>
                  <td>{CATEGORY_LABELS[t.category]}</td>
                  <td>
                    <span className={`priority-badge priority-${t.priority}`}>
                      {PRIORITY_LABELS[t.priority]}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>{new Date(t.created_at).toLocaleString()}</td>
                  <td>
                    {t.possible_duplicate_of && !t.duplicate_dismissed && (
                      <span title="Possible duplicate">⚠</span>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && tickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    No tickets match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ticket-detail-panel">
          {!detail && <p className="empty-detail">Select a ticket to view details.</p>}
          {detail && (
            <>
              <h2>Ticket #{detail.ticket.id.slice(0, 8)}</h2>

              {detail.duplicateOf && !detail.ticket.duplicate_dismissed && (
                <div className="duplicate-banner">
                  <p>
                    Possibly a duplicate of ticket #{detail.duplicateOf.id.slice(0, 8)} — "
                    {detail.duplicateOf.summary}"
                    {typeof detail.ticket.duplicate_similarity === "number" &&
                      ` (${Math.round(detail.ticket.duplicate_similarity * 100)}% similar)`}
                  </p>
                  <div className="duplicate-banner-actions">
                    <button onClick={() => setSelectedId(detail.duplicateOf!.id)}>View duplicate</button>
                    <button onClick={() => handleUpdate({ status: "closed" })}>Close as duplicate</button>
                    <button
                      className="secondary"
                      onClick={() => handleUpdate({ duplicate_dismissed: true })}
                    >
                      Not a duplicate
                    </button>
                  </div>
                </div>
              )}

              <div className="edit-row">
                <label>
                  Category
                  <select
                    value={detail.ticket.category}
                    onChange={(e) => handleUpdate({ category: e.target.value as TicketCategory })}
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
                    value={detail.ticket.priority}
                    onChange={(e) => handleUpdate({ priority: e.target.value as TicketPriority })}
                  >
                    {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={detail.ticket.status}
                    onChange={(e) => handleUpdate({ status: e.target.value as TicketStatus })}
                  >
                    {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="detail-summary">{detail.ticket.summary}</p>

              {detail.ticket.troubleshooting_notes && (
                <p className="detail-troubleshooting">
                  <strong>Diagnostics:</strong> {detail.ticket.troubleshooting_notes}
                </p>
              )}

              {(detail.ticket.customer_name || detail.ticket.customer_email || detail.ticket.customer_phone) && (
                <p className="detail-contact">
                  {detail.ticket.customer_name} — {detail.ticket.customer_email} — {detail.ticket.customer_phone}
                </p>
              )}

              <h3>Conversation</h3>
              <div className="transcript">
                {detail.messages.map((m) => (
                  <div key={m.id} className={`transcript-message transcript-${m.role}`}>
                    {m.content}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
