import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../application/unit-of-work.js';
import { DatabaseService } from './database.service.js';

@Injectable()
export class DrizzleUnitOfWork extends UnitOfWork {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.database.transaction(work);
  }
}
