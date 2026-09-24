# resolveTicketFromDraft

`frontend/src/api.ts`

## Signature

```ts
function resolveTicketFromDraft(
  conversationId: string,
  draft: DraftTicket,
  resolutionNotes: string
): Promise<Ticket>
```

## Behavior

`POST`s `${API_BASE_URL}/api/conversations/${conversationId}/staff-create-ticket` with
`{ ...draft, status: "resolved", resolution_notes: resolutionNotes }` — the same route
[createTicketFromDraft](createTicketFromDraft.md) uses, just with the resolution fields added.
Throws (via `parseOrThrow`) on a non-OK response (e.g. blank `resolutionNotes`). Returns the
created ticket — see
[docs/api-routes/post-staff-create-ticket.md](../api-routes/post-staff-create-ticket.md).

## Used by

[docs/components/StaffChatWindow.md](../components/StaffChatWindow.md) — "Accept & resolve ticket" button.
