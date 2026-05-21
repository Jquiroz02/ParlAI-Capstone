import { app } from '@azure/functions';
import sql from 'mssql';
import axios from 'axios';
import { poolPromise } from '../../components/db-connect.js';

function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

async function getOrCreateLeague(pool, { name, country, sport, logoUrl }) {
  const existing = await pool
    .request()
    .input('name', sql.NVarChar, name)
    .query('SELECT TOP 1 id FROM leagues WHERE name = @name');

  if (existing.recordset.length > 0) return existing.recordset[0].id;

  // Prefer inserting the richer schema (newer DB), but fall back if columns don't exist.
  try {
    const created = await pool
      .request()
      .input('name', sql.NVarChar, name)
      .input('country', sql.NVarChar, country)
      .input('logoUrl', sql.NVarChar, logoUrl)
      .input('sport', sql.NVarChar, sport).query(`
        INSERT INTO leagues (name, country, logo_url, sport)
        OUTPUT INSERTED.id
        VALUES (@name, @country, @logoUrl, @sport)
      `);
    return created.recordset[0].id;
  } catch {
    const created = await pool
      .request()
      .input('name', sql.NVarChar, name)
      .input('country', sql.NVarChar, country).query(`
        INSERT INTO leagues (name, country)
        OUTPUT INSERTED.id
        VALUES (@name, @country)
      `);
    return created.recordset[0].id;
  }
}

async function getOrCreateTeam(pool, leagueId, teamName) {
  const normalizedInput = normalizeName(teamName);
  const existing = await pool
    .request()
    .input('leagueId', sql.Int, leagueId)
    .input('normalizedName', sql.NVarChar, normalizedInput).query(`
      SELECT TOP 1 id
      FROM teams
      WHERE league_id = @leagueId
        AND REPLACE(LOWER(name), ' ', '') LIKE '%' + @normalizedName + '%'
    `);

  if (existing.recordset.length > 0) return existing.recordset[0].id;

  try {
    const created = await pool
      .request()
      .input('leagueId', sql.Int, leagueId)
      .input('name', sql.NVarChar, teamName)
      .input('logoUrl', sql.NVarChar, null).query(`
        INSERT INTO teams (league_id, name, logo_url)
        OUTPUT INSERTED.id
        VALUES (@leagueId, @name, @logoUrl)
      `);
    return created.recordset[0].id;
  } catch {
    const created = await pool
      .request()
      .input('leagueId', sql.Int, leagueId)
      .input('name', sql.NVarChar, teamName).query(`
        INSERT INTO teams (league_id, name)
        OUTPUT INSERTED.id
        VALUES (@leagueId, @name)
      `);
    return created.recordset[0].id;
  }
}

async function getOrCreateEvent(
  pool,
  leagueId,
  homeTeamId,
  awayTeamId,
  startTime,
  apiId,
) {
  // Try by Odds API event id first.
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

  // Fallback: same teams around same date.
  res = await pool
    .request()
    .input('leagueId', sql.Int, leagueId)
    .input('homeTeamId', sql.Int, homeTeamId)
    .input('awayTeamId', sql.Int, awayTeamId)
    .input('startTime', sql.DateTime2, new Date(startTime)).query(`
      SELECT TOP 1 id
      FROM events
      WHERE league_id = @leagueId
        AND home_team_id = @homeTeamId
        AND away_team_id = @awayTeamId
        AND ABS(DATEDIFF(day, start_time, @startTime)) <= 5
    `);

  if (res.recordset.length > 0) {
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

  // Brand new.
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

async function shouldFetchOdds(pool, leagueId) {
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
  if (!nextGameTime) return true;

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setUTCDate(threeDaysFromNow.getUTCDate() + 3);
  return new Date(nextGameTime) <= threeDaysFromNow;
}

async function ingestNbaOdds(context) {
  const apiKey = (process.env.ODDS_API_KEY || '').trim();
  if (!apiKey) {
    context.log(
      'Missing ODDS_API_KEY. Set it in Azure Static Web Apps application settings (backend).',
    );
    return;
  }

  const pool = await poolPromise;

  // Ensure the league exists so getGames can filter it.
  const leagueId = await getOrCreateLeague(pool, {
    name: 'NBA',
    country: 'USA',
    sport: 'basketball',
    logoUrl: null,
  });

  const okToFetch = await shouldFetchOdds(pool, leagueId);
  if (!okToFetch) {
    context.log(
      'Gatekeeper: next NBA game is more than 3 days away. Skipping odds fetch.',
    );
    return;
  }

  const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=decimal`;
  const response = await axios.get(url);
  const apiGames = response.data;

  if (!apiGames || apiGames.length === 0) {
    context.log('Odds API returned 0 NBA games. Exiting early.');
    return;
  }

  for (const apiGame of apiGames) {
    const homeName = apiGame.home_team;
    const awayName = apiGame.away_team;
    const startTime = apiGame.commence_time;
    const apiId = apiGame.id;

    if (!homeName || !awayName || !startTime || !apiId) continue;

    const homeTeamId = await getOrCreateTeam(pool, leagueId, homeName);
    const awayTeamId = await getOrCreateTeam(pool, leagueId, awayName);

    const eventId = await getOrCreateEvent(
      pool,
      leagueId,
      homeTeamId,
      awayTeamId,
      startTime,
      apiId,
    );

    const bookmakers = apiGame.bookmakers || [];
    if (bookmakers.length === 0) continue;

    // Use the first bookmaker as the primary feed (consistent + cheapest).
    const book = bookmakers[0];
    const markets = book.markets || [];

    for (const m of markets) {
      const type = m.key; // h2h, spreads, totals
      if (!type) continue;

      const marketId = await getOrCreateMarket(pool, eventId, type);

      for (const o of m.outcomes || []) {
        // For totals/spreads, Odds API includes `point` for line value.
        const label = o.name;
        const odds = Number(o.price);
        const lineValue = o.point != null ? Number(o.point) : null;
        if (!label || Number.isNaN(odds)) continue;

        await upsertSelection(pool, marketId, label, odds, lineValue);
      }
    }
  }

  context.log(
    `✅ NBA odds ingestion complete. Upserted ${apiGames.length} games.`,
  );
}

app.timer('ingestNbaOddsTimer', {
  schedule: '0 15 */4 * * *', // every 4 hours (offset from soccer)
  handler: async (myTimer, context) => {
    context.log('NBA odds timer running at:', new Date().toISOString());
    try {
      await ingestNbaOdds(context);
    } catch (err) {
      context.error('NBA odds ingestion failed:', err);
    }
  },
});

// Optional manual trigger for testing locally: GET /api/nba/odds/ingest
app.http('ingestNbaOdds', {
  methods: ['GET'],
  route: 'nba/odds/ingest',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      await ingestNbaOdds(context);
      return { status: 200, jsonBody: { ok: true } };
    } catch (err) {
      context.error('Manual NBA odds ingestion failed:', err);
      return { status: 500, jsonBody: { error: 'Failed to ingest NBA odds.' } };
    }
  },
});
