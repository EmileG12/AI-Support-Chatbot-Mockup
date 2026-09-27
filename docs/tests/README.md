# Tests

Two independent Vitest suites — see [docs/architecture.md](../architecture.md) for how the two
packages relate.

| Suite | Location | Command |
|---|---|---|
| `frontend-unit` | `frontend/` | `cd frontend && npm run test` |
| `backend-unit` | `backend/` | `cd backend && npm run test` |

No browser suite exists — every interaction in this app (text input, buttons, `<select>`s, table
rows) is expressible in jsdom.

| Test file | Suite | Covers |
|---|---|---|
| [LoginPage](LoginPage.md) | frontend-unit | [LoginPage](../components/LoginPage.md) |
| [AuthGate](AuthGate.md) | frontend-unit | [AuthGate](../components/AuthGate.md) |
| [LogoutButton](LogoutButton.md) | frontend-unit | [LogoutButton](../components/LogoutButton.md) |
| [TicketCard](TicketCard.md) | frontend-unit | [TicketCard](../components/TicketCard.md) |
| [LeadCard](LeadCard.md) | frontend-unit | [LeadCard](../components/LeadCard.md) |
| [ModeSelectCard](ModeSelectCard.md) | frontend-unit | [ModeSelectCard](../components/ModeSelectCard.md) |
| [App](App.md) | frontend-unit | [App](../components/App.md) |
| [StaffDashboard](StaffDashboard.md) | frontend-unit | [StaffDashboard](../components/StaffDashboard.md) |
| [ContactConfirmCard](ContactConfirmCard.md) | frontend-unit | [ContactConfirmCard](../components/ContactConfirmCard.md) |
| [ContactForm](ContactForm.md) | frontend-unit | [ContactForm](../components/ContactForm.md) |
| [QueuePanel](QueuePanel.md) | frontend-unit | [QueuePanel](../components/QueuePanel.md) |
| [StaffChatWindow](StaffChatWindow.md) | frontend-unit | [StaffChatWindow](../components/StaffChatWindow.md) |
| [StaffLeadChatWindow](StaffLeadChatWindow.md) | frontend-unit | [StaffLeadChatWindow](../components/StaffLeadChatWindow.md) |
| [duplicates](duplicates.md) | backend-unit | [duplicates](../backend-services/duplicates.md) |
| [contactValidation](contactValidation.md) | backend-unit | [contactValidation](../backend-services/contactValidation.md) |
| [ticketAgent](ticketAgent.md) | backend-unit | [ticketAgent](../backend-services/ticketAgent.md) |
| [salesAgent](salesAgent.md) | backend-unit | [salesAgent](../backend-services/salesAgent.md) |
| [settings](settings.md) | backend-unit | [settings](../backend-services/settings.md) |
| [backend-app](backend-app.md) | backend-unit | [api-routes](../api-routes/README.md) (also exercises [conversationFlow](../backend-services/conversationFlow.md) and [auth](../backend-services/auth.md)) |
