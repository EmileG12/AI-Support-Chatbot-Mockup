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
- A re-drafted `draftTicket` from a poll is applied automatically when the fields haven't been
  manually edited since the last AI draft.
- A re-drafted `draftTicket` that arrives *after* a manual edit is held in an "AI suggests an
  update" card instead of overwriting the edit; "Use AI update" applies it, "Keep my edits"
  dismisses it while leaving the manual edit in place. These two use `fireEvent` (not `userEvent`)
  for the edit/poll-driven-update sequence and a `{ timeout: 3000 }` on the `findBy*` that waits for
  the next poll tick, since `userEvent` plus Vitest fake timers proved unreliable together (hung
  indefinitely) — real timers with a slightly longer wait were simpler and more robust than fighting
  that interaction.
- "Close" calls `onClose`.
