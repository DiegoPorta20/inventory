import { Global, Module } from '@nestjs/common';
import { UnitOfWork } from '../../application/unit-of-work.js';
import { DatabaseService } from './database.service.js';
import { DrizzleUnitOfWork } from './drizzle-unit-of-work.js';

@Global()
@Module({
  providers: [DatabaseService, { provide: UnitOfWork, useClass: DrizzleUnitOfWork }],
  exports: [DatabaseService, UnitOfWork],
})
export class DatabaseModule {}
