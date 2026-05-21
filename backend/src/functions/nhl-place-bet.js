import { app } from '@azure/functions';
import sql from 'mssql';

const sqlConfig = {
  server: process.env.DB_SERVER,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: false },
};

app.http('nhl-place-bet', {
  methods: ['POST'],
  route: 'nhl/bets',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      // Auth check
      const header = request.headers.get('x-ms-client-principal');
      if (!header) {
        return { status: 401, jsonBody: { error: 'Not logged in' } };
      }

      const clientPrincipal = JSON.parse(
        Buffer.from(header, 'base64').toString('ascii'),
      );
      const azureUserId = clientPrincipal.userId;
      if (!azureUserId) {
        return { status: 400, jsonBody: { error: 'Missing user ID' } };
      }

      // Parse request body
      const body = await request.json();
      const { homeTeam, awayTeam, betType, selection, odds, stake } = body;

      if (!homeTeam || !awayTeam || !betType || !selection || !odds || !stake) {
        return { status: 400, jsonBody: { error: 'Missing required fields' } };
      }

      if (stake <= 0) {
        return {
          status: 400,
          jsonBody: { error: 'Stake must be greater than 0' },
        };
      }

      const pool = await sql.connect(sqlConfig);

      // Get user and check balance
      const userResult = await pool
        .request()
        .input('azureUserId', sql.NVarChar, azureUserId).query(`
          SELECT id, balance FROM users WHERE azure_user_id = @azureUserId
        `);

      const user = userResult.recordset[0];
      if (!user) {
        return { status: 404, jsonBody: { error: 'User not found' } };
      }

      if (user.balance < stake) {
        return { status: 400, jsonBody: { error: 'Insufficient balance' } };
      }

      // Get or create NHL league
      const leagueResult = await pool
        .request()
        .query(`SELECT id FROM leagues WHERE name = 'NHL'`);

      let leagueId;
      if (leagueResult.recordset.length === 0) {
        const insertLeague = await pool
          .request()
          .input('name', sql.NVarChar, 'NHL')
          .input('country', sql.NVarChar, 'USA').query(`
            INSERT INTO leagues (name, country)
            OUTPUT INSERTED.id
            VALUES (@name, @country)
          `);
        leagueId = insertLeague.recordset[0].id;
      } else {
        leagueId = leagueResult.recordset[0].id;
      }

      // Create event for this game
      const eventResult = await pool
        .request()
        .input('leagueId', sql.Int, leagueId)
        .input('label', sql.NVarChar, `${awayTeam} @ ${homeTeam}`).query(`
          INSERT INTO events (league_id, home_team_id, away_team_id, start_time, status)
          OUTPUT INSERTED.id
          VALUES (@leagueId, 1, 1, SYSDATETIME(), 'scheduled')
        `);
      const eventId = eventResult.recordset[0].id;

      // Create market
      const marketResult = await pool
        .request()
        .input('eventId', sql.BigInt, eventId)
        .input('type', sql.VarChar, betType).query(`
          INSERT INTO markets (event_id, type, status)
          OUTPUT INSERTED.id
          VALUES (@eventId, @type, 'open')
        `);
      const marketId = marketResult.recordset[0].id;

      // Create selection
      const selectionResult = await pool
        .request()
        .input('marketId', sql.BigInt, marketId)
        .input('label', sql.NVarChar, selection)
        .input('odds', sql.Decimal(10, 4), odds).query(`
          INSERT INTO selections (market_id, label, odds)
          OUTPUT INSERTED.id
          VALUES (@marketId, @label, @odds)
        `);
      const selectionId = selectionResult.recordset[0].id;

      // Calculate payout
      const potentialPayout = parseFloat((stake * odds).toFixed(2));

      // Place the bet
      const betResult = await pool
        .request()
        .input('userId', sql.BigInt, user.id)
        .input('selectionId', sql.BigInt, selectionId)
        .input('stake', sql.Decimal(18, 2), stake)
        .input('odds', sql.Decimal(10, 4), odds)
        .input('potentialPayout', sql.Decimal(18, 2), potentialPayout).query(`
          INSERT INTO bets (user_id, selection_id, stake, odds_at_placement, potential_payout, status)
          OUTPUT INSERTED.id, INSERTED.placed_at
          VALUES (@userId, @selectionId, @stake, @odds, @potentialPayout, 'open')
        `);
      const bet = betResult.recordset[0];

      // Deduct stake from wallet
      await pool
        .request()
        .input('userId', sql.BigInt, user.id)
        .input('stake', sql.Decimal(18, 2), stake).query(`
          UPDATE users SET balance = balance - @stake WHERE id = @userId
        `);

      // Log wallet transaction
      await pool
        .request()
        .input('userId', sql.BigInt, user.id)
        .input('betId', sql.BigInt, bet.id)
        .input('amount', sql.Decimal(18, 2), -stake)
        .input('type', sql.VarChar, 'bet_placed').query(`
          INSERT INTO wallet_ledger (user_id, bet_id, amount, type)
          VALUES (@userId, @betId, @amount, @type)
        `);

      // Get updated balance
      const balanceResult = await pool
        .request()
        .input('userId', sql.BigInt, user.id)
        .query(`SELECT balance FROM users WHERE id = @userId`);

      return {
        status: 201,
        jsonBody: {
          message: 'Bet placed successfully!',
          betId: bet.id,
          homeTeam,
          awayTeam,
          betType,
          selection,
          stake,
          odds,
          potentialPayout,
          newBalance: balanceResult.recordset[0].balance,
          placedAt: bet.placed_at,
        },
      };
    } catch (error) {
      context.error('Error placing NHL bet:', error);
      return { status: 500, jsonBody: { error: 'Internal Server Error' } };
    }
  },
});
