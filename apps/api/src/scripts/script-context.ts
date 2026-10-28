import { loadDotEnvFile, loadEnv, type Env } from '../config/env.js';
import {
  createDatabasePool,
  type Database,
} from '../shared/infrastructure/database/database.service.js';
import * as schema from '../shared/infrastructure/database/schema.js';
import { drizzle } from 'drizzle-orm/mysql2';

export interface ScriptContext {
  env: Env;
  db: Database;
  close: () => Promise<void>;
}

export function openScriptContext(): ScriptContext {
  loadDotEnvFile();
  const env = loadEnv();
  const pool = createDatabasePool(env.DATABASE_URL);
  return {
    env,
    db: drizzle(pool, { schema, mode: 'default' }),
    close: () => pool.end(),
  };
}
