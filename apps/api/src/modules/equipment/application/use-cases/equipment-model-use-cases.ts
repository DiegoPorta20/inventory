import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import type {
  EquipmentModel,
  EquipmentModelDraft,
  EquipmentModelWithCount,
} from '../../domain/equipment-model.js';
import { EquipmentModelRepository } from '../ports/equipment-model.repository.js';

@Injectable()
export class ListEquipmentModels {
  constructor(private readonly models: EquipmentModelRepository) {}

  execute(search?: string): Promise<EquipmentModelWithCount[]> {
    return this.models.findAllWithCounts(search);
  }
}

@Injectable()
export class CreateEquipmentModel {
  constructor(private readonly models: EquipmentModelRepository) {}

  execute(input: EquipmentModelDraft): Promise<EquipmentModel> {
    return this.models.create(input);
  }
}

@Injectable()
export class UpdateEquipmentModel {
  constructor(private readonly models: EquipmentModelRepository) {}

  async execute(id: number, changes: Partial<EquipmentModelDraft>): Promise<EquipmentModel> {
    if (!(await this.models.findById(id))) throw new NotFoundError('Equipment model', id);
    return this.models.update(id, changes);
  }
}

@Injectable()
export class DeleteEquipmentModel {
  constructor(private readonly models: EquipmentModelRepository) {}

  async execute(id: number): Promise<void> {
    if (!(await this.models.findById(id))) throw new NotFoundError('Equipment model', id);
    await this.models.delete(id);
  }
}
