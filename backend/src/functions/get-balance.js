import { app } from '@azure/functions';
import sql from 'mssql';
import { poolPromise } from '../../components/db-connect.js';

app.http('user-balance', {
  methods: ['GET'],
  route: 'user/balance',
  authLevel: 'anonymous', // Make sure this matches your app's auth setup
  handler: async (request, context) => {
    try {
      // 1. GRAB SECURE AUTH HEADER (This was missing!)
      const header = request.headers.get('x-ms-client-principal');
      if (!header) return { status: 401, jsonBody: { error: 'Not logged in' } };

      const encoded = Buffer.from(header, 'base64');
      const decoded = encoded.toString('ascii');
      const clientPrincipal = JSON.parse(decoded);

      // 2. EXTRACT USER ID
      let finalUserId = clientPrincipal.userId;
      if (!finalUserId && clientPrincipal.claims) {
        const nameIdClaim = clientPrincipal.claims.find(
          (c) => c.typ === 'sub' || c.typ.includes('nameidentifier'),
        );
        if (nameIdClaim) finalUserId = nameIdClaim.val;
      }

      if (!finalUserId) {
        return { status: 400, jsonBody: { error: 'Missing User ID' } };
      }

      // 3. FETCH BALANCE FROM DB
      const pool = await poolPromise;
      const result = await pool
        .request()
        .input('userId', sql.NVarChar, finalUserId)
        .query('SELECT balance FROM users WHERE azure_user_id = @userId');

      // 4. HANDLE USER NOT FOUND
      if (!result.recordset || result.recordset.length === 0) {
        return {
          status: 404,
          jsonBody: { error: 'User not found in database' },
        };
      }

      return {
        status: 200,
        jsonBody: { balance: result.recordset[0].balance },
      };
    } catch (error) {
      context.error('Error fetching balance:', error);
      return { status: 500, jsonBody: { error: 'Internal Server Error' } };
    }
  },
});
