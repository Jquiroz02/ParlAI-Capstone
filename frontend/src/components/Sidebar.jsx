import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Leagues</h2>
      <ul className="sidebar-list">
        <li>
          <Link to="/nba" className="no-underline">
            🏀 NBA
          </Link>
        </li>
        <li>
          <Link to="/nfl" className="hover:text-sb-blue-light">
            🏈 NFL
          </Link>
        </li>
        <li>
          <Link to="/mlb">⚾ MLB</Link>
        </li>
        <li>
          <Link to="/hockey" className="no-underline">
            🏒 NHL
          </Link>
        </li>
        <li>
          <Link to="/soccer">⚽ Soccer</Link>
        </li>
        <li>🎾 Tennis</li>
        <li>
          <Link to="/ufc" className="no-underline">
            🥊 UFC
          </Link>
        </li>
      </ul>
    </aside>
  );
}
