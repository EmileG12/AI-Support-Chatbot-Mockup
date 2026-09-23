# StaffDashboard

`frontend/src/StaffDashboard.tsx` — route `/staff`

## Purpose

Internal view for reviewing and correcting what the chat agent logged: list tickets, filter them, inspect one in full (including its chat transcript), override its classification, and resolve flagged duplicates. This is the human-in-the-loop check on the AI's output.

## Behavior

- On mount and whenever a filter changes, calls `fetchTickets` (see [docs/frontend-utils/fetchTickets.md](../frontend-utils/fetchTickets.md)) with `status`/`category`/`priority` filters (`status` defaults to `open`).
- Renders results as a table (columns: ID — `#{id.slice(0,8)}` — category, priority, status, created, a ⚠ duplicate indicator); clicking a row sets `selectedId`, which triggers `fetchTicketDetail` (see [docs/frontend-utils/fetchTicketDetail.md](../frontend-utils/fetchTicketDetail.md)) to load that ticket's full record, transcript, and — if `possible_duplicate_of` is set — the linked ticket's summary.
- The detail panel has `<select>` controls for category/priority/status; changing one calls `updateTicket` (see [docs/frontend-utils/updateTicket.md](../frontend-utils/updateTicket.md)) immediately (no separate "save" step) and updates both `detail` and the row in `tickets` in place.
- If the selected ticket has a duplicate match **and hasn't been dismissed** (`possible_duplicate_of` set, `duplicate_dismissed` false — same condition gates the table's ⚠ icon), a banner shows the matched ticket's summary and similarity score, with three actions:
  - **"View duplicate"** (toggles to **"Hide duplicate"**) — fetches the linked ticket (`fetchTicketDetail(duplicateOf.id)`, into local `duplicateTicket` state — *not* `selectedId`/`detail`) and renders it as a compact [TicketCard](TicketCard.md) side by side with the current ticket's own `TicketCard`, under a "This ticket" / "Possible duplicate" heading pair. Nothing about the main selection or transcript changes — clicking it never navigates away from the ticket you were looking at. `duplicateTicket` is cleared whenever `selectedId` changes.
  - **"Close as duplicate"** — `updateTicket(id, { status: "closed" })`.
  - **"Not a duplicate"** — `updateTicket(id, { duplicate_dismissed: true })`. This doesn't clear `possible_duplicate_of`/`duplicate_similarity` (kept as audit history — see [docs/db-schema/tickets.md](../db-schema/tickets.md)), it just stops the warning from being shown; the banner disappears immediately since `detail.ticket` updates in place.
- Uses `CATEGORY_LABELS`/`PRIORITY_LABELS`/the `TicketCard` component itself, all exported from [TicketCard](TicketCard.md), so labels and the duplicate-comparison cards stay visually consistent with the customer-facing chat view.

## Related

- [docs/components/TicketCard.md](TicketCard.md)
- [docs/api-routes/README.md](../api-routes/README.md) (`GET /api/tickets`, `GET /api/tickets/:id`, `PATCH /api/tickets/:id`)
- [docs/rpc-functions/find_possible_duplicate_ticket.md](../rpc-functions/find_possible_duplicate_ticket.md)
