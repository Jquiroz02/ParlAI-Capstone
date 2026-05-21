import { render, screen } from "@testing-library/react";
import GameCard from "../src/components/GameCard";

const mockGame = {
  teamA: "Lakers",
  teamB: "Warriors",
  spreadA: "-3.5",
  spreadB: "+3.5",
  totalOver: "O 220.5",
  totalUnder: "U 220.5",
  prediction: "Lakers 62% win probability"
};

test("renders team names", () => {
  render(<GameCard game={mockGame} />);
  expect(screen.getByText("Lakers")).toBeInTheDocument();
  expect(screen.getByText("Warriors")).toBeInTheDocument();
});

test("renders odds buttons", () => {
  render(<GameCard game={mockGame} />);
  expect(screen.getByText("-3.5")).toBeInTheDocument();
  expect(screen.getByText("+3.5")).toBeInTheDocument();
  expect(screen.getByText("O 220.5")).toBeInTheDocument();
  expect(screen.getByText("U 220.5")).toBeInTheDocument();
});

test("renders AI prediction badge", () => {
  render(<GameCard game={mockGame} />);
  expect(
    screen.getByText("AI: Lakers 62% win probability")
  ).toBeInTheDocument();
});
