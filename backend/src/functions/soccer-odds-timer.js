import { app } from '@azure/functions';
import sql from 'mssql';
import axios from 'axios';

import { poolPromise } from '../../components/db-connect.js';

// Helper to strip out spaces, "and", "&" for perfect matching in the database
// Helper to strip out spaces and map tricky teams to a core "root" word
function normalizeName(name) {
  if (!name) return '';

  const lowerName = name.toLowerCase();

  // 1. The Alias Dictionary (Entity Resolution)
  // If the incoming API or ESPN name contains these keywords,
  // immediately boil it down to a single root word.
  if (lowerName.includes('brighton') || lowerName.includes('hove albion'))
    return 'brighton';
  if (lowerName.includes('manchester united') || lowerName.includes('man utd'))
    return 'manchesterunited';
  if (lowerName.includes('manchester city') || lowerName.includes('man city'))
    return 'manchestercity';
  if (lowerName.includes('tottenham') || lowerName.includes('spurs'))
    return 'tottenham';
  if (lowerName.includes('nottingham') || lowerName.includes("nott'm"))
    return 'nottingham';
  if (lowerName.includes('wolverhampton') || lowerName.includes('wolves'))
    return 'wolves';
  if (lowerName.includes('newcastle')) return 'newcastle';

  // 2. Default fallback for standard teams (Arsenal, Chelsea, etc.)
  return lowerName
    .replace(/fc/g, '') // strip FC
    .replace(/afc/g, '') // strip AFC (e.g., AFC Bournemouth -> bournemouth)
    .replace(/ and | & /g, '') // strip and/&
    .replace(/[^a-z]/g, ''); // strip spaces and special chars
}

// READ-ONLY: Only fetches the League. Will NOT create it.
async function getLeague(pool, leagueName) {
  let res = await pool
    .request()
    .input('name', sql.NVarChar, leagueName)
    .query('SELECT id FROM leagues WHERE name = @name');

  if (res.recordset.length > 0) return res.recordset[0].id;
  return null; // Return null if ESPN hasn't created it yet
}

// READ-ONLY: Only fetches the Team. Will NOT create it.
// Note: I removed the leagueId parameter since we don't need it for inserting anymore!
async function getTeam(pool, teamName) {
  const normalizedInput = normalizeName(teamName);

  let res = await pool
    .request()
    .input('normalizedName', sql.NVarChar, normalizedInput).query(`
      SELECT id 
      FROM teams 
      WHERE 
        -- 1. Check if the DB name contains the API name
        REPLACE(LOWER(REPLACE(REPLACE(name, ' and ', ''), ' & ', '')), ' ', '') LIKE '%' + @normalizedName + '%'
        OR 
        -- 2. Check if the API name contains the DB name (e.g. API="BrightonHoveAlbion", DB="Brighton")
        @normalizedName LIKE '%' + REPLACE(LOWER(REPLACE(REPLACE(name, ' and ', ''), ' & ', '')), ' ', '') + '%'
    `);

  if (res.recordset.length > 0) return res.recordset[0].id;
  return null; // Return null if ESPN hasn't created it yet
}

// Odds-api team IDs for home and away team along with the games start time
async function getOrCreateEvent(
  pool,
  leagueId,
  homeTeamId,
  awayTeamId,
  startTime,
  apiId,
) {
  // 1. Try to find the exact match by Odds API ID
  let res = await pool
    .request()
    .input('apiId', sql.VarChar, apiId)
    .query('SELECT id FROM events WHERE api_id = @apiId');

  if (res.recordset.length > 0) {
    const existingId = res.recordset[0].id;
    await pool
      .request()
      .input('id', sql.BigInt, existingId)
      .input('startTime', sql.DateTime2, new Date(startTime))
      .query('UPDATE events SET start_time = @startTime WHERE id = @id');

    return existingId;
  }

  // 2. If API ID is not found, look for the same teams playing roughly the same time
  res = await pool
    .request()
    .input('leagueId', sql.Int, leagueId)
    .input('homeTeamId', sql.Int, homeTeamId)
    .input('awayTeamId', sql.Int, awayTeamId)
    .input('startTime', sql.DateTime2, new Date(startTime)).query(`
        SELECT id from events
        WHERE league_id = @leagueId
          AND home_team_id = @homeTeamId
          AND away_team_id = @awayTeamId
          -- Removed the status check! If it's completed, we still want to grab it, not duplicate it.
          AND ABS(DATEDIFF(day, start_time, @startTime)) <= 5
        `);

  if (res.recordset.length > 0) {
    // Update the old record with the new API ID and Time
    const existingEventId = res.recordset[0].id;

    await pool
      .request()
      .input('id', sql.BigInt, existingEventId)
      .input('newApiId', sql.VarChar, apiId)
      .input('newStartTime', sql.DateTime2, new Date(startTime)).query(`
              UPDATE events
              SET api_id = @newApiId, start_time = @newStartTime
              WHERE id = @id
              `);

    return existingEventId;
  }

  // 3. Brand new game
  res = await pool
    .request()
    .input('leagueId', sql.Int, leagueId)
    .input('homeTeamId', sql.Int, homeTeamId)
    .input('awayTeamId', sql.Int, awayTeamId)
    .input('startTime', sql.DateTime2, new Date(startTime))
    .input('apiId', sql.VarChar, apiId).query(`
      INSERT INTO events (league_id, home_team_id, away_team_id, start_time, status, api_id) 
      OUTPUT INSERTED.id 
      VALUES (@leagueId, @homeTeamId, @awayTeamId, @startTime, 'scheduled', @apiId)
    `);

  return res.recordset[0].id;
}

// Use the event_id created from the events table to make 3 rows per match
async function getOrCreateMarket(pool, eventId, type) {
  let res = await pool
    .request()
    .input('eventId', sql.BigInt, eventId)
    .input('type', sql.VarChar, type)
    .query('SELECT id FROM markets WHERE event_id = @eventId AND type = @type');
  if (res.recordset.length > 0) return res.recordset[0].id;

  res = await pool
    .request()
    .input('eventId', sql.BigInt, eventId)
    .input('type', sql.VarChar, type)
    .query(
      'INSERT INTO markets (event_id, type) OUTPUT INSERTED.id VALUES (@eventId, @type)',
    );
  return res.recordset[0].id;
}

// Adds or updates the odds in the selections table
async function upsertSelection(pool, marketId, label, odds, lineValue) {
  const res = await pool
    .request()
    .input('marketId', sql.BigInt, marketId)
    .input('label', sql.NVarChar, label)
    .input('odds', sql.Decimal(10, 4), odds)
    .input('lineValue', sql.Decimal(10, 2), lineValue).query(`
      MERGE INTO selections AS target
      USING (SELECT @marketId AS market_id, @label AS label) AS source
      ON (target.market_id = source.market_id AND target.label = source.label)
      
      WHEN MATCHED THEN
        UPDATE SET 
          odds = @odds, 
          line_value = @lineValue
          
      WHEN NOT MATCHED THEN
        INSERT (market_id, label, odds, line_value, result)
        VALUES (@marketId, @label, @odds, @lineValue, 'pending')
      
      OUTPUT INSERTED.id;
    `);

  return res.recordset[0].id;
}

app.timer('ingestOddsTimer', {
  schedule: '0 0 */4 * * *',
  handler: async (myTimer, context) => {
    context.log('Timer trigger executing at:', new Date().toISOString());

    try {
      const pool = await poolPromise;

      // 1. Get the league FIRST so we only check soccer games!
      const leagueName = 'English Premier League';
      const leagueId = await getLeague(pool, leagueName);

      if (!leagueId) {
        context.log(
          `League '${leagueName}' not found. Ensure ESPN API runs first to create leagues/teams.`,
        );
        return; // Exit if the league doesn't exist
      }

      // 2. Smart Gatekeeper: Only check upcoming games for THIS specific league
      const nextGameResult = await pool
        .request()
        .input('leagueId', sql.Int, leagueId).query(`
          SELECT MIN(start_time) as nextGameTime 
          FROM dbo.events 
          WHERE league_id = @leagueId 
            AND start_time > GETUTCDATE() 
            AND status != 'completed'
      `);

      const nextGameTime = nextGameResult.recordset[0].nextGameTime;

      if (nextGameTime) {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setUTCDate(threeDaysFromNow.getUTCDate() + 3);

        if (new Date(nextGameTime) > threeDaysFromNow) {
          context.log(
            'Gatekeeper: The next EPL game is more than 3 days away. Skipping API call.',
          );
          return;
        }
        context.log(
          'Upcoming EPL games found within 3 days. Fetching fresh odds...',
        );
      } else {
        // Because you wiped League 700, nextGameTime will be null.
        // This correctly triggers the API to fetch the fresh schedule!
        context.log(
          'No upcoming EPL games in the database. Fetching fresh schedule from API...',
        );
      }

      const apiKey = process.env.SOCCER_ODDS_API;
      const response = await axios.get(
        `https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals`,
      );
      const apiGames = response.data;

      if (!apiGames || apiGames.length === 0) {
        context.log('API returned 0 games. Exiting early.');
        return;
      }

      for (const apiGame of apiGames) {
        context.log(
          `\n=== Processing Game: ${apiGame.home_team} vs ${apiGame.away_team} ===`,
        );

        // Get the team ids (Read-Only)
        const homeTeamId = await getTeam(pool, apiGame.home_team);
        const awayTeamId = await getTeam(pool, apiGame.away_team);

        // SAFEGUARD: If either team is missing, skip this game entirely!
        if (!homeTeamId || !awayTeamId) {
          context.log(
            `⚠️ Skipping game: One or both teams not found in DB. (${apiGame.home_team} / ${apiGame.away_team})`,
          );
          continue;
        }

        // Create or update the game event
        const eventId = await getOrCreateEvent(
          pool,
          leagueId,
          homeTeamId,
          awayTeamId,
          apiGame.commence_time,
          apiGame.id,
        );

        // Add the odds for each game
        if (apiGame.bookmakers && apiGame.bookmakers.length > 0) {
          const bookmaker =
            apiGame.bookmakers.find((b) => b.key === 'lowvig') ||
            apiGame.bookmakers[0];

          for (const market of bookmaker.markets) {
            if (!['h2h', 'spreads', 'totals'].includes(market.key)) continue;

            const marketId = await getOrCreateMarket(pool, eventId, market.key);

            for (const outcome of market.outcomes) {
              await upsertSelection(
                pool,
                marketId,
                outcome.name,
                outcome.price,
                outcome.point ?? null,
              );
            }
          }
        }

        // Fetch Player Props
        // try {
        //   context.log(`Fetching player props for event: ${apiGame.id}`);
        //   const propsResponse = await axios.get(
        //     `https://api.the-odds-api.com/v4/sports/soccer_epl/events/${apiGame.id}/odds/?apiKey=${apiKey}&regions=us&markets=player_goal_scorer_anytime`,
        //   );

        //   const propsData = propsResponse.data;

        //   if (propsData.bookmakers && propsData.bookmakers.length > 0) {
        //     const propsBookmaker = propsData.bookmakers[0];

        //     for (const market of propsBookmaker.markets) {
        //       if (market.key !== 'player_goal_scorer_anytime') continue;

        //       const marketId = await getOrCreateMarket(
        //         pool,
        //         eventId,
        //         market.key,
        //       );

        //       for (const outcome of market.outcomes) {
        //         const playerLabel = outcome.description || outcome.name;

        //         await upsertSelection(
        //           pool,
        //           marketId,
        //           playerLabel,
        //           outcome.price,
        //           outcome.point ?? null,
        //         );
        //       }
        //     }
        //   }
        // } catch (propError) {
        //   context.error(
        //     `Could not fetch props for game ${apiGame.id}:`,
        //     propError.message,
        //   );
        // }
      }
      context.log('✅ Odds ingestion completed successfully.');
    } catch (error) {
      context.error('❌ Error during odds ingestion:', error);
    }
  },
});
