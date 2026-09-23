# submitContact

`frontend/src/api.ts`

## Signature

```ts
function submitContact(conversationId: string, details: ContactDetails): Promise<ContactActionResponse>
```

## Behavior

`PATCH`es `${API_BASE_URL}/api/conversations/${conversationId}/contact` with `details`. Same error
handling as [confirmContact](confirmContact.md) (surfaces the backend's validation message via
`parseOrThrow`). Returns `{ reply, ticket }` — see
[docs/api-routes/patch-conversation-contact.md](../api-routes/patch-conversation-contact.md).

## Used by

[docs/components/App.md](../components/App.md) — called when [ContactForm](../components/ContactForm.md) is submitted.
