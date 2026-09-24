# Backend services

| Module | Path | Purpose |
|---|---|---|
| [supabaseClient](supabaseClient.md) | `backend/src/supabaseClient.ts` | Service-role Supabase client, backend-only |
| [ticketAgent](ticketAgent.md) | `backend/src/ticketAgent.ts` | Claude tool-use agent: collects contact details, classifies issues, produces `create_ticket`/`collect_contact_details` calls |
| [contactValidation](contactValidation.md) | `backend/src/contactValidation.ts` | Server-side contact-detail validation (name/email/phone/address/postcode/account holder) |
| [conversationFlow](conversationFlow.md) | `backend/src/conversationFlow.ts` | Runs/persists agent turns; contact confirm/correct logic; the working-hours queue/live handoff |
| [duplicates](duplicates.md) | `backend/src/duplicates.ts` | Wraps the `find_possible_duplicate_ticket` RPC call |
| [settings](settings.md) | `backend/src/settings.ts` | The `working_hours` toggle backing the live handoff feature |
