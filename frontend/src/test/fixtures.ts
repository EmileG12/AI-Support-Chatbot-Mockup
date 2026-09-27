import type { Lead, Ticket } from "../types";

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    conversation_id: "conv-1",
    category: "broadband_fault",
    priority: "high",
    summary: "Broadband outage reported.",
    status: "open",
    created_at: "2026-09-23T12:00:00Z",
    raw_message: "my broadband is down",
    ...overrides,
  };
}

export function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "66666666-7777-8888-9999-000000000000",
    conversation_id: "conv-1",
    category: "broadband",
    plan_interested: "Full Fibre Broadband 220",
    summary: "Customer wants to sign up for Full Fibre 220.",
    status: "new",
    created_at: "2026-09-25T12:00:00Z",
    raw_message: "I'll take the 220 plan",
    ...overrides,
  };
}
