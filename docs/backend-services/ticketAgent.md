# ticketAgent

`backend/src/ticketAgent.ts`

## Purpose

Owns all classification logic for the support chatbot: the `collect_contact_details` and
`create_ticket` tool schemas, the system prompt (persona, contact-collection rules, and the
troubleshooting playbooks), and the function that drives one turn of the conversation with Claude.

## Exports

- `TICKET_CATEGORIES` — `["broadband_fault", "mobile_fault", "landline_fault", "voip_fault", "billing", "provisioning", "account", "complaint", "other"]`, and the derived `TicketCategory` type.
- `TICKET_PRIORITIES` — `["low", "medium", "high", "urgent"]`, and the derived `TicketPriority` type.
- `TICKET_STATUSES` — `["open", "in_progress", "resolved", "closed"]`, and the derived `TicketStatus` type. (Ticket lifecycle status, not itself an argument to `create_ticket` — new tickets always start `open`.)
- `CreateTicketArgs` — the shape of a `create_ticket` tool call: `category`, `priority`, `summary`, `raw_message` (required), `troubleshooting_notes` (optional). No longer carries contact fields — see [contactValidation](contactValidation.md)'s `ContactDetails` and [conversationFlow](conversationFlow.md) for how contact is handled separately.
- `AgentTurnResult` — `{ reply: string; ticket: CreateTicketArgs | null; pendingContact: ContactDetails | null }`.
- `runAgentTurn(history: MessageParam[], contactConfirmed: boolean): Promise<AgentTurnResult>` — see below.

## How classification works

There is no separate ML classifier. `runAgentTurn` sends the conversation history plus the system prompt plus whichever tool is currently offered to `claude-sonnet-4-5` via the Anthropic Messages API (tool use / function calling). If Claude's response contains a `tool_use` block, its `input` *is* the structured result — no string parsing involved.

**Which tool is offered is gated on `contactConfirmed`, not left to prompt compliance alone:**

```
contactConfirmed == false  ->  tools: [collect_contact_details]
contactConfirmed == true   ->  tools: [create_ticket]
```

This matters because the conversation history persisted to `messages` only stores plain text (see [conversationFlow](conversationFlow.md)'s `loadHistory`), not the structured `tool_use` block from a prior turn — so Claude re-reading a text transcript can't reliably tell "I already called that tool." Not offering `collect_contact_details` once contact is confirmed makes it impossible to call again, rather than relying on the model inferring "already done" from prose. (This was found the hard way: an earlier version relied on prompt instructions alone and Claude called `collect_contact_details` a second time, producing a confusing repeat-confirmation loop.)

- `collect_contact_details` call: **no follow-up call is made.** The customer-facing confirmation is a fixed template built in code (`conversationFlow.formatContactConfirmation`), not something Claude needs to phrase, so `runAgentTurn` returns immediately with `pendingContact` set and `reply: ""`.
- `create_ticket` call: a follow-up call **is** required (per the Messages API: a model can't call a tool and produce user-facing text in the same turn) — `runAgentTurn` sends the history plus the assistant's tool-call turn plus a synthetic `tool_result` back to Claude to get the natural-language confirmation reply.
- No tool call: Claude's text response is returned as-is (typically a clarifying question, or — before contact is confirmed — a request for name/email/phone) and both `ticket` and `pendingContact` are `null`.

## System prompt structure

1. **Contact details first**: get name/email/phone/full address/postcode/whether the customer is the account holder before discussing any issue in depth; call `collect_contact_details` once, exactly once; explicitly told what the next message will look like once the customer confirms/corrects (`"Yes, that's correct."` or `"Actually, here are my correct details - ..."` — see [conversationFlow](conversationFlow.md)) so it doesn't re-confirm in prose once the tool is no longer offered; don't call `create_ticket` before contact is confirmed.
2. **Persona + rules**: brief/friendly tone, ask at most one clarifying question, call `create_ticket` exactly once, don't invent ETAs or account details.
3. **Broadband troubleshooting playbook** (4 items): slow speeds (wired speed test), no connection (router light color), network/line fault (master socket test), weak Wi-Fi / mesh (router placement, or node/backhaul status if a mesh system is mentioned).
4. **VOIP troubleshooting playbook** (1 item, its own category — `voip_fault`, distinct from `landline_fault`): correlate the call problem (no dial tone, choppy/robotic audio, dropped calls) with broadband status — if it tracks broadband issues, reclassify as `broadband_fault`; otherwise check for competing traffic causing jitter.
5. **Mobile troubleshooting playbook** (4 items): no/dropping signal (location + Airplane Mode toggle), signal-but-no-data (Wi-Fi-off test, roaming), calls/texts failing (direction, Wi-Fi Calling), SIM/handset not detected (SIM swap test).

In each troubleshooting case the model is instructed to ask **one** targeted diagnostic question (not the whole checklist), skip it if the customer already answered it, and record what was found in `troubleshooting_notes` so the maintenance team doesn't repeat it. This content is an original draft based on general ISP triage practice, not any real ISP's internal copy.

## Related

- [docs/backend-services/conversationFlow.md](conversationFlow.md) — the only caller of `runAgentTurn`; handles persistence and the contact confirm/correct endpoints.
- [docs/backend-services/contactValidation.md](contactValidation.md) — validates `collect_contact_details`'s output before it's trusted.
- [docs/db-schema/tickets.md](../db-schema/tickets.md), [docs/db-schema/conversations.md](../db-schema/conversations.md)
