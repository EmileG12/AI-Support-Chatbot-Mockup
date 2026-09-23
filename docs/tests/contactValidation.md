# contactValidation.test.ts

`backend/src/contactValidation.test.ts` — suite: `backend-unit` (`cd backend && npm run test`)

Tests [contactValidation](../backend-services/contactValidation.md).

## Covers

- Valid details return `null`.
- A missing/blank name is rejected.
- A malformed or empty email is rejected.
- A malformed phone number is rejected; a UK landline-style and mobile-style (with `+44`) number
  are both accepted.
