import { app } from '@azure/functions';
import sql from 'mssql';
import { poolPromise } from '../../components/db-connect.js';

app.http('user-me', {
  methods: ['GET'],
  route: 'user/me',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      // Grab the secure auth header
      const header = request.headers.get('x-ms-client-principal');

      if (!header) {
        return { status: 401, jsonBody: { error: 'Not logged in' } };
      }

      // Decode the header
      const encoded = Buffer.from(header, 'base64');
      const decoded = encoded.toString('ascii');
      const clientPrincipal = JSON.parse(decoded);

      context.log(
        'RAW CLIENT PRINCIPAL:',
        JSON.stringify(clientPrincipal, null, 2),
      );

      const { userId, userDetails, claims } = clientPrincipal;

      let finalUserId = userId;

      // If userId is null, try to find it in the raw claims array
      if (!finalUserId && claims) {
        const nameIdClaim = claims.find(
          (c) =>
            c.typ ===
              'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier' ||
            c.typ === 'sub',
        );
        if (nameIdClaim) finalUserId = nameIdClaim.val;
      }

      // If we literally have nothing, abort.
      if (!finalUserId) {
        return {
          status: 400,
          jsonBody: { error: 'Missing User ID from auth provider' },
        };
      }

      const pool = await poolPromise;

      // Check if the user already exists
      let result = await pool
        .request()
        .input('azureUserId', sql.NVarChar, finalUserId).query(`
                    SELECT id, nickname, email, onboarding_stage as onboardingStage, balance 
                    FROM users 
                    WHERE azure_user_id = @azureUserId
                `);

      let dbUser = result.recordset[0];

      // IF NEW USER: Insert them into the database automatically!
      if (!dbUser) {
        const startingBalance = 1000.0;

        // Create the request
        const request = pool.request();

        request.input('azureUserId', sql.NVarChar, finalUserId);
        request.input('email', sql.NVarChar, userDetails || '');
        request.input('balance', sql.Decimal, startingBalance);

        const insertResult = await request.query(`
        INSERT INTO users (azure_user_id, email, onboarding_stage, balance)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.onboarding_stage as onboardingStage, INSERTED.balance
        VALUES (@azureUserId, @email, 0, @balance)
    `);

        dbUser = insertResult.recordset[0];
      }

      // Return the user profile to AuthContext
      return {
        status: 200,
        jsonBody: dbUser,
      };
    } catch (error) {
      context.error('Error fetching/creating user:', error);
      return { status: 500, jsonBody: { error: 'Internal Server Error' } };
    }
  },
});
