const assert = require('node:assert/strict');
const test = require('node:test');
const { migrateOrderStatus } = require('./db');

test('migrates the legacy orders.status enum to a varchar column', async () => {
  const statements = [];
  const databasePool = {
    async query(sql) {
      statements.push(sql);
      if (sql.includes('INFORMATION_SCHEMA.COLUMNS')) {
        return [[{
          dataType: 'enum',
          maxLength: null,
          columnDefault: 'pending',
        }]];
      }
      return [{ affectedRows: 0 }];
    },
  };

  await migrateOrderStatus(databasePool);

  assert.equal(statements.length, 2);
  assert.match(statements[1], /MODIFY COLUMN `status` VARCHAR\(32\) NOT NULL DEFAULT 'Chờ xác nhận'/);
});

test('does not alter orders.status when the column is already migrated', async () => {
  const statements = [];
  const databasePool = {
    async query(sql) {
      statements.push(sql);
      return [[{
        dataType: 'varchar',
        maxLength: 32,
        columnDefault: 'Chờ xác nhận',
      }]];
    },
  };

  await migrateOrderStatus(databasePool);

  assert.equal(statements.length, 1);
});

test('fails clearly when orders.status does not exist', async () => {
  const databasePool = {
    async query() {
      return [[]];
    },
  };

  await assert.rejects(
    migrateOrderStatus(databasePool),
    /orders\.status column is missing/
  );
});
