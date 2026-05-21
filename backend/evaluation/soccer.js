/**
 * Evaluates standard soccer spreads (e.g., -0.5, +1.5).
 * Returns an array of objects: { id: selection_id, result: 'won' | 'lost' | 'void' }
 */
export function gradeSoccerSpread(
  selections,
  homeScore,
  awayScore,
  homeTeamName,
) {
  const updates = [];

  for (const selection of selections) {
    const lineValue = parseFloat(selection.line_value);

    // Check if the selection is for the Home team or Away team
    if (selection.label === homeTeamName) {
      // Apply the spread to the Home team's score
      const adjustedHomeScore = homeScore + lineValue;

      if (adjustedHomeScore > awayScore) {
        updates.push({ id: selection.id, result: 'won' });
      } else if (adjustedHomeScore === awayScore) {
        updates.push({ id: selection.id, result: 'void' }); // Push (only happens on whole numbers like 1.0)
      } else {
        updates.push({ id: selection.id, result: 'lost' });
      }
    } else {
      // Apply the spread to the Away team's score
      const adjustedAwayScore = awayScore + lineValue;

      if (adjustedAwayScore > homeScore) {
        updates.push({ id: selection.id, result: 'won' });
      } else if (adjustedAwayScore === homeScore) {
        updates.push({ id: selection.id, result: 'void' });
      } else {
        updates.push({ id: selection.id, result: 'lost' });
      }
    }
  }

  return updates;
}

/**
 * Evaluates soccer Over/Under totals (e.g., 2.5).
 * Returns an array of objects: { id: selection_id, result: 'won' | 'lost' | 'void' }
 */
export function gradeSoccerTotals(selections, homeScore, awayScore) {
  const updates = [];
  const totalGoals = homeScore + awayScore;

  for (const selection of selections) {
    const lineValue = parseFloat(selection.line_value);
    const label = selection.label.toLowerCase();

    // FIXED: Use .includes() instead of strict ===
    if (label.includes('over')) {
      if (totalGoals > lineValue) {
        updates.push({ id: selection.id, result: 'won' });
      } else if (totalGoals === lineValue) {
        updates.push({ id: selection.id, result: 'void' });
      } else {
        updates.push({ id: selection.id, result: 'lost' });
      }
    } else if (label.includes('under')) {
      if (totalGoals < lineValue) {
        updates.push({ id: selection.id, result: 'won' });
      } else if (totalGoals === lineValue) {
        updates.push({ id: selection.id, result: 'void' });
      } else {
        updates.push({ id: selection.id, result: 'lost' });
      }
    } else {
      console.warn(`Unrecognized label for totals market: ${selection.label}`);
    }
  }

  return updates;
}
