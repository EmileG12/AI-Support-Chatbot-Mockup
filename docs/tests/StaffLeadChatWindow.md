# StaffLeadChatWindow.test.tsx

`frontend/src/StaffLeadChatWindow.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [StaffLeadChatWindow](../components/StaffLeadChatWindow.md). Mocks the `frontend/src/api.ts`
boundary (`getConversationMessages`, `sendStaffMessage`, `createLeadFromDraft`) — no real network
calls. Mirrors [StaffChatWindow.test.tsx](StaffChatWindow.md)'s structure with a `DraftLead` fixture
instead of a `DraftTicket` one.

## Covers

- Renders the AI-drafted summary (as editable fields) and the initial transcript.
- Sending a reply calls `sendStaffMessage` and appends the returned message to the transcript.
- Editing the draft (e.g. the plan-interested field) and clicking "Create lead" calls
  `createLeadFromDraft` with the edited values, shows the "Lead #... created." confirmation, and
  calls `onLeadCreated`.
- A re-drafted `draftLead` that arrives after a manual edit is held in an "AI suggests an update"
  card instead of overwriting the edit; "Use AI update" applies it. Same `fireEvent`/real-timers
  approach as StaffChatWindow's equivalent case, for the same reason (see its doc).
- "Close" calls `onClose`.

No resolution-flow tests here (unlike StaffChatWindow's "Issue resolved" cases) - leads have no
resolved-style status, so `StaffLeadChatWindow` has no equivalent UI to test.
