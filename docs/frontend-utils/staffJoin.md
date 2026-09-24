# staffJoin

`frontend/src/api.ts`

## Signature

```ts
function staffJoin(conversationId: string): Promise<StaffJoinResponse>
```

## Behavior

`POST`s `${API_BASE_URL}/api/conversations/${conversationId}/staff-join` with no body. Throws (via
`parseOrThrow`) on a non-OK response (e.g. the conversation is no longer queued). Returns
`{ draftTicket, messages }` — see [docs/api-routes/post-staff-join.md](../api-routes/post-staff-join.md).

## Used by

[docs/components/QueuePanel.md](../components/QueuePanel.md) — "Join" button; the result is handed up to [StaffDashboard](../components/StaffDashboard.md) to open the [StaffChatWindow](../components/StaffChatWindow.md).
