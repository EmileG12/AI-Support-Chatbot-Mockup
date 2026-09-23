---
name: suggest-tests
description: Use after making any code change to a React component/hook/utility under frontend/src/ or an Express route handler/service module under backend/src/ — suggests whether new Vitest tests are warranted, and which existing test files are relevant to re-run to check for regressions.
---

# Suggest tests

This is a two-package monorepo (`frontend/` React app, `backend/` Express API), each with its own
[Vitest](https://vitest.dev) suite (see [`docs/tests/README.md`](../../../docs/tests/README.md)):

| Suite | Location | Files | Environment | Command |
|---|---|---|---|---|
| `frontend-unit` | `frontend/` | `Foo.test.tsx` | jsdom (+ React Testing Library) | `cd frontend && npm run test` |
| `backend-unit` | `backend/` | `foo.test.ts` | node (+ supertest for routes) | `cd backend && npm run test` |

There is no browser suite. Every interaction in this app (text input, buttons, `<select>`s, table
rows) is expressible in jsdom — nothing depends on real layout, hit-testing, or pointer/scroll
geometry. If a future feature genuinely needs that (e.g. drag-and-drop, canvas), add a
`Foo.browser.test.tsx` suite then, following the same escape hatch as the frontend suite already
uses `jsdom` — don't add one speculatively.

Conventions already established (follow them, don't reinvent per file):
- Test files live next to the code they test (`Foo.tsx` -> `Foo.test.tsx`, `foo.ts` -> `foo.test.ts`).
- Frontend tests mock the `frontend/src/api.ts` boundary module (`vi.mock('./api', () => ({ ... }))`
  with an explicit factory) rather than `fetch` directly.
- Backend tests mock the `backend/src/supabaseClient.ts` boundary module and, where relevant, the
  `@anthropic-ai/sdk` import — never a real Supabase instance or a real Anthropic API call.
  `backend/src/test/supabaseMock.ts` provides a chainable query-builder mock
  (`.select().eq().order()` etc., resolving to `{ data, error }`) — reuse it instead of hand-rolling
  a new one per test file.
- Backend route tests import the Express app from `backend/src/app.ts` (not `server.ts`, which only
  adds `.listen()`) and exercise it with `supertest` — no real port is bound.
- Frontend navigation (once there's any beyond the two static routes) should be tested by rendering
  real routes and asserting on what ends up on screen, not by mocking `useNavigate` — test behavior,
  not implementation.
- `frontend/src/test/setup.ts` wires `afterEach(cleanup)` explicitly (globals are off) and imports
  `@testing-library/jest-dom/vitest` for matchers like `toBeInTheDocument`.

## Checklist

0. **Check whether `frontend/src/` or `backend/src/` changed at all first.** If the change is
   confined to `supabase/migrations/`, `supabase/config.toml`, or `docs/` — no application code —
   this skill doesn't apply: there's nothing for Vitest to exercise, and running either suite
   against unchanged code proves nothing about the change just made. Skip straight to
   migration-appropriate verification instead (apply the migration, query it, curl the API) and
   don't run either suite.
1. List what changed in this task: frontend components/hooks/utils, backend route handlers/service
   modules, added/modified/removed.
2. For each one with user-visible or branching behavior (conditionals, error handling, state
   transitions, async calls, validation) — not pure styling/markup-only changes — check whether a
   matching test file exists.
   - Missing and the change introduces real behavior worth protecting: propose specific test cases
     (not just "renders without crashing") and write them as part of finishing the change, same as
     `update-docs` does for documentation.
   - Exists already: check whether it still covers the changed behavior; add cases if not.
3. Identify which existing test files are affected by the change (e.g. editing
   `backend/src/duplicates.ts` affects `backend/src/duplicates.test.ts` and any `app.test.ts` cases
   that exercise the duplicate-detection path in `POST /api/chat`) and run the relevant suite.
   `npm run test` runs that package's whole suite — cheap enough to just run all of it while each
   suite stays small. A frontend-only change never needs the backend suite run, and vice versa.
4. Skip suggesting *new* tests for pure CSS/styling changes, trivial prop renames, or config-only
   changes with no behavior to protect — and for the same reason, skip *running* the suite for them
   too. `tsc --noEmit` is still worth running (a typo in a prop or a bad JSX edit is a real failure
   mode that catches), but if nothing in the change touches logic, conditionals, or data flow, no
   existing test can possibly be affected, and running the suite anyway is pure overhead.
5. **Document new/changed test files** under `docs/tests/<Name>.md` (its own category, separate
   from `docs/components/`, `docs/backend-services/`, `docs/api-routes/`, so test docs don't flood
   the docs for the actual codebase). Each entry: the test file's path, which suite it belongs to
   and how to run it, what it covers (its actual test cases, in prose), and a link back to the doc
   of the thing it tests (e.g. `[TicketCard](../components/TicketCard.md)`). Update
   `docs/tests/README.md`'s index too. This follows the same "describes current state, edited in
   place" rule as the rest of `/docs`.
