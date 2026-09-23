import type { Ticket } from "../types";

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
