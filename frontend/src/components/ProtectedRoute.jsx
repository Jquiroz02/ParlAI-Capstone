import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-sb-muted">
        <div
          className="w-10 h-10 border-[3px] border-sb-border border-t-sb-white rounded-full animate-auth-spin"
          aria-hidden
        />
        <p>Checking authentication…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
