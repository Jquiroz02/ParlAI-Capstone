// grading/globalGrader.js
import sql from 'mssql';
import { gradeSoccerSpread, gradeSoccerTotals } from './soccer.js';
import { processSettledBets } from './process-bet-results.js';

export async function gradeEventSelections(
  pool,
  eventId,
  sport,
  homeScore,
  awayScore,
  homeTeam,
  awayTeam,
) {
  try {
    // 1. Fetch all pending markets and their selections
    const marketsRes = await pool
      .request()
      .input('eventId', sql.BigInt, eventId).query(`
        SELECT m.id AS market_id, m.type, s.id AS selection_id, s.label, s.line_value 
        FROM markets m
        INNER JOIN selections s ON m.id = s.market_id
        WHERE m.event_id = @eventId AND m.status != 'settled' AND s.result = 'pending'
      `);

    // Group selections by market_id for easy processing
    const marketsMap = {};
    for (const row of marketsRes.recordset) {
      if (!marketsMap[row.market_id]) {
        marketsMap[row.market_id] = {
          id: row.market_id,
          type: row.type,
          selections: [],
        };
      }
      marketsMap[row.market_id].selections.push({
        id: row.selection_id,
        label: row.label,
        line_value: row.line_value,
      });
    }

    const allDbUpdates = []; // We will collect all result updates here

    // 2. Loop through markets and evaluate
    for (const marketId in marketsMap) {
      const market = marketsMap[marketId];

      if (market.type === 'h2h') {
        // --- UNIVERSAL H2H LOGIC ---
        let winner = 'Draw';
        if (homeScore > awayScore) winner = homeTeam;
        else if (awayScore > homeScore) winner = awayTeam;

        for (const sel of market.selections) {
          const result = sel.label === winner ? 'won' : 'lost';
          allDbUpdates.push({ id: sel.id, result: result });
        }
      } else if (market.type === 'spreads') {
        let spreadResults = [];
        if (sport.toLowerCase() === 'soccer') {
          spreadResults = gradeSoccerSpread(
            market.selections,
            homeScore,
            awayScore,
            homeTeam,
          );
        }
        allDbUpdates.push(...spreadResults);
      } else if (market.type === 'totals') {
        let totalsResults = [];
        if (sport.toLowerCase() === 'soccer') {
          // Totals don't need to know who the home team is, just the scores
          totalsResults = gradeSoccerTotals(
            market.selections,
            homeScore,
            awayScore,
          );
        }
        allDbUpdates.push(...totalsResults);
      }
      // Add other universal markets (like 'totals') or specific ones here
    }

    // 3. Bulk Update the Database
    for (const update of allDbUpdates) {
      await pool
        .request()
        .input('selectionId', sql.BigInt, update.id)
        .input('result', sql.VarChar, update.result)
        .query(
          `UPDATE selections SET result = @result WHERE id = @selectionId`,
        );
    }

    // 4. Mark markets as settled
    await pool
      .request()
      .input('eventId', sql.BigInt, eventId)
      .query(`UPDATE markets SET status = 'settled' WHERE event_id = @eventId`);

    console.log(
      `Grading complete for Event ${eventId}. Cascading to bet legs...`,
    );

    try {
      await processSettledBets(pool);
      console.log(`Paying out bets to users`);
    } catch (payoutError) {
      console.error(
        `Failed to process payouts after grading event ${eventId}:`,
        payoutError,
      );
    }
  } catch (error) {
    console.error(`Failed to grade event ${eventId}:`, error);
  }
}
