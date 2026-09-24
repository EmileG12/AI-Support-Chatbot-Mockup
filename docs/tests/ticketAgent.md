# ticketAgent.test.ts

`backend/src/ticketAgent.test.ts` — suite: `backend-unit` (`cd backend && npm run test`)

Tests [ticketAgent](../backend-services/ticketAgent.md). Mocks the `@anthropic-ai/sdk` default
export (`Anthropic`) so `Anthropic.messages.create` is a controllable `vi.fn()` — no real API
calls.

## Covers

- When the mocked Claude response has no `tool_use` block, `runAgentTurn` returns
  `{ reply, ticket: null, pendingContact: null }` after a single `messages.create` call.
- When the mocked response includes a `collect_contact_details` tool call, `runAgentTurn` returns
  `pendingContact` immediately with `reply: ""` and **no** second call — the confirmation prompt is
  built deterministically elsewhere (see [conversationFlow](../backend-services/conversationFlow.md)).
- When the mocked response includes a `create_ticket` tool call, `runAgentTurn` makes the required
  second call (carrying the assistant's tool-use turn plus a `tool_result` for the same
  `tool_use_id`) and returns both the follow-up reply text and the parsed `ticket` object.
- `collect_contact_details` is the only tool offered when `contactConfirmed` is `false`, and
  `create_ticket` the only one offered when it's `true` — asserted by inspecting the `tools` array
  passed to the mocked `messages.create`. This is the regression test for a real bug found in
  manual testing: relying on prompt instructions alone let Claude call
  `collect_contact_details` a second time (since the persisted history only stores plain text, not
  the structured tool-use block, so Claude couldn't reliably tell it had already been called),
  producing a confusing repeat-confirmation loop.

The mock's default export has to be a real `function`, not an arrow function, since
`ticketAgent.ts` calls `new Anthropic(...)` — an arrow function can't be used as a constructor.

## `draftTicketSummary`

- Forces the `create_ticket` tool (asserts `tool_choice: { type: "tool", name: "create_ticket" }`
  on the mocked call) and returns the parsed args from a single call - no follow-up call, unlike
  `runAgentTurn`'s `create_ticket` path.
- Returns `null` for an empty history without calling Claude at all.

## `draftResolutionSummary`

- Returns the plain-text resolution summary from a single call, asserting no `tools` are passed to
  the mocked `messages.create` (unlike `draftTicketSummary`, there's no structured extraction here).
- Returns `null` for an empty history without calling Claude at all.
- Returns `null` when the mocked response has no text content.
