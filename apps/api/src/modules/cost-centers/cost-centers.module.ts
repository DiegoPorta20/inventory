import { Module } from '@nestjs/common';
import { CostCenterRepository } from './application/ports/cost-center.repository.js';
import {
  CreateCostCenter,
  DeleteCostCenter,
  ListCostCenters,
  RenameCostCenter,
} from './application/use-cases/cost-center-use-cases.js';
import { DrizzleCostCenterRepository } from './infrastructure/drizzle-cost-center.repository.js';
import { CostCentersController } from './presentation/cost-centers.controller.js';

@Module({
  controllers: [CostCentersController],
  providers: [
    ListCostCenters,
    CreateCostCenter,
    RenameCostCenter,
    DeleteCostCenter,
    { provide: CostCenterRepository, useClass: DrizzleCostCenterRepository },
  ],
  exports: [CostCenterRepository],
})
export class CostCentersModule {}
