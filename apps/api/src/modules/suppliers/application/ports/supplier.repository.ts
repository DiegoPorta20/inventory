import type { Supplier, SupplierDraft, SupplierFilters } from '../../domain/supplier.js';

export abstract class SupplierRepository {
  abstract findAll(filters: SupplierFilters): Promise<Supplier[]>;
  abstract findById(id: number): Promise<Supplier | null>;
  abstract create(supplier: SupplierDraft): Promise<Supplier>;
  abstract update(id: number, changes: Partial<SupplierDraft>): Promise<Supplier>;
  abstract countImportOrders(id: number): Promise<number>;
  abstract delete(id: number): Promise<void>;
}
