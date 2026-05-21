import { app } from '@azure/functions';
import { poolPromise } from '../../components/db-connect.js';
app.http('teams', {
  methods: ['GET'],
  route: 'teams',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const pool = await poolPromise;

      // Fetch teams ordered by name
      const result = await pool.request().query(`
                SELECT id, name, logo_url as logoUrl, league_id 
                FROM teams 
                ORDER BY name ASC
            `);

      return {
        status: 200,
        jsonBody: result.recordset,
      };
    } catch (error) {
      context.error('Error fetching teams:', error);
      return { status: 500, jsonBody: { error: 'Internal Server Error' } };
    }
  },
});
