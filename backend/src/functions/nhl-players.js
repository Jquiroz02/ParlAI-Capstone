import { app } from '@azure/functions';
import sql from 'mssql';

const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nhl';
const SLEEPER_STATS_URL = (id) =>
  `https://api.sleeper.app/stats/nhl/player/${id}?season_type=regular&season=2024`;

const TARGET_PLAYERS = [
  'Connor McDavid',
  'Nathan MacKinnon',
  'Auston Matthews',
  'Leon Draisaitl',
  'David Pastrnak',
  'Cale Makar',
  'Nikita Kucherov',
  'Sidney Crosby',
  'Alex Ovechkin',
  'Artemi Panarin',
  'Mitch Marner',
  'William Nylander',
  'Matthew Tkachuk',
  'Brady Tkachuk',
  'Mikko Rantanen',
  'Elias Pettersson',
  'Jack Hughes',
  'Quinn Hughes',
  'Brayden Point',
  'Andrei Vasilevskiy',
  'Igor Shesterkin',
  'Jake Oettinger',
  'Juuse Saros',
  'Linus Ullmark',
  'Frederik Andersen',
  'Kyle Connor',
  'Mark Scheifele',
  'Sebastian Aho',
  'Tage Thompson',
  'Jason Robertson',
  'Roope Hintz',
  'Kirill Kaprizov',
  'Sam Reinhart',
  'Aleksander Barkov',
  'Sam Bennett',
  'Evan Bouchard',
  'Adam Fox',
  'Rasmus Dahlin',
  'Roman Josi',
  'Victor Hedman',
];

const sqlConfig = {
  server: process.env.DB_SERVER,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: false },
};

app.http('nhl-players', {
  methods: ['GET'],
  route: 'nhl/players',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const pool = await sql.connect(sqlConfig);

      // Check if we already have fresh NHL player data in DB (within 24hrs)
      const existing = await pool.request().query(`
        SELECT p.id, p.sleeper_id, p.name, p.position, p.team,
               ps.goals, ps.assists, ps.points, ps.shots,
               ps.plus_minus, ps.toi_per_game, ps.updated_at
        FROM nhl_players p
        LEFT JOIN nhl_player_stats ps ON ps.player_id = p.id
        WHERE ps.updated_at >= DATEADD(hour, -24, SYSDATETIME())
      `);

      if (existing.recordset.length > 0) {
        context.log('Returning cached NHL players from DB');
        return { status: 200, jsonBody: existing.recordset };
      }

      // Fetch fresh data from Sleeper API
      context.log('Fetching fresh NHL players from Sleeper API...');
      const playersRes = await fetch(SLEEPER_PLAYERS_URL);
      if (!playersRes.ok)
        throw new Error('Failed to fetch Sleeper NHL players');
      const allPlayers = await playersRes.json();

      // Filter to target players only
      const targets = [];
      Object.entries(allPlayers).forEach(([id, p]) => {
        if (!p.full_name || !p.position || !p.team) return;
        const isTarget = TARGET_PLAYERS.some(
          (name) =>
            p.full_name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(p.full_name.toLowerCase()),
        );
        if (!isTarget) return;
        targets.push({
          sleeperId: id,
          name: p.full_name,
          pos: p.position,
          team: p.team,
        });
      });

      // Fetch stats for each player
      const statsResults = await Promise.allSettled(
        targets.map(async (p) => {
          const res = await fetch(SLEEPER_STATS_URL(p.sleeperId));
          if (!res.ok) return { ...p, stats: null };
          const data = await res.json();
          return { ...p, stats: data?.stats ?? null };
        }),
      );

      const players = statsResults
        .filter((r) => r.status === 'fulfilled' && r.value.stats)
        .map((r) => r.value);

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

      // Upsert players and stats into DB
      for (const p of players) {
        const playerResult = await pool
          .request()
          .input('sleeperId', sql.NVarChar, p.sleeperId)
          .input('name', sql.NVarChar, p.name)
          .input('position', sql.NVarChar, p.pos)
          .input('team', sql.NVarChar, p.team)
          .input('leagueId', sql.Int, leagueId).query(`
            MERGE nhl_players AS target
            USING (SELECT @sleeperId AS sleeper_id) AS source
            ON target.sleeper_id = source.sleeper_id
            WHEN MATCHED THEN
              UPDATE SET name = @name, position = @position, team = @team
            WHEN NOT MATCHED THEN
              INSERT (sleeper_id, name, position, team, league_id)
              VALUES (@sleeperId, @name, @position, @team, @leagueId);
            SELECT id FROM nhl_players WHERE sleeper_id = @sleeperId;
          `);

        const playerId = playerResult.recordset[0].id;
        const s = p.stats;

        // Upsert stats
        await pool
          .request()
          .input('playerId', sql.Int, playerId)
          .input('goals', sql.Decimal(10, 2), s.goals ?? null)
          .input('assists', sql.Decimal(10, 2), s.assists ?? null)
          .input('points', sql.Decimal(10, 2), s.pts ?? s.points ?? null)
          .input('shots', sql.Decimal(10, 2), s.shots ?? null)
          .input('plusMinus', sql.Decimal(10, 2), s.plus_minus ?? null)
          .input('toiPerGame', sql.Decimal(10, 2), s.toi_per_game ?? null)
          .query(`
            MERGE nhl_player_stats AS target
            USING (SELECT @playerId AS player_id) AS source
            ON target.player_id = source.player_id
            WHEN MATCHED THEN
              UPDATE SET goals=@goals, assists=@assists, points=@points,
                         shots=@shots, plus_minus=@plusMinus,
                         toi_per_game=@toiPerGame, updated_at=SYSDATETIME()
            WHEN NOT MATCHED THEN
              INSERT (player_id, goals, assists, points, shots, plus_minus, toi_per_game, updated_at)
              VALUES (@playerId, @goals, @assists, @points, @shots, @plusMinus, @toiPerGame, SYSDATETIME());
          `);
      }

      // Return fresh data
      const fresh = await pool.request().query(`
        SELECT p.id, p.sleeper_id, p.name, p.position, p.team,
               ps.goals, ps.assists, ps.points, ps.shots,
               ps.plus_minus, ps.toi_per_game, ps.updated_at
        FROM nhl_players p
        LEFT JOIN nhl_player_stats ps ON ps.player_id = p.id
        WHERE ps.updated_at >= DATEADD(hour, -24, SYSDATETIME())
      `);

      return { status: 200, jsonBody: fresh.recordset };
    } catch (error) {
      context.error('Error in nhl-players:', error);
      return { status: 500, jsonBody: { error: 'Internal Server Error' } };
    }
  },
});
