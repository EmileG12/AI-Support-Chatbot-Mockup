import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./LoginPage";

vi.mock("./api", () => ({
  login: vi.fn(),
}));

import { login } from "./api";

const mockLogin = vi.mocked(login);

function renderLoginPage(initialEntries = ["/login"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Home page</div>} />
        <Route path="/staff" element={<div>Staff page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  it("logs in and navigates to / by default", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith("admin", "secret");
    await waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });

  it("navigates back to the originally requested page on success", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/login", state: { from: { pathname: "/staff" } } }]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/staff" element={<div>Staff page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText("Staff page")).toBeInTheDocument());
  });

  it("shows an error message and stays on the page when login fails", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Invalid username or password"));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid username or password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
