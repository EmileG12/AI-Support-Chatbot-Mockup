import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeSelectCard } from "./ModeSelectCard";

describe("ModeSelectCard", () => {
  it("calls onSelect with 'support' when Customer Support is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelectCard onSelect={onSelect} isSubmitting={false} />);

    await user.click(screen.getByRole("button", { name: /customer support/i }));

    expect(onSelect).toHaveBeenCalledWith("support");
  });

  it("calls onSelect with 'sales' when Customer Sales is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelectCard onSelect={onSelect} isSubmitting={false} />);

    await user.click(screen.getByRole("button", { name: /customer sales/i }));

    expect(onSelect).toHaveBeenCalledWith("sales");
  });

  it("disables both buttons while submitting", () => {
    render(<ModeSelectCard onSelect={vi.fn()} isSubmitting={true} />);

    expect(screen.getByRole("button", { name: /customer support/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /customer sales/i })).toBeDisabled();
  });
});
