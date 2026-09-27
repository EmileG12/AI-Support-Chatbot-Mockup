# salesAgent.test.ts

`backend/src/salesAgent.test.ts` — suite: `backend-unit` (`cd backend && npm run test`)

Tests [salesAgent](../backend-services/salesAgent.md). Mocks the `@anthropic-ai/sdk` default export
the same way [ticketAgent.test.ts](ticketAgent.md) does — no real API calls.

## `runSalesClassifierTurn`

- When the mocked response includes a `classify_interest` tool call, returns `{ reply: "", category }` after a single call.
- When no tool is called, returns the clarifying-question text with `category: null`.

## `runSalesAgentTurn`

- No tool call -> `{ reply, lead: null, pendingContact: null }`.
- `collect_contact_details` tool call -> `pendingContact` immediately, `reply: ""`, no second call — same pattern as `runAgentTurn`.
- `collect_contact_details` is the only tool offered when `contactConfirmed` is `false`, `create_lead` the only one when it's `true`.
- The system prompt sent matches the given category — asserts it contains a broadband-specific plan name for `"broadband"` and a mobile-specific plan name for `"mobile"`.
- `create_lead` tool call -> a required second call (assistant tool-use turn + `tool_result` for the same `tool_use_id`) returning the follow-up reply text and the parsed `lead` object.

## `draftLeadSummary`

- Returns `null` for an empty history without calling the API — same short-circuit as `ticketAgent.draftTicketSummary`.
- Forces the `create_lead` tool via `tool_choice` and returns the parsed `lead` object; asserts the
  system prompt sent matches the given category (mobile-specific plan name).
- Returns `null` when the (mocked) response doesn't include a tool call.
