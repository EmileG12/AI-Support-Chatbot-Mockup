# StaffDashboard

`frontend/src/StaffDashboard.tsx` — route `/staff`

## Purpose

Internal view for reviewing and correcting what the chat agent logged: list tickets, filter them, inspect one in full (including its chat transcript), override its classification, and resolve flagged duplicates. This is the human-in-the-loop check on the AI's output.

## Behavior

- On mount and whenever a filter changes, calls `fetchTickets` (see [docs/frontend-utils/fetchTickets.md](../frontend-utils/fetchTickets.md)) with `status`/`category`/`priority` filters (`status` defaults to `open`).
- Renders results as a table (columns: ID — `#{id.slice(0,8)}` — category, priority, status, created, a ⚠ duplicate indicator); clicking a row sets `selectedId`, which triggers `fetchTicketDetail` (see [docs/frontend-utils/fetchTicketDetail.md](../frontend-utils/fetchTicketDetail.md)) to load that ticket's full record, transcript, and — if `possible_duplicate_of` is set — the linked ticket's summary.
- The detail panel has `<select>` controls for category/priority/status; changing one calls `updateTicket` (see [docs/frontend-utils/updateTicket.md](../frontend-utils/updateTicket.md)) immediately (no separate "save" step) and updates both `detail` and the row in `tickets` in place.
- If the selected ticket has a duplicate match **and hasn't been dismissed** (`possible_duplicate_of` set, `duplicate_dismissed` false — same condition gates the table's ⚠ icon), a banner shows the matched ticket's summary and similarity score, with three actions:
  - **"View duplicate"** (toggles to **"Hide duplicate"**) — fetches the linked ticket's *full* detail (`fetchTicketDetail(duplicateOf.id)`, into local `duplicateDetail: TicketDetail | null` state — *not* `selectedId`/`detail`) and renders it as a second, complete detail block (category/priority/status badges, summary, diagnostics, contact details, full conversation transcript — via the shared `TicketDetailBody` helper, read-only, no edit `<select>`s) positioned to the right of the current ticket's own detail panel inside a `.detail-area` flex row — an additional panel, not merged into the existing one. Nothing about the main selection or transcript changes — clicking it never navigates away from the ticket you were looking at. `duplicateDetail` is cleared whenever `selectedId` changes.
  - **"Close as duplicate"** — `updateTicket(id, { status: "closed" })`.
  - **"Not a duplicate"** — `updateTicket(id, { duplicate_dismissed: true })`. This doesn't clear `possible_duplicate_of`/`duplicate_similarity` (kept as audit history — see [docs/db-schema/tickets.md](../db-schema/tickets.md)), it just stops the warning from being shown; the banner disappears immediately since `detail.ticket` updates in place.
- Uses `CATEGORY_LABELS`/`PRIORITY_LABELS`, exported from [TicketCard](TicketCard.md), for both the current ticket's editable badges and the duplicate panel's read-only ones, so labels stay visually consistent with the customer-facing chat view.
- Header has a "Working hours" checkbox (`getSettings` on mount, `updateSettings` on toggle — see
  [settings](../backend-services/settings.md)); optimistically flips local state and rolls back with
  an error banner if the request fails.
- Renders [QueuePanel](QueuePanel.md) above the ticket list/detail area. Its `onJoined` callback
  stores `{ id, draftTicket, messages }` in `liveConversation` state, which renders
  [StaffChatWindow](StaffChatWindow.md) as a further panel alongside `.detail-area` (same
  flex-panel layout the duplicate-detail panel uses) — independent of whichever ticket happens to
  be selected in the main list, since a live handoff and "inspecting a ticket" are unrelated.
  `onTicketCreated` clears `liveConversation` and re-runs `loadTickets` so the newly created ticket
  shows up in the list immediately.

## Related

- [docs/components/TicketCard.md](TicketCard.md), [docs/components/QueuePanel.md](QueuePanel.md), [docs/components/StaffChatWindow.md](StaffChatWindow.md)
- [docs/api-routes/README.md](../api-routes/README.md) (`GET /api/tickets`, `GET /api/tickets/:id`, `PATCH /api/tickets/:id`, `GET`/`PATCH /api/settings`)
- [docs/rpc-functions/find_possible_duplicate_ticket.md](../rpc-functions/find_possible_duplicate_ticket.md)
