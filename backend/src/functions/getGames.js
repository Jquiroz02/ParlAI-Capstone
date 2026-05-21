// Send Team data, scores, and odds to the frontend (all leagues in DB unless filtered).
import { app } from '@azure/functions';
import sql from 'mssql';
import { poolPromise } from '../../components/db-connect.js';

app.http('getGames', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    context.log(
      'HTTP trigger invoked: Fetching games and odds for the frontend.',
    );

    try {
      const pool = await poolPromise;

      const url = new URL(request.url);
      const leagueIdParam = url.searchParams.get('leagueId');
      const leagueNameParam = url.searchParams.get('leagueName');
      const sportParam = url.searchParams.get('sport');
      const startDateParam = url.searchParams.get('startDate');
      const endDateParam = url.searchParams.get('endDate');

      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 2);

      const defaultEnd = new Date();
      defaultEnd.setDate(defaultEnd.getDate() + 30);

      const startDate =
        startDateParam && !isNaN(Date.parse(startDateParam))
          ? new Date(startDateParam)
          : defaultStart;

      const endDate =
        endDateParam && !isNaN(Date.parse(endDateParam))
          ? new Date(endDateParam)
          : defaultEnd;

      const parsedLeagueId =
        leagueIdParam != null && leagueIdParam !== ''
          ? parseInt(leagueIdParam, 10)
          : NaN;

      // 1. All events in the window, with league metadata for routing on the client.
      const req = pool.request();
      let filterSql = '';
      if (!Number.isNaN(parsedLeagueId)) {
        req.input('filterLeagueId', sql.Int, parsedLeagueId);
        filterSql += ' AND e.league_id = @filterLeagueId';
      }
      if (leagueNameParam) {
        req.input('filterLeagueName', sql.NVarChar, leagueNameParam);
        filterSql += ' AND l.name = @filterLeagueName';
      }
      if (sportParam) {
        req.input('filterSport', sql.NVarChar, sportParam);
        filterSql += ' AND l.sport = @filterSport';
      }

      req.input('startDate', sql.DateTime, startDate);
      req.input('endDate', sql.DateTime, endDate);

      const result = await req.query(`
        SELECT 
            e.id AS event_id, 
            e.league_id,
            l.name AS league_name,
            l.country AS league_country,
            l.logo_url AS league_logo_url,
            l.sport AS league_sport,
            e.api_id, 
            e.start_time, 
            e.status, 
            e.home_score, 
            e.away_score,
            h.name AS home_team, 
            h.logo_url AS home_logo,  
            a.name AS away_team,
            a.logo_url AS away_logo, 
            m.id AS market_id, 
            m.type AS market_type,
            s.id AS selection_id, 
            s.label AS selection_label, 
            s.odds, 
            s.line_value
        FROM events e
        INNER JOIN leagues l ON e.league_id = l.id
        JOIN teams h ON e.home_team_id = h.id
        JOIN teams a ON e.away_team_id = a.id
        LEFT JOIN markets m ON e.id = m.event_id
        LEFT JOIN selections s ON m.id = s.market_id
        
        WHERE e.start_time >= @startDate
          AND e.start_time <= @endDate
          ${filterSql}
        
        ORDER BY e.start_time ASC;
      `);

      const rows = result.recordset;

      // 2. Convert to JSON
      const eventsMap = new Map();

      for (const row of rows) {
        // If we haven't seen this event yet, create its base object
        if (!eventsMap.has(row.event_id)) {
          eventsMap.set(row.event_id, {
            id: row.event_id,
            league: {
              id: row.league_id,
              name: row.league_name,
              country: row.league_country,
              logoUrl: row.league_logo_url,
              sport: row.league_sport,
            },
            apiId: row.api_id, // Odds-API event id
            homeTeam: row.home_team,
            homeLogo: row.home_logo,
            awayTeam: row.away_team,
            awayLogo: row.away_logo,
            startTime: row.start_time,
            status: row.status,
            scores: {
              home: row.home_score,
              away: row.away_score,
            },
            markets: [],
          });
        }

        const event = eventsMap.get(row.event_id);

        // If this row actually has market data (because of the LEFT JOIN)
        if (row.market_id) {
          // Check if we've already added this market to the event
          let market = event.markets.find((m) => m.id === row.market_id);

          if (!market) {
            market = {
              id: row.market_id,
              type: row.market_type,
              selections: [],
            };
            event.markets.push(market);
          }

          // Push the specific bet selection into the market
          if (row.selection_id) {
            market.selections.push({
              id: row.selection_id,
              label: row.selection_label, // Will hold team names, "Over/Under", or "Harvey Barnes"
              odds: row.odds,
              lineValue: row.line_value,
            });
          }
        }
      }

      // Convert the Map values back into a clean array
      const formattedGames = Array.from(eventsMap.values());

      // 3. Send to frontend
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(formattedGames),
      };
    } catch (error) {
      context.error('Database query failed:', error);
      return {
        status: 500,
        body: JSON.stringify({
          error: 'Internal Server Error while fetching games.',
        }),
      };
    }
  },
});
