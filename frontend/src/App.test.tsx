import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { makeTicket, makeLead } from "./test/fixtures";

vi.mock("./api", () => ({
  sendChatMessage: vi.fn(),
  createConversation: vi.fn(),
  confirmContact: vi.fn(),
  submitContact: vi.fn(),
  getConversationMessages: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getQueue: vi.fn(),
  staffJoin: vi.fn(),
  sendStaffMessage: vi.fn(),
  createTicketFromDraft: vi.fn(),
}));

import {
  sendChatMessage,
  createConversation,
  confirmContact,
  submitContact,
  getConversationMessages,
  getSettings,
  updateSettings,
  getQueue,
  staffJoin,
} from "./api";

const mockSendChatMessage = vi.mocked(sendChatMessage);
const mockCreateConversation = vi.mocked(createConversation);
const mockConfirmContact = vi.mocked(confirmContact);
const mockSubmitContact = vi.mocked(submitContact);
const mockGetConversationMessages = vi.mocked(getConversationMessages);
const mockGetSettings = vi.mocked(getSettings);
const mockUpdateSettings = vi.mocked(updateSettings);
const mockGetQueue = vi.mocked(getQueue);
const mockStaffJoin = vi.mocked(staffJoin);

const CONTACT = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "07700 900000",
  address: "1 High Street",
  postcode: "SW1A 1AA",
  isAccountHolder: true,
};

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
}

async function selectSupportMode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("radio", { name: /customer support/i }));
  await user.click(screen.getByRole("button", { name: /continue/i }));
  await screen.findByPlaceholderText(/describe the issue/i);
}

async function selectSalesMode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("radio", { name: /customer sales/i }));
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

async function sendAMessage(user: ReturnType<typeof userEvent.setup>, text = "hello") {
  if (screen.queryByRole("radio", { name: /customer support/i })) {
    await selectSupportMode(user);
  }
  await user.type(screen.getByPlaceholderText(/describe the issue/i), text);
  await user.click(screen.getByRole("button", { name: /send/i }));
}

beforeEach(() => {
  mockSendChatMessage.mockReset();
  mockCreateConversation.mockReset().mockResolvedValue({ conversationId: "conv-1" });
  mockConfirmContact.mockReset();
  mockSubmitContact.mockReset();
  mockGetConversationMessages.mockReset();
  mockGetSettings.mockReset().mockResolvedValue({ workingHours: false });
  mockUpdateSettings.mockReset().mockImplementation((s) => Promise.resolve(s));
  mockGetQueue.mockReset().mockResolvedValue([]);
  mockStaffJoin.mockReset();
});

describe("App", () => {
  it("shows links to both staff views", async () => {
    renderApp();

    expect(await screen.findByRole("link", { name: /customer support staff view/i })).toHaveAttribute(
      "href",
      "/staff"
    );
    expect(screen.getByRole("link", { name: /customer sales staff view/i })).toHaveAttribute(
      "href",
      "/staff/sales"
    );
  });

  it("shows the mode select card before any conversation starts, with no chat input yet", async () => {
    renderApp();

    expect(await screen.findByRole("radio", { name: /customer support/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /customer sales/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/describe the issue/i)).not.toBeInTheDocument();
  });

  it("picking Customer Sales creates a sales conversation and shows the sales welcome message", async () => {
    mockCreateConversation.mockResolvedValueOnce({ conversationId: "sales-conv-1" });
    const user = userEvent.setup();
    renderApp();

    await selectSalesMode(user);

    expect(mockCreateConversation).toHaveBeenCalledWith("sales");
    expect(await screen.findByText(/are you looking for broadband or mobile/i)).toBeInTheDocument();
  });

  it("renders a LeadCard when a sales conversation's response includes a lead", async () => {
    mockCreateConversation.mockResolvedValueOnce({ conversationId: "sales-conv-1" });
    mockSendChatMessage.mockResolvedValueOnce({
      conversationId: "sales-conv-1",
      reply: "Great, we've logged your interest and someone will be in touch.",
      ticket: null,
      lead: makeLead(),
      pendingContact: null,
    });
    const user = userEvent.setup();
    renderApp();

    await selectSalesMode(user);
    await user.type(await screen.findByPlaceholderText(/describe the issue/i), "sign me up for the 220 plan");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Customer wants to sign up for Full Fibre 220.")).toBeInTheDocument();
  });

  it("sends a message and renders the assistant's reply", async () => {
    mockSendChatMessage.mockResolvedValueOnce({
      conversationId: "conv-1",
      reply: "Have you run a wired speed test?",
      ticket: null,
      pendingContact: null,
    });
    const user = userEvent.setup();
    renderApp();

    await sendAMessage(user, "my broadband is slow");

    expect(await screen.findByText("Have you run a wired speed test?")).toBeInTheDocument();
    expect(mockSendChatMessage).toHaveBeenCalledWith("my broadband is slow", "conv-1");
  });

  it("renders a TicketCard when the response includes a ticket", async () => {
    mockSendChatMessage.mockResolvedValueOnce({
      conversationId: "conv-1",
      reply: "Logged a fault ticket for you.",
      ticket: makeTicket({ category: "broadband_fault", priority: "urgent" }),
      pendingContact: null,
    });
    const user = userEvent.setup();
    renderApp();

    await sendAMessage(user, "no internet at all");

    expect(await screen.findByText("Broadband fault")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("shows an error banner when the request fails", async () => {
    mockSendChatMessage.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    renderApp();

    await sendAMessage(user);

    expect(
      await screen.findByText(/something went wrong reaching the support assistant/i)
    ).toBeInTheDocument();
  });

  it("disables the send button and shows a typing indicator while a request is in flight", async () => {
    let resolveRequest!: (value: {
      conversationId: string;
      reply: string;
      ticket: null;
      pendingContact: null;
    }) => void;
    mockSendChatMessage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const user = userEvent.setup();
    renderApp();

    await sendAMessage(user);

    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    expect(screen.getByText("Typing…")).toBeInTheDocument();

    resolveRequest({ conversationId: "conv-1", reply: "Hi!", ticket: null, pendingContact: null });
    await waitFor(() => expect(screen.queryByText("Typing…")).not.toBeInTheDocument());
  });

  it("shows the contact confirmation card instead of the input row once contact details are captured", async () => {
    mockSendChatMessage.mockResolvedValueOnce({
      conversationId: "conv-1",
      reply: "",
      ticket: null,
      pendingContact: CONTACT,
    });
    const user = userEvent.setup();
    renderApp();

    await sendAMessage(user, "Jane Doe, jane@example.com, 07700 900000");

    expect(await screen.findByText("jane@example.com")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/describe the issue/i)).not.toBeInTheDocument();
  });

  it("confirming contact details appends the handoff message and the agent's next reply", async () => {
    mockSendChatMessage.mockResolvedValueOnce({
      conversationId: "conv-1",
      reply: "",
      ticket: null,
      pendingContact: CONTACT,
    });
    mockConfirmContact.mockResolvedValueOnce({
      reply: "No worries - what can I help you with today?",
      ticket: null,
    });
    const user = userEvent.setup();
    renderApp();

    await sendAMessage(user, "Jane Doe, jane@example.com, 07700 900000");
    await screen.findByText("jane@example.com");

    await user.click(screen.getByRole("button", { name: /yes, that's correct/i }));

    expect(mockConfirmContact).toHaveBeenCalledWith("conv-1");
    expect(await screen.findByText("Yes, that's correct.")).toBeInTheDocument();
    expect(await screen.findByText("No worries - what can I help you with today?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe the issue/i)).toBeInTheDocument();
  });

  it("editing contact details shows the form and submits corrected values", async () => {
    mockSendChatMessage.mockResolvedValueOnce({
      conversationId: "conv-1",
      reply: "",
      ticket: null,
      pendingContact: CONTACT,
    });
    mockSubmitContact.mockResolvedValueOnce({
      reply: "What can I help you with today?",
      ticket: null,
    });
    const user = userEvent.setup();
    renderApp();

    await sendAMessage(user, "Jane Doe, jane@example.com, 07700 900000");
    await screen.findByText("jane@example.com");

    await user.click(screen.getByRole("button", { name: /edit details/i }));
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "jane.doe@example.com");
    await user.click(screen.getByRole("button", { name: /save details/i }));

    expect(mockSubmitContact).toHaveBeenCalledWith("conv-1", {
      name: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "07700 900000",
      address: "1 High Street",
      postcode: "SW1A 1AA",
      isAccountHolder: true,
    });
    expect(await screen.findByText("Updated my contact details.")).toBeInTheDocument();
    expect(await screen.findByText("What can I help you with today?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe the issue/i)).toBeInTheDocument();
  });

  it("shows a queued banner with the estimated wait once working hours puts the customer in the queue", async () => {
    mockSendChatMessage.mockResolvedValueOnce({
      conversationId: "conv-1",
      reply: "",
      ticket: null,
      pendingContact: CONTACT,
    });
    mockConfirmContact.mockResolvedValueOnce({
      reply: "Thanks! You're in the queue (estimated wait: 3 minutes).",
      ticket: null,
      handoffStatus: "queued",
      estimatedWaitMinutes: 3,
    });
    mockGetConversationMessages.mockResolvedValue({
      handoffStatus: "queued",
      estimatedWaitMinutes: 3,
      draftTicket: null,
      draftLead: null,
      messages: [{ id: "m1", role: "assistant", content: "Thanks! You're in the queue (estimated wait: 3 minutes)." }],
    });
    const user = userEvent.setup();
    renderApp();

    await sendAMessage(user, "Jane Doe, jane@example.com, 07700 900000");
    await screen.findByText("jane@example.com");
    await user.click(screen.getByRole("button", { name: /yes, that's correct/i }));

    const banner = await screen.findByText(/waiting for a team member/i);
    expect(banner.textContent).toMatch(/estimated wait: 3 minutes/i);
    // The chat input stays available while queued, so the customer can keep typing.
    expect(screen.getByPlaceholderText(/describe the issue/i)).toBeInTheDocument();
  });

  it("polls for and renders a staff member's reply once live", async () => {
    mockSendChatMessage.mockResolvedValueOnce({
      conversationId: "conv-1",
      reply: "",
      ticket: null,
      pendingContact: null,
      handoffStatus: "live",
      estimatedWaitMinutes: null,
    });
    mockGetConversationMessages.mockResolvedValue({
      handoffStatus: "live",
      estimatedWaitMinutes: null,
      draftTicket: null,
      draftLead: null,
      messages: [
        { id: "m1", role: "user", content: "still there?" },
        { id: "m2", role: "staff", content: "Yes, I'm here now!" },
      ],
    });
    const user = userEvent.setup();
    renderApp();

    await sendAMessage(user, "still there?");

    expect(await screen.findByText(/you're now chatting with a team member/i)).toBeInTheDocument();
    expect(await screen.findByText("Yes, I'm here now!")).toBeInTheDocument();
    expect(screen.getByText("Support agent")).toBeInTheDocument();
  });

  it("labels a live staff reply 'Sales agent' during a sales handoff", async () => {
    mockSendChatMessage.mockResolvedValueOnce({
      conversationId: "conv-1",
      reply: "",
      ticket: null,
      lead: null,
      pendingContact: null,
      handoffStatus: "live",
      estimatedWaitMinutes: null,
    });
    mockGetConversationMessages.mockResolvedValue({
      handoffStatus: "live",
      estimatedWaitMinutes: null,
      draftTicket: null,
      draftLead: null,
      messages: [
        { id: "m1", role: "user", content: "I want a mobile plan" },
        { id: "m2", role: "staff", content: "Hi, I can help with that!" },
      ],
    });
    const user = userEvent.setup();
    renderApp();

    await selectSalesMode(user);
    await user.type(await screen.findByPlaceholderText(/describe the issue/i), "I want a mobile plan");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Hi, I can help with that!")).toBeInTheDocument();
    expect(screen.getByText("Sales agent")).toBeInTheDocument();
  });

  it("toggling 'Working hours' calls updateSettings", async () => {
    mockGetSettings.mockResolvedValueOnce({ workingHours: false });
    const user = userEvent.setup();
    renderApp();

    const toggle = await screen.findByLabelText("Working hours");
    expect(toggle).not.toBeChecked();

    await user.click(toggle);

    expect(mockUpdateSettings).toHaveBeenCalledWith({ workingHours: true });
    expect(toggle).toBeChecked();
  });

  it("joining a queued conversation from the staff panel opens the live staff chat window, next to the customer's own chat", async () => {
    mockGetQueue.mockResolvedValueOnce([
      { id: "c1", mode: "support", customer_name: "Jane Doe", queued_at: "2026-01-01T00:00:00Z", estimated_wait_minutes: 3 },
    ]);
    mockStaffJoin.mockResolvedValueOnce({
      mode: "support",
      draftTicket: {
        category: "broadband_fault",
        priority: "high",
        summary: "Broadband outage reported.",
        raw_message: "my broadband is down",
      },
      draftLead: null,
      messages: [{ id: "m1", role: "user", content: "my broadband is down" }],
    });
    const user = userEvent.setup();
    renderApp();
    await selectSupportMode(user);

    await user.click(await screen.findByRole("button", { name: /join/i }));

    expect(mockStaffJoin).toHaveBeenCalledWith("c1");
    expect(await screen.findByText("Live chat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Broadband outage reported.")).toBeInTheDocument();
    // Still on the same page as the customer's own chat input - side by side, not a separate view.
    expect(screen.getByPlaceholderText(/describe the issue/i)).toBeInTheDocument();
  });

  it("joining a queued SALES conversation opens the live staff LEAD chat window instead", async () => {
    mockGetQueue.mockResolvedValueOnce([
      { id: "c2", mode: "sales", customer_name: "John Smith", queued_at: "2026-01-01T00:00:00Z", estimated_wait_minutes: 5 },
    ]);
    mockStaffJoin.mockResolvedValueOnce({
      mode: "sales",
      draftTicket: null,
      draftLead: {
        category: "broadband",
        summary: "Wants a faster broadband plan.",
        raw_message: "I want faster broadband",
      },
      messages: [{ id: "m1", role: "user", content: "I want faster broadband" }],
    });
    const user = userEvent.setup();
    renderApp();
    await selectSupportMode(user);

    await user.click(await screen.findByRole("button", { name: /join/i }));

    expect(mockStaffJoin).toHaveBeenCalledWith("c2");
    expect(await screen.findByText("Live chat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Wants a faster broadband plan.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create lead/i })).toBeInTheDocument();
  });
});
