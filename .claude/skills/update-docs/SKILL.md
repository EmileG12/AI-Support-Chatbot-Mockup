---
name: update-docs
description: Use after making any code change that adds, modifies, or removes a React component, frontend API helper, Express route, backend service module, Supabase table, RLS policy, or Postgres RPC function — checks that the matching /docs files were created or updated to reflect current state before the change is considered finished.
---

# Update docs

`/docs` describes the CURRENT state of the codebase only — edit files in place, never append change-log entries.

1. List what changed in this task: frontend components, frontend API helpers (`frontend/src/api.ts`), backend service modules (`backend/src/*.ts`), Express routes (`backend/src/server.ts`), Supabase tables, RLS policies, and Postgres RPC functions added/modified/removed.
2. For each, create or update the matching doc file:
   - `frontend/src/Foo.tsx` -> `docs/components/Foo.md`
   - a function exported from `frontend/src/api.ts` -> `docs/frontend-utils/<functionName>.md`
   - `backend/src/foo.ts` (service module, e.g. `ticketAgent.ts`, `duplicates.ts`, `supabaseClient.ts`) -> `docs/backend-services/foo.md`
   - a route in `backend/src/server.ts` (e.g. `POST /api/chat`) -> `docs/api-routes/<method>-<path-slug>.md`
   - table `foo` -> `docs/db-schema/foo.md`
   - each policy on `foo` -> `docs/rls-policies/foo/<policy_name>.md`
   - RPC function `foo()` -> `docs/rpc-functions/foo.md`
3. For any Supabase element (table/policy/function), get the current definition by reading the relevant file(s) in `supabase/migrations/` — apply every migration that touches that table/function in order to determine its current shape — and copy the resulting definition into the doc's "Current DDL"/"Current definition" section. Never hand-paraphrase; never copy a single migration file if a later one alters the same object.
4. If something was removed, delete its doc file and its row in the domain `README.md` index — don't leave stale entries.
5. Update the relevant domain `README.md` index table for any addition/removal.
6. Keep entries concise: purpose, shape/signature, current behavior, related-doc links. No "changed in this task" language.
7. Update `docs/architecture.md` only when the change is a real architectural shift (a new route group, a new data-flow pattern, a new top-level feature) — not for every component/module addition, which belongs in its own `/docs` category per steps 1-2 instead. `architecture.md` is a map of the territory, not a duplicate of the detailed docs it links to.
