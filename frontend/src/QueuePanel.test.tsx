import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueuePanel } from "./QueuePanel";

vi.mock("./api", () => ({
  getQueue: vi.fn(),
  staffJoin: vi.fn(),
}));

import { getQueue, staffJoin } from "./api";

const mockGetQueue = vi.mocked(getQueue);
const mockStaffJoin = vi.mocked(staffJoin);

beforeEach(() => {
  mockGetQueue.mockReset();
  mockStaffJoin.mockReset();
});

describe("QueuePanel", () => {
  it("shows an empty state when nobody is waiting", async () => {
    mockGetQueue.mockResolvedValueOnce([]);
    render(<QueuePanel onJoined={vi.fn()} />);

    expect(await screen.findByText("No customers waiting.")).toBeInTheDocument();
  });

  it("lists queued conversations with their estimated wait", async () => {
    mockGetQueue.mockResolvedValueOnce([
      { id: "c1", mode: "support", customer_name: "Jane Doe", queued_at: "2026-01-01T00:00:00Z", estimated_wait_minutes: 3 },
    ]);
    render(<QueuePanel onJoined={vi.fn()} />);

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Est. wait: 3 min")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("shows a 'Sales' badge for a sales-mode entry", async () => {
    mockGetQueue.mockResolvedValueOnce([
      { id: "c2", mode: "sales", customer_name: "John Smith", queued_at: "2026-01-01T00:00:00Z", estimated_wait_minutes: 5 },
    ]);
    render(<QueuePanel onJoined={vi.fn()} />);

    expect(await screen.findByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });

  it("calls staffJoin and onJoined when 'Join' is clicked", async () => {
    mockGetQueue.mockResolvedValueOnce([
      { id: "c1", mode: "support", customer_name: "Jane Doe", queued_at: "2026-01-01T00:00:00Z", estimated_wait_minutes: 3 },
    ]);
    mockStaffJoin.mockResolvedValueOnce({
      mode: "support",
      draftTicket: {
        category: "broadband_fault",
        priority: "high",
        summary: "Broadband outage.",
        raw_message: "my broadband is down",
      },
      draftLead: null,
      messages: [{ id: "m1", role: "user", content: "my broadband is down" }],
    });
    const onJoined = vi.fn();
    const user = userEvent.setup();
    render(<QueuePanel onJoined={onJoined} />);

    await user.click(await screen.findByRole("button", { name: /join/i }));

    expect(mockStaffJoin).toHaveBeenCalledWith("c1");
    expect(onJoined).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ draftTicket: expect.objectContaining({ category: "broadband_fault" }) })
    );
  });
});
