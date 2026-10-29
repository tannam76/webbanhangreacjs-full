const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'shoptn_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'webbanhang_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool = null;

async function initDatabase() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }

  try {
    await pool.query('SELECT 1');
    console.log(`MySQL connection ready: ${dbConfig.database} (${dbConfig.host}:${dbConfig.port})`);
    return true;
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    return false;
  }
}

async function query(sql, params) {
  if (!pool) {
    const connected = await initDatabase();
    if (!connected || !pool) {
      throw new Error('Unable to connect to the configured MySQL database.');
    }
  }
  return pool.query(sql, params);
}

module.exports = {
  dbConfig,
  initDatabase,
  query,
  getPool: () => pool,
};
