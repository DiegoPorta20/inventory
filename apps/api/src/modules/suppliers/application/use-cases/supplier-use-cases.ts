import { Injectable } from '@nestjs/common';
import { BusinessRuleError, NotFoundError } from '../../../../shared/domain/errors.js';
import type { Supplier, SupplierDraft, SupplierFilters } from '../../domain/supplier.js';
import { SupplierRepository } from '../ports/supplier.repository.js';

@Injectable()
export class ListSuppliers {
  constructor(private readonly suppliers: SupplierRepository) {}

  execute(filters: SupplierFilters): Promise<Supplier[]> {
    return this.suppliers.findAll(filters);
  }
}

@Injectable()
export class GetSupplier {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(id: number): Promise<Supplier> {
    const supplier = await this.suppliers.findById(id);
    if (!supplier) throw new NotFoundError('Supplier', id);
    return supplier;
  }
}

@Injectable()
export class CreateSupplier {
  constructor(private readonly suppliers: SupplierRepository) {}

  execute(input: SupplierDraft): Promise<Supplier> {
    return this.suppliers.create(input);
  }
}

@Injectable()
export class UpdateSupplier {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(id: number, changes: Partial<SupplierDraft>): Promise<Supplier> {
    if (!(await this.suppliers.findById(id))) throw new NotFoundError('Supplier', id);
    return this.suppliers.update(id, changes);
  }
}

@Injectable()
export class DeleteSupplier {
  constructor(private readonly suppliers: SupplierRepository) {}

  async execute(id: number): Promise<void> {
    if (!(await this.suppliers.findById(id))) throw new NotFoundError('Supplier', id);
    if ((await this.suppliers.countImportOrders(id)) > 0) {
      throw new BusinessRuleError(
        'SUPPLIER_IN_USE',
        'Supplier has import orders; deactivate it instead of deleting',
      );
    }
    await this.suppliers.delete(id);
  }
}
