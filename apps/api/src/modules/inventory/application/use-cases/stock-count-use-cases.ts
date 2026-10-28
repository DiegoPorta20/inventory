import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../../../shared/application/unit-of-work.js';
import type { Page, PageRequest } from '../../../../shared/application/page.js';
import { BusinessRuleError, NotFoundError } from '../../../../shared/domain/errors.js';
import {
  assertOpen,
  type StockCount,
  type StockCountItem,
  type StockCountSummary,
} from '../../domain/stock-count.js';
import {
  StockCountRepository,
  type StockCountFilters,
  type StockCountItemFilters,
} from '../ports/stock-count.repository.js';
import { StockLedger } from '../stock-ledger.js';

export type StockCountDetail = StockCount & { summary: StockCountSummary };

async function requireCount(counts: StockCountRepository, id: number): Promise<StockCount> {
  const count = await counts.findById(id);
  if (!count) throw new NotFoundError('Stock count', id);
  return count;
}

@Injectable()
export class CreateStockCount {
  constructor(private readonly counts: StockCountRepository) {}

  async execute(
    input: { name: string; categoryId?: number | null; note?: string | null },
    userId: number,
  ): Promise<StockCountDetail> {
    const count = await this.counts.createWithSnapshot({
      name: input.name,
      categoryId: input.categoryId ?? null,
      note: input.note ?? null,
      createdBy: userId,
    });
    return { ...count, summary: await this.counts.summaryOf(count.id) };
  }
}

@Injectable()
export class ListStockCounts {
  constructor(private readonly counts: StockCountRepository) {}

  execute(filters: StockCountFilters, page: PageRequest): Promise<Page<StockCountDetail>> {
    return this.counts.list(filters, page);
  }
}

@Injectable()
export class GetStockCount {
  constructor(private readonly counts: StockCountRepository) {}

  async execute(id: number): Promise<StockCountDetail> {
    const count = await requireCount(this.counts, id);
    return { ...count, summary: await this.counts.summaryOf(id) };
  }
}

@Injectable()
export class ListStockCountItems {
  constructor(private readonly counts: StockCountRepository) {}

  async execute(
    id: number,
    filters: StockCountItemFilters,
    page: PageRequest,
  ): Promise<Page<StockCountItem>> {
    await requireCount(this.counts, id);
    return this.counts.findItems(id, filters, page);
  }
}

@Injectable()
export class RecordCountedQuantity {
  constructor(private readonly counts: StockCountRepository) {}

  async execute(
    id: number,
    itemId: number,
    input: { countedQty: number | null; note?: string | null },
  ): Promise<StockCountItem> {
    assertOpen(await requireCount(this.counts, id));
    const item = await this.counts.updateItem(id, itemId, input.countedQty, input.note);
    if (!item) throw new NotFoundError('Stock count item', itemId);
    return item;
  }
}

@Injectable()
export class ConfirmPendingCountItems {
  constructor(private readonly counts: StockCountRepository) {}

  async execute(id: number): Promise<{ confirmed: number }> {
    assertOpen(await requireCount(this.counts, id));
    return { confirmed: await this.counts.confirmPendingItems(id) };
  }
}

@Injectable()
export class CompleteStockCount {
  constructor(
    private readonly counts: StockCountRepository,
    private readonly ledger: StockLedger,
    private readonly uow: UnitOfWork,
  ) {}

  execute(id: number, userId: number): Promise<StockCountDetail & { adjustments: number }> {
    return this.uow.run(async () => {
      const count = await requireCount(this.counts, id);
      assertOpen(count);

      const items = await this.counts.findCountedItems(id);
      if (items.length === 0) {
        throw new BusinessRuleError(
          'STOCK_COUNT_EMPTY',
          'Record at least one counted quantity before completing',
        );
      }

      let adjustments = 0;
      for (const item of items) {
        const movement = await this.ledger.setTo(item.productId, item.countedQty ?? 0, {
          reason: 'COUNT_ADJUSTMENT',
          referenceType: 'STOCK_COUNT',
          referenceId: id,
          note: `${count.name} (system qty at count start: ${item.systemQty})`,
          userId,
        });
        if (movement) adjustments++;
      }

      await this.counts.setStatus(id, 'COMPLETED', new Date());
      return {
        ...(await requireCount(this.counts, id)),
        summary: await this.counts.summaryOf(id),
        adjustments,
      };
    });
  }
}

@Injectable()
export class CancelStockCount {
  constructor(private readonly counts: StockCountRepository) {}

  async execute(id: number): Promise<StockCountDetail> {
    assertOpen(await requireCount(this.counts, id));
    await this.counts.setStatus(id, 'CANCELLED');
    return { ...(await requireCount(this.counts, id)), summary: await this.counts.summaryOf(id) };
  }
}
