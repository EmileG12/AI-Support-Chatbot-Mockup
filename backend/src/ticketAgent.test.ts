import { describe, it, expect, beforeEach, vi } from "vitest";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function AnthropicMock() {
    return { messages: { create: mockCreate } };
  }),
}));

import { runAgentTurn, draftTicketSummary, draftResolutionSummary } from "./ticketAgent.js";

const history: MessageParam[] = [{ role: "user", content: "my broadband is really slow" }];

describe("runAgentTurn", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns the reply with a null ticket when Claude doesn't call create_ticket", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Have you run a wired speed test?" }],
    });

    const result = await runAgentTurn(history, false);

    expect(result).toEqual({
      reply: "Have you run a wired speed test?",
      ticket: null,
      pendingContact: null,
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("returns pendingContact with a single call when collect_contact_details is called", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          id: "toolu_contact",
          name: "collect_contact_details",
          input: {
            name: "Jane Doe",
            email: "jane@example.com",
            phone: "07700 900000",
            address: "1 High Street",
            postcode: "SW1A 1AA",
            is_account_holder: true,
          },
        },
      ],
    });

    const result = await runAgentTurn(history, false);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      reply: "",
      ticket: null,
      pendingContact: {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "07700 900000",
        address: "1 High Street",
        postcode: "SW1A 1AA",
        isAccountHolder: true,
      },
    });
  });

  it("only offers collect_contact_details before confirmation, and only create_ticket after", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "ok" }] });

    await runAgentTurn(history, false);
    const toolsBeforeConfirm = mockCreate.mock.calls[0][0].tools.map((t: { name: string }) => t.name);
    expect(toolsBeforeConfirm).toEqual(["collect_contact_details"]);

    mockCreate.mockClear();
    await runAgentTurn(history, true);
    const toolsAfterConfirm = mockCreate.mock.calls[0][0].tools.map((t: { name: string }) => t.name);
    expect(toolsAfterConfirm).toEqual(["create_ticket"]);
  });

  it("makes a follow-up call and returns the parsed ticket when create_ticket is called", async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "toolu_01",
            name: "create_ticket",
            input: {
              category: "broadband_fault",
              priority: "high",
              summary: "Broadband running at a fraction of the plan speed.",
              raw_message: "my broadband is really slow",
              troubleshooting_notes: "Wired test: 10Mbps vs 100Mbps plan.",
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "Logged a high-priority fault for you." }],
      });

    const result = await runAgentTurn(history, true);

    expect(mockCreate).toHaveBeenCalledTimes(2);

    // The second call must carry the assistant's tool_use turn plus a tool_result
    // for the same tool_use_id - the Messages API requires this to produce text.
    const secondCallArgs = mockCreate.mock.calls[1][0];
    const lastMessage = secondCallArgs.messages[secondCallArgs.messages.length - 1];
    expect(lastMessage.role).toBe("user");
    expect(lastMessage.content[0]).toMatchObject({
      type: "tool_result",
      tool_use_id: "toolu_01",
    });

    expect(result).toEqual({
      reply: "Logged a high-priority fault for you.",
      ticket: {
        category: "broadband_fault",
        priority: "high",
        summary: "Broadband running at a fraction of the plan speed.",
        raw_message: "my broadband is really slow",
        troubleshooting_notes: "Wired test: 10Mbps vs 100Mbps plan.",
      },
      pendingContact: null,
    });
  });
});

describe("draftTicketSummary", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("forces the create_ticket tool and returns the parsed draft with a single call", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          id: "toolu_draft",
          name: "create_ticket",
          input: {
            category: "broadband_fault",
            priority: "high",
            summary: "Broadband down, router light solid red.",
            raw_message: "my broadband is really slow",
          },
        },
      ],
    });

    const result = await draftTicketSummary(history);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].tool_choice).toEqual({ type: "tool", name: "create_ticket" });
    expect(result).toEqual({
      category: "broadband_fault",
      priority: "high",
      summary: "Broadband down, router light solid red.",
      raw_message: "my broadband is really slow",
    });
  });

  it("returns null for an empty history without calling Claude", async () => {
    const result = await draftTicketSummary([]);

    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("draftResolutionSummary", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns the plain-text resolution summary from a single call, no tools", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: "Customer's broadband was down due to a line fault; resolved after a router reset confirmed by the customer.",
        },
      ],
    });

    const result = await draftResolutionSummary(history);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].tools).toBeUndefined();
    expect(result).toBe(
      "Customer's broadband was down due to a line fault; resolved after a router reset confirmed by the customer."
    );
  });

  it("returns null for an empty history without calling Claude", async () => {
    const result = await draftResolutionSummary([]);

    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns null when the response has no text content", async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });

    const result = await draftResolutionSummary(history);

    expect(result).toBeNull();
  });
});
