import { app } from '@azure/functions';
import sql from 'mssql';
import { poolPromise } from '../../components/db-connect.js';

function getUserIdFromClientPrincipal(headerValue) {
  if (!headerValue) return null;
  try {
    const encoded = Buffer.from(headerValue, 'base64');
    const decoded = encoded.toString('ascii');
    const clientPrincipal = JSON.parse(decoded);

    let finalUserId = clientPrincipal.userId;
    if (!finalUserId && clientPrincipal.claims) {
      const nameIdClaim = clientPrincipal.claims.find(
        (c) => c.typ === 'sub' || c.typ.includes('nameidentifier'),
      );
      if (nameIdClaim) finalUserId = nameIdClaim.val;
    }
    return finalUserId || null;
  } catch {
    return null;
  }
}

app.http('user-bets', {
  methods: ['GET'],
  route: 'bets',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const header = request.headers.get('x-ms-client-principal');
      const azureUserId = getUserIdFromClientPrincipal(header);
      if (!azureUserId) {
        return { status: 401, jsonBody: { error: 'Not logged in' } };
      }

      const pool = await poolPromise;

      // Optional filters
      const url = new URL(request.url);
      const status = (url.searchParams.get('status') || '')
        .trim()
        .toUpperCase();
      const limitParam = Number(url.searchParams.get('limit') || '');
      const limit = Number.isFinite(limitParam)
        ? Math.max(1, Math.min(200, limitParam))
        : 100;

      const req = pool.request();
      req.input('azureUserId', sql.NVarChar, azureUserId);
      req.input('limit', sql.Int, limit);

      let statusSql = '';
      if (status) {
        req.input('status', sql.NVarChar, status);
        statusSql = ' AND b.status = @status';
      }

      // Join bets -> legs -> selections -> markets -> events -> teams/leagues (when available).
      const result = await req.query(`
        SELECT TOP (@limit)
          b.id AS bet_id,
          b.wager_kind,
          b.stake,
          b.odds_at_placement,
          b.potential_payout,
          b.status AS bet_status,
          b.placed_at,
          b.settled_at,
          bl.id AS leg_id,
          bl.event_id AS leg_event_id,
          bl.selection_id AS leg_selection_id,
          bl.odds AS leg_odds,
          bl.status AS leg_status,
          s.label AS selection_label,
          s.line_value AS selection_line_value,
          m.type AS market_key,
          e.start_time AS event_start_time,
          e.status AS event_status,
          ht.name AS home_team,
          at.name AS away_team,
          l.name AS league_name,
          l.sport AS league_sport
        FROM bets b
        INNER JOIN users u ON b.user_id = u.id
        LEFT JOIN bet_legs bl ON bl.bet_id = b.id
        LEFT JOIN selections s ON TRY_CONVERT(BIGINT, bl.selection_id) = s.id
        LEFT JOIN markets m ON s.market_id = m.id
        LEFT JOIN events e ON m.event_id = e.id
        LEFT JOIN teams ht ON e.home_team_id = ht.id
        LEFT JOIN teams at ON e.away_team_id = at.id
        LEFT JOIN leagues l ON e.league_id = l.id
        WHERE u.azure_user_id = @azureUserId
          ${statusSql}
        ORDER BY b.placed_at DESC, b.id DESC
      `);

      const rows = result.recordset || [];
      const betsMap = new Map();

      for (const row of rows) {
        if (!betsMap.has(row.bet_id)) {
          betsMap.set(row.bet_id, {
            id: row.bet_id,
            wagerKind: row.wager_kind,
            stake: Number(row.stake),
            oddsAtPlacement: Number(row.odds_at_placement),
            potentialPayout: Number(row.potential_payout),
            status: row.bet_status,
            placedAt: row.placed_at,
            settledAt: row.settled_at,
            legs: [],
          });
        }

        const bet = betsMap.get(row.bet_id);
        if (row.leg_id != null) {
          bet.legs.push({
            id: row.leg_id,
            eventId: row.leg_event_id,
            selectionId: row.leg_selection_id,
            odds: row.leg_odds != null ? Number(row.leg_odds) : null,
            status: row.leg_status,
            marketKey: row.market_key || null,
            outcomeLabel: row.selection_label || null,
            lineValue: row.selection_line_value ?? null,
            event:
              row.home_team && row.away_team
                ? {
                    startTime: row.event_start_time,
                    status: row.event_status,
                    homeTeam: row.home_team,
                    awayTeam: row.away_team,
                    leagueName: row.league_name,
                    sport: row.league_sport,
                  }
                : null,
          });
        }
      }

      return { status: 200, jsonBody: { bets: Array.from(betsMap.values()) } };
    } catch (error) {
      context.error('Error fetching user bets:', error);
      return { status: 500, jsonBody: { error: 'Internal Server Error' } };
    }
  },
});
