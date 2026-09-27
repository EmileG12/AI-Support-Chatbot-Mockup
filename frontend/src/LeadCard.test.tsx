import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadCard } from "./LeadCard";
import { makeLead } from "./test/fixtures";

describe("LeadCard", () => {
  it("renders the category label, plan and summary", () => {
    render(<LeadCard lead={makeLead({ category: "broadband", plan_interested: "Full Fibre Broadband 220" })} />);

    expect(screen.getByText("Broadband")).toBeInTheDocument();
    expect(screen.getByText("Full Fibre Broadband 220")).toBeInTheDocument();
    expect(screen.getByText("Customer wants to sign up for Full Fibre 220.")).toBeInTheDocument();
  });

  it("renders the mobile category label", () => {
    render(<LeadCard lead={makeLead({ category: "mobile" })} />);

    expect(screen.getByText("Mobile")).toBeInTheDocument();
  });

  it("omits the plan line when plan_interested isn't set", () => {
    render(<LeadCard lead={makeLead({ plan_interested: null })} />);

    expect(screen.queryByText("Full Fibre Broadband 220")).not.toBeInTheDocument();
  });
});
