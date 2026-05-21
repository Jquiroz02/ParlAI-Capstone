import { app } from '@azure/functions';
import sql from 'mssql';
import { poolPromise } from '../../components/db-connect.js';
import { gradeEventSelections } from '../../evaluation/globalGrading.js';

const ESPN_MLB_SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard';

const MLB_LEAGUE_ID = 703;

// ── HELPERS ───────────────────────────────────────────────────────────────────

// Get or create a team in the teams table
async function getOrCreateTeam(pool, teamName, logoUrl) {
  // Try to find existing team for MLB league
  const res = await pool
    .request()
    .input('leagueId', sql.Int, MLB_LEAGUE_ID)
    .input('name', sql.NVarChar, teamName)
    .query('SELECT id FROM teams WHERE league_id = @leagueId AND name = @name');

  if (res.recordset.length > 0) return res.recordset[0].id;

  // Insert new team
  const insert = await pool
    .request()
    .input('leagueId', sql.Int, MLB_LEAGUE_ID)
    .input('name', sql.NVarChar, teamName)
    .input('logoUrl', sql.NVarChar, logoUrl || null)
    .query(
      'INSERT INTO teams (league_id, name, logo_url) OUTPUT INSERTED.id VALUES (@leagueId, @name, @logoUrl)',
    );

  return insert.recordset[0].id;
}

// Get or create an event in the events table
async function getOrCreateEvent(
  pool,
  homeTeamId,
  awayTeamId,
  startTime,
  apiId,
) {
  // Try to find by ESPN ID first
  let res = await pool
    .request()
    .input('apiId', sql.VarChar, apiId)
    .query('SELECT id, status FROM events WHERE api_id = @apiId');

  if (res.recordset.length > 0) return res.recordset[0];

  // Try to find by teams + date
  res = await pool
    .request()
    .input('leagueId', sql.Int, MLB_LEAGUE_ID)
    .input('homeTeamId', sql.Int, homeTeamId)
    .input('awayTeamId', sql.Int, awayTeamId)
    .input('startTime', sql.DateTime2, new Date(startTime)).query(`
      SELECT id, status FROM events
      WHERE league_id = @leagueId
        AND home_team_id = @homeTeamId
        AND away_team_id = @awayTeamId
        AND ABS(DATEDIFF(day, start_time, @startTime)) <= 1
    `);

  if (res.recordset.length > 0) {
    // Update api_id
    await pool
      .request()
      .input('id', sql.BigInt, res.recordset[0].id)
      .input('apiId', sql.VarChar, apiId)
      .query('UPDATE events SET api_id = @apiId WHERE id = @id');
    return res.recordset[0];
  }

  // Create new event
  const insert = await pool
    .request()
    .input('leagueId', sql.Int, MLB_LEAGUE_ID)
    .input('homeTeamId', sql.Int, homeTeamId)
    .input('awayTeamId', sql.Int, awayTeamId)
    .input('startTime', sql.DateTime2, new Date(startTime))
    .input('apiId', sql.VarChar, apiId).query(`
      INSERT INTO events (league_id, home_team_id, away_team_id, start_time, status, api_id)
      OUTPUT INSERTED.id
      VALUES (@leagueId, @homeTeamId, @awayTeamId, @startTime, 'scheduled', @apiId)
    `);

  return { id: insert.recordset[0].id, status: 'scheduled' };
}

// Get or create a market
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

// Upsert a selection (odds)
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
        UPDATE SET odds = @odds, line_value = @lineValue
      WHEN NOT MATCHED THEN
        INSERT (market_id, label, odds, line_value, result)
        VALUES (@marketId, @label, @odds, @lineValue, 'pending')
      OUTPUT INSERTED.id;
    `);

  return res.recordset[0].id;
}

// Update score and status
async function updateEventScore(pool, eventId, homeScore, awayScore, status) {
  await pool
    .request()
    .input('eventId', sql.BigInt, eventId)
    .input('homeScore', sql.Int, homeScore)
    .input('awayScore', sql.Int, awayScore)
    .input('status', sql.VarChar, status).query(`
      UPDATE events
      SET home_score = @homeScore, away_score = @awayScore, status = @status
      WHERE id = @eventId
    `);
}

// Seeded odds generator (no external odds API needed for now)
function generateOdds(espnId, homeAway) {
  const seed = [...espnId].reduce((a, c) => a + c.charCodeAt(0), 0) / 10000;
  const base = homeAway === 'home' ? 1.4 + seed * 0.8 : 1.4 + (1 - seed) * 0.8;
  return parseFloat(Math.max(1.25, Math.min(2.8, base)).toFixed(4));
}

// ── TIMER FUNCTION ────────────────────────────────────────────────────────────

app.timer('mlb-ingest', {
  schedule: '0 */10 * * * *', // Every 10 minutes
  handler: async (myTimer, context) => {
    context.log('MLB ingest timer fired at:', new Date().toISOString());

    try {
      const pool = await poolPromise;

      const res = await fetch(ESPN_MLB_SCOREBOARD);
      if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);
      const data = await res.json();

      const events = data.events ?? [];
      context.log(`Fetched ${events.length} MLB events from ESPN`);

      for (const event of events) {
        const comp = event.competitions?.[0];
        const home = comp?.competitors?.find((c) => c.homeAway === 'home');
        const away = comp?.competitors?.find((c) => c.homeAway === 'away');

        if (!home || !away) continue;

        const espnId = event.id;
        const homeTeamName = home.team.displayName;
        const awayTeamName = away.team.displayName;
        const homeLogo = home.team.logo || null;
        const awayLogo = away.team.logo || null;
        const homeScore =
          home.score !== undefined ? parseInt(home.score) : null;
        const awayScore =
          away.score !== undefined ? parseInt(away.score) : null;
        const statusState = event.status?.type?.state ?? 'pre';
        const isCompleted = event.status?.type?.completed ?? false;
        const startTime = new Date(event.date);

        const dbStatus = isCompleted
          ? 'completed'
          : statusState === 'in'
            ? 'in_progress'
            : 'scheduled';

        // 1. Get or create teams
        const homeTeamId = await getOrCreateTeam(pool, homeTeamName, homeLogo);
        const awayTeamId = await getOrCreateTeam(pool, awayTeamName, awayLogo);

        // 2. Get or create event
        const dbEvent = await getOrCreateEvent(
          pool,
          homeTeamId,
          awayTeamId,
          startTime,
          espnId,
        );

        // 3. Upsert moneyline market
        const homeOdds = generateOdds(espnId, 'home');
        const awayOdds = generateOdds(espnId, 'away');

        const h2hMarketId = await getOrCreateMarket(pool, dbEvent.id, 'h2h');
        await upsertSelection(pool, h2hMarketId, homeTeamName, homeOdds, null);
        await upsertSelection(pool, h2hMarketId, awayTeamName, awayOdds, null);

        // 4. Upsert totals market (Over/Under 8.5 runs)
        const totalsMarketId = await getOrCreateMarket(
          pool,
          dbEvent.id,
          'totals',
        );
        await upsertSelection(pool, totalsMarketId, `Over`, 1.9, 8.5);
        await upsertSelection(pool, totalsMarketId, `Under`, 1.9, 8.5);

        // 5. Update scores if game has started
        if (statusState !== 'pre' && homeScore !== null && awayScore !== null) {
          const wasCompleted = dbEvent.status === 'completed';
          await updateEventScore(
            pool,
            dbEvent.id,
            homeScore,
            awayScore,
            dbStatus,
          );

          context.log(
            `Updated: ${homeTeamName} ${homeScore} - ${awayScore} ${awayTeamName} (${dbStatus})`,
          );

          // 6. Grade and settle bets if game just finished
          if (isCompleted && !wasCompleted) {
            context.log(
              `Game finished: ${homeTeamName} vs ${awayTeamName}. Grading bets...`,
            );
            try {
              await gradeEventSelections(
                pool,
                dbEvent.id,
                'mlb',
                homeScore,
                awayScore,
                homeTeamName,
                awayTeamName,
              );
              context.log(`Settlement complete for event: ${dbEvent.id}`);
            } catch (gradeError) {
              context.error(`Error grading event ${dbEvent.id}:`, gradeError);
            }
          }
        }
      }

      context.log(`MLB ingest complete for ${events.length} events`);
    } catch (error) {
      context.error('MLB ingest error:', error);
    }
  },
});
