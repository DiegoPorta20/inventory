import { drizzle } from 'drizzle-orm/mysql2';
import { loadDotEnvFile, loadEnv, type Env } from '../config/env.js';
import {
  createDatabasePool,
  type Database,
} from '../shared/infrastructure/database/database.service.js';
import * as schema from '../shared/infrastructure/database/schema.js';

export interface ScriptContext {
  env: Env;
  db: Database;
  /** Id of the company (as assigned by config_inventory) every script operation is scoped to. */
  company: { id: number };
  close: () => Promise<void>;
}

/** `--company=<id>` wins over SEED_COMPANY_ID. */
function requestedCompanyId(env: Env): number {
  const flag = process.argv.find((arg) => arg.startsWith('--company='))?.split('=')[1];
  const id = flag === undefined ? env.SEED_COMPANY_ID : Number(flag);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      `Invalid company id "${flag}". Use --company=<id> with the id from config_inventory.`,
    );
  }
  return id;
}

export function openScriptContext(): ScriptContext {
  loadDotEnvFile();
  const env = loadEnv();
  const pool = createDatabasePool(env.DATABASE_URL);
  return {
    env,
    db: drizzle(pool, { schema, mode: 'default' }),
    company: { id: requestedCompanyId(env) },
    close: () => pool.end(),
  };
}
