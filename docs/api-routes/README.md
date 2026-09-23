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
| `GET /api/health` | `{ ok: true }` liveness check (not separately documented) |
