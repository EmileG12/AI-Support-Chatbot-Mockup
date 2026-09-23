# StaffDashboard.test.tsx

`frontend/src/StaffDashboard.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [StaffDashboard](../components/StaffDashboard.md). Mocks the `frontend/src/api.ts` boundary
(`fetchTickets`, `fetchTicketDetail`, `updateTicket`) — no real network calls.

## Covers

- Tickets load on mount via `fetchTickets`, with the default filters (`status: "open"`,
  `category`/`priority` undefined).
- Changing a filter `<select>` re-fetches with the new filter combination.
- Clicking a ticket row calls `fetchTicketDetail` and renders its conversation transcript.
- Changing the category/priority/status `<select>` in the detail panel calls `updateTicket` with
  just the changed field, and the panel reflects the update once it resolves.
- When the selected ticket has a `duplicateOf`, the duplicate banner renders with the linked
  ticket's summary and similarity percentage, and its "Close as duplicate" button calls
  `updateTicket(id, { status: "closed" })`.

Rendered inside a `MemoryRouter` (the component renders a `Link` back to `/`). The three filter
`<select>`s have `aria-label`s (`"Filter by status"` etc.) added specifically so both tests and
screen readers can identify them — the detail panel's category/priority/status selects already had
accessible names via their wrapping `<label>`s.
