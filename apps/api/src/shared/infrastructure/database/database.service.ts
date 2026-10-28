import { AsyncLocalStorage } from 'node:async_hooks';
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { ENV, type Env } from '../../../config/env.js';
import * as schema from './schema.js';

export type Database = MySql2Database<typeof schema>;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly root: Database;
  private readonly context = new AsyncLocalStorage<Database>();

  constructor(@Inject(ENV) env: Env) {
    this.pool = createDatabasePool(env.DATABASE_URL);
    this.root = drizzle(this.pool, { schema, mode: 'default' });
  }

  get db(): Database {
    return this.context.getStore() ?? this.root;
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.context.getStore()) return work();
    return this.root.transaction((tx) => this.context.run(tx as unknown as Database, work));
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

export function createDatabasePool(url: string): Pool {
  const pool = createPool({
    uri: url,
    timezone: 'Z',
    connectionLimit: 10,
    decimalNumbers: false,
    dateStrings: false,
  });
  pool.pool.on('connection', (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });
  return pool;
}
