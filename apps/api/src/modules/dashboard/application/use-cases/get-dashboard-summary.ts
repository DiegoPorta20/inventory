import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../../products/application/ports/product.repository.js';
import type { ProductListItem } from '../../../products/domain/product.js';
import { suggestedReorderQuantity } from '../../../products/domain/stock-rules.js';
import {
  DashboardReader,
  type CategoryStock,
  type DailyMovement,
  type InventoryTotals,
  type RecentMovement,
  type TopSoldProduct,
} from '../ports/dashboard.reader.js';

const TREND_DAYS = 30;

export interface DashboardSummary {
  totals: InventoryTotals;
  stockByCategory: CategoryStock[];
  dailyMovements: DailyMovement[];
  topSold: TopSoldProduct[];
  recentMovements: RecentMovement[];
  attention: (ProductListItem & { suggestedQty: number })[];
}

@Injectable()
export class GetDashboardSummary {
  constructor(
    private readonly reader: DashboardReader,
    private readonly products: ProductRepository,
  ) {}

  async execute(): Promise<DashboardSummary> {
    const [totals, stockByCategory, dailyMovements, topSold, recentMovements, candidates] =
      await Promise.all([
        this.reader.totals(),
        this.reader.stockByCategory(),
        this.reader.dailyMovements(TREND_DAYS),
        this.reader.topSold(TREND_DAYS, 5),
        this.reader.recentMovements(8),
        this.products.searchAll(
          { isActive: true, needsReorder: true, sortBy: 'stock', sortDirection: 'asc' },
          8,
        ),
      ]);

    return {
      totals,
      stockByCategory,
      dailyMovements,
      topSold,
      recentMovements,
      attention: candidates.map((product) => ({
        ...product,
        suggestedQty: suggestedReorderQuantity(product),
      })),
    };
  }
}
