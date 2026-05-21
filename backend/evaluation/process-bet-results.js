import sql from 'mssql';

export async function processSettledBets(pool) {
  console.log('Starting Bet Settlement & Payouts...');

  // Using a Transaction ensures that if something breaks, NO money is falsely moved.
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // ==========================================
    // STEP 1: Cascade Selection Results to Bet Legs
    // ==========================================
    await transaction.request().query(`
      UPDATE bl
      SET bl.status = s.result
      FROM bet_legs bl
      INNER JOIN selections s ON bl.selection_id = s.id
      WHERE bl.status = 'pending' AND s.result IN ('won', 'lost', 'void');
    `);
    console.log('Synced bet legs with selection results.');

    // ==========================================
    // STEP 2: Find all Bets where ALL legs are finished
    // ==========================================
    const betsToEvaluateRes = await transaction.request().query(`
      SELECT 
        b.id AS bet_id, 
        b.user_id, 
        b.stake, 
        b.potential_payout,
        COUNT(bl.id) AS total_legs,
        SUM(CASE WHEN bl.status = 'lost' THEN 1 ELSE 0 END) AS lost_legs,
        SUM(CASE WHEN bl.status = 'won' THEN 1 ELSE 0 END) AS won_legs,
        SUM(CASE WHEN bl.status = 'void' THEN 1 ELSE 0 END) AS void_legs
      FROM bets b
      INNER JOIN bet_legs bl ON b.id = bl.bet_id
      WHERE b.status = 'pending'
      GROUP BY b.id, b.user_id, b.stake, b.potential_payout
      -- ONLY grab bets where zero legs are still pending
      HAVING SUM(CASE WHEN bl.status = 'pending' THEN 1 ELSE 0 END) = 0;
    `);

    const bets = betsToEvaluateRes.recordset;

    if (bets.length === 0) {
      console.log('No fully completed bets found to pay out right now.');
      await transaction.commit();
      return;
    }

    console.log(`Evaluating ${bets.length} completed bets...`);

    // ==========================================
    // STEP 3: Grade Bets and Process Payouts
    // ==========================================
    for (const bet of bets) {
      let finalStatus = 'pending';
      let actualPayout = 0;
      let ledgerType = '';

      if (bet.lost_legs > 0) {
        // If even ONE leg loses, the whole parlay/straight bet loses.
        finalStatus = 'lost';
        actualPayout = 0;
      } else if (bet.won_legs == 0 && bet.void_legs > 0) {
        // If everything was voided (e.g., game canceled), it's a push. Refund stake.
        finalStatus = 'void';
        actualPayout = bet.stake;
        ledgerType = 'refund';
      } else {
        // Bet is a winner! (All wins, or a mix of wins and voids)
        finalStatus = 'won';
        ledgerType = 'payout';
        actualPayout = bet.potential_payout;
      }

      // A. Update the Bet Status & Settled Time
      await transaction
        .request()
        .input('betId', sql.BigInt, bet.bet_id)
        .input('finalStatus', sql.VarChar, finalStatus).query(`
          UPDATE bets 
          SET status = @finalStatus, settled_at = GETDATE()
          WHERE id = @betId
        `);

      // B. Hit the Wallet Ledger (If they won money or got a refund)
      if (actualPayout > 0) {
        await transaction
          .request()
          .input('userId', sql.BigInt, bet.user_id)
          .input('betId', sql.BigInt, bet.bet_id)
          .input('amount', sql.Decimal(18, 2), actualPayout)
          .input('type', sql.VarChar, ledgerType).query(`
            -- 1. Insert paper trail into wallet_ledger
            INSERT INTO wallet_ledger (user_id, bet_id, amount, type, created_at)
            VALUES (@userId, @betId, @amount, @type, GETDATE());

            -- 2. Actually add the money to the user's balance
            UPDATE users 
            SET balance = balance + @amount 
            WHERE id = @userId;
          `);
      }
    }

    // Commit the transaction to permanently save all updates
    await transaction.commit();
    console.log(
      `Successfully settled ${bets.length} bets and updated user wallets!`,
    );
  } catch (error) {
    // If anything fails (syntax error, DB timeout), undo ALL changes
    console.error(
      'CRITICAL ERROR processing payouts. Rolling back transaction...',
      error,
    );
    await transaction.rollback();
  }
}
