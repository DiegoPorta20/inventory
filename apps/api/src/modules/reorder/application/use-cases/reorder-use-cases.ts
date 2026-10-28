import { Injectable } from '@nestjs/common';
import { SpreadsheetWriter } from '../../../../shared/application/spreadsheet-writer.js';
import { ProductRepository } from '../../../products/application/ports/product.repository.js';
import type { ProductListItem } from '../../../products/domain/product.js';
import { suggestedReorderQuantity } from '../../../products/domain/stock-rules.js';

const LIMIT = 2000;

export interface ReorderFilters {
  search?: string;
  categoryId?: number;
  equipmentId?: number;
  onlyOutOfStock?: boolean;
}

export interface ReorderSuggestion {
  product: ProductListItem;
  suggestedQty: number;
  estimatedCostUsd: number | null;
}

export interface ReorderReport {
  items: ReorderSuggestion[];
  summary: { total: number; outOfStock: number; estimatedCostUsd: number };
}

@Injectable()
export class GetReorderSuggestions {
  constructor(private readonly products: ProductRepository) {}

  async execute(filters: ReorderFilters): Promise<ReorderReport> {
    const candidates = await this.products.searchAll(
      {
        search: filters.search,
        categoryId: filters.categoryId,
        equipmentId: filters.equipmentId,
        stockStatus: filters.onlyOutOfStock ? 'OUT' : undefined,
        isActive: true,
        needsReorder: true,
        sortBy: 'stock',
        sortDirection: 'asc',
      },
      LIMIT,
    );

    const items = candidates.map((product) => {
      const suggestedQty = suggestedReorderQuantity(product);
      return {
        product,
        suggestedQty,
        estimatedCostUsd: product.costUsd == null ? null : product.costUsd * suggestedQty,
      };
    });

    return {
      items,
      summary: {
        total: items.length,
        outOfStock: items.filter((item) => item.product.stockStatus === 'OUT').length,
        estimatedCostUsd: items.reduce((sum, item) => sum + (item.estimatedCostUsd ?? 0), 0),
      },
    };
  }
}

@Injectable()
export class ExportReorderSuggestions {
  constructor(
    private readonly suggestions: GetReorderSuggestions,
    private readonly spreadsheet: SpreadsheetWriter,
  ) {}

  async execute(filters: ReorderFilters): Promise<Buffer> {
    const { items } = await this.suggestions.execute(filters);
    return this.spreadsheet.write({
      name: 'Reposición',
      columns: [
        { header: 'Código', key: 'code', width: 20 },
        { header: 'Descripción', key: 'name', width: 50 },
        { header: 'Categoría', key: 'category', width: 26 },
        { header: 'Unidad', key: 'unit', width: 10 },
        { header: 'Stock', key: 'stock', width: 10 },
        { header: 'Stock mínimo', key: 'minStock', width: 14 },
        { header: 'En camino', key: 'incoming', width: 12 },
        { header: 'Cantidad sugerida', key: 'suggested', width: 18 },
        { header: 'Costo unit. USD', key: 'cost', width: 16, numFmt: '#,##0.00' },
        { header: 'Costo estimado USD', key: 'estimated', width: 20, numFmt: '#,##0.00' },
      ],
      rows: items.map(({ product, suggestedQty, estimatedCostUsd }) => ({
        code: product.code,
        name: product.name,
        category: product.categoryName,
        unit: product.unit,
        stock: product.stock,
        minStock: product.minStock,
        incoming: product.incomingQty,
        suggested: suggestedQty,
        cost: product.costUsd,
        estimated: estimatedCostUsd,
      })),
    });
  }
}
