import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "../src/components/Header";
import { AuthProvider } from "../src/context/AuthContext";
import { vi } from "vitest";

beforeEach(() => {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ clientPrincipal: null }),
    })
  );
});

function renderWithAuth(ui) {
  return render(<MemoryRouter><AuthProvider>{ui}</AuthProvider></MemoryRouter>);
}

test("renders header title", () => {
  renderWithAuth(<Header />);
  expect(screen.getByText("ParlAI Sports Betting App")).toBeInTheDocument();
});

test("renders all navigation links", () => {
  renderWithAuth(<Header />);
  ["Home", "Games", "Players", "My Bets", "How to Play"].forEach(link => {
    expect(screen.getByText(link)).toBeInTheDocument();
  });
});