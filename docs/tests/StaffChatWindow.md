# StaffChatWindow.test.tsx

`frontend/src/StaffChatWindow.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [StaffChatWindow](../components/StaffChatWindow.md). Mocks the `frontend/src/api.ts` boundary
(`getConversationMessages`, `sendStaffMessage`, `createTicketFromDraft`) — no real network calls.

## Covers

- Renders the AI-drafted summary (as editable fields) and the initial transcript.
- Sending a reply calls `sendStaffMessage` and appends the returned message to the transcript.
- Editing the draft (e.g. changing priority) and clicking "Create ticket" calls
  `createTicketFromDraft` with the edited values, shows the "Ticket #... created." confirmation, and
  calls `onTicketCreated`.
- "Close" calls `onClose`.
