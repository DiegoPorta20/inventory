import { createConnection } from 'mysql2/promise';
import { runMigrations } from '../src/shared/infrastructure/database/migrate.js';
import { TEST_DATABASE_URL } from './test-env.js';

export default async function setup(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL);
  const database = url.pathname.slice(1);
  if (!database.endsWith('_test')) {
    throw new Error(
      `Refusing to reset "${database}": e2e tests require a database ending in _test`,
    );
  }

  url.pathname = '/';
  const connection = await createConnection(url.toString());
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.query(
    `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();

  await runMigrations(TEST_DATABASE_URL);
}
