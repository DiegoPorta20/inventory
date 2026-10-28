import { Controller, Get } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from './shared/infrastructure/database/database.service.js';
import { Public } from './shared/presentation/decorators.js';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Public()
  @Get()
  async check() {
    await this.database.db.execute(sql`SELECT 1`);
    return { status: 'ok' };
  }
}
