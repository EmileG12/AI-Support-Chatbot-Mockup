# contactValidation.test.ts

`backend/src/contactValidation.test.ts` — suite: `backend-unit` (`cd backend && npm run test`)

Tests [contactValidation](../backend-services/contactValidation.md).

## Covers

- Valid details return `null`.
- A missing/blank name is rejected.
- A malformed or empty email is rejected.
- A malformed phone number is rejected; a UK landline-style and mobile-style (with `+44`) number
  are both accepted.
- A missing/blank address is rejected.
- A malformed postcode is rejected; common UK postcode formats (with and without the internal
  space) are accepted.
- A non-boolean `isAccountHolder` is rejected; `false` is accepted (it's a valid answer, not a
  missing one).
