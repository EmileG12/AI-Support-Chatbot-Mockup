# salesAgent

`backend/src/salesAgent.ts`

## Purpose

The Customer Sales counterpart to [ticketAgent](ticketAgent.md): classifies whether a sales
conversation is about broadband or mobile, then runs a category-specific Claude agent that answers
product questions from Pop Telecom's real plan catalog and, once the customer shows buying intent,
collects contact details and logs a `create_lead` tool call. Once contact is confirmed, a sales
conversation goes through the exact same working-hours queue/live-handoff as support (see
[conversationFlow](conversationFlow.md)) instead of always running this module's agent - `draftLeadSummary` below is this module's contribution to that handoff, the lead-drafting counterpart to `draftTicketSummary`.

## Exports

- `SALES_CATEGORIES` — `["broadband", "mobile"]`, and the derived `SalesCategory` type.
- `LEAD_STATUSES` — `["new", "contacted", "closed"]`, and the derived `LeadStatus` type.
- `CreateLeadArgs` — the shape of a `create_lead` tool call: `category`, `summary`, `raw_message` (required), `plan_interested` (optional). No contact fields - see [contactValidation](contactValidation.md)'s `ContactDetails` and [conversationFlow](conversationFlow.md) for how contact is handled (identical mechanism to the support flow).
- `SalesAgentTurnResult` — `{ reply: string; lead: CreateLeadArgs | null; pendingContact: ContactDetails | null }`.
- `runSalesClassifierTurn(history: MessageParam[]): Promise<{ reply: string; category: SalesCategory | null }>` — see below.
- `runSalesAgentTurn(history: MessageParam[], category: SalesCategory, contactConfirmed: boolean): Promise<SalesAgentTurnResult>` — see below.
- `draftLeadSummary(history: MessageParam[], category: SalesCategory): Promise<CreateLeadArgs | null>` — [ticketAgent.draftTicketSummary](ticketAgent.md)'s counterpart for a live sales handoff. Returns `null` for an empty history; otherwise forces the `create_lead` tool (`tool_choice`) against the category's system prompt so a staff member joining gets a structured category/plan/summary extraction rather than a conversational reply. Not persisted itself - called from [conversationFlow.updateDraftLead](conversationFlow.md).

## Classification

`runSalesClassifierTurn` sends the conversation history plus a short `CLASSIFIER_SYSTEM_PROMPT` and
an optional (not forced via `tool_choice`) `classify_interest` tool to `claude-sonnet-4-5`. If
Claude is confident, it calls the tool and the category is returned. If the customer's message is
ambiguous (e.g. "what deals do you have?"), Claude is instructed to skip the tool and just ask a
one-sentence clarifying question instead - `category` comes back `null` and `reply` holds that
question. [conversationFlow.runSalesTurn](conversationFlow.md) persists the classified category on
the `conversations` row once known, and continues straight into `runSalesAgentTurn` in the same
round-trip rather than making the customer wait an extra turn for "ok, broadband it is."

## Category-specific sales agents

`runSalesAgentTurn` picks `BROADBAND_SALES_SYSTEM_PROMPT` or `MOBILE_SALES_SYSTEM_PROMPT` based on
`category`, and otherwise follows the exact same tool-gating/follow-up-call shape as
[ticketAgent.runAgentTurn](ticketAgent.md):

```
contactConfirmed == false  ->  tools: [collect_contact_details]
contactConfirmed == true   ->  tools: [create_lead]
```

- `collect_contact_details` call: no follow-up call - returns immediately with `pendingContact` set and `reply: ""`, exactly like the support flow (the confirmation card is the same deterministic template, [conversationFlow.formatContactConfirmation](conversationFlow.md)).
- `create_lead` call: a follow-up call is made (tool use can't produce user-facing text in the same turn) to get the natural-language confirmation reply.
- No tool call: Claude's text response (a product answer or clarifying question) is returned as-is; both `lead` and `pendingContact` are `null`.

Both system prompts share a common `SALES_RULES` block: answer questions directly and only from the
listed catalog (never invent a plan/speed/price), only move towards contact collection once the
customer shows buying intent, and call `collect_contact_details` / `create_lead` exactly once each,
in that order, the same way the support prompt gates `create_ticket` on contact being confirmed
first.

### Broadband catalog (baked into `BROADBAND_SALES_SYSTEM_PROMPT`)

Fibre 40 (~38/9 Mbps, FTTC, £21/mo, 24mo), Fibre 80 (~67/17 Mbps, hybrid SoGEA, £23/mo, 24mo), Full
Fibre 220 (~207/29 Mbps, FTTP, £33/mo, 24mo), Full Fibre 330 (~311/47 Mbps, FTTP, £33/mo, 24mo),
Full Fibre 1000 (~944/110 Mbps, FTTP, £36/mo, 24mo), and the student-only Full Fibre 115 (~109/19
Mbps, FTTP, £39.99/mo, 12mo). The prompt tells Claude to ask about household size/use-case if
unclear and recommend accordingly (light use -> Fibre 40/80, streaming-heavy/multi-device ->
220/330, heaviest multi-user households -> 1000, students -> the 115 student plan).

### Mobile catalog (baked into `MOBILE_SALES_SYSTEM_PROMPT`)

Both are O2-network SIM-only, 12-month contracts, unlimited UK calls/texts, free EU roaming,
keep-your-number: 15GB for £7.50/mo, and Unlimited data for £12/mo. The prompt tells Claude to ask
roughly how much data the customer uses if unclear.

Both catalogs are hand-cleaned text baked directly into the system prompts (not read from
`Salesdetails/*.txt` at runtime) - see [conversations.md](../db-schema/conversations.md)'s `mode`/
`sales_category` columns for how a conversation gets routed here in the first place.

## Related

- [docs/backend-services/conversationFlow.md](conversationFlow.md) — the only caller; handles persistence, classification-then-answer chaining, and lead creation.
- [docs/backend-services/contactValidation.md](contactValidation.md) — validates `collect_contact_details`'s output before it's trusted.
- [docs/backend-services/ticketAgent.md](ticketAgent.md) — the support-flow counterpart this mirrors.
- [docs/db-schema/leads.md](../db-schema/leads.md), [docs/db-schema/conversations.md](../db-schema/conversations.md)
