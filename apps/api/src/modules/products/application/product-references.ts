import { Injectable } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors.js';
import { CategoryRepository } from '../../categories/application/ports/category.repository.js';
import { CostCenterRepository } from '../../cost-centers/application/ports/cost-center.repository.js';
import { EquipmentModelRepository } from '../../equipment/application/ports/equipment-model.repository.js';

@Injectable()
export class ProductReferences {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly equipment: EquipmentModelRepository,
    private readonly costCenters: CostCenterRepository,
  ) {}

  async assertCostCenter(costCenterId: number | null | undefined): Promise<void> {
    if (costCenterId && !(await this.costCenters.findById(costCenterId))) {
      throw new NotFoundError('Cost center', costCenterId);
    }
  }

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

  assertPricing(prices: {
    costUsd?: number | null;
    priceUsd?: number | null;
    wholesalePriceUsd?: number | null;
  }): void {
    for (const [label, value] of Object.entries(prices)) {
      if (value != null && value < 0) throw new ValidationError(` cannot be negative`);
    }
  }
}
