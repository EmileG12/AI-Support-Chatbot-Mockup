# App.test.tsx

`frontend/src/App.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [App](../components/App.md). Mocks the `frontend/src/api.ts` boundary (`sendChatMessage`,
`confirmContact`, `submitContact`) — no real network calls.

## Covers

- Typing a message and sending it renders the assistant's reply from the (mocked) response.
- When the response includes a `ticket`, a [TicketCard](../components/TicketCard.md) is rendered with it.
- When `sendChatMessage` rejects, the error banner is shown.
- While a request is in flight, the send button is disabled and the "Typing…" placeholder is shown; both clear once the request resolves.
- When the response includes `pendingContact`, [ContactConfirmCard](../components/ContactConfirmCard.md) is shown instead of the chat input.
- Clicking "Yes, that's correct" calls `confirmContact` and appends an acknowledgment bubble plus the real reply, then re-enables the chat input.
- Clicking "Edit details" shows [ContactForm](../components/ContactForm.md); submitting a correction calls `submitContact` with the edited values and follows the same append/re-enable behavior.

Rendered inside a `MemoryRouter` since `App` renders a `react-router-dom` `Link` to `/staff`.
