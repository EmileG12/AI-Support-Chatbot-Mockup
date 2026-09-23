# ticketAgent

`backend/src/ticketAgent.ts`

## Purpose

Owns all classification logic for the support chatbot: the `create_ticket` tool schema, the system prompt (persona, rules, and the troubleshooting playbooks), and the function that drives one turn of the conversation with Claude.

## Exports

- `TICKET_CATEGORIES` — `["broadband_fault", "mobile_fault", "landline_fault", "billing", "provisioning", "account", "complaint", "other"]`, and the derived `TicketCategory` type.
- `TICKET_PRIORITIES` — `["low", "medium", "high", "urgent"]`, and the derived `TicketPriority` type.
- `TICKET_STATUSES` — `["open", "in_progress", "resolved", "closed"]`, and the derived `TicketStatus` type. (Ticket lifecycle status, not itself an argument to `create_ticket` — new tickets always start `open`.)
- `CreateTicketArgs` — the shape of a `create_ticket` tool call: `category`, `priority`, `summary`, `raw_message` (required), `customer_name`, `customer_contact`, `troubleshooting_notes` (optional).
- `AgentTurnResult` — `{ reply: string; ticket: CreateTicketArgs | null }`.
- `runAgentTurn(history: MessageParam[]): Promise<AgentTurnResult>` — see below.

## How classification works

There is no separate ML classifier. `runAgentTurn` sends the full conversation history plus the system prompt plus the `create_ticket` tool definition to `claude-sonnet-4-5` via the Anthropic Messages API (tool use / function calling). If Claude's response contains a `tool_use` block for `create_ticket`, its `input` *is* the classification (category, priority, summary, etc.) — no string parsing involved.

If a tool call was made, a second Claude call is required (per the Messages API: a model can't call a tool and produce user-facing text in the same turn) — `runAgentTurn` sends the history plus the assistant's tool-call turn plus a synthetic `tool_result` back to Claude to get the natural-language confirmation reply. If no tool call was made, Claude's text response is returned as-is (typically a clarifying question) and `ticket` is `null`.

## System prompt structure

1. **Persona + rules**: brief/friendly tone, ask at most one clarifying question, don't require name/contact, call `create_ticket` exactly once, don't invent ETAs or account details.
2. **Broadband troubleshooting playbook** (5 items): slow speeds (wired speed test), no connection (router light color), network/line fault (master socket test), weak Wi-Fi / mesh (router placement, or node/backhaul status if a mesh system is mentioned), VOIP/digital landline (correlate with broadband status vs. competing traffic).
3. **Mobile troubleshooting playbook** (4 items): no/dropping signal (location + Airplane Mode toggle), signal-but-no-data (Wi-Fi-off test, roaming), calls/texts failing (direction, Wi-Fi Calling), SIM/handset not detected (SIM swap test).

In each case the model is instructed to ask **one** targeted diagnostic question (not the whole checklist), skip it if the customer already answered it, and record what was found in `troubleshooting_notes` so the maintenance team doesn't repeat it. This content is an original draft based on general ISP triage practice, not any real ISP's internal copy.

## Related

- [docs/api-routes/post-api-chat.md](../api-routes/post-api-chat.md) — the only caller of `runAgentTurn`.
- [docs/db-schema/tickets.md](../db-schema/tickets.md) — where `CreateTicketArgs` ends up persisted.
