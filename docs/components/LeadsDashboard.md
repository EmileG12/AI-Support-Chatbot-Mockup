# LeadsDashboard

`frontend/src/LeadsDashboard.tsx` — route `/staff/sales`

## Purpose

Internal view for reviewing sales leads the chat agent logged: list leads, filter them, inspect one
in full (including its chat transcript), and override its category/status. The sales counterpart to
[StaffDashboard](StaffDashboard.md) — same shell/table/detail-panel layout (shares
`StaffDashboard.css`), but for `leads` instead of `tickets`, and with no duplicate-detection UI since
leads have no duplicate-detection at all (see [leads](../db-schema/leads.md)).

## Behavior

- On mount and whenever a filter changes, calls `fetchLeads` with `status`/`category` filters
  (`status` defaults to `new`).
- Renders results as a table (columns: ID — `#{id.slice(0,8)}` — category, plan interested, status,
  created); clicking a row sets `selectedId`, which triggers `fetchLeadDetail` to load that lead's
  full record and transcript.
- The detail panel has `<select>` controls for category/status; changing one calls `updateLead`
  immediately (no separate "save" step) and updates both `detail` and the row in `leads` in place.
- Detail body shows the lead's summary, contact details (name/email/phone/address/postcode and
  whether they already have an account — see [salesAgent](../backend-services/salesAgent.md)), and
  the full conversation transcript.
- Header: title "Customer Sales Staff Leads", nav links to `/staff` ("Customer Support Staff
  Tickets →") and `/` ("← Back to chat"), [HelpModal](HelpModal.md), and [LogoutButton](LogoutButton.md).

Note: the working-hours toggle and the staff-side live-chat panel (queue + join + drafted-lead chat)
live on [App](App.md) (`/`), not here — same split as StaffDashboard/tickets.

## Related

- [docs/components/LeadCard.md](LeadCard.md)
- [docs/components/StaffDashboard.md](StaffDashboard.md)
- [docs/api-routes/README.md](../api-routes/README.md) (`GET /api/leads`, `GET /api/leads/:id`, `PATCH /api/leads/:id`)
- [docs/db-schema/leads.md](../db-schema/leads.md)
