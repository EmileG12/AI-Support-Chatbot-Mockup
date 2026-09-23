# ticketAgent.test.ts

`backend/src/ticketAgent.test.ts` — suite: `backend-unit` (`cd backend && npm run test`)

Tests [ticketAgent](../backend-services/ticketAgent.md). Mocks the `@anthropic-ai/sdk` default
export (`Anthropic`) so `Anthropic.messages.create` is a controllable `vi.fn()` — no real API
calls.

## Covers

- When the mocked Claude response has no `tool_use` block, `runAgentTurn` returns
  `{ reply, ticket: null }` after a single `messages.create` call.
- When the mocked response includes a `create_ticket` tool call, `runAgentTurn` makes the required
  second call (carrying the assistant's tool-use turn plus a `tool_result` for the same
  `tool_use_id`) and returns both the follow-up reply text and the parsed `ticket` object.

The mock's default export has to be a real `function`, not an arrow function, since
`ticketAgent.ts` calls `new Anthropic(...)` — an arrow function can't be used as a constructor.
