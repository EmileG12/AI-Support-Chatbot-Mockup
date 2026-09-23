# conversationFlow

`backend/src/conversationFlow.ts`

## Purpose

Everything about running a turn of the conversation and persisting the result, shared by
`POST /api/chat` and the two contact confirm/correct endpoints — all three need "run a turn
against the current conversation state and persist whatever it produced."

## Exports

- `insertUserMessage(conversationId, content)` — inserts a `role: "user"` row into `messages`.
- `runAndPersistTurn(conversationId): Promise<TurnResult>` — the core shared function, see below.
  `TurnResult = { reply: string; ticket: Record<string, unknown> | null; pendingContact: ContactDetails | null }`.
- `confirmPendingContact(conversationId): Promise<ContactActionResult | { error: string }>` — customer clicked "Yes".
- `overwriteContact(conversationId, input): Promise<ContactActionResult | { error: string }>` — customer submitted the correction form.
  `ContactActionResult = { reply: string; ticket: Record<string, unknown> | null }`.
- `formatContactConfirmation(contact)` — the fixed "Just to confirm, that's: ... Is that all correct?" template.

## `runAndPersistTurn`

1. Loads the conversation's message history and its `contact_confirmed` flag (in parallel).
2. Calls `runAgentTurn(history, contactConfirmed)` (see [ticketAgent](ticketAgent.md)).
3. If the result has `pendingContact` (Claude just called `collect_contact_details`): saves the
   (unconfirmed) name/email/phone onto the `conversations` row, inserts the deterministic
   confirmation text as an `assistant` message, and returns it as `reply` — **no further Claude
   call this turn**.
4. Otherwise: inserts the real `reply` as an `assistant` message if non-empty, and if a `ticket`
   was returned, creates it (looking up the conversation's confirmed contact fields, running the
   duplicate check, inserting the row, marking the conversation `resolved`).

## Confirm / correct endpoints

Both `confirmPendingContact` and `overwriteContact` end by calling a shared `finalizeContact`:

1. Validates the contact details (`overwriteContact`) or checks they were already stored and not
   yet confirmed (`confirmPendingContact` — 400s if already confirmed or if what's stored fails
   validation).
2. Sets `contact_confirmed = true` on the conversation (overwriting the stored fields first, for
   the correction path).
3. Inserts a **synthetic `user`-role message** — `"Yes, that's correct."` for a plain confirm, or
   `"Actually, here are my correct details - Name: ..., Email: ..., Phone: ...."` for a
   correction — then calls `runAndPersistTurn`.

**Why a synthetic `user` message, not an assistant one:** an earlier version inserted a
deterministic assistant "handoff" message here before calling `runAndPersistTurn`. That left the
history ending on *two consecutive assistant turns* (the confirmation prompt, then the handoff)
with no user turn between them — Claude's next call had nothing to respond to and just repeated
the confirmation prompt verbatim. Framing the confirm/correct action as a real user turn keeps the
conversation alternating properly, and lets Claude's own reply naturally pick back up on whatever
issue the customer already described (the original point of doing a real call here at all, rather
than another canned message) instead of asking "what can I help with" as if nothing was said.

## Related

- [docs/backend-services/ticketAgent.md](ticketAgent.md)
- [docs/backend-services/contactValidation.md](contactValidation.md)
- [docs/backend-services/duplicates.md](duplicates.md)
- [docs/api-routes/README.md](../api-routes/README.md) — all three routes that use this module
