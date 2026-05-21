// Callable function that starts the SQL connection per function
import sql from 'mssql';

const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

export const poolPromise = new sql.ConnectionPool(sqlConfig)
  .connect()
  .then((pool) => {
    console.log('Global Database Pool Connected');
    return pool;
  })
  .catch((err) => {
    console.error('Database Connection Failed! Bad Config: ', err);
    throw err;
  });
