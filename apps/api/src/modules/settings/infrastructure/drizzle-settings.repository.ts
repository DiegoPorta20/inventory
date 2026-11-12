import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import { settings } from '../../../shared/infrastructure/database/schema.js';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context.js';
import { SettingsRepository } from '../application/ports/settings.repository.js';

@Injectable()
export class DrizzleSettingsRepository extends SettingsRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly tenant: TenantContext,
  ) {
    super();
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.database.db
      .select()
      .from(settings)
      .where(eq(settings.companyId, this.tenant.companyId));
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async set(entries: Record<string, string>): Promise<void> {
    const companyId = this.tenant.companyId;
    const rows = Object.entries(entries).map(([key, value]) => ({ companyId, key, value }));
    if (rows.length === 0) return;
    await this.database.db
      .insert(settings)
      .values(rows)
      .onDuplicateKeyUpdate({ set: { value: sql`VALUES(${settings.value})` } });
  }
}
