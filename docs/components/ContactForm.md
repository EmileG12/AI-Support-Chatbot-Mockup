# ContactForm

`frontend/src/ContactForm.tsx`

## Purpose

Shown in [App](App.md) after the customer clicks "Edit details" on
[ContactConfirmCard](ContactConfirmCard.md) — three labeled inputs (name/email/phone) pre-filled
from the captured (possibly wrong) values, a "Save details" submit, and "Cancel" to go back to the
confirm card.

## Props

```ts
interface ContactFormProps {
  initial: ContactDetails;
  onSubmit: (details: ContactDetails) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}
```

Local state holds the editable field values, seeded from `initial`. On submit, calls `onSubmit`
with trimmed values — [App](App.md) then calls `submitContact`. `error` renders as a banner (e.g.
a validation message the backend rejected).

## Related

- [docs/components/ContactConfirmCard.md](ContactConfirmCard.md)
- [docs/frontend-utils/submitContact.md](../frontend-utils/submitContact.md)
