// Allow us to the use the BetSlip details globally and across all sports related pages
import { createContext, useContext } from 'react';
import { useBetSlip } from '../hooks/useBetSlip';

const BetSlipContext = createContext(null);

export const BetSlipProvider = ({ children }) => {
  const betSlipState = useBetSlip();

  return (
    <BetSlipContext.Provider value={betSlipState}>
      {children}
    </BetSlipContext.Provider>
  );
};

// A handy custom hook so your pages can easily grab the global state
export const useGlobalBetSlip = () => {
  const context = useContext(BetSlipContext);
  if (!context) {
    throw new Error('useGlobalBetSlip must be used within a BetSlipProvider');
  }
  return context;
};
