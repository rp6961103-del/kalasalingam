import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'kare-campus-operations',
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: true } : undefined,
});

pool.on('error', (error) => {
  const code = 'code' in error ? String(error.code) : 'unknown';
  console.error(`Unexpected PostgreSQL pool error (${code})`);
});

export async function assertDatabaseConfigured(): Promise<void> {
  if (!connectionString) throw new Error('DATABASE_URL must be configured');
  await pool.query('SELECT 1');
}

export function isDatabaseUnavailable(error: unknown): boolean {
  const code = databaseErrorCode(error);
  return code.startsWith('08') || code.startsWith('28') || code === '3D000' || code === '3F000' ||
    code === '42P01' || code === '53300' || code === '57P01' || code === '57P03' ||
    ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH'].includes(code);
}

export function databaseErrorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
}
