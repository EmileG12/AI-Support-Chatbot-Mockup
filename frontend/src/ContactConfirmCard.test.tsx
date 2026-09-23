import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactConfirmCard } from "./ContactConfirmCard";

const CONTACT = { name: "Jane Doe", email: "jane@example.com", phone: "07700 900000" };

describe("ContactConfirmCard", () => {
  it("renders the captured contact details", () => {
    render(<ContactConfirmCard contact={CONTACT} onConfirm={vi.fn()} onEdit={vi.fn()} isSubmitting={false} />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("07700 900000")).toBeInTheDocument();
  });

  it("calls onConfirm when 'Yes' is clicked", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ContactConfirmCard contact={CONTACT} onConfirm={onConfirm} onEdit={vi.fn()} isSubmitting={false} />);

    await user.click(screen.getByRole("button", { name: /yes, that's correct/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onEdit when 'Edit details' is clicked", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<ContactConfirmCard contact={CONTACT} onConfirm={vi.fn()} onEdit={onEdit} isSubmitting={false} />);

    await user.click(screen.getByRole("button", { name: /edit details/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while submitting", () => {
    render(<ContactConfirmCard contact={CONTACT} onConfirm={vi.fn()} onEdit={vi.fn()} isSubmitting={true} />);

    expect(screen.getByRole("button", { name: /yes, that's correct/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /edit details/i })).toBeDisabled();
  });
});
