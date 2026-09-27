# createLeadFromDraft

`frontend/src/api.ts`

## Signature

```ts
function createLeadFromDraft(conversationId: string, draft: DraftLead): Promise<Lead>
```

## Behavior

`POST`s `${API_BASE_URL}/api/conversations/${conversationId}/staff-create-lead` with the draft.
Throws (via `parseOrThrow`) on a non-OK response (e.g. an invalid category). Returns the created
lead — see [docs/api-routes/post-staff-create-lead.md](../api-routes/post-staff-create-lead.md).
Sales counterpart to [createTicketFromDraft](createTicketFromDraft.md) — no resolution-flow
equivalent (`resolveTicketFromDraft`), since leads have no "resolved" concept.

## Used by

[docs/components/StaffLeadChatWindow.md](../components/StaffLeadChatWindow.md) — "Create lead" button.
