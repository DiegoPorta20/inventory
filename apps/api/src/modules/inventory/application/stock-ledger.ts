import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../../shared/application/unit-of-work.js';
import { NotFoundError } from '../../../shared/domain/errors.js';
import { ProductRepository } from '../../products/application/ports/product.repository.js';
import { stockAfter } from '../../products/domain/stock-rules.js';
import type {
  MovementReason,
  MovementType,
  ReferenceType,
  StockMovement,
} from '../domain/stock-movement.js';
import { StockMovementRepository } from './ports/stock-movement.repository.js';

export interface LedgerEntry {
  productId: number;
  type: MovementType;
  reason: MovementReason;
  delta: number;
  unitPricePen?: number | null;
  counterparty?: string | null;
  referenceType?: ReferenceType | null;
  referenceId?: number | null;
  note?: string | null;
  userId?: number | null;
  occurredAt?: Date;
}

export type LedgerMeta = Omit<LedgerEntry, 'productId' | 'delta' | 'type'> & {
  type?: MovementType;
};

/** Single entry point that changes product stock; keeps stock and the movement ledger consistent. */
@Injectable()
export class StockLedger {
  constructor(
    private readonly products: ProductRepository,
    private readonly movements: StockMovementRepository,
    private readonly uow: UnitOfWork,
  ) {}

  apply(entry: LedgerEntry): Promise<StockMovement> {
    return this.uow.run(async () => {
      const product = await this.products.findByIdForUpdate(entry.productId);
      if (!product) throw new NotFoundError('Product', entry.productId);

      const stock = stockAfter(product, entry.delta);
      await this.products.setStock(product.id, stock);
      return this.movements.create({
        ...entry,
        quantity: entry.delta,
        stockAfter: stock,
      });
    });
  }

  /** Sets stock to an absolute value using the live stock as baseline. Returns null when nothing changes. */
  setTo(productId: number, target: number, meta: LedgerMeta): Promise<StockMovement | null> {
    return this.uow.run(async () => {
      const product = await this.products.findByIdForUpdate(productId);
      if (!product) throw new NotFoundError('Product', productId);

      const delta = target - product.stock;
      if (delta === 0) return null;
      return this.apply({ ...meta, productId, type: meta.type ?? 'ADJUSTMENT', delta });
    });
  }
}
