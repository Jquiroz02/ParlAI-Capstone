export default function GameCard({ game }) {
  return (
    <div className="game-card">
      <div className="teams">
        <span>{game.teamA}</span>
        <span className="vs">vs</span>
        <span>{game.teamB}</span>
      </div>

      <div className="odds">
        <button>{game.spreadA}</button>
        <button>{game.spreadB}</button>
        <button>{game.totalOver}</button>
        <button>{game.totalUnder}</button>
      </div>

      <span className="badge">AI: {game.prediction}</span>
    </div>
  );
}
