import { useState, useEffect } from 'react';
import { parseSoccerSpreads } from '../adapters/soccerApiAdapter';

const EPL_LEAGUE_NAME = 'English Premier League';

const matchTeams = (name1, name2) => {
  if (!name1 || !name2) return false;
  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/ and | & /g, '')
      .replace(/fc/g, '')
      .replace(/[^a-z]/g, '');

  const n1 = normalize(name1);
  const n2 = normalize(name2);
  return n1.includes(n2) || n2.includes(n1);
};

export const getSoccerGames = (pruneSelectionsForGames) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveGames = async () => {
      try {
        const start = new Date();
        start.setDate(start.getDate() - 2);
        const end = new Date();
        end.setDate(end.getDate() + 14);

        // eslint-disable-next-line no-undef
        const params = new URLSearchParams({
          leagueName: EPL_LEAGUE_NAME,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });

        const apiUrl = `/api/getGames?${params.toString()}`;
        const response = await fetch(apiUrl);
        const backendData = await response.json();

        const formattedGames = backendData.map((dbGame) => {
          const sport = dbGame.league?.sport;
          const leagueId = dbGame.league?.id;

          const h2hMarket = dbGame.markets?.find((m) => m.type === 'h2h');

          let h2hPicks = { home: null, draw: null, away: null };

          if (h2hMarket) {
            const homeS = h2hMarket.selections.find((s) =>
              matchTeams(s.label, dbGame.homeTeam),
            );
            const awayS = h2hMarket.selections.find((s) =>
              matchTeams(s.label, dbGame.awayTeam),
            );
            const drawS = h2hMarket.selections.find(
              (s) =>
                s.label.toLowerCase() === 'draw' ||
                s.label.toLowerCase() === 'tie',
            );

            h2hPicks = {
              home: homeS
                ? { id: homeS.id, label: homeS.label, odds: homeS.odds }
                : null,
              draw: drawS
                ? { id: drawS.id, label: drawS.label, odds: drawS.odds }
                : null,
              away: awayS
                ? { id: awayS.id, label: awayS.label, odds: awayS.odds }
                : null,
            };
          }

          const totalsMarket = dbGame.markets?.find((m) => m.type === 'totals');
          let totalLine = '-',
            overOdds = '-',
            underOdds = '-';
          let totalsPicks = { over: null, under: null };

          if (totalsMarket && totalsMarket.selections.length > 0) {
            const over = totalsMarket.selections.find((s) =>
              s.label.toLowerCase().includes('over'),
            );
            const under = totalsMarket.selections.find((s) =>
              s.label.toLowerCase().includes('under'),
            );
            totalLine = over?.lineValue || under?.lineValue || '-';
            overOdds = over?.odds || '-';
            underOdds = under?.odds || '-';
            totalsPicks = {
              over: over
                ? {
                    id: over.id,
                    odds: over.odds,
                    lineValue: over.lineValue ?? null,
                  }
                : null,
              under: under
                ? {
                    id: under.id,
                    odds: under.odds,
                    lineValue: under.lineValue ?? null,
                  }
                : null,
            };
          }

          // const playerPropsMarket = dbGame.markets?.find(
          //   (m) => m.type === 'player_goal_scorer_anytime',
          // );
          // let playerProps = [];
          // if (playerPropsMarket && playerPropsMarket.selections) {
          //   playerProps = [...playerPropsMarket.selections].sort(
          //     (a, b) => a.odds - b.odds,
          //   );
          // }

          const { home: spreadHomeSel, away: spreadAwaySel } =
            parseSoccerSpreads(dbGame);

          return {
            id: dbGame.id,
            apiId: dbGame.apiId,
            homeTeam: dbGame.homeTeam,
            awayTeam: dbGame.awayTeam,
            homeScore: dbGame.scores?.home,
            awayScore: dbGame.scores?.away,
            totalLine,
            overOdds,
            underOdds,
            sport: sport ?? 'Soccer',
            leagueId,
            h2hPicks,
            totalsPicks,
            spread: {
              home: spreadHomeSel
                ? {
                    selectionId: spreadHomeSel.id,
                    odds: spreadHomeSel.odds,
                    lineValue: spreadHomeSel.lineValue,
                  }
                : null,
              away: spreadAwaySel
                ? {
                    selectionId: spreadAwaySel.id,
                    odds: spreadAwaySel.odds,
                    lineValue: spreadAwaySel.lineValue,
                  }
                : null,
            },
            //playerProps,
            homeLogo:
              dbGame.homeLogo ||
              `https://ui-avatars.com/api/?name=${dbGame.homeTeam}&background=random`,
            awayLogo:
              dbGame.awayLogo ||
              `https://ui-avatars.com/api/?name=${dbGame.awayTeam}&background=random`,
            startTime: dbGame.startTime,
            status: dbGame.status,
          };
        });

        setGames(formattedGames);
        if (pruneSelectionsForGames) pruneSelectionsForGames(formattedGames);
      } catch (error) {
        console.error('Failed to fetch games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveGames();
    const intervalId = window.setInterval(fetchLiveGames, 300000);
    return () => window.clearInterval(intervalId);
  }, [pruneSelectionsForGames]);

  return { games, loading };
};
