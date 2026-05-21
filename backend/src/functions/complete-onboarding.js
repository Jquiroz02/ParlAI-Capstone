// User can set their nickname and favorite teams after account creation
import { app } from '@azure/functions';
import sql from 'mssql';

const sqlConfig = {
  server: process.env.DB_SERVER,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: false },
};

app.http('complete-onboarding', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      // Grab the secure header
      const header = request.headers.get('x-ms-client-principal');

      if (!header) {
        return {
          status: 401,
          jsonBody: { error: 'Unauthorized. Please log in.' },
        };
      }

      // Decode it (Swapped "ascii" to "utf-8" just to be safe)
      const encoded = Buffer.from(header, 'base64');
      const decoded = encoded.toString('utf-8');
      const clientPrincipal = JSON.parse(decoded);

      const azureUserId = clientPrincipal.userId;
      const body = await request.json();
      const { nickname, teamIds } = body;

      const pool = await sql.connect(sqlConfig);

      // Update the user's nickname and onboarding stage
      const userResult = await pool
        .request()
        .input('azureUserId', sql.NVarChar, azureUserId)
        .input('nickname', sql.NVarChar, nickname).query(`
            UPDATE users 
            SET nickname = @nickname, onboarding_stage = 1 
            OUTPUT INSERTED.id
            WHERE azure_user_id = @azureUserId
        `);

      // If the user wasn't found in the DB, stop here
      if (userResult.recordset.length === 0) {
        return {
          status: 404,
          jsonBody: { error: 'User profile not found in database.' },
        };
      }

      const dbUserId = userResult.recordset[0].id;

      await pool
        .request()
        .input('userId', sql.BigInt, dbUserId)
        .query(`DELETE FROM user_favorite_teams WHERE user_id = @userId`);

      // Insert the favorite teams
      for (const teamId of teamIds) {
        await pool
          .request()
          .input('userId', sql.BigInt, dbUserId)
          .input('teamId', sql.Int, teamId).query(`
                INSERT INTO user_favorite_teams (user_id, team_id) 
                VALUES (@userId, @teamId)
          `);
      }

      return { status: 200, jsonBody: { message: 'Onboarding complete!' } };
    } catch (error) {
      context.error('Error saving onboarding:', error);

      if (error.number === 2627) {
        return {
          status: 409,
          jsonBody: {
            error: 'That nickname is already taken! Please choose another one.',
          },
        };
      }

      return { status: 500, jsonBody: { error: 'Failed to save profile.' } };
    }
  },
});
