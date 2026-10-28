import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import { settings } from '../../../shared/infrastructure/database/schema.js';
import { SettingsRepository } from '../application/ports/settings.repository.js';

@Injectable()
export class DrizzleSettingsRepository extends SettingsRepository {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.database.db.select().from(settings);
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async set(entries: Record<string, string>): Promise<void> {
    const rows = Object.entries(entries).map(([key, value]) => ({ key, value }));
    if (rows.length === 0) return;
    await this.database.db
      .insert(settings)
      .values(rows)
      .onDuplicateKeyUpdate({ set: { value: sql`VALUES(${settings.value})` } });
  }
}
