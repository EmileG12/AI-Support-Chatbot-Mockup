import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
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
  return { ...actual, runAgentTurn: vi.fn(), draftTicketSummary: vi.fn(), draftResolutionSummary: vi.fn() };
});

vi.mock("./salesAgent.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./salesAgent.js")>();
  return { ...actual, runSalesClassifierTurn: vi.fn(), runSalesAgentTurn: vi.fn(), draftLeadSummary: vi.fn() };
});

import { supabase, queueResult, resetSupabaseMock } from "./test/supabaseMock.js";
import { findPossibleDuplicateTicket } from "./duplicates.js";
import { runAgentTurn, draftTicketSummary, draftResolutionSummary } from "./ticketAgent.js";
import { runSalesClassifierTurn, runSalesAgentTurn, draftLeadSummary } from "./salesAgent.js";
import { app } from "./app.js";

const mockRunAgentTurn = vi.mocked(runAgentTurn);
const mockDraftTicketSummary = vi.mocked(draftTicketSummary);
const mockDraftResolutionSummary = vi.mocked(draftResolutionSummary);
const mockFindDuplicate = vi.mocked(findPossibleDuplicateTicket);
const mockRunSalesClassifierTurn = vi.mocked(runSalesClassifierTurn);
const mockRunSalesAgentTurn = vi.mocked(runSalesAgentTurn);
const mockDraftLeadSummary = vi.mocked(draftLeadSummary);

const agent = request.agent(app);

beforeAll(async () => {
  await agent.post("/api/login").send({ username: "test-user", password: "test-password" });
});

beforeEach(() => {
  resetSupabaseMock();
  mockRunAgentTurn.mockReset();
  mockDraftTicketSummary.mockReset();
  mockDraftResolutionSummary.mockReset();
  mockFindDuplicate.mockReset();
  mockRunSalesClassifierTurn.mockReset();
  mockRunSalesAgentTurn.mockReset();
  mockDraftLeadSummary.mockReset();
});

describe("auth", () => {
  it("rejects an incorrect password", async () => {
    const res = await request(app).post("/api/login").send({ username: "test-user", password: "wrong" });

    expect(res.status).toBe(401);
  });

  it("rejects protected routes without a session cookie", async () => {
    const res = await request(app).get("/api/tickets");

    expect(res.status).toBe(401);
  });

  it("allows /api/health without a session cookie", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
  });

  it("logs in, accesses a protected route, then logs out and is rejected again", async () => {
    const freshAgent = request.agent(app);

    const loginRes = await freshAgent
      .post("/api/login")
      .send({ username: "test-user", password: "test-password" });
    expect(loginRes.status).toBe(200);

    queueResult({ data: [], error: null });
    const ticketsRes = await freshAgent.get("/api/tickets");
    expect(ticketsRes.status).toBe(200);

    const logoutRes = await freshAgent.post("/api/logout");
    expect(logoutRes.status).toBe(200);

    const afterLogoutRes = await freshAgent.get("/api/tickets");
    expect(afterLogoutRes.status).toBe(401);
  });
});

describe("GET /api/tickets", () => {
  it("applies status/category/priority filters to the query", async () => {
    queueResult({ data: [{ id: "t1" }], error: null });

    const res = await agent.get("/api/tickets?status=open&category=billing&priority=low");

    expect(res.status).toBe(200);
    expect(res.body.tickets).toEqual([{ id: "t1" }]);
    const chain = supabase.from.mock.results[0].value as { eq: ReturnType<typeof vi.fn> };
    expect(chain.eq).toHaveBeenCalledWith("status", "open");
    expect(chain.eq).toHaveBeenCalledWith("category", "billing");
    expect(chain.eq).toHaveBeenCalledWith("priority", "low");
  });

  it("ignores 'all' filters", async () => {
    queueResult({ data: [], error: null });

    const res = await agent.get("/api/tickets?status=all");

    expect(res.status).toBe(200);
    const chain = supabase.from.mock.results[0].value as { eq: ReturnType<typeof vi.fn> };
    expect(chain.eq).not.toHaveBeenCalled();
  });
});

describe("GET /api/tickets/:id", () => {
  it("returns 404 when the ticket isn't found", async () => {
    queueResult({ data: null, error: null });

    const res = await agent.get("/api/tickets/missing-id");

    expect(res.status).toBe(404);
  });

  it("includes duplicateOf when possible_duplicate_of is set", async () => {
    queueResult({
      data: { id: "t1", conversation_id: "c1", possible_duplicate_of: "t0", summary: "Slow broadband" },
      error: null,
    });
    queueResult({ data: [{ id: "m1", role: "user", content: "hi", created_at: "2026-01-01" }], error: null });
    queueResult({ data: { id: "t0", summary: "Original slow broadband report" }, error: null });

    const res = await agent.get("/api/tickets/t1");

    expect(res.status).toBe(200);
    expect(res.body.ticket.id).toBe("t1");
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.duplicateOf).toEqual({ id: "t0", summary: "Original slow broadband report" });
  });
});

describe("PATCH /api/tickets/:id", () => {
  it("rejects an invalid category", async () => {
    const res = await agent.patch("/api/tickets/t1").send({ category: "not_a_real_category" });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects an empty body", async () => {
    const res = await agent.patch("/api/tickets/t1").send({});

    expect(res.status).toBe(400);
  });

  it("updates the ticket on valid input", async () => {
    queueResult({ data: { id: "t1", priority: "urgent" }, error: null });

    const res = await agent.patch("/api/tickets/t1").send({ priority: "urgent" });

    expect(res.status).toBe(200);
    expect(res.body.ticket).toEqual({ id: "t1", priority: "urgent" });
  });

  it("rejects a non-boolean duplicate_dismissed", async () => {
    const res = await agent.patch("/api/tickets/t1").send({ duplicate_dismissed: "yes" });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("accepts duplicate_dismissed", async () => {
    queueResult({ data: { id: "t1", duplicate_dismissed: true }, error: null });

    const res = await agent.patch("/api/tickets/t1").send({ duplicate_dismissed: true });

    expect(res.status).toBe(200);
    expect(res.body.ticket).toEqual({ id: "t1", duplicate_dismissed: true });
  });
});

describe("GET /api/leads", () => {
  it("applies status/category filters to the query", async () => {
    queueResult({ data: [{ id: "l1" }], error: null });

    const res = await agent.get("/api/leads?status=new&category=broadband");

    expect(res.status).toBe(200);
    expect(res.body.leads).toEqual([{ id: "l1" }]);
    const chain = supabase.from.mock.results[0].value as { eq: ReturnType<typeof vi.fn> };
    expect(chain.eq).toHaveBeenCalledWith("status", "new");
    expect(chain.eq).toHaveBeenCalledWith("category", "broadband");
  });

  it("ignores 'all' filters", async () => {
    queueResult({ data: [], error: null });

    const res = await agent.get("/api/leads?status=all");

    expect(res.status).toBe(200);
    const chain = supabase.from.mock.results[0].value as { eq: ReturnType<typeof vi.fn> };
    expect(chain.eq).not.toHaveBeenCalled();
  });
});

describe("GET /api/leads/:id", () => {
  it("returns 404 when the lead isn't found", async () => {
    queueResult({ data: null, error: null });

    const res = await agent.get("/api/leads/missing-id");

    expect(res.status).toBe(404);
  });

  it("returns the lead and its transcript", async () => {
    queueResult({ data: { id: "l1", conversation_id: "c1", summary: "Wants Full Fibre 220" }, error: null });
    queueResult({ data: [{ id: "m1", role: "user", content: "I'll take the 220 plan" }], error: null });

    const res = await agent.get("/api/leads/l1");

    expect(res.status).toBe(200);
    expect(res.body.lead.id).toBe("l1");
    expect(res.body.messages).toHaveLength(1);
  });
});

describe("PATCH /api/leads/:id", () => {
  it("rejects an invalid category", async () => {
    const res = await agent.patch("/api/leads/l1").send({ category: "not_a_real_category" });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects an invalid status", async () => {
    const res = await agent.patch("/api/leads/l1").send({ status: "not_a_real_status" });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects an empty body", async () => {
    const res = await agent.patch("/api/leads/l1").send({});

    expect(res.status).toBe(400);
  });

  it("updates the lead on valid input", async () => {
    queueResult({ data: { id: "l1", status: "contacted" }, error: null });

    const res = await agent.patch("/api/leads/l1").send({ status: "contacted" });

    expect(res.status).toBe(200);
    expect(res.body.lead).toEqual({ id: "l1", status: "contacted" });
  });
});

describe("POST /api/conversations", () => {
  it("rejects an invalid mode", async () => {
    const res = await agent.post("/api/conversations").send({ mode: "not_a_real_mode" });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("creates a conversation with the given mode", async () => {
    queueResult({ data: { id: "new-conv-id" }, error: null }); // conversations insert

    const res = await agent.post("/api/conversations").send({ mode: "sales" });

    expect(res.status).toBe(200);
    expect(res.body.conversationId).toBe("new-conv-id");
    const chain = supabase.from.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    expect(chain.insert).toHaveBeenCalledWith({ mode: "sales" });
  });
});

describe("POST /api/chat", () => {
  it("creates a conversation when none is given, and returns a reply with no ticket", async () => {
    queueResult({ data: { id: "new-conv-id" }, error: null }); // conversations insert
    queueResult({ error: null, data: null }); // user message insert
    queueResult({ data: { contact_confirmed: false }, error: null }); // conversation state lookup
    queueResult({ data: [{ role: "user", content: "my broadband is slow" }], error: null }); // history select
    mockRunAgentTurn.mockResolvedValueOnce({
      reply: "Have you run a wired speed test?",
      ticket: null,
      pendingContact: null,
    });
    queueResult({ error: null, data: null }); // assistant message insert

    const res = await agent.post("/api/chat").send({ message: "my broadband is slow" });

    expect(res.status).toBe(200);
    expect(res.body.conversationId).toBe("new-conv-id");
    expect(res.body.reply).toBe("Have you run a wired speed test?");
    expect(res.body.ticket).toBeNull();
    expect(res.body.pendingContact).toBeNull();
  });

  it("inserts a ticket with possible_duplicate_of when a duplicate is found", async () => {
    queueResult({ error: null, data: null }); // user message insert
    queueResult({ data: { contact_confirmed: true }, error: null }); // conversation state lookup
    queueResult({ data: { value: false }, error: null }); // working-hours settings lookup
    queueResult({ data: [{ role: "user", content: "broadband down again" }], error: null }); // history select
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
      data: {
        customer_name: "Jane Doe",
        customer_email: "jane@example.com",
        customer_phone: "07700900000",
        customer_address: "1 High Street",
        customer_postcode: "SW1A 1AA",
        customer_is_account_holder: true,
      },
      error: null,
    }); // conversation contact lookup
    mockFindDuplicate.mockResolvedValueOnce({ id: "dup-1", summary: "Existing outage report", similarity: 0.5 });
    queueResult({
      data: { id: "new-ticket-id", possible_duplicate_of: "dup-1", duplicate_similarity: 0.5 },
      error: null,
    }); // ticket insert
    queueResult({ error: null, data: null }); // conversation status update

    const res = await agent
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "broadband down again" });

    expect(res.status).toBe(200);
    expect(res.body.ticket.possible_duplicate_of).toBe("dup-1");
    expect(res.body.ticket.duplicate_similarity).toBe(0.5);
  });

  it("returns pendingContact and a deterministic confirmation message, with a single agent call", async () => {
    queueResult({ error: null, data: null }); // user message insert
    queueResult({ data: { contact_confirmed: false }, error: null }); // conversation state lookup
    queueResult({ data: [{ role: "user", content: "Jane Doe, jane@example.com, 07700900000" }], error: null }); // history select
    mockRunAgentTurn.mockResolvedValueOnce({
      reply: "",
      ticket: null,
      pendingContact: {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "07700900000",
        address: "1 High Street",
        postcode: "SW1A 1AA",
        isAccountHolder: true,
      },
    });
    queueResult({ error: null, data: null }); // conversation contact-fields update
    queueResult({ error: null, data: null }); // assistant confirmation message insert

    const res = await agent
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "Jane Doe, jane@example.com, 07700900000" });

    expect(res.status).toBe(200);
    expect(mockRunAgentTurn).toHaveBeenCalledTimes(1);
    expect(res.body.pendingContact).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "07700900000",
      address: "1 High Street",
      postcode: "SW1A 1AA",
      isAccountHolder: true,
    });
    expect(res.body.ticket).toBeNull();
    expect(res.body.reply).toContain("Jane Doe");
    expect(res.body.reply).toContain("Is that all correct?");
  });

  it("rejects a blank message", async () => {
    const res = await agent.post("/api/chat").send({ message: "   " });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("queues the customer instead of replying when working hours are on and contact is confirmed", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0); // waitMinutes = 1
    queueResult({ error: null, data: null }); // user message insert
    queueResult({ data: { contact_confirmed: true, handoff_status: "none" }, error: null }); // conversation state lookup
    queueResult({ data: { value: true }, error: null }); // working-hours settings lookup (on)
    queueResult({ error: null, data: null }); // conversation update to handoff_status: "queued"
    queueResult({ error: null, data: null }); // assistant queued-message insert

    const res = await agent
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "any more details while I wait" });

    randomSpy.mockRestore();

    expect(res.status).toBe(200);
    expect(mockRunAgentTurn).not.toHaveBeenCalled();
    expect(res.body.reply).toMatch(/queue/i);
    expect(res.body.reply).toContain("estimated wait: 1 minute)");
    expect(res.body.ticket).toBeNull();
    expect(res.body.pendingContact).toBeNull();
    expect(res.body.handoffStatus).toBe("queued");
    expect(res.body.estimatedWaitMinutes).toBe(1);
  });

  it("gives no AI reply while queued - the customer's message just waits", async () => {
    queueResult({ error: null, data: null }); // user message insert
    queueResult({ data: { contact_confirmed: true, handoff_status: "queued" }, error: null }); // conversation state lookup

    const res = await agent
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "still waiting" });

    expect(res.status).toBe(200);
    expect(mockRunAgentTurn).not.toHaveBeenCalled();
    expect(res.body.reply).toBe("");
    expect(res.body.ticket).toBeNull();
  });

  it("gives no AI reply once a staff member is live, but re-drafts the ticket summary", async () => {
    queueResult({ error: null, data: null }); // user message insert
    queueResult({ data: { contact_confirmed: true, handoff_status: "live" }, error: null }); // conversation state lookup
    queueResult({ data: [{ role: "user", content: "hello?" }], error: null }); // loadHistory (for re-draft)
    mockDraftTicketSummary.mockResolvedValueOnce({
      category: "billing",
      priority: "low",
      summary: "Query about a recent invoice.",
      raw_message: "hello?",
    });
    queueResult({ error: null, data: null }); // conversation draft_ticket update

    const res = await agent
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "hello?" });

    expect(res.status).toBe(200);
    expect(mockRunAgentTurn).not.toHaveBeenCalled();
    expect(res.body.reply).toBe("");
    expect(mockDraftTicketSummary).toHaveBeenCalledTimes(1);
  });

  it("queues a sales conversation instead of replying when working hours are on and contact is confirmed", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0); // waitMinutes = 1
    queueResult({ error: null, data: null }); // user message insert
    queueResult({
      data: { mode: "sales", sales_category: "mobile", contact_confirmed: true, handoff_status: "none" },
      error: null,
    }); // conversation state lookup
    queueResult({ data: [{ role: "user", content: "sign me up" }], error: null }); // history select
    queueResult({ data: { value: true }, error: null }); // working-hours settings lookup (on)
    queueResult({ error: null, data: null }); // conversation update to handoff_status: "queued"
    queueResult({ error: null, data: null }); // assistant queued-message insert

    const res = await agent
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "any more details while I wait" });

    randomSpy.mockRestore();

    expect(res.status).toBe(200);
    expect(mockRunSalesAgentTurn).not.toHaveBeenCalled();
    expect(res.body.reply).toMatch(/queue/i);
    expect(res.body.lead).toBeNull();
    expect(res.body.handoffStatus).toBe("queued");
    expect(res.body.estimatedWaitMinutes).toBe(1);
  });

  it("gives no AI reply once a staff member is live on a sales conversation, but re-drafts the lead summary", async () => {
    queueResult({ error: null, data: null }); // user message insert
    queueResult({
      data: { mode: "sales", sales_category: "broadband", contact_confirmed: true, handoff_status: "live" },
      error: null,
    }); // conversation state lookup
    queueResult({ data: [{ role: "user", content: "hello?" }], error: null }); // loadHistory (for re-draft)
    mockDraftLeadSummary.mockResolvedValueOnce({
      category: "broadband",
      summary: "Wants a faster broadband plan.",
      raw_message: "hello?",
    });
    queueResult({ error: null, data: null }); // conversation draft_lead update

    const res = await agent
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "hello?" });

    expect(res.status).toBe(200);
    expect(mockRunSalesAgentTurn).not.toHaveBeenCalled();
    expect(res.body.reply).toBe("");
    expect(mockDraftLeadSummary).toHaveBeenCalledTimes(1);
    expect(mockDraftLeadSummary).toHaveBeenCalledWith(expect.anything(), "broadband");
  });

  it("classifies then answers in the same round-trip for a sales conversation's first message", async () => {
    queueResult({ error: null, data: null }); // user message insert
    queueResult({
      data: { mode: "sales", sales_category: null, contact_confirmed: false, handoff_status: "none" },
      error: null,
    }); // conversation state lookup
    queueResult({ data: [{ role: "user", content: "what broadband plans do you sell?" }], error: null }); // history select
    mockRunSalesClassifierTurn.mockResolvedValueOnce({ reply: "", category: "broadband" });
    queueResult({ error: null, data: null }); // sales_category update
    mockRunSalesAgentTurn.mockResolvedValueOnce({
      reply: "Our fastest plan is Full Fibre 1000 at £36/month.",
      lead: null,
      pendingContact: null,
    });
    queueResult({ error: null, data: null }); // assistant reply insert

    const res = await agent
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "what broadband plans do you sell?" });

    expect(res.status).toBe(200);
    expect(mockRunAgentTurn).not.toHaveBeenCalled();
    expect(mockRunSalesClassifierTurn).toHaveBeenCalledTimes(1);
    expect(mockRunSalesAgentTurn).toHaveBeenCalledWith(expect.anything(), "broadband", false);
    expect(res.body.reply).toBe("Our fastest plan is Full Fibre 1000 at £36/month.");
    expect(res.body.ticket).toBeNull();
    expect(res.body.lead).toBeNull();
  });

  it("asks a clarifying question without a category when the sales classifier is unsure", async () => {
    queueResult({ error: null, data: null }); // user message insert
    queueResult({
      data: { mode: "sales", sales_category: null, contact_confirmed: false, handoff_status: "none" },
      error: null,
    }); // conversation state lookup
    queueResult({ data: [{ role: "user", content: "what deals do you have?" }], error: null }); // history select
    mockRunSalesClassifierTurn.mockResolvedValueOnce({
      reply: "Are you looking for a home broadband plan or a mobile SIM plan?",
      category: null,
    });
    queueResult({ error: null, data: null }); // assistant clarifying-question insert

    const res = await agent
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "what deals do you have?" });

    expect(res.status).toBe(200);
    expect(mockRunSalesAgentTurn).not.toHaveBeenCalled();
    expect(res.body.reply).toBe("Are you looking for a home broadband plan or a mobile SIM plan?");
  });

  it("creates a lead once a sales conversation's contact is confirmed", async () => {
    queueResult({ error: null, data: null }); // user message insert
    queueResult({
      data: { mode: "sales", sales_category: "mobile", contact_confirmed: true, handoff_status: "none" },
      error: null,
    }); // conversation state lookup
    queueResult({ data: [{ role: "user", content: "sign me up for unlimited" }], error: null }); // history select
    queueResult({ data: { value: false }, error: null }); // working-hours settings lookup
    mockRunSalesAgentTurn.mockResolvedValueOnce({
      reply: "Great, we've logged your interest and someone will be in touch.",
      lead: {
        category: "mobile",
        plan_interested: "Unlimited Plan",
        summary: "Customer wants the Unlimited mobile plan.",
        raw_message: "sign me up for unlimited",
      },
      pendingContact: null,
    });
    queueResult({
      data: {
        customer_name: "Jane Doe",
        customer_email: "jane@example.com",
        customer_phone: "07700900000",
        customer_address: "1 High Street",
        customer_postcode: "SW1A 1AA",
        customer_is_account_holder: true,
      },
      error: null,
    }); // conversation contact lookup
    queueResult({ data: { id: "new-lead-id", category: "mobile" }, error: null }); // lead insert
    queueResult({ error: null, data: null }); // conversation status update
    queueResult({ error: null, data: null }); // assistant reply insert (includes the contact-date promise)

    const res = await agent
      .post("/api/chat")
      .send({ conversationId: "existing-conv-id", message: "sign me up for unlimited" });

    expect(res.status).toBe(200);
    expect(res.body.lead.id).toBe("new-lead-id");
    expect(res.body.ticket).toBeNull();
    expect(res.body.reply).toContain("A member of our sales team will be in touch by");
  });
});

describe("POST /api/conversations/:id/confirm-contact", () => {
  it("confirms the pending contact and continues the conversation in one real agent call", async () => {
    queueResult({
      data: {
        customer_name: "Jane Doe",
        customer_email: "jane@example.com",
        customer_phone: "07700900000",
        customer_address: "1 High Street",
        customer_postcode: "SW1A 1AA",
        customer_is_account_holder: true,
        contact_confirmed: false,
      },
      error: null,
    }); // conversation lookup
    queueResult({ error: null, data: null }); // contact_confirmed = true update
    queueResult({ error: null, data: null }); // synthetic "Yes, that's correct." user message insert
    queueResult({ data: { contact_confirmed: true }, error: null }); // conversation state lookup
    queueResult({ data: { value: false }, error: null }); // working-hours settings lookup
    queueResult({ data: [{ role: "user", content: "my broadband is down" }], error: null }); // history select
    mockRunAgentTurn.mockResolvedValueOnce({
      reply: "Sorry to hear that - is the router showing any lights?",
      ticket: null,
      pendingContact: null,
    });
    queueResult({ error: null, data: null }); // assistant reply insert

    const res = await agent.post("/api/conversations/existing-conv-id/confirm-contact");

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

    const res = await agent.post("/api/conversations/existing-conv-id/confirm-contact");

    expect(res.status).toBe(400);
    expect(mockRunAgentTurn).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/conversations/:id/contact", () => {
  it("rejects an invalid email without touching Supabase", async () => {
    const res = await agent
      .patch("/api/conversations/existing-conv-id/contact")
      .send({ name: "Jane Doe", email: "not-an-email", phone: "07700900000" });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("overwrites the conversation's contact details and confirms them", async () => {
    queueResult({ error: null, data: null }); // conversation contact overwrite
    queueResult({ error: null, data: null }); // contact_confirmed = true update
    queueResult({ error: null, data: null }); // synthetic correction message insert
    queueResult({ data: { contact_confirmed: true }, error: null }); // conversation state lookup
    queueResult({ data: { value: false }, error: null }); // working-hours settings lookup
    queueResult({ data: [], error: null }); // history select
    mockRunAgentTurn.mockResolvedValueOnce({
      reply: "Thanks - what can I help you with today?",
      ticket: null,
      pendingContact: null,
    });
    queueResult({ error: null, data: null }); // assistant reply insert

    const res = await agent
      .patch("/api/conversations/existing-conv-id/contact")
      .send({
        name: "Jane Doe",
        email: "jane@new-example.com",
        phone: "07700900001",
        address: "1 High Street",
        postcode: "SW1A 1AA",
        isAccountHolder: true,
      });

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

describe("GET /api/settings", () => {
  it("returns the working-hours flag", async () => {
    queueResult({ data: { value: true }, error: null });

    const res = await agent.get("/api/settings");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ workingHours: true });
  });
});

describe("PATCH /api/settings", () => {
  it("rejects a non-boolean workingHours", async () => {
    const res = await agent.patch("/api/settings").send({ workingHours: "yes" });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("updates the flag", async () => {
    queueResult({ data: null, error: null });

    const res = await agent.patch("/api/settings").send({ workingHours: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ workingHours: true });
  });
});

describe("GET /api/conversations/queue", () => {
  it("lists queued conversations, defaulting a missing mode to 'support'", async () => {
    queueResult({
      data: [
        { id: "c1", mode: "support", customer_name: "Jane Doe", queued_at: "2026-01-01T00:00:00Z", estimated_wait_minutes: 3 },
        { id: "c2", mode: "sales", customer_name: "John Smith", queued_at: "2026-01-01T00:01:00Z", estimated_wait_minutes: 5 },
        { id: "c3", mode: null, customer_name: "No Mode", queued_at: "2026-01-01T00:02:00Z", estimated_wait_minutes: 1 },
      ],
      error: null,
    });

    const res = await agent.get("/api/conversations/queue");

    expect(res.status).toBe(200);
    expect(res.body.queue).toEqual([
      { id: "c1", mode: "support", customer_name: "Jane Doe", queued_at: "2026-01-01T00:00:00Z", estimated_wait_minutes: 3 },
      { id: "c2", mode: "sales", customer_name: "John Smith", queued_at: "2026-01-01T00:01:00Z", estimated_wait_minutes: 5 },
      { id: "c3", mode: "support", customer_name: "No Mode", queued_at: "2026-01-01T00:02:00Z", estimated_wait_minutes: 1 },
    ]);
  });
});

describe("GET /api/conversations/:id/messages", () => {
  it("returns 404 when the conversation isn't found", async () => {
    queueResult({ data: null, error: { message: "not found" } });

    const res = await agent.get("/api/conversations/missing/messages");

    expect(res.status).toBe(404);
  });

  it("returns the handoff status, wait estimate, draft ticket, and messages", async () => {
    queueResult({
      data: {
        handoff_status: "live",
        estimated_wait_minutes: null,
        draft_ticket: { category: "broadband_fault", priority: "high", summary: "Outage.", raw_message: "down" },
      },
      error: null,
    });
    queueResult({ data: [{ id: "m1", role: "staff", content: "Hi, I'm here to help" }], error: null });

    const res = await agent.get("/api/conversations/c1/messages");

    expect(res.status).toBe(200);
    expect(res.body.handoffStatus).toBe("live");
    expect(res.body.estimatedWaitMinutes).toBeNull();
    expect(res.body.draftTicket).toEqual({
      category: "broadband_fault",
      priority: "high",
      summary: "Outage.",
      raw_message: "down",
    });
    expect(res.body.messages).toEqual([{ id: "m1", role: "staff", content: "Hi, I'm here to help" }]);
  });

  it("returns a null draftTicket when none has been drafted yet", async () => {
    queueResult({ data: { handoff_status: "queued", estimated_wait_minutes: 3 }, error: null });
    queueResult({ data: [], error: null });

    const res = await agent.get("/api/conversations/c1/messages");

    expect(res.status).toBe(200);
    expect(res.body.draftTicket).toBeNull();
    expect(res.body.draftLead).toBeNull();
  });

  it("returns the draft lead for a live sales conversation", async () => {
    queueResult({
      data: {
        handoff_status: "live",
        estimated_wait_minutes: null,
        draft_lead: { category: "mobile", summary: "Wants unlimited data.", raw_message: "unlimited please" },
      },
      error: null,
    });
    queueResult({ data: [{ id: "m1", role: "staff", content: "Hi, how can I help?" }], error: null });

    const res = await agent.get("/api/conversations/c2/messages");

    expect(res.status).toBe(200);
    expect(res.body.draftTicket).toBeNull();
    expect(res.body.draftLead).toEqual({
      category: "mobile",
      summary: "Wants unlimited data.",
      raw_message: "unlimited please",
    });
  });
});

describe("POST /api/conversations/:id/staff-join", () => {
  it("400s when the conversation isn't queued", async () => {
    queueResult({ data: { handoff_status: "none" }, error: null });

    const res = await agent.post("/api/conversations/c1/staff-join");

    expect(res.status).toBe(400);
  });

  it("marks the conversation live and returns an AI-drafted summary", async () => {
    queueResult({ data: { handoff_status: "queued" }, error: null }); // handoff_status check
    queueResult({ error: null, data: null }); // update to live
    queueResult({ data: [{ role: "user", content: "my broadband is down" }], error: null }); // loadHistory
    mockDraftTicketSummary.mockResolvedValueOnce({
      category: "broadband_fault",
      priority: "high",
      summary: "Broadband outage reported.",
      raw_message: "my broadband is down",
    });
    queueResult({ error: null, data: null }); // conversation draft_ticket update
    queueResult({ data: { handoff_status: "live", estimated_wait_minutes: 3 }, error: null }); // conv lookup for messages
    queueResult({ data: [{ id: "m1", role: "user", content: "my broadband is down" }], error: null }); // messages

    const res = await agent.post("/api/conversations/c1/staff-join");

    expect(res.status).toBe(200);
    expect(res.body.draftTicket).toEqual({
      category: "broadband_fault",
      priority: "high",
      summary: "Broadband outage reported.",
      raw_message: "my broadband is down",
    });
    expect(res.body.messages).toEqual([{ id: "m1", role: "user", content: "my broadband is down" }]);
    expect(res.body.mode).toBe("support");
    expect(res.body.draftLead).toBeNull();
  });

  it("marks a sales conversation live and returns an AI-drafted lead instead of a ticket", async () => {
    queueResult({ data: { handoff_status: "queued", mode: "sales", sales_category: "broadband" }, error: null }); // handoff_status/mode check
    queueResult({ error: null, data: null }); // update to live
    queueResult({ data: [{ role: "user", content: "I want faster broadband" }], error: null }); // loadHistory
    mockDraftLeadSummary.mockResolvedValueOnce({
      category: "broadband",
      summary: "Wants a faster broadband plan.",
      raw_message: "I want faster broadband",
    });
    queueResult({ error: null, data: null }); // conversation draft_lead update
    queueResult({ data: { handoff_status: "live", estimated_wait_minutes: 3 }, error: null }); // conv lookup for messages
    queueResult({ data: [{ id: "m1", role: "user", content: "I want faster broadband" }], error: null }); // messages

    const res = await agent.post("/api/conversations/c2/staff-join");

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("sales");
    expect(res.body.draftTicket).toBeNull();
    expect(res.body.draftLead).toEqual({
      category: "broadband",
      summary: "Wants a faster broadband plan.",
      raw_message: "I want faster broadband",
    });
  });
});

describe("POST /api/conversations/:id/staff-message", () => {
  it("rejects a blank message", async () => {
    const res = await agent.post("/api/conversations/c1/staff-message").send({ message: "  " });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("400s when the conversation isn't live", async () => {
    queueResult({ data: { contact_confirmed: true, handoff_status: "queued" }, error: null }); // state lookup

    const res = await agent.post("/api/conversations/c1/staff-message").send({ message: "Hi there" });

    expect(res.status).toBe(400);
  });

  it("inserts the staff message when live", async () => {
    queueResult({ data: { contact_confirmed: true, handoff_status: "live" }, error: null }); // state lookup
    queueResult({ data: { id: "m2", role: "staff", content: "Hi there" }, error: null }); // insert + select

    const res = await agent.post("/api/conversations/c1/staff-message").send({ message: "Hi there" });

    expect(res.status).toBe(200);
    expect(res.body.message).toEqual({ id: "m2", role: "staff", content: "Hi there" });
  });
});

describe("POST /api/conversations/:id/staff-create-ticket", () => {
  it("rejects an invalid category", async () => {
    const res = await agent.post("/api/conversations/c1/staff-create-ticket").send({
      category: "not_a_real_category",
      priority: "high",
      summary: "x",
      raw_message: "y",
    });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("creates the ticket via the shared ticket-creation path", async () => {
    queueResult({
      data: {
        customer_name: "Jane Doe",
        customer_email: "jane@example.com",
        customer_phone: "07700900000",
        customer_address: "1 High Street",
        customer_postcode: "SW1A 1AA",
        customer_is_account_holder: true,
      },
      error: null,
    }); // conversation contact lookup
    mockFindDuplicate.mockResolvedValueOnce(null);
    queueResult({ data: { id: "new-ticket-id", category: "broadband_fault" }, error: null }); // ticket insert
    queueResult({ error: null, data: null }); // conversation status update

    const res = await agent.post("/api/conversations/c1/staff-create-ticket").send({
      category: "broadband_fault",
      priority: "high",
      summary: "Outage",
      raw_message: "no internet",
    });

    expect(res.status).toBe(200);
    expect(res.body.ticket.id).toBe("new-ticket-id");
  });

  it("rejects an invalid status", async () => {
    const res = await agent.post("/api/conversations/c1/staff-create-ticket").send({
      category: "broadband_fault",
      priority: "high",
      summary: "Outage",
      raw_message: "no internet",
      status: "not_a_real_status",
    });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects status: resolved without resolution_notes", async () => {
    const res = await agent.post("/api/conversations/c1/staff-create-ticket").send({
      category: "broadband_fault",
      priority: "high",
      summary: "Outage",
      raw_message: "no internet",
      status: "resolved",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/resolution_notes/i);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("creates a resolved ticket with resolution notes", async () => {
    queueResult({
      data: {
        customer_name: "Jane Doe",
        customer_email: "jane@example.com",
        customer_phone: "07700900000",
        customer_address: "1 High Street",
        customer_postcode: "SW1A 1AA",
        customer_is_account_holder: true,
      },
      error: null,
    }); // conversation contact lookup
    mockFindDuplicate.mockResolvedValueOnce(null);
    queueResult({ data: { id: "resolved-ticket-id", status: "resolved" }, error: null }); // ticket insert
    queueResult({ error: null, data: null }); // conversation status update

    const res = await agent.post("/api/conversations/c1/staff-create-ticket").send({
      category: "broadband_fault",
      priority: "high",
      summary: "Outage",
      raw_message: "no internet",
      status: "resolved",
      resolution_notes: "Resolved after a router reset confirmed by the customer.",
    });

    expect(res.status).toBe(200);
    expect(res.body.ticket.id).toBe("resolved-ticket-id");
    const insertChain = supabase.from.mock.results[1].value as { insert: ReturnType<typeof vi.fn> };
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "resolved",
        resolution_notes: "Resolved after a router reset confirmed by the customer.",
      })
    );
  });
});

describe("POST /api/conversations/:id/staff-create-lead", () => {
  it("rejects an invalid category", async () => {
    const res = await agent.post("/api/conversations/c2/staff-create-lead").send({
      category: "not_a_real_category",
      summary: "x",
      raw_message: "y",
    });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects a missing summary", async () => {
    const res = await agent.post("/api/conversations/c2/staff-create-lead").send({
      category: "broadband",
      raw_message: "y",
    });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects a missing raw_message", async () => {
    const res = await agent.post("/api/conversations/c2/staff-create-lead").send({
      category: "broadband",
      summary: "x",
    });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("creates the lead via the shared lead-creation path", async () => {
    queueResult({
      data: {
        customer_name: "Jane Doe",
        customer_email: "jane@example.com",
        customer_phone: "07700900000",
        customer_address: "1 High Street",
        customer_postcode: "SW1A 1AA",
        customer_is_account_holder: true,
      },
      error: null,
    }); // conversation contact lookup
    queueResult({ data: { id: "new-lead-id", category: "broadband" }, error: null }); // lead insert
    queueResult({ error: null, data: null }); // conversation status update

    const res = await agent.post("/api/conversations/c2/staff-create-lead").send({
      category: "broadband",
      plan_interested: "Full Fibre Broadband 220",
      summary: "Wants faster broadband",
      raw_message: "I want faster broadband",
    });

    expect(res.status).toBe(200);
    expect(res.body.lead.id).toBe("new-lead-id");
  });
});

describe("POST /api/conversations/:id/draft-resolution", () => {
  it("returns the AI-drafted resolution summary", async () => {
    queueResult({ data: [{ role: "user", content: "my broadband is down" }], error: null }); // loadHistory
    mockDraftResolutionSummary.mockResolvedValueOnce(
      "Resolved after a router reset confirmed by the customer."
    );

    const res = await agent.post("/api/conversations/c1/draft-resolution");

    expect(res.status).toBe(200);
    expect(res.body.resolution).toBe("Resolved after a router reset confirmed by the customer.");
    expect(mockDraftResolutionSummary).toHaveBeenCalledTimes(1);
  });
});
