import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import sql from 'mssql';

async function init() {
  try {
    const config = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    };

    const pool = await sql.connect(config);

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const schema = fs.readFileSync(
      path.join(__dirname, '../db/init.sql'),
      'utf8',
    );

    await pool.request().batch(schema);

    console.log('Database initialized successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

init();
