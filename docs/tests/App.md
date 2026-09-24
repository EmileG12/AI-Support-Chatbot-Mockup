# App.test.tsx

`frontend/src/App.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [App](../components/App.md). Mocks the `frontend/src/api.ts` boundary (`sendChatMessage`,
`confirmContact`, `submitContact`, `getConversationMessages`, `getSettings`, `updateSettings`,
`getQueue`, `staffJoin`, `sendStaffMessage`, `createTicketFromDraft`) — no real network calls.
[QueuePanel](../components/QueuePanel.md) and [StaffChatWindow](../components/StaffChatWindow.md)
are rendered for real (not mocked out) as part of `App`'s staff-side panel, so their own API calls
need mocking here too.

## Covers

- Typing a message and sending it renders the assistant's reply from the (mocked) response.
- When the response includes a `ticket`, a [TicketCard](../components/TicketCard.md) is rendered with it.
- When `sendChatMessage` rejects, the error banner is shown.
- While a request is in flight, the send button is disabled and the "Typing…" placeholder is shown; both clear once the request resolves.
- When the response includes `pendingContact`, [ContactConfirmCard](../components/ContactConfirmCard.md) is shown instead of the chat input.
- Clicking "Yes, that's correct" calls `confirmContact` and appends an acknowledgment bubble plus the real reply, then re-enables the chat input.
- Clicking "Edit details" shows [ContactForm](../components/ContactForm.md); submitting a correction calls `submitContact` with the edited values and follows the same append/re-enable behavior.
- When a response's `handoffStatus` is `"queued"`, the queued banner shows the estimated wait
  (asserted against the banner element's own `textContent`, since the reply text can legitimately
  contain the same "estimated wait" phrase), and the chat input stays available.
- When `handoffStatus` is `"live"`, the live banner shows and the (mocked) immediate poll from
  `getConversationMessages` renders a `role: "staff"` reply labeled "Support agent".
- Toggling the "Working hours" checkbox calls `updateSettings({ workingHours: true })`.
- Clicking "Join" on a [QueuePanel](../components/QueuePanel.md) entry (rendered in the staff-side
  panel next to the customer's own chat) calls `staffJoin` and opens
  [StaffChatWindow](../components/StaffChatWindow.md) with the returned draft summary, with the
  customer's own chat input still on screen alongside it.

Rendered inside a `MemoryRouter` since `App` renders a `react-router-dom` `Link` to `/staff`.
