# contactValidation

`backend/src/contactValidation.ts`

## Purpose

Server-side validation of customer contact details (name/email/phone/address/postcode/whether
they're the account holder), used regardless of where the data came from — an LLM tool call or a
customer-typed correction form — consistent with the security-minded posture the rest of the
backend takes (e.g. `PATCH /api/tickets/:id`'s category/priority/status validation).

## Exports

```ts
interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  isAccountHolder: boolean;
}

function validateContactDetails(input: Partial<ContactDetails>): string | null
```

Returns `null` if valid, or a human-readable error string (e.g. `"a valid email is required"`)
naming the first failing field. Checks, in order: `name` non-blank after trimming; `email` matches
a basic `local@domain.tld` pattern; `phone` matches a loose pattern allowing `+`, digits, spaces,
parentheses and hyphens, 7–20 characters; `address` non-blank after trimming; `postcode` matches a
loose UK postcode pattern (area/district + space + unit, space optional); `isAccountHolder` must be
an actual `boolean` (not just truthy/falsy or missing).

## Related

- [docs/backend-services/conversationFlow.md](conversationFlow.md) — calls this before trusting either the tool-extracted or the customer-submitted contact details.
- [docs/api-routes/post-confirm-contact.md](../api-routes/post-confirm-contact.md), [docs/api-routes/patch-conversation-contact.md](../api-routes/patch-conversation-contact.md)
