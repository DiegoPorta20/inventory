import { Module } from '@nestjs/common';
import { EquipmentModelRepository } from './application/ports/equipment-model.repository.js';
import {
  CreateEquipmentModel,
  DeleteEquipmentModel,
  ListEquipmentModels,
  UpdateEquipmentModel,
} from './application/use-cases/equipment-model-use-cases.js';
import { DrizzleEquipmentModelRepository } from './infrastructure/drizzle-equipment-model.repository.js';
import { EquipmentModelsController } from './presentation/equipment-models.controller.js';

@Module({
  controllers: [EquipmentModelsController],
  providers: [
    ListEquipmentModels,
    CreateEquipmentModel,
    UpdateEquipmentModel,
    DeleteEquipmentModel,
    { provide: EquipmentModelRepository, useClass: DrizzleEquipmentModelRepository },
  ],
  exports: [EquipmentModelRepository],
})
export class EquipmentModule {}
