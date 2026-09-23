import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "./ContactForm";

const INITIAL = { name: "Jane Doe", email: "jane@example.com", phone: "07700 900000" };

describe("ContactForm", () => {
  it("pre-fills the fields from the initial contact", () => {
    render(
      <ContactForm initial={INITIAL} onSubmit={vi.fn()} onCancel={vi.fn()} isSubmitting={false} error={null} />
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Jane Doe");
    expect(screen.getByLabelText("Email")).toHaveValue("jane@example.com");
    expect(screen.getByLabelText("Phone")).toHaveValue("07700 900000");
  });

  it("submits the edited, trimmed values", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <ContactForm initial={INITIAL} onSubmit={onSubmit} onCancel={vi.fn()} isSubmitting={false} error={null} />
    );

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "  jane.new@example.com  ");
    await user.click(screen.getByRole("button", { name: /save details/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane.new@example.com",
      phone: "07700 900000",
    });
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ContactForm initial={INITIAL} onSubmit={vi.fn()} onCancel={onCancel} isSubmitting={false} error={null} />
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows a validation error when given one", () => {
    render(
      <ContactForm
        initial={INITIAL}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSubmitting={false}
        error="a valid email is required"
      />
    );

    expect(screen.getByText("a valid email is required")).toBeInTheDocument();
  });
});
