import { describe, it, expect, beforeEach, vi } from "vitest";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function AnthropicMock() {
    return { messages: { create: mockCreate } };
  }),
}));

import { runSalesClassifierTurn, runSalesAgentTurn, draftLeadSummary } from "./salesAgent.js";

const history: MessageParam[] = [{ role: "user", content: "what broadband plans do you sell?" }];

describe("runSalesClassifierTurn", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns the classified category with a single call", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          id: "toolu_classify",
          name: "classify_interest",
          input: { category: "broadband" },
        },
      ],
    });

    const result = await runSalesClassifierTurn(history);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ reply: "", category: "broadband" });
  });

  it("returns a clarifying reply with a null category when the tool isn't called", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: "Are you looking for a home broadband plan or a mobile SIM plan?" },
      ],
    });

    const result = await runSalesClassifierTurn(history);

    expect(result).toEqual({
      reply: "Are you looking for a home broadband plan or a mobile SIM plan?",
      category: null,
    });
  });
});

describe("runSalesAgentTurn", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns the reply with a null lead when no tool is called", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Our fastest plan is Full Fibre 1000 at £36/month." }],
    });

    const result = await runSalesAgentTurn(history, "broadband", false);

    expect(result).toEqual({
      reply: "Our fastest plan is Full Fibre 1000 at £36/month.",
      lead: null,
      pendingContact: null,
    });
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

    const result = await runSalesAgentTurn(history, "broadband", false);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      reply: "",
      lead: null,
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

  it("only offers collect_contact_details before confirmation, and only create_lead after", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "ok" }] });

    await runSalesAgentTurn(history, "mobile", false);
    const toolsBeforeConfirm = mockCreate.mock.calls[0][0].tools.map((t: { name: string }) => t.name);
    expect(toolsBeforeConfirm).toEqual(["collect_contact_details"]);

    mockCreate.mockClear();
    await runSalesAgentTurn(history, "mobile", true);
    const toolsAfterConfirm = mockCreate.mock.calls[0][0].tools.map((t: { name: string }) => t.name);
    expect(toolsAfterConfirm).toEqual(["create_lead"]);
  });

  it("uses the broadband-specific system prompt for the broadband category", async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: "text", text: "ok" }] });

    await runSalesAgentTurn(history, "broadband", false);

    expect(mockCreate.mock.calls[0][0].system).toContain("Full Fibre Broadband 220");
  });

  it("uses the mobile-specific system prompt for the mobile category", async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: "text", text: "ok" }] });

    await runSalesAgentTurn(history, "mobile", false);

    expect(mockCreate.mock.calls[0][0].system).toContain("Unlimited Plan");
  });

  it("makes a follow-up call and returns the parsed lead when create_lead is called", async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "toolu_01",
            name: "create_lead",
            input: {
              category: "broadband",
              plan_interested: "Full Fibre Broadband 220",
              summary: "Customer wants to sign up for Full Fibre 220.",
              raw_message: "I'll take the 220 plan",
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "Great, we've logged your interest and someone will be in touch." }],
      });

    const result = await runSalesAgentTurn(history, "broadband", true);

    expect(mockCreate).toHaveBeenCalledTimes(2);

    const secondCallArgs = mockCreate.mock.calls[1][0];
    const lastMessage = secondCallArgs.messages[secondCallArgs.messages.length - 1];
    expect(lastMessage.role).toBe("user");
    expect(lastMessage.content[0]).toMatchObject({
      type: "tool_result",
      tool_use_id: "toolu_01",
    });

    expect(result).toEqual({
      reply: "Great, we've logged your interest and someone will be in touch.",
      lead: {
        category: "broadband",
        plan_interested: "Full Fibre Broadband 220",
        summary: "Customer wants to sign up for Full Fibre 220.",
        raw_message: "I'll take the 220 plan",
      },
      pendingContact: null,
    });
  });
});

describe("draftLeadSummary", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns null for an empty history without calling the API", async () => {
    const result = await draftLeadSummary([], "broadband");

    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("forces the create_lead tool and returns the parsed lead", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          id: "toolu_draft",
          name: "create_lead",
          input: {
            category: "mobile",
            summary: "Wants unlimited data.",
            raw_message: "I use a lot of data",
          },
        },
      ],
    });

    const result = await draftLeadSummary(history, "mobile");

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].tool_choice).toEqual({ type: "tool", name: "create_lead" });
    expect(mockCreate.mock.calls[0][0].system).toContain("Unlimited Plan");
    expect(result).toEqual({
      category: "mobile",
      summary: "Wants unlimited data.",
      raw_message: "I use a lot of data",
    });
  });

  it("returns null when the tool isn't called", async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: "text", text: "not enough info" }] });

    const result = await draftLeadSummary(history, "broadband");

    expect(result).toBeNull();
  });
});
