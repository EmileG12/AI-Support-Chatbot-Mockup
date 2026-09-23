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
    mockRunAgentTurn.mockResolvedValueOnce({
      reply: "Have you run a wired speed test?",
      ticket: null,
    });
    queueResult({ error: null, data: null }); // assistant message insert

    const res = await request(app).post("/api/chat").send({ message: "my broadband is slow" });

    expect(res.status).toBe(200);
    expect(res.body.conversationId).toBe("new-conv-id");
    expect(res.body.reply).toBe("Have you run a wired speed test?");
    expect(res.body.ticket).toBeNull();
  });

  it("inserts a ticket with possible_duplicate_of when a duplicate is found", async () => {
    queueResult({ error: null, data: null }); // user message insert
    queueResult({ data: [{ role: "user", content: "broadband down again" }], error: null }); // history select
    mockRunAgentTurn.mockResolvedValueOnce({
      reply: "Logged a fault ticket for you.",
      ticket: {
        category: "broadband_fault",
        priority: "high",
        summary: "Broadband outage reported again.",
        raw_message: "broadband down again",
      },
    });
    queueResult({ error: null, data: null }); // assistant message insert
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

  it("rejects a blank message", async () => {
    const res = await request(app).post("/api/chat").send({ message: "   " });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
