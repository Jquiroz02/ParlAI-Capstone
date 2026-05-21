import { app } from '@azure/functions';
import sql from 'mssql';

const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl';
const SLEEPER_STATS_URL = (id) =>
  `https://api.sleeper.app/stats/nfl/player/${id}?season_type=regular&season=2025`;

const TARGET_PLAYERS = [
  'Patrick Mahomes',
  'Josh Allen',
  'Lamar Jackson',
  'Joe Burrow',
  'Jalen Hurts',
  'Dak Prescott',
  'Jared Goff',
  'Brock Purdy',
  'Justin Herbert',
  'Tua Tagovailoa',
  'Jordan Love',
  'C.J. Stroud',
  'Caleb Williams',
  'Jayden Daniels',
  'Trevor Lawrence',
  'Kyler Murray',
  'Christian McCaffrey',
  'Saquon Barkley',
  'Derrick Henry',
  'Bijan Robinson',
  'Jahmyr Gibbs',
  "De'Von Achane",
  'Breece Hall',
  'Jonathan Taylor',
  'Josh Jacobs',
  'James Cook',
  'Isiah Pacheco',
  'Travis Etienne',
  'Kyren Williams',
  'Najee Harris',
  'Tyreek Hill',
  'CeeDee Lamb',
  "Ja'Marr Chase",
  'Justin Jefferson',
  'Amon-Ra St. Brown',
  'A.J. Brown',
  'Davante Adams',
  'DK Metcalf',
  'Jaylen Waddle',
  'Garrett Wilson',
  'Stefon Diggs',
  'Mike Evans',
  'Tee Higgins',
  'Puka Nacua',
  'DeVonta Smith',
  'Marvin Harrison',
  'George Pickens',
  'Rashee Rice',
  'Drake London',
  'Chris Olave',
];

const NFL_LEAGUE_ID = 701; // ID of NFL in the leagues table

const sqlConfig = {
  server: process.env.DB_SERVER,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: false },
};

app.http('nfl-players', {
  methods: ['GET'],
  route: 'nfl/players',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const pool = await sql.connect(sqlConfig);

      // Check if we already have fresh NFL player data in DB (within 24hrs)
      const existing = await pool.request().query(`
        SELECT p.id, p.sleeper_id, p.name, p.position, p.team,
               ps.pass_yd, ps.pass_td, ps.rush_yd, ps.rush_td,
               ps.rec_yd, ps.rec_td, ps.receptions, ps.updated_at
        FROM nfl_players p
        LEFT JOIN nfl_player_stats ps ON ps.player_id = p.id
        WHERE ps.updated_at >= DATEADD(hour, -24, SYSDATETIME())
      `);

      if (existing.recordset.length > 0) {
        context.log('Returning cached NFL players from DB');
        return { status: 200, jsonBody: existing.recordset };
      }

      // Fetch fresh data from Sleeper API
      context.log('Fetching fresh NFL players from Sleeper API...');
      const playersRes = await fetch(SLEEPER_PLAYERS_URL);
      if (!playersRes.ok) throw new Error('Failed to fetch Sleeper players');
      const allPlayers = await playersRes.json();

      // Filter to target players only
      const targets = [];
      Object.entries(allPlayers).forEach(([id, p]) => {
        if (!p.full_name || !p.position || !p.team) return;
        if (!['QB', 'RB', 'WR', 'TE'].includes(p.position)) return;
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

      // Upsert players and stats into DB
      for (const p of players) {
        // Upsert player — include league_id linking to NFL (701)
        const playerResult = await pool
          .request()
          .input('sleeperId', sql.NVarChar, p.sleeperId)
          .input('name', sql.NVarChar, p.name)
          .input('position', sql.NVarChar, p.pos)
          .input('team', sql.NVarChar, p.team)
          .input('leagueId', sql.Int, NFL_LEAGUE_ID).query(`
            MERGE nfl_players AS target
            USING (SELECT @sleeperId AS sleeper_id) AS source
            ON target.sleeper_id = source.sleeper_id
            WHEN MATCHED THEN
              UPDATE SET name = @name, position = @position, team = @team
            WHEN NOT MATCHED THEN
              INSERT (sleeper_id, name, position, team, league_id)
              VALUES (@sleeperId, @name, @position, @team, @leagueId);
            SELECT id FROM nfl_players WHERE sleeper_id = @sleeperId;
          `);

        const playerId = playerResult.recordset[0].id;
        const s = p.stats;

        // Upsert stats
        await pool
          .request()
          .input('playerId', sql.Int, playerId)
          .input('passYd', sql.Decimal(10, 2), s.pass_yd ?? null)
          .input('passTd', sql.Decimal(10, 2), s.pass_td ?? null)
          .input('rushYd', sql.Decimal(10, 2), s.rush_yd ?? null)
          .input('rushTd', sql.Decimal(10, 2), s.rush_td ?? null)
          .input('recYd', sql.Decimal(10, 2), s.rec_yd ?? null)
          .input('recTd', sql.Decimal(10, 2), s.rec_td ?? null)
          .input('rec', sql.Decimal(10, 2), s.rec ?? null).query(`
            MERGE nfl_player_stats AS target
            USING (SELECT @playerId AS player_id) AS source
            ON target.player_id = source.player_id
            WHEN MATCHED THEN
              UPDATE SET pass_yd=@passYd, pass_td=@passTd, rush_yd=@rushYd,
                         rush_td=@rushTd, rec_yd=@recYd, rec_td=@recTd,
                         receptions=@rec, updated_at=SYSDATETIME()
            WHEN NOT MATCHED THEN
              INSERT (player_id, pass_yd, pass_td, rush_yd, rush_td, rec_yd, rec_td, receptions, updated_at)
              VALUES (@playerId, @passYd, @passTd, @rushYd, @rushTd, @recYd, @recTd, @rec, SYSDATETIME());
          `);
      }

      // Return fresh data
      const fresh = await pool.request().query(`
        SELECT p.id, p.sleeper_id, p.name, p.position, p.team,
               ps.pass_yd, ps.pass_td, ps.rush_yd, ps.rush_td,
               ps.rec_yd, ps.rec_td, ps.receptions, ps.updated_at
        FROM nfl_players p
        LEFT JOIN nfl_player_stats ps ON ps.player_id = p.id
        WHERE ps.updated_at >= DATEADD(hour, -24, SYSDATETIME())
      `);

      return { status: 200, jsonBody: fresh.recordset };
    } catch (error) {
      context.error('Error in nfl-players:', error);
      return { status: 500, jsonBody: { error: 'Internal Server Error' } };
    }
  },
});
