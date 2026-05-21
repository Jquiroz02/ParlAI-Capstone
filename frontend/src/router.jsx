import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Login from './pages/login';
import Home from './pages/home';
import HowToPlay from './pages/HowToPlay';
import Onboarding from './pages/onboarding';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import NFLBets from './pages/NFLBets';
import MLBBets from './pages/MLBBets';
import SoccerPage from './pages/SoccerPage';
import Games from './pages/Games';
import Players from './pages/Players';
import MyBets from './pages/MyBets';
import NBABets from './pages/NBABets';
import UFCBets from './pages/UFCBets';
import NotFound from './pages/NotFound';
import Hockey from './pages/Hockey';
import Support from './pages/Support';
import SportsLayout from './sportsLayout';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },

      // Pages that will have bet slip footer
      {
        element: <SportsLayout />,
        children: [
          { path: 'soccer', element: <SoccerPage /> },
          { path: 'nfl', element: <NFLBets /> },
          { path: 'nba', element: <NBABets /> },
          { path: 'ufc', element: <UFCBets /> },
          { path: 'hockey', element: <Hockey /> },
          { path: 'mlb', element: <MLBBets /> },
        ],
      },

      { path: 'login', element: <Login /> },
      { path: 'onboarding', element: <Onboarding /> },
      { path: 'how-to-play', element: <HowToPlay /> },
      { path: 'support', element: <Support /> },
      { path: 'games', element: <Games /> },
      { path: 'players', element: <Players /> },
      { path: 'bets', element: <MyBets /> },

      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        ),
      },

      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default router;
