import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("../api", async (orig) => ({ ...(await orig<typeof import("../api")>()), api: { login } }));

import { AuthProvider } from "../auth/AuthContext";
import LoginPage from "./LoginPage";

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Dashboard home</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => login.mockReset());

  it("signs in and navigates to the dashboard", async () => {
    login.mockResolvedValue({
      token: "t", expiresAt: new Date(Date.now() + 3600e3).toISOString(),
      user: { userID: "1", username: "student", email: "s@x.edu", firstname: "Alex", lastname: "Rivera", initials: "AR", role: "student" },
    });
    renderLogin();
    await userEvent.type(screen.getByLabelText(/Username or email/), "student");
    await userEvent.type(screen.getByLabelText(/^Password/), "Student123!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Dashboard home")).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith("student", "Student123!");
  });

  // The wrong-password path is covered end to end in e2e/core-workflow.spec.ts (against the real API).

  it("keeps the submit button disabled until both fields are filled", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });
});
