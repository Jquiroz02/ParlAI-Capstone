import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 bg-[#11131a] border-b border-[#1f2430] shadow-md">
        <h1 className="text-2xl font-extrabold tracking-wide text-sb-blue">
          <Link to="/" className="hover:text-sb-blue-light">
            ParlAI Sports Betting App
          </Link>
        </h1>

        <div className="flex gap-6 text-lg font-medium">
          <Link to="/" className="hover:text-sb-blue-light">
            Home
          </Link>
          <Link to="/games" className="hover:text-sb-blue-light">
            Games
          </Link>
          <Link to="/players" className="hover:text-sb-blue-light">
            Players
          </Link>
          <Link to="/bets" className="hover:text-sb-blue-light">
            My Bets
          </Link>
          <Link to="/how-to-play" className="hover:text-sb-blue-light">
            How to Play
          </Link>
          <Link to="/support" className="hover:text-sb-blue-light">
            Support
          </Link>

          {user ? (
            <>
              {user.onboardingStage > 0 && (
                <Link to="/dashboard" className="hover:text-sb-blue-light">
                  Dashboard
                </Link>
              )}
              {user.onboardingStage > 0 && (
                <Link to="/profile" className="hover:text-sb-blue-light">
                  Profile
                </Link>
              )}
              {user.onboardingStage > 0 && (
                <Link
                  to="/settings"
                  className="rounded-lg border border-sb-blue px-3 py-1 text-sm font-semibold text-sb-blue-light hover:bg-sb-blue/20"
                >
                  Settings
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="bg-transparent border border-sb-white text-white px-4 rounded-lg font-semibold text-[0.95rem] cursor-pointer hover:bg-white hover:text-sb-dark"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="hover:text-sb-blue-light">
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
