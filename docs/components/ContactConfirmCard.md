# ContactConfirmCard

`frontend/src/ContactConfirmCard.tsx`

## Purpose

Shown in [App](App.md) once the chat agent has captured name/email/phone/address/postcode/whether
the customer is the account holder (via `collect_contact_details` — see
[ticketAgent](../backend-services/ticketAgent.md)) but before the customer has confirmed them.
Displays the captured details (account holder shown as "Yes"/"No") with "Yes, that's correct" and
"Edit details" buttons, replacing the normal chat input while it's open.

## Props

```ts
interface ContactConfirmCardProps {
  contact: ContactDetails;
  onConfirm: () => void;
  onEdit: () => void;
  isSubmitting: boolean;
}
```

Purely presentational — [App](App.md) owns the actual `confirmContact`/state-transition logic;
`onConfirm`/`onEdit` are called on click, and both buttons are disabled while `isSubmitting`.

## Related

- [docs/components/ContactForm.md](ContactForm.md) — shown instead of this, after "Edit details" is clicked.
- [docs/frontend-utils/confirmContact.md](../frontend-utils/confirmContact.md)
