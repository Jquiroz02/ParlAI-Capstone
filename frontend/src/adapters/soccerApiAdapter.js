//import { matchTeamLabel } from '../utils/betPayload';

/**
 * Resolves `spreads` market rows for home/away (same naming quirks as moneyline).
 * @param {object} dbGame - game from getGames with `markets`, `homeTeam`, `awayTeam`
 */
export function parseSoccerSpreads(dbGame) {
  const spreadsMarket = dbGame.markets?.find((m) => m.type === 'spreads');
  if (!spreadsMarket?.selections?.length) {
    return { home: null, away: null };
  }

  const homeTeam = dbGame.homeTeam || '';
  const awayTeam = dbGame.awayTeam || '';
  const sels = spreadsMarket.selections;

  let homeSel = sels.find((s) => {
    const team = homeTeam?.toLowerCase();
    const label = s.label?.toLowerCase();
    return team && label && (team.includes(label) || label.includes(team));
  });

  let awaySel = sels.find((s) => {
    const team = awayTeam?.toLowerCase();
    const label = s.label?.toLowerCase();
    return team && label && (team.includes(label) || label.includes(team));
  });

  if (sels.length === 2) {
    if (homeSel && !awaySel) {
      awaySel = sels.find((s) => s !== homeSel);
    } else if (awaySel && !homeSel) {
      homeSel = sels.find((s) => s !== awaySel);
    }
  }

  return { home: homeSel ?? null, away: awaySel ?? null };
}
