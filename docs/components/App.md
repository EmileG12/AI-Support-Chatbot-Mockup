# App

`frontend/src/App.tsx` — route `/`

## Purpose

The customer-facing chat page. Renders a message list, an input box, and (once one exists) a ticket confirmation card.

## Behavior

- Keeps `messages: ChatMessage[]` in local state, seeded with a fixed welcome message.
- Keeps `conversationId: string | null`; `null` until the first backend response, then reused for every subsequent turn in the session (no persistence across a page reload).
- On submit, calls `sendChatMessage` (see [docs/frontend-utils/sendChatMessage.md](../frontend-utils/sendChatMessage.md)), appends the assistant's reply to `messages`, and if the response includes a `ticket`, stores it in `ticket` state and renders it via [TicketCard](TicketCard.md).
- Shows a "Typing…" placeholder while a request is in flight, and an inline error banner if the request fails.
- Header includes a `Link` to `/staff` (the [StaffDashboard](StaffDashboard.md)).

## Related

- [docs/components/TicketCard.md](TicketCard.md)
- [docs/frontend-utils/sendChatMessage.md](../frontend-utils/sendChatMessage.md)
- [docs/api-routes/post-api-chat.md](../api-routes/post-api-chat.md)
