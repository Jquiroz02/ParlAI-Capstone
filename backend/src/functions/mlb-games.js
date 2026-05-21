// import { app } from '@azure/functions';
// import sql from 'mssql';

// const MLB_LEAGUE_ID = 703;

// const sqlConfig = {
//   server: process.env.DB_SERVER,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   options: { encrypt: true, trustServerCertificate: false },
// };

// app.http('mlb-games', {
//   methods: ['GET'],
//   route: 'mlb/games',
//   authLevel: 'anonymous',
//   handler: async (request, context) => {
//     try {
//       const pool = await sql.connect(sqlConfig);

//       // Fetch games from 2 days ago up to 14 days in the future
//       const start = new Date();
//       start.setDate(start.getDate() - 2);
//       const end = new Date();
//       end.setDate(end.getDate() + 14);

//       const result = await pool
//         .request()
//         .input('leagueId', sql.Int, MLB_LEAGUE_ID)
//         .input('startDate', sql.DateTime2, start)
//         .input('endDate', sql.DateTime2, end).query(`
//           SELECT
//             id, espn_id, league_id,
//             home_team, away_team, home_abbr, away_abbr,
//             home_logo, away_logo, home_color, away_color,
//             home_score, away_score, status, start_time, inning,
//             home_ml_odds, away_ml_odds, over_odds, under_odds, total_line,
//             updated_at
//           FROM mlb_events
//           WHERE league_id = @leagueId
//             AND start_time >= @startDate
//             AND start_time <= @endDate
//           ORDER BY start_time ASC
//         `);

//       const games = result.recordset.map((row) => ({
//         id: row.espn_id,
//         dbId: row.id,
//         leagueId: row.league_id,
//         sport: 'mlb',
//         homeTeam: row.home_team,
//         awayTeam: row.away_team,
//         homeAbbr: row.home_abbr,
//         awayAbbr: row.away_abbr,
//         homeLogo: row.home_logo,
//         awayLogo: row.away_logo,
//         homeColor: row.home_color,
//         awayColor: row.away_color,
//         homeScore: row.home_score,
//         awayScore: row.away_score,
//         status: row.status,
//         startTime: row.start_time,
//         inning: row.inning,
//         gameName: `${row.away_team} @ ${row.home_team}`,
//         h2hPicks: {
//           home: {
//             id: `${row.espn_id}_ml_home`,
//             label: row.home_team,
//             odds: parseFloat(row.home_ml_odds),
//           },
//           away: {
//             id: `${row.espn_id}_ml_away`,
//             label: row.away_team,
//             odds: parseFloat(row.away_ml_odds),
//           },
//         },
//         totalsPicks: {
//           over: {
//             id: `${row.espn_id}_over`,
//             odds: parseFloat(row.over_odds),
//             lineValue: parseFloat(row.total_line),
//           },
//           under: {
//             id: `${row.espn_id}_under`,
//             odds: parseFloat(row.under_odds),
//             lineValue: parseFloat(row.total_line),
//           },
//         },
//         totalLine: parseFloat(row.total_line),
//         overOdds: parseFloat(row.over_odds),
//         underOdds: parseFloat(row.under_odds),
//         updatedAt: row.updated_at,
//       }));

//       return { status: 200, jsonBody: games };
//     } catch (error) {
//       context.error('Error fetching MLB games:', error);
//       return { status: 500, jsonBody: { error: 'Internal Server Error' } };
//     }
//   },
// });
