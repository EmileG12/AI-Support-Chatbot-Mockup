# StaffDashboard.test.tsx

`frontend/src/StaffDashboard.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [StaffDashboard](../components/StaffDashboard.md). Mocks the `frontend/src/api.ts` boundary
(`fetchTickets`, `fetchTicketDetail`, `updateTicket`) — no real network calls.

## Covers

- Tickets load on mount via `fetchTickets`, with the default filters (`status: "open"`,
  `category`/`priority` undefined); the table renders each ticket's short ID (`#{id.slice(0,8)}`).
- Changing a filter `<select>` re-fetches with the new filter combination.
- Clicking a ticket row calls `fetchTicketDetail` and renders its conversation transcript.
- Changing the category/priority/status `<select>` in the detail panel calls `updateTicket` with
  just the changed field, and the panel reflects the update once it resolves.
- When the selected ticket has a `duplicateOf`, the duplicate banner renders with the linked
  ticket's summary and similarity percentage, and its "Close as duplicate" button calls
  `updateTicket(id, { status: "closed" })`.
- "View duplicate" calls `fetchTicketDetail` with the *linked* ticket's id and renders it as a
  second compact ticket card alongside the current one, without changing the main selection or
  transcript (asserted by checking the original ticket's transcript message is still on screen);
  clicking the now-"Hide duplicate" button again removes the comparison card.
- "Not a duplicate" calls `updateTicket(id, { duplicate_dismissed: true })`, and the banner
  disappears once the (mocked) update resolves.

Rendered inside a `MemoryRouter` (the component renders a `Link` back to `/`). The three filter
`<select>`s have `aria-label`s (`"Filter by status"` etc.) added specifically so both tests and
screen readers can identify them — the detail panel's category/priority/status selects already had
accessible names via their wrapping `<label>`s.
