import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketCard } from "./TicketCard";
import { makeTicket } from "./test/fixtures";

describe("TicketCard", () => {
  it("renders the category and priority labels", () => {
    render(<TicketCard ticket={makeTicket({ category: "landline_fault", priority: "urgent" })} />);

    expect(screen.getByText("Landline fault")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("renders the VOIP fault category label", () => {
    render(<TicketCard ticket={makeTicket({ category: "voip_fault" })} />);

    expect(screen.getByText("VOIP fault")).toBeInTheDocument();
  });

  it("shows diagnostics only when troubleshooting_notes is set", () => {
    const { rerender } = render(<TicketCard ticket={makeTicket({ troubleshooting_notes: null })} />);
    expect(screen.queryByText(/Diagnostics:/)).not.toBeInTheDocument();

    rerender(
      <TicketCard
        ticket={makeTicket({ troubleshooting_notes: "Wired test: 10Mbps vs 100Mbps plan." })}
      />
    );
    expect(screen.getByText(/Diagnostics:/)).toBeInTheDocument();
    expect(screen.getByText(/Wired test: 10Mbps vs 100Mbps plan\./)).toBeInTheDocument();
  });

  it("shows the resolution note only when resolution_notes is set", () => {
    const { rerender } = render(<TicketCard ticket={makeTicket({ resolution_notes: null })} />);
    expect(screen.queryByText(/Resolution:/)).not.toBeInTheDocument();

    rerender(
      <TicketCard ticket={makeTicket({ resolution_notes: "Resolved after a router reset." })} />
    );
    expect(screen.getByText(/Resolution:/)).toBeInTheDocument();
    expect(screen.getByText(/Resolved after a router reset\./)).toBeInTheDocument();
  });

  it("shows the duplicate note only when possible_duplicate_of is set", () => {
    const { rerender } = render(<TicketCard ticket={makeTicket({ possible_duplicate_of: null })} />);
    expect(screen.queryByText(/already reported/)).not.toBeInTheDocument();

    rerender(<TicketCard ticket={makeTicket({ possible_duplicate_of: "other-ticket-id" })} />);
    expect(screen.getByText(/already reported/)).toBeInTheDocument();
  });
});
