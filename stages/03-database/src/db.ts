import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const schemaSql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'sql', 'schema.sql'),
  'utf8',
);

export function requiredDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is required. Run `npm run infra:up` and set DATABASE_URL=postgres://hiring:hiring@127.0.0.1:54329/hiring',
    );
  }
  return url;
}

export async function createTestPool(): Promise<pg.Pool> {
  return new pg.Pool({ connectionString: requiredDatabaseUrl() });
}

export async function resetSchema(pool: pg.Pool): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS ticket_events');
  await pool.query('DROP TABLE IF EXISTS tickets');
  await pool.query(schemaSql);
}
