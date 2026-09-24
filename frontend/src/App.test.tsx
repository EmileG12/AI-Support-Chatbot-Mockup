import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { makeTicket } from "./test/fixtures";

vi.mock("./api", () => ({
  sendChatMessage: vi.fn(),
  confirmContact: vi.fn(),
  submitContact: vi.fn(),
}));

import { sendChatMessage, confirmContact, submitContact } from "./api";

const mockSendChatMessage = vi.mocked(sendChatMessage);
const mockConfirmContact = vi.mocked(confirmContact);
const mockSubmitContact = vi.mocked(submitContact);

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

async function sendAMessage(user: ReturnType<typeof userEvent.setup>, text = "hello") {
  await user.type(screen.getByPlaceholderText(/describe the issue/i), text);
  await user.click(screen.getByRole("button", { name: /send/i }));
}

beforeEach(() => {
  mockSendChatMessage.mockReset();
  mockConfirmContact.mockReset();
  mockSubmitContact.mockReset();
});

describe("App", () => {
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
    expect(mockSendChatMessage).toHaveBeenCalledWith("my broadband is slow", null);
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
});
