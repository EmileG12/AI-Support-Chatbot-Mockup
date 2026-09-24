# TicketCard.test.tsx

`frontend/src/TicketCard.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [TicketCard](../components/TicketCard.md).

## Covers

- Renders the correct category and priority display labels for a given ticket.
- Shows the "Diagnostics:" paragraph only when `troubleshooting_notes` is set, and renders its
  text when it is.
- Shows the "Resolution:" paragraph only when `resolution_notes` is set, and renders its text when it is.
- Shows the "already reported" duplicate note only when `possible_duplicate_of` is set.

No mocking needed — `TicketCard` is pure presentation over its `ticket` prop.
