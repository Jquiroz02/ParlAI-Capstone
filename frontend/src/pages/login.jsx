import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    loginWithGoogle,
    loginWithFacebook,
    loginWithTwitter,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/dashboard';

  // Handle redirect in effect to prevent render warnings
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  if (isAuthenticated) return null;

  async function handleLogin(providerFn) {
    try {
      setError('');
      setSubmitting(true);
      await providerFn();
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  // shared button style
  const baseBtnStyle =
    'w-full inline-flex items-center justify-center gap-2 py-3 px-5 text-base font-semibold rounded-lg disabled:opacity-70 cursor-pointer transition-colors';

  // 2. Configuration for the buttons
  const providers = [
    {
      name: 'Google',
      icon: 'G',
      style: 'bg-white text-[#333] border border-sb-border hover:bg-gray-100',
      fn: loginWithGoogle,
    },
    {
      name: 'Facebook',
      icon: 'f',
      style: 'bg-[#1877F2] text-white hover:bg-[#145dbf]',
      fn: loginWithFacebook,
    },
    {
      name: 'X',
      icon: '𝕏',
      style: 'bg-black text-white border border-white hover:bg-[#222]',
      fn: loginWithTwitter,
    },
  ];

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-[420px] bg-sb-card border border-sb-border rounded-xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="text-center mb-6">
          <h1 className="text-[1.75rem] font-bold text-sb-blue mb-2 tracking-wide">
            Sign In
          </h1>
          <p className="text-sb-muted text-[0.95rem]">
            Welcome! Sign in to place your bets.
          </p>
        </div>

        {error && (
          <div
            className="rounded-lg py-3 px-4 text-[0.9rem] mb-4 border border-red-500/50 text-sb-error bg-[rgba(220,53,69,0.15)]"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-5">
          {providers.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`${baseBtnStyle} ${p.style}`}
              onClick={() => handleLogin(p.fn)}
              disabled={submitting}
            >
              <span className="font-bold text-[1.1rem]">{p.icon}</span>
              Continue with {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
