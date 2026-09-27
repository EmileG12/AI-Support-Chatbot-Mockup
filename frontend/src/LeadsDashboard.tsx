import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchLeads, fetchLeadDetail, updateLead } from "./api";
import { LogoutButton } from "./LogoutButton";
import { SALES_CATEGORY_LABELS } from "./LeadCard";
import type { Lead, LeadStatus, SalesCategory, LeadDetail, ChatMessage } from "./types";
import "./StaffDashboard.css";

const STATUS_OPTIONS: (LeadStatus | "all")[] = ["all", "new", "contacted", "closed"];
const CATEGORY_OPTIONS: (SalesCategory | "all")[] = ["all", ...(Object.keys(SALES_CATEGORY_LABELS) as SalesCategory[])];

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

function LeadDetailBody({ lead, messages }: { lead: Lead; messages: ChatMessage[] }) {
  return (
    <>
      <p className="detail-summary">{lead.summary}</p>

      {(lead.customer_name || lead.customer_email || lead.customer_phone) && (
        <p className="detail-contact">
          {lead.customer_name} — {lead.customer_email} — {lead.customer_phone}
          <br />
          {lead.customer_address} — {lead.customer_postcode} —{" "}
          {lead.customer_is_account_holder ? "Account holder" : "Not account holder"}
        </p>
      )}

      <h3>Conversation</h3>
      <div className="transcript">
        {messages.map((m) => (
          <div key={m.id} className={`transcript-message transcript-${m.role}`}>
            {m.content}
          </div>
        ))}
      </div>
    </>
  );
}

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("new");
  const [categoryFilter, setCategoryFilter] = useState<SalesCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchLeads({
        status: statusFilter === "all" ? undefined : statusFilter,
        category: categoryFilter === "all" ? undefined : categoryFilter,
      });
      setLeads(result);
    } catch (err) {
      console.error(err);
      setError("Failed to load leads.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetchLeadDetail(selectedId)
      .then(setDetail)
      .catch((err) => {
        console.error(err);
        setError("Failed to load lead detail.");
      });
  }, [selectedId]);

  async function handleUpdate(updates: Partial<Pick<Lead, "category" | "status">>) {
    if (!selectedId) return;
    try {
      const updated = await updateLead(selectedId, updates);
      setDetail((prev) => (prev ? { ...prev, lead: updated } : prev));
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err) {
      console.error(err);
      setError("Failed to update lead.");
    }
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <h1>Customer Sales Staff View</h1>
        <div className="nav-links">
          <Link className="nav-link" to="/staff">
            Customer Support Staff View →
          </Link>
          <Link className="nav-link" to="/">
            ← Back to chat
          </Link>
          <LogoutButton />
        </div>
      </header>

      <div className="dashboard-body">
        <div className="ticket-list-panel">
          <div className="filter-bar">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : s}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as SalesCategory | "all")}
            >
              <option value="all">All categories</option>
              {CATEGORY_OPTIONS.filter((c) => c !== "all").map((c) => (
                <option key={c} value={c}>
                  {SALES_CATEGORY_LABELS[c as SalesCategory]}
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
                <th>Plan</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  className={l.id === selectedId ? "selected" : ""}
                  onClick={() => setSelectedId(l.id)}
                >
                  <td className="ticket-id-cell">#{l.id.slice(0, 8)}</td>
                  <td>{SALES_CATEGORY_LABELS[l.category]}</td>
                  <td>{l.plan_interested ?? "—"}</td>
                  <td>
                    <LeadStatusBadge status={l.status} />
                  </td>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!isLoading && leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No leads match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="detail-area">
          <div className="ticket-detail-panel">
            {!detail && <p className="empty-detail">Select a lead to view details.</p>}
            {detail && (
              <>
                <h2>Lead #{detail.lead.id.slice(0, 8)}</h2>

                <div className="edit-row">
                  <label>
                    Category
                    <select
                      value={detail.lead.category}
                      onChange={(e) => handleUpdate({ category: e.target.value as SalesCategory })}
                    >
                      {(Object.keys(SALES_CATEGORY_LABELS) as SalesCategory[]).map((c) => (
                        <option key={c} value={c}>
                          {SALES_CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <select
                      value={detail.lead.status}
                      onChange={(e) => handleUpdate({ status: e.target.value as LeadStatus })}
                    >
                      {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <LeadDetailBody lead={detail.lead} messages={detail.messages} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
