import type { Ticket } from "./types";

export const CATEGORY_LABELS: Record<Ticket["category"], string> = {
  broadband_fault: "Broadband fault",
  mobile_fault: "Mobile fault",
  landline_fault: "Landline fault",
  billing: "Billing",
  provisioning: "Provisioning",
  account: "Account",
  complaint: "Complaint",
  other: "Other",
};

export const PRIORITY_LABELS: Record<Ticket["priority"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div className={`ticket-card priority-${ticket.priority}`}>
      <div className="ticket-card-header">
        <span className="ticket-id">Ticket #{ticket.id.slice(0, 8)}</span>
        <span className={`priority-badge priority-${ticket.priority}`}>
          {PRIORITY_LABELS[ticket.priority]}
        </span>
      </div>
      <div className="ticket-category">{CATEGORY_LABELS[ticket.category]}</div>
      <p className="ticket-summary">{ticket.summary}</p>
      {ticket.troubleshooting_notes && (
        <p className="ticket-troubleshooting">
          <strong>Diagnostics:</strong> {ticket.troubleshooting_notes}
        </p>
      )}
      {ticket.possible_duplicate_of && !ticket.duplicate_dismissed && (
        <p className="ticket-duplicate-note">
          This looks related to something already reported — flagged for our team to review.
        </p>
      )}
    </div>
  );
}
