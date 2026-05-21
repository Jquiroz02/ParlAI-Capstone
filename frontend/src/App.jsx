import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import { useAuth } from './context/AuthContext';
import { BetSlipProvider } from './context/BetSlipContext';

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  if (
    user &&
    user.onboardingStage === 0 &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    // Wrap the entire layout in the Provider so all routes and headers can access it's data
    <BetSlipProvider>
      <div className="min-h-screen flex flex-col bg-[#0d0f14] text-white relative">
        <Header />

        {/* Main Layout */}
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>

        <Footer />
      </div>
    </BetSlipProvider>
  );
}
