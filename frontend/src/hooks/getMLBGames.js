import { useState, useEffect } from 'react';

const MLB_LEAGUE_ID = 703;

function matchTeams(name1, name2) {
  if (!name1 || !name2) return false;
  const normalize = (str) => str.toLowerCase().replace(/[^a-z]/g, '');
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  return n1.includes(n2) || n2.includes(n1);
}

export const getMLBGames = (pruneSelectionsForGames) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const start = new Date();
        start.setDate(start.getDate() - 2);
        const end = new Date();
        end.setDate(end.getDate() + 14);

        const params = new window.URLSearchParams({
          leagueId: MLB_LEAGUE_ID,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });

        const res = await fetch(`/api/getGames?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch MLB games');
        const backendData = await res.json();

        const formattedGames = backendData.map((dbGame) => {
          const leagueId = dbGame.league?.id;
          const sport = dbGame.league?.sport;

          // Moneyline (h2h) market
          const h2hMarket = dbGame.markets?.find((m) => m.type === 'h2h');
          let h2hPicks = { home: null, away: null };

          if (h2hMarket) {
            const homeS = h2hMarket.selections.find((s) =>
              matchTeams(s.label, dbGame.homeTeam),
            );
            const awayS = h2hMarket.selections.find((s) =>
              matchTeams(s.label, dbGame.awayTeam),
            );

            h2hPicks = {
              home: homeS
                ? { id: homeS.id, label: homeS.label, odds: homeS.odds }
                : null,
              away: awayS
                ? { id: awayS.id, label: awayS.label, odds: awayS.odds }
                : null,
            };
          }

          // Totals market (Over/Under runs)
          const totalsMarket = dbGame.markets?.find((m) => m.type === 'totals');
          let totalsPicks = { over: null, under: null };
          let totalLine = 8.5;

          if (totalsMarket) {
            const over = totalsMarket.selections.find((s) =>
              s.label.toLowerCase().includes('over'),
            );
            const under = totalsMarket.selections.find((s) =>
              s.label.toLowerCase().includes('under'),
            );
            totalLine = over?.lineValue || under?.lineValue || 8.5;

            totalsPicks = {
              over: over
                ? { id: over.id, odds: over.odds, lineValue: over.lineValue }
                : null,
              under: under
                ? {
                    id: under.id,
                    odds: under.odds,
                    lineValue: under.lineValue,
                  }
                : null,
            };
          }

          return {
            id: dbGame.apiId || String(dbGame.id),
            dbId: dbGame.id,
            leagueId,
            sport: sport?.toLowerCase() || 'mlb',
            homeTeam: dbGame.homeTeam,
            awayTeam: dbGame.awayTeam,
            homeLogo:
              dbGame.homeLogo ||
              `https://ui-avatars.com/api/?name=${dbGame.homeTeam}&background=random`,
            awayLogo:
              dbGame.awayLogo ||
              `https://ui-avatars.com/api/?name=${dbGame.awayTeam}&background=random`,
            homeScore: dbGame.scores?.home,
            awayScore: dbGame.scores?.away,
            startTime: dbGame.startTime,
            status: dbGame.status,
            gameName: `${dbGame.awayTeam} @ ${dbGame.homeTeam}`,
            h2hPicks,
            totalsPicks,
            totalLine,
          };
        });

        setGames(formattedGames);
        if (pruneSelectionsForGames) pruneSelectionsForGames(formattedGames);
      } catch (err) {
        console.error('Failed to fetch MLB games:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
    const intervalId = window.setInterval(fetchGames, 300000);
    return () => window.clearInterval(intervalId);
  }, [pruneSelectionsForGames]);

  return { games, loading, error };
};
