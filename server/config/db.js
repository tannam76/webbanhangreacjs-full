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

async function migrateOrderStatus(databasePool = pool) {
  const [columns] = await databasePool.query(`
    SELECT
      DATA_TYPE AS dataType,
      CHARACTER_MAXIMUM_LENGTH AS maxLength,
      COLUMN_DEFAULT AS columnDefault
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'status'
  `);

  if (columns.length === 0) {
    throw new Error('The orders.status column is missing; apply server/database/schema.sql before starting the API.');
  }

  const statusColumn = columns[0];
  if (
    statusColumn.dataType.toLowerCase() !== 'varchar'
    || Number(statusColumn.maxLength) < 32
    || statusColumn.columnDefault !== 'Chờ xác nhận'
  ) {
    await databasePool.query(
      "ALTER TABLE `orders` MODIFY COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'Chờ xác nhận'"
    );
    console.log('Migrated orders.status to VARCHAR(32).');
  }
}

async function initDatabase() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }

  try {
    await pool.query('SELECT 1');
    await migrateOrderStatus(pool);
    console.log(`MySQL connection ready: ${dbConfig.database} (${dbConfig.host}:${dbConfig.port})`);
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error.message);
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
  migrateOrderStatus,
  query,
  getPool: () => pool,
};
