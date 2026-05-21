import { app } from '@azure/functions';
import sql from 'mssql';
import axios from 'axios';
import { poolPromise } from '../../components/db-connect.js';

import { gradeEventSelections } from '../../evaluation/globalGrading.js';

// Same normalization as soccer-odds-timer so ESPN scoreboard names resolve to the
// same team rows as Odds API names (e.g. "AFC Bournemouth" vs "Bournemouth").
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/ and | & /g, '')
    .replace(/[^a-z]/g, '');
}

async function getTeamId(pool, teamName) {
  const normalizedInput = normalizeName(teamName);
  const res = await pool
    .request()
    .input('normalizedName', sql.NVarChar, normalizedInput).query(`
      SELECT id 
      FROM teams 
      WHERE 
        REPLACE(LOWER(REPLACE(REPLACE(name, ' and ', ''), ' & ', '')), ' ', '') LIKE '%' + @normalizedName + '%'
        OR 
        @normalizedName LIKE '%' + REPLACE(LOWER(REPLACE(REPLACE(name, ' and ', ''), ' & ', '')), ' ', '') + '%'
    `);
  if (res.recordset.length > 0) return res.recordset[0].id;
  return null;
}

const EPL_LEAGUE_NAME = 'English Premier League';

/** Run score sync when EPL has any match that kicked off in the last 3 days (live, final, or missing scores). */
async function hasRecentOrLiveEplScoresToSync(pool) {
  const result = await pool
    .request()
    .input('leagueName', sql.NVarChar, EPL_LEAGUE_NAME).query(`
    SELECT COUNT(*) AS cnt
    FROM dbo.events e
    INNER JOIN dbo.leagues l ON e.league_id = l.id
    WHERE l.name = @leagueName
      AND e.start_time <= SYSUTCDATETIME()
      AND e.start_time >= DATEADD(day, -3, SYSUTCDATETIME())
  `);
  return result.recordset[0].cnt > 0;
}

function formatEspnDateUtc(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** ESPN scoreboard is date-scoped; pull today and the previous two UTC days so finals from the last 3 days are included. */
async function fetchEplScoreboardEvents() {
  const merged = [];
  const seenIds = new Set();

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - dayOffset);
    const dates = formatEspnDateUtc(d);
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${dates}`;
    const response = await axios.get(url);
    const batch = response.data?.events || [];
    for (const ev of batch) {
      if (ev?.id != null && !seenIds.has(ev.id)) {
        seenIds.add(ev.id);
        merged.push(ev);
      }
    }
  }

  return merged;
}

// Find a match using the same home/away team IDs as soccer-odds-timer (fuzzy team match + kickoff date).
async function findEventByTeamIds(pool, homeTeamId, awayTeamId, startTime) {
  const result = await pool
    .request()
    .input('homeTeamId', sql.Int, homeTeamId)
    .input('awayTeamId', sql.Int, awayTeamId)
    .input('startTime', sql.DateTime2, new Date(startTime))
    .input('leagueName', sql.NVarChar, EPL_LEAGUE_NAME).query(`
      SELECT e.id, e.status 
      FROM dbo.events e
      INNER JOIN dbo.leagues l ON e.league_id = l.id
      WHERE l.name = @leagueName
        AND e.home_team_id = @homeTeamId 
        AND e.away_team_id = @awayTeamId 
        AND CAST(e.start_time AS DATE) = CAST(@startTime AS DATE)
    `);

  if (result.recordset.length > 0) return result.recordset[0];
  return null;
}

// Update the score and status of the game
async function updateEventScore(pool, eventId, homeScore, awayScore, status) {
  await pool
    .request()
    .input('eventId', sql.BigInt, eventId)
    .input('homeScore', sql.Int, homeScore)
    .input('awayScore', sql.Int, awayScore)
    .input('status', sql.VarChar, status).query(`
      UPDATE dbo.events 
      SET home_score = @homeScore, 
          away_score = @awayScore, 
          status = @status
      WHERE id = @eventId
    `);
}

app.timer('ingestScoresTimer', {
  schedule: '0 */5 * * * *', // Every 5 minutes
  handler: async (myTimer, context) => {
    context.log(
      'Checking EPL scoreboard (last 3 UTC days + live) for DB sync via ESPN...',
    );

    try {
      const pool = await poolPromise;

      const shouldSync = await hasRecentOrLiveEplScoresToSync(pool);
      if (!shouldSync) {
        context.log(
          'Gatekeeper: No EPL events kicked off in the last 3 days. Skipping ESPN call.',
        );
        return;
      }

      const espnEvents = await fetchEplScoreboardEvents();

      if (!espnEvents || espnEvents.length === 0) return;

      // 3. Get the event based on the team names (event is from the odd-api function and team id is from espn-api)
      for (const espnGame of espnEvents) {
        const competitors = espnGame.competitions[0].competitors;

        const homeTeamObj = competitors.find((c) => c.homeAway === 'home');
        const awayTeamObj = competitors.find((c) => c.homeAway === 'away');

        const rawHomeName = homeTeamObj.team.name;
        const rawAwayName = awayTeamObj.team.name;

        const homeTeamId = await getTeamId(pool, rawHomeName);
        const awayTeamId = await getTeamId(pool, rawAwayName);
        if (!homeTeamId || !awayTeamId) continue;

        const dbEvent = await findEventByTeamIds(
          pool,
          homeTeamId,
          awayTeamId,
          espnGame.date,
        );

        if (!dbEvent) continue;

        // 5. Parse status and scores from API response
        const isCompleted = espnGame.status.type.completed;
        const newStatus = isCompleted ? 'completed' : 'in_progress';

        const homeScore = parseInt(homeTeamObj.score, 10);
        const awayScore = parseInt(awayTeamObj.score, 10);

        // 🎯 THE GATEKEEPER: Check if the game JUST finished this exact minute
        const isNewlyCompleted =
          newStatus === 'completed' && dbEvent.status !== 'completed';

        // 6. Update score and status in the events table
        if (espnGame.status.type.state !== 'pre') {
          await updateEventScore(
            pool,
            dbEvent.id,
            homeScore,
            awayScore,
            newStatus,
          );

          context.log(
            `✅ Updated: ${rawHomeName} ${homeScore} - ${awayScore} ${rawAwayName} (${newStatus})`,
          );

          // 7. 💰 TRIGGER SETTLEMENT & PAYOUTS
          if (isNewlyCompleted) {
            context.log(
              `🏁 Match Finalized: ${rawHomeName} vs ${rawAwayName}. Starting Grading...`,
            );

            try {
              // Grade all the selections for this event
              await gradeEventSelections(
                pool,
                dbEvent.id,
                'soccer',
                homeScore,
                awayScore,
                rawHomeName,
                rawAwayName,
              );

              context.log(`🏆 Settlement Complete for Event: ${dbEvent.id}`);
            } catch (gradeError) {
              context.error(
                `❌ Critical Error grading event ${dbEvent.id}:`,
                gradeError,
              );
            }
          }
        }
      }
    } catch (error) {
      context.error('Error during ESPN scores ingestion:', error);
    }
  },
});
