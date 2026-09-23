# App

`frontend/src/App.tsx` — route `/`

## Purpose

The customer-facing chat page. Renders a message list, and either the chat input, a contact
confirmation card, or a contact correction form depending on where the conversation is in the
upfront contact-collection flow.

## Behavior

- Keeps `messages: ChatMessage[]` in local state, seeded with a fixed welcome message that asks
  for name/email/phone.
- Keeps `conversationId: string | null`; `null` until the first backend response, then reused for
  every subsequent turn in the session (no persistence across a page reload).
- On submit, calls `sendChatMessage` (see [docs/frontend-utils/sendChatMessage.md](../frontend-utils/sendChatMessage.md)), appends the assistant's reply, and:
  - if the response includes a `ticket`, stores it and renders it via [TicketCard](TicketCard.md);
  - if it includes `pendingContact`, stores it — this is what switches the input row over to
    [ContactConfirmCard](ContactConfirmCard.md).
- While `pendingContact` is set, the normal chat `<form>` is not rendered at all — instead:
  - [ContactConfirmCard](ContactConfirmCard.md) is shown by default; "Yes" calls `confirmContact`.
  - Clicking "Edit details" swaps in [ContactForm](ContactForm.md) (`isEditingContact` state);
    submitting calls `submitContact`.
  - Both actions go through `applyContactActionResult`, which appends a small user-facing
    acknowledgment bubble (`"Yes, that's correct."` or `"Updated my contact details."` — chosen by
    the frontend for display; not necessarily byte-identical to the synthetic message the backend
    itself persists, see [conversationFlow](../backend-services/conversationFlow.md)) followed by
    the real reply, then clears `pendingContact` and re-enables the normal chat input.
  - If either action fails (e.g. a validation error from the backend), the error is shown inline
    via [ContactForm](ContactForm.md)'s `error` prop, and a failed "Yes" click falls back to
    showing the edit form so the customer can correct it themselves.
- Shows a "Typing…" placeholder while a chat request is in flight, and an inline error banner if
  the request fails.
- Header includes a `Link` to `/staff` (the [StaffDashboard](StaffDashboard.md)).

## Related

- [docs/components/TicketCard.md](TicketCard.md), [docs/components/ContactConfirmCard.md](ContactConfirmCard.md), [docs/components/ContactForm.md](ContactForm.md)
- [docs/frontend-utils/README.md](../frontend-utils/README.md)
- [docs/api-routes/post-api-chat.md](../api-routes/post-api-chat.md), [docs/api-routes/post-confirm-contact.md](../api-routes/post-confirm-contact.md), [docs/api-routes/patch-conversation-contact.md](../api-routes/patch-conversation-contact.md)
