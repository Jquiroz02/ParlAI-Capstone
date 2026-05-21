import { app } from '@azure/functions';
import sql from 'mssql';
import { poolPromise } from '../../components/db-connect.js';

app.http('place-bet', {
  methods: ['POST'],
  route: 'bets/place',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      // 1. GRAB SECURE AUTH HEADER
      const header = request.headers.get('x-ms-client-principal');
      if (!header) return { status: 401, jsonBody: { error: 'Not logged in' } };

      const encoded = Buffer.from(header, 'base64');
      const decoded = encoded.toString('ascii');
      const clientPrincipal = JSON.parse(decoded);

      let finalUserId = clientPrincipal.userId;
      if (!finalUserId && clientPrincipal.claims) {
        const nameIdClaim = clientPrincipal.claims.find(
          (c) => c.typ === 'sub' || c.typ.includes('nameidentifier'),
        );
        if (nameIdClaim) finalUserId = nameIdClaim.val;
      }
      if (!finalUserId)
        return { status: 400, jsonBody: { error: 'Missing User ID' } };

      // 2. PARSE THE PAYLOAD
      const payload = await request.json();
      if (!payload || !payload.legs || payload.legs.length === 0) {
        return { status: 400, jsonBody: { error: 'Invalid bet payload' } };
      }

      const isParlay = payload.wagerKind === 'parlay';
      const stakePerWager = payload.stake.amount;
      const totalStake = isParlay
        ? stakePerWager
        : stakePerWager * payload.legs.length;

      const pool = await poolPromise;
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // --- A. FETCH AND LOCK USER BALANCE ---
        const userReq = new sql.Request(transaction);
        userReq.input('azureUserId', sql.NVarChar, finalUserId);
        const userRes = await userReq.query(`
          SELECT id, balance 
          FROM users WITH (UPDLOCK) 
          WHERE azure_user_id = @azureUserId
        `);

        const dbUser = userRes.recordset[0];
        if (!dbUser) throw new Error('User not found.');
        if (dbUser.balance < totalStake) throw new Error('Insufficient funds.');

        // --- B. INSERT BETS, LEGS, AND LEDGER ENTRIES ---
        if (isParlay) {
          const combinedOdds = payload.legs.reduce(
            (acc, leg) => acc * leg.odds,
            1,
          );
          const potentialPayout = combinedOdds * stakePerWager;

          // 1. Create Parent Bet
          const betReq = new sql.Request(transaction);
          betReq.input('userId', sql.Int, dbUser.id);
          betReq.input('wagerKind', sql.NVarChar, 'parlay');
          betReq.input('stake', sql.Decimal(18, 2), stakePerWager);
          betReq.input('oddsAtPlacement', sql.Decimal(10, 4), combinedOdds);
          betReq.input('potentialPayout', sql.Decimal(18, 2), potentialPayout);
          betReq.input('status', sql.NVarChar, 'PENDING');

          const betRes = await betReq.query(`
            INSERT INTO bets (user_id, wager_kind, stake, odds_at_placement, potential_payout, status, placed_at)
            OUTPUT INSERTED.id
            VALUES (@userId, @wagerKind, @stake, @oddsAtPlacement, @potentialPayout, @status, GETUTCDATE())
          `);
          const betId = betRes.recordset[0].id;

          // 2. Create Legs
          for (const leg of payload.legs) {
            const legReq = new sql.Request(transaction);
            legReq.input('betId', sql.Int, betId);
            legReq.input('eventId', sql.NVarChar, leg.eventId);
            legReq.input('selectionId', sql.NVarChar, leg.selectionId);
            legReq.input('odds', sql.Decimal(10, 4), leg.odds);
            legReq.input('status', sql.NVarChar, 'PENDING');

            await legReq.query(`
              INSERT INTO bet_legs (bet_id, event_id, selection_id, odds, status)
              VALUES (@betId, @eventId, @selectionId, @odds, @status)
            `);
          }

          // 3. Create Ledger Entry for this Bet
          const ledgerReq = new sql.Request(transaction);
          ledgerReq.input('userId', sql.Int, dbUser.id);
          ledgerReq.input('betId', sql.Int, betId);
          ledgerReq.input('amount', sql.Decimal(18, 2), -stakePerWager); // Negative amount for deduction
          ledgerReq.input('type', sql.NVarChar, 'WAGER_PLACED');
          await ledgerReq.query(`
            INSERT INTO wallet_ledger (user_id, bet_id, amount, type, created_at)
            VALUES (@userId, @betId, @amount, @type, GETUTCDATE())
          `);
        } else {
          // STRAIGHT MULTI: Loop through each leg and create independent bets
          for (const leg of payload.legs) {
            const potentialPayout = leg.odds * stakePerWager;

            // 1. Create Parent Bet (Straight)
            const betReq = new sql.Request(transaction);
            betReq.input('userId', sql.Int, dbUser.id);
            betReq.input('wagerKind', sql.NVarChar, 'straight');
            betReq.input('stake', sql.Decimal(18, 2), stakePerWager);
            betReq.input('oddsAtPlacement', sql.Decimal(10, 4), leg.odds);
            betReq.input(
              'potentialPayout',
              sql.Decimal(18, 2),
              potentialPayout,
            );
            betReq.input('status', sql.NVarChar, 'PENDING');

            const betRes = await betReq.query(`
              INSERT INTO bets (user_id, wager_kind, stake, odds_at_placement, potential_payout, status, placed_at)
              OUTPUT INSERTED.id
              VALUES (@userId, @wagerKind, @stake, @oddsAtPlacement, @potentialPayout, @status, GETUTCDATE())
            `);
            const betId = betRes.recordset[0].id;

            // 2. Create the Single Leg
            const legReq = new sql.Request(transaction);
            legReq.input('betId', sql.Int, betId);
            legReq.input('eventId', sql.NVarChar, leg.eventId);
            legReq.input('selectionId', sql.NVarChar, leg.selectionId);
            legReq.input('odds', sql.Decimal(10, 4), leg.odds);
            legReq.input('status', sql.NVarChar, 'PENDING');

            await legReq.query(`
              INSERT INTO bet_legs (bet_id, event_id, selection_id, odds, status)
              VALUES (@betId, @eventId, @selectionId, @odds, @status)
            `);

            // 3. Create Ledger Entry for this specific straight bet
            const ledgerReq = new sql.Request(transaction);
            ledgerReq.input('userId', sql.Int, dbUser.id);
            ledgerReq.input('betId', sql.Int, betId);
            ledgerReq.input('amount', sql.Decimal(18, 2), -stakePerWager);
            ledgerReq.input('type', sql.NVarChar, 'WAGER_PLACED');
            await ledgerReq.query(`
              INSERT INTO wallet_ledger (user_id, bet_id, amount, type, created_at)
              VALUES (@userId, @betId, @amount, @type, GETUTCDATE())
            `);
          }
        }

        // --- C. DEDUCT CACHED BALANCE ON USER TABLE ---
        // We deduct the total sum calculated at the very top
        const deductReq = new sql.Request(transaction);
        deductReq.input('totalStake', sql.Decimal(18, 2), totalStake);
        deductReq.input('userId', sql.Int, dbUser.id);
        await deductReq.query(`
          UPDATE users 
          SET balance = balance - @totalStake 
          WHERE id = @userId
        `);

        // --- D. COMMIT TRANSACTION ---
        await transaction.commit();

        return {
          status: 200,
          jsonBody: {
            success: true,
            message: 'Wagers successfully placed.',
          },
        };
      } catch (dbError) {
        await transaction.rollback();
        context.log.warn('Transaction Rolled Back:', dbError.message);
        return { status: 400, jsonBody: { error: dbError.message } };
      }
    } catch (error) {
      context.error('Fatal Server Error placing bet:', error);
      return { status: 500, jsonBody: { error: 'Internal Server Error' } };
    }
  },
});
