import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { loadDotEnvFile, loadEnv } from '../../../config/env.js';
import { createDatabasePool } from './database.service.js';

export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = createDatabasePool(databaseUrl);
  try {
    await migrate(drizzle(pool), { migrationsFolder: resolveMigrationsFolder() });
  } finally {
    await pool.end();
  }
}

function resolveMigrationsFolder(): string {
  return (
    process.env.MIGRATIONS_DIR ??
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../drizzle')
  );
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  loadDotEnvFile();
  const env = loadEnv();
  await runMigrations(env.DATABASE_URL);
  console.log('Migrations applied');
}
