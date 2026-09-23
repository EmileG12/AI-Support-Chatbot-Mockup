# App.test.tsx

`frontend/src/App.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [App](../components/App.md). Mocks the `frontend/src/api.ts` boundary
(`sendChatMessage`) — no real network calls.

## Covers

- Typing a message and sending it renders the assistant's reply from the (mocked) response.
- When the response includes a `ticket`, a [TicketCard](../components/TicketCard.md) is rendered
  with it.
- When `sendChatMessage` rejects, the error banner is shown.
- While a request is in flight, the send button is disabled and the "Typing…" placeholder is
  shown; both clear once the request resolves.

Rendered inside a `MemoryRouter` since `App` renders a `react-router-dom` `Link` to `/staff`.
