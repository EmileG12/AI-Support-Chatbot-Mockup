# confirmContact

`frontend/src/api.ts`

## Signature

```ts
function confirmContact(conversationId: string): Promise<ContactActionResponse>
```

## Behavior

`POST`s `${API_BASE_URL}/api/conversations/${conversationId}/confirm-contact` with no body. On a
non-OK response, reads the JSON body's `error` field and throws that (falling back to a generic
message) via the shared `parseOrThrow` helper — so [ContactForm](../components/ContactForm.md) can
show the backend's actual validation message. Returns `{ reply, ticket }` — see
[docs/api-routes/post-confirm-contact.md](../api-routes/post-confirm-contact.md).

## Used by

[docs/components/App.md](../components/App.md) — called when "Yes, that's correct" is clicked.
