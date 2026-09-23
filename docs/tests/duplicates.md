# duplicates.test.ts

`backend/src/duplicates.test.ts` — suite: `backend-unit` (`cd backend && npm run test`)

Tests [duplicates](../backend-services/duplicates.md). Mocks `backend/src/supabaseClient.ts` via
the shared `backend/src/test/supabaseMock.ts` helper — no real Supabase instance.

## Covers

- Returns the matched ticket (id/summary/similarity) when the `find_possible_duplicate_ticket` RPC
  returns a row.
- Returns `null` when the RPC returns an empty array (no match above the threshold).
- Returns `null`, not a thrown error, when the RPC itself errors — `findPossibleDuplicateTicket`
  degrades to "no duplicate found" on lookup failure rather than blocking ticket creation.
