# Frontend utils

All in `frontend/src/api.ts`. Base URL is `import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001"`.

| Function | Purpose |
|---|---|
| [sendChatMessage](sendChatMessage.md) | Post a chat message, get the agent's reply (and any created ticket) |
| [fetchTickets](fetchTickets.md) | List tickets with optional status/category/priority filters |
| [fetchTicketDetail](fetchTicketDetail.md) | Load one ticket's full record, transcript, and duplicate link |
| [updateTicket](updateTicket.md) | Override a ticket's category/priority/status |
