// src/sportsLayout.jsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet } from 'react-router-dom';
import { useGlobalBetSlip } from './context/BetSlipContext';
import { useAuth } from './context/AuthContext';
import BetSlipFooter from './components/BetSlipFooter';

// This layout wraps all sports pages and includes the global bet slip footer.
const GlobalBetSlipFooter = () => {
  const { setUser } = useAuth();
  const {
    selections,
    clearSlip,
    createBetPayload,
    slipWarning,
    clearSlipWarning,
  } = useGlobalBetSlip();
  const [checkoutError, setCheckoutError] = useState('');

  if (!selections || selections.length === 0) return null;

  const handleCheckout = async (stake) => {
    setCheckoutError('');
    if (clearSlipWarning) clearSlipWarning();

    // Convert to a strict number just to be safe before building the payload
    const stakeAmount = Number(stake);

    if (!stakeAmount || stakeAmount <= 0) {
      setCheckoutError('Please enter a valid stake amount.');
      return;
    }

    const payload = createBetPayload(stakeAmount);

    if (!payload) {
      setCheckoutError('Unable to create bet payload.');
      return;
    }

    console.log('Sending Payload:', payload);

    //Place bet(s) through backend function
    try {
      const response = await fetch('/api/bets/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error || 'Failed to place bet.';
        setCheckoutError(errorMsg);
        return;
      }
      console.log('Bet placed successfully:', result);

      // After placing the bet, get updated balance and pass it to the bet slip footer.
      try {
        const balanceRes = await fetch('/api/user/balance');
        const balanceData = await balanceRes.json();

        if (balanceRes.ok) {
          setUser((prevUser) => ({
            ...prevUser,
            balance: balanceData.balance,
          }));
        }
      } catch (balanceErr) {
        console.error('Failed to silently refresh balance:', balanceErr);
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      setCheckoutError('An unexpected error occurred. Please try again.');
    }
  };

  // Render in document.body so `position: fixed` is not trapped by a parent
  // transform/stacking context (was hiding the slip under the main app shell).
  return createPortal(
    <BetSlipFooter
      selections={selections}
      slipWarning={slipWarning}
      checkoutError={checkoutError}
      setCheckoutError={setCheckoutError}
      clearSlip={clearSlip}
      onCheckout={handleCheckout}
    />,
    document.body,
  );
};

export default function SportsLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 pb-48">
        <Outlet />
      </div>
      <GlobalBetSlipFooter />
    </div>
  );
}
