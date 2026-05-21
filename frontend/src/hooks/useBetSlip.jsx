//Functions that handle the bet slip
import { useState, useCallback } from 'react';
import { buildBetPlacePayload, isBettingClosed } from '../utils/betPayload.js';

export const useBetSlip = () => {
  const [selections, setSelections] = useState([]);
  const [slipWarning, setSlipWarning] = useState(null);

  // Categorize what kind of bet it is
  const inferredWagerKind = selections.length > 1 ? 'parlay' : 'straight_multi';

  const clearSlipWarning = () => setSlipWarning(null);

  const toggleSelection = (newBet) => {
    setSlipWarning(null);

    setSelections((prevSelections) => {
      const newGid = String(newBet.gameId);
      // 1. Same game, same market check (e.g., swapping Spread from Home to Away, or toggling off)
      const existingBetIndex = prevSelections.findIndex(
        (bet) =>
          String(bet.gameId) === newGid && bet.marketKey === newBet.marketKey,
      );

      if (existingBetIndex >= 0) {
        const existingBet = prevSelections[existingBetIndex];

        // Toggling off the exact same bet
        if (existingBet.outcomeLabel === newBet.outcomeLabel) {
          return prevSelections.filter(
            (_, index) => index !== existingBetIndex,
          );
        }

        // Swapping to a different side of the same market
        const updatedSelections = [...prevSelections];
        updatedSelections[existingBetIndex] = newBet;
        return updatedSelections;
      }

      // 2. Same game, DIFFERENT market check (e.g., trying to bet Moneyline AND Spread on the same game)
      const sameGameOtherMarketIdx = prevSelections.findIndex(
        (bet) =>
          String(bet.gameId) === newGid && bet.marketKey !== newBet.marketKey,
      );

      if (sameGameOtherMarketIdx >= 0) {
        const without = prevSelections.filter(
          (_, i) => i !== sameGameOtherMarketIdx,
        );
        return [...without, newBet];
      }

      // 3. Completely new game, add it to the slip
      return [...prevSelections, newBet];
    });
  };

  // similar to the toggle selection logic, but this is meant for the bet slip UI
  const removeSelection = (gameId, marketKey, outcomeLabel) => {
    const gid = String(gameId);
    setSelections((prev) =>
      prev.filter(
        (bet) =>
          !(
            String(bet.gameId) === gid &&
            bet.marketKey === marketKey &&
            bet.outcomeLabel === outcomeLabel
          ),
      ),
    );
  };

  const clearSlip = () => {
    setSelections([]);
    setSlipWarning(null);
  };

  // get rid of bets in real-time if a match starts/ends or is invalid
  const pruneSelectionsForGames = useCallback((gamesList) => {
    if (!gamesList?.length) return;
    setSelections((prev) =>
      prev.filter((bet) => {
        const g = gamesList.find((x) => String(x.id) === String(bet.gameId));
        if (!g) return false;
        return !isBettingClosed(g);
      }),
    );
  }, []);

  const createBetPayload = (stakeAmount) => {
    if (selections.length === 0) return null;

    return buildBetPlacePayload({
      selections,
      wagerKind: inferredWagerKind,
      stakeAmount,
    });
  };

  return {
    selections,
    toggleSelection,
    removeSelection,
    clearSlip,
    pruneSelectionsForGames,
    createBetPayload,
    slipWarning,
    clearSlipWarning,
    inferredWagerKind,
  };
};
