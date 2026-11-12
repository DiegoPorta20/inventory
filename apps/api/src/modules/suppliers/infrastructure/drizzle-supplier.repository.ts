import { Injectable } from '@nestjs/common';
import { and, count, eq, like, or, type SQL } from 'drizzle-orm';
import { ConflictError, NotFoundError } from '../../../shared/domain/errors.js';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import { isDuplicateEntry } from '../../../shared/infrastructure/database/mysql-errors.js';
import { importOrders, suppliers } from '../../../shared/infrastructure/database/schema.js';
import { TenantContext } from '../../../shared/infrastructure/tenant/tenant-context.js';
import { SupplierRepository } from '../application/ports/supplier.repository.js';
import type { Supplier, SupplierDraft, SupplierFilters } from '../domain/supplier.js';

const columns = {
  id: suppliers.id,
  name: suppliers.name,
  country: suppliers.country,
  contactName: suppliers.contactName,
  email: suppliers.email,
  phone: suppliers.phone,
  notes: suppliers.notes,
  isActive: suppliers.isActive,
};

@Injectable()
export class DrizzleSupplierRepository extends SupplierRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly tenant: TenantContext,
  ) {
    super();
  }

  private get inCompany() {
    return eq(suppliers.companyId, this.tenant.companyId);
  }

  findAll(filters: SupplierFilters): Promise<Supplier[]> {
    const conditions: SQL[] = [this.inCompany];
    if (filters.isActive !== undefined) conditions.push(eq(suppliers.isActive, filters.isActive));
    if (filters.search) {
      const term = `%${filters.search}%`;
      const match = or(
        like(suppliers.name, term),
        like(suppliers.contactName, term),
        like(suppliers.country, term),
      );
      if (match) conditions.push(match);
    }
    return this.database.db
      .select(columns)
      .from(suppliers)
      .where(and(...conditions))
      .orderBy(suppliers.name);
  }

  async findById(id: number): Promise<Supplier | null> {
    const [row] = await this.database.db
      .select(columns)
      .from(suppliers)
      .where(and(eq(suppliers.id, id), this.inCompany))
      .limit(1);
    return row ?? null;
  }

  async create(supplier: SupplierDraft): Promise<Supplier> {
    try {
      const [result] = await this.database.db
        .insert(suppliers)
        .values({ ...supplier, companyId: this.tenant.companyId });
      return this.requireById(result.insertId);
    } catch (error) {
      if (isDuplicateEntry(error))
        throw new ConflictError('A supplier with this name already exists');
      throw error;
    }
  }

  async update(id: number, changes: Partial<SupplierDraft>): Promise<Supplier> {
    const values = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    try {
      if (Object.keys(values).length > 0) {
        await this.database.db
          .update(suppliers)
          .set(values)
          .where(and(eq(suppliers.id, id), this.inCompany));
      }
    } catch (error) {
      if (isDuplicateEntry(error))
        throw new ConflictError('A supplier with this name already exists');
      throw error;
    }
    return this.requireById(id);
  }

  async countImportOrders(id: number): Promise<number> {
    const [row] = await this.database.db
      .select({ value: count() })
      .from(importOrders)
      .where(
        and(eq(importOrders.supplierId, id), eq(importOrders.companyId, this.tenant.companyId)),
      );
    return Number(row?.value ?? 0);
  }

  async delete(id: number): Promise<void> {
    await this.database.db.delete(suppliers).where(and(eq(suppliers.id, id), this.inCompany));
  }

  private async requireById(id: number): Promise<Supplier> {
    const supplier = await this.findById(id);
    if (!supplier) throw new NotFoundError('Supplier', id);
    return supplier;
  }
}
