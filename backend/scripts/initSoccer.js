//Seeds team data for EPL to test out
import sql from 'mssql';

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

const seedDatabase = async () => {
  try {
    console.log('Fetching data from API...');
    const response = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams',
    );
    const apiData = await response.json();

    console.log('Connecting to database...');
    const pool = await sql.connect(dbConfig);

    // Loop through sports
    for (const sport of apiData.sports) {
      const sportName = sport.name;

      // Loop through leagues
      for (const league of sport.leagues) {
        const leagueId = league.id;
        const leagueName = league.name;
        const country = 'England';
        const leagueLogo =
          'https://cdn.freebiesupply.com/images/large/2x/premier-league-logo-black-and-white.png';

        try {
          await pool
            .request()
            .input('id', sql.Int, leagueId)
            .input('name', sql.NVarChar, leagueName)
            .input('country', sql.NVarChar, country)
            .input('logoUrl', sql.NVarChar, leagueLogo)
            .input('sport', sql.NVarChar, sportName).query(`
              SET IDENTITY_INSERT Leagues ON; 
              
              INSERT INTO Leagues (id, name, country, logo_url, sport) 
              VALUES (@id, @name, @country, @logoUrl, @sport);
              
              SET IDENTITY_INSERT Leagues OFF;
            `);
          console.log(`🏆 Inserted League: ${leagueName}`);
        } catch (err) {
          if (err.number === 2627)
            console.log(`⚠️ League ${leagueName} already exists.`);
          else throw err;
        }

        // Loop through teams inside this league
        for (const teamWrapper of league.teams) {
          const team = teamWrapper.team;
          const teamId = team.id;
          const teamName = team.name;
          const teamLogoUrl = team.logos?.[0]?.href || null;

          try {
            // Insert the Team
            await pool
              .request()
              .input('id', sql.Int, teamId)
              .input('league_id', sql.Int, leagueId)
              .input('name', sql.NVarChar, teamName)
              .input('logoUrl', sql.NVarChar, teamLogoUrl).query(`
                SET IDENTITY_INSERT Teams ON;

                INSERT INTO Teams (id, league_id, name, logo_url) 
                VALUES (@id, @league_id, @name, @logoUrl);

                SET IDENTITY_INSERT Teams OFF;
              `);
            console.log(`   ✅ Inserted Team: ${teamName}`);
          } catch (err) {
            if (err.number === 2627)
              console.log(`   ⚠️ Team ${teamName} already exists.`);
            else console.error(`   ❌ Failed Team ${teamName}:`, err.message);
          }
        }
      }
    }

    console.log('\n🎉 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Fatal Error:', error);
    process.exit(1);
  }
};

seedDatabase();
