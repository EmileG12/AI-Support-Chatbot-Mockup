import { describe, it, expect, beforeEach, vi } from "vitest";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function AnthropicMock() {
    return { messages: { create: mockCreate } };
  }),
}));

import { runAgentTurn } from "./ticketAgent.js";

const history: MessageParam[] = [{ role: "user", content: "my broadband is really slow" }];

describe("runAgentTurn", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns the reply with a null ticket when Claude doesn't call create_ticket", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Have you run a wired speed test?" }],
    });

    const result = await runAgentTurn(history);

    expect(result).toEqual({ reply: "Have you run a wired speed test?", ticket: null });
    expect(mockCreate).toHaveBeenCalledTimes(1);
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

    const result = await runAgentTurn(history);

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
    });
  });
});
