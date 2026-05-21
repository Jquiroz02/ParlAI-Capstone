import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BetSlipFooter = ({
  selections,
  slipWarning,
  checkoutError,
  setCheckoutError,
  onCheckout,
  clearSlip,
}) => {
  const [stake, setStake] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  // This effect listens for any checkout errors. If one occurs, it flips off the success screen (if it was on) and shows the error message. After 5 seconds, it clears the error message automatically.
  useEffect(() => {
    if (checkoutError) {
      setIsSuccess(false);
      setIsConfirming(false);
      // eslint-disable-next-line no-undef
      const timer = setTimeout(() => {
        if (setCheckoutError) setCheckoutError('');
      }, 5000);
      // eslint-disable-next-line no-undef
      return () => clearTimeout(timer);
    }
  }, [checkoutError, setCheckoutError]);

  if (selections.length === 0) return null;

  // LIVE PAYOUT CALCULATION
  const numericStake = Number(stake) || 0;
  const totalOdds = selections.reduce(
    (acc, sel) => acc * (Number(sel.odds) || 1),
    1,
  );
  const expectedPayout = numericStake * totalOdds;

  // moves to next step to finalize bet confirmation, but first does a quick JIT balance check to prevent users from going to the confirm screen if they don't have enough funds. This is because the confirm screen shows the final cost and is where users expect to see any last-minute errors before placing the bet.
  const handleReviewClick = async () => {
    if (checkoutError && setCheckoutError) {
      setCheckoutError('');
    }

    try {
      const res = await fetch('/api/user/balance');
      const data = await res.json();

      if (res.ok) {
        setUser((prev) => ({ ...prev, balance: data.balance }));

        //Calculate cost based on UI state since 'payload' isn't built yet
        const isParlay = selections.length > 1;
        const totalCost = isParlay
          ? Number(stake)
          : Number(stake) * selections.length;

        if (data.balance < totalCost) {
          if (setCheckoutError) {
            setCheckoutError('Insufficient funds for this wager.');
          }
          return;
        }
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      console.warn(
        'Could not fetch live balance JIT, proceeding to confirm step.',
      );
    }

    setIsConfirming(true);
  };

  return (
    <div className="fixed bottom-0 left-0 w-full max-w-full bg-[#181a20] border-t border-[#00f6ff]/30 p-4 flex flex-col gap-3 z-[200] pointer-events-auto shadow-[0_-4px_15px_rgba(0,0,0,0.6),0_0_10px_rgba(0,246,255,0.1)] transition-transform duration-300">
      {/* Top Row: Header */}
      <div className="text-white flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="font-black text-[#00f6ff] text-2xl">
              {selections.length}
            </span>
            <span className="text-white text-sm font-semibold">
              {selections.length <= 1 ? 'Straight Bet' : 'Multi-Match Parlay'}
            </span>
          </div>
          <p className="text-gray-400 text-xs">One pick allowed per match</p>
        </div>
      </div>

      {/* Middle Row: Selected Bets Carousel */}
      <div className="flex flex-nowrap gap-3 overflow-x-auto py-2 items-start scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {selections.map((sel) => {
          const uniqueKey = sel.selectionId || sel.id;

          return (
            <div
              key={uniqueKey}
              className={`flex-shrink-0 flex justify-between items-center bg-[#1c2029] p-3 rounded border border-gray-800 min-w-[220px] w-fit h-fit transition-opacity ${isSuccess ? 'opacity-50' : 'opacity-100'}`}
            >
              <div className="flex-1 pr-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5 font-bold whitespace-nowrap">
                  {sel.gameName}
                </p>

                <div className="flex items-center gap-2 whitespace-nowrap">
                  <p className="text-sm font-bold text-white">
                    {sel.betTeam || sel.outcomeLabel}
                  </p>
                  <span className="flex-shrink-0 text-[#00f6ff] text-[10px] font-black bg-[#00f6ff]/10 px-1.5 py-0.5 rounded">
                    {sel.betType}
                  </span>
                </div>

                {sel.lineValue && (
                  <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">
                    Line:{' '}
                    <span className="text-white font-bold">
                      {sel.lineValue}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-black text-[#00f6ff]">{sel.odds}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Row: Dynamic UI based on state and Error/Warnings */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-center border-t border-gray-800 pt-3 mt-1 gap-3">
        {/* Left Side: Balance & Live Expected Payout */}
        <div className="flex-1 flex flex-col gap-1 text-md font-semibold tracking-wide whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Balance:</span>
            <span className="text-white">
              ${user?.balance ? Number(user.balance).toFixed(2) : '0.00'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Expected Payout:</span>
            <span className="text-[#00f6ff]">${expectedPayout.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          {slipWarning && (
            <div className="bg-amber-950/50 border border-amber-700/50 text-amber-300 text-[11px] font-medium px-3 py-1 rounded-md max-w-md shadow-inner flex items-center gap-1.5">
              <span className="text-lg">⚠️</span> {slipWarning}
            </div>
          )}
          {checkoutError && (
            <div className="bg-red-950/60 border border-red-700/50 text-red-200 text-[11px] font-medium px-3 py-1 rounded-md max-w-md shadow-inner flex items-center gap-1.5 animate-pulse">
              <span className="text-lg">🚫</span> {checkoutError}
            </div>
          )}
        </div>

        {/* Right Side: The 3 Stages of the UI */}

        {isSuccess ? (
          /* STAGE 3: SUCCESS UI */
          <div className="flex items-center justify-between sm:justify-end w-full gap-4 animate-fade-in">
            <div className="flex items-center gap-2 text-[#00f6ff] font-extrabold text-sm sm:text-base tracking-wide bg-[#00f6ff]/10 px-4 py-2 rounded-md border border-[#00f6ff]/30">
              <span className="text-lg">✅</span> Wager Confirmed!
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSuccess(false);
                setStake('');
                clearSlip();
              }}
              className="bg-gray-700 text-white font-bold px-6 py-2.5 rounded-md hover:bg-gray-600 active:scale-95 transition-all text-sm uppercase tracking-wider cursor-pointer shadow-md"
            >
              Close Slip
            </button>
          </div>
        ) : isConfirming && user ? (
          <div className="flex items-center gap-3 w-full sm:w-auto animate-fade-in">
            <div className="bg-[#111318] border border-[#00f6ff]/50 text-white rounded px-4 py-2.5 font-bold text-sm">
              Stake:{' '}
              <span className="text-[#00f6ff]">
                ${Number(stake).toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              className="text-gray-400 hover:text-white font-bold px-3 py-2.5 rounded-md active:scale-95 transition-all text-sm uppercase tracking-wider cursor-pointer"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={async () => {
                setIsConfirming(false);
                setIsSuccess(true);
                await onCheckout(stake);
              }}
              className="bg-[#00f6ff] text-black font-extrabold px-6 py-2.5 rounded-md hover:bg-white active:scale-95 transition-all shadow-[0_0_20px_rgba(0,246,255,0.6)] text-sm uppercase tracking-wider cursor-pointer animate-pulse"
            >
              Confirm Bet
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={stake}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (/^\d*(\.\d{0,2})?$/.test(inputValue)) {
                    setStake(inputValue);
                  }
                }}
                placeholder="Stake"
                className="w-full sm:w-28 bg-[#111318] border border-gray-700 text-white rounded px-3 py-2.5 pl-7 font-bold text-sm focus:outline-none focus:border-[#00f6ff] focus:ring-1 focus:ring-[#00f6ff] transition-all"
              />
            </div>

            <button
              type="button"
              onClick={clearSlip}
              className="text-gray-400 hover:text-white font-bold px-3 py-2.5 rounded-md active:scale-95 transition-all text-sm uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>

            {user ? (
              <button
                type="button"
                onClick={handleReviewClick}
                disabled={!stake || Number(stake) <= 0}
                className="bg-[#00f6ff] text-black font-extrabold px-6 py-2.5 rounded-md hover:bg-white active:scale-95 transition-all shadow-[0_0_15px_rgba(0,246,255,0.3)] text-sm uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#00f6ff]"
              >
                Review & Place
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="bg-[#00f6ff] text-black font-extrabold px-6 py-2.5 rounded-md hover:bg-white active:scale-95 transition-all shadow-[0_0_15px_rgba(0,246,255,0.3)] text-sm uppercase tracking-wider cursor-pointer"
              >
                Login to Bet
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BetSlipFooter;
