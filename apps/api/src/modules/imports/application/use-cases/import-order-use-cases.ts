import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../../../shared/application/unit-of-work.js';
import type { Page, PageRequest } from '../../../../shared/application/page.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../../shared/domain/errors.js';
import { todayInBusinessZone } from '../../../../shared/domain/time.js';
import { StockLedger } from '../../../inventory/application/stock-ledger.js';
import { ProductRepository } from '../../../products/application/ports/product.repository.js';
import { SupplierRepository } from '../../../suppliers/application/ports/supplier.repository.js';
import {
  assertEditable,
  assertReceivable,
  assertTransition,
  type ImportOrderDetail,
  type ImportOrderSummary,
  type ImportStatus,
} from '../../domain/import-order.js';
import {
  ImportOrderRepository,
  type ImportItemDraft,
  type ImportOrderChanges,
  type ImportOrderFilters,
} from '../ports/import-order.repository.js';

export interface ImportOrderInput {
  number?: number;
  supplierId?: number | null;
  status?: Extract<ImportStatus, 'DRAFT' | 'ORDERED'>;
  reference?: string | null;
  orderedAt?: string | null;
  expectedAt?: string | null;
  exchangeRate?: number | null;
  notes?: string | null;
  items: ImportItemDraft[];
}

export type UpdateImportOrderInput = Partial<Omit<ImportOrderInput, 'status'>>;

@Injectable()
export class ImportOrderValidator {
  constructor(
    private readonly products: ProductRepository,
    private readonly suppliers: SupplierRepository,
  ) {}

  async assertValid(input: {
    supplierId?: number | null;
    items?: ImportItemDraft[];
  }): Promise<void> {
    if (input.supplierId && !(await this.suppliers.findById(input.supplierId))) {
      throw new NotFoundError('Supplier', input.supplierId);
    }
    if (!input.items) return;

    const ids = input.items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) {
      throw new ValidationError('A product can appear only once per import');
    }
    for (const id of ids) {
      if (!(await this.products.findById(id))) throw new NotFoundError('Product', id);
    }
  }
}

@Injectable()
export class ListImportOrders {
  constructor(private readonly imports: ImportOrderRepository) {}

  execute(filters: ImportOrderFilters, page: PageRequest): Promise<Page<ImportOrderSummary>> {
    return this.imports.list(filters, page);
  }
}

@Injectable()
export class GetImportOrder {
  constructor(private readonly imports: ImportOrderRepository) {}

  async execute(id: number): Promise<ImportOrderDetail> {
    const order = await this.imports.findById(id);
    if (!order) throw new NotFoundError('Import order', id);
    return order;
  }
}

@Injectable()
export class CreateImportOrder {
  constructor(
    private readonly imports: ImportOrderRepository,
    private readonly validator: ImportOrderValidator,
  ) {}

  async execute(input: ImportOrderInput, userId: number): Promise<ImportOrderDetail> {
    await this.validator.assertValid(input);
    const number = input.number ?? (await this.imports.nextNumber());
    if (await this.imports.numberExists(number)) {
      throw new ConflictError(`Import #${number} already exists`);
    }
    return this.imports.create(
      {
        number,
        supplierId: input.supplierId ?? null,
        status: input.status ?? 'DRAFT',
        reference: input.reference ?? null,
        orderedAt: input.orderedAt ?? (input.status === 'ORDERED' ? todayInBusinessZone() : null),
        expectedAt: input.expectedAt ?? null,
        receivedAt: null,
        exchangeRate: input.exchangeRate ?? null,
        notes: input.notes ?? null,
        createdBy: userId,
      },
      input.items,
    );
  }
}

@Injectable()
export class UpdateImportOrder {
  constructor(
    private readonly imports: ImportOrderRepository,
    private readonly validator: ImportOrderValidator,
  ) {}

  async execute(id: number, input: UpdateImportOrderInput): Promise<ImportOrderDetail> {
    const order = await this.imports.findById(id);
    if (!order) throw new NotFoundError('Import order', id);
    assertEditable(order);
    await this.validator.assertValid(input);

    if (input.number !== undefined && (await this.imports.numberExists(input.number, id))) {
      throw new ConflictError(`Import #${input.number} already exists`);
    }
    const { items, ...fields } = input;
    return this.imports.update(id, fields as ImportOrderChanges, items);
  }
}

@Injectable()
export class ChangeImportStatus {
  constructor(private readonly imports: ImportOrderRepository) {}

  async execute(id: number, status: ImportStatus): Promise<ImportOrderDetail> {
    const order = await this.imports.findById(id);
    if (!order) throw new NotFoundError('Import order', id);
    assertTransition(order, status);
    return this.imports.update(id, {
      status,
      orderedAt: status === 'ORDERED' && !order.orderedAt ? todayInBusinessZone() : undefined,
    });
  }
}

@Injectable()
export class ReceiveImportOrder {
  constructor(
    private readonly imports: ImportOrderRepository,
    private readonly products: ProductRepository,
    private readonly ledger: StockLedger,
    private readonly uow: UnitOfWork,
  ) {}

  execute(
    id: number,
    input: { receivedAt?: string; lines?: { itemId: number; quantityReceived: number }[] },
    userId: number,
  ): Promise<ImportOrderDetail> {
    return this.uow.run(async () => {
      const order = await this.imports.findById(id);
      if (!order) throw new NotFoundError('Import order', id);
      assertReceivable(order);

      const overrides = new Map(
        (input.lines ?? []).map((line) => [line.itemId, line.quantityReceived]),
      );
      for (const itemId of overrides.keys()) {
        if (!order.items.some((item) => item.id === itemId))
          throw new NotFoundError('Import item', itemId);
      }

      const lines = order.items.map((item) => ({
        itemId: item.id,
        quantityReceived: overrides.get(item.id) ?? item.quantityOrdered,
      }));
      const receivedAt = input.receivedAt ?? todayInBusinessZone();
      await this.imports.recordReceipt(id, lines, receivedAt);

      for (const item of order.items) {
        const quantity = overrides.get(item.id) ?? item.quantityOrdered;
        if (quantity <= 0) continue;
        await this.ledger.apply({
          productId: item.productId,
          type: 'IN',
          reason: 'IMPORT_RECEIPT',
          delta: quantity,
          referenceType: 'IMPORT_ORDER',
          referenceId: id,
          note: `Import #${order.number}`,
          userId,
        });
        if (item.unitCostUsd != null) {
          await this.products.update(item.productId, { costUsd: item.unitCostUsd });
        }
      }
      return (await this.imports.findById(id)) as ImportOrderDetail;
    });
  }
}

@Injectable()
export class DeleteImportOrder {
  constructor(private readonly imports: ImportOrderRepository) {}

  async execute(id: number): Promise<void> {
    const order = await this.imports.findById(id);
    if (!order) throw new NotFoundError('Import order', id);
    if (order.status !== 'DRAFT') {
      throw new ValidationError('Only draft imports can be deleted; cancel it instead');
    }
    await this.imports.delete(id);
  }
}
