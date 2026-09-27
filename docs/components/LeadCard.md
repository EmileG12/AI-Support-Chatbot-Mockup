# LeadCard

`frontend/src/LeadCard.tsx`

## Purpose

Renders a single sales lead's category and (when present) the specific plan the customer settled
on, plus its summary. The Customer Sales counterpart to [TicketCard](TicketCard.md) - shown inline
in the chat once a sales conversation's [salesAgent](../backend-services/salesAgent.md) calls
`create_lead` (see [App](App.md)).

## Exports

- `SALES_CATEGORY_LABELS: Record<SalesCategory, string>` — display labels for `broadband`/`mobile`.
- `LeadCard({ lead: Lead })` — the component itself.

## Behavior

- Shows the category badge and (only if set) a plan line for `lead.plan_interested`.
- No priority styling or duplicate-detection note - unlike `TicketCard`, leads have no priority field and no duplicate-lead check.

## Related

- [docs/db-schema/leads.md](../db-schema/leads.md)
