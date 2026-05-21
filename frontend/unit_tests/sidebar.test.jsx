import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "../src/components/Sidebar";

test("renders sidebar title", () => {
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );
  expect(screen.getByText("Leagues")).toBeInTheDocument();
});

test("renders all league items", async () => {
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );
  const leagues = ["NBA", "NFL", "MLB", "NHL", "Tennis", "UFC"];
  for (const league of leagues) {
    expect(
      await screen.findAllByText(new RegExp(league, "i"))
    ).not.toHaveLength(0);
  }
});
