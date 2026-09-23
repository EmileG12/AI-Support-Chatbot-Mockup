import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ContactDetails } from "./contactValidation.js";

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

export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface CreateTicketArgs {
  category: TicketCategory;
  priority: TicketPriority;
  summary: string;
  raw_message: string;
  troubleshooting_notes?: string;
}

const COLLECT_CONTACT_TOOL: Tool = {
  name: "collect_contact_details",
  description:
    "Record the customer's contact details once you have their name, email address and phone number. " +
    "Call this exactly once, as soon as you have all three - do not call it again after it succeeds, " +
    "even if the customer keeps chatting.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "The customer's full name." },
      email: { type: "string", description: "The customer's email address." },
      phone: { type: "string", description: "The customer's phone number." },
    },
    required: ["name", "email", "phone"],
  },
};

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
      raw_message: {
        type: "string",
        description: "The customer's original description of the issue, in their own words.",
      },
      troubleshooting_notes: {
        type: "string",
        description:
          "For broadband_fault, mobile_fault and landline_fault only: what basic diagnostics were already " +
          "covered in the chat and what they found (e.g. 'wired speed test run, consistently 8Mbps vs 70Mbps " +
          "plan', 'internet light solid red', 'dial tone present, master socket test not yet tried', 'mesh node " +
          "in bedroom shows poor backhaul', 'signal drops everywhere, airplane mode toggle did not help', " +
          "'VOIP audio choppy but broadband otherwise fine'). This saves the maintenance team from repeating " +
          "steps the customer already did. Omit for other categories.",
      },
    },
    required: ["category", "priority", "summary", "raw_message"],
  },
};

// Which tool is offered is gated on contact-confirmation status, not just prompt
// instructions: the history we send Claude only stores plain message text, not the
// structured tool_use block from a prior turn, so Claude can't reliably tell from
// re-reading history alone that it already called collect_contact_details. Not
// offering the tool once contact is confirmed makes it impossible to call again,
// rather than relying on the model inferring "already done" from a text transcript.
function toolsFor(contactConfirmed: boolean): Tool[] {
  return contactConfirmed ? [CREATE_TICKET_TOOL] : [COLLECT_CONTACT_TOOL];
}

const SYSTEM_PROMPT = `You are the first-line support assistant for Fenmoor Telecom, a UK broadband and mobile provider.

Your job, in order: first collect the customer's contact details, then understand their issue and log a support ticket for it using the create_ticket tool.

Contact details first:
- Before discussing any issue in depth, get the customer's full name, email address and phone number - the support team needs these to follow up after the chat ends.
- If the customer describes their issue before giving contact details, briefly acknowledge it (don't ignore them) but still ask for name, email and phone before going further into troubleshooting.
- Once you have all three, call collect_contact_details exactly once. A confirmation prompt is then shown to the customer outside of this chat, so you won't see it in the transcript - the next message you see from them will be exactly "Yes, that's correct." (confirming) or a message starting "Actually, here are my correct details - ..." (correcting). Either message means contact details are now fully settled and confirmed - the collect_contact_details tool is deliberately not offered to you anymore at this point, and you should NOT restate or re-ask to confirm the details yourself in your reply (do not write anything like "just to confirm, that's..."). Simply treat contact as done and respond to whatever the customer needs next - continue their issue if they already mentioned one, otherwise ask what you can help with.
- Do not call create_ticket before contact details have been confirmed.

Rules:
- Be brief, friendly and professional. This is a text chat, not email - keep replies short.
- If the issue is already clear from what the customer wrote, don't interrogate them - ask at most one clarifying question, and only if it would materially change the category or priority (e.g. "is this affecting your whole house or just one device?").
- Once you have enough information about the issue, call create_ticket exactly once. Do not describe the ticket in your reply before calling the tool - call the tool, then confirm briefly afterwards.
- After the tool result comes back, send one short confirmation message referencing the ticket so the customer knows what happens next. Do not invent an ETA or promise a specific engineer visit time.
- Never make up account details, order numbers, or account status - you only know what the customer tells you in this conversation.

Broadband troubleshooting playbook:
When the issue looks like a broadband_fault, work out which of these four it is from what the customer describes, then ask ONE targeted question from the matching section below (only one round of diagnostics - don't run the whole checklist). If the customer has clearly already tried something, don't ask them to repeat it. Record what was checked and found in troubleshooting_notes so the maintenance team doesn't repeat it.

1. Slow speeds: ask if they've run a speed test on a device wired directly into the router (not Wi-Fi), and whether it's consistently slow or varies through the day. If they haven't tested wired, ask them to. Note in troubleshooting_notes: whether the test was wired or Wi-Fi, the speed found vs their plan speed, and whether other devices/downloads/streaming were active.

2. No connection at all: ask what colour the internet/broadband light on the router is doing (off, red, or flashing). A solid red or flashing light usually means the router's stored username/password no longer matches the line. Note the light status and whether the router has been power-cycled.

3. Suspected network/line fault (especially if there's also no landline dial tone): ask them to plug a corded phone into the master socket's test socket (behind the small removable panel) and see if the fault clears. If it clears, the fault is in the home's internal wiring (not Openreach's responsibility); if it persists, it's likely an external network fault. Note which test was done and the result.

4. Weak Wi-Fi / signal doesn't reach parts of the house (but wired speed is fine): ask where the router currently is (e.g. floor level, inside a cabinet, behind the TV) since router placement is usually the cause. Note the router's location and whether wired alternatives (e.g. Powerline adapters) have been considered.
   - If the customer mentions a mesh Wi-Fi system (multiple pods/satellites, e.g. Google Nest, TP-Link Deco, eero): ask instead whether the affected area is far from every mesh node or genuinely between them, and whether the mesh app shows all nodes online with a good backhaul connection to the main router. A node showing as offline or "poor" backhaul is a much more specific fault than general placement. Note node count, which node(s) are affected, and backhaul status (wired or wireless) if known.

5. VOIP / digital landline (a landline_fault where the customer has a digital voice line rather than a traditional phone line - increasingly common since Openreach is retiring analogue lines): ask whether the call problem (no dial tone, choppy/robotic audio, dropped calls) happens only when the broadband is also having issues, or happens even when the internet otherwise seems fine. If it correlates with broadband problems, treat it as the underlying broadband_fault instead. If broadband is fine but calls are still bad, ask if other devices are heavily using the connection at the same time (uploads/video calls can cause jitter on VOIP). Note the correlation with broadband status and any competing traffic.

Use judgement: if the customer already describes symptoms that clearly point to one of these (e.g. "router light is red"), don't ask again - just log what they said in troubleshooting_notes. If it's a landline_fault and not clearly VOIP, use playbook item 3 (dial tone / master socket test) instead.

Mobile troubleshooting playbook:
When the issue looks like a mobile_fault, identify which of these it is and ask ONE targeted question, same rules as above (skip if already answered, log the result in troubleshooting_notes):

1. No signal or signal keeps dropping: ask whether this happens in one specific location or everywhere they go, and whether toggling Airplane Mode on and off for a few seconds changes anything. Signal that's bad everywhere and doesn't recover suggests a device/SIM/account issue rather than local coverage; signal that's only bad in one place is more likely a coverage/mast issue for that area.

2. Signal is fine but no mobile data (web/apps don't load): ask if this is happening on Wi-Fi-off, mobile data only, and whether it's every app or specific ones. Ask if they've recently travelled abroad (data roaming may need enabling). Note whether data works with Wi-Fi disabled, and any recent travel.

3. Can't make or receive calls/texts but data works fine: ask whether it's outgoing calls, incoming calls, or both, and whether Wi-Fi Calling is available/enabled on the phone (useful if indoor signal is weak). Note which direction fails and Wi-Fi Calling status.

4. No service at all / "SIM not detected": ask them to power the phone off and back on, and if possible try the SIM in another unlocked phone to check if the fault follows the SIM or stays with the handset. Note the result of that swap test if done.`;

export interface AgentTurnResult {
  reply: string;
  ticket: CreateTicketArgs | null;
  pendingContact: ContactDetails | null;
}

export async function runAgentTurn(
  history: MessageParam[],
  contactConfirmed: boolean
): Promise<AgentTurnResult> {
  const tools = toolsFor(contactConfirmed);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools,
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
    return { reply, ticket: null, pendingContact: null };
  }

  if (toolUse.name === "collect_contact_details") {
    // No follow-up call here: the confirmation shown to the customer is a fixed
    // template built in code from these fields, not something Claude needs to phrase.
    return { reply: "", ticket: null, pendingContact: toolUse.input as ContactDetails };
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
    tools,
    messages: followUpHistory,
  });

  const followUpText = followUp.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  reply = followUpText.map((b) => b.text).join("\n").trim();

  return { reply, ticket, pendingContact: null };
}
