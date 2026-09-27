# LeadCard.test.tsx

`frontend/src/LeadCard.test.tsx` — suite: `frontend-unit` (`cd frontend && npm run test`)

Tests [LeadCard](../components/LeadCard.md), using the `makeLead` fixture from
`frontend/src/test/fixtures.ts`.

## Covers

- Renders the category label, plan, and summary.
- Renders the mobile category label.
- Omits the plan line when `plan_interested` is `null`.
