# StaffDashboard

`frontend/src/StaffDashboard.tsx` — route `/staff`

## Purpose

Internal view for reviewing and correcting what the chat agent logged: list tickets, filter them, inspect one in full (including its chat transcript), override its classification, and resolve flagged duplicates. This is the human-in-the-loop check on the AI's output.

## Behavior

- On mount and whenever a filter changes, calls `fetchTickets` (see [docs/frontend-utils/fetchTickets.md](../frontend-utils/fetchTickets.md)) with `status`/`category`/`priority` filters (`status` defaults to `open`).
- Renders results as a table (columns: ID — `#{id.slice(0,8)}` — category, priority, status, created, a ⚠ duplicate indicator); clicking a row sets `selectedId`, which triggers `fetchTicketDetail` (see [docs/frontend-utils/fetchTicketDetail.md](../frontend-utils/fetchTicketDetail.md)) to load that ticket's full record, transcript, and — if `possible_duplicate_of` is set — the linked ticket's summary.
- The detail panel has `<select>` controls for category/priority/status; changing one calls `updateTicket` (see [docs/frontend-utils/updateTicket.md](../frontend-utils/updateTicket.md)) immediately (no separate "save" step) and updates both `detail` and the row in `tickets` in place.
- If the selected ticket has a duplicate match **and hasn't been dismissed** (`possible_duplicate_of` set, `duplicate_dismissed` false — same condition gates the table's ⚠ icon), a banner shows the matched ticket's summary and similarity score, with three actions:
  - **"View duplicate"** — `setSelectedId(duplicateOf.id)`, loading the linked ticket into the same detail panel (works even if it's outside the current filter).
  - **"Close as duplicate"** — `updateTicket(id, { status: "closed" })`.
  - **"Not a duplicate"** — `updateTicket(id, { duplicate_dismissed: true })`. This doesn't clear `possible_duplicate_of`/`duplicate_similarity` (kept as audit history — see [docs/db-schema/tickets.md](../db-schema/tickets.md)), it just stops the warning from being shown; the banner disappears immediately since `detail.ticket` updates in place.
- Uses `CATEGORY_LABELS`/`PRIORITY_LABELS` exported from [TicketCard](TicketCard.md) so labels stay consistent between the customer and staff views.

## Related

- [docs/components/TicketCard.md](TicketCard.md)
- [docs/api-routes/README.md](../api-routes/README.md) (`GET /api/tickets`, `GET /api/tickets/:id`, `PATCH /api/tickets/:id`)
- [docs/rpc-functions/find_possible_duplicate_ticket.md](../rpc-functions/find_possible_duplicate_ticket.md)
