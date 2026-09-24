# API routes

All in `backend/src/app.ts`. No authentication (see [docs/architecture.md](../architecture.md#known-gaps)).

| Route | Purpose |
|---|---|
| [POST /api/chat](post-api-chat.md) | Send a chat message, get the agent's reply and any newly created ticket |
| [POST /api/conversations/:id/confirm-contact](post-confirm-contact.md) | Confirm the auto-detected contact details |
| [PATCH /api/conversations/:id/contact](patch-conversation-contact.md) | Submit corrected contact details |
| [GET /api/tickets](get-api-tickets.md) | List tickets, filterable by status/category/priority |
| [GET /api/tickets/:id](get-api-tickets-id.md) | One ticket's full record, transcript, and duplicate link |
| [PATCH /api/tickets/:id](patch-api-tickets-id.md) | Override a ticket's category/priority/status |
| [GET /api/settings](get-api-settings.md) | Read the `working_hours` toggle |
| [PATCH /api/settings](patch-api-settings.md) | Set the `working_hours` toggle |
| [GET /api/conversations/queue](get-conversations-queue.md) | List conversations waiting for a staff member |
| [GET /api/conversations/:id/messages](get-conversation-messages.md) | Poll a conversation's handoff status and transcript |
| [POST /api/conversations/:id/staff-join](post-staff-join.md) | Staff joins a queued conversation; returns an AI-drafted summary |
| [POST /api/conversations/:id/staff-message](post-staff-message.md) | Staff sends a message while live with a customer |
| [POST /api/conversations/:id/draft-resolution](post-draft-resolution.md) | AI-draft a resolution summary from the full conversation |
| [POST /api/conversations/:id/staff-create-ticket](post-staff-create-ticket.md) | Staff turns the drafted summary (optionally resolved, with resolution notes) into a real ticket |
| `GET /api/health` | `{ ok: true }` liveness check (not separately documented) |
