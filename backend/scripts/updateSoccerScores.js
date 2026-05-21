import sql from 'mssql';
import axios from 'axios';
import fs from 'fs';

// 1. Manually load Azure's local.settings.json into process.env BEFORE connecting
try {
  const settingsPath = './local.settings.json'; // Make sure this path points to your file!
  if (fs.existsSync(settingsPath)) {
    const rawData = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(rawData);
    if (settings.Values) {
      Object.assign(process.env, settings.Values);
      console.log('✅ Loaded environment variables from local.settings.json');
    }
  }
} catch (err) {
  console.warn('Could not load local.settings.json');
  console.error(err);
}

const EPL_LEAGUE_NAME = 'English Premier League';

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

function formatEspnDateUtc(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** ESPN scoreboard is date-scoped; pull today and the previous 6 UTC days (7 days total). */
async function fetchEplScoreboardEvents7Days() {
  const merged = [];
  const seenIds = new Set();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - dayOffset);
    const dates = formatEspnDateUtc(d);

    console.log(`Fetching ESPN scores for UTC date: ${dates}...`);
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${dates}`;

    try {
      const response = await axios.get(url);
      const batch = response.data?.events || [];
      for (const ev of batch) {
        if (ev?.id != null && !seenIds.has(ev.id)) {
          seenIds.add(ev.id);
          merged.push(ev);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch data for date ${dates}:`, err.message);
    }
  }

  return merged;
}

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

async function runManualSync() {
  console.log('==================================================');
  console.log('🚀 Starting Manual 7-Day Score Sync...');
  console.log('==================================================');

  try {
    // 2. DYNAMICALLY IMPORT YOUR DB FILES HERE!
    // This ensures process.env is fully loaded before db-connect.js ever runs.
    const { poolPromise } = await import('../components/db-connect.js');
    const { gradeEventSelections } =
      await import('../evaluation/globalGrading.js');

    const pool = await poolPromise;
    const espnEvents = await fetchEplScoreboardEvents7Days();

    if (!espnEvents || espnEvents.length === 0) {
      console.log('No events found in the last 7 days.');
      process.exit(0);
    }

    console.log(
      `Found ${espnEvents.length} distinct events across the 7-day window. Processing...`,
    );

    for (const espnGame of espnEvents) {
      const competitors = espnGame.competitions[0].competitors;

      const homeTeamObj = competitors.find((c) => c.homeAway === 'home');
      const awayTeamObj = competitors.find((c) => c.homeAway === 'away');

      const rawHomeName = homeTeamObj.team.name;
      const rawAwayName = awayTeamObj.team.name;

      const homeTeamId = await getTeamId(pool, rawHomeName);
      const awayTeamId = await getTeamId(pool, rawAwayName);

      if (!homeTeamId || !awayTeamId) {
        console.log(
          `⚠️  Could not resolve DB team IDs for: ${rawHomeName} vs ${rawAwayName}`,
        );
        continue;
      }

      const dbEvent = await findEventByTeamIds(
        pool,
        homeTeamId,
        awayTeamId,
        espnGame.date,
      );

      if (!dbEvent) {
        continue;
      }

      const isCompleted = espnGame.status.type.completed;
      const newStatus = isCompleted ? 'completed' : 'in_progress';

      const homeScore = parseInt(homeTeamObj.score, 10);
      const awayScore = parseInt(awayTeamObj.score, 10);

      const isNewlyCompleted =
        newStatus === 'completed' && dbEvent.status !== 'completed';

      if (espnGame.status.type.state !== 'pre') {
        await updateEventScore(
          pool,
          dbEvent.id,
          homeScore,
          awayScore,
          newStatus,
        );

        console.log(
          `✅ Updated DB Event ${dbEvent.id}: ${rawHomeName} ${homeScore} - ${awayScore} ${rawAwayName} (${newStatus})`,
        );

        if (isNewlyCompleted) {
          console.log(
            `🏁 Match Finalized: ${rawHomeName} vs ${rawAwayName}. Starting Grading...`,
          );

          try {
            await gradeEventSelections(
              pool,
              dbEvent.id,
              'soccer',
              homeScore,
              awayScore,
              rawHomeName,
              rawAwayName,
            );
            console.log(`🏆 Settlement Complete for Event: ${dbEvent.id}`);
          } catch (gradeError) {
            console.error(
              `❌ Critical Error grading event ${dbEvent.id}:`,
              gradeError,
            );
          }
        }
      }
    }

    console.log('==================================================');
    console.log('✨ 7-Day Score Sync completed successfully!');
    console.log('==================================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during manual score ingestion:', error);
    process.exit(1);
  }
}

// Execute the script
runManualSync();
