# createTicketFromDraft

`frontend/src/api.ts`

## Signature

```ts
function createTicketFromDraft(conversationId: string, draft: DraftTicket): Promise<Ticket>
```

## Behavior

`POST`s `${API_BASE_URL}/api/conversations/${conversationId}/staff-create-ticket` with the draft.
Throws (via `parseOrThrow`) on a non-OK response (e.g. an invalid category). Returns the created
ticket — see [docs/api-routes/post-staff-create-ticket.md](../api-routes/post-staff-create-ticket.md).

## Used by

[docs/components/StaffChatWindow.md](../components/StaffChatWindow.md) — "Create ticket" button.
