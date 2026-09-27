import type { Lead } from "./types";

export const SALES_CATEGORY_LABELS: Record<Lead["category"], string> = {
  broadband: "Broadband",
  mobile: "Mobile",
};

export function LeadCard({ lead }: { lead: Lead }) {
  return (
    <div className="lead-card">
      <div className="lead-card-header">
        <span className="lead-id">Lead #{lead.id.slice(0, 8)}</span>
        <span className="lead-category-badge">{SALES_CATEGORY_LABELS[lead.category]}</span>
      </div>
      {lead.plan_interested && <div className="lead-plan">{lead.plan_interested}</div>}
      <p className="lead-summary">{lead.summary}</p>
    </div>
  );
}
