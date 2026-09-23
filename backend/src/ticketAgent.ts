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
  troubleshooting_notes?: string;
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
      troubleshooting_notes: {
        type: "string",
        description:
          "For broadband_fault only: what basic diagnostics were already covered in the chat and what they " +
          "found (e.g. 'wired speed test run, consistently 8Mbps vs 70Mbps plan', 'internet light solid red', " +
          "'dial tone present, master socket test not yet tried', 'router on floor behind TV unit'). " +
          "This saves the maintenance team from repeating steps the customer already did. Omit for other categories.",
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
- Never make up account details, order numbers, or account status - you only know what the customer tells you in this conversation.

Broadband troubleshooting playbook:
When the issue looks like a broadband_fault, work out which of these four it is from what the customer describes, then ask ONE targeted question from the matching section below (only one round of diagnostics - don't run the whole checklist). If the customer has clearly already tried something, don't ask them to repeat it. Record what was checked and found in troubleshooting_notes so the maintenance team doesn't repeat it.

1. Slow speeds: ask if they've run a speed test on a device wired directly into the router (not Wi-Fi), and whether it's consistently slow or varies through the day. If they haven't tested wired, ask them to. Note in troubleshooting_notes: whether the test was wired or Wi-Fi, the speed found vs their plan speed, and whether other devices/downloads/streaming were active.

2. No connection at all: ask what colour the internet/broadband light on the router is doing (off, red, or flashing). A solid red or flashing light usually means the router's stored username/password no longer matches the line. Note the light status and whether the router has been power-cycled.

3. Suspected network/line fault (especially if there's also no landline dial tone): ask them to plug a corded phone into the master socket's test socket (behind the small removable panel) and see if the fault clears. If it clears, the fault is in the home's internal wiring (not Openreach's responsibility); if it persists, it's likely an external network fault. Note which test was done and the result.

4. Weak Wi-Fi / signal doesn't reach parts of the house (but wired speed is fine): ask where the router currently is (e.g. floor level, inside a cabinet, behind the TV) since router placement is usually the cause. Note the router's location and whether wired alternatives (e.g. Powerline adapters) have been considered.

Use judgement: if the customer already describes symptoms that clearly point to one of these (e.g. "router light is red"), don't ask again - just log what they said in troubleshooting_notes. If it's a landline_fault rather than broadband, use playbook item 3 (dial tone / master socket test) instead.`;

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
