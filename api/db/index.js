const { AsyncLocalStorage } = require('node:async_hooks');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const context = new AsyncLocalStorage();
let pool;
let testDatabase;
let savepoint = 0;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('Cần cấu hình DATABASE_URL PostgreSQL');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 10000 });
    pool.on('error', error => console.error('PostgreSQL pool:', error.message));
  }
  return pool;
}

function query(sql, values = []) {
  return (context.getStore() || testDatabase || getPool()).query(sql, values);
}

async function transaction(callback) {
  const current = context.getStore();
  if (current) {
    const name = `nested_${++savepoint}`;
    await current.query(`SAVEPOINT ${name}`);
    try {
      const result = await callback();
      await current.query(`RELEASE SAVEPOINT ${name}`);
      return result;
    } catch (error) {
      await current.query(`ROLLBACK TO SAVEPOINT ${name}`);
      throw error;
    }
  }
  if (testDatabase) return testDatabase.transaction(tx => context.run(tx, callback));
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await context.run(client, callback);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function migrate() {
  await transaction(async () => {
    // Serialize migrations across API replicas and the CLI.
    await query('SELECT pg_advisory_xact_lock(784291063)');
    await query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const directory = path.join(__dirname, 'migrations');
    for (const name of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) {
      const applied = await query('SELECT name FROM schema_migrations WHERE name = $1', [name]);
      if (applied.rows.length) continue;
      const sql = readFileSync(path.join(directory, name), 'utf8');
      const client = context.getStore();
      // PGlite separates multi-statement exec from parameterized query.
      if (client.exec) await client.exec(sql);
      else await client.query(sql);
      await query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
    }
  });
}

async function close() {
  if (pool) { await pool.end(); pool = undefined; }
}

function useTestDatabase(database) {
  if (process.env.NODE_ENV !== 'test') throw new Error('Test database chỉ dùng trong test');
  testDatabase = database;
}

module.exports = { query, transaction, migrate, close, useTestDatabase };
