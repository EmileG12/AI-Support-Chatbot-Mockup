# Components

| Component | Path | Purpose |
|---|---|---|
| [LoginPage](LoginPage.md) | `frontend/src/LoginPage.tsx` | Single-account sign-in form (`/login`) |
| [AuthGate](AuthGate.md) | `frontend/src/AuthGate.tsx` | Layout route gating `/`, `/staff`, `/staff/sales` behind login |
| [LogoutButton](LogoutButton.md) | `frontend/src/LogoutButton.tsx` | Shared "Log out" control used in the header nav |
| [App](App.md) | `frontend/src/App.tsx` | Customer-facing chat page (`/`) |
| [StaffDashboard](StaffDashboard.md) | `frontend/src/StaffDashboard.tsx` | Internal ticket list/detail/override page (`/staff`) |
| [ModeSelectCard](ModeSelectCard.md) | `frontend/src/ModeSelectCard.tsx` | "Customer Support" / "Customer Sales" mode-picker card shown before a conversation starts |
| [TicketCard](TicketCard.md) | `frontend/src/TicketCard.tsx` | Ticket summary card, used in both pages above |
| [LeadCard](LeadCard.md) | `frontend/src/LeadCard.tsx` | Sales lead summary card, the Customer Sales counterpart to TicketCard |
| [ContactConfirmCard](ContactConfirmCard.md) | `frontend/src/ContactConfirmCard.tsx` | Yes/Edit card over auto-detected contact details |
| [ContactForm](ContactForm.md) | `frontend/src/ContactForm.tsx` | Plain form for correcting contact details |
| [QueuePanel](QueuePanel.md) | `frontend/src/QueuePanel.tsx` | List of customers waiting for a staff member, with a "Join" action |
| [StaffChatWindow](StaffChatWindow.md) | `frontend/src/StaffChatWindow.tsx` | Live staff <-> customer chat for a support conversation, once joined |
| [StaffLeadChatWindow](StaffLeadChatWindow.md) | `frontend/src/StaffLeadChatWindow.tsx` | Live staff <-> customer chat for a sales conversation, once joined - the sales counterpart to StaffChatWindow |
