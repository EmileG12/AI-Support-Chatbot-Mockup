# Backend services

| Module | Path | Purpose |
|---|---|---|
| [supabaseClient](supabaseClient.md) | `backend/src/supabaseClient.ts` | Service-role Supabase client, backend-only |
| [ticketAgent](ticketAgent.md) | `backend/src/ticketAgent.ts` | Claude tool-use agent: classifies issues and produces `create_ticket` calls |
| [duplicates](duplicates.md) | `backend/src/duplicates.ts` | Wraps the `find_possible_duplicate_ticket` RPC call |
