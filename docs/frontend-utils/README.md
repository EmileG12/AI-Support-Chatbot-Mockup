# Frontend utils

All in `frontend/src/api.ts`. Base URL is `import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001"`.
Every call goes through a shared (module-private) `apiFetch` wrapper that adds
`credentials: "include"`, so the session cookie set by [login](login.md) is sent on every request —
required since the frontend and backend are on different origins in production.

| Function | Purpose |
|---|---|
| [login](login.md) | Log in with the shared username/password, sets the session cookie |
| [logout](logout.md) | Clear the session cookie |
| [checkAuth](checkAuth.md) | Check whether the current session cookie is valid |
| [createConversation](createConversation.md) | Start a conversation with a chosen mode ("support" or "sales"), before any message is sent |
| [sendChatMessage](sendChatMessage.md) | Post a chat message, get the agent's reply (and any created ticket/lead, or pending contact details) |
| [confirmContact](confirmContact.md) | Confirm the auto-detected contact details |
| [submitContact](submitContact.md) | Submit corrected contact details |
| [fetchTickets](fetchTickets.md) | List tickets with optional status/category/priority filters |
| [fetchTicketDetail](fetchTicketDetail.md) | Load one ticket's full record, transcript, and duplicate link |
| [updateTicket](updateTicket.md) | Override a ticket's category/priority/status |
| [getSettings](getSettings.md) | Read the `working_hours` toggle |
| [updateSettings](updateSettings.md) | Set the `working_hours` toggle |
| [getQueue](getQueue.md) | List conversations waiting for a staff member |
| [getConversationMessages](getConversationMessages.md) | Poll a conversation's handoff status and transcript |
| [staffJoin](staffJoin.md) | Staff joins a queued conversation |
| [sendStaffMessage](sendStaffMessage.md) | Staff sends a message while live with a customer |
| [createTicketFromDraft](createTicketFromDraft.md) | Staff turns the AI-drafted summary into a real ticket |
| [createLeadFromDraft](createLeadFromDraft.md) | Staff turns the AI-drafted lead summary into a real lead |
| [draftResolution](draftResolution.md) | AI-draft a resolution summary from the full conversation |
| [resolveTicketFromDraft](resolveTicketFromDraft.md) | Staff turns the draft + reviewed resolution notes into a resolved ticket |
