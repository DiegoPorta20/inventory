import { Injectable } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors.js';
import { CategoryRepository } from '../../categories/application/ports/category.repository.js';
import { EquipmentModelRepository } from '../../equipment/application/ports/equipment-model.repository.js';

@Injectable()
export class ProductReferences {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly equipment: EquipmentModelRepository,
  ) {}

  async assertCategory(categoryId: number | null | undefined): Promise<void> {
    if (categoryId && !(await this.categories.findById(categoryId))) {
      throw new NotFoundError('Category', categoryId);
    }
  }

  async assertEquipment(equipmentIds: number[] | undefined): Promise<void> {
    for (const id of new Set(equipmentIds ?? [])) {
      if (!(await this.equipment.findById(id))) throw new NotFoundError('Equipment model', id);
    }
  }

  assertPricing(costUsd: number | null | undefined, priceUsd: number | null | undefined): void {
    if (costUsd != null && costUsd < 0) throw new ValidationError('Cost cannot be negative');
    if (priceUsd != null && priceUsd < 0) throw new ValidationError('Price cannot be negative');
  }
}
