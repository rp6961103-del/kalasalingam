import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertDatabaseConfigured, databaseErrorCode, pool } from './pool';

const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

async function migrate(): Promise<void> {
  await assertDatabaseConfigured();
  const client = await pool.connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS myschema');
    await client.query(`CREATE TABLE IF NOT EXISTS myschema.schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await client.query("SELECT pg_advisory_lock(hashtext('kare-schema-migrations'))");
    const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      const applied = await client.query('SELECT 1 FROM myschema.schema_migrations WHERE version = $1', [file]);
      if (applied.rowCount) continue;
      const sql = await readFile(path.join(directory, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO myschema.schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Applied database migration ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    await client.query("SELECT pg_advisory_unlock(hashtext('kare-schema-migrations'))");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  const code = databaseErrorCode(error);
  const message = code ? `database error ${code}` : error instanceof Error ? error.message : 'Unknown migration failure';
  console.error(`Database migration failed: ${message}`);
  process.exitCode = 1;
});
