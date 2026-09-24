# TicketCard

`frontend/src/TicketCard.tsx`

## Purpose

Renders a single ticket's category, priority, summary, and (when present) troubleshooting diagnostics, resolution notes, and a duplicate-flag note. Used inline in the chat confirmation ([App](App.md)) and, via its exported label maps, in the [StaffDashboard](StaffDashboard.md).

## Exports

- `CATEGORY_LABELS: Record<TicketCategory, string>` — display labels for the 9 categories (`broadband_fault`, `mobile_fault`, `landline_fault`, `voip_fault`, `billing`, `provisioning`, `account`, `complaint`, `other`).
- `PRIORITY_LABELS: Record<TicketPriority, string>` — display labels for `low`/`medium`/`high`/`urgent`.
- `TicketCard({ ticket: Ticket })` — the component itself.

## Behavior

- Priority badge and left border color vary by `ticket.priority` (green→amber→orange→red for low→urgent).
- Shows a "Diagnostics" line when `ticket.troubleshooting_notes` is set.
- Shows a "Resolution" line when `ticket.resolution_notes` is set — only true for tickets closed out via the "Issue resolved" flow (see [StaffChatWindow](StaffChatWindow.md)).
- Shows a non-identifying "this looks related to something already reported" note when `ticket.possible_duplicate_of` is set and `ticket.duplicate_dismissed` is not true — the matched ticket's id/summary are staff-only (shown in [StaffDashboard](StaffDashboard.md) instead) and not exposed here. In practice a ticket is always undismissed at the moment `TicketCard` renders it here (dismissal only happens later, from the dashboard), but the condition matches the field for correctness.

## Related

- [docs/db-schema/tickets.md](../db-schema/tickets.md)
