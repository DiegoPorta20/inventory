import { Injectable } from '@nestjs/common';
import { BusinessRuleError, NotFoundError } from '../../../../shared/domain/errors.js';
import type { CostCenter, CostCenterWithCount } from '../../domain/cost-center.js';
import { CostCenterRepository } from '../ports/cost-center.repository.js';

@Injectable()
export class ListCostCenters {
  constructor(private readonly costCenters: CostCenterRepository) {}

  execute(): Promise<CostCenterWithCount[]> {
    return this.costCenters.findAllWithCounts();
  }
}

@Injectable()
export class CreateCostCenter {
  constructor(private readonly costCenters: CostCenterRepository) {}

  execute(name: string): Promise<CostCenter> {
    return this.costCenters.create(name);
  }
}

@Injectable()
export class RenameCostCenter {
  constructor(private readonly costCenters: CostCenterRepository) {}

  async execute(id: number, name: string): Promise<CostCenter> {
    if (!(await this.costCenters.findById(id))) throw new NotFoundError('Cost center', id);
    return this.costCenters.rename(id, name);
  }
}

@Injectable()
export class DeleteCostCenter {
  constructor(private readonly costCenters: CostCenterRepository) {}

  async execute(id: number): Promise<void> {
    if (!(await this.costCenters.findById(id))) throw new NotFoundError('Cost center', id);
    if ((await this.costCenters.countProducts(id)) > 0) {
      throw new BusinessRuleError(
        'COST_CENTER_IN_USE',
        'Cost center has products; reassign them first',
      );
    }
    await this.costCenters.delete(id);
  }
}
