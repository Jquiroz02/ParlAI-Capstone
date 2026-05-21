import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

const AuthContext = createContext(null);

const AUTH_ME_URL = '/.auth/me';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(AUTH_ME_URL, { cache: 'no-store' });

      if (!res.ok) throw new Error();

      const data = await res.json();
      const principal = data?.clientPrincipal;

      if (!principal) throw new Error();

      const userRes = await fetch('/api/user/me');
      const dbUser = await userRes.json();

      setUser({
        id: dbUser.id,
        name: dbUser.nickname,
        email: dbUser.email,
        provider: principal.identityProvider,
        onboardingStage: dbUser.onboardingStage,
        balance: dbUser.balance,
      });

      setLoading(false);
      return;
    } catch {
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await checkAuth();
    })();
  }, [checkAuth]);

  // SOCIAL LOGIN PROVIDERS

  function loginWithGoogle() {
    window.location.href =
      '/.auth/login/google?post_login_redirect_uri=' +
      encodeURIComponent(window.location.origin + '/');
  }

  function loginWithFacebook() {
    window.location.href =
      '/.auth/login/facebook?post_login_redirect_uri=' +
      encodeURIComponent(window.location.origin + '/');
  }

  function loginWithTwitter() {
    window.location.href =
      '/.auth/login/twitter?post_login_redirect_uri=' +
      encodeURIComponent(window.location.origin + '/');
  }

  // LOGOUT
  function logout() {
    const base = window.location.origin.includes('localhost')
      ? 'https://lemon-bush-05638821e.1.azurestaticapps.net'
      : window.location.origin;

    window.location.href = `${base}/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(base + '/')}`;
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    setUser,
    loginWithGoogle,
    loginWithFacebook,
    loginWithTwitter,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
