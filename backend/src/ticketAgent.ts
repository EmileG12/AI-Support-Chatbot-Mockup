import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const TICKET_CATEGORIES = [
  "broadband_fault",
  "mobile_fault",
  "landline_fault",
  "billing",
  "provisioning",
  "account",
  "complaint",
  "other",
] as const;

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface CreateTicketArgs {
  category: TicketCategory;
  priority: TicketPriority;
  summary: string;
  customer_name?: string;
  customer_contact?: string;
  raw_message: string;
}

const CREATE_TICKET_TOOL: Tool = {
  name: "create_ticket",
  description:
    "Log a support ticket once the customer's issue is understood well enough to classify and act on. " +
    "Call this exactly once per conversation, as soon as you have enough information - do not keep chatting after logging it.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: TICKET_CATEGORIES as unknown as string[],
        description:
          "broadband_fault: internet down/slow/dropping. mobile_fault: SIM/signal/mobile data issues. " +
          "landline_fault: home phone/landline - no dial tone, calls not connecting, line noise. " +
          "billing: invoices, payments, charges. provisioning: new orders, installs, switching provider. " +
          "account: details/password/plan changes. complaint: dissatisfaction with service received. other: anything else.",
      },
      priority: {
        type: "string",
        enum: TICKET_PRIORITIES as unknown as string[],
        description:
          "urgent: total loss of service or safety/security issue. high: significant disruption (e.g. no broadband for a household). " +
          "medium: partial/intermittent issue or billing query with financial impact. low: general question or minor request.",
      },
      summary: {
        type: "string",
        description: "One or two sentence internal summary of the issue for the support team.",
      },
      customer_name: {
        type: "string",
        description: "Customer's name, if they gave it.",
      },
      customer_contact: {
        type: "string",
        description: "Customer's email or phone, if they gave it.",
      },
      raw_message: {
        type: "string",
        description: "The customer's original description of the issue, in their own words.",
      },
    },
    required: ["category", "priority", "summary", "raw_message"],
  },
};

const SYSTEM_PROMPT = `You are the first-line support assistant for Fenmoor Telecom, a UK broadband and mobile provider.

Your job: understand the customer's issue, then log a support ticket for it using the create_ticket tool.

Rules:
- Be brief, friendly and professional. This is a text chat, not email - keep replies short.
- If the issue is already clear from what the customer wrote, don't interrogate them - ask at most one clarifying question, and only if it would materially change the category or priority (e.g. "is this affecting your whole house or just one device?").
- Do not ask for information you don't need. Name and contact details are a bonus, not a requirement - log the ticket without them if the customer doesn't offer them.
- Once you have enough information, call create_ticket exactly once. Do not describe the ticket in your reply before calling the tool - call the tool, then confirm briefly afterwards.
- After the tool result comes back, send one short confirmation message referencing the ticket so the customer knows what happens next. Do not invent an ETA or promise a specific engineer visit time.
- Never make up account details, order numbers, or account status - you only know what the customer tells you in this conversation.`;

export interface AgentTurnResult {
  reply: string;
  ticket: CreateTicketArgs | null;
}

export async function runAgentTurn(
  history: MessageParam[]
): Promise<AgentTurnResult> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [CREATE_TICKET_TOOL],
    messages: history,
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  let reply = textBlocks.map((b) => b.text).join("\n").trim();

  if (!toolUse) {
    return { reply, ticket: null };
  }

  const ticket = toolUse.input as CreateTicketArgs;

  // The model calls the tool, then (per response.stop_reason === "tool_use")
  // needs a follow-up turn with the tool result to produce its confirmation reply.
  const followUpHistory: MessageParam[] = [
    ...history,
    { role: "assistant", content: response.content },
    {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: `Ticket logged successfully. Category: ${ticket.category}, priority: ${ticket.priority}.`,
        },
      ],
    },
  ];

  const followUp = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    tools: [CREATE_TICKET_TOOL],
    messages: followUpHistory,
  });

  const followUpText = followUp.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  reply = followUpText.map((b) => b.text).join("\n").trim();

  return { reply, ticket };
}
