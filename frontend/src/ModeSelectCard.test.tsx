import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeSelectCard } from "./ModeSelectCard";

describe("ModeSelectCard", () => {
  it("calls onSelect with 'support' when Customer Support is chosen and confirmed", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelectCard onSelect={onSelect} isSubmitting={false} />);

    await user.click(screen.getByRole("radio", { name: /customer support/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(onSelect).toHaveBeenCalledWith("support");
  });

  it("calls onSelect with 'sales' when Customer Sales is chosen and confirmed", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelectCard onSelect={onSelect} isSubmitting={false} />);

    await user.click(screen.getByRole("radio", { name: /customer sales/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(onSelect).toHaveBeenCalledWith("sales");
  });

  it("disables the continue button until an option is chosen", async () => {
    const user = userEvent.setup();
    render(<ModeSelectCard onSelect={vi.fn()} isSubmitting={false} />);

    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /customer support/i }));

    expect(screen.getByRole("button", { name: /continue/i })).not.toBeDisabled();
  });

  it("disables both radio options and the continue button while submitting", () => {
    render(<ModeSelectCard onSelect={vi.fn()} isSubmitting={true} />);

    expect(screen.getByRole("radio", { name: /customer support/i })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /customer sales/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });
});
