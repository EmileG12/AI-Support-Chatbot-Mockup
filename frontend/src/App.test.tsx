import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { makeTicket } from "./test/fixtures";

vi.mock("./api", () => ({
  sendChatMessage: vi.fn(),
}));

import { sendChatMessage } from "./api";

const mockSendChatMessage = vi.mocked(sendChatMessage);

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockSendChatMessage.mockReset();
});

describe("App", () => {
  it("sends a message and renders the assistant's reply", async () => {
    mockSendChatMessage.mockResolvedValueOnce({
      conversationId: "conv-1",
      reply: "Have you run a wired speed test?",
      ticket: null,
    });
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByPlaceholderText(/describe the issue/i), "my broadband is slow");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Have you run a wired speed test?")).toBeInTheDocument();
    expect(mockSendChatMessage).toHaveBeenCalledWith("my broadband is slow", null);
  });

  it("renders a TicketCard when the response includes a ticket", async () => {
    mockSendChatMessage.mockResolvedValueOnce({
      conversationId: "conv-1",
      reply: "Logged a fault ticket for you.",
      ticket: makeTicket({ category: "broadband_fault", priority: "urgent" }),
    });
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByPlaceholderText(/describe the issue/i), "no internet at all");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Broadband fault")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("shows an error banner when the request fails", async () => {
    mockSendChatMessage.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByPlaceholderText(/describe the issue/i), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(
      await screen.findByText(/something went wrong reaching the support assistant/i)
    ).toBeInTheDocument();
  });

  it("disables the send button and shows a typing indicator while a request is in flight", async () => {
    let resolveRequest!: (value: {
      conversationId: string;
      reply: string;
      ticket: null;
    }) => void;
    mockSendChatMessage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByPlaceholderText(/describe the issue/i), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    expect(screen.getByText("Typing…")).toBeInTheDocument();

    resolveRequest({ conversationId: "conv-1", reply: "Hi!", ticket: null });
    await waitFor(() => expect(screen.queryByText("Typing…")).not.toBeInTheDocument());
  });
});
