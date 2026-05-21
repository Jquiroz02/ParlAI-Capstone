import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../src/pages/home";

test("renders welcome heading", () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  expect(screen.getByText("Welcome to the Home Page")).toBeInTheDocument();
});

test("renders welcome description", () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  expect(screen.getByText("This is the main landing page of the application.")).toBeInTheDocument();
});