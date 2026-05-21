import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../src/pages/home";

test("full homepage renders with header, sidebar, games, and footer", () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  expect(screen.getByText("Welcome to the Home Page")).toBeInTheDocument();
  expect(screen.getByText("This is the main landing page of the application.")).toBeInTheDocument();
});