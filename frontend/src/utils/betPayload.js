/**
 * Cross-sport bet placement payload (extend per sport on the backend with the same envelope).
 */
export const BET_PAYLOAD_SCHEMA_VERSION = 1;

/** Market keys align with `markets.type` / Odds API (h2h, spreads, totals, …). */
export const MARKET_KEYS = {
  H2H: 'h2h',
  SPREADS: 'spreads',
  TOTALS: 'totals',
  PLAYER_GOAL_SCORER_ANYTIME: 'player_goal_scorer_anytime',
};

// This is used for setting the betting status of a game to a disabled state
export function isBettingClosed(game) {
  if (!game) return true;

  // ESPN site scoreboard shape (NBA / similar): { status: { typeState }, startDate }
  if (
    game.status &&
    typeof game.status === 'object' &&
    game.status.typeState != null
  ) {
    const ts = String(game.status.typeState || '').toLowerCase();
    if (ts === 'post' || ts === 'in') return true;
    const startIso = game.startDate || game.startTime;
    if (startIso) {
      const kick = new Date(startIso).getTime();
      if (!Number.isNaN(kick) && kick <= Date.now() && ts === 'pre') {
        return true;
      }
    }
    return false;
  }

  const status = String(game.status || '').toLowerCase();

  // These statuses are standard across almost all sports
  if (
    [
      'completed',
      'finished',
      'cancelled',
      'postponed',
      'in_progress',
      'live',
    ].includes(status)
  ) {
    return true;
  }

  if (!game.startTime) return false;
  const kickoff = new Date(game.startTime);
  if (Number.isNaN(kickoff.getTime())) return false;

  return kickoff.getTime() <= Date.now();
}

// Adds more context to the spread if the line value is 0
export function formatSpreadLine(lineValue) {
  if (lineValue == null || lineValue === '') return '—';
  const n = Number(lineValue);
  if (Number.isNaN(n)) return '—';
  if (n === 0) return 'PK'; // Used in NFL, NBA, Soccer alike
  return (n > 0 ? '+' : '') + String(n);
}

/**
 * Parlay = one leg per event only (no same-game / correlated parlays).
 */
export function isParlayEligible(selections) {
  if (!selections?.length || selections.length < 2) return false;
  const eventIds = new Set(selections.map((s) => s.gameId));
  return eventIds.size === selections.length;
}

/** One pick → straight; 2+ picks on distinct matches (enforced in slip) → parlay. */
export function inferWagerKind(selections) {
  if (!selections?.length) return 'straight_multi';
  return selections.length >= 2 ? 'parlay' : 'straight_multi';
}

export function getTicketSport(selections) {
  if (!selections?.length) return 'unknown';

  const uniqueSports = new Set(selections.map((s) => s.sport));

  // If there's more than one unique sport, it's a mixed ticket
  if (uniqueSports.size > 1) {
    return 'mixed';
  }

  // Otherwise, return the single sport
  return selections[0].sport;
}

/**
 * @param {object} params
 * @param {Array} params.selections — slip rows with gameId, leagueId, sport, marketKey, selectionId, outcomeLabel, odds, lineValue
 * @param {'parlay' | 'straight_multi'} params.wagerKind
 * @param {number} params.stakeAmount — single stake for parlay, or per-leg stake for straight_multi
 */

// This is the final bet payload
export function buildBetPlacePayload({
  selections,
  wagerKind,
  stakeAmount,
  currency = 'USD',
}) {
  const topLevelSport = getTicketSport(selections);

  const legs = selections.map((s) => ({
    sport: s.sport,
    leagueId: s.leagueId,
    eventId: s.gameId,
    selectionId: s.selectionId,
    marketKey: s.marketKey,
    outcomeLabel: s.outcomeLabel,
    odds: s.odds,
    lineValue: s.lineValue ?? null,
  }));

  const base = {
    schemaVersion: BET_PAYLOAD_SCHEMA_VERSION,
    topLevelSport,
    currency,
    submittedAt: new Date().toISOString(),
    legs,
  };

  if (wagerKind === 'parlay') {
    return {
      ...base,
      wagerKind: 'parlay',
      stake: {
        mode: 'single',
        amount: stakeAmount,
      },
    };
  }

  return {
    ...base,
    wagerKind: 'straight_multi',
    stake: {
      mode: 'per_leg',
      amount: stakeAmount,
    },
  };
}
