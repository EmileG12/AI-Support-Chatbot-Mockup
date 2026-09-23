import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";

vi.mock("./supabaseClient.js", async () => {
  const mock = await import("./test/supabaseMock.js");
  return { supabase: mock.supabase };
});

vi.mock("./duplicates.js", () => ({
  findPossibleDuplicateTicket: vi.fn(),
}));

vi.mock("./ticketAgent.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ticketAgent.js")>();
  return { ...actual, runAgentTurn: vi.fn() };
});

import { supabase, queueResult, resetSupabaseMock } from "./test/supabaseMock.js";
import { findPossibleDuplicateTicket } from "./duplicates.js";
import { runAgentTurn } from "./ticketAgent.js";
import { app } from "./app.js";

const mockRunAgentTurn = vi.mocked(runAgentTurn);
const mockFindDuplicate = vi.mocked(findPossibleDuplicateTicket);

beforeEach(() => {
  resetSupabaseMock();
  mockRunAgentTurn.mockReset();
  mockFindDuplicate.mockReset();
});

describe("GET /api/tickets", () => {
  it("applies status/category/priority filters to the query", async () => {
    queueResult({ data: [{ id: "t1" }], error: null });

    const res = await request(app).get("/api/tickets?status=open&category=billing&priority=low");

    expect(res.status).toBe(200);
    expect(res.body.tickets).toEqual([{ id: "t1" }]);
    const chain = supabase.from.mock.results[0].value as { eq: ReturnType<typeof vi.fn> };
    expect(chain.eq).toHaveBeenCalledWith("status", "open");
    expect(chain.eq).toHaveBeenCalledWith("category", "billing");
    expect(chain.eq).toHaveBeenCalledWith("priority", "low");
  });

  it("ignores 'all' filters", async () => {
    queueResult({ data: [], error: null });

    const res = await request(app).get("/api/tickets?status=all");

    expect(res.status).toBe(200);
    const chain = supabase.from.mock.results[0].value as { eq: ReturnType<typeof vi.fn> };
    expect(chain.eq).not.toHaveBeenCalled();
  });
});

describe("GET /api/tickets/:id", () => {
  it("returns 404 when the ticket isn't found", async () => {
    queueResult({ data: null, error: null });

    const res = await request(app).get("/api/tickets/missing-id");

    expect(res.status).toBe(404);
  });

  it("includes duplicateOf when possible_duplicate_of is set", async () => {
    queueResult({
      data: { id: "t1", conversation_id: "c1", possible_duplicate_of: "t0", summary: "Slow broadband" },
      error: null,
    });
    queueResult({ data: [{ id: "m1", role: "user", content: "hi", created_at: "2026-01-01" }], error: null });
    queueResult({ data: { id: "t0", summary: "Original slow broadband report" }, error: null });

    const res = await request(app).get("/api/tickets/t1");

    expect(res.status).toBe(200);
    expect(res.body.ticket.id).toBe("t1");
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.duplicateOf).toEqual({ id: "t0", summary: "Original slow broadband report" });
  });
});

describe("PATCH /api/tickets/:id", () => {
  it("rejects an invalid category", async () => {
    const res = await request(app).patch("/api/tickets/t1").send({ category: "not_a_real_category" });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects an empty body", async () => {
    const res = await request(app).patch("/api/tickets/t1").send({});

    expect(res.status).toBe(400);
  });

  it("updates the ticket on valid input", async () => {
    queueResult({ data: { id: "t1", priority: "urgent" }, error: null });

    const res = await request(app).patch("/api/tickets/t1").send({ priority: "urgent" });

    expect(res.status).toBe(200);
    expect(res.body.ticket).toEqual({ id: "t1", priority: "urgent" });
  });
});

describe("POST /api/chat", () => {
  it("creates a conversation when none is given, and returns a reply with no ticket", async () => {
    queueResult({ data: { id: "new-conv-id" }, error: null }); // conversations insert
    queueResult({ error: null, data: null }); // user message insert
    queueResult({ data: [{ role: "user", content: "my broadband is slow" }], error: null }); // history select
    queueResult({ data: { contact_confirmed: false }, error: null }); // contact_confirmed lookup
    mockRunAgentTurn.mockResolvedValueOnce({
      reply: "Have you run a wired speed test?",
      ticket: null,
      pendingContact: null,
    });
    queueResult({ error: null, data: null }); // assistant message insert

    const res = await request(app).post("/api/chat").send({ message: "my broadband is slow" });

    expect(res.status).toBe(200);
    expect(res.body.conversationId).toBe("new-conv-id");
    expect(res.body.reply).toBe("Have you run a wired speed test?");
    expect(res.body.ticket).toBeNull();
    expect(res.body.pendingContact).toBeNull();
  });

  it("inserts a ticket with possible_duplicate_of when a duplicate is found", async () => {
    queueResult({ error: null, data: null }); // user message insert
    queueResult({ data: [{ role: "user", content: "broadband down again" }], error: null }); // history select
    queueResult({ data: { contact_confirmed: true }, error: null }); // contact_confirmed lookup
    mockRunAgentTurn.mockResolvedValueOnce({
      reply: "Logged a fault ticket for you.",
      ticket: {
        category: "broadband_fault",
        priority: "high",
        summary: "Broadband outage reported again.",
        raw_message: "broadband down again",
      },
      pendingContact: null,
    });
    queueResult({ error: null, data: null }); // assistant message insert
    queueResult({
      data: { customer_name: "Jane Doe", customer_email: "jane@example.com", customer_phone: "07700900000" },
      error: null,
    }); // conversation contact lookup
    mockFindDuplicate.mockResolvedValueOnce({ id: "dup-1", summary: "Existing outage report", similarity: 0.5 });
    queueResult({
      data: { id: "new-ticket-id", possible_duplicate_of: "dup-1", duplicate_similarity: 0.5 },
      error: null,
    }); // ticket insert
    queueResult({ error: null, data: null }); // conversation status update

    const res = await request(app)
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "broadband down again" });

    expect(res.status).toBe(200);
    expect(res.body.ticket.possible_duplicate_of).toBe("dup-1");
    expect(res.body.ticket.duplicate_similarity).toBe(0.5);
  });

  it("returns pendingContact and a deterministic confirmation message, with a single agent call", async () => {
    queueResult({ error: null, data: null }); // user message insert
    queueResult({ data: [{ role: "user", content: "Jane Doe, jane@example.com, 07700900000" }], error: null }); // history select
    queueResult({ data: { contact_confirmed: false }, error: null }); // contact_confirmed lookup
    mockRunAgentTurn.mockResolvedValueOnce({
      reply: "",
      ticket: null,
      pendingContact: { name: "Jane Doe", email: "jane@example.com", phone: "07700900000" },
    });
    queueResult({ error: null, data: null }); // conversation contact-fields update
    queueResult({ error: null, data: null }); // assistant confirmation message insert

    const res = await request(app)
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "Jane Doe, jane@example.com, 07700900000" });

    expect(res.status).toBe(200);
    expect(mockRunAgentTurn).toHaveBeenCalledTimes(1);
    expect(res.body.pendingContact).toEqual({ name: "Jane Doe", email: "jane@example.com", phone: "07700900000" });
    expect(res.body.ticket).toBeNull();
    expect(res.body.reply).toContain("Jane Doe");
    expect(res.body.reply).toContain("Is that all correct?");
  });

  it("rejects a blank message", async () => {
    const res = await request(app).post("/api/chat").send({ message: "   " });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("POST /api/conversations/:id/confirm-contact", () => {
  it("confirms the pending contact and continues the conversation in one real agent call", async () => {
    queueResult({
      data: {
        customer_name: "Jane Doe",
        customer_email: "jane@example.com",
        customer_phone: "07700900000",
        contact_confirmed: false,
      },
      error: null,
    }); // conversation lookup
    queueResult({ error: null, data: null }); // contact_confirmed = true update
    queueResult({ error: null, data: null }); // synthetic "Yes, that's correct." user message insert
    queueResult({ data: [{ role: "user", content: "my broadband is down" }], error: null }); // history select
    queueResult({ data: { contact_confirmed: true }, error: null }); // contact_confirmed lookup
    mockRunAgentTurn.mockResolvedValueOnce({
      reply: "Sorry to hear that - is the router showing any lights?",
      ticket: null,
      pendingContact: null,
    });
    queueResult({ error: null, data: null }); // assistant reply insert

    const res = await request(app).post("/api/conversations/existing-conv-id/confirm-contact");

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Sorry to hear that - is the router showing any lights?");
    expect(res.body.ticket).toBeNull();

    // The confirmation must be inserted as a "user" turn, not a second assistant
    // message - otherwise the next real Claude call sees two assistant turns in a
    // row with nothing to respond to (this broke in manual testing before the fix).
    const confirmationInsertChain = supabase.from.mock.results[2].value as {
      insert: ReturnType<typeof vi.fn>;
    };
    expect(confirmationInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", content: "Yes, that's correct." })
    );
  });

  it("returns 400 when contact is already confirmed", async () => {
    queueResult({
      data: {
        customer_name: "Jane Doe",
        customer_email: "jane@example.com",
        customer_phone: "07700900000",
        contact_confirmed: true,
      },
      error: null,
    });

    const res = await request(app).post("/api/conversations/existing-conv-id/confirm-contact");

    expect(res.status).toBe(400);
    expect(mockRunAgentTurn).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/conversations/:id/contact", () => {
  it("rejects an invalid email without touching Supabase", async () => {
    const res = await request(app)
      .patch("/api/conversations/existing-conv-id/contact")
      .send({ name: "Jane Doe", email: "not-an-email", phone: "07700900000" });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("overwrites the conversation's contact details and confirms them", async () => {
    queueResult({ error: null, data: null }); // conversation contact overwrite
    queueResult({ error: null, data: null }); // contact_confirmed = true update
    queueResult({ error: null, data: null }); // synthetic correction message insert
    queueResult({ data: [], error: null }); // history select
    queueResult({ data: { contact_confirmed: true }, error: null }); // contact_confirmed lookup
    mockRunAgentTurn.mockResolvedValueOnce({
      reply: "Thanks - what can I help you with today?",
      ticket: null,
      pendingContact: null,
    });
    queueResult({ error: null, data: null }); // assistant reply insert

    const res = await request(app)
      .patch("/api/conversations/existing-conv-id/contact")
      .send({ name: "Jane Doe", email: "jane@new-example.com", phone: "07700900001" });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Thanks - what can I help you with today?");

    const correctionInsertChain = supabase.from.mock.results[2].value as {
      insert: ReturnType<typeof vi.fn>;
    };
    expect(correctionInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", content: expect.stringContaining("jane@new-example.com") })
    );
  });
});
